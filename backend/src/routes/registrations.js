const express = require('express');
const router = express.Router();
const { authenticateToken, requireRole } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validation');
const { ActivityRegistration, ActivityCostSharing } = require('../models/ActivityRegistration');
const { UserAccount } = require('../models/UserAccount');
const { Activity, User } = require('../models');
const logger = require('../utils/logger');
const { body, query, param } = require('express-validator');

/**
 * 报名活动
 * POST /api/registrations/register
 */
router.post('/register', [
  authenticateToken,
  body('activityId')
    .isUUID()
    .withMessage('活动ID格式错误'),
  body('participantNote')
    .optional()
    .isLength({ max: 500 })
    .withMessage('参与者备注不能超过500字符'),
  body('contactPhone')
    .optional({ checkFalsy: true })
    .isMobilePhone('zh-CN')
    .withMessage('联系电话格式错误'),
  body('emergencyContact')
    .optional()
    .isLength({ max: 100 })
    .withMessage('紧急联系人不能超过100字符'),
  body('dietaryRequirements')
    .optional()
    .isLength({ max: 200 })
    .withMessage('饮食要求不能超过200字符'),
  validateRequest
], async (req, res) => {
  try {
    const { 
      activityId, 
      participantNote, 
      contactPhone, 
      emergencyContact, 
      dietaryRequirements 
    } = req.body;
    const userId = req.user.id;
    
    // 获取活动信息
    const activity = await Activity.findByPk(activityId);
    if (!activity) {
      return res.status(404).json({
        success: false,
        message: '活动不存在'
      });
    }
    
    // 检查用户余额（如果需要费用）
    if (activity.cost_sharing_type === 'equal' && activity.total_cost > 0) {
      const userAccount = await UserAccount.getUserAccount(userId);
      // 这里暂时不检查余额，因为费用会在审核通过后计算
      // 实际项目中可能需要预估费用并检查余额
    }
    
    const registration = await ActivityRegistration.register(activityId, userId, {
      participantNote,
      contactPhone,
      emergencyContact,
      dietaryRequirements
    });
    
    logger.info(`用户 ${req.user.username} 报名活动: ${activity.title}`);
    
    res.json({
      success: true,
      message: '报名成功',
      data: {
        registrationId: registration.id,
        status: registration.status,
        needApproval: activity.need_approval,
        costAmount: parseFloat(registration.costAmount),
        registrationTime: registration.registrationTime
      }
    });
  } catch (error) {
    logger.error('报名活动失败:', error);
    res.status(400).json({
      success: false,
      message: error.message || '报名失败'
    });
  }
});

/**
 * 取消报名
 * DELETE /api/registrations/:registrationId
 */
router.delete('/:registrationId', [
  authenticateToken,
  param('registrationId')
    .isUUID()
    .withMessage('报名ID格式错误'),
  validateRequest
], async (req, res) => {
  try {
    const { registrationId } = req.params;
    const userId = req.user.id;
    
    const registration = await ActivityRegistration.findOne({
      where: { 
        id: registrationId, 
        userId 
      },
      include: [{ 
        model: Activity, 
        as: 'activity' 
      }]
    });
    
    if (!registration) {
      return res.status(404).json({
        success: false,
        message: '报名记录不存在'
      });
    }
    
    if (!registration.canCancel()) {
      return res.status(400).json({
        success: false,
        message: '当前状态不允许取消报名'
      });
    }
    
    // 如果已支付，需要退款
    if (registration.paymentStatus === 'paid' && registration.paidAmount > 0) {
      await UserAccount.updateBalance(userId, 'refund', registration.paidAmount, {
        description: `取消报名退款: ${registration.activity.title}`,
        relatedId: registration.activityId,
        relatedType: 'activity'
      });
    }
    
    await registration.update({
      status: 'cancelled'
    });
    
    // 如果之前是已审核状态，需要减少活动参与人数并重新计算费用
    if (registration.status === 'approved') {
      await registration.activity.update({
        current_participants: Math.max(0, registration.activity.current_participants - 1)
      });
      
      await ActivityRegistration.recalculateCostSharing(registration.activityId);
    }
    
    logger.info(`用户 ${req.user.username} 取消报名活动: ${registration.activity.title}`);
    
    res.json({
      success: true,
      message: '取消报名成功',
      data: {
        refundAmount: registration.paymentStatus === 'paid' ? parseFloat(registration.paidAmount) : 0
      }
    });
  } catch (error) {
    logger.error('取消报名失败:', error);
    res.status(400).json({
      success: false,
      message: error.message || '取消报名失败'
    });
  }
});

/**
 * 支付活动费用
 * POST /api/registrations/:registrationId/pay
 */
