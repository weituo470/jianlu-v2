const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { body, param, query } = require('express-validator');
const { TeamMember, TeamApplicationHistory, Team, User } = require('../models');
const logger = require('../utils/logger');
const { success, error } = require('../utils/response');
const { validateRequest } = require('../middleware/validation');

/**
 * 申请加入团队
 * POST /api/teams/:teamId/apply
 */
router.post('/:teamId/apply', [
  authenticateToken,
  param('teamId').isUUID().withMessage('团队ID格式错误'),
  body('reason')
    .optional()
    .isLength({ min: 10, max: 500 })
    .withMessage('申请理由必须在10-500个字符之间'),
  validateRequest
], async (req, res) => {
  try {
    const { teamId } = req.params;
    const { reason = '' } = req.body;
    const userId = req.user.id;

    const result = await TeamMember.applyToTeam(teamId, userId, { reason });

    logger.info(`用户 ${req.user.username} 申请加入团队 ${teamId}`);

    if (result.type === 'application') {
      // 需要审核
      return success(res, '申请已提交，请等待审核', {
        type: 'application',
        applicationId: result.data.id,
        status: result.data.status,
        appliedAt: result.data.applied_at
      });
    } else {
      // 直接加入
      return success(res, '成功加入团队', {
        type: 'member',
        memberId: result.data.id,
        joinedAt: result.data.joined_at
      });
    }

  } catch (err) {
    logger.error('申请加入团队失败:', err);
    return error(res, err.message || '申请失败', 400);
  }
});

/**
 * 获取我的申请记录
 * GET /api/teams/my-applications
 */
router.get('/my-applications', [
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
    .isIn(['pending', 'approved', 'rejected', 'cancelled'])
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

    const where = { user_id: userId };
    if (status) {
      where.status = status;
    }

    const { count, rows } = await TeamMember.findAndCountAll({
      where,
      include: [
        {
          model: Team,
          as: 'team',
          attributes: ['id', 'name', 'avatar_url', 'status']
        }
      ],
      order: [['applied_at', 'DESC']],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    });

    const applications = rows.map(member => ({
      id: member.id,
      team_id: member.team_id,
      user_id: member.user_id,
      role: member.role,
      status: member.status,
      applied_at: member.applied_at,
      joined_at: member.joined_at,
      rejection_reason: member.rejection_reason,
      rejected_at: member.rejected_at,
      team: member.team ? {
        id: member.team.id,
        name: member.team.name,
        avatar_url: member.team.avatar_url,
        status: member.team.status
      } : null,
      created_at: member.created_at,
      updated_at: member.updated_at
    }));

    const pagination = {
      page: parseInt(page),
      limit: parseInt(limit),
      total: count,
      pages: Math.ceil(count / parseInt(limit))
    };

    logger.info(`用户 ${req.user.username} 获取我的申请记录，共 ${count} 条记录`);
    return success(res, { applications, pagination }, '获取申请记录成功');

  } catch (err) {
    logger.error('获取我的申请记录失败:', err);
    return error(res, '获取申请记录失败', 500);
  }
});

/**
 * 处理团队申请（批准/拒绝）
 * POST /api/teams/applications/:memberId/process
 */
