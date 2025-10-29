const { DataTypes, Op } = require('sequelize');
const { sequelize } = require('../config/database');
const logger = require('../utils/logger');

const Message = sequelize.define('Message', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  title: {
    type: DataTypes.STRING(200),
    allowNull: false,
    validate: {
      len: [1, 200]
    }
  },
  content: {
    type: DataTypes.TEXT,
    allowNull: false,
    validate: {
      len: [1, 5000]
    }
  },
  type: {
    type: DataTypes.ENUM('system', 'personal', 'activity', 'team', 'announcement', 'bill'),
    allowNull: false,
    defaultValue: 'system'
  },
  priority: {
    type: DataTypes.ENUM('low', 'normal', 'high', 'urgent'),
    allowNull: false,
    defaultValue: 'normal'
  },
  sender_id: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: '发送者ID，系统消息时为空'
  },
  recipient_id: {
    type: DataTypes.UUID,
    allowNull: true,
    comment: '接收者ID，为空时表示全体消息'
  },
  recipient_role: {
    type: DataTypes.ENUM('super_admin', 'admin', 'user'),
    allowNull: true,
    comment: '接收角色，用于群发消息'
  },
  is_global: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: '是否为全局消息'
  },
  is_read: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: '是否已读'
  },
  read_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '阅读时间'
  },
  scheduled_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '预定发送时间'
  },
  expires_at: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: '过期时间'
  },
  status: {
    type: DataTypes.ENUM('draft', 'sent', 'scheduled', 'expired', 'cancelled'),
    allowNull: false,
    defaultValue: 'draft'
  },
  metadata: {
    type: DataTypes.JSON,
    defaultValue: {},
    comment: '扩展信息，如跳转链接、相关ID等'
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  updated_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'messages',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    {
      fields: ['recipient_id']
    },
    {
      fields: ['sender_id']
    },
    {
      fields: ['type']
    },
    {
      fields: ['status']
    },
    {
      fields: ['is_read']
    },
    {
      fields: ['priority']
    },
    {
      fields: ['created_at']
    },
    {
      fields: ['scheduled_at']
    },
    {
      fields: ['expires_at']
    }
  ]
});

// 关联关系
Message.associate = function(models) {
  // 发送者关联
  Message.belongsTo(models.User, {
    foreignKey: 'sender_id',
    as: 'sender'
  });

  // 接收者关联
  Message.belongsTo(models.User, {
    foreignKey: 'recipient_id',
    as: 'recipient'
  });
};

// 实例方法
Message.prototype.markAsRead = async function() {
  if (!this.is_read) {
    this.is_read = true;
    this.read_at = new Date();
    await this.save();
  }
};

Message.prototype.markAsUnread = async function() {
  if (this.is_read) {
    this.is_read = false;
    this.read_at = null;
    await this.save();
  }
};

Message.prototype.isExpired = function() {
  return this.expires_at && this.expires_at < new Date();
};

Message.prototype.isScheduled = function() {
  return this.status === 'scheduled' && this.scheduled_at && this.scheduled_at > new Date();
};

Message.prototype.canBeSent = function() {
  return this.status === 'draft' && (!this.scheduled_at || this.scheduled_at <= new Date());
};

Message.prototype.canBeViewedBy = function(userId, userRole) {
  // 检查是否过期
  if (this.isExpired()) {
    return false;
  }

  // 全局消息所有人可看
  if (this.is_global) {
    return true;
  }

  // 特定接收者
  if (this.recipient_id) {
    return this.recipient_id === userId;
  }

  // 特定角色
  if (this.recipient_role) {
    return this.recipient_role === userRole;
  }

  return false;
};

