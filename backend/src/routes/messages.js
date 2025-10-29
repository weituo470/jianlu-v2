const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageControllerV2');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { body, param, query, validationResult } = require('express-validator');

// 验证中间件
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: '输入验证失败',
      errors: errors.array()
    });
  }
  next();
};

// 所有消息相关路由都需要认证
router.use(authenticateToken);

// 用户消息相关路由
router.get('/', [
  query('page').optional().isInt({ min: 1 }).withMessage('页码必须是正整数'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('每页数量必须在1-100之间'),
  query('type').optional().isIn(['system', 'personal', 'activity', 'team', 'announcement', 'bill']).withMessage('无效的消息类型'),
  query('is_read').optional().isBoolean().withMessage('is_read必须是布尔值'),
  query('priority').optional().isIn(['low', 'normal', 'high', 'urgent']).withMessage('无效的优先级'),
  query('unread_only').optional().isBoolean().withMessage('unread_only必须是布尔值')
], validateRequest, messageController.getMessages);

router.get('/unread-count', messageController.getUnreadCount);

router.get('/:id', [
  param('id').isUUID().withMessage('无效的消息ID')
], validateRequest, messageController.getMessage);

router.put('/:id/read', [
  param('id').isUUID().withMessage('无效的消息ID')
], validateRequest, messageController.markAsRead);

router.put('/:id/unread', [
  param('id').isUUID().withMessage('无效的消息ID')
], validateRequest, messageController.markAsUnread);

router.put('/read-all', messageController.markAllAsRead);

// 发送个人消息
router.post('/personal', [
  body('recipient_id').isUUID().withMessage('无效的接收者ID'),
  body('title').isLength({ min: 1, max: 200 }).withMessage('标题长度必须在1-200字符之间'),
  body('content').isLength({ min: 1, max: 5000 }).withMessage('内容长度必须在1-5000字符之间'),
  body('type').optional().isIn(['system', 'personal', 'activity', 'team', 'announcement']).withMessage('无效的消息类型'),
  body('priority').optional().isIn(['low', 'normal', 'high', 'urgent']).withMessage('无效的优先级'),
  body('metadata').optional().isObject().withMessage('metadata必须是对象')
], validateRequest, messageController.sendPersonalMessage);


// 管理员权限路由 - 只对管理员功能设置权限要求
// 普通用户仍可访问消息查看和管理功能

// 系统公告
router.post('/announcement', [
  body('title').isLength({ min: 1, max: 200 }).withMessage('标题长度必须在1-200字符之间'),
  body('content').isLength({ min: 1, max: 5000 }).withMessage('内容长度必须在1-5000字符之间'),
  body('priority').optional().isIn(['low', 'normal', 'high', 'urgent']).withMessage('无效的优先级'),
  body('recipient_role').optional().isIn(['super_admin', 'admin', 'user']).withMessage('无效的接收角色'),
  body('is_global').optional().isBoolean().withMessage('is_global必须是布尔值'),
  body('scheduled_at').optional().isISO8601().withMessage('预定时间格式无效'),
  body('expires_at').optional().isISO8601().withMessage('过期时间格式无效'),
  body('metadata').optional().isObject().withMessage('metadata必须是对象')
], validateRequest, messageController.createSystemAnnouncement);

// 向指定角色发送消息
router.post('/broadcast/role', [
  body('recipient_role').isIn(['super_admin', 'admin', 'user']).withMessage('无效的接收角色'),
  body('title').isLength({ min: 1, max: 200 }).withMessage('标题长度必须在1-200字符之间'),
  body('content').isLength({ min: 1, max: 5000 }).withMessage('内容长度必须在1-5000字符之间'),
  body('type').optional().isIn(['system', 'personal', 'activity', 'team', 'announcement']).withMessage('无效的消息类型'),
  body('priority').optional().isIn(['low', 'normal', 'high', 'urgent']).withMessage('无效的优先级'),
  body('metadata').optional().isObject().withMessage('metadata必须是对象')
], validateRequest, messageController.broadcastToRole);

// 全局广播（仅超级管理员）
router.post('/broadcast/all', [
  body('title').isLength({ min: 1, max: 200 }).withMessage('标题长度必须在1-200字符之间'),
  body('content').isLength({ min: 1, max: 5000 }).withMessage('内容长度必须在1-5000字符之间'),
  body('type').optional().isIn(['system', 'personal', 'activity', 'team', 'announcement']).withMessage('无效的消息类型'),
  body('priority').optional().isIn(['low', 'normal', 'high', 'urgent']).withMessage('无效的优先级'),
  body('scheduled_at').optional().isISO8601().withMessage('预定时间格式无效'),
  body('expires_at').optional().isISO8601().withMessage('过期时间格式无效'),
  body('metadata').optional().isObject().withMessage('metadata必须是对象')
], validateRequest, requireRole(['super_admin']), messageController.broadcastToAll);

// 消息模板
router.get('/templates/list', [
  query('type').optional().isIn(['system', 'personal', 'activity', 'team', 'announcement']).withMessage('无效的消息类型')
], validateRequest, messageController.getMessageTemplates);

router.post('/templates/send', [
  body('template_name').isString().isLength({ min: 1, max: 100 }).withMessage('模板名称长度必须在1-100字符之间'),
  body('recipient_id').optional().isUUID().withMessage('无效的接收者ID'),
  body('recipient_role').optional().isIn(['super_admin', 'admin', 'user']).withMessage('无效的接收角色'),
  body('is_global').optional().isBoolean().withMessage('is_global必须是布尔值'),
  body('variables').optional().isObject().withMessage('variables必须是对象'),
  body('scheduled_at').optional().isISO8601().withMessage('预定时间格式无效'),
  body('expires_at').optional().isISO8601().withMessage('过期时间格式无效')
], validateRequest, messageController.sendMessageFromTemplate);

// 定时任务路由（仅超级管理员）
router.post('/tasks/send-scheduled', requireRole(['super_admin']), messageController.sendScheduledMessages);
router.post('/tasks/cleanup-expired', requireRole(['super_admin']), messageController.cleanupExpiredMessages);

// 新的用户个性化消息管理路由
router.delete('/:id', [
  param('id').isUUID().withMessage('无效的消息ID')
], validateRequest, messageController.deleteMessage);

router.post('/:id/hide', [
  param('id').isUUID().withMessage('无效的消息ID')
], validateRequest, messageController.hideMessage);

router.post('/:id/restore', [
  param('id').isUUID().withMessage('无效的消息ID')
], validateRequest, messageController.restoreMessage);

// 批量操作路由
router.post('/batch', [
  body('operation').isIn(['mark_read', 'mark_unread', 'delete', 'hide', 'restore']).withMessage('无效的操作类型'),
  body('message_ids').isArray({ min: 1 }).withMessage('消息ID列表不能为空')
], validateRequest, messageController.batchOperation);

module.exports = router;