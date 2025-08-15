const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');
const User = require('./User');
const Activity = require('./Activity');

/**
 * 活动报名模型
 */
const ActivityRegistration = sequelize.define('ActivityRegistration', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    comment: '报名ID'
  },
  activityId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'activity_id',
    comment: '活动ID'
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'user_id',
    comment: '用户ID'
  },
  registrationTime: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'registration_time',
    comment: '报名时间'
  },
  status: {
    type: DataTypes.ENUM('pending', 'approved', 'rejected', 'cancelled', 'completed'),
    allowNull: false,
    defaultValue: 'pending',
    comment: '报名状态'
  },
  costAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00,
    field: 'cost_amount',
    comment: '应付费用(元)',
    validate: {
      min: 0
    }
  },
  paidAmount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    defaultValue: 0.00,
    field: 'paid_amount',
    comment: '已付费用(元)',
    validate: {
      min: 0
    }
  },
  paymentStatus: {
    type: DataTypes.ENUM('unpaid', 'paid', 'partial', 'refunded'),
    allowNull: false,
    defaultValue: 'unpaid',
    field: 'payment_status',
    comment: '支付状态'
  },
  paymentTime: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'payment_time',
    comment: '付费时间'
  },
  approvalTime: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'approval_time',
    comment: '审核时间'
  },
  approvedBy: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'approved_by',
    comment: '审核人ID'
  },
  approvalNote: {
    type: DataTypes.STRING(500),
    allowNull: true,
    field: 'approval_note',
    comment: '审核备注'
  },
  participantNote: {
    type: DataTypes.STRING(500),
    allowNull: true,
    field: 'participant_note',
    comment: '参与者备注'
  },
  contactPhone: {
    type: DataTypes.STRING(20),
    allowNull: true,
    field: 'contact_phone',
    comment: '联系电话'
  },
  emergencyContact: {
    type: DataTypes.STRING(100),
    allowNull: true,
    field: 'emergency_contact',
    comment: '紧急联系人'
  },
  dietaryRequirements: {
    type: DataTypes.STRING(200),
    allowNull: true,
    field: 'dietary_requirements',
    comment: '饮食要求'
  }
}, {
  tableName: 'activity_registrations',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  comment: '活动报名表',
  indexes: [
    {
      unique: true,
      fields: ['activity_id', 'user_id']
    },
    {
      fields: ['activity_id']
    },
    {
      fields: ['user_id']
    },
    {
      fields: ['status']
    },
    {
      fields: ['payment_status']
    },
    {
      fields: ['registration_time']
    }
  ]
});

/**
 * 活动费用分摊记录模型
 */
const ActivityCostSharing = sequelize.define('ActivityCostSharing', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    comment: '分摊记录ID'
  },
  activityId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'activity_id',
    comment: '活动ID'
  },
  registrationId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'registration_id',
    comment: '报名记录ID'
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'user_id',
    comment: '用户ID'
  },
  costType: {
    type: DataTypes.ENUM('organizer', 'participant', 'additional'),
    allowNull: false,
    field: 'cost_type',
    comment: '费用类型'
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    comment: '分摊金额(元)',
    validate: {
      min: 0
    }
  },
  calculatedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'calculated_at',
    comment: '计算时间'
  },
  description: {
    type: DataTypes.STRING(200),
    allowNull: true,
    comment: '费用描述'
  },
  transactionId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'transaction_id',
    comment: '关联交易记录ID'
  }
}, {
  tableName: 'activity_cost_sharing',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  comment: '活动费用分摊记录表',
  indexes: [
    {
      fields: ['activity_id']
    },
    {
      fields: ['user_id']
    },
    {
      fields: ['cost_type']
    },
    {
      fields: ['transaction_id']
    }
  ]
});

// 建立关联关系
ActivityRegistration.belongsTo(Activity, {
  foreignKey: 'activityId',
  as: 'activity'
});

ActivityRegistration.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user'
});

ActivityRegistration.belongsTo(User, {
  foreignKey: 'approvedBy',
  as: 'approver'
});

Activity.hasMany(ActivityRegistration, {
  foreignKey: 'activityId',
  as: 'registrations'
});

