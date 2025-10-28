const { Message, MessageTemplate, User } = require('../models');
const { v4: uuidv4 } = require('uuid');
const logger = require('../utils/logger');
const { success, error, notFound, forbidden } = require('../utils/response');

class MessageController {
  // 获取用户消息列表
  async getMessages(req, res) {
    try {
      const userId = req.user.id;
      const userRole = req.user.role;
      const {
        page = 1,
        limit = 20,
        type,
        is_read,
        priority,
        unread_only = false
      } = req.query;

      const options = {
        page: parseInt(page),
        limit: parseInt(limit),
        type,
        is_read: is_read === 'true' ? true : is_read === 'false' ? false : undefined,
        priority,
        unread_only: unread_only === 'true',
        userRole
      };

      const result = await Message.findByUser(userId, options);

      return success(res, {
        messages: result.rows,
        pagination: {
          current_page: parseInt(page),
          total_pages: Math.ceil(result.count / parseInt(limit)),
          total_count: result.count,
          per_page: parseInt(limit)
        }
      });
    } catch (err) {
      logger.error('获取消息列表失败:', err);
      return error(res, '获取消息列表失败');
    }
  }

  // 获取消息详情
  async getMessage(req, res) {
    try {
      const userId = req.user.id;
      const userRole = req.user.role;
      const { id } = req.params;

      const message = await Message.findByPk(id, {
        include: [
          {
            model: User,
            as: 'sender',
            attributes: ['id', 'username', 'profile']
          }
        ]
      });

      if (!message) {
        return notFound(res, '消息不存在');
      }

      // 检查用户是否有权限查看此消息
      if (!message.canBeViewedBy(userId, userRole)) {
        return forbidden(res, '无权限查看此消息');
      }

      // 如果是个人消息且未读，自动标记为已读
      if (!message.is_read && message.recipient_id === userId) {
        await message.markAsRead();
      }

      return success(res, { message });
    } catch (err) {
      logger.error('获取消息详情失败:', err);
      return error(res, '获取消息详情失败');
    }
  }

  // 标记消息为已读
  async markAsRead(req, res) {
    try {
      const userId = req.user.id;
      const userRole = req.user.role;
      const { id } = req.params;

      const message = await Message.findByPk(id);

      if (!message) {
        return notFound(res, '消息不存在');
      }

      // 检查权限
      if (!message.canBeViewedBy(userId, userRole)) {
        return forbidden(res, '无权限操作此消息');
      }

      // 只有个人消息才能标记已读状态
      if (message.recipient_id !== userId) {
        return forbidden(res, '只能标记个人消息为已读');
      }

      await message.markAsRead();

      return success(res, { message: '标记成功' });
    } catch (err) {
      logger.error('标记消息已读失败:', err);
      return error(res, '标记消息已读失败');
    }
  }

  // 标记消息为未读
  async markAsUnread(req, res) {
    try {
      const userId = req.user.id;
      const userRole = req.user.role;
      const { id } = req.params;

      const message = await Message.findByPk(id);

      if (!message) {
        return notFound(res, '消息不存在');
      }

      // 检查权限
      if (!message.canBeViewedBy(userId, userRole)) {
        return forbidden(res, '无权限操作此消息');
      }

      // 只有个人消息才能标记未读状态
      if (message.recipient_id !== userId) {
        return forbidden(res, '只能标记个人消息为未读');
      }

      await message.markAsUnread();

      return success(res, { message: '标记成功' });
    } catch (err) {
      logger.error('标记消息未读失败:', err);
      return error(res, '标记消息未读失败');
    }
  }

  // 批量标记已读
  async markAllAsRead(req, res) {
    try {
      const userId = req.user.id;

      await Message.markAllAsRead(userId);

      return success(res, { message: '全部消息已标记为已读' });
    } catch (err) {
      logger.error('批量标记已读失败:', err);
      return error(res, '批量标记已读失败');
    }
  }

