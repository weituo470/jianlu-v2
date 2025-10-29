const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const AABill = sequelize.define('AABill', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    activity_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'activities',
            key: 'id'
        },
        onDelete: 'CASCADE'
    },
    creator_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        },
        onDelete: 'CASCADE'
    },
    total_cost: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00,
        comment: '分摊总金额（用户自定义或记账总额）'
    },
    expense_total_cost: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00,
        comment: '记账总额（所有费用的总和）'
    },
    base_total_cost: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00,
        comment: '基础分摊总额（默认计算的总金额）'
    },
    use_custom_total_cost: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: '是否使用了自定义总金额'
    },
    custom_total_cost: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: null,
        comment: '用户自定义的总金额'
    },
    participant_count: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: '参与人数'
    },
    total_ratio: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00,
        comment: '总系数'
    },
    average_cost: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00,
        comment: '平均金额'
    },
    status: {
        type: DataTypes.ENUM('draft', 'saved', 'pushed'),
        allowNull: false,
        defaultValue: 'draft',
        comment: '账单状态：draft-草稿，saved-已保存，pushed-已推送'
    },
    bill_details: {
        type: DataTypes.JSON,
        allowNull: true,
        defaultValue: null,
        comment: '账单详情（参与者分摊明细）'
    },
    pushed_at: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: null,
        comment: '推送时间'
    },
    created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    },
    updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    }
}, {
    tableName: 'aa_bills',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
        {
            fields: ['activity_id']
        },
        {
            fields: ['creator_id']
        },
        {
            fields: ['status']
        },
        {
            fields: ['created_at']
        }
    ],
    comment: 'AA分摊账单表'
});

// 定义关联关系
AABill.associate = function(models) {
    // 关联活动
    AABill.belongsTo(models.Activity, {
        foreignKey: 'activity_id',
        as: 'activity'
    });

    // 关联创建者
    AABill.belongsTo(models.User, {
        foreignKey: 'creator_id',
        as: 'creator'
    });
};

// 实例方法
AABill.prototype.toJSON = function() {
    const values = Object.assign({}, this.get());

    // 格式化金额显示
    if (values.total_cost) {
        values.total_cost = parseFloat(values.total_cost).toFixed(2);
    }
    if (values.expense_total_cost) {
        values.expense_total_cost = parseFloat(values.expense_total_cost).toFixed(2);
    }
    if (values.base_total_cost) {
        values.base_total_cost = parseFloat(values.base_total_cost).toFixed(2);
    }
    if (values.custom_total_cost) {
        values.custom_total_cost = parseFloat(values.custom_total_cost).toFixed(2);
    }
    if (values.average_cost) {
        values.average_cost = parseFloat(values.average_cost).toFixed(2);
    }
    if (values.total_ratio) {
        values.total_ratio = parseFloat(values.total_ratio).toFixed(2);
    }

    return values;
};

// 静态方法：获取活动的最新账单
AABill.getLatestByActivity = async function(activityId) {
    return await this.findOne({
        where: { activity_id: activityId },
        include: [
            {
                model: require('./User').default,
                as: 'creator',
                attributes: ['id', 'username', 'nickname']
            }
        ],
        order: [['created_at', 'DESC']]
    });
};

// 静态方法：获取活动的账单列表
AABill.getByActivity = async function(activityId, options = {}) {
    const { limit = 10, offset = 0, status = null } = options;

    const whereClause = { activity_id: activityId };
    if (status) {
        whereClause.status = status;
    }

    return await this.findAndCountAll({
        where: whereClause,
        include: [
            {
                model: require('./User').default,
                as: 'creator',
                attributes: ['id', 'username', 'nickname']
            }
        ],
        order: [['created_at', 'DESC']],
        limit,
        offset
    });
};

// 静态方法：创建账单
AABill.createBill = async function(billData) {
    const {
        activity_id,
        creator_id,
        total_cost,
        expense_total_cost,
        base_total_cost,
        use_custom_total_cost = false,
        custom_total_cost = null,
        participant_count = 0,
        total_ratio = 0,
        average_cost = 0,
        bill_details = [],
        status = 'saved'
    } = billData;

    return await this.create({
        activity_id,
        creator_id,
        total_cost,
        expense_total_cost,
        base_total_cost,
        use_custom_total_cost,
        custom_total_cost,
        participant_count,
        total_ratio,
        average_cost,
        bill_details,
        status
    });
};

// 静态方法：更新账单状态
AABill.updateStatus = async function(billId, status) {
    return await this.update(
        {
            status,
            ...(status === 'pushed' ? { pushed_at: new Date() } : {})
        },
        { where: { id: billId } }
    );
};

module.exports = AABill;