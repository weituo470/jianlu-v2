const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const TeamApplicationHistory = sequelize.define('TeamApplicationHistory', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  team_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'teams',
      key: 'id'
    },
    comment: '团队ID'
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    },
    comment: '用户ID'
  },
  application_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'team_applications',
      key: 'id'
    },
    comment: '申请记录ID'
  },
  old_status: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected', 'cancelled'),
    allowNull: true,
    comment: '原状态'
  },
  new_status: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected', 'cancelled'),
    allowNull: false,
    comment: '新状态'
  },
  changed_by: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    },
    comment: '操作人ID'
  },
  reason: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '操作原因'
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    comment: '创建时间'
  }
}, {
  tableName: 'team_application_histories',
  timestamps: false,
  indexes: [
    {
      fields: ['team_id']
    },
    {
      fields: ['user_id']
    },
    {
      fields: ['member_id']
    },
    {
      fields: ['changed_by']
    },
    {
      fields: ['created_at']
    }
  ]
});

// 定义关联关系
TeamApplicationHistory.associate = (models) => {
  // 历史记录属于团队
  TeamApplicationHistory.belongsTo(models.Team, {
    foreignKey: 'team_id',
    as: 'team'
  });

  // 历史记录属于用户（申请人）
  TeamApplicationHistory.belongsTo(models.User, {
    foreignKey: 'user_id',
    as: 'user'
  });

  // 历史记录属于申请记录
  TeamApplicationHistory.belongsTo(models.TeamApplication, {
    foreignKey: 'application_id',
    as: 'application'
  });

  // 历史记录的操作人
  TeamApplicationHistory.belongsTo(models.User, {
    foreignKey: 'changed_by',
    as: 'operator'
  });
};

module.exports = TeamApplicationHistory;