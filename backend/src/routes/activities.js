const express = require('express');
const { Op } = require('sequelize');
const router = express.Router();

const { authenticateToken, requirePermission } = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const { success, error } = require('../utils/response');
const logger = require('../utils/logger');
const Joi = require('joi');

// 获取活动列表
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { Activity, Team, User } = require('../models');
    
    // 获取查询参数
    const {
      page = 1,
      limit = 20,
      search = '',
      status = '',
      type = '',
      team = ''
    } = req.query;

    // 构建查询条件
    const where = {};
    
    if (search) {
      where[Op.or] = [
        { title: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } }
      ];
    }
    
    if (status) {
      where.status = status;
    }
    
    if (type) {
      where.type = type;
    }
    
    if (team) {
      where.team_id = team;
    }

    // 计算偏移量
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // 查询活动数据
    const { count, rows: activities } = await Activity.findAndCountAll({
      where,
      include: [
        {
          model: Team,
          as: 'team',
          attributes: ['id', 'name']
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'username', 'email']
        }
      ],
      order: [['start_time', 'DESC']],
      limit: parseInt(limit),
      offset: offset
    });

    // 格式化返回数据
    const formattedActivities = activities.map(activity => ({
      id: activity.id,
      title: activity.title,
      description: activity.description,
      type: activity.type,
      start_time: activity.start_time,
      end_time: activity.end_time,
      location: activity.location,
      max_participants: activity.max_participants,
      current_participants: activity.current_participants,
      status: activity.status,
      team_id: activity.team_id,
      team_name: activity.team?.name,
      creator_id: activity.creator_id,
      creator_name: activity.creator?.username,
      created_at: activity.created_at,
      updated_at: activity.updated_at
    }));

    const pagination = {
      page: parseInt(page),
      limit: parseInt(limit),
      total: count,
      pages: Math.ceil(count / parseInt(limit))
    };

    logger.info(`用户 ${req.user.username} 获取活动列表，共 ${count} 个活动`);
    return success(res, formattedActivities, '获取活动列表成功');

  } catch (err) {
    logger.error('获取活动列表失败:', err);
    return error(res, '获取活动列表失败，请检查数据库连接', 500);
  }
});

// 获取活动类型列表
router.get('/types', authenticateToken, async (req, res) => {
  try {
    const { ActivityType } = require('../models');
    
    // 从数据库获取活动类型
    const activityTypes = await ActivityType.findActive();
    
    // 转换为前端需要的格式
    const formattedTypes = activityTypes.map(type => ({
      value: type.id,
      label: type.name,
      description: type.description,
      isDefault: type.is_default
    }));

    logger.info(`用户 ${req.user.username} 获取活动类型列表，共 ${formattedTypes.length} 个类型`);
    return success(res, formattedTypes);

  } catch (err) {
    logger.error('获取活动类型失败:', err);
    
    // 提供有用的错误信息，指导用户解决问题
    if (err.message && (err.message.includes("doesn't exist") || err.message.includes('no such table'))) {
      return error(res, '活动类型表不存在，请执行数据库迁移：cd database && node migrate-activity-types.js', 500);
    }
    
    return error(res, '获取活动类型失败，请检查数据库连接', 500);
  }
});

// 创建活动类型验证模式
const createActivityTypeSchema = Joi.object({
  id: Joi.string()
    .pattern(/^[a-z_]+$/)
    .min(2)
    .max(50)
    .required()
    .messages({
      'string.pattern.base': '类型ID只能包含小写字母和下划线',
      'string.min': '类型ID至少2个字符',
      'string.max': '类型ID最多50个字符',
      'any.required': '类型ID不能为空'
    }),
  name: Joi.string()
    .min(2)
    .max(100)
    .required()
    .messages({
      'string.min': '类型名称至少2个字符',
      'string.max': '类型名称最多100个字符',
      'any.required': '类型名称不能为空'
    }),
  description: Joi.string()
    .max(500)
    .allow('')
    .messages({
      'string.max': '描述不能超过500个字符'
    })
});