router.post('/:registrationId/pay', [
  authenticateToken,
  param('registrationId')
    .isUUID()
    .withMessage('报名ID格式错误'),
  validateRequest
], async (req, res) => {
  try {
    const { registrationId } = req.params;
    const userId = req.user.id;
    
    const registration = await ActivityRegistration.findOne({
      where: { 
        id: registrationId, 
        userId 
      },
      include: [{ 
        model: Activity, 
        as: 'activity' 
      }]
    });
    
    if (!registration) {
      return res.status(404).json({
        success: false,
        message: '报名记录不存在'
      });
    }
    
    if (registration.status !== 'approved') {
      return res.status(400).json({
        success: false,
        message: '报名尚未审核通过，无法支付'
      });
    }
    
    if (registration.paymentStatus === 'paid') {
      return res.status(400).json({
        success: false,
        message: '已经支付过了'
      });
    }
    
    const remainingAmount = registration.getRemainingAmount();
    if (remainingAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: '无需支付'
      });
    }
    
    // 检查余额
    const userAccount = await UserAccount.getUserAccount(userId);
    if (!userAccount.hasEnoughBalance(remainingAmount)) {
      return res.status(400).json({
        success: false,
        message: '余额不足，请先充值'
      });
    }
    
    // 扣费
    const transaction = await UserAccount.updateBalance(userId, 'expense', remainingAmount, {
      description: `活动费用支付: ${registration.activity.title}`,
      relatedId: registration.activityId,
      relatedType: 'activity'
    });
    
    // 更新支付状态
    await registration.update({
      paidAmount: parseFloat(registration.costAmount),
      paymentStatus: 'paid',
      paymentTime: new Date()
    });
    
    logger.info(`用户 ${req.user.username} 支付活动费用: ${registration.activity.title}, 金额: ${remainingAmount}`);
    
    res.json({
      success: true,
      message: '支付成功',
      data: {
        transactionId: transaction.transaction.id,
        paidAmount: parseFloat(remainingAmount),
        newBalance: parseFloat(transaction.account.balance)
      }
    });
  } catch (error) {
    logger.error('支付活动费用失败:', error);
    res.status(400).json({
      success: false,
      message: error.message || '支付失败'
    });
  }
});

/**
 * 获取我的报名记录
 * GET /api/registrations/my
 */
router.get('/my', [
  authenticateToken,
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('页码必须是正整数'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('每页条数必须在1-100之间'),
  query('status')
    .optional()
    .isIn(['pending', 'approved', 'rejected', 'cancelled', 'completed'])
    .withMessage('状态值无效'),
  validateRequest
], async (req, res) => {
  try {
    const userId = req.user.id;
    const { 
      page = 1, 
      limit = 20, 
      status 
    } = req.query;
    
    const where = { userId };
    if (status) {
      where.status = status;
    }
    
    const { count, rows } = await ActivityRegistration.findAndCountAll({
      where,
      include: [
        {
          model: Activity,
          as: 'activity',
          attributes: ['id', 'title', 'description', 'start_time', 'end_time', 'location', 'activity_status']
        },
        {
          model: ActivityCostSharing,
          as: 'costSharing',
          required: false
        }
      ],
      order: [['registration_time', 'DESC']],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    });
    
    logger.info(`用户 ${req.user.username} 查询报名记录`);
    
    res.json({
      success: true,
      data: {
        registrations: rows.map(reg => ({
          id: reg.id,
          activity: reg.activity,
          status: reg.status,
          costAmount: parseFloat(reg.costAmount),
          paidAmount: parseFloat(reg.paidAmount),
          remainingAmount: reg.getRemainingAmount(),
          paymentStatus: reg.paymentStatus,
          registrationTime: reg.registrationTime,
          paymentTime: reg.paymentTime,
          participantNote: reg.participantNote,
          canCancel: reg.canCancel()
        })),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: count,
          pages: Math.ceil(count / limit)
        }
      }
    });
  } catch (error) {
    logger.error('获取报名记录失败:', error);
    res.status(500).json({
      success: false,
      message: '获取报名记录失败'
    });
  }
});

/**
 * 管理员审核报名
 * POST /api/registrations/:registrationId/approve
 */
