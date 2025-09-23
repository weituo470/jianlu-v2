const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const TeamMember = sequelize.define('TeamMember', {
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
    }
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  role: {
    type: DataTypes.ENUM('admin', 'member'),
    defaultValue: 'member',
    allowNull: false
  },
  joined_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    comment: '加入时间'
  }
}, {
  tableName: 'team_members',
  timestamps: false,
  indexes: [
    {
      unique: true,
      fields: ['team_id', 'user_id']
    },
    {
      fields: ['team_id']
    },
    {
      fields: ['user_id']
    }
  ]
});

// 定义关联关系
TeamMember.associate = (models) => {
  TeamMember.belongsTo(models.Team, {
    foreignKey: 'team_id',
    as: 'team'
  });
  
  TeamMember.belongsTo(models.User, {
    foreignKey: 'user_id',
    as: 'user'
  });
};

// 实例方法
TeamMember.prototype.toJSON = function() {
  const values = { ...this.get() };
  
  // 格式化时间
  if (values.joined_at) {
    values.joined_at = values.joined_at.toISOString();
  }
  
  return values;
};

// 类方法
TeamMember.findByTeam = async function(teamId, options = {}) {
  return await this.findAll({
    where: {
      team_id: teamId
    },
    include: [
      {
        model: sequelize.models.User,
        as: 'user',
        attributes: ['id', 'username', 'email', 'profile']
      }
    ],
    order: [['joined_at', 'ASC']],
    ...options
  });
};

TeamMember.findByUser = async function(userId, options = {}) {
  return await this.findAll({
    where: {
      user_id: userId
    },
    include: [
      {
        model: sequelize.models.Team,
        as: 'team',
        attributes: ['id', 'name', 'description', 'avatar_url', 'status']
      }
    ],
    order: [['joined_at', 'DESC']],
    ...options
  });
};

TeamMember.isTeamAdmin = async function(teamId, userId) {
  const member = await this.findOne({
    where: {
      team_id: teamId,
      user_id: userId,
      role: 'admin'
    }
  });
  
  return !!member;
};

TeamMember.isTeamMember = async function(teamId, userId) {
  const member = await this.findOne({
    where: {
      team_id: teamId,
      user_id: userId
    }
  });
  
  return !!member;
};

// 钩子函数
TeamMember.addHook('afterCreate', async (teamMember, options) => {
  // 添加成员后更新团队成员数量
  const team = await sequelize.models.Team.findByPk(teamMember.team_id, {
    transaction: options.transaction
  });
  
  if (team) {
    await team.increment('member_count', {
      transaction: options.transaction
    });
  }
});

TeamMember.addHook('afterDestroy', async (teamMember, options) => {
  // 移除成员后更新团队成员数量
  const team = await sequelize.models.Team.findByPk(teamMember.team_id, {
    transaction: options.transaction
  });
  
  if (team) {
    await team.decrement('member_count', {
      transaction: options.transaction
    });
  }
});

// 类方法：申请加入团队
TeamMember.applyToTeam = async function(teamId, userId, data = {}) {
  const { Team, User, TeamApplication } = sequelize.models;

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
  const existingMember = await TeamMember.findOne({
    where: {
      team_id: teamId,
      user_id: userId
    }
  });

  if (existingMember) {
    throw new Error('您已经是该团队的成员');
  }

  // 根据团队设置决定是直接加入还是需要审核
  if (team.require_approval) {
    // 需要审核，创建申请记录
    const { TeamApplication } = require('./TeamApplication');
    const application = await TeamApplication.createApplication(teamId, userId, data.reason || '');
    return {
      type: 'application',
      data: application,
      message: '申请已提交，请等待审核'
    };
  } else {
    // 直接加入团队
    const member = await TeamMember.create({
      team_id: teamId,
      user_id: userId,
      role: 'member',
      joined_at: new Date()
    });

    // 更新团队成员数量
    await team.increment('member_count');

    return {
      type: 'member',
      data: member,
      message: '成功加入团队'
    };
  }
};

// 类方法：批准申请（已简化，直接加入团队无需审核）
TeamMember.approve = async function(memberId, approverId, note = '') {
  // 由于采用直接加入模式，此方法暂时保留但不执行任何操作
  const member = await TeamMember.findByPk(memberId);
  if (!member) {
    throw new Error('成员记录不存在');
  }
  return member;
};

// 类方法：拒绝申请（已简化，直接加入团队无需审核）
TeamMember.reject = async function(memberId, rejecterId, reason = '') {
  // 由于采用直接加入模式，此方法暂时保留但不执行任何操作
  const member = await TeamMember.findByPk(memberId);
  if (!member) {
    throw new Error('成员记录不存在');
  }
  return member;
};

// 类方法：取消申请（已简化，直接退出团队）
TeamMember.cancel = async function(memberId, userId) {
  const member = await TeamMember.findOne({
    where: {
      id: memberId,
      user_id: userId
    }
  });

  if (!member) {
    throw new Error('成员记录不存在');
  }

  // 直接删除成员记录
  await member.destroy();

  return member;
};

module.exports = TeamMember;