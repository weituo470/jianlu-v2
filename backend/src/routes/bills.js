const express = require('express');
const router = express.Router();
const BillController = require('../controllers/billController');
const { authenticateToken, requirePermission } = require('../middleware/auth');
const { body, param, query, validationResult } = require('express-validator');

// 验证规则
const pushBillsValidation = [
    param('id').isUUID().withMessage('活动ID格式不正确'),
    body('customMessage').optional().isString().isLength({ max: 500 }).withMessage('自定义消息长度不能超过500字符'),
    body('forceRecalculate').optional().isBoolean().withMessage('强制重新计算必须是布尔值')
];

const getHistoryValidation = [
    param('id').isUUID().withMessage('活动ID格式不正确'),
    query('page').optional().isInt({ min: 1 }).withMessage('页码必须是正整数'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('每页数量必须在1-100之间')
];

// 处理验证错误
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const formattedErrors = errors.array().map(error => ({
            field: error.param,
            message: error.msg
        }));
        return res.status(400).json({
            success: false,
            message: '参数验证失败',
            errors: formattedErrors
        });
    }
    next();
};

/**
 * 账单相关路由
 */

// 推送活动账单给所有参与者
router.post('/activities/:id/push-bills',
    authenticateToken,
    requirePermission('activity:update'),
    pushBillsValidation,
    handleValidationErrors,
    BillController.pushActivityBills
);

// 获取活动的账单推送历史
router.get('/activities/:id/bill-history',
    authenticateToken,
    requirePermission('activity:read'),
    getHistoryValidation,
    handleValidationErrors,
    BillController.getBillHistory
);

// 重新计算并推送账单
router.post('/activities/:id/recalculate-bills',
    authenticateToken,
    requirePermission('activity:update'),
    pushBillsValidation,
    handleValidationErrors,
    BillController.recalculateAndPushBills
);

// 获取用户的所有账单
router.get('/my-bills',
    authenticateToken,
    requirePermission('activity:read'),
    async (req, res) => {
        try {
            const { page = 1, limit = 20, status, type } = req.query;
            const { Message } = require('../models');

            // 构建查询条件
            const whereClause = {
                recipient_id: req.user.id,
                type: 'personal',
                status: 'sent'
            };

            // 添加账单类型过滤
            if (type === 'bill') {
                whereClause['$metadata.type$'] = 'bill';
            }

            // 添加状态过滤
            if (status) {
                whereClause['$metadata.payment_status$'] = status;
            }

            const { count, rows: messages } = await Message.findAndCountAll({
                where: whereClause,
                include: [
                    {
                        model: require('../models').User,
                        as: 'sender',
                        attributes: ['id', 'username', 'nickname']
                    }
                ],
                order: [['created_at', 'DESC']],
                limit: parseInt(limit),
                offset: (parseInt(page) - 1) * parseInt(limit)
            });

            // 处理消息数据
            const bills = messages.map(msg => ({
                id: msg.id,
                title: msg.title,
                content: msg.content,
                amount: msg.metadata?.amount || 0,
                activity_id: msg.metadata?.activity_id,
                activity_title: msg.metadata?.activity_title,
                payment_status: msg.metadata?.payment_status || 'unpaid',
                payment_deadline: msg.metadata?.payment_deadline,
                is_read: msg.is_read,
                created_at: msg.created_at,
                sender: msg.sender
            }));

            return res.json({
                success: true,
                message: '获取账单列表成功',
                data: {
                    bills,
                    pagination: {
                        current_page: parseInt(page),
                        total_pages: Math.ceil(count / limit),
                        total_count: count,
                        per_page: parseInt(limit)
                    }
                }
            });

        } catch (error) {
            const logger = require('../utils/logger');
            logger.error('获取用户账单失败:', error);
            return res.status(500).json({
                success: false,
                message: '获取账单列表失败'
            });
        }
    }
);

// 标记账单为已支付
router.put('/bills/:id/mark-paid',
    authenticateToken,
    requirePermission('activity:update'),
    async (req, res) => {
        try {
            const { id } = req.params;
            const { payment_method, payment_note } = req.body;

            const { Message } = require('../models');
            const message = await Message.findByPk(id);

            if (!message) {
                return res.status(404).json({
                    success: false,
                    message: '账单不存在'
                });
            }

            // 验证权限：只有账单接收者或管理员可以标记支付状态
            if (message.recipient_id !== req.user.id && req.user.role !== 'super_admin' && req.user.role !== 'admin') {
                return res.status(403).json({
                    success: false,
                    message: '没有权限操作此账单'
                });
            }

            // 更新支付状态
            const updatedMetadata = {
                ...message.metadata,
                payment_status: 'paid',
                payment_time: new Date().toISOString(),
                payment_method: payment_method || 'unknown',
                payment_note: payment_note || ''
            };

            await message.update({ metadata: updatedMetadata });

            return res.json({
                success: true,
                message: '账单支付状态更新成功',
                data: {
                    id: message.id,
                    payment_status: 'paid',
                    payment_time: updatedMetadata.payment_time
                }
            });

        } catch (error) {
            const logger = require('../utils/logger');
            logger.error('标记账单支付状态失败:', error);
            return res.status(500).json({
                success: false,
                message: '标记账单支付状态失败'
            });
        }
    }
);

module.exports = router;