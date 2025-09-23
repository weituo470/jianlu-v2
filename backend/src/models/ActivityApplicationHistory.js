const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ActivityApplicationHistory = sequelize.define('ActivityApplicationHistory', {
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
    comment: '活动ID'
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
  participant_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'activity_participants',
      key: 'id'
    },
    comment: '参与者记录ID'
  },
  old_status: {
    type: DataTypes.ENUM('pending', 'registered', 'approved', 'attended', 'absent', 'cancelled', 'rejected'),
    allowNull: true,
    comment: '原状态'
  },
  new_status: {
    type: DataTypes.ENUM('pending', 'registered', 'approved', 'attended', 'absent', 'cancelled', 'rejected'),
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
  tableName: 'activity_application_histories',
  timestamps: false,
  indexes: [
    {
      fields: ['activity_id']
    },
    {
      fields: ['user_id']
    },
    {
      fields: ['participant_id']
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
ActivityApplicationHistory.associate = (models) => {
  // 历史记录属于活动
  ActivityApplicationHistory.belongsTo(models.Activity, {
    foreignKey: 'activity_id',
    as: 'activity'
  });

  // 历史记录属于用户（申请人）
  ActivityApplicationHistory.belongsTo(models.User, {
    foreignKey: 'user_id',
    as: 'user'
  });

  // 历史记录属于参与者记录
  ActivityApplicationHistory.belongsTo(models.ActivityParticipant, {
    foreignKey: 'participant_id',
    as: 'participant'
  });

  // 历史记录的操作人
  ActivityApplicationHistory.belongsTo(models.User, {
    foreignKey: 'changed_by',
    as: 'operator'
  });
};

module.exports = ActivityApplicationHistory;