User.hasMany(ActivityRegistration, {
  foreignKey: 'userId',
  as: 'activityRegistrations'
});

ActivityCostSharing.belongsTo(Activity, {
  foreignKey: 'activityId',
  as: 'activity'
});

ActivityCostSharing.belongsTo(ActivityRegistration, {
  foreignKey: 'registrationId',
  as: 'registration'
});

ActivityCostSharing.belongsTo(User, {
  foreignKey: 'userId',
  as: 'user'
});

Activity.hasMany(ActivityCostSharing, {
  foreignKey: 'activityId',
  as: 'costSharings'
});

ActivityRegistration.hasOne(ActivityCostSharing, {
  foreignKey: 'registrationId',
  as: 'costSharing'
});

/**
 * 实例方法 - 检查是否可以取消报名
 */
ActivityRegistration.prototype.canCancel = function() {
  return ['pending', 'approved'].includes(this.status) && 
         this.paymentStatus !== 'paid';
};

/**
 * 实例方法 - 获取剩余应付费用
 */
ActivityRegistration.prototype.getRemainingAmount = function() {
  return parseFloat(this.costAmount) - parseFloat(this.paidAmount);
};

/**
 * 静态方法 - 报名活动
 */
ActivityRegistration.register = async function(activityId, userId, registrationData = {}, transaction = null) {
  const t = transaction || await sequelize.transaction();
  
  try {
    // 检查是否已经报名
    const existingRegistration = await ActivityRegistration.findOne({
      where: { activityId, userId },
      transaction: t
    });
    
    if (existingRegistration) {
      throw new Error('您已经报名过该活动');
    }
    
    // 获取活动信息
    const activity = await Activity.findByPk(activityId, {
      transaction: t,
      lock: t.LOCK.UPDATE
    });
    
    if (!activity) {
      throw new Error('活动不存在');
    }
    
    // 检查活动状态
    if (!['published', 'registration_open'].includes(activity.activity_status)) {
      throw new Error('活动当前不接受报名');
    }
    
    // 检查报名截止时间
    if (activity.registration_deadline && new Date() > new Date(activity.registration_deadline)) {
      throw new Error('报名已截止');
    }
    
    // 检查人数限制
    if (activity.max_participants && activity.current_participants >= activity.max_participants) {
      throw new Error('活动人数已满');
    }
    
    // 计算费用
    let costAmount = 0;
    if (activity.cost_sharing_type === 'equal' && activity.total_cost > 0) {
      // 这里先设置为0，等审核通过后重新计算
      costAmount = 0;
    }
    
    // 创建报名记录
    const registration = await ActivityRegistration.create({
      activityId,
      userId,
      status: activity.need_approval ? 'pending' : 'approved',
      costAmount,
      participantNote: registrationData.participantNote || '',
      contactPhone: registrationData.contactPhone || '',
      emergencyContact: registrationData.emergencyContact || '',
      dietaryRequirements: registrationData.dietaryRequirements || ''
    }, { transaction: t });
    
    // 如果不需要审核，直接更新参与人数并计算费用
    if (!activity.need_approval) {
      await activity.update({
        current_participants: activity.current_participants + 1
      }, { transaction: t });
      
      // 重新计算费用分摊
      await ActivityRegistration.recalculateCostSharing(activityId, t);
    }
    
    if (!transaction) {
      await t.commit();
    }
    
    return registration;
    
  } catch (error) {
    if (!transaction) {
      await t.rollback();
    }
    throw error;
  }
};

/**
 * 静态方法 - 审核报名
 */
