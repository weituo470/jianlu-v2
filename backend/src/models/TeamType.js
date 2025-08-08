const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const TeamType = sequelize.define('TeamType', {
  id: {
    type: DataTypes.STRING(50),
    primaryKey: true,
    allowNull: false,
    validate: {
      notEmpty: {
        msg: '团队类型ID不能为空'
      },
      is: {
        args: /^[a-z_]+$/,
        msg: '团队类型ID只能包含小写字母和下划线'
      }
    }
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      notEmpty: {
        msg: '团队类型名称不能为空'
      },
      len: {
        args: [1, 100],
        msg: '团队类型名称长度必须在1-100个字符之间'
      }
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
    defaultValue: ''
  },
  is_default: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false,
    comment: '是否为系统默认类型'
  },
  sort_order: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: false,
    comment: '排序顺序'
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false,
    comment: '是否启用'
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
  tableName: 'team_types',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['is_active']
    },
    {
      fields: ['is_default']
    },
    {
      fields: ['sort_order']
    }
  ]
});

// 定义关联关系
TeamType.associate = (models) => {
  // 团队类型与团队的关联
  TeamType.hasMany(models.Team, {
    foreignKey: 'team_type',
    sourceKey: 'id',
    as: 'teams'
  });
};

// 实例方法
TeamType.prototype.toJSON = function() {
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
TeamType.findActive = async function(options = {}) {
  return await this.findAll({
    where: {
      is_active: true
    },
    order: [['sort_order', 'ASC'], ['created_at', 'ASC']],
    ...options
  });
};

TeamType.findDefault = async function(options = {}) {
  return await this.findAll({
    where: {
      is_default: true,
      is_active: true
    },
    order: [['sort_order', 'ASC'], ['created_at', 'ASC']],
    ...options
  });
};

TeamType.findByIdWithTeamCount = async function(id, options = {}) {
  const { Op } = require('sequelize');
  
  return await this.findByPk(id, {
    include: [
      {
        model: sequelize.models.Team,
        as: 'teams',
        attributes: [],
        where: {
          status: {
            [Op.ne]: 'dissolved'
          }
        },
        required: false
      }
    ],
    attributes: {
      include: [
        [sequelize.fn('COUNT', sequelize.col('teams.id')), 'team_count']
      ]
    },
    group: ['TeamType.id'],
    ...options
  });
};

// 钩子函数
TeamType.addHook('beforeDestroy', async (teamType, options) => {
  // 检查是否有团队在使用此类型
  const { Op } = require('sequelize');
  const Team = sequelize.models.Team;
  
  const teamCount = await Team.count({
    where: {
      team_type: teamType.id,
      status: {
        [Op.ne]: 'dissolved'
      }
    }
  });
  
  if (teamCount > 0) {
    throw new Error(`该团队类型正在被 ${teamCount} 个团队使用，无法删除`);
  }
});

TeamType.addHook('beforeUpdate', async (teamType, options) => {
  // 允许修改所有字段，包括默认类型
  // 只保留ID不可修改的限制（因为ID是主键）
  if (teamType.changed('id')) {
    throw new Error('团队类型ID不能修改');
  }
});

module.exports = TeamType;