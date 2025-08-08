const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const UserActivity = sequelize.define('UserActivity', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false
  },
  admin_id: {
    type: DataTypes.UUID,
    allowNull: true
  },
  action_type: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  action_description: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  target_type: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  target_id: {
    type: DataTypes.UUID,
    allowNull: true
  },
  ip_address: {
    type: DataTypes.STRING(45),
    allowNull: true
  },
  user_agent: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  metadata: {
    type: DataTypes.JSON,
    defaultValue: {}
  }
}, {
  tableName: 'user_activities',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false
});

// 关联关系将在模型加载后设置

// 静态方法：记录用户活动
UserActivity.logActivity = async function(data) {
  try {
    return await UserActivity.create({
      user_id: data.userId,
      admin_id: data.adminId || null,
      action_type: data.actionType,
      action_description: data.description,
      target_type: data.targetType || null,
      target_id: data.targetId || null,
      ip_address: data.ipAddress || null,
      user_agent: data.userAgent || null,
      metadata: data.metadata || {}
    });
  } catch (error) {
    console.error('记录用户活动失败:', error);
    return null;
  }
};

// 静态方法：获取用户活动记录
UserActivity.getUserActivities = async function(userId, options = {}) {
  const { page = 1, limit = 20, actionType } = options;
  const offset = (page - 1) * limit;
  
  const whereConditions = { user_id: userId };
  if (actionType) {
    whereConditions.action_type = actionType;
  }
  
  return await UserActivity.findAndCountAll({
    where: whereConditions,
    limit,
    offset,
    order: [['created_at', 'DESC']]
  });
};

module.exports = UserActivity;