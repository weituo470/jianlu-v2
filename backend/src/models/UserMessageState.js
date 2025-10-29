const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const UserMessageState = sequelize.define('UserMessageState', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        comment: '状态记录ID'
    },
    user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        comment: '用户ID'
    },
    message_id: {
        type: DataTypes.UUID,
        allowNull: false,
        comment: '消息ID'
    },
    is_read: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: '是否已读'
    },
    is_deleted: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: '是否已删除'
    },
    is_hidden: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: '是否已隐藏'
    },
    read_at: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: null,
        comment: '阅读时间'
    },
    deleted_at: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: null,
        comment: '删除时间'
    },
    hidden_at: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: null,
        comment: '隐藏时间'
    },
    created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
        comment: '创建时间'
    },
    updated_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
        comment: '更新时间'
    }
}, {
    tableName: 'user_message_states',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    indexes: [
        {
            unique: true,
            fields: ['user_id', 'message_id'],
            name: 'uk_user_message_states_user_message'
        },
        {
            fields: ['user_id'],
            name: 'idx_user_message_states_user_id'
        },
        {
            fields: ['message_id'],
            name: 'idx_user_message_states_message_id'
        },
        {
            fields: ['is_deleted'],
            name: 'idx_user_message_states_is_deleted'
        },
        {
            fields: ['is_hidden'],
            name: 'idx_user_message_states_is_hidden'
        },
        {
            fields: ['is_read'],
            name: 'idx_user_message_states_is_read'
        }
    ]
});

// 实例方法
UserMessageState.prototype.markAsRead = async function() {
    if (!this.is_read) {
        this.is_read = true;
        this.read_at = new Date();
        await this.save();
    }
    return this;
};

UserMessageState.prototype.markAsUnread = async function() {
    if (this.is_read) {
        this.is_read = false;
        this.read_at = null;
        await this.save();
    }
    return this;
};

UserMessageState.prototype.markAsDeleted = async function() {
    if (!this.is_deleted) {
        this.is_deleted = true;
        this.deleted_at = new Date();
        await this.save();
    }
    return this;
};

UserMessageState.prototype.markAsHidden = async function() {
    if (!this.is_hidden) {
        this.is_hidden = true;
        this.hidden_at = new Date();
        await this.save();
    }
    return this;
};

UserMessageState.prototype.restore = async function() {
    this.is_deleted = false;
    this.is_hidden = false;
    this.deleted_at = null;
    this.hidden_at = null;
    await this.save();
    return this;
};

// 类方法
UserMessageState.findByUserAndMessage = async function(userId, messageId) {
    return await this.findOne({
        where: {
            user_id: userId,
            message_id: messageId
        }
    });
};

UserMessageState.getOrCreateState = async function(userId, messageId) {
    let state = await this.findByUserAndMessage(userId, messageId);

    if (!state) {
        state = await this.create({
            user_id: userId,
            message_id: messageId
        });
    }

    return state;
};

UserMessageState.getVisibleMessagesForUser = async function(userId, options = {}) {
    const {
        page = 1,
        limit = 20,
        type,
        is_read,
        priority,
        unread_only = false
    } = options;

    const whereClause = {
        user_id: userId,
        is_deleted: false,
        is_hidden: false
    };

    // 构建查询条件
    const includeClause = [{
        model: require('./Message'),
        as: 'message',
        where: {},
        include: [
            {
                model: require('./User'),
                as: 'sender',
                attributes: ['id', 'username', 'nickname']
            }
        ]
    }];

    // 添加消息类型过滤
    if (type) {
        includeClause[0].where.type = type;
    }

    // 添加优先级过滤
    if (priority) {
        includeClause[0].where.priority = priority;
    }

    // 添加已读状态过滤
    if (unread_only) {
        whereClause.is_read = false;
    } else if (is_read !== undefined) {
        whereClause.is_read = is_read === 'true';
    }

    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { count, rows } = await this.findAndCountAll({
        where: whereClause,
        include: includeClause,
        order: [['created_at', 'DESC']],
        limit: parseInt(limit),
        offset: offset
    });

    // 提取消息数据
    const messages = rows.map(row => ({
        ...row.message.get({ plain: true }),
        user_message_state: {
            is_read: row.is_read,
            is_deleted: row.is_deleted,
            is_hidden: row.is_hidden,
            read_at: row.read_at,
            deleted_at: row.deleted_at,
            hidden_at: row.hidden_at
        }
    }));

    return {
        rows: messages,
        count
    };
};

UserMessageState.getUnreadCountForUser = async function(userId) {
    return await this.count({
        where: {
            user_id: userId,
            is_read: false,
            is_deleted: false,
            is_hidden: false
        }
    });
};

UserMessageState.markAllAsReadForUser = async function(userId) {
    const result = await this.update(
        {
            is_read: true,
            read_at: new Date()
        },
        {
            where: {
                user_id: userId,
                is_read: false,
                is_deleted: false,
                is_hidden: false
            }
        }
    );

    return result[0]; // 返回更新的记录数
};

// 定义模型关联
UserMessageState.associate = function(models) {
  // 关联用户
  UserMessageState.belongsTo(models.User, {
    foreignKey: 'user_id',
    as: 'user'
  });

  // 关联消息
  UserMessageState.belongsTo(models.Message, {
    foreignKey: 'message_id',
    as: 'message'
  });
};

module.exports = UserMessageState;