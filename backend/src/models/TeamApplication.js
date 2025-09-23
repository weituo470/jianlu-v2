const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const TeamApplication = sequelize.define('TeamApplication', {
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
    comment: '申请用户ID'
  },
  reason: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '申请理由'
  },
  status: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected', 'cancelled'),
    defaultValue: 'pending',
    allowNull: false,
    comment: '申请状态'
  },
  rejection_reason: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '拒绝原因'
  },
  applied_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    comment: '申请时间'
  },
  processed_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '处理时间'
  },
  processed_by: {
    type: DataTypes.UUID,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    },
    comment: '处理人ID'
  }
}, {
  tableName: 'team_applications',
  timestamps: false,
  indexes: [
    {
      unique: true,
      fields: ['team_id', 'user_id', 'status'],
      where: {
        status: 'pending'
      },
      name: 'uk_team_user_pending'
    },
    {
      fields: ['team_id']
    },
    {
      fields: ['user_id']
    },
    {
      fields: ['status']
    },
    {
      fields: ['applied_at']
    }
  ]
});

// 定义关联关系
TeamApplication.associate = (models) => {
  TeamApplication.belongsTo(models.Team, {
    foreignKey: 'team_id',
    as: 'team'
  });

  TeamApplication.belongsTo(models.User, {
    foreignKey: 'user_id',
    as: 'user'
  });

  TeamApplication.belongsTo(models.User, {
    foreignKey: 'processed_by',
    as: 'processor'
  });
};


// 类方法：创建申请
TeamApplication.createApplication = async function(teamId, userId, reason = '') {
  const { Team, User } = sequelize.models;

  // 检查用户是否存在
  const user = await User.findByPk(userId);
  if (!user) {
    throw new Error('用户不存在');
  }

  // 检查团队是否存在
  const team = await Team.findByPk(teamId);
  if (!team) {
    throw new Error('团队不存在');
  }

  // 检查是否已经是成员
  const existingMember = await sequelize.models.TeamMember.findOne({
    where: {
      team_id: teamId,
      user_id: userId
    }
  });

  if (existingMember) {
    throw new Error('您已经是该团队的成员');
  }

  // 检查是否有待处理的申请
  const existingApplication = await TeamApplication.findOne({
    where: {
      team_id: teamId,
      user_id: userId,
      status: 'pending'
    }
  });

  if (existingApplication) {
    throw new Error('您已经提交过申请，请等待审核');
  }

  // 创建申请记录
  const application = await TeamApplication.create({
    team_id: teamId,
    user_id: userId,
    reason: reason,
    status: 'pending',
    applied_at: new Date()
  });

  return application;
};

// 类方法：批准申请
TeamApplication.approve = async function(applicationId, approverId, note = '') {
  const { TeamMember, TeamApplicationHistory } = sequelize.models;

  const application = await TeamApplication.findByPk(applicationId, {
    include: [
      { model: sequelize.models.Team, as: 'team' },
      { model: sequelize.models.User, as: 'user' }
    ]
  });

  if (!application) {
    throw new Error('申请记录不存在');
  }

  if (application.status !== 'pending') {
    throw new Error('只能处理待审核的申请');
  }

  const oldStatus = application.status;

  // 更新申请状态
  await application.update({
    status: 'approved',
    processed_at: new Date(),
    processed_by: approverId
  });

  // 创建团队成员记录
  await TeamMember.create({
    team_id: application.team_id,
    user_id: application.user_id,
    role: 'member',
    joined_at: new Date()
  });

  // 更新团队成员数量
  await application.team.increment('member_count');

  // 记录历史
  if (TeamApplicationHistory) {
    await TeamApplicationHistory.create({
      team_id: application.team_id,
      user_id: application.user_id,
      application_id: application.id,
      old_status: oldStatus,
      new_status: 'approved',
      changed_by: approverId,
      reason: note
    });
  }

  return application;
};

// 类方法：拒绝申请
TeamApplication.reject = async function(applicationId, rejecterId, reason = '') {
  const { TeamApplicationHistory } = sequelize.models;

  const application = await TeamApplication.findByPk(applicationId, {
    include: [
      { model: sequelize.models.Team, as: 'team' },
      { model: sequelize.models.User, as: 'user' }
    ]
  });

  if (!application) {
    throw new Error('申请记录不存在');
  }

  if (application.status !== 'pending') {
    throw new Error('只能处理待审核的申请');
  }

  const oldStatus = application.status;

  // 更新申请状态
  await application.update({
    status: 'rejected',
    rejection_reason: reason,
    processed_at: new Date(),
    processed_by: rejecterId
  });

  // 记录历史
  if (TeamApplicationHistory) {
    await TeamApplicationHistory.create({
      team_id: application.team_id,
      user_id: application.user_id,
      application_id: application.id,
      old_status: oldStatus,
      new_status: 'rejected',
      changed_by: rejecterId,
      reason: reason
    });
  }

  return application;
};

// 类方法：取消申请
TeamApplication.cancel = async function(applicationId, userId) {
  const { TeamApplicationHistory } = sequelize.models;

  const application = await TeamApplication.findOne({
    where: {
      id: applicationId,
      user_id: userId
    }
  });

  if (!application) {
    throw new Error('申请记录不存在');
  }

  if (application.status !== 'pending') {
    throw new Error('只能取消待审核的申请');
  }

  const oldStatus = application.status;

  // 更新申请状态
  await application.update({
    status: 'cancelled',
    processed_at: new Date()
  });

  // 记录历史
  if (TeamApplicationHistory) {
    await TeamApplicationHistory.create({
      team_id: application.team_id,
      user_id: application.user_id,
      application_id: application.id,
      old_status: oldStatus,
      new_status: 'cancelled',
      changed_by: userId,
      reason: '用户取消申请'
    });
  }

  return application;
};

module.exports = TeamApplication;