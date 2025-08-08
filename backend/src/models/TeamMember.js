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
    defaultValue: DataTypes.NOW
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

module.exports = TeamMember;