router.post('/applications/:memberId/process', [
  authenticateToken,
  param('memberId').isUUID().withMessage('申请ID格式错误'),
  body('action')
    .isIn(['approve', 'reject'])
    .withMessage('操作类型必须是approve或reject'),
  body('reason')
    .optional()
    .isLength({ max: 500 })
    .withMessage('处理原因不能超过500字符'),
  validateRequest
], async (req, res) => {
  try {
    const { memberId } = req.params;
    const { action, reason = '' } = req.body;
    const processorId = req.user.id;

    const member = await TeamMember.findByPk(memberId, {
      include: [
        { model: Team, as: 'team' },
        { model: User, as: 'user', attributes: ['id', 'username', 'profile'] }
      ]
    });

    if (!member) {
      return error(res, '申请记录不存在', 404);
    }

    // 检查权限：只有团队负责人可以处理申请
    if (member.team.creator_id !== processorId) {
      return error(res, '只有团队负责人可以处理申请', 403);
    }

    let result;
    if (action === 'approve') {
      result = await TeamMember.approve(memberId, processorId, reason);
    } else {
      result = await TeamMember.reject(memberId, processorId, reason);
    }

    logger.info(`用户 ${req.user.username} ${action === 'approve' ? '批准' : '拒绝'}了团队申请: ${member.team.name}`);

    return success(res, {
      memberId: result.id,
      status: result.status,
      processedAt: new Date(),
      processor: {
        id: req.user.id,
        username: req.user.username
      }
    }, `申请已${action === 'approve' ? '批准' : '拒绝'}`);

  } catch (err) {
    logger.error('处理团队申请失败:', err);
    return error(res, err.message || '处理失败', 400);
  }
});

/**
 * 获取团队的申请列表（团队负责人用）
 * GET /api/teams/:teamId/applications
 */
router.get('/:teamId/applications', [
  authenticateToken,
  param('teamId').isUUID().withMessage('团队ID格式错误'),
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
    .isIn(['pending', 'approved', 'rejected', 'cancelled'])
    .withMessage('状态值无效'),
  validateRequest
], async (req, res) => {
  try {
    const { teamId } = req.params;
    const { status, page = 1, limit = 20 } = req.query;
    const userId = req.user.id;

    // 检查权限：只有团队负责人可以查看申请列表
    const team = await Team.findByPk(teamId);
    if (!team) {
      return error(res, '团队不存在', 404);
    }

    if (team.creator_id !== userId) {
      return error(res, '只有团队负责人可以查看申请列表', 403);
    }

    const where = { team_id: teamId };
    if (status && ['pending', 'approved', 'rejected', 'cancelled'].includes(status)) {
      where.status = status;
    }

    const { count, rows } = await TeamMember.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'profile']
        }
      ],
      order: [['applied_at', 'DESC']],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    });

    const applications = rows.map(member => ({
      id: member.id,
      team_id: member.team_id,
      user_id: member.user_id,
      role: member.role,
      status: member.status,
      applied_at: member.applied_at,
      joined_at: member.joined_at,
      rejection_reason: member.rejection_reason,
      rejected_at: member.rejected_at,
      user: member.user ? {
        id: member.user.id,
        username: member.user.username,
        profile: member.user.profile
      } : null,
      created_at: member.created_at,
      updated_at: member.updated_at
    }));

    const pagination = {
      page: parseInt(page),
      limit: parseInt(limit),
      total: count,
      pages: Math.ceil(count / parseInt(limit))
    };

    logger.info(`用户 ${req.user.username} 获取团队申请列表，共 ${count} 条记录`);
    return success(res, { applications, pagination }, '获取团队申请列表成功');

  } catch (err) {
    logger.error('获取团队申请列表失败:', err);
    return error(res, '获取团队申请列表失败', 500);
  }
});

/**
 * 取消申请
 * DELETE /api/teams/applications/:memberId
 */
router.delete('/applications/:memberId', [
  authenticateToken,
  param('memberId').isUUID().withMessage('申请ID格式错误'),
  validateRequest
], async (req, res) => {
  try {
    const { memberId } = req.params;
    const userId = req.user.id;

    const member = await TeamMember.cancel(memberId, userId);

    logger.info(`用户 ${req.user.username} 取消了团队申请`);

    return success(res, {
      memberId: member.id,
      status: member.status,
      cancelledAt: new Date()
    }, '申请已取消');

  } catch (err) {
    logger.error('取消团队申请失败:', err);
    return error(res, err.message || '取消失败', 400);
  }
});

/**
 * 获取团队的待审核申请列表
 * GET /api/teams/:teamId/applications/pending
 */
