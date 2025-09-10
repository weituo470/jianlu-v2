const express = require('express');
const { Op } = require('sequelize');
const router = express.Router();

const { authenticateToken, requirePermission } = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const { success, error } = require('../utils/response');
const logger = require('../utils/logger');
const Joi = require('joi');
const { v4: uuidv4 } = require('uuid');

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

// 获取活动类型列表 - 必须放在 /:id 路由之前
router.get('/types', authenticateToken, async (req, res) => {
  try {
    const { ActivityType } = require('../models');
    
    // 从数据库获取活动类型
    const activityTypes = await ActivityType.findActive();
    
    // 转换为前端需要的格式
    const formattedTypes = activityTypes.map(type => ({
      value: type.id, // 使用id作为值（如travel, meeting）
      label: type.name, // 使用name作为显示标签（中文）
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

// 获取单个活动详情
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { Activity, Team, User, ActivityType } = require('../models');
    const { id } = req.params;

    const activity = await Activity.findByPk(id, {
      include: [
        {
          model: Team,
          as: 'team',
          attributes: ['id', 'name', 'description']
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'username', 'email']
        }
      ]
    });

    if (!activity) {
      return error(res, '活动不存在', 404);
    }

    // 格式化活动数据
    const formattedActivity = {
      id: activity.id,
      title: activity.title,
      description: activity.description,
      type: activity.type,
      team_id: activity.team_id,
      team: activity.team ? {
        id: activity.team.id,
        name: activity.team.name,
        description: activity.team.description
      } : null,
      creator: activity.creator ? {
        id: activity.creator.id,
        username: activity.creator.username,
        email: activity.creator.email
      } : null,
      start_time: activity.start_time,
      end_time: activity.end_time,
      location: activity.location,
      max_participants: activity.max_participants,
      current_participants: activity.current_participants,
      status: activity.status,
      // 费用相关字段
      total_cost: activity.total_cost || 0,
      company_ratio: activity.company_ratio || 0,
      cost_per_person: activity.cost_per_person || 0,
      payment_deadline: activity.payment_deadline,
      cost_description: activity.cost_description,
      created_at: activity.created_at,
      updated_at: activity.updated_at
    };

    logger.info(`用户 ${req.user.username} 获取活动详情: ${activity.title}`);
    return success(res, formattedActivity, '获取活动详情成功');

  } catch (err) {
    logger.error('获取活动详情失败:', err);
    return error(res, '获取活动详情失败，请检查数据库连接', 500);
  }
});

// 创建活动验证模式
const createActivitySchema = Joi.object({
  title: Joi.string()
    .min(2)
    .max(200)
    .required()
    .messages({
      'string.min': '活动标题至少2个字符',
      'string.max': '活动标题最多200个字符',
      'any.required': '活动标题不能为空'
    }),
  description: Joi.string()
    .max(1000)
    .allow('')
    .default('')
    .messages({
      'string.max': '活动描述不能超过1000个字符'
    }),
  type: Joi.string()
    .default('other')
    .messages({
      'string.base': '活动类型必须是字符串'
    }),
  team_id: Joi.string()
    .allow('')
    .default('')
    .messages({
      'string.base': '团队ID必须是字符串'
    }),
  start_time: Joi.date()
    .allow('', null)
    .optional()
    .messages({
      'date.base': '开始时间格式不正确'
    }),
  end_time: Joi.date()
    .allow('', null)
    .optional()
    .messages({
      'date.base': '结束时间格式不正确'
    }),
  location: Joi.string()
    .max(255)
    .allow('')
    .default('')
    .messages({
      'string.max': '活动地点不能超过255个字符'
    }),
  max_participants: Joi.number()
    .integer()
    .min(1)
    .allow(null)
    .default(null)
    .messages({
      'number.min': '最大参与人数至少为1'
    })
});

// 创建活动
router.post('/', authenticateToken, requirePermission('activity:create'), validate(createActivitySchema), async (req, res) => {
  try {
    const { title, description, type, team_id, start_time, end_time, location, max_participants } = req.body;
    const { Activity, Team } = require('../models');

    // 如果没有指定团队，使用用户的第一个团队
    let finalTeamId = team_id;
    if (!team_id) {
      // 获取用户所属的第一个团队
      const userTeams = await Team.findAll({
        limit: 1,
        order: [['created_at', 'ASC']]
      });
      
      if (userTeams.length > 0) {
        finalTeamId = userTeams[0].id;
      } else {
        return error(res, '系统中没有可用的团队，请先创建团队', 400);
      }
    }
    
    // 验证团队是否存在
    const team = await Team.findByPk(finalTeamId);
    if (!team) {
      return error(res, '指定的团队不存在', 400);
    }

    // 创建活动
    const activity = await Activity.create({
      id: uuidv4(),
      title,
      description: description || '',
      type: type || 'other',
      team_id: finalTeamId,
      start_time: start_time ? new Date(start_time) : null,
      end_time: end_time ? new Date(end_time) : null,
      location: location || null,
      max_participants: max_participants || null,
      current_participants: 0,
      status: 'draft',
      creator_id: req.user.id
    });

    // 获取完整的活动信息（包含关联数据）
    const fullActivity = await Activity.findByPk(activity.id, {
      include: [
        {
          model: Team,
          as: 'team',
          attributes: ['id', 'name']
        },
        {
          model: require('../models').User,
          as: 'creator',
          attributes: ['id', 'username', 'email']
        }
      ]
    });

    // 格式化返回数据
    const formattedActivity = {
      id: fullActivity.id,
      title: fullActivity.title,
      description: fullActivity.description,
      type: fullActivity.type,
      start_time: fullActivity.start_time,
      end_time: fullActivity.end_time,
      location: fullActivity.location,
      max_participants: fullActivity.max_participants,
      current_participants: fullActivity.current_participants,
      status: fullActivity.status,
      team_id: fullActivity.team_id,
      team_name: fullActivity.team?.name,
      creator_id: fullActivity.creator_id,
      creator_name: fullActivity.creator?.username,
      created_at: fullActivity.created_at,
      updated_at: fullActivity.updated_at
    };

    logger.info(`用户 ${req.user.username} 创建活动: ${title}`);
    return success(res, formattedActivity, '活动创建成功');

  } catch (err) {
    logger.error('创建活动失败:', err);
    
    // 处理数据库约束错误
    if (err.name === 'SequelizeValidationError') {
      const messages = err.errors.map(e => e.message);
      return error(res, messages.join(', '), 400);
    }
    
    return error(res, '创建活动失败，请检查输入数据', 500);
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

    // 检查名称是否已存在
    const existingName = await ActivityType.findOne({ where: { name } });
    if (existingName) {
      return error(res, '类型名称已存在', 400);
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
      value: newType.name, // 改为使用name
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
      value: activityType.name, // 改为使用name
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

// 更新活动
router.put('/:id', authenticateToken, requirePermission('activity:update'), validate(createActivitySchema), async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, type, team_id, start_time, end_time, location, max_participants } = req.body;
    const { Activity, Team, User } = require('../models');

    // 查找要更新的活动
    const activity = await Activity.findByPk(id);
    if (!activity) {
      return error(res, '活动不存在', 404);
    }

    // 检查权限：只有创建者或管理员可以编辑
    if (activity.creator_id !== req.user.id && !req.user.permissions.includes('activity:update')) {
      return error(res, '权限不足，无法编辑此活动', 403);
    }

    // 验证团队是否存在
    const team = await Team.findByPk(team_id);
    if (!team) {
      return error(res, '指定的团队不存在', 400);
    }

    // 更新活动
    await activity.update({
      title,
      description: description || '',
      type,
      team_id,
      start_time: new Date(start_time),
      end_time: new Date(end_time),
      location: location || null,
      max_participants: max_participants || null
    });

    // 获取更新后的完整活动信息
    const updatedActivity = await Activity.findByPk(id, {
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
      ]
    });

    // 格式化返回数据
    const formattedActivity = {
      id: updatedActivity.id,
      title: updatedActivity.title,
      description: updatedActivity.description,
      type: updatedActivity.type,
      start_time: updatedActivity.start_time,
      end_time: updatedActivity.end_time,
      location: updatedActivity.location,
      max_participants: updatedActivity.max_participants,
      current_participants: updatedActivity.current_participants,
      status: updatedActivity.status,
      team_id: updatedActivity.team_id,
      team_name: updatedActivity.team?.name,
      creator_id: updatedActivity.creator_id,
      creator_name: updatedActivity.creator?.username,
      created_at: updatedActivity.created_at,
      updated_at: updatedActivity.updated_at
    };

    logger.info(`用户 ${req.user.username} 更新活动: ${title} (${id})`);
    return success(res, formattedActivity, '活动更新成功');

  } catch (err) {
    logger.error('更新活动失败:', err);
    
    // 处理数据库约束错误
    if (err.name === 'SequelizeValidationError') {
      const messages = err.errors.map(e => e.message);
      return error(res, messages.join(', '), 400);
    }
    
    return error(res, '更新活动失败，请检查输入数据', 500);
  }
});

// 删除活动
router.delete('/:id', authenticateToken, requirePermission('activity:delete'), async (req, res) => {
  try {
    const { id } = req.params;
    const { Activity } = require('../models');

    // 查找要删除的活动
    const activity = await Activity.findByPk(id);
    if (!activity) {
      return error(res, '活动不存在', 404);
    }

    // 检查权限：只有创建者或管理员可以删除
    if (activity.creator_id !== req.user.id && !req.user.permissions.includes('activity:delete')) {
      return error(res, '权限不足，无法删除此活动', 403);
    }

    // 删除活动
    await activity.destroy();

    logger.info(`用户 ${req.user.username} 删除活动: ${activity.title} (${id})`);
    return success(res, null, '活动删除成功');

  } catch (err) {
    logger.error('删除活动失败:', err);
    return error(res, '删除活动失败，请稍后重试', 500);
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

// ==================== 费用管理相关接口 ====================

// 创建带费用的活动
router.post('/with-cost', authenticateToken, async (req, res) => {
  try {
    const { Activity } = require('../models');
    
    const {
      title,
      description,
      type,
      team_id,
      start_time,
      end_time,
      location,
      max_participants,
      total_cost,
      company_ratio,
      payment_deadline,
      cost_description
    } = req.body;

    // 验证必填字段
    if (!title || !type || !team_id) {
      return error(res, '活动标题、类型和团队ID不能为空', 400);
    }

    // 验证费用信息
    if (total_cost && total_cost > 0) {
      if (!company_ratio || company_ratio < 0 || company_ratio > 100) {
        return error(res, '公司承担比例必须在0-100之间', 400);
      }
    }

    const activityData = {
      title: title.trim(),
      description: description ? description.trim() : '',
      type,
      team_id,
      start_time: start_time || null,
      end_time: end_time || null,
      location: location ? location.trim() : '',
      max_participants: max_participants || null,
      total_cost: total_cost || 0,
      company_ratio: company_ratio || 0,
      payment_deadline: payment_deadline || null,
      cost_description: cost_description ? cost_description.trim() : '',
      creator_id: req.user.id,
      status: 'draft'
    };

    const activity = await Activity.createWithCost(activityData);
    const costs = activity.calculateCosts();

    return success(res, {
      activity,
      costs
    }, '带费用的活动创建成功', 201);

  } catch (err) {
    logger.error('创建带费用活动失败:', err);
    return error(res, '创建活动失败: ' + err.message, 500);
  }
});

// 更新活动费用信息
router.put('/:id/cost', authenticateToken, async (req, res) => {
  try {
    const { Activity, ActivityParticipant } = require('../models');
    const { id } = req.params;
    const {
      total_cost,
      company_ratio,
      payment_deadline,
      cost_description
    } = req.body;

    const activity = await Activity.findByPk(id);
    if (!activity) {
      return error(res, '活动不存在', 404);
    }

    // 验证费用信息
    if (total_cost && total_cost > 0) {
      if (!company_ratio || company_ratio < 0 || company_ratio > 100) {
        return error(res, '公司承担比例必须在0-100之间', 400);
      }
    }

    // 更新活动费用信息
    await activity.update({
      total_cost: total_cost || 0,
      company_ratio: company_ratio || 0,
      payment_deadline: payment_deadline || null,
      cost_description: cost_description || ''
    });

    // 重新计算每人费用
    const costs = await activity.updateCostPerPerson();

    // 更新所有参与者的应付金额
    if (costs.costPerPerson > 0) {
      await ActivityParticipant.update(
        { payment_amount: costs.costPerPerson },
        { where: { activity_id: id } }
      );
    }

    return success(res, {
      activity,
      costs
    }, '活动费用信息更新成功');

  } catch (err) {
    logger.error('更新活动费用失败:', err);
    return error(res, '更新费用信息失败: ' + err.message, 500);
  }
});

// 获取活动费用详情
router.get('/:id/cost-details', authenticateToken, async (req, res) => {
  try {
    const { Activity } = require('../models');
    const { id } = req.params;

    const activity = await Activity.findByPk(id);
    if (!activity) {
      return error(res, '活动不存在', 404);
    }

    const costs = activity.calculateCosts();

    return success(res, {
      activity: {
        id: activity.id,
        title: activity.title,
        total_cost: activity.total_cost,
        company_ratio: activity.company_ratio,
        cost_per_person: activity.cost_per_person,
        payment_deadline: activity.payment_deadline,
        cost_description: activity.cost_description,
        current_participants: activity.current_participants
      },
      costs
    }, '获取活动费用详情成功');

  } catch (err) {
    logger.error('获取活动费用详情失败:', err);
    return error(res, '获取费用详情失败: ' + err.message, 500);
  }
});

// 获取活动费用统计
router.get('/:id/cost-summary', authenticateToken, async (req, res) => {
  try {
    const { Activity, ActivityParticipant } = require('../models');
    const { id } = req.params;

    const activity = await Activity.findByPk(id);
    if (!activity) {
      return error(res, '活动不存在', 404);
    }

    const costs = activity.calculateCosts();
    const paymentSummary = await ActivityParticipant.getPaymentSummary(id);

    return success(res, {
      activity: {
        id: activity.id,
        title: activity.title,
        total_cost: activity.total_cost,
        company_ratio: activity.company_ratio,
        payment_deadline: activity.payment_deadline
      },
      costs,
      payment: paymentSummary.summary
    }, '获取活动费用统计成功');

  } catch (err) {
    logger.error('获取活动费用统计失败:', err);
    return error(res, '获取费用统计失败: ' + err.message, 500);
  }
});

// 获取活动支付状态列表
router.get('/:id/payment-status', authenticateToken, async (req, res) => {
  try {
    const { Activity, ActivityParticipant } = require('../models');
    const { id } = req.params;

    const activity = await Activity.findByPk(id);
    if (!activity) {
      return error(res, '活动不存在', 404);
    }

    const paymentData = await ActivityParticipant.getPaymentSummary(id);

    return success(res, {
      activity: {
        id: activity.id,
        title: activity.title,
        total_cost: activity.total_cost,
        company_ratio: activity.company_ratio,
        cost_per_person: activity.cost_per_person
      },
      summary: paymentData.summary,
      participants: paymentData.participants
    }, '获取支付状态列表成功');

  } catch (err) {
    logger.error('获取支付状态列表失败:', err);
    return error(res, '获取支付状态失败: ' + err.message, 500);
  }
});

// 更新参与者支付状态
router.put('/participant/:participantId/payment', authenticateToken, async (req, res) => {
  try {
    const { ActivityParticipant } = require('../models');
    const { participantId } = req.params;
    const { payment_status, payment_method, payment_note } = req.body;

    if (!['unpaid', 'paid', 'exempted'].includes(payment_status)) {
      return error(res, '支付状态参数无效', 400);
    }

    const participant = await ActivityParticipant.findByPk(participantId);
    if (!participant) {
      return error(res, '参与记录不存在', 404);
    }

    await participant.updatePaymentStatus({
      payment_status,
      payment_method,
      payment_note
    });

    return success(res, participant, '支付状态更新成功');

  } catch (err) {
    logger.error('更新支付状态失败:', err);
    return error(res, '更新支付状态失败: ' + err.message, 500);
  }
});

// ==================== 聚餐活动专用接口 ====================

// 创建聚餐活动验证模式
const createDinnerPartySchema = Joi.object({
  title: Joi.string()
    .min(2)
    .max(200)
    .required()
    .messages({
      'string.min': '活动标题至少2个字符',
      'string.max': '活动标题最多200个字符',
      'any.required': '活动标题不能为空'
    }),
  description: Joi.string()
    .max(1000)
    .allow('')
    .default('')
    .messages({
      'string.max': '活动描述不能超过1000字符'
    }),
  team_id: Joi.string()
    .required()
    .messages({
      'string.base': '团队ID必须是字符串',
      'any.required': '聚餐活动必须指定团队'
    }),
  start_time: Joi.date()
    .required()
    .messages({
      'date.base': '开始时间格式不正确',
      'any.required': '开始时间不能为空'
    }),
  end_time: Joi.date()
    .required()
    .min(Joi.ref('start_time'))
    .messages({
      'date.base': '结束时间格式不正确',
      'date.min': '结束时间必须晚于开始时间',
      'any.required': '结束时间不能为空'
    }),
  location: Joi.string()
    .max(255)
    .required()
    .messages({
      'string.max': '活动地点不能超过255字符',
      'any.required': '活动地点不能为空'
    }),
  min_participants: Joi.number()
    .integer()
    .min(1)
    .required()
    .messages({
      'number.min': '最少参与人数至少为1',
      'any.required': '最少参与人数不能为空'
    }),
  max_participants: Joi.number()
    .integer()
    .min(Joi.ref('min_participants'))
    .required()
    .messages({
      'number.min': '最多参与人数不能少于最少参与人数',
      'any.required': '最多参与人数不能为空'
    }),
  company_budget: Joi.number()
    .precision(2)
    .min(0)
    .required()
    .messages({
      'number.min': '公司预算不能为负数',
      'any.required': '公司预算不能为空'
    }),
  total_cost: Joi.number()
    .precision(2)
    .min(0)
    .allow(null)
    .messages({
      'number.min': '预计总费用不能为负数'
    }),
  payment_deadline: Joi.date()
    .min(Joi.ref('start_time'))
    .max(Joi.ref('end_time'))
    .allow(null)
    .messages({
      'date.min': '支付截止时间不能早于活动开始时间',
      'date.max': '支付截止时间不能晚于活动结束时间'
    }),
  cost_description: Joi.string()
    .max(500)
    .allow('')
    .messages({
      'string.max': '费用说明不能超过500字符'
    }),
  auto_cancel_threshold: Joi.string()
    .valid('min_participants', 'max_participants', 'both')
    .default('both')
    .messages({
      'any.only': '自动取消条件必须是: min_participants, max_participants, both'
    })
});

// 创建聚餐活动
router.post('/dinner-party', authenticateToken, requirePermission('activity:create'), validate(createDinnerPartySchema), async (req, res) => {
  try {
    const { Activity } = require('../models');
    
    const {
      title,
      description,
      team_id,
      start_time,
      end_time,
      location,
      min_participants,
      max_participants,
      company_budget,
      total_cost,
      payment_deadline,
      cost_description,
      auto_cancel_threshold
    } = req.body;

    // 验证团队是否存在
    const team = await require('../models').Team.findByPk(team_id);
    if (!team) {
      return error(res, '指定的团队不存在', 400);
    }

    // 验证用户是否属于该团队
    const userTeamMember = await require('../models').TeamMember.findOne({
      where: {
        user_id: req.user.id,
        team_id: team_id
      }
    });

    if (!userTeamMember && !req.user.permissions.includes('activity:create')) {
      return error(res, '您不是该团队成员，无法创建聚餐活动', 403);
    }

    // 创建聚餐活动数据
    const dinnerPartyData = {
      id: require('uuid').v4(),
      title: title.trim(),
      description: description ? description.trim() : '',
      type: 'social',
      team_id,
      start_time: new Date(start_time),
      end_time: new Date(end_time),
      location: location.trim(),
      min_participants,
      max_participants,
      company_budget,
      total_cost: total_cost || 0,
      company_ratio: 100, // 聚餐活动默认公司100%承担预算内费用
      payment_deadline: payment_deadline ? new Date(payment_deadline) : null,
      cost_description: cost_description ? cost_description.trim() : '',
      creator_id: req.user.id,
      status: 'draft',
      activity_special_type: 'dinner_party',
      auto_cancel_threshold
    };

    // 创建聚餐活动
    const activity = await Activity.createDinnerParty(dinnerPartyData);

    // 计算费用信息
    const costs = await activity.calculateDinnerPartyCosts();

    logger.info(`用户 ${req.user.username} 创建聚餐活动: ${title}`);

    return success(res, {
      activity: {
        id: activity.id,
        title: activity.title,
        description: activity.description,
        type: activity.type,
        start_time: activity.start_time,
        end_time: activity.end_time,
        location: activity.location,
        min_participants: activity.min_participants,
        max_participants: activity.max_participants,
        current_participants: activity.current_participants,
        status: activity.status,
        team_id: activity.team_id,
        company_budget: activity.company_budget,
        total_cost: activity.total_cost,
        activity_special_type: activity.activity_special_type,
        created_at: activity.created_at
      },
      costs,
      message: '聚餐活动创建成功，请设置活动详情后发布'
    }, '聚餐活动创建成功', 201);

  } catch (err) {
    logger.error('创建聚餐活动失败:', err);
    
    if (err.name === 'SequelizeValidationError') {
      const messages = err.errors.map(e => e.message);
      return error(res, messages.join(', '), 400);
    }
    
    return error(res, '创建聚餐活动失败: ' + err.message, 500);
  }
});

// 获取聚餐活动详情
router.get('/dinner-party/:id', authenticateToken, async (req, res) => {
  try {
    const { Activity } = require('../models');
    const { id } = req.params;

    const activity = await Activity.findByPk(id, {
      include: [
        {
          model: require('../models').Team,
          as: 'team',
          attributes: ['id', 'name', 'description']
        },
        {
          model: require('../models').User,
          as: 'creator',
          attributes: ['id', 'username', 'email']
        }
      ]
    });

    if (!activity) {
      return error(res, '活动不存在', 404);
    }

    if (activity.activity_special_type !== 'dinner_party') {
      return error(res, '不是聚餐活动', 400);
    }

    // 计算聚餐费用
    const costs = await activity.calculateDinnerPartyCosts();

    // 检查是否应该取消
    const cancelCheck = await activity.shouldCancelDinnerParty();

    // 检查是否可以参与
    const joinCheck = await activity.canJoinDinnerParty();

    logger.info(`用户 ${req.user.username} 查看聚餐活动: ${activity.title}`);

    return success(res, {
      activity: {
        id: activity.id,
        title: activity.title,
        description: activity.description,
        type: activity.type,
        team: activity.team,
        creator: activity.creator,
        start_time: activity.start_time,
        end_time: activity.end_time,
        location: activity.location,
        min_participants: activity.min_participants,
        max_participants: activity.max_participants,
        current_participants: activity.current_participants,
        status: activity.status,
        company_budget: activity.company_budget,
        total_cost: activity.total_cost,
        payment_deadline: activity.payment_deadline,
        cost_description: activity.cost_description,
        activity_special_type: activity.activity_special_type,
        auto_cancel_threshold: activity.auto_cancel_threshold,
        created_at: activity.created_at,
        updated_at: activity.updated_at
      },
      costs,
      cancelCheck,
      joinCheck
    }, '获取聚餐活动详情成功');

  } catch (err) {
    logger.error('获取聚餐活动详情失败:', err);
    return error(res, '获取活动详情失败: ' + err.message, 500);
  }
});

// 检查并处理聚餐活动自动取消
router.post('/dinner-party/:id/check-cancel', authenticateToken, requirePermission('activity:update'), async (req, res) => {
  try {
    const { Activity } = require('../models');
    const { id } = req.params;

    const activity = await Activity.findByPk(id);
    if (!activity) {
      return error(res, '活动不存在', 404);
    }

    if (activity.activity_special_type !== 'dinner_party') {
      return error(res, '不是聚餐活动', 400);
    }

    // 检查是否应该取消
    const cancelCheck = await activity.shouldCancelDinnerParty();

    if (cancelCheck.shouldCancel) {
      // 取消活动
      await activity.update({
        status: 'cancelled'
      });

      logger.info(`聚餐活动自动取消: ${activity.title} - ${cancelCheck.reason}`);

      return success(res, {
        cancelled: true,
        reason: cancelCheck.reason,
        activity: {
          id: activity.id,
          title: activity.title,
          status: activity.status
        }
      }, `活动已自动取消: ${cancelCheck.reason}`);
    }

    return success(res, {
      cancelled: false,
      reason: cancelCheck.reason || '活动正常进行中'
    }, '活动无需取消');

  } catch (err) {
    logger.error('检查聚餐活动取消状态失败:', err);
    return error(res, '检查失败: ' + err.message, 500);
  }
});

// 获取用户可参与的聚餐活动列表
router.get('/dinner-party/available', authenticateToken, async (req, res) => {
  try {
    const { Activity, TeamMember } = require('../models');
    
    // 获取用户所属的团队
    const userTeams = await TeamMember.findAll({
      where: { user_id: req.user.id },
      attributes: ['team_id']
    });

    const teamIds = userTeams.map(tm => tm.team_id);

    if (teamIds.length === 0) {
      return success(res, {
        activities: [],
        message: '您还没有加入任何团队'
      }, '获取可用聚餐活动成功');
    }

    // 查找用户团队中的可用聚餐活动
    const activities = await Activity.findAll({
      where: {
        team_id: { [Op.in]: teamIds },
        activity_special_type: 'dinner_party',
        status: 'published'
      },
      include: [
        {
          model: require('../models').Team,
          as: 'team',
          attributes: ['id', 'name']
        },
        {
          model: require('../models').User,
          as: 'creator',
          attributes: ['id', 'username']
        }
      ],
      order: [['start_time', 'ASC']]
    });

    // 为每个活动计算费用和状态
    const activitiesWithDetails = await Promise.all(
      activities.map(async activity => {
        const costs = await activity.calculateDinnerPartyCosts();
        const joinCheck = await activity.canJoinDinnerParty();
        
        return {
          id: activity.id,
          title: activity.title,
          description: activity.description,
          start_time: activity.start_time,
          end_time: activity.end_time,
          location: activity.location,
          min_participants: activity.min_participants,
          max_participants: activity.max_participants,
          current_participants: activity.current_participants,
          status: activity.status,
          team: activity.team,
          creator: activity.creator,
          company_budget: activity.company_budget,
          total_cost: activity.total_cost,
          costs,
          joinCheck,
          created_at: activity.created_at
        };
      })
    );

    logger.info(`用户 ${req.user.username} 获取可用聚餐活动列表，共 ${activitiesWithDetails.length} 个活动`);

    return success(res, {
      activities: activitiesWithDetails
    }, '获取可用聚餐活动成功');

  } catch (err) {
    logger.error('获取可用聚餐活动失败:', err);
    return error(res, '获取失败: ' + err.message, 500);
  }
});

module.exports = router;