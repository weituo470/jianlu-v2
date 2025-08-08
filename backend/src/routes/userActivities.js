const express = require('express');
const { Op, fn, col } = require('sequelize');
const { UserActivity, User } = require('../models');
const { success, successWithPagination, error, notFound } = require('../utils/response');
const { validate, paginationSchema, idParamSchema } = require('../middleware/validation');
const { authenticateToken, requirePermission } = require('../middleware/auth');

const router = express.Router();

// 所有路由都需要认证
router.use(authenticateToken);

/**
 * 获取用户活动记录列表
 * GET /api/user-activities
 */
router.get('/',
  requirePermission('user:read'),
  validate(paginationSchema, 'query'),
  async (req, res, next) => {
    try {
      const { page, limit, userId, actionType, startDate, endDate } = req.query;
      const offset = (page - 1) * limit;

      // 构建查询条件
      const whereConditions = {};

      if (userId) {
        whereConditions.user_id = userId;
      }

      if (actionType) {
        whereConditions.action_type = actionType;
      }

      if (startDate && endDate) {
        whereConditions.created_at = {
          [Op.between]: [new Date(startDate), new Date(endDate)]
        };
      }

      // 查询活动记录
      const { count, rows: activities } = await UserActivity.findAndCountAll({
        where: whereConditions,
        limit,
        offset,
        order: [['created_at', 'DESC']]
      });

      successWithPagination(res, activities, {
        page,
        limit,
        total: count
      }, '获取用户活动记录成功');

    } catch (err) {
      next(err);
    }
  }
);

/**
 * 获取指定用户的活动记录
 * GET /api/user-activities/user/:userId
 */
router.get('/user/:userId',
  requirePermission('user:read'),
  validate(idParamSchema, 'params'),
  validate(paginationSchema, 'query'),
  async (req, res, next) => {
    try {
      const { userId } = req.params;
      const { page = 1, limit = 20, actionType } = req.query;

      // 检查用户是否存在
      const user = await User.findByPk(userId);
      if (!user) {
        return notFound(res, '用户不存在');
      }

      // 获取用户活动记录
      const result = await UserActivity.getUserActivities(userId, {
        page: parseInt(page),
        limit: parseInt(limit),
        actionType
      });

      successWithPagination(res, result.rows, {
        page: parseInt(page),
        limit: parseInt(limit),
        total: result.count
      }, '获取用户活动记录成功');

    } catch (err) {
      next(err);
    }
  }
);

/**
 * 记录用户活动
 * POST /api/user-activities
 */
router.post('/',
  requirePermission('user:update'),
  async (req, res, next) => {
    try {
      const {
        userId,
        actionType,
        description,
        targetType,
        targetId,
        metadata
      } = req.body;

      // 验证必填字段
      if (!userId || !actionType || !description) {
        return error(res, '缺少必填字段', 400);
      }

      // 检查用户是否存在
      const user = await User.findByPk(userId);
      if (!user) {
        return notFound(res, '用户不存在');
      }

      // 记录活动
      const activity = await UserActivity.logActivity({
        userId,
        adminId: req.user.id,
        actionType,
        description,
        targetType,
        targetId,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        metadata
      });

      if (activity) {
        success(res, activity, '活动记录创建成功', 201);
      } else {
        error(res, '活动记录创建失败', 500);
      }

    } catch (err) {
      next(err);
    }
  }
);

/**
 * 获取活动类型统计
 * GET /api/user-activities/stats
 */
router.get('/stats',
  requirePermission('user:read'),
  async (req, res, next) => {
    try {
      const { userId, days = 30 } = req.query;
      
      const whereConditions = {};
      if (userId) {
        whereConditions.user_id = userId;
      }

      // 最近N天的数据
      whereConditions.created_at = {
        [Op.gte]: new Date(Date.now() - days * 24 * 60 * 60 * 1000)
      };

      // 按活动类型统计
      const stats = await UserActivity.findAll({
        where: whereConditions,
        attributes: [
          'action_type',
          [fn('COUNT', col('id')), 'count']
        ],
        group: ['action_type'],
        order: [[fn('COUNT', col('id')), 'DESC']]
      });

      // 按日期统计
      const dailyStats = await UserActivity.findAll({
        where: whereConditions,
        attributes: [
          [fn('DATE', col('created_at')), 'date'],
          [fn('COUNT', col('id')), 'count']
        ],
        group: [fn('DATE', col('created_at'))],
        order: [[fn('DATE', col('created_at')), 'ASC']]
      });

      success(res, {
        actionTypeStats: stats,
        dailyStats,
        period: `${days}天`
      }, '获取活动统计成功');

    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;