// 类方法
Message.findByUser = function(userId, options = {}) {
  const {
    page = 1,
    limit = 20,
    type,
    is_read,
    priority,
    unread_only = false
  } = options;

  const where = {
    [Op.or]: [
      { recipient_id: userId },
      { is_global: true },
      { recipient_role: options.userRole }
    ],
    status: 'sent'
  };

  if (unread_only) {
    where.is_read = false;
  } else if (is_read !== undefined) {
    where.is_read = is_read;
  }

  if (type) {
    where.type = type;
  }

  if (priority) {
    where.priority = priority;
  }

  return Message.findAndCountAll({
    where,
    include: [
      {
        model: require('./User'),
        as: 'sender',
        attributes: ['id', 'username', 'profile']
      }
    ],
    order: [
      ['priority', 'DESC'],
      ['created_at', 'DESC']
    ],
    limit: limit,
    offset: (page - 1) * limit
  });
};

Message.createSystemMessage = async function(options) {
  const {
    title,
    content,
    type = 'system',
    priority = 'normal',
    recipient_id = null,
    recipient_role = null,
    is_global = false,
    scheduled_at = null,
    expires_at = null,
    metadata = {}
  } = options;

  return await Message.create({
    title,
    content,
    type,
    priority,
    recipient_id,
    recipient_role,
    is_global,
    scheduled_at,
    expires_at,
    metadata,
    status: scheduled_at ? 'scheduled' : 'sent'
  });
};

Message.createPersonalMessage = async function(senderId, recipientId, options) {
  const {
    title,
    content,
    type = 'personal',
    priority = 'normal',
    metadata = {}
  } = options;

  return await Message.create({
    title,
    content,
    type,
    priority,
    sender_id: senderId,
    recipient_id: recipientId,
    metadata,
    status: 'sent'
  });
};

Message.broadcastToRole = async function(senderId, role, options) {
  const {
    title,
    content,
    type = 'announcement',
    priority = 'normal',
    metadata = {}
  } = options;

  return await Message.create({
    title,
    content,
    type,
    priority,
    sender_id: senderId,
    recipient_role: role,
    metadata,
    status: 'sent'
  });
};

Message.broadcastToAll = async function(options) {
  const {
    title,
    content,
    type = 'announcement',
    priority = 'normal',
    scheduled_at = null,
    expires_at = null,
    metadata = {}
  } = options;

  return await Message.create({
    title,
    content,
    type,
    priority,
    is_global: true,
    scheduled_at,
    expires_at,
    metadata,
    status: scheduled_at ? 'scheduled' : 'sent'
  });
};

Message.markAllAsRead = async function(userId) {
  await Message.update(
    {
      is_read: true,
      read_at: new Date()
    },
    {
      where: {
        recipient_id: userId,
        is_read: false,
        status: 'sent'
      }
    }
  );
};

Message.getUnreadCount = async function(userId, userRole) {
  return await Message.count({
    where: {
      [Op.or]: [
        { recipient_id: userId },
        { is_global: true },
        { recipient_role: userRole }
      ],
      is_read: false,
      status: 'sent'
    }
  });
};

Message.deleteExpiredMessages = async function() {
  const deletedCount = await Message.destroy({
    where: {
      expires_at: {
        [Op.lt]: new Date()
      }
    }
  });

  return deletedCount;
};

Message.sendScheduledMessages = async function() {
  const messages = await Message.findAll({
    where: {
      status: 'scheduled',
      scheduled_at: {
        [Op.lte]: new Date()
      }
    }
  });

  for (const message of messages) {
    await message.update({ status: 'sent' });
  }

  return messages.length;
};

// 账单相关方法
Message.findByBillType = function(options = {}) {
  const { userId, activityId, paymentStatus, page = 1, limit = 20 } = options;

  const whereClause = {
    type: 'bill',
    status: 'sent'
  };

  if (userId) {
    whereClause.recipient_id = userId;
  }

  if (activityId) {
    whereClause['$metadata.activity_id$'] = activityId;
  }

  if (paymentStatus) {
    whereClause['$metadata.payment_status$'] = paymentStatus;
  }

  return Message.findAndCountAll({
    where: whereClause,
    include: [
      {
        model: require('./User'),
        as: 'sender',
        attributes: ['id', 'username', 'nickname']
      },
      {
        model: require('./User'),
        as: 'recipient',
        attributes: ['id', 'username', 'nickname']
      }
    ],
    order: [['created_at', 'DESC']],
    limit: parseInt(limit),
    offset: (parseInt(page) - 1) * parseInt(limit)
  });
};

