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
    allowNull: true, // 改为允许空值，因为公开活动可能不属于特定团队
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
  visibility: {
    type: DataTypes.ENUM('public', 'team'),
    allowNull: false,
    defaultValue: 'public',
    comment: '活动可见性：public(公开活动), team(团队活动)'
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
    allowNull: true,
    defaultValue: 30,
    comment: '最大参与人数，默认30人'
  },
  enable_participant_limit: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    allowNull: false,
    comment: '是否开启人数限制，默认开启'
  },
  min_participants: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 3,
    comment: '最少参与人数，默认3人'
  },
  require_approval: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false,
    comment: '是否需要审批，默认不需要'
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
  },
  // 活动排序字段
  sequence_number: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    comment: '活动序号，用于排序，数值越大越新'
  },
  // 聚餐活动特殊字段
  company_budget: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true,
    defaultValue: null,
    comment: '公司预算上限'
  },
  auto_cancel_threshold: {
    type: DataTypes.ENUM('min_participants', 'max_participants', 'both'),
    allowNull: true,
    defaultValue: null,
    comment: '自动取消条件：min_participants(最低人数不足), max_participants(超过最大人数), both(两者都检查)'
  },
  activity_special_type: {
    type: DataTypes.ENUM('dinner_party', 'team_building', 'company_event', 'normal'),
    allowNull: true,
    defaultValue: 'normal',
    comment: '活动特殊类型：dinner_party(聚餐), team_building(团建), company_event(公司事件), normal(普通)'
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

// 实例方法：检查聚餐活动是否应该取消
Activity.prototype.shouldCancelDinnerParty = async function() {
  if (this.activity_special_type !== 'dinner_party') {
    return { shouldCancel: false, reason: '' };
  }
  
  const participantCount = await this.getParticipantCount();
  let shouldCancel = false;
  let reason = '';
  
  // 检查最低人数限制
  if (this.min_participants && participantCount < this.min_participants) {
    shouldCancel = true;
    reason = `报名人数不足${this.min_participants}人，当前${participantCount}人`;
  }
  
  // 检查最高人数限制（如果设置了自动取消条件）
  if (this.auto_cancel_threshold && this.max_participants && 
      (this.auto_cancel_threshold === 'max_participants' || this.auto_cancel_threshold === 'both')) {
    if (participantCount > this.max_participants) {
      shouldCancel = true;
      reason = `报名人数超过${this.max_participants}人限制，当前${participantCount}人`;
    }
  }
  
  return { shouldCancel, reason };
};

// 实例方法：计算聚餐活动费用（包含公司预算和AA分摊）
Activity.prototype.calculateDinnerPartyCosts = async function() {
  if (this.activity_special_type !== 'dinner_party') {
    throw new Error('此方法仅适用于聚餐活动');
  }
  
  const participantCount = await this.getParticipantCount();
  const totalCost = parseFloat(this.total_cost) || 0;
  const companyBudget = parseFloat(this.company_budget) || 0;
  
  // 计算公司承担部分（不超过预算）
  const companyCost = Math.min(totalCost, companyBudget);
  
  // 计算员工需要承担的部分
  const employeeTotalCost = totalCost - companyCost;
  
  // 计算每人AA费用（如果有人参与）
  const costPerPerson = participantCount > 0 ? employeeTotalCost / participantCount : 0;
  
  return {
    totalCost: totalCost.toFixed(2),
    companyCost: companyCost.toFixed(2),
    employeeTotalCost: employeeTotalCost.toFixed(2),
    costPerPerson: costPerPerson.toFixed(2),
    participantCount,
    companyBudget: companyBudget.toFixed(2),
    remainingBudget: (companyBudget - companyCost).toFixed(2),
    withinBudget: companyCost <= companyBudget
  };
};

// 实例方法：检查是否可以参与聚餐活动
Activity.prototype.canJoinDinnerParty = async function() {
  if (this.activity_special_type !== 'dinner_party') {
    return { canJoin: false, reason: '不是聚餐活动' };
  }
  
  if (this.status !== 'published') {
    return { canJoin: false, reason: '活动当前不接受报名' };
  }
  
  const participantCount = await this.getParticipantCount();
  
  // 检查是否已达到最大人数
  if (this.max_participants && participantCount >= this.max_participants) {
    return { canJoin: false, reason: `活动人数已满（${this.max_participants}人）` };
  }
  
  // 检查是否已超过报名截止时间
  if (this.payment_deadline && new Date() > new Date(this.payment_deadline)) {
    return { canJoin: false, reason: '报名已截止' };
  }
  
  return { canJoin: true };
};

// 静态方法：创建聚餐活动
Activity.createDinnerParty = async function(activityData) {
  const dinnerPartyData = {
    ...activityData,
    activity_special_type: 'dinner_party',
    type: 'social', // 设置为社交类型
    auto_cancel_threshold: activityData.auto_cancel_threshold || 'both'
  };
  
  const activity = await this.createWithCost(dinnerPartyData);
  
  // 验证聚餐活动必要参数
  if (!activityData.min_participants || !activityData.max_participants) {
    throw new Error('聚餐活动必须设置最少和最多参与人数');
  }
  
  if (!activityData.company_budget) {
    throw new Error('聚餐活动必须设置公司预算');
  }
  
  return activity;
};

// 实例方法：计算AA费用分摊
Activity.prototype.calculateAACosts = async function(options = {}) {
  const { sequelize } = require('../config/database');
  const { useCustomTotalCost = false, customTotalCost = 0 } = options;

  // 获取费用记账合计金额
  let expenseTotalCost = 0;
  try {
    const expenses = await sequelize.models.ActivityExpense.findAll({
      where: { activity_id: this.id },
      attributes: [[sequelize.fn('SUM', sequelize.col('amount')), 'total']]
    });
    expenseTotalCost = parseFloat(expenses[0]?.dataValues?.total) || 0;
  } catch (error) {
    console.error('获取费用记账总额失败:', error);
  }

  // 使用费用记账总额作为分摊基数，如果没有费用记录则使用活动总费用
  const baseTotalCost = expenseTotalCost > 0 ? expenseTotalCost : (parseFloat(this.total_cost) || 0);
  const totalCost = useCustomTotalCost ? customTotalCost : baseTotalCost;

  // 获取已批准参与者及其分摊系数
  const participants = await sequelize.models.ActivityParticipant.findAll({
    where: {
      activity_id: this.id,
      status: 'approved' // 只包含已批准的参与者
    },
    attributes: ['user_id', 'cost_sharing_ratio']
  });

  console.log(`📊 AA分摊计算 - 活动${this.id}:`, {
    expenseTotalCost,
    baseTotalCost,
    useCustomTotalCost,
    customTotalCost,
    totalCost,
    participantCount: participants.length
  });

  if (participants.length === 0) {
    return {
      totalCost: totalCost.toFixed(2),
      baseTotalCost: baseTotalCost.toFixed(2),
      expenseTotalCost: expenseTotalCost.toFixed(2),
      useCustomTotalCost,
      participantCount: 0,
      averageCost: 0,
      totalRatio: 0,
      participants: []
    };
  }

  // 计算总系数
  const totalRatio = participants.reduce((sum, p) => sum + parseFloat(p.cost_sharing_ratio || 0), 0);

  // 如果总系数为0，使用默认AA分摊
  if (totalRatio === 0) {
    const averageCost = totalCost / participants.length;
    return {
      totalCost: totalCost.toFixed(2),
      baseTotalCost: baseTotalCost.toFixed(2),
      expenseTotalCost: expenseTotalCost.toFixed(2),
      useCustomTotalCost,
      participantCount: participants.length,
      averageCost: averageCost.toFixed(2),
      totalRatio: participants.length.toFixed(2), // 每人系数为1
      participants: participants.map(p => ({
        user_id: p.user_id,
        cost_sharing_ratio: 1,
        amount: averageCost.toFixed(2)
      }))
    };
  }

  // 按系数分摊费用
  const participantCosts = participants.map(p => {
    const ratio = parseFloat(p.cost_sharing_ratio || 0);
    const amount = totalCost * (ratio / totalRatio);
    return {
      user_id: p.user_id,
      cost_sharing_ratio: ratio,
      amount: amount.toFixed(2)
    };
  });

  const averageCost = totalCost / participants.length;

  return {
    totalCost: totalCost.toFixed(2),
    baseTotalCost: baseTotalCost.toFixed(2),
    expenseTotalCost: expenseTotalCost.toFixed(2),
    useCustomTotalCost,
    participantCount: participants.length,
    averageCost: averageCost.toFixed(2),
    totalRatio: totalRatio.toFixed(2),
    participants: participantCosts
  };
};

// 实例方法：更新参与者分摊系数
Activity.prototype.updateParticipantRatio = async function(userId, ratio) {
  const { sequelize } = require('../config/database');
  
  const participant = await sequelize.models.ActivityParticipant.findOne({
    where: { 
      activity_id: this.id,
      user_id: userId
    }
  });
  
  if (!participant) {
    throw new Error('参与者不存在');
  }
  
  // 确保系数在合理范围内
  const validRatio = Math.max(0, Math.min(10, parseFloat(ratio)));
  
  await participant.update({ cost_sharing_ratio: validRatio });
  
  return participant;
};

module.exports = Activity;