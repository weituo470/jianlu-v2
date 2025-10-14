const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ActivityExpense = sequelize.define('ActivityExpense', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    comment: '费用记录ID'
  },
  activity_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'activities',
      key: 'id'
    },
    comment: '关联的活动ID'
  },
  item: {
    type: DataTypes.STRING(200),
    allowNull: false,
    comment: '费用事项'
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.00,
    allowNull: false,
    comment: '金额'
  },
  expense_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    comment: '费用发生日期'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '备注说明'
  },
  payer: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: '付款人'
  },
  image_path: {
    type: DataTypes.STRING(500),
    allowNull: true,
    comment: '图片存档路径'
  },
  recorder_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    },
    comment: '记录人ID'
  }
}, {
  tableName: 'activity_expenses',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  charset: 'utf8mb4',
  collate: 'utf8mb4_unicode_ci'
});

// 定义关联关系
ActivityExpense.associate = (models) => {
  // 费用记录属于活动
  ActivityExpense.belongsTo(models.Activity, {
    foreignKey: 'activity_id',
    as: 'activity'
  });

  // 费用记录属于记录人
  ActivityExpense.belongsTo(models.User, {
    foreignKey: 'recorder_id',
    as: 'recorder'
  });
};

module.exports = ActivityExpense;