// 添加活动类型
router.post('/types', authenticateToken, requirePermission('system:update'), validate(createActivityTypeSchema), async (req, res) => {
  try {
    const { id, name, description } = req.body;
    const { ActivityType } = require('../models');

    // 检查ID是否已存在
    const existingType = await ActivityType.findByPk(id);
    if (existingType) {
      return error(res, '类型ID已存在', 400);
    }

    // 创建新的活动类型
    const newType = await ActivityType.create({
      id,
      name,
      description: description || '',
      is_default: false,
      is_active: true,
      sort_order: 999 // 自定义类型排在最后
    });

    // 转换为前端需要的格式
    const formattedType = {
      value: newType.id,
      label: newType.name,
      description: newType.description,
      isDefault: newType.is_default
    };

    logger.info(`用户 ${req.user.username} 创建活动类型: ${name} (${id})`);
    return success(res, formattedType, '活动类型创建成功');

  } catch (err) {
    logger.error('创建活动类型失败，可能需要先执行数据库迁移:', err);
    
    // 处理数据库约束错误
    if (err.name === 'SequelizeValidationError') {
      const messages = err.errors.map(e => e.message);
      return error(res, messages.join(', '), 400);
    }
    
    // 如果是表不存在的错误，提供更友好的提示
    if (err.message && (err.message.includes("doesn't exist") || err.message.includes('no such table'))) {
      return error(res, '活动类型表不存在，请先执行数据库迁移', 500);
    }
    
    return error(res, '创建活动类型失败，请检查数据库连接或执行迁移', 500);
  }
});

// 更新活动类型
router.put('/types/:id', authenticateToken, requirePermission('system:update'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;
    const { ActivityType } = require('../models');

    // 查找要更新的活动类型
    const activityType = await ActivityType.findByPk(id);
    if (!activityType) {
      return error(res, '活动类型不存在', 404);
    }

    // 验证输入
    if (!name || name.trim().length < 2) {
      return error(res, '类型名称至少2个字符', 400);
    }

    if (name.length > 100) {
      return error(res, '类型名称最多100个字符', 400);
    }

    if (description && description.length > 500) {
      return error(res, '描述不能超过500个字符', 400);
    }

    // 更新活动类型
    await activityType.update({
      name: name.trim(),
      description: description ? description.trim() : ''
    });

    // 转换为前端需要的格式
    const formattedType = {
      value: activityType.id,
      label: activityType.name,
      description: activityType.description,
      isDefault: activityType.is_default
    };

    logger.info(`用户 ${req.user.username} 更新活动类型: ${name} (${id})`);
    return success(res, formattedType, '活动类型更新成功');

  } catch (err) {
    logger.error('更新活动类型失败:', err);
    return error(res, '更新活动类型失败', 500);
  }
});

// 删除活动类型
router.delete('/types/:id', authenticateToken, requirePermission('system:update'), async (req, res) => {
  try {
    const { id } = req.params;
    const { ActivityType } = require('../models');

    // 查找要删除的活动类型
    const activityType = await ActivityType.findByPk(id);
    if (!activityType) {
      return error(res, '活动类型不存在', 404);
    }

    // 删除活动类型（会触发beforeDestroy钩子检查是否有活动在使用）
    await activityType.destroy();

    logger.info(`用户 ${req.user.username} 删除活动类型: ${activityType.name} (${id})`);
    return success(res, null, '活动类型删除成功');

  } catch (err) {
    logger.error('删除活动类型失败，可能需要先执行数据库迁移:', err);
    
    // 处理模型钩子抛出的错误
    if (err.message.includes('正在被') && err.message.includes('个活动使用')) {
      return error(res, err.message, 400);
    }
    
    // 如果是表不存在的错误，提供更友好的提示
    if (err.message && (err.message.includes("doesn't exist") || err.message.includes('no such table'))) {
      return error(res, '活动类型表不存在，请先执行数据库迁移', 500);
    }
    
    return error(res, '删除活动类型失败，请检查数据库连接或执行迁移', 500);
  }
});

module.exports = router;