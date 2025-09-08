const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ActivityParticipantRole = sequelize.define('ActivityParticipantRole', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  activity_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'activities', key: 'id' }
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'users', key: 'id' }
  },
  role_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'activity_roles', key: 'id' }
  },
  assigned_by: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'users', key: 'id' },
    comment: '分配角色的用户ID'
  },
  assigned_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  is_hidden: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: '是否隐身（创建人隐身功能）'
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive'),
    defaultValue: 'active',
    allowNull: false
  }
}, {
  tableName: 'activity_participant_roles',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { unique: true, fields: ['activity_id', 'user_id', 'role_id'] },
    { fields: ['activity_id'] },
    { fields: ['user_id'] },
    { fields: ['role_id'] },
    { fields: ['status'] }
  ]
});

// 关联关系
ActivityParticipantRole.associate = (models) => {
  ActivityParticipantRole.belongsTo(models.Activity, {
    foreignKey: 'activity_id',
    as: 'activity'
  });
  
  ActivityParticipantRole.belongsTo(models.User, {
    foreignKey: 'user_id',
    as: 'user'
  });
  
  ActivityParticipantRole.belongsTo(models.ActivityRole, {
    foreignKey: 'role_id',
    as: 'role'
  });
  
  ActivityParticipantRole.belongsTo(models.User, {
    foreignKey: 'assigned_by',
    as: 'assigner'
  });
};

// 类方法
ActivityParticipantRole.findByActivity = async function(activityId, options = {}) {
  return await this.findAll({
    where: {
      activity_id: activityId,
      status: 'active'
    },
    include: [
      {
        model: sequelize.models.User,
        as: 'user',
        attributes: ['id', 'username', 'email', 'profile']
      },
      {
        model: sequelize.models.ActivityRole,
        as: 'role',
        attributes: ['id', 'name', 'permissions']
      }
    ],
    order: [
      [{ model: sequelize.models.ActivityRole, as: 'role' }, 'sort_order', 'ASC'],
      ['assigned_at', 'ASC']
    ],
    ...options
  });
};

ActivityParticipantRole.findByUser = async function(userId, options = {}) {
  return await this.findAll({
    where: {
      user_id: userId,
      status: 'active'
    },
    include: [
      {
        model: sequelize.models.Activity,
        as: 'activity',
        attributes: ['id', 'title', 'status', 'start_time', 'end_time']
      },
      {
        model: sequelize.models.ActivityRole,
        as: 'role',
        attributes: ['id', 'name', 'permissions']
      }
    ],
    order: [['assigned_at', 'DESC']],
    ...options
  });
};

ActivityParticipantRole.hasPermission = async function(activityId, userId, permission) {
  const roles = await this.findAll({
    where: {
      activity_id: activityId,
      user_id: userId,
      status: 'active'
    },
    include: [
      {
        model: sequelize.models.ActivityRole,
        as: 'role'
      }
    ]
  });
  
  return roles.some(participantRole => 
    participantRole.role && 
    participantRole.role.permissions && 
    participantRole.role.permissions.includes(permission)
  );
};

ActivityParticipantRole.getUserRoles = async function(activityId, userId) {
  return await this.findAll({
    where: {
      activity_id: activityId,
      user_id: userId,
      status: 'active'
    },
    include: [
      {
        model: sequelize.models.ActivityRole,
        as: 'role'
      }
    ]
  });
};

// 批量分配角色
ActivityParticipantRole.assignRoles = async function(activityId, assignments, assignedBy, transaction = null) {
  const results = [];
  
  for (const assignment of assignments) {
    const { user_id, role_id, is_hidden = false } = assignment;
    
    // 检查是否已存在相同的角色分配
    const existing = await this.findOne({
      where: {
        activity_id: activityId,
        user_id,
        role_id,
        status: 'active'
      },
      transaction
    });
    
    if (existing) {
      results.push({ user_id, role_id, status: 'exists', record: existing });
      continue;
    }
    
    // 创建新的角色分配
    const participantRole = await this.create({
      activity_id: activityId,
      user_id,
      role_id,
      assigned_by: assignedBy,
      is_hidden
    }, { transaction });
    
    results.push({ user_id, role_id, status: 'created', record: participantRole });
  }
  
  return results;
};

// 移除角色
ActivityParticipantRole.removeRole = async function(activityId, userId, roleId, transaction = null) {
  const participantRole = await this.findOne({
    where: {
      activity_id: activityId,
      user_id: userId,
      role_id: roleId,
      status: 'active'
    },
    transaction
  });
  
  if (participantRole) {
    await participantRole.update({ status: 'inactive' }, { transaction });
    return true;
  }
  
  return false;
};

module.exports = ActivityParticipantRole;