router.get('/:teamId/applications/pending', [
  authenticateToken,
  param('teamId').isUUID().withMessage('团队ID格式错误'),
  validateRequest
], async (req, res) => {
  try {
    const { teamId } = req.params;
    const userId = req.user.id;
    const { TeamApplication } = require('../models');

    // 检查用户是否是团队管理员
    const teamMember = await TeamMember.findOne({
      where: {
        team_id: teamId,
        user_id: userId,
        role: 'admin'
      }
    });

    if (!teamMember) {
      return error(res, '您没有权限查看该团队的申请', 403);
    }

    // 获取待审核申请
    const applications = await TeamApplication.findAll({
      where: {
        team_id: teamId,
        status: 'pending'
      },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'email', 'profile']
        }
      ],
      order: [['applied_at', 'ASC']]
    });

    logger.info(`团队管理员 ${req.user.username} 查看团队 ${teamId} 的待审核申请，共 ${applications.length} 条`);
    return success(res, '获取待审核申请成功', { applications });

  } catch (err) {
    logger.error('获取待审核申请失败:', err);
    return error(res, '获取待审核申请失败', 500);
  }
});

/**
 * 批准申请
 * POST /api/teams/:teamId/applications/:applicationId/approve
 */
router.post('/:teamId/applications/:applicationId/approve', [
  authenticateToken,
  param('teamId').isUUID().withMessage('团队ID格式错误'),
  param('applicationId').isUUID().withMessage('申请ID格式错误'),
  body('note').optional().isLength({ max: 500 }).withMessage('审核备注不能超过500字符'),
  validateRequest
], async (req, res) => {
  try {
    const { teamId, applicationId } = req.params;
    const { note = '' } = req.body;
    const approverId = req.user.id;
    const { TeamApplication } = require('../models');

    // 检查用户是否是团队管理员
    const teamMember = await TeamMember.findOne({
      where: {
        team_id: teamId,
        user_id: approverId,
        role: 'admin'
      }
    });

    if (!teamMember) {
      return error(res, '您没有权限处理该申请', 403);
    }

    // 批准申请
    const approvedApplication = await TeamApplication.approve(applicationId, approverId, note);

    logger.info(`团队管理员 ${req.user.username} 批准了申请 ${applicationId}`);
    return success(res, '申请已批准', { application: approvedApplication });

  } catch (err) {
    logger.error('批准申请失败:', err);
    return error(res, err.message || '批准申请失败', 500);
  }
});

/**
 * 拒绝申请
 * POST /api/teams/:teamId/applications/:applicationId/reject
 */
router.post('/:teamId/applications/:applicationId/reject', [
  authenticateToken,
  param('teamId').isUUID().withMessage('团队ID格式错误'),
  param('applicationId').isUUID().withMessage('申请ID格式错误'),
  body('reason').optional().isLength({ max: 500 }).withMessage('拒绝理由不能超过500字符'),
  validateRequest
], async (req, res) => {
  try {
    const { teamId, applicationId } = req.params;
    const { reason = '' } = req.body;
    const rejecterId = req.user.id;
    const { TeamApplication } = require('../models');

    // 检查用户是否是团队管理员
    const teamMember = await TeamMember.findOne({
      where: {
        team_id: teamId,
        user_id: rejecterId,
        role: 'admin'
      }
    });

    if (!teamMember) {
      return error(res, '您没有权限处理该申请', 403);
    }

    // 拒绝申请
    const rejectedApplication = await TeamApplication.reject(applicationId, rejecterId, reason);

    logger.info(`团队管理员 ${req.user.username} 拒绝了申请 ${applicationId}`);
    return success(res, '申请已拒绝', { application: rejectedApplication });

  } catch (err) {
    logger.error('拒绝申请失败:', err);
    return error(res, err.message || '拒绝申请失败', 500);
  }
});

module.exports = router;