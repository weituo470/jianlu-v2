const express = require('express');
const { Op } = require('sequelize');
const router = express.Router();

const { authenticateToken, requirePermission } = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const { success, error } = require('../utils/response');
const logger = require('../utils/logger');
const Joi = require('joi');
const { v4: uuidv4 } = require('uuid');

// 检查活动标题是否重复
router.get('/check-title-duplicate', authenticateToken, async (req, res) => {
  try {
    const { Activity } = require('../models');
    const { search, exclude_id } = req.query;

    if (!search || search.trim() === '') {
      return success(res, { exists: false }, '标题为空，无需检查');
    }

    // 构建查询条件
    const where = { title: search.trim() };

    // 如果提供了排除ID，则排除该活动
    if (exclude_id) {
      where.id = { [Op.ne]: exclude_id };
    }

    // 查询是否存在重复标题
    const existingActivity = await Activity.findOne({ where });

    logger.info(`用户 ${req.user.username} 检查活动标题重复: "${search.trim()}" - ${existingActivity ? '存在重复' : '无重复'}`);

    return success(res, {
      exists: !!existingActivity,
      activityId: existingActivity?.id || null
    }, existingActivity ? '发现重复标题' : '标题可用');

  } catch (err) {
    logger.error('检查活动标题重复失败:', err);
    return error(res, '检查标题重复失败', 500);
  }
});

// 获取活动列表
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { Activity, Team, User } = require('../models');
    
    // 获取查询参数
    const {
      page = 1,
      limit = 30, // 默认每页30条
      search = '',
      status = '',
      type = '',
      team = '',
      sort = 'sequence_number',  // 默认按序号排序
      order = 'DESC'             // 默认倒序
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

    // 验证排序字段和顺序
    const allowedSortFields = ['sequence_number', 'created_at', 'start_time', 'title'];
    const allowedOrder = ['ASC', 'DESC'];
    
    const sortField = allowedSortFields.includes(sort) ? sort : 'sequence_number';
    const sortOrder = allowedOrder.includes(order.toUpperCase()) ? order.toUpperCase() : 'DESC';

    // 计算偏移量
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // 查询活动数据，按指定字段和顺序排列
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
      order: [[sortField, sortOrder]], // 按指定字段和顺序排列
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
      team_name: activity.team?.name || (activity.team_id ? null : '非团队活动'),
      creator_id: activity.creator_id,
      creator_name: activity.creator?.username,
      created_at: activity.created_at,
      updated_at: activity.updated_at,
      sequence_number: activity.sequence_number // 返回序号字段
    }));

    const pagination = {
      page: parseInt(page),
      limit: parseInt(limit),
      total: count,
      pages: Math.ceil(count / parseInt(limit))
    };

    logger.info(`用户 ${req.user.username} 获取活动列表，共 ${count} 个活动，排序字段: ${sortField}, 排序顺序: ${sortOrder}`);
    // 使用分页响应格式返回数据
    return success(res, { activities: formattedActivities, pagination }, '获取活动列表成功');

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
    const { Activity, Team, User, ActivityType, ActivityParticipant } = require('../models');
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

    // 实时计算当前参与者数量（包括所有状态的参与者）
    const participantCount = await ActivityParticipant.count({
      where: { activity_id: id }
    });

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
      min_participants: activity.min_participants,
      require_approval: activity.require_approval,
      current_participants: participantCount,
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
    }),
  min_participants: Joi.number()
    .integer()
    .min(1)
    .allow(null)
    .default(3)
    .messages({
      'number.min': '最小参与人数至少为1'
    }),
  require_approval: Joi.boolean()
    .default(false)
    .messages({
      'boolean.base': '审批设置必须是布尔值'
    })
});

