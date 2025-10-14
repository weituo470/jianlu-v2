const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/database');

const ActivityParticipant = sequelize.define('ActivityParticipant', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  activity_id: {
    type: DataTypes.UUID,
    allowNull: false,
    references: {
      model: 'activities',
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
  status: {
    type: DataTypes.ENUM('pending', 'registered', 'approved', 'attended', 'absent', 'cancelled', 'rejected'),
    defaultValue: 'registered'
  },
  rejection_reason: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '拒绝原因'
  },
  rejected_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '拒绝时间'
  },
  rejected_by: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: '拒绝者ID'
  },
  registered_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  cancelled_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '取消时间'
  },
  cancelled_by: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: '取消者ID'
  },
  // 支付相关字段
  payment_status: {
    type: DataTypes.ENUM('unpaid', 'paid', 'exempted'),
    defaultValue: 'unpaid',
    comment: '支付状态'
  },
  payment_amount: {
    type: DataTypes.DECIMAL(10, 2),
    defaultValue: 0.00,
    comment: '应付金额'
  },
  payment_time: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '支付时间'
  },
  payment_method: {
    type: DataTypes.STRING(50),
    allowNull: true,
    comment: '支付方式'
  },
  payment_note: {
    type: DataTypes.TEXT,
    allowNull: true,
    comment: '支付备注'
  },
  // AA分摊系数字段
  cost_sharing_ratio: {
    type: DataTypes.DECIMAL(5, 2),
    defaultValue: 1.00,
    comment: '费用分摊系数，默认为1'
  }
}, {
  tableName: 'activity_participants',
  timestamps: false,
  indexes: [
    {
      unique: true,
      fields: ['activity_id', 'user_id']
    }
  ]
});

// 定义关联关系
ActivityParticipant.associate = (models) => {
  // 参与记录属于活动
  ActivityParticipant.belongsTo(models.Activity, {
    foreignKey: 'activity_id',
    as: 'activity'
  });

  // 参与记录属于用户
  ActivityParticipant.belongsTo(models.User, {
    foreignKey: 'user_id',
    as: 'user'
  });
};

// 实例方法：更新支付状态
ActivityParticipant.prototype.updatePaymentStatus = async function(paymentData) {
  const updateData = {
    payment_status: paymentData.payment_status
  };
  
  if (paymentData.payment_status === 'paid') {
    updateData.payment_time = new Date();
    updateData.payment_method = paymentData.payment_method || null;
    updateData.payment_note = paymentData.payment_note || null;
  }
  
  return await this.update(updateData);
};

// 静态方法：获取活动的支付统计
ActivityParticipant.getPaymentSummary = async function(activityId) {
  const participants = await this.findAll({
    where: { activity_id: activityId },
    include: [{
      model: sequelize.models.User,
      as: 'user',
      attributes: ['id', 'username', 'email', 'profile']
    }]
  });
  
  const summary = {
    total: participants.length,
    paid: 0,
    unpaid: 0,
    exempted: 0,
    totalAmount: 0,
    paidAmount: 0
  };
  
  participants.forEach(p => {
    summary[p.payment_status]++;
    summary.totalAmount += parseFloat(p.payment_amount) || 0;
    if (p.payment_status === 'paid') {
      summary.paidAmount += parseFloat(p.payment_amount) || 0;
    }
  });
  
  return {
    summary,
    participants
  };
};

module.exports = ActivityParticipant;