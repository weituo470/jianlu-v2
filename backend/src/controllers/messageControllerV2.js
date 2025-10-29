const { Message, MessageTemplate, User, UserMessageState } = require('../models');
const { v4: uuidv4 } = require('uuid');
const { Op } = require('sequelize');
const logger = require('../utils/logger');
const { success, error, notFound, forbidden } = require('../utils/response');

// 独立的权限检查函数
async function checkMessagePermission(message, userId) {
    logger.info('🔐 Permission Check Debug - 开始权限检查');

    try {
        logger.info('  📋 检查参数:', {
            messageId: message.id,
            userId: userId,
            is_global: message.is_global,
            recipient_id: message.recipient_id,
            recipient_role: message.recipient_role
        });

        // 如果是全局消息，所有用户都能看到
        if (message.is_global) {
            logger.info('  ✅ 全局消息，允许访问');
            return true;
        }

        // 如果直接发送给该用户
        if (message.recipient_id === userId) {
            logger.info('  ✅ 直接发送给该用户，允许访问');
            return true;
        }

        // 如果按角色发送，检查用户角色
        if (message.recipient_role) {
            logger.info('  👥 检查角色权限:', message.recipient_role);
            const user = await User.findByPk(userId);
            const hasRolePermission = user && user.role === message.recipient_role;
            logger.info('  📊 角色检查结果:', {
                userRole: user?.role,
                requiredRole: message.recipient_role,
                hasPermission: hasRolePermission
            });
            return hasRolePermission;
        }

        // 其他情况需要特殊权限
        logger.info('  🛡️ 检查管理员权限');
        const user = await User.findByPk(userId);
        const hasAdminPermission = user && ['super_admin', 'admin'].includes(user.role);
        logger.info('  📊 管理员权限检查结果:', {
            userRole: user?.role,
            hasPermission: hasAdminPermission
        });
        return hasAdminPermission;
    } catch (error) {
        logger.error('  ❌ 权限检查异常:', {
            error: error.message,
            stack: error.stack,
            messageId: message.id,
            userId: userId
        });
        return false;
    }
}

class MessageControllerV2 {
    // 初始化用户消息状态（当新消息产生时自动创建状态）
    async initializeUserMessageStates(messageId, recipientUsers = []) {
        try {
            const states = [];

            // 为每个接收者创建消息状态
            for (const user of recipientUsers) {
                const state = await UserMessageState.getOrCreateState(user.id, messageId);
                states.push(state);
            }

            // 如果是全局消息，为所有用户创建状态
            const message = await Message.findByPk(messageId);
            if (message && message.is_global) {
                const allUsers = await User.findAll({
                    where: { status: 'active' }
                });

                for (const user of allUsers) {
                    const state = await UserMessageState.getOrCreateState(user.id, messageId);
                    states.push(state);
                }
            }

            return states;
        } catch (error) {
            logger.error('初始化用户消息状态失败:', error);
            throw error;
        }
    }