Message.createBillMessages = async function(activityId, costSharingResults, options = {}) {
  const { senderId, customMessage, priority = 'normal' } = options;
  const { Activity, User } = require('../models');

  // 获取活动信息
  const activity = await Activity.findByPk(activityId);
  if (!activity) {
    throw new Error('活动不存在');
  }

  const results = [];
  const errors = [];

  for (const costItem of costSharingResults) {
    try {
      // 获取用户信息
      const user = await User.findByPk(costItem.user_id);
      if (!user) {
        errors.push(`用户 ${costItem.user_id} 不存在`);
        continue;
      }

      // 生成账单消息内容
      const title = `【账单通知】${activity.title}`;
      const content = generateBillContent(activity, costItem, user, customMessage);

      const messageData = {
        title,
        content,
        type: 'bill',
        priority: parseFloat(costItem.amount) > 100 ? 'high' : priority,
        recipient_id: costItem.user_id,
        sender_id: senderId || null,
        status: 'sent',
        metadata: {
          type: 'bill',
          activity_id: activity.id,
          activity_title: activity.title,
          amount: costItem.amount,
          cost_sharing_ratio: costItem.cost_sharing_ratio,
          bill_date: new Date().toISOString(),
          payment_deadline: activity.payment_deadline,
          cost_sharing_id: costItem.id,
          payment_status: 'unpaid'
        }
      };

      const message = await Message.create(messageData);
      results.push({
        user_id: costItem.user_id,
        username: user.username,
        amount: costItem.amount,
        message_id: message.id,
        status: 'success'
      });

    } catch (error) {
      logger.error(`创建账单消息失败，用户 ${costItem.user_id}:`, error);
      errors.push(`用户 ${costItem.user_id}: ${error.message}`);
    }
  }

  return {
    success_count: results.length,
    error_count: errors.length,
    results,
    errors
  };
};

Message.updateBillPaymentStatus = async function(messageId, paymentData) {
  const { paymentStatus, paymentMethod, paymentNote, paymentTime } = paymentData;

  const message = await Message.findByPk(messageId);
  if (!message) {
    throw new Error('消息不存在');
  }

  if (message.type !== 'bill') {
    throw new Error('不是账单类型消息');
  }

  // 更新metadata中的支付状态
  const updatedMetadata = {
    ...message.metadata,
    payment_status: paymentStatus,
    payment_method: paymentMethod,
    payment_note: paymentNote,
    payment_time: paymentTime || new Date().toISOString()
  };

  await message.update({ metadata: updatedMetadata });

  return message;
};

// 生成账单内容的辅助函数
function generateBillContent(activity, costItem, user, customMessage) {
  const amount = parseFloat(costItem.amount).toFixed(2);
  const paymentDeadline = activity.payment_deadline
    ? new Date(activity.payment_deadline).toLocaleDateString('zh-CN')
    : '未设置截止日期';

  let content = `【活动账单通知】

尊敬的 ${user.nickname || user.username}：

您参与的"${activity.title}"活动账单已生成：

💰 应付金额：¥${amount}
👥 分摊系数：${costItem.cost_sharing_ratio}
📅 账单日期：${new Date().toLocaleDateString('zh-CN')}
⏰ 支付截止：${paymentDeadline}`;

  if (customMessage) {
    content += `\n\n💬 管理员备注：${customMessage}`;
  }

  content += `\n\n请及时查看并完成支付，感谢您的参与！`;

  return content;
}

// 定义模型关联
Message.associate = function(models) {
  // 消息发送者关联
  Message.belongsTo(models.User, {
    foreignKey: 'sender_id',
    as: 'sender'
  });

  // 消息接收者关联
  Message.belongsTo(models.User, {
    foreignKey: 'recipient_id',
    as: 'recipient'
  });

  // 用户消息状态关联
  Message.hasMany(models.UserMessageState, {
    foreignKey: 'message_id',
    as: 'userStates'
  });
};

module.exports = Message;