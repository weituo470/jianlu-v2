const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const UserDeletionAudit = sequelize.define('UserDeletionAudit', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  original_user_id: {
    type: DataTypes.UUID,
    allowNull: false,
    comment: '被删除用户的原始ID'
  },
  deleted_user_data: {
    type: DataTypes.JSON,
    allowNull: false,
    comment: '被删除用户的完整数据'
  },
  deletion_reason: {
    type: DataTypes.STRING(255),
    allowNull: true,
    comment: '删除原因'
  },
  deletion_type: {
    type: DataTypes.ENUM('soft', 'hard', 'auto'),
    allowNull: false,
    defaultValue: 'soft',
    comment: '删除类型：软删除、硬删除、自动清理'
  },
  deleted_by: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: '执行删除操作的用户ID，system表示系统自动'
  },
  deleted_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    comment: '删除时间'
  },
  can_restore: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: true,
    comment: '是否可以恢复'
  },
  restored_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '恢复时间'
  },
  restored_by: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: '执行恢复操作的用户ID'
  }
}, {
  tableName: 'user_deletion_audit',
  timestamps: false, // 使用自定义的时间字段
  indexes: [
    {
      fields: ['original_user_id']
    },
    {
      fields: ['deleted_by']
    },
    {
      fields: ['deleted_at']
    },
    {
      fields: ['deletion_type']
    },
    {
      fields: ['can_restore']
    }
  ]
});

// 实例方法
UserDeletionAudit.prototype.canBeRestored = function() {
  return this.can_restore && !this.restored_at;
};

UserDeletionAudit.prototype.getOriginalUserData = function() {
  return this.deleted_user_data;
};

// 类方法
UserDeletionAudit.findByOriginalUserId = function(userId) {
  return UserDeletionAudit.findAll({
    where: { original_user_id: userId },
    order: [['deleted_at', 'DESC']]
  });
};

UserDeletionAudit.findRestorableUsers = function() {
  return UserDeletionAudit.findAll({
    where: { 
      can_restore: true,
      restored_at: null 
    },
    order: [['deleted_at', 'DESC']]
  });
};

UserDeletionAudit.getStatistics = async function() {
  const stats = await UserDeletionAudit.findAll({
    attributes: [
      'deletion_type',
      [sequelize.fn('COUNT', sequelize.col('id')), 'count']
    ],
    group: ['deletion_type'],
    raw: true
  });

  const total = await UserDeletionAudit.count();
  const restorable = await UserDeletionAudit.count({
    where: { 
      can_restore: true,
      restored_at: null 
    }
  });

  return {
    total,
    restorable,
    byType: stats.reduce((acc, item) => {
      acc[item.deletion_type] = parseInt(item.count);
      return acc;
    }, {})
  };
};

module.exports = UserDeletionAudit;