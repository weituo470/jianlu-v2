const { Activity, ActivityParticipant, ActivityExpense, User, Message, UserMessageState } = require('../models');
const { success, error } = require('../utils/response');
const logger = require('../utils/logger');

/**
 * 生成账单消息内容
 */
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

/**
 * 账单推送控制器
 */
class BillController {
    /**
     * 推送活动账单给所有参与者
     */
    static async pushActivityBills(req, res) {
        try {
            const { id } = req.params;
            const { customMessage, forceRecalculate = false } = req.body;

            // 验证活动是否存在
            const activity = await Activity.findByPk(id);
            if (!activity) {
                return error(res, '活动不存在', 404);
            }

            logger.info(`管理员开始推送活动 ${activity.title} 的账单`);

            // 计算AA费用分摊
            const aaCalculation = await activity.calculateAACosts({
                useCustomTotalCost: false
            });

            logger.info('AA计算结果:', JSON.stringify(aaCalculation, null, 2));

            // 验证AA计算结果
            if (!aaCalculation) {
                return error(res, 'AA费用计算失败，返回结果为空', 400);
            }

            if (!aaCalculation.participants || !Array.isArray(aaCalculation.participants)) {
                logger.error('AA计算结果中的participants字段无效:', aaCalculation.participants);
                return error(res, 'AA费用计算结果无效，未找到参与者数据', 400);
            }

            if (aaCalculation.participants.length === 0) {
                return error(res, '没有找到需要分摊费用的参与者', 400);
            }

            const aaCosts = aaCalculation.participants;
            logger.info(`计算完成，需要推送 ${aaCosts.length} 个账单`);

            // 使用新的推送方法，适配UserMessageState系统
            const billResult = await BillController.createBillMessagesWithUserStates(activity.id, aaCosts, {
                senderId: req.user?.id || null,
                customMessage: customMessage,
                priority: 'normal'
            });

            const { results, errors } = billResult;

            // 返回结果
            return success(res, {
                message: '账单推送完成',
                activity: {
                    id: activity.id,
                    title: activity.title,
                    total_amount: aaCosts.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0)
                },
                results: {
                    success_count: results.length,
                    error_count: errors.length,
                    successful_bills: results,
                    errors: errors
                }
            });

        } catch (err) {
            logger.error('推送账单失败:', err);
            return error(res, '推送账单失败: ' + err.message, 500);
        }
    }

    /**
     * 获取活动的账单推送历史
     */
    static async getBillHistory(req, res) {
        try {
            const { id } = req.params;
            const { page = 1, limit = 20 } = req.query;

            const activity = await Activity.findByPk(id);
            if (!activity) {
                return error(res, '活动不存在', 404);
            }

            // 获取该活动的所有账单消息
            const { count, rows: messages } = await Message.findAndCountAll({
                where: {
                    type: 'personal',
                    status: 'sent',
                    '$metadata.type$': 'bill',
                    '$metadata.activity_id$': id
                },
                include: [
                    {
                        model: User,
                        as: 'sender',
                        attributes: ['id', 'username', 'nickname']
                    }
                ],
                order: [['created_at', 'DESC']],
                limit: parseInt(limit),
                offset: (parseInt(page) - 1) * parseInt(limit)
            });

            return success(res, {
                activity: {
                    id: activity.id,
                    title: activity.title
                },
                bills: messages.map(msg => ({
                    id: msg.id,
                    title: msg.title,
                    content: msg.content,
                    recipient_id: msg.recipient_id,
                    amount: msg.metadata?.amount || 0,
                    status: msg.metadata?.payment_status || 'unpaid',
                    created_at: msg.created_at,
                    sender: msg.sender
                })),
                pagination: {
                    current_page: parseInt(page),
                    total_pages: Math.ceil(count / limit),
                    total_count: count,
                    per_page: parseInt(limit)
                }
            });

        } catch (error) {
            logger.error('获取账单历史失败:', error);
            return error(res, '获取账单历史失败', 500);
        }
    }

    /**
     * 重新计算并推送账单
     */
    static async recalculateAndPushBills(req, res) {
        try {
            const { id } = req.params;
            const { customMessage } = req.body;

            const activity = await Activity.findByPk(id);
            if (!activity) {
                return error(res, '活动不存在', 404);
            }

            logger.info(`管理员重新计算并推送活动 ${activity.title} 的账单`);

            // 删除旧的账单消息
            await Message.destroy({
                where: {
                    type: 'personal',
                    '$metadata.type$': 'bill',
                    '$metadata.activity_id$': id
                }
            });

            // 重新计算AA费用
            const aaCalculation = await activity.calculateAACosts({
                useCustomTotalCost: false
            });

            if (!aaCalculation || !aaCalculation.participants || aaCalculation.participants.length === 0) {
                return error(res, '没有找到需要分摊费用的参与者', 400);
            }

            const aaCosts = aaCalculation.participants;

            // 批量创建新的账单消息
            const results = [];
            for (const costItem of aaCosts) {
                const user = await User.findByPk(costItem.user_id);
                if (user) {
                    const messageData = {
                        title: `【账单更新】${activity.title}`,
                        content: generateBillContent(activity, costItem, user, customMessage),
                        type: 'personal',
                        priority: costItem.amount > 100 ? 'high' : 'normal',
                        recipient_id: costItem.user_id,
                        sender_id: req.user?.id || null,
                        status: 'sent',
                        metadata: {
                            type: 'bill',
                            activity_id: activity.id,
                            activity_title: activity.title,
                            amount: costItem.amount,
                            cost_sharing_ratio: costItem.cost_sharing_ratio,
                            bill_date: new Date().toISOString(),
                            payment_deadline: activity.payment_deadline,
                            is_recalculated: true
                        }
                    };

                    const message = await Message.create(messageData);
                    results.push({
                        user_id: costItem.user_id,
                        username: user.username,
                        amount: costItem.amount,
                        message_id: message.id
                    });
                }
            }

            return success(res, {
                message: '账单重新计算并推送完成',
                recalculated_bills: results.length,
                results: results
            });

        } catch (error) {
            logger.error('重新计算账单失败:', error);
            return error(res, '重新计算账单失败', 500);
        }
    }

    /**
     * 创建账单消息并自动创建UserMessageState记录（适配新的消息系统）
     */
    static async createBillMessagesWithUserStates(activityId, costSharingResults, options = {}) {
        const { senderId, customMessage, priority = 'normal' } = options;

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

                // 创建消息记录
                const messageData = {
                    title,
                    content,
                    type: 'personal', // 修正：使用personal而不是bill
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

                // 为用户消息创建状态记录
                await UserMessageState.getOrCreateState(costItem.user_id, message.id);

                results.push({
                    user_id: costItem.user_id,
                    username: user.username,
                    amount: costItem.amount,
                    message_id: message.id,
                    user_message_state_id: message.id // 消息ID作为状态记录的关联
                });

                logger.info(`账单消息创建成功: 用户 ${user.username}, 金额 ¥${costItem.amount}`);

            } catch (error) {
                const errorMsg = `为用户 ${costItem.user_id} 创建账单失败: ${error.message}`;
                logger.error(errorMsg);
                errors.push(errorMsg);
            }
        }

        return { results, errors };
    }
}

module.exports = BillController;