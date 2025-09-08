const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const Activity = sequelize.define('Activity', {
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
  title: {
    type: DataTypes.STRING(200),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  type: {
    type: DataTypes.STRING(100),
    allowNull: false,
    defaultValue: 'other'
  },
  start_time: {
    type: DataTypes.DATE,
    allowNull: true
  },
  end_time: {
    type: DataTypes.DATE,
    allowNull: true
  },
  location: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  max_participants: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  current_participants: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  status: {
    type: DataTypes.ENUM('draft', 'published', 'ongoing', 'completed', 'cancelled'),
    defaultValue: 'draft'
  },
  creator_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  },
  // 费用相关字段
  total_cost: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.00,
    comment: '活动总费用'
  },
  company_ratio: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 0.00,
    comment: '公司承担比例(0-100)'
  },
  cost_per_person: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.00,
    comment: '每人应付费用'
  },
  payment_deadline: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '支付截止时间'
  },
  cost_description: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '费用说明'
  }
}, {
  tableName: 'activities',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

// 定义关联关系
Activity.associate = (models) => {
  // 活动属于团队
  Activity.belongsTo(models.Team, {
    foreignKey: 'team_id',
    as: 'team'
  });

  // 活动属于创建者
  Activity.belongsTo(models.User, {
    foreignKey: 'creator_id',
    as: 'creator'
  });

  // 活动有多个参与者
  Activity.belongsToMany(models.User, {
    through: models.ActivityParticipant,
    foreignKey: 'activity_id',
    otherKey: 'user_id',
    as: 'participants'
  });

  // 活动属于活动类型 - 现在通过name关联而不是id
  Activity.belongsTo(models.ActivityType, {
    foreignKey: 'type',
    targetKey: 'name', // 改为通过name关联
    as: 'activityType'
  });
};

// 静态方法：获取活动详情（包含关联数据）
Activity.findWithDetails = async function(id) {
  return await this.findByPk(id, {
    include: [
      {
        model: sequelize.models.Team,
        as: 'team',
        attributes: ['id', 'name']
      },
      {
        model: sequelize.models.User,
        as: 'creator',
        attributes: ['id', 'username', 'email', 'profile']
      }
    ]
  });
};

// 实例方法：获取参与者数量
Activity.prototype.getParticipantCount = async function() {
  const count = await sequelize.models.ActivityParticipant.count({
    where: {
      activity_id: this.id,
      status: ['registered', 'attended']
    }
  });
  
  // 更新当前参与者数量
  if (count !== this.current_participants) {
    await this.update({ current_participants: count });
  }
  
  return count;
};

// 实例方法：检查是否可以参与
Activity.prototype.canParticipate = function() {
  if (this.status !== 'published') return false;
  if (this.max_participants && this.current_participants >= this.max_participants) return false;
  if (this.end_time && new Date() > new Date(this.end_time)) return false;
  return true;
};

// 实例方法：计算费用信息
Activity.prototype.calculateCosts = function(participantCount = null) {
  const count = participantCount || this.current_participants || 0;
  const totalCost = parseFloat(this.total_cost) || 0;
  const companyRatio = parseFloat(this.company_ratio) || 0;
  
  const companyCost = totalCost * (companyRatio / 100);
  const employeeTotalCost = totalCost - companyCost;
  const costPerPerson = count > 0 ? employeeTotalCost / count : 0;
  
  return {
    totalCost: totalCost.toFixed(2),
    companyCost: companyCost.toFixed(2),
    employeeTotalCost: employeeTotalCost.toFixed(2),
    costPerPerson: costPerPerson.toFixed(2),
    participantCount: count
  };
};

// 实例方法：更新每人费用
Activity.prototype.updateCostPerPerson = async function() {
  const participantCount = await this.getParticipantCount();
  const costs = this.calculateCosts(participantCount);
  
  if (parseFloat(costs.costPerPerson) !== parseFloat(this.cost_per_person)) {
    await this.update({ 
      cost_per_person: costs.costPerPerson,
      current_participants: participantCount
    });
  }
  
  return costs;
};

// 静态方法：创建带费用的活动
Activity.createWithCost = async function(activityData) {
  const activity = await this.create(activityData);
  
  // 如果有费用信息，计算每人费用
  if (activityData.total_cost && activityData.total_cost > 0) {
    await activity.updateCostPerPerson();
  }
  
  return activity;
};

module.exports = Activity;