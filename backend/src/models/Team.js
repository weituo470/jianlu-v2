const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Team = sequelize.define('Team', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      notEmpty: {
        msg: '团队名称不能为空'
      },
      len: {
        args: [2, 100],
        msg: '团队名称长度必须在2-100个字符之间'
      }
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  avatar_url: {
    type: DataTypes.STRING(255),
    allowNull: true,
    validate: {
      isUrl: {
        args: true,
        msg: '头像URL格式不正确'
      },
      // 自定义验证：允许空值或有效URL
      customUrlValidation(value) {
        if (value && value.trim() !== '') {
          const urlPattern = /^https?:\/\/.+/;
          if (!urlPattern.test(value)) {
            throw new Error('头像URL格式不正确，必须以http://或https://开头');
          }
        }
      }
    }
  },
  creator_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  team_type: {
    type: DataTypes.ENUM('general', 'development', 'testing', 'design', 'marketing', 'operation', 'research', 'support'),
    defaultValue: 'general',
    allowNull: false,
    comment: '团队类型'
  },
  status: {
    type: DataTypes.ENUM('active', 'inactive', 'dissolved'),
    defaultValue: 'active',
    allowNull: false
  },
  member_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: false
  },
  activity_count: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: false
  },
  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  updated_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'teams',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['creator_id']
    },
    {
      fields: ['status']
    },
    {
      fields: ['created_at']
    }
  ]
});

// 定义关联关系
Team.associate = (models) => {
  // 团队创建者
  Team.belongsTo(models.User, {
    foreignKey: 'creator_id',
    as: 'creator'
  });
  
  // 团队成员
  Team.belongsToMany(models.User, {
    through: models.TeamMember,
    foreignKey: 'team_id',
    otherKey: 'user_id',
    as: 'members'
  });
  
  // 团队类型
  Team.belongsTo(models.TeamType, {
    foreignKey: 'team_type',
    targetKey: 'id',
    as: 'type'
  });
  
  // 团队活动 - 暂时注释掉，因为Activity模型不存在
  // Team.hasMany(models.Activity, {
  //   foreignKey: 'team_id',
  //   as: 'activities'
  // });
};

// 实例方法
Team.prototype.toJSON = function() {
  const values = { ...this.get() };
  
  // 格式化时间
  if (values.created_at) {
    values.created_at = values.created_at.toISOString();
  }
  if (values.updated_at) {
    values.updated_at = values.updated_at.toISOString();
  }
  
  return values;
};

// 类方法
Team.findWithDetails = async function(id, options = {}) {
  return await this.findByPk(id, {
    include: [
      {
        model: sequelize.models.User,
        as: 'creator',
        attributes: ['id', 'username', 'email', 'profile']
      },
      {
        model: sequelize.models.User,
        as: 'members',
        attributes: ['id', 'username', 'email', 'profile'],
        through: {
          attributes: ['role', 'joined_at']
        }
      }
    ],
    ...options
  });
};

Team.findByCreator = async function(creatorId, options = {}) {
  return await this.findAll({
    where: {
      creator_id: creatorId
    },
    include: [
      {
        model: sequelize.models.User,
        as: 'creator',
        attributes: ['id', 'username', 'email', 'profile']
      }
    ],
    order: [['created_at', 'DESC']],
    ...options
  });
};

Team.searchByName = async function(query, options = {}) {
  const { Op } = require('sequelize');
  
  return await this.findAll({
    where: {
      name: {
        [Op.like]: `%${query}%`
      },
      status: 'active'
    },
    include: [
      {
        model: sequelize.models.User,
        as: 'creator',
        attributes: ['id', 'username', 'email', 'profile']
      }
    ],
    order: [['created_at', 'DESC']],
    ...options
  });
};

// 钩子函数
Team.addHook('afterCreate', async (team, options) => {
  // 创建团队后，自动将创建者添加为管理员
  const TeamMember = sequelize.models.TeamMember;
  await TeamMember.create({
    team_id: team.id,
    user_id: team.creator_id,
    role: 'admin'
  }, { transaction: options.transaction });
  
  // 更新成员数量
  await team.update({
    member_count: 1
  }, { transaction: options.transaction });
});

module.exports = Team;