router.post('/:registrationId/approve', [
  authenticateToken,
  requireRole(['admin']),
  param('registrationId')
    .isUUID()
    .withMessage('报名ID格式错误'),
  body('action')
    .isIn(['approve', 'reject'])
    .withMessage('操作类型必须是approve或reject'),
  body('note')
    .optional()
    .isLength({ max: 500 })
    .withMessage('审核备注不能超过500字符'),
  validateRequest
], async (req, res) => {
  try {
    const { registrationId } = req.params;
    const { action, note = '' } = req.body;
    const approverId = req.user.id;
    
    const registration = await ActivityRegistration.findByPk(registrationId, {
      include: [
        { model: Activity, as: 'activity' },
        { model: User, as: 'user', attributes: ['id', 'username', 'nickname'] }
      ]
    });
    
    if (!registration) {
      return res.status(404).json({
        success: false,
        message: '报名记录不存在'
      });
    }
    
    if (registration.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: '该报名已经被处理过了'
      });
    }
    
    if (action === 'approve') {
      await ActivityRegistration.approve(registrationId, approverId, note);
      
      logger.info(`管理员 ${req.user.username} 审核通过报名: ${registration.user.username} -> ${registration.activity.title}`);
      
      res.json({
        success: true,
        message: '审核通过',
        data: {
          status: 'approved',
          costAmount: parseFloat(registration.costAmount)
        }
      });
    } else {
      await registration.update({
        status: 'rejected',
        approvalTime: new Date(),
        approvedBy: approverId,
        approvalNote: note
      });
      
      logger.info(`管理员 ${req.user.username} 拒绝报名: ${registration.user.username} -> ${registration.activity.title}`);
      
      res.json({
        success: true,
        message: '已拒绝报名',
        data: {
          status: 'rejected'
        }
      });
    }
  } catch (error) {
    logger.error('审核报名失败:', error);
    res.status(400).json({
      success: false,
      message: error.message || '审核失败'
    });
  }
});

/**
 * 获取活动报名列表（管理员）
 * GET /api/registrations/activity/:activityId
 */
router.get('/activity/:activityId', [
  authenticateToken,
  requireRole(['admin']),
  param('activityId')
    .isUUID()
    .withMessage('活动ID格式错误'),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('页码必须是正整数'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('每页条数必须在1-100之间'),
  query('status')
    .optional()
    .isIn(['pending', 'approved', 'rejected', 'cancelled', 'completed'])
    .withMessage('状态值无效'),
  validateRequest
], async (req, res) => {
  try {
    const { activityId } = req.params;
    const { status } = req.query;
    
    // 检查活动是否存在
    const activity = await Activity.findByPk(activityId);
    if (!activity) {
      return res.status(404).json({
        success: false,
        message: '活动不存在'
      });
    }
    
    const result = await ActivityRegistration.getActivityRegistrations(activityId, {
      ...req.query,
      status
    });
    
    logger.info(`管理员 ${req.user.username} 查询活动报名列表: ${activity.title}`);
    
    res.json({
      success: true,
      data: {
        activity: {
          id: activity.id,
          title: activity.title,
          total_cost: parseFloat(activity.total_cost || 0),
          organizer_cost: parseFloat(activity.organizer_cost || 0),
          participant_cost: parseFloat(activity.participant_cost || 0),
          max_participants: activity.max_participants,
          current_participants: activity.current_participants
        },
        ...result
      }
    });
  } catch (error) {
    logger.error('获取活动报名列表失败:', error);
    res.status(500).json({
      success: false,
      message: '获取报名列表失败'
    });
  }
});

/**
 * 获取活动费用分摊详情
 * GET /api/registrations/activity/:activityId/cost-sharing
 */
router.get('/activity/:activityId/cost-sharing', [
  authenticateToken,
  param('activityId')
    .isUUID()
    .withMessage('活动ID格式错误'),
  validateRequest
], async (req, res) => {
  try {
    const { activityId } = req.params;
    
    const activity = await Activity.findByPk(activityId);
    if (!activity) {
      return res.status(404).json({
        success: false,
        message: '活动不存在'
      });
    }
    
    const costSharings = await ActivityCostSharing.findAll({
      where: { activityId },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'nickname']
        },
        {
          model: ActivityRegistration,
          as: 'registration',
          required: false
        }
      ],
      order: [['cost_type', 'ASC'], ['calculated_at', 'ASC']]
    });
    
    logger.info(`用户 ${req.user.username} 查询活动费用分摊: ${activity.title}`);
    
    res.json({
      success: true,
      data: {
        activity: {
          id: activity.id,
          title: activity.title,
          total_cost: parseFloat(activity.total_cost || 0),
          organizer_cost: parseFloat(activity.organizer_cost || 0),
          participant_cost: parseFloat(activity.participant_cost || 0),
          cost_sharing_type: activity.cost_sharing_type
        },
        costSharings: costSharings.map(cs => ({
          id: cs.id,
          user: cs.user,
          costType: cs.costType,
          amount: parseFloat(cs.amount),
          description: cs.description,
          calculatedAt: cs.calculatedAt
        }))
      }
    });
  } catch (error) {
    logger.error('获取费用分摊详情失败:', error);
    res.status(500).json({
      success: false,
      message: '获取费用分摊详情失败'
    });
  }
});

module.exports = router;