    // 获取用户消息列表（重构版本）
    async getMessages(req, res) {
        try {
            const userId = req.user.id;
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
                unread_only: unread_only === 'true'
            };

            const result = await UserMessageState.getVisibleMessagesForUser(userId, options);

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
            const { id } = req.params;
            const userId = req.user.id;

            // 获取消息
            const message = await Message.findByPk(id);
            if (!message) {
                return notFound(res, '消息不存在');
            }

            // 检查用户是否有权限查看此消息
            const hasPermission = await checkMessagePermission(message, userId);
            if (!hasPermission) {
                return forbidden(res, '无权限查看此消息');
            }

            // 获取或创建用户消息状态
            const messageState = await UserMessageState.getOrCreateState(userId, id);

            // 如果消息未读，自动标记为已读
            if (!messageState.is_read) {
                await messageState.markAsRead();
            }

            return success(res, {
                message: {
                    ...message.get({ plain: true }),
                    user_message_state: {
                        is_read: messageState.is_read,
                        is_deleted: messageState.is_deleted,
                        is_hidden: messageState.is_hidden,
                        read_at: messageState.read_at,
                        deleted_at: messageState.deleted_at,
                        hidden_at: messageState.hidden_at
                    }
                }
            });
        } catch (err) {
            logger.error('获取消息详情失败:', err);
            return error(res, '获取消息详情失败');
        }
    }

    // 标记消息为已读
    async markAsRead(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user.id;

            const message = await Message.findByPk(id);
            if (!message) {
                return notFound(res, '消息不存在');
            }

            const hasPermission = await this.checkMessagePermission(message, userId);
            if (!hasPermission) {
                return forbidden(res, '无权限操作此消息');
            }

            const messageState = await UserMessageState.getOrCreateState(userId, id);
            await messageState.markAsRead();

            return success(res, {
                message: '消息已标记为已读',
                is_read: true,
                read_at: messageState.read_at
            });
        } catch (err) {
            logger.error('标记消息已读失败:', err);
            return error(res, '标记消息已读失败');
        }
    }

    // 标记消息为未读
    async markAsUnread(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user.id;

            const message = await Message.findByPk(id);
            if (!message) {
                return notFound(res, '消息不存在');
            }

            const hasPermission = await this.checkMessagePermission(message, userId);
            if (!hasPermission) {
                return forbidden(res, '无权限操作此消息');
            }

            const messageState = await UserMessageState.getOrCreateState(userId, id);
            await messageState.markAsUnread();

            return success(res, {
                message: '消息已标记为未读',
                is_read: false,
                read_at: null
            });
        } catch (err) {
            logger.error('标记消息未读失败:', err);
            return error(res, '标记消息未读失败');
        }
    }

    // 删除消息（软删除）
    async deleteMessage(req, res) {
        logger.info('🗑️ MessageController Debug - 开始处理删除请求');

        try {
            const { id } = req.params;
            const userId = req.user.id;

            logger.info('  📄 请求参数:', {
                messageId: id,
                userId: userId,
                userAgent: req.get('User-Agent'),
                ip: req.ip
            });

            const message = await Message.findByPk(id);
            if (!message) {
                logger.warn('  ❌ 消息不存在:', id);
                return notFound(res, '消息不存在');
            }

            logger.info('  📋 找到消息:', {
                id: message.id,
                title: message.title,
                type: message.type,
                sender_id: message.sender_id,
                recipient_id: message.recipient_id,
                recipient_role: message.recipient_role,
                is_global: message.is_global
            });

            const hasPermission = await checkMessagePermission(message, userId);
            logger.info('  🔐 权限检查结果:', hasPermission);

            if (!hasPermission) {
                logger.warn('  ❌ 权限不足:', { userId, messageId: id });
                return forbidden(res, '无权限操作此消息');
            }

            logger.info('  🔄 开始创建/更新消息状态...');
            const messageState = await UserMessageState.getOrCreateState(userId, id);
            logger.info('  📊 消息状态创建/获取完成:', {
                id: messageState.id,
                is_read: messageState.is_read,
                is_deleted: messageState.is_deleted,
                is_hidden: messageState.is_hidden
            });

            await messageState.markAsDeleted();
            logger.info('  ✅ 消息标记为已删除:', {
                deleted_at: messageState.deleted_at,
                is_deleted: messageState.is_deleted
            });

            logger.info('  🎉 删除操作完成');
            return success(res, {
                message: '消息已删除',
                is_deleted: true,
                deleted_at: messageState.deleted_at
            });
        } catch (err) {
            logger.error('  ❌ 删除消息异常:', {
                error: err.message,
                stack: err.stack,
                params: req.params,
                user: req.user?.id
            });
            return error(res, '删除消息失败');
        }
    }

    // 隐藏消息
    async hideMessage(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user.id;

            const message = await Message.findByPk(id);
            if (!message) {
                return notFound(res, '消息不存在');
            }

            const hasPermission = await this.checkMessagePermission(message, userId);
            if (!hasPermission) {
                return forbidden(res, '无权限操作此消息');
            }

            const messageState = await UserMessageState.getOrCreateState(userId, id);
            await messageState.markAsHidden();

            return success(res, {
                message: '消息已隐藏',
                is_hidden: true,
                hidden_at: messageState.hidden_at
            });
        } catch (err) {
            logger.error('隐藏消息失败:', err);
            return error(res, '隐藏消息失败');
        }
    }

    // 恢复消息
    async restoreMessage(req, res) {
        try {
            const { id } = req.params;
            const userId = req.user.id;

            const message = await Message.findByPk(id);
            if (!message) {
                return notFound(res, '消息不存在');
            }

            const hasPermission = await this.checkMessagePermission(message, userId);
            if (!hasPermission) {
                return forbidden(res, '无权限操作此消息');
            }

            const messageState = await UserMessageState.findByUserAndMessage(userId, id);
            if (!messageState) {
                return notFound(res, '消息状态不存在');
            }

            await messageState.restore();

            return success(res, {
                message: '消息已恢复',
                is_deleted: false,
                is_hidden: false,
                deleted_at: null,
                hidden_at: null
            });
        } catch (err) {
            logger.error('恢复消息失败:', err);
            return error(res, '恢复消息失败');
        }
    }

    // 获取未读消息数量
    async getUnreadCount(req, res) {
        try {
            const userId = req.user.id;
            const count = await UserMessageState.getUnreadCountForUser(userId);

            return success(res, {
                unread_count: count
            });
        } catch (err) {
            logger.error('获取未读消息数量失败:', err);
            return error(res, '获取未读消息数量失败');
        }
    }

    // 标记所有消息为已读
    async markAllAsRead(req, res) {
        try {
            const userId = req.user.id;
            const count = await UserMessageState.markAllAsReadForUser(userId);

            return success(res, {
                message: `已标记 ${count} 条消息为已读`,
                marked_count: count
            });
        } catch (err) {
            logger.error('标记所有消息已读失败:', err);
            return error(res, '标记所有消息已读失败');
        }
    }

  
    // 批量操作
    async batchOperation(req, res) {
        try {
            const { operation, message_ids } = req.body;
            const userId = req.user.id;

            if (!operation || !Array.isArray(message_ids) || message_ids.length === 0) {
                return error(res, '无效的请求参数');
            }

            const results = [];

            for (const messageId of message_ids) {
                try {
                    let result;
                    switch (operation) {
                        case 'mark_read':
                            result = await this.markMessageAsRead(userId, messageId);
                            break;
                        case 'mark_unread':
                            result = await this.markMessageAsUnread(userId, messageId);
                            break;
                        case 'delete':
                            result = await this.deleteMessageById(userId, messageId);
                            break;
                        case 'hide':
                            result = await this.hideMessageById(userId, messageId);
                            break;
                        case 'restore':
                            result = await this.restoreMessageById(userId, messageId);
                            break;
                        default:
                            throw new Error('无效的操作类型');
                    }
                    results.push({ message_id, success: true, result });
                } catch (error) {
                    results.push({ message_id, success: false, error: error.message });
                }
            }

            const successCount = results.filter(r => r.success).length;
            const failureCount = results.length - successCount;

            return success(res, {
                message: `批量操作完成：成功 ${successCount} 条，失败 ${failureCount} 条`,
                results,
                success_count: successCount,
                failure_count: failureCount
            });
        } catch (err) {
            logger.error('批量操作失败:', err);
            return error(res, '批量操作失败');
        }
    }

    // 辅助方法：标记消息为已读
    async markMessageAsRead(userId, messageId) {
        const messageState = await UserMessageState.getOrCreateState(userId, messageId);
        return await messageState.markAsRead();
    }

    // 辅助方法：标记消息为未读
    async markMessageAsUnread(userId, messageId) {
        const messageState = await UserMessageState.getOrCreateState(userId, messageId);
        return await messageState.markAsUnread();
    }

    // 辅助方法：删除消息
    async deleteMessageById(userId, messageId) {
        const messageState = await UserMessageState.getOrCreateState(userId, messageId);
        return await messageState.markAsDeleted();
    }

    // 辅助方法：隐藏消息
    async hideMessageById(userId, messageId) {
        const messageState = await UserMessageState.getOrCreateState(userId, messageId);
        return await messageState.markAsHidden();
    }

    // 辅助方法：恢复消息
    async restoreMessageById(userId, messageId) {
        const messageState = await UserMessageState.findByUserAndMessage(userId, messageId);
        if (!messageState) {
            throw new Error('消息状态不存在');
        }
        return await messageState.restore();
    }

    // 发送个人消息
    async sendPersonalMessage(req, res) {
        try {
            const { recipient_id, title, content, type = 'personal', priority = 'normal', metadata = {} } = req.body;
            const senderId = req.user.id;

            // 验证接收者
            const recipient = await User.findByPk(recipient_id);
            if (!recipient) {
                return notFound(res, '接收者不存在');
            }

            const message = await Message.create({
                id: uuidv4(),
                sender_id: senderId,
                recipient_id,
                title,
                content,
                type,
                priority,
                metadata
            });

            // 为接收者创建消息状态
            await this.initializeUserMessageStates(message.id, [recipient]);

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

            const message = await Message.create({
                id: uuidv4(),
                sender_id: req.user.id,
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

            // 如果是全局消息，为所有用户创建状态
            if (is_global) {
                const allUsers = await User.findAll({
                    where: { status: 'active' }
                });
                await this.initializeUserMessageStates(message.id, allUsers);
            } else if (recipient_role) {
                // 为指定角色的用户创建状态
                const roleUsers = await User.findAll({
                    where: { role: recipient_role, status: 'active' }
                });
                await this.initializeUserMessageStates(message.id, roleUsers);
            }

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

            const message = await Message.create({
                id: uuidv4(),
                sender_id: senderId,
                title,
                content,
                type,
                priority,
                recipient_role,
                metadata
            });

            // 为该角色的所有用户创建消息状态
            const roleUsers = await User.findAll({
                where: { role: recipient_role, status: 'active' }
            });
            await this.initializeUserMessageStates(message.id, roleUsers);

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

            // 验证权限（仅超级管理员）
            if (req.user.role !== 'super_admin') {
                return forbidden(res, '无权限发送全局广播');
            }

            const message = await Message.create({
                id: uuidv4(),
                sender_id: req.user.id,
                title,
                content,
                type,
                priority,
                is_global: true,
                scheduled_at: scheduled_at ? new Date(scheduled_at) : null,
                expires_at: expires_at ? new Date(expires_at) : null,
                metadata
            });

            // 为所有活跃用户创建消息状态
            const allUsers = await User.findAll({
                where: { status: 'active' }
            });
            await this.initializeUserMessageStates(message.id, allUsers);

            logger.info(`超级管理员 ${req.user.username} 发送全局广播: ${title}`);

            return success(res, { message: '全局广播发送成功', data: message });
        } catch (err) {
            logger.error('发送全局广播失败:', err);
            return error(res, '发送全局广播失败');
        }
    }

    // 获取消息模板列表
    async getMessageTemplates(req, res) {
        try {
            const { type } = req.query;

            const whereClause = {};
            if (type) {
                whereClause.type = type;
            }

            const templates = await MessageTemplate.findAll({
                where: whereClause,
                order: [['name', 'ASC']]
            });

            return success(res, { templates });
        } catch (err) {
            logger.error('获取消息模板失败:', err);
            return error(res, '获取消息模板失败');
        }
    }

    // 从模板发送消息
    async sendMessageFromTemplate(req, res) {
        try {
            const {
                template_name,
                recipient_id = null,
                recipient_role = null,
                is_global = false,
                variables = {},
                scheduled_at = null,
                expires_at = null
            } = req.body;

            // 获取模板
            const template = await MessageTemplate.findOne({
                where: { name: template_name }
            });

            if (!template) {
                return notFound(res, '消息模板不存在');
            }

            // 替换模板变量
            let title = template.title;
            let content = template.content;

            for (const [key, value] of Object.entries(variables)) {
                const regex = new RegExp(`{{\\s*${key}\\s*}}`, 'g');
                title = title.replace(regex, value);
                content = content.replace(regex, value);
            }

            const message = await Message.create({
                id: uuidv4(),
                sender_id: req.user.id,
                title,
                content,
                type: template.type,
                priority: template.priority,
                recipient_id,
                recipient_role,
                is_global,
                scheduled_at: scheduled_at ? new Date(scheduled_at) : null,
                expires_at: expires_at ? new Date(expires_at) : null,
                metadata: { template_name, variables }
            });

            // 创建用户消息状态
            if (is_global) {
                const allUsers = await User.findAll({
                    where: { status: 'active' }
                });
                await this.initializeUserMessageStates(message.id, allUsers);
            } else if (recipient_id) {
                const recipient = await User.findByPk(recipient_id);
                if (recipient) {
                    await this.initializeUserMessageStates(message.id, [recipient]);
                }
            } else if (recipient_role) {
                const roleUsers = await User.findAll({
                    where: { role: recipient_role, status: 'active' }
                });
                await this.initializeUserMessageStates(message.id, roleUsers);
            }

            logger.info(`用户 ${req.user.username} 使用模板 ${template_name} 发送消息: ${title}`);

            return success(res, { message: '消息发送成功', data: message });
        } catch (err) {
            logger.error('从模板发送消息失败:', err);
            return error(res, '从模板发送消息失败');
        }
    }

    // 发送定时消息
    async sendScheduledMessages(req, res) {
        try {
            // 验证权限（仅超级管理员）
            if (req.user.role !== 'super_admin') {
                return forbidden(res, '无权限发送定时消息');
            }

            const messages = await Message.findAll({
                where: {
                    scheduled_at: {
                        [Op.lte]: new Date()
                    },
                    status: 'scheduled'
                }
            });

            let sentCount = 0;
            for (const message of messages) {
                try {
                    // 更新消息状态为已发送
                    await message.update({ status: 'sent', sent_at: new Date() });

                    // 创建用户消息状态
                    if (message.is_global) {
                        const allUsers = await User.findAll({
                            where: { status: 'active' }
                        });
                        await this.initializeUserMessageStates(message.id, allUsers);
                    } else if (message.recipient_id) {
                        const recipient = await User.findByPk(message.recipient_id);
                        if (recipient) {
                            await this.initializeUserMessageStates(message.id, [recipient]);
                        }
                    } else if (message.recipient_role) {
                        const roleUsers = await User.findAll({
                            where: { role: message.recipient_role, status: 'active' }
                        });
                        await this.initializeUserMessageStates(message.id, roleUsers);
                    }

                    sentCount++;
                } catch (error) {
                    logger.error(`发送定时消息失败 (ID: ${message.id}):`, error);
                }
            }

            return success(res, {
                message: `定时消息发送完成`,
                sent_count: sentCount,
                total_count: messages.length
            });
        } catch (err) {
            logger.error('发送定时消息失败:', err);
            return error(res, '发送定时消息失败');
        }
    }

    // 清理过期消息
    async cleanupExpiredMessages(req, res) {
        try {
            // 验证权限（仅超级管理员）
            if (req.user.role !== 'super_admin') {
                return forbidden(res, '无权限清理过期消息');
            }

            const expiredMessages = await Message.findAll({
                where: {
                    expires_at: {
                        [Op.lte]: new Date()
                    },
                    status: { [Op.ne]: 'expired' }
                }
            });

            let expiredCount = 0;
            for (const message of expiredMessages) {
                try {
                    await message.update({ status: 'expired' });
                    expiredCount++;
                } catch (error) {
                    logger.error(`清理过期消息失败 (ID: ${message.id}):`, error);
                }
            }

            return success(res, {
                message: `过期消息清理完成`,
                expired_count: expiredCount,
                total_count: expiredMessages.length
            });
        } catch (err) {
            logger.error('清理过期消息失败:', err);
            return error(res, '清理过期消息失败');
        }
    }
}

module.exports = new MessageControllerV2();