  // 获取未读消息数量
  async getUnreadCount(req, res) {
    try {
      const userId = req.user.id;
      const userRole = req.user.role;

      const count = await Message.getUnreadCount(userId, userRole);

      return success(res, { unread_count: count });
    } catch (err) {
      logger.error('获取未读消息数量失败:', err);
      return error(res, '获取未读消息数量失败');
    }
  }

  // 发送个人消息
  async sendPersonalMessage(req, res) {
    try {
      const senderId = req.user.id;
      const {
        recipient_id,
        title,
        content,
        type = 'personal',
        priority = 'normal',
        metadata = {}
      } = req.body;

      // 验证接收者是否存在
      const recipient = await User.findByPk(recipient_id);
      if (!recipient) {
        return notFound(res, '接收者不存在');
      }

      const message = await Message.createPersonalMessage(senderId, recipient_id, {
        title,
        content,
        type,
        priority,
        metadata
      });

      logger.info(`用户 ${req.user.username} 向 ${recipient.username} 发送个人消息: ${title}`);

      return success(res, { message: '消息发送成功', data: message });
    } catch (err) {
      logger.error('发送个人消息失败:', err);
      return error(res, '发送个人消息失败');
    }
  }

  // 创建系统公告（管理员权限）
  async createSystemAnnouncement(req, res) {
    try {
      const {
        title,
        content,
        priority = 'normal',
        recipient_role = null,
        is_global = false,
        scheduled_at = null,
        expires_at = null,
        metadata = {}
      } = req.body;

      // 验证权限
      if (req.user.role !== 'super_admin' && req.user.role !== 'admin') {
        return forbidden(res, '无权限创建系统公告');
      }

      const message = await Message.createSystemMessage({
        title,
        content,
        type: 'announcement',
        priority,
        recipient_role,
        is_global,
        scheduled_at: scheduled_at ? new Date(scheduled_at) : null,
        expires_at: expires_at ? new Date(expires_at) : null,
        metadata
      });

      logger.info(`管理员 ${req.user.username} 创建系统公告: ${title}`);

      return success(res, { message: '系统公告创建成功', data: message });
    } catch (err) {
      logger.error('创建系统公告失败:', err);
      return error(res, '创建系统公告失败');
    }
  }

  // 向指定角色发送消息
  async broadcastToRole(req, res) {
    try {
      const senderId = req.user.id;
      const {
        recipient_role,
        title,
        content,
        type = 'announcement',
        priority = 'normal',
        metadata = {}
      } = req.body;

      // 验证权限
      if (req.user.role !== 'super_admin' && req.user.role !== 'admin') {
        return forbidden(res, '无权限发送群组消息');
      }

      // 验证角色
      if (!['super_admin', 'admin', 'user'].includes(recipient_role)) {
        return error(res, '无效的接收角色');
      }

      const message = await Message.broadcastToRole(senderId, recipient_role, {
        title,
        content,
        type,
        priority,
        metadata
      });

      logger.info(`管理员 ${req.user.username} 向角色 ${recipient_role} 发送消息: ${title}`);

      return success(res, { message: '消息发送成功', data: message });
    } catch (err) {
      logger.error('发送群组消息失败:', err);
      return error(res, '发送群组消息失败');
    }
  }

  // 全局广播消息
  async broadcastToAll(req, res) {
    try {
      const {
        title,
        content,
        type = 'announcement',
        priority = 'normal',
        scheduled_at = null,
        expires_at = null,
        metadata = {}
      } = req.body;

      // 验证权限
      if (req.user.role !== 'super_admin') {
        return forbidden(res, '只有超级管理员可以发送全局广播');
      }

      const message = await Message.broadcastToAll({
        title,
        content,
        type,
        priority,
        scheduled_at: scheduled_at ? new Date(scheduled_at) : null,
        expires_at: expires_at ? new Date(expires_at) : null,
        metadata
      });

      logger.info(`超级管理员 ${req.user.username} 发送全局广播: ${title}`);

      return success(res, { message: '全局广播发送成功', data: message });
    } catch (err) {
      logger.error('发送全局广播失败:', err);
      return error(res, '发送全局广播失败');
    }
  }

