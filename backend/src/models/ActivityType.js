const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ActivityType = sequelize.define('ActivityType', {
  id: {
    type: DataTypes.STRING(50),
    primaryKey: true,
    allowNull: false,
    validate: {
      notEmpty: {
        msg: '活动类型ID不能为空'
      },
      is: {
        args: /^[a-z_]+$/,
        msg: '活动类型ID只能包含小写字母和下划线'
      }
    }
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    validate: {
      notEmpty: {
        msg: '活动类型名称不能为空'
      },
      len: {
        args: [1, 100],
        msg: '活动类型名称长度必须在1-100个字符之间'
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
  tableName: 'activity_types',
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
ActivityType.associate = (models) => {
  // 活动类型与活动的关联
  ActivityType.hasMany(models.Activity, {
    foreignKey: 'type',
    sourceKey: 'id',
    as: 'activities'
  });
};

// 实例方法
ActivityType.prototype.toJSON = function() {
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
ActivityType.findActive = async function(options = {}) {
  return await this.findAll({
    where: {
      is_active: true
    },
    order: [['sort_order', 'ASC'], ['created_at', 'ASC']],
    ...options
  });
};

ActivityType.findDefault = async function(options = {}) {
  return await this.findAll({
    where: {
      is_default: true,
      is_active: true
    },
    order: [['sort_order', 'ASC'], ['created_at', 'ASC']],
    ...options
  });
};

ActivityType.findByIdWithActivityCount = async function(id, options = {}) {
  const { Op } = require('sequelize');
  
  return await this.findByPk(id, {
    include: [
      {
        model: sequelize.models.Activity,
        as: 'activities',
        attributes: [],
        where: {
          status: {
            [Op.ne]: 'cancelled'
          }
        },
        required: false
      }
    ],
    attributes: {
      include: [
        [sequelize.fn('COUNT', sequelize.col('activities.id')), 'activity_count']
      ]
    },
    group: ['ActivityType.id'],
    ...options
  });
};

// 钩子函数
ActivityType.addHook('beforeDestroy', async (activityType, options) => {
  // 检查是否有活动在使用此类型
  const { Op } = require('sequelize');
  const Activity = sequelize.models.Activity;
  
  const activityCount = await Activity.count({
    where: {
      type: activityType.id,
      status: {
        [Op.ne]: 'cancelled'
      }
    }
  });
  
  if (activityCount > 0) {
    throw new Error(`该活动类型正在被 ${activityCount} 个活动使用，无法删除`);
  }
});

ActivityType.addHook('beforeUpdate', async (activityType, options) => {
  // 允许修改所有字段，包括默认类型
  // 只保留ID不可修改的限制（因为ID是主键）
  if (activityType.changed('id')) {
    throw new Error('活动类型ID不能修改');
  }
});

module.exports = ActivityType;