ActivityRegistration.approve = async function(registrationId, approverId, approvalNote = '', transaction = null) {
  const t = transaction || await sequelize.transaction();
  
  try {
    const registration = await ActivityRegistration.findByPk(registrationId, {
      include: [{ model: Activity, as: 'activity' }],
      transaction: t,
      lock: t.LOCK.UPDATE
    });
    
    if (!registration) {
      throw new Error('报名记录不存在');
    }
    
    if (registration.status !== 'pending') {
      throw new Error('该报名已经被处理过了');
    }
    
    // 检查人数限制
    const activity = registration.activity;
    if (activity.max_participants && activity.current_participants >= activity.max_participants) {
      throw new Error('活动人数已满，无法通过审核');
    }
    
    // 更新报名状态
    await registration.update({
      status: 'approved',
      approvalTime: new Date(),
      approvedBy: approverId,
      approvalNote
    }, { transaction: t });
    
    // 更新活动参与人数
    await activity.update({
      current_participants: activity.current_participants + 1
    }, { transaction: t });
    
    // 重新计算费用分摊
    await ActivityRegistration.recalculateCostSharing(activity.id, t);
    
    if (!transaction) {
      await t.commit();
    }
    
    return registration;
    
  } catch (error) {
    if (!transaction) {
      await t.rollback();
    }
    throw error;
  }
};

/**
 * 静态方法 - 重新计算费用分摊
 */
ActivityRegistration.recalculateCostSharing = async function(activityId, transaction = null) {
  const t = transaction || await sequelize.transaction();
  
  try {
    const activity = await Activity.findByPk(activityId, { transaction: t });
    if (!activity || activity.cost_sharing_type === 'none' || !activity.total_cost) {
      return;
    }
    
    // 获取已审核通过的报名记录
    const approvedRegistrations = await ActivityRegistration.findAll({
      where: { 
        activityId, 
        status: 'approved' 
      },
      transaction: t
    });
    
    const participantCount = approvedRegistrations.length;
    if (participantCount === 0) {
      return;
    }
    
    // 计算每人应付费用
    const organizerCost = parseFloat(activity.organizer_cost) || 0;
    const participantTotalCost = parseFloat(activity.total_cost) - organizerCost;
    const costPerPerson = participantTotalCost / participantCount;
    
    // 更新活动表的单人费用
    await activity.update({
      participant_cost: costPerPerson
    }, { transaction: t });
    
    // 批量更新报名记录的费用
    await ActivityRegistration.update({
      costAmount: costPerPerson
    }, {
      where: { 
        activityId, 
        status: 'approved' 
      },
      transaction: t
    });
    
    // 清除旧的费用分摊记录
    await ActivityCostSharing.destroy({
      where: { activityId },
      transaction: t
    });
    
    // 创建新的费用分摊记录
    const costSharingRecords = approvedRegistrations.map(reg => ({
      id: require('uuid').v4(),
      activityId,
      registrationId: reg.id,
      userId: reg.userId,
      costType: 'participant',
      amount: costPerPerson,
      description: `活动费用分摊 (${participantCount}人分摊)`
    }));
    
    // 如果发起人有费用，添加发起人费用记录
    if (organizerCost > 0) {
      costSharingRecords.push({
        id: require('uuid').v4(),
        activityId,
        registrationId: null,
        userId: activity.created_by,
        costType: 'organizer',
        amount: organizerCost,
        description: '活动发起人承担费用'
      });
    }
    
    await ActivityCostSharing.bulkCreate(costSharingRecords, { transaction: t });
    
    if (!transaction) {
      await t.commit();
    }
    
  } catch (error) {
    if (!transaction) {
      await t.rollback();
    }
    throw error;
  }
};

/**
 * 静态方法 - 获取活动报名列表
 */
ActivityRegistration.getActivityRegistrations = async function(activityId, options = {}) {
  const { 
    page = 1, 
    limit = 20, 
    status = null 
  } = options;
  
  const where = { activityId };
  if (status) {
    where.status = status;
  }
  
  const { count, rows } = await ActivityRegistration.findAndCountAll({
    where,
    include: [
      {
        model: User,
        as: 'user',
        attributes: ['id', 'username', 'nickname', 'email']
      },
      {
        model: User,
        as: 'approver',
        attributes: ['id', 'username', 'nickname'],
        required: false
      },
      {
        model: ActivityCostSharing,
        as: 'costSharing',
        required: false
      }
    ],
    order: [['registration_time', 'ASC']],
    limit: parseInt(limit),
    offset: (parseInt(page) - 1) * parseInt(limit)
  });
  
  return {
    registrations: rows,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: count,
      pages: Math.ceil(count / limit)
    }
  };
};

module.exports = {
  ActivityRegistration,
  ActivityCostSharing
};