  // 删除消息
  async deleteMessage(req, res) {
    try {
      const userId = req.user.id;
      const userRole = req.user.role;
      const { id } = req.params;

      const message = await Message.findByPk(id);

      if (!message) {
        return notFound(res, '消息不存在');
      }

      // 检查权限：只能删除自己发送的个人消息或管理员可以删除系统消息
      const canDelete =
        (message.sender_id === userId && message.type === 'personal') ||
        (req.user.role === 'super_admin') ||
        (req.user.role === 'admin' && message.type !== 'personal');

      if (!canDelete) {
        return forbidden(res, '无权限删除此消息');
      }

      await message.update({ status: 'cancelled' });

      return success(res, { message: '消息删除成功' });
    } catch (err) {
      logger.error('删除消息失败:', err);
      return error(res, '删除消息失败');
    }
  }

  // 获取消息模板列表
  async getMessageTemplates(req, res) {
    try {
      const { type } = req.query;

      const where = { is_active: true };
      if (type) {
        where.type = type;
      }

      const templates = await MessageTemplate.findAll({
        where,
        include: [
          {
            model: User,
            as: 'creator',
            attributes: ['id', 'username']
          }
        ],
        order: [['type', 'ASC'], ['name', 'ASC']]
      });

      return success(res, { templates });
    } catch (err) {
      logger.error('获取消息模板失败:', err);
      return error(res, '获取消息模板失败');
    }
  }

  // 使用模板发送消息
  async sendMessageFromTemplate(req, res) {
    try {
      const {
        template_name,
        recipient_id,
        recipient_role,
        is_global,
        variables = {},
        scheduled_at = null,
        expires_at = null
      } = req.body;

      // 验证权限
      if (req.user.role !== 'super_admin' && req.user.role !== 'admin') {
        return forbidden(res, '无权限使用模板发送消息');
      }

      // 获取模板
      const template = await MessageTemplate.findByName(template_name);
      if (!template) {
        return notFound(res, '消息模板不存在');
      }

      // 验证必需变量
      const errors = template.validateVariables(variables);
      if (errors.length > 0) {
        return error(res, `模板变量验证失败: ${errors.join(', ')}`);
      }

      // 渲染模板
      const { title, content, type, priority } = template.render(variables);

      // 创建消息
      const message = await Message.createSystemMessage({
        title,
        content,
        type,
        priority,
        recipient_id,
        recipient_role,
        is_global,
        scheduled_at: scheduled_at ? new Date(scheduled_at) : null,
        expires_at: expires_at ? new Date(expires_at) : null,
        metadata: { template_name, variables }
      });

      logger.info(`管理员 ${req.user.username} 使用模板 ${template_name} 发送消息: ${title}`);

      return success(res, { message: '模板消息发送成功', data: message });
    } catch (err) {
      logger.error('使用模板发送消息失败:', err);
      return error(res, '使用模板发送消息失败');
    }
  }

  // 定时任务：发送预定的消息
  async sendScheduledMessages(req, res) {
    try {
      // 验证权限（系统内部调用或管理员）
      if (req.user && req.user.role !== 'super_admin') {
        return forbidden(res, '无权限执行此操作');
      }

      const count = await Message.sendScheduledMessages();

      return success(res, { message: `已发送 ${count} 条预定的消息` });
    } catch (err) {
      logger.error('发送预定消息失败:', err);
      return error(res, '发送预定消息失败');
    }
  }

  // 定时任务：清理过期消息
  async cleanupExpiredMessages(req, res) {
    try {
      // 验证权限（系统内部调用或管理员）
      if (req.user && req.user.role !== 'super_admin') {
        return forbidden(res, '无权限执行此操作');
      }

      const deletedCount = await Message.deleteExpiredMessages();

      return success(res, { message: `已清理 ${deletedCount} 条过期消息` });
    } catch (err) {
      logger.error('清理过期消息失败:', err);
      return error(res, '清理过期消息失败');
    }
  }
}

module.exports = new MessageController();