// 创建活动
router.post('/', authenticateToken, requirePermission('activity:create'), validate(createActivitySchema), async (req, res) => {
  try {
    const { title, description, type, team_id, start_time, end_time, location, max_participants, min_participants, require_approval } = req.body;
    const { Activity, Team } = require('../models');

    // 检查活动标题是否重复
    const existingActivity = await Activity.findOne({
      where: { title: title.trim() }
    });

    if (existingActivity) {
      return error(res, '活动标题已存在，请使用不同的标题', 400);
    }

    // 处理活动类型和团队的特殊值
    let finalType = type || 'other';
    if (type === 'unset') {
      finalType = 'other'; // 默认为其他类型
    }

    let finalTeamId = null; // 默认为非团队活动
    if (team_id && team_id !== 'none') {
      // 如果指定了团队，验证团队是否存在
      const team = await Team.findByPk(team_id);
      if (!team) {
        return error(res, '指定的团队不存在', 400);
      }
      finalTeamId = team_id;
    }
    // 如果team_id为空、null或"none"，则保持为null（非团队活动）

    // 获取当前最大的序号并加1
    const maxSequence = await Activity.max('sequence_number') || 0;
    const nextSequence = maxSequence + 1;

    // 创建活动
    const activity = await Activity.create({
      id: uuidv4(),
      title,
      description: description || '',
      type: finalType,
      team_id: finalTeamId,
      start_time: start_time ? new Date(start_time) : null,
      end_time: end_time ? new Date(end_time) : null,
      location: location || null,
      max_participants: max_participants || null,
      min_participants: min_participants || 3,
      require_approval: require_approval || false,
      current_participants: 0,
      status: 'draft',
      creator_id: req.user.id,
      sequence_number: nextSequence // 添加序号字段
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
      min_participants: fullActivity.min_participants,
      require_approval: fullActivity.require_approval,
      current_participants: fullActivity.current_participants,
      status: fullActivity.status,
      team_id: fullActivity.team_id,
      team_name: fullActivity.team?.name || (fullActivity.team_id ? null : '非团队活动'),
      creator_id: fullActivity.creator_id,
      creator_name: fullActivity.creator?.username,
      created_at: fullActivity.created_at,
      updated_at: fullActivity.updated_at,
      sequence_number: fullActivity.sequence_number // 返回序号字段
    };

    logger.info(`用户 ${req.user.username} 创建活动: ${title} (序号: ${nextSequence})`);
    return success(res, formattedActivity, '活动创建成功');

  } catch (err) {
    logger.error('创建活动失败:', err);

    // 处理数据库约束错误
    if (err.name === 'SequelizeValidationError') {
      const fieldErrors = err.errors.map(e => {
        const fieldName = e.path;
        let fieldLabel = '';

        // 将字段名转换为用户友好的标签
        switch (fieldName) {
          case 'title': fieldLabel = '活动标题'; break;
          case 'description': fieldLabel = '活动描述'; break;
          case 'type': fieldLabel = '活动类型'; break;
          case 'team_id': fieldLabel = '所属团队'; break;
          case 'start_time': fieldLabel = '开始时间'; break;
          case 'end_time': fieldLabel = '结束时间'; break;
          case 'location': fieldLabel = '活动地点'; break;
          case 'max_participants': fieldLabel = '最大参与人数'; break;
          case 'min_participants': fieldLabel = '最小参与人数'; break;
          case 'require_approval': fieldLabel = '审批设置'; break;
          default: fieldLabel = fieldName;
        }

        return `${fieldLabel}: ${e.message}`;
      });
      return error(res, fieldErrors.join('; '), 400);
    }

    // 处理外键约束错误
    if (err.name === 'SequelizeForeignKeyConstraintError') {
      if (err.index === 'activities_team_id_fkey') {
        return error(res, '指定的团队不存在，请选择有效的团队或选择"非团队活动"', 400);
      }
      if (err.index === 'activities_creator_id_fkey') {
        return error(res, '用户身份验证失败，请重新登录', 401);
      }
      return error(res, '关联数据不存在，请检查相关字段', 400);
    }

    // 处理唯一约束错误
    if (err.name === 'SequelizeUniqueConstraintError') {
      return error(res, '活动标识冲突，请稍后重试', 409);
    }

    // 处理数据库连接错误
    if (err.code === 'ECONNREFUSED') {
      return error(res, '数据库连接失败，请联系管理员', 503);
    }

    // 处理权限错误
    if (err.message && err.message.includes('permission')) {
      return error(res, '权限不足，无法创建活动', 403);
    }

    // 处理其他已知错误
    if (err.message) {
      // 检查是否是已知的业务错误
      if (err.message.includes('团队不存在')) {
        return error(res, err.message, 400);
      }
      if (err.message.includes('系统中没有可用的团队')) {
        return error(res, err.message + '，请联系管理员创建团队', 400);
      }
    }

    // 未知错误返回详细信息给管理员，用户看到友好提示
    if (process.env.NODE_ENV === 'development') {
      return error(res, `创建活动失败: ${err.message}`, 500);
    } else {
      logger.error('创建活动未知错误:', {
        error: err.message,
        stack: err.stack,
        user: req.user?.id,
        body: req.body
      });
      return error(res, '创建活动失败，请检查输入数据或联系管理员', 500);
    }
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

    // 检查活动标题是否重复（排除当前活动）
    if (title && title.trim() !== activity.title) {
      const existingActivity = await Activity.findOne({
        where: {
          title: title.trim(),
          id: { [Op.ne]: id } // 排除当前活动
        }
      });

      if (existingActivity) {
        return error(res, '活动标题已存在，请使用不同的标题', 400);
      }
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

    // 获取当前最大的序号并加1
    const maxSequence = await Activity.max('sequence_number') || 0;
    const nextSequence = maxSequence + 1;

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
      status: 'draft',
      sequence_number: nextSequence // 添加序号字段
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

// ==================== AA费用分摊相关接口 ====================

// 计算AA费用分摊
router.get('/:id/aa-costs', authenticateToken, async (req, res) => {
  try {
    const { Activity, ActivityParticipant, User } = require('../models');
    const { id: activityId } = req.params;

    // 验证活动
    const activity = await Activity.findByPk(activityId);
    if (!activity) {
      return error(res, '活动不存在', 404);
    }

    // 计算AA费用分摊
    const aaCosts = await activity.calculateAACosts();

    // 获取参与者详细信息
    if (aaCosts.participants.length > 0) {
      const userIds = aaCosts.participants.map(p => p.user_id);
      const users = await User.findAll({
        where: { id: userIds },
        attributes: ['id', 'username', 'email', 'profile']
      });

      const userMap = {};
      users.forEach(user => {
        userMap[user.id] = user;
      });

      aaCosts.participants = aaCosts.participants.map(p => ({
        ...p,
        user: userMap[p.user_id] || null
      }));
    }

    logger.info(`用户 ${req.user.username} 计算活动 ${activity.title} 的AA费用分摊`);
    return success(res, {
      activity: {
        id: activity.id,
        title: activity.title,
        total_cost: activity.total_cost
      },
      aaCosts
    }, '计算AA费用分摊成功');

  } catch (err) {
    logger.error('计算AA费用分摊失败:', err);
    return error(res, '计算AA费用分摊失败: ' + err.message, 500);
  }
});

// 更新参与者分摊系数
router.put('/:id/participants/:userId/ratio', authenticateToken, async (req, res) => {
  try {
    const { Activity, ActivityParticipant, User } = require('../models');
    const { id: activityId, userId } = req.params;
    const { ratio } = req.body;

    // 验证活动
    const activity = await Activity.findByPk(activityId);
    if (!activity) {
      return error(res, '活动不存在', 404);
    }

    // 检查权限：只有活动创建者或管理员可以更新分摊系数
    if (activity.creator_id !== req.user.id && !req.user.permissions.includes('activity:update')) {
      return error(res, '权限不足，无法更新分摊系数', 403);
    }

    // 验证用户是否存在
    const user = await User.findByPk(userId);
    if (!user) {
      return error(res, '用户不存在', 404);
    }

    // 更新分摊系数
    const participant = await activity.updateParticipantRatio(userId, ratio);

    logger.info(`用户 ${req.user.username} 更新活动 ${activity.title} 中用户 ${user.username} 的分摊系数为 ${ratio}`);
    return success(res, participant, '更新分摊系数成功');

  } catch (err) {
    logger.error('更新分摊系数失败:', err);
    return error(res, '更新分摊系数失败: ' + err.message, 500);
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

    // 获取当前最大的序号并加1
    const maxSequence = await Activity.max('sequence_number') || 0;
    const nextSequence = maxSequence + 1;

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
      auto_cancel_threshold,
      sequence_number: nextSequence // 添加序号字段
    };

    // 创建聚餐活动
    const activity = await Activity.createDinnerParty(dinnerPartyData);

    // 计算费用信息
    const costs = await activity.calculateDinnerPartyCosts();

    logger.info(`用户 ${req.user.username} 创建聚餐活动: ${title} (序号: ${nextSequence})`);

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
        created_at: activity.created_at,
        sequence_number: activity.sequence_number // 返回序号字段
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

// 更新所有活动的序号（管理员功能）
router.post('/update-sequence', authenticateToken, requirePermission('activity:create'), async (req, res) => {
  try {
    const { Activity } = require('../models');

    // 获取所有活动，按创建时间排序
    const activities = await Activity.findAll({
      order: [['created_at', 'ASC']]
    });

    // 更新每个活动的序号
    for (let i = 0; i < activities.length; i++) {
      const activity = activities[i];
      const sequenceNumber = i + 1;

      await activity.update({
        sequence_number: sequenceNumber
      });
    }

    logger.info(`用户 ${req.user.username} 更新了所有活动的序号，共 ${activities.length} 个活动`);
    return success(res, { updated: activities.length }, '活动序号更新成功');

  } catch (err) {
    logger.error('更新活动序号失败:', err);
    return error(res, '更新活动序号失败', 500);
  }
});

// 获取活动参与者列表
router.get('/:id/participants', authenticateToken, async (req, res) => {
  try {
    const { Activity, ActivityParticipant, User } = require('../models');
    const { id } = req.params;

    // 验证活动是否存在
    const activity = await Activity.findByPk(id);
    if (!activity) {
      return error(res, '活动不存在', 404);
    }

    // 获取参与者列表
    const participants = await ActivityParticipant.findAll({
      where: { activity_id: id },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'email', 'profile']
        }
      ],
      order: [['registered_at', 'DESC']]
    });

    // 格式化返回数据
    const formattedParticipants = participants.map(p => ({
      id: p.id,
      user: {
        id: p.user.id,
        username: p.user.username,
        email: p.user.email,
        profile: p.user.profile || {}
      },
      status: p.status,
      payment_status: p.payment_status,
      payment_amount: p.payment_amount,
      registered_at: p.registered_at
    }));

    logger.info(`用户 ${req.user.username} 获取活动 ${activity.title} 的参与者列表，共 ${participants.length} 人`);
    return success(res, {
      activity: {
        id: activity.id,
        title: activity.title
      },
      participants: formattedParticipants
    }, '获取参与者列表成功');

  } catch (err) {
    logger.error('获取参与者列表失败:', err);
    return error(res, '获取参与者列表失败: ' + err.message, 500);
  }
});

// 批准/拒绝报名申请
router.put('/:id/participants/:participantId/status', authenticateToken, requirePermission('activity:update'), async (req, res) => {
  try {
    const { Activity, ActivityParticipant, User } = require('../models');
    const { id, participantId } = req.params;
    const { status, reason } = req.body;

    // 验证状态值
    if (!['approved', 'rejected'].includes(status)) {
      return error(res, '状态值必须是 approved 或 rejected', 400);
    }

    // 验证活动是否存在
    const activity = await Activity.findByPk(id);
    if (!activity) {
      return error(res, '活动不存在', 404);
    }

    // 查找参与记录
    const participant = await ActivityParticipant.findByPk(participantId, {
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'email']
        }
      ]
    });

    if (!participant) {
      return error(res, '参与记录不存在', 404);
    }

    // 验证参与记录是否属于该活动
    if (participant.activity_id !== id) {
      return error(res, '参与记录不属于该活动', 400);
    }

    // 验证当前状态是否为pending
    if (participant.status !== 'pending') {
      return error(res, '只能处理待审核的申请', 400);
    }

    // 更新参与状态
    await participant.update({
      status: status,
      // 如果拒绝，记录拒绝原因和时间
      ...(status === 'rejected' && {
        rejection_reason: reason || '',
        rejected_at: new Date(),
        rejected_by: req.user.id
      })
    });

    // 同步更新ActivityRegistration状态
    const { ActivityRegistration } = require('../models/ActivityRegistration');
    await ActivityRegistration.update(
      {
        status: status,
        ...(status === 'approved' && {
          approvalTime: new Date(),
          approvedBy: req.user.id
        })
      },
      {
        where: {
          activityId: id,
          userId: participant.user_id
        }
      }
    );

    // 如果批准，更新活动的当前参与人数
    if (status === 'approved') {
      const approvedCount = await ActivityParticipant.count({
        where: {
          activity_id: id,
          status: 'approved'
        }
      });

      await activity.update({
        current_participants: approvedCount
      });
    }

    logger.info(`用户 ${req.user.username} ${status === 'approved' ? '批准' : '拒绝'}了用户 ${participant.user.username} 参与活动 ${activity.title} 的申请`);

    return success(res, {
      participant: {
        id: participant.id,
        status: participant.status,
        user: participant.user,
        ...(status === 'rejected' && {
          rejection_reason: participant.rejection_reason,
          rejected_at: participant.rejected_at
        })
      },
      activity: {
        id: activity.id,
        title: activity.title,
        current_participants: activity.current_participants
      }
    }, status === 'approved' ? '已批准报名申请' : '已拒绝报名申请');

  } catch (err) {
    logger.error('处理报名申请失败:', err);
    return error(res, '处理报名申请失败: ' + err.message, 500);
  }
});

// 取消报名
router.delete('/:id/participants/:participantId', authenticateToken, async (req, res) => {
  try {
    const { Activity, ActivityParticipant, User } = require('../models');
    const { id, participantId } = req.params;
    const userId = req.user.id;

    // 验证活动是否存在
    const activity = await Activity.findByPk(id);
    if (!activity) {
      return error(res, '活动不存在', 404);
    }

    // 查找参与记录
    const participant = await ActivityParticipant.findByPk(participantId);
    if (!participant) {
      return error(res, '参与记录不存在', 404);
    }

    // 验证参与记录是否属于该活动
    if (participant.activity_id !== id) {
      return error(res, '参与记录不属于该活动', 400);
    }

    // 验证权限：只有报名者本人、活动创建者或有活动管理权限的用户才能取消报名
    const isOwner = participant.user_id === userId;
    const isActivityCreator = activity.creator_id === userId;
    const hasPermission = req.user.permissions?.includes('activity:update');

    if (!isOwner && !isActivityCreator && !hasPermission) {
      return error(res, '没有权限取消此报名', 403);
    }

    // 检查活动状态是否允许取消报名
    if (activity.status === 'completed') {
      return error(res, '活动已结束，无法取消报名', 400);
    }

    if (activity.status === 'cancelled') {
      return error(res, '活动已取消，无法取消报名', 400);
    }

    // 更新参与记录状态为取消
    await participant.update({
      status: 'cancelled',
      // 如果已经支付，记录退款信息（这里可以根据实际需求扩展）
      cancelled_at: new Date(),
      cancelled_by: userId
    });

    // 更新活动的报名人数
    const registrationCount = await ActivityParticipant.count({
      where: {
        activity_id: id,
        status: {
          [Op.ne]: 'cancelled'
        }
      }
    });

    await activity.update({
      registration_count: registrationCount
    });

    logger.info(`用户 ${req.user.username} 取消了活动 ${activity.title} 的报名，参与者ID: ${participantId}`);
    return success(res, {
      participant: {
        id: participant.id,
        status: participant.status,
        cancelled_at: participant.cancelled_at
      },
      activity: {
        id: activity.id,
        title: activity.title,
        registration_count: registrationCount
      }
    }, '取消报名成功');

  } catch (err) {
    logger.error('取消报名失败:', err);
    return error(res, '取消报名失败: ' + err.message, 500);
  }
});

// ==================== 活动记账相关接口 ====================

// 创建活动费用记录
router.post('/:id/expenses', authenticateToken, async (req, res) => {
  try {
    const { Activity, ActivityExpense } = require('../models');
    const { id: activityId } = req.params;
    const {
      item,
      amount,
      expense_date,
      description,
      payer,
      image_path
    } = req.body;

    console.log('💰 后端 - 收到创建费用记录请求:', {
      activityId,
      item,
      amount,
      expense_date,
      description,
      payer,
      image_path,
      userId: req.user.id,
      username: req.user.username
    });

    // 验证活动是否存在
    const activity = await Activity.findByPk(activityId);
    if (!activity) {
      console.log('❌ 后端 - 活动不存在:', activityId);
      return error(res, '活动不存在', 404);
    }
    console.log('✅ 后端 - 活动存在:', activity.title);

    // 检查权限：只有活动创建者或管理员可以添加费用记录
    if (activity.creator_id !== req.user.id && !req.user.permissions.includes('activity:update')) {
      console.log('❌ 后端 - 权限不足:', {
        activityCreatorId: activity.creator_id,
        userId: req.user.id,
        userPermissions: req.user.permissions
      });
      return error(res, '权限不足，无法添加费用记录', 403);
    }
    console.log('✅ 后端 - 权限验证通过');

    // 验证必填字段
    if (!item || !amount || !expense_date) {
      console.log('❌ 后端 - 必填字段验证失败:', { item, amount, expense_date });
      return error(res, '费用事项、金额和日期不能为空', 400);
    }
    console.log('✅ 后端 - 必填字段验证通过');

    // 创建费用记录
    console.log('💾 后端 - 开始创建费用记录');
    const expense = await ActivityExpense.create({
      activity_id: activityId,
      item: item.trim(),
      amount: parseFloat(amount),
      expense_date: new Date(expense_date),
      description: description ? description.trim() : null,
      payer: payer ? payer.trim() : null,
      image_path: image_path ? image_path.trim() : null,
      recorder_id: req.user.id
    });

    logger.info(`用户 ${req.user.username} 为活动 ${activity.title} 添加费用记录: ${item}`);
    return success(res, expense, '费用记录创建成功', 201);

  } catch (err) {
    logger.error('创建费用记录失败:', err);
    return error(res, '创建费用记录失败: ' + err.message, 500);
  }
});

// 获取活动费用记录列表
router.get('/:id/expenses', authenticateToken, async (req, res) => {
  try {
    const { Activity, ActivityExpense } = require('../models');
    const { id: activityId } = req.params;

    // 验证活动
    const activity = await Activity.findByPk(activityId);
    if (!activity) {
      return error(res, '活动不存在', 404);
    }

    // 获取费用记录列表
    const expenses = await ActivityExpense.findAll({
      where: { activity_id: activityId },
      include: [{
        model: require('../models').User,
        as: 'recorder',
        attributes: ['id', 'username', 'email']
      }],
      order: [['expense_date', 'DESC'], ['created_at', 'DESC']]
    });

    logger.info(`用户 ${req.user.username} 获取活动 ${activity.title} 的费用记录列表，共 ${expenses.length} 条`);
    return success(res, {
      activity: {
        id: activity.id,
        title: activity.title
      },
      expenses
    }, '获取费用记录列表成功');

  } catch (err) {
    logger.error('获取费用记录列表失败:', err);
    return error(res, '获取费用记录列表失败: ' + err.message, 500);
  }
});

// 更新活动费用记录
router.put('/:id/expenses/:expenseId', authenticateToken, async (req, res) => {
  try {
    const { Activity, ActivityExpense } = require('../models');
    const { id: activityId, expenseId } = req.params;
    const {
      item,
      amount,
      expense_date,
      description,
      payer,
      image_path
    } = req.body;

    // 验证活动
    const activity = await Activity.findByPk(activityId);
    if (!activity) {
      return error(res, '活动不存在', 404);
    }

    // 查找费用记录
    const expense = await ActivityExpense.findByPk(expenseId);
    if (!expense) {
      return error(res, '费用记录不存在', 404);
    }

    // 验证费用记录是否属于该活动
    if (expense.activity_id !== activityId) {
      return error(res, '费用记录不属于该活动', 400);
    }

    // 检查权限：只有记录人、活动创建者或管理员可以更新费用记录
    if (expense.recorder_id !== req.user.id && 
        activity.creator_id !== req.user.id && 
        !req.user.permissions.includes('activity:update')) {
      return error(res, '权限不足，无法更新此费用记录', 403);
    }

    // 更新费用记录
    await expense.update({
      item: item ? item.trim() : expense.item,
      amount: amount ? parseFloat(amount) : expense.amount,
      expense_date: expense_date ? new Date(expense_date) : expense.expense_date,
      description: description !== undefined ? (description ? description.trim() : null) : expense.description,
      payer: payer !== undefined ? (payer ? payer.trim() : null) : expense.payer,
      image_path: image_path !== undefined ? (image_path ? image_path.trim() : null) : expense.image_path
    });

    logger.info(`用户 ${req.user.username} 更新活动 ${activity.title} 的费用记录: ${expense.item}`);
    return success(res, expense, '费用记录更新成功');

  } catch (err) {
    logger.error('更新费用记录失败:', err);
    return error(res, '更新费用记录失败: ' + err.message, 500);
  }
});

// 删除活动费用记录
router.delete('/:id/expenses/:expenseId', authenticateToken, async (req, res) => {
  try {
    const { Activity, ActivityExpense } = require('../models');
    const { id: activityId, expenseId } = req.params;

    console.log('🗑️ 后端 - 收到删除费用记录请求:', {
      activityId,
      expenseId,
      userId: req.user.id,
      username: req.user.username
    });

    // 验证活动
    const activity = await Activity.findByPk(activityId);
    if (!activity) {
      console.log('❌ 后端 - 活动不存在:', activityId);
      return error(res, '活动不存在', 404);
    }
    console.log('✅ 后端 - 活动存在:', activity.title);

    // 查找费用记录
    const expense = await ActivityExpense.findByPk(expenseId);
    if (!expense) {
      console.log('❌ 后端 - 费用记录不存在:', expenseId);
      return error(res, '费用记录不存在', 404);
    }
    console.log('✅ 后端 - 费用记录存在:', expense.item);

    // 验证费用记录是否属于该活动
    if (expense.activity_id !== activityId) {
      return error(res, '费用记录不属于该活动', 400);
    }

    // 检查权限：只有记录人、活动创建者或管理员可以删除费用记录
    if (expense.recorder_id !== req.user.id && 
        activity.creator_id !== req.user.id && 
        !req.user.permissions.includes('activity:delete')) {
      return error(res, '权限不足，无法删除此费用记录', 403);
    }

    // 删除费用记录
    await expense.destroy();

    logger.info(`用户 ${req.user.username} 删除活动 ${activity.title} 的费用记录: ${expense.item}`);
    return success(res, null, '费用记录删除成功');

  } catch (err) {
    logger.error('删除费用记录失败:', err);
    return error(res, '删除费用记录失败: ' + err.message, 500);
  }
});

// 获取活动费用统计
router.get('/:id/expense-summary', authenticateToken, async (req, res) => {
  try {
    const { Activity, ActivityExpense } = require('../models');
    const { id: activityId } = req.params;

    // 验证活动
    const activity = await Activity.findByPk(activityId);
    if (!activity) {
      return error(res, '活动不存在', 404);
    }

    // 获取费用统计信息
    const expenses = await ActivityExpense.findAll({
      where: { activity_id: activityId }
    });

    const summary = {
      totalCount: expenses.length,
      totalAmount: 0,
      averageAmount: 0
    };

    if (expenses.length > 0) {
      const totalAmount = expenses.reduce((sum, expense) => sum + parseFloat(expense.amount), 0);
      summary.totalAmount = parseFloat(totalAmount.toFixed(2));
      summary.averageAmount = parseFloat((totalAmount / expenses.length).toFixed(2));
    }

    logger.info(`用户 ${req.user.username} 获取活动 ${activity.title} 的费用统计`);
    return success(res, {
      activity: {
        id: activity.id,
        title: activity.title
      },
      summary
    }, '获取费用统计成功');

  } catch (err) {
    logger.error('获取费用统计失败:', err);
    return error(res, '获取费用统计失败: ' + err.message, 500);
  }
});

// ==================== AA费用分摊相关接口 ====================

// 计算AA费用分摊
router.get('/:id/aa-costs', authenticateToken, async (req, res) => {
  try {
    const { Activity, ActivityParticipant, User } = require('../models');
    const { id: activityId } = req.params;

    // 验证活动
    const activity = await Activity.findByPk(activityId);
    if (!activity) {
      return error(res, '活动不存在', 404);
    }

    // 计算AA费用分摊
    const aaCosts = await activity.calculateAACosts();

    // 获取参与者详细信息
    if (aaCosts.participants.length > 0) {
      const userIds = aaCosts.participants.map(p => p.user_id);
      const users = await User.findAll({
        where: { id: userIds },
        attributes: ['id', 'username', 'email', 'profile']
      });

      const userMap = {};
      users.forEach(user => {
        userMap[user.id] = user;
      });

      aaCosts.participants = aaCosts.participants.map(p => ({
        ...p,
        user: userMap[p.user_id] || null
      }));
    }

    logger.info(`用户 ${req.user.username} 计算活动 ${activity.title} 的AA费用分摊`);
    return success(res, {
      activity: {
        id: activity.id,
        title: activity.title,
        total_cost: activity.total_cost
      },
      aaCosts
    }, '计算AA费用分摊成功');

  } catch (err) {
    logger.error('计算AA费用分摊失败:', err);
    return error(res, '计算AA费用分摊失败: ' + err.message, 500);
  }
});

// 更新参与者分摊系数
router.put('/:id/participants/:userId/ratio', authenticateToken, async (req, res) => {
  try {
    const { Activity, ActivityParticipant, User } = require('../models');
    const { id: activityId, userId } = req.params;
    const { ratio } = req.body;

    // 验证活动
    const activity = await Activity.findByPk(activityId);
    if (!activity) {
      return error(res, '活动不存在', 404);
    }

    // 检查权限：只有活动创建者或管理员可以更新分摊系数
    if (activity.creator_id !== req.user.id && !req.user.permissions.includes('activity:update')) {
      return error(res, '权限不足，无法更新分摊系数', 403);
    }

    // 验证用户是否存在
    const user = await User.findByPk(userId);
    if (!user) {
      return error(res, '用户不存在', 404);
    }

    // 更新分摊系数
    const participant = await activity.updateParticipantRatio(userId, ratio);

    logger.info(`用户 ${req.user.username} 更新活动 ${activity.title} 中用户 ${user.username} 的分摊系数为 ${ratio}`);
    return success(res, participant, '更新分摊系数成功');

  } catch (err) {
    logger.error('更新分摊系数失败:', err);
    return error(res, '更新分摊系数失败: ' + err.message, 500);
  }
});

// ==================== AA分摊总金额管理接口 ====================

// 设置AA分摊总金额
router.put('/:id/aa-total-cost', authenticateToken, async (req, res) => {
  try {
    const { Activity } = require('../models');
    const { id: activityId } = req.params;
    const { totalCost } = req.body;

    console.log('💰 设置AA分摊总金额:', {
      activityId,
      totalCost,
      userId: req.user.id,
      username: req.user.username
    });

    // 验证活动是否存在
    const activity = await Activity.findByPk(activityId);
    if (!activity) {
      console.log('❌ 后端 - 活动不存在:', activityId);
      return error(res, '活动不存在', 404);
    }
    console.log('✅ 后端 - 活动存在:', activity.title);

    // 检查权限：只有活动创建者或管理员可以设置AA分摊总金额
    if (activity.creator_id !== req.user.id && !req.user.permissions.includes('activity:update')) {
      console.log('❌ 后端 - 权限不足:', {
        activityCreatorId: activity.creator_id,
        userId: req.user.id,
        userPermissions: req.user.permissions
      });
      return error(res, '权限不足，无法设置AA分摊总金额', 403);
    }
    console.log('✅ 后端 - 权限验证通过');

    // 验证总金额
    if (typeof totalCost !== 'number' || totalCost < 0) {
      console.log('❌ 后端 - 总金额验证失败:', totalCost);
      return error(res, '总金额必须是非负数', 400);
    }
    console.log('✅ 后端 - 总金额验证通过:', totalCost);

    // 计算AA费用分摊（使用自定义总金额）
    const aaCosts = await activity.calculateAACosts({
      useCustomTotalCost: true,
      customTotalCost: totalCost
    });

    // 获取参与者详细信息
    if (aaCosts.participants.length > 0) {
      const { User } = require('../models');
      const userIds = aaCosts.participants.map(p => p.user_id);
      const users = await User.findAll({
        where: { id: userIds },
        attributes: ['id', 'username', 'email', 'profile']
      });

      const userMap = {};
      users.forEach(user => {
        userMap[user.id] = user;
      });

      aaCosts.participants = aaCosts.participants.map(p => ({
        ...p,
        user: userMap[p.user_id] || null
      }));
    }

    console.log('✅ AA分摊总金额设置成功:', {
      totalCost: aaCosts.totalCost,
      participantCount: aaCosts.participantCount
    });

    return success(res, {
      aaCosts
    }, 'AA分摊总金额设置成功');

  } catch (err) {
    logger.error('设置AA分摊总金额失败:', err);
    return error(res, '设置AA分摊总金额失败: ' + err.message, 500);
  }
});

// 重置AA分摊总金额（使用费用记账总额）
router.put('/:id/aa-total-cost/reset', authenticateToken, async (req, res) => {
  try {
    const { Activity } = require('../models');
    const { id: activityId } = req.params;

    console.log('🔄 重置AA分摊总金额:', {
      activityId,
      userId: req.user.id,
      username: req.user.username
    });

    // 验证活动是否存在
    const activity = await Activity.findByPk(activityId);
    if (!activity) {
      console.log('❌ 后端 - 活动不存在:', activityId);
      return error(res, '活动不存在', 404);
    }
    console.log('✅ 后端 - 活动存在:', activity.title);

    // 检查权限：只有活动创建者或管理员可以重置AA分摊总金额
    if (activity.creator_id !== req.user.id && !req.user.permissions.includes('activity:update')) {
      console.log('❌ 后端 - 权限不足:', {
        activityCreatorId: activity.creator_id,
        userId: req.user.id,
        userPermissions: req.user.permissions
      });
      return error(res, '权限不足，无法重置AA分摊总金额', 403);
    }
    console.log('✅ 后端 - 权限验证通过');

    // 计算AA费用分摊（使用默认总额）
    const aaCosts = await activity.calculateAACosts();

    // 获取参与者详细信息
    if (aaCosts.participants.length > 0) {
      const { User } = require('../models');
      const userIds = aaCosts.participants.map(p => p.user_id);
      const users = await User.findAll({
        where: { id: userIds },
        attributes: ['id', 'username', 'email', 'profile']
      });

      const userMap = {};
      users.forEach(user => {
        userMap[user.id] = user;
      });

      aaCosts.participants = aaCosts.participants.map(p => ({
        ...p,
        user: userMap[p.user_id] || null
      }));
    }

    console.log('✅ AA分摊总金额重置成功:', {
      totalCost: aaCosts.totalCost,
      baseTotalCost: aaCosts.baseTotalCost,
      expenseTotalCost: aaCosts.expenseTotalCost,
      useCustomTotalCost: aaCosts.useCustomTotalCost
    });

    return success(res, {
      aaCosts
    }, 'AA分摊总金额重置成功');

  } catch (err) {
    logger.error('重置AA分摊总金额失败:', err);
    return error(res, '重置AA分摊总金额失败: ' + err.message, 500);
  }
});

// ==================== AA账单管理相关接口 ====================

// 保存AA分摊账单
router.post('/:id/aa-bill', authenticateToken, async (req, res) => {
  try {
    const { Activity, ActivityParticipant, User, AABill } = require('../models');
    const { id: activityId } = req.params;
    const userId = req.user.id;

    console.log('💾 保存AA账单请求:', {
      activityId,
      userId,
      username: req.user.username,
      body: req.body
    });

    // 检查活动是否存在
    const activity = await Activity.findByPk(activityId);
    if (!activity) {
      return error(res, '活动不存在', 404);
    }

    // 获取前端传递的自定义总金额参数
    const { useCustomTotalCost = false, customTotalCost = 0 } = req.body;

    console.log('📊 使用自定义总金额参数:', {
      useCustomTotalCost,
      customTotalCost,
      originalBody: req.body
    });

    // 计算当前AA分摊数据，使用自定义总金额
    const aaCosts = await activity.calculateAACosts({
      useCustomTotalCost: useCustomTotalCost,
      customTotalCost: customTotalCost
    });

    if (!aaCosts.participants || aaCosts.participants.length === 0) {
      return error(res, '没有参与者数据，无法保存账单', 400);
    }

    // 创建账单记录
    const billData = {
      id: uuidv4(),
      activity_id: activityId,
      creator_id: userId,
      total_cost: aaCosts.totalCost,
      expense_total_cost: aaCosts.expenseTotalCost,
      base_total_cost: aaCosts.baseTotalCost,
      use_custom_total_cost: aaCosts.useCustomTotalCost,
      participant_count: aaCosts.participantCount,
      total_ratio: aaCosts.totalRatio,
      average_cost: aaCosts.averageCost,
      status: 'saved', // saved, sent, paid
      bill_details: aaCosts.participants.map(p => ({
        user_id: p.user_id,
        cost_sharing_ratio: p.cost_sharing_ratio,
        amount: p.amount
      })),
      created_at: new Date(),
      updated_at: new Date()
    };

    console.log('💾 创建AA账单记录:', billData);

    // 检查AABill模型是否存在，如果不存在则使用通用方案
    let savedBill;
    try {
      savedBill = await AABill.create(billData);
      console.log('✅ AA账单数据库保存成功:', savedBill.id);
    } catch (modelError) {
      console.warn('⚠️ AABill模型不存在，使用localStorage方案:', modelError.message);

      // 如果AABill模型不存在，返回成功响应（前端已保存到localStorage）
      return success(res, {
        bill: billData,
        storage: 'localStorage',
        message: '账单已保存到本地存储'
      }, '账单保存成功');
    }

    return success(res, {
      bill: savedBill,
      storage: 'database'
    }, 'AA账单保存成功');

  } catch (err) {
    logger.error('保存AA账单失败:', err);
    return error(res, '保存AA账单失败: ' + err.message, 500);
  }
});

// 获取活动的AA账单列表
router.get('/:id/aa-bills', authenticateToken, async (req, res) => {
  try {
    const { Activity, AABill } = require('../models');
    const { id: activityId } = req.params;

    console.log('📋 获取AA账单列表:', {
      activityId,
      userId: req.user.id
    });

    // 检查活动是否存在
    const activity = await Activity.findByPk(activityId);
    if (!activity) {
      return error(res, '活动不存在', 404);
    }

    let bills = [];
    try {
      bills = await AABill.findAll({
        where: { activity_id: activityId },
        order: [['created_at', 'DESC']]
      });
      console.log('✅ 从数据库获取账单列表:', bills.length);
    } catch (modelError) {
      console.warn('⚠️ AABill模型不存在，返回空列表:', modelError.message);
      // 模型不存在时返回空列表
    }

    return success(res, {
      bills,
      count: bills.length
    }, '获取AA账单列表成功');

  } catch (err) {
    logger.error('获取AA账单列表失败:', err);
    return error(res, '获取AA账单列表失败: ' + err.message, 500);
  }
});

// 导出router
module.exports = router;
