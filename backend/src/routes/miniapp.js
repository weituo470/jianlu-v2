/* 最后修改时间: 2025-01-12 15:00:00 */
// 微信小程序API路由 - 简化版本 (使用临时数据)
//
// 上下游影响检查：
// - 新增API接口，需要在 backend/src/app.js 中注册路由: app.use('/api/miniapp', miniappSimpleRoutes)
// - 小程序前端需要调用这些接口进行登录、获取数据等操作
// - 提供的接口格式需要与 MINIAPP-API-DOC.md 文档保持一致
const express = require('express');
const jwt = require('jsonwebtoken');
const router = express.Router();

const { authenticateToken } = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const { success, error, unauthorized } = require('../utils/response');
const logger = require('../utils/logger');
const Joi = require('joi');

// 小程序登录验证模式
const miniappLoginSchema = Joi.object({
  username: Joi.string()
    .min(3)
    .max(50)
    .required()
    .messages({
      'string.min': '用户名至少3个字符',
      'string.max': '用户名最多50个字符',
      'any.required': '用户名不能为空'
    }),
  password: Joi.string()
    .min(6)
    .required()
    .messages({
      'string.min': '密码至少6个字符',
      'any.required': '密码不能为空'
    })
});

// 临时数据已清除 - 仅依赖数据库

// 活动临时数据已清除

// 团队临时数据已清除

// 活动类型临时数据已清除

// 团队类型临时数据已清除

/**
 * 小程序用户登录
 * POST /api/miniapp/login
 * TODO: 函数复杂度较高(60行)，建议拆分为多个小函数：validateUser、generateToken、formatResponse
 */
router.post('/login', validate(miniappLoginSchema), async (req, res) => {
  try {
    const { username, password } = req.body;

    let user = null;
    
    try {
      // 从数据库查找用户
      const { User } = require('../models');
      user = await User.findByUsername(username);
      
      if (!user) {
        return unauthorized(res, '用户名或密码错误');
      }

      // 检查账户状态
      if (user.status !== 'active') {
        return unauthorized(res, '账户已被禁用，请联系管理员');
      }

      // 检查账户是否被锁定
      if (user.isLocked()) {
        return unauthorized(res, '账户已被锁定，请15分钟后重试');
      }

      // 验证密码
      const isValidPassword = await user.validatePassword(password);
      if (!isValidPassword) {
        await user.incrementLoginAttempts();
        return unauthorized(res, '用户名或密码错误');
      }

      // 重置登录尝试次数
      await user.resetLoginAttempts();
      
      logger.info(`小程序用户登录成功: ${username} - IP: ${req.ip}`);
    } catch (dbError) {
      logger.error('数据库查询失败:', dbError.message);
      return error(res, '登录失败，请检查数据库连接', 500);
    }

    if (!user) {
      return unauthorized(res, '用户名或密码错误');
    }

    // 生成JWT Token
    const tokenPayload = {
      id: user.id,
      username: user.username,
      role: user.role,
      permissions: getMiniappPermissions(user.role),
      platform: 'miniapp'
    };

    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET || 'default-secret', {
      expiresIn: '30d'
    });

    logger.info(`小程序用户登录成功: ${username} - IP: ${req.ip}`);

    // 格式化用户信息 (兼容数据库用户和测试用户)
    const userInfo = {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      profile: user.profile || {},
      permissions: getMiniappPermissions(user.role)
    };

    return success(res, {
      token,
      user: userInfo,
      expiresIn: '30d'
    }, '登录成功');

  } catch (err) {
    logger.error('小程序登录失败:', err);
    return error(res, '登录失败，请稍后重试', 500);
  }
});

/**
 * 获取用户信息
 * GET /api/miniapp/profile
 */
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const user = {
      id: req.user.id,
      username: req.user.username,
      email: req.user.username === 'admin' ? 'admin@example.com' : 'user@example.com',
      role: req.user.role,
      profile: { name: req.user.username === 'admin' ? '管理员' : '普通用户' },
      permissions: req.user.permissions,
      lastLoginAt: new Date().toISOString()
    };

    return success(res, user, '获取用户信息成功');

  } catch (err) {
    logger.error('获取用户信息失败:', err);
    return error(res, '获取用户信息失败', 500);
  }
});

/**
 * 获取活动列表
 * GET /api/miniapp/activities
 * TODO: 函数复杂度较高(50行)，建议拆分为多个小函数：filterActivities、paginateResults、formatResponse
 */
router.get('/activities', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', status = '', type = '' } = req.query;

    // 从数据库获取活动数据
    const { Activity, Team, User } = require('../models');
    const { Op } = require('sequelize');

    // 构建查询条件
    const whereConditions = {};
    
    if (search) {
      whereConditions[Op.or] = [
        { title: { [Op.like]: `%${search}%` } },
        { description: { [Op.like]: `%${search}%` } }
      ];
    }
    
    if (status) {
      whereConditions.status = status;
    }
    
    if (type) {
      whereConditions.type = type;
    }

    // 查询活动数据
    const { count, rows: activityRows } = await Activity.findAndCountAll({
      where: whereConditions,
      include: [
        {
          model: Team,
          as: 'team',
          attributes: ['id', 'name', 'avatar_url']
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'username']
        }
      ],
      order: [['sequence_number', 'DESC']],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    });

    // 格式化返回数据
    const activities = activityRows.map(activity => ({
      id: activity.id,
      title: activity.title,
      description: activity.description,
      activity_type: activity.type,
      visibility: activity.visibility,
      start_time: activity.start_time,
      end_time: activity.end_time,
      location: activity.location,
      max_participants: activity.max_participants,
      registration_count: activity.registration_count || 0,
      status: activity.status,
      team: activity.team ? {
        id: activity.team.id,
        name: activity.team.name,
        avatar_url: activity.team.avatar_url
      } : null,
      creator: activity.creator ? {
        id: activity.creator.id,
        username: activity.creator.username
      } : null,
      creator_name: activity.creator ? activity.creator.username : '未知',
      sequence_number: activity.sequence_number,
      created_at: activity.created_at
    }));

    const pagination = {
      page: parseInt(page),
      limit: parseInt(limit),
      total: count,
      pages: Math.ceil(count / parseInt(limit))
    };

    logger.info(`小程序用户 ${req.user.username} 获取活动列表，共 ${count} 个活动`);
    return success(res, { activities, pagination }, '获取活动列表成功');

  } catch (err) {
    logger.error('获取活动列表失败:', err);
    return error(res, '获取活动列表失败', 500);
  }
});

/**
 * 获取活动详情
 * GET /api/miniapp/activities/:id
 */
router.get('/activities/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { Activity, Team, User } = require('../models');
    
    const activity = await Activity.findByPk(id, {
      include: [
        {
          model: Team,
          as: 'team',
          attributes: ['id', 'name', 'avatar_url']
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'username']
        }
      ]
    });

    if (!activity) {
      return error(res, '活动不存在', 404);
    }

    // 格式化返回数据
    const formattedActivity = {
      id: activity.id,
      title: activity.title,
      description: activity.description,
      activity_type: activity.type,
      visibility: activity.visibility,
      start_time: activity.start_time,
      end_time: activity.end_time,
      location: activity.location,
      max_participants: activity.max_participants,
      registration_count: activity.registration_count || 0,
      status: activity.status,
      team: activity.team ? {
        id: activity.team.id,
        name: activity.team.name,
        avatar_url: activity.team.avatar_url
      } : null,
      creator: activity.creator ? {
        id: activity.creator.id,
        username: activity.creator.username
      } : null,
      creator_name: activity.creator ? activity.creator.username : '未知',
      created_at: activity.created_at
    };

    logger.info(`小程序用户 ${req.user.username} 查看活动详情: ${activity.title}`);
    return success(res, formattedActivity, '获取活动详情成功');

  } catch (err) {
    logger.error('获取活动详情失败:', err);
    return error(res, '获取活动详情失败', 500);
  }
});

/**
 * 获取团队列表 (小程序版本)
 * GET /api/miniapp/teams
 */
router.get('/teams', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '', team_type = '' } = req.query;

    // 从数据库查询团队数据
    const { Team, User, TeamMember, TeamApplication } = require('../models');
    const userId = req.user.id;
    
    // 构建查询条件
    const where = {
      status: 'active' // 只显示活跃的团队
    };
    
    if (search) {
      where.name = {
        [require('sequelize').Op.like]: `%${search}%`
      };
    }
    
    if (team_type) {
      where.team_type = team_type;
    }

    // 分页参数
    const offset = (parseInt(page) - 1) * parseInt(limit);

    // 查询团队列表
    const { count, rows: teamRows } = await Team.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'username']
        }
      ],
      order: [['created_at', 'DESC']],
      limit: parseInt(limit),
      offset,
      distinct: true
    });

    // 获取用户的成员状态和申请状态
    const teamIds = teamRows.map(team => team.id);

    // 查询用户在这些团队中的成员状态
    const memberStatuses = await TeamMember.findAll({
      where: {
        team_id: teamIds,
        user_id: userId
      },
      attributes: ['team_id', 'role']
    });

    // 查询用户对这些团队的申请状态
    const applicationStatuses = await TeamApplication.findAll({
      where: {
        team_id: teamIds,
        user_id: userId,
        status: 'pending' // 只查询待处理的申请
      },
      attributes: ['team_id', 'status']
    });

    // 创建状态映射
    const memberStatusMap = {};
    memberStatuses.forEach(member => {
      memberStatusMap[member.team_id] = member.role;
    });

    const applicationStatusMap = {};
    applicationStatuses.forEach(application => {
      applicationStatusMap[application.team_id] = application.status;
    });

    // 格式化返回数据
    const teams = teamRows.map(team => {
      const memberRole = memberStatusMap[team.id];
      const applicationStatus = applicationStatusMap[team.id];

      // 确定用户对该团队的状态
      let userStatus = 'none'; // 默认：未加入
      let canApply = true;

      if (memberRole) {
        userStatus = 'member';
        canApply = false;
      } else if (applicationStatus === 'pending') {
        userStatus = 'pending';
        canApply = false;
      }

      return {
        id: team.id,
        name: team.name,
        description: team.description,
        avatar_url: team.avatar_url,
        team_type: team.team_type,
        status: team.status,
        member_count: team.member_count || 0,
        creator: team.creator ? {
          id: team.creator.id,
          username: team.creator.username
        } : null,
        created_at: team.created_at,
        // 新增字段
        application_status: userStatus,
        can_apply: canApply,
        user_role: memberRole || null
      };
    });

    const pagination = {
      page: parseInt(page),
      limit: parseInt(limit),
      total: count,
      pages: Math.ceil(count / parseInt(limit))
    };

    logger.info(`小程序用户 ${req.user.username} 获取团队列表，共 ${count} 个团队`);
    return success(res, { teams, pagination }, '获取团队列表成功');

  } catch (err) {
    logger.error('获取团队列表失败:', err);
    return error(res, '获取团队列表失败', 500);
  }
});

/**
 * 获取我的团队列表 (小程序版本)
 * GET /api/miniapp/my-teams
 */
router.get('/my-teams', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // 从数据库查询用户所属的团队
    const { Team, TeamMember, User } = require('../models');

    // 使用原生SQL查询来避免模型问题
    const memberRows = await require('../config/database').sequelize.query(
      'SELECT tm.*, t.name as team_name, t.description, t.avatar_url, t.team_type, t.status as team_status, t.member_count, t.created_at as team_created_at, u.id as creator_id, u.username as creator_username FROM team_members tm JOIN teams t ON tm.team_id = t.id JOIN users u ON t.creator_id = u.id WHERE tm.user_id = ? AND t.status = "active" ORDER BY tm.joined_at DESC',
      {
        replacements: [userId],
        type: require('sequelize').QueryTypes.SELECT
      }
    );

    const count = memberRows.length;

    // 格式化返回数据，包含用户在团队中的角色
    const teams = memberRows.map(row => ({
      id: row.team_id,
      name: row.team_name,
      description: row.description,
      avatar_url: row.avatar_url,
      team_type: row.team_type,
      status: row.team_status,
      member_count: row.member_count || 0,
      role: row.role,
      joined_at: row.joined_at,
      creator: {
        id: row.creator_id,
        username: row.creator_username
      },
      created_at: row.team_created_at
    }));

    logger.info(`小程序用户 ${req.user.username} 获取我的团队列表，共 ${count} 个团队`);
    return success(res, { teams }, '获取我的团队列表成功');

  } catch (err) {
    logger.error('获取我的团队列表失败:', err);
    return error(res, '获取我的团队列表失败', 500);
  }
});

/**
 * 获取团队详情 (小程序版本)
 * GET /api/miniapp/teams/:id
 */
router.get('/teams/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // 从数据库查询团队数据
    const { Team, User } = require('../models');
    
    const team = await Team.findByPk(id, {
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'username', 'profile']
        }
      ]
    });

    if (!team) {
      return error(res, '团队不存在', 404);
    }

    // 格式化返回数据
    const formattedTeam = {
      id: team.id,
      name: team.name,
      description: team.description,
      avatar_url: team.avatar_url,
      team_type: team.team_type,
      status: team.status,
      member_count: team.member_count || 0,
      creator: team.creator ? {
        id: team.creator.id,
        username: team.creator.username,
        profile: team.creator.profile
      } : null,
      created_at: team.created_at,
      updated_at: team.updated_at
    };

    logger.info(`小程序用户 ${req.user.username} 查看团队详情: ${team.name}`);
    return success(res, formattedTeam, '获取团队详情成功');

  } catch (err) {
    logger.error('获取团队详情失败:', err);
    return error(res, '获取团队详情失败', 500);
  }
});

/**
 * 获取活动类型列表
 * GET /api/miniapp/activity-types
 */
router.get('/activity-types', authenticateToken, async (req, res) => {
  try {
    // 从数据库获取活动类型
    const { ActivityType } = require('../models');
    
    const activityTypes = await ActivityType.findAll({
      where: { status: 'active' },
      order: [['sort_order', 'ASC'], ['created_at', 'ASC']]
    });
    
    // 转换为前端需要的格式
    const formattedTypes = activityTypes.map(type => ({
      id: type.id,
      name: type.name,
      description: type.description,
      isDefault: type.is_default || false
    }));
    
    logger.info(`小程序用户 ${req.user.username} 获取活动类型列表，共 ${formattedTypes.length} 个类型`);
    return success(res, formattedTypes, '获取活动类型成功');
      
  } catch (err) {
    logger.error('获取活动类型失败:', err);
    return error(res, '获取活动类型失败', 500);
  }
});

/**
 * 获取团队类型列表
 * GET /api/miniapp/team-types
 */
router.get('/team-types', authenticateToken, async (req, res) => {
  try {
    // 从数据库获取团队类型
    const { TeamType } = require('../models');
    
    const teamTypes = await TeamType.findAll({
      where: { is_active: true },  // 修复字段名问题，从status改为is_active
      order: [['sort_order', 'ASC'], ['created_at', 'ASC']]
    });
    
    // 转换为前端需要的格式
    const formattedTypes = teamTypes.map(type => ({
      value: type.id,  // 添加value字段以匹配前端期望
      label: type.name,  // 添加label字段以匹配前端期望
      name: type.name,
      description: type.description,
      isDefault: type.is_default || false
    }));
    
    logger.info(`小程序用户 ${req.user.username} 获取团队类型列表，共 ${formattedTypes.length} 个类型`);
    return success(res, formattedTypes, '获取团队类型成功');
    
  } catch (err) {
    logger.error('获取团队类型失败:', err);
    return error(res, '获取团队类型失败', 500);
  }
});

/**
 * 创建活动
 * POST /api/miniapp/activities
 */
router.post('/activities', authenticateToken, async (req, res) => {
  try {
    const { 
      title, 
      description, 
      activity_type, 
      visibility,  // ✅ 添加 visibility 字段
      team_id, 
      start_time, 
      end_time, 
      location, 
      max_participants,
      enable_participant_limit,
      min_participants,
      registration_deadline,
      require_approval,
      is_free,
      base_fee
    } = req.body;

    console.log('🔍 创建活动请求数据:', {
      title,
      visibility,
      team_id,
      activity_type
    });

    if (!title || title.trim().length < 2) {
      return error(res, '活动标题至少2个字符', 400);
    }

    // ✅ 验证公开活动时不需要团队，团队活动时必须有团队
    if (visibility === 'team' && !team_id) {
      return error(res, '团队活动必须指定团队', 400);
    }

    // 保存到数据库
    const { Activity, User } = require('../models');
    const { v4: uuidv4 } = require('uuid');

    // 创建活动数据
    const activityData = {
      id: uuidv4(),
      title: title.trim(),
      description: description || '',
      type: activity_type || 'other',
      visibility: visibility || 'public',
      team_id: team_id || null,
      start_time: start_time || null,
      end_time: end_time || null,
      location: location || null,
      enable_participant_limit: enable_participant_limit !== false,
      min_participants: min_participants || 3,
      max_participants: max_participants || null,
      current_participants: 0,
      status: 'published',
      creator_id: req.user.id,
      registration_deadline: registration_deadline || null,
      require_approval: require_approval || false,
      is_free: is_free !== false,
      base_fee: base_fee || 0
    };

    console.log('📋 最终活动数据:', activityData);

    // 保存到数据库
    const activity = await Activity.create(activityData);

    // 获取完整的活动数据（包含关联信息）
    const createdActivity = await Activity.findByPk(activity.id, {
      include: [
        {
          model: require('../models').Team,
          as: 'team',
          attributes: ['id', 'name', 'avatar_url']
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'username']
        }
      ]
    });

    // 格式化返回数据
    const responseData = {
      id: createdActivity.id,
      title: createdActivity.title,
      description: createdActivity.description,
      activity_type: createdActivity.type,
      visibility: createdActivity.visibility,
      start_time: createdActivity.start_time,
      end_time: createdActivity.end_time,
      location: createdActivity.location,
      enable_participant_limit: createdActivity.enable_participant_limit,
      min_participants: createdActivity.min_participants,
      max_participants: createdActivity.max_participants,
      registration_count: createdActivity.registration_count || 0,
      status: createdActivity.status,
      team: createdActivity.team ? {
        id: createdActivity.team.id,
        name: createdActivity.team.name,
        avatar_url: createdActivity.team.avatar_url
      } : null,
      creator: createdActivity.creator ? {
        id: createdActivity.creator.id,
        username: createdActivity.creator.username
      } : null,
      creator_name: createdActivity.creator ? createdActivity.creator.username : '未知',
      created_at: createdActivity.created_at
    };

    logger.info(`小程序用户 ${req.user.username} 创建活动: ${title}`);
    return success(res, responseData, '活动创建成功', 201);

  } catch (err) {
    logger.error('创建活动失败:', err);
    return error(res, '创建活动失败', 500);
  }
});

/**
 * 创建团队 (小程序版本)
 * POST /api/miniapp/teams
 */
router.post('/teams', authenticateToken, async (req, res) => {
  try {
    const { name, description, avatar_url, team_type = 'general' } = req.body;

    if (!name || name.trim().length < 2) {
      return error(res, '团队名称至少2个字符', 400);
    }

    // 从数据库创建团队
    const { Team } = require('../models');
    const { Op } = require('sequelize');

    // 检查团队名称是否已存在
    const existingTeam = await Team.findOne({
      where: {
        name: name.trim(),
        status: {
          [Op.ne]: 'dissolved'
        }
      }
    });

    if (existingTeam) {
      return error(res, '团队名称已存在', 400);
    }

    // 创建团队
    const team = await Team.create({
      name: name.trim(),
      description: description || '',
      avatar_url: avatar_url || null,
      team_type,
      creator_id: req.user.id,
      status: 'active'
    });

    // 获取完整的团队信息
    const fullTeam = await Team.findByPk(team.id, {
      include: [
        {
          model: require('../models').User,
          as: 'creator',
          attributes: ['id', 'username']
        }
      ]
    });

    // 格式化返回数据
    const formattedTeam = {
      id: fullTeam.id,
      name: fullTeam.name,
      description: fullTeam.description,
      avatar_url: fullTeam.avatar_url,
      team_type: fullTeam.team_type,
      status: fullTeam.status,
      member_count: 1, // 创建者自动成为成员
      creator: fullTeam.creator ? {
        id: fullTeam.creator.id,
        username: fullTeam.creator.username
      } : null,
      created_at: fullTeam.created_at
    };

    logger.info(`小程序用户 ${req.user.username} 创建团队: ${name}`);
    return success(res, formattedTeam, '团队创建成功', 201);


  } catch (err) {
    logger.error('创建团队失败:', err);
    return error(res, '创建团队失败', 500);
  }
});

/**
 * 根据角色获取小程序权限列表
 */
function getMiniappPermissions(role) {
  const permissions = {
    super_admin: ['miniapp:read', 'miniapp:create', 'miniapp:update', 'miniapp:delete'],
    system_admin: ['miniapp:read', 'miniapp:create', 'miniapp:update', 'miniapp:delete'],
    operation_admin: ['miniapp:read', 'miniapp:create', 'miniapp:update'],
    team_admin: ['miniapp:read', 'miniapp:create', 'miniapp:update'],
    admin: ['miniapp:read', 'miniapp:create', 'miniapp:update', 'miniapp:delete'],
    user: ['miniapp:read', 'miniapp:create']
  };

  return permissions[role] || ['miniapp:read'];
}

// ==================== 费用相关接口 ====================

// 获取活动费用信息（小程序用）
router.get('/activities/:id/cost', async (req, res) => {
  try {
    const { Activity } = require('../models');
    const { id } = req.params;

    const activity = await Activity.findByPk(id);
    if (!activity) {
      return error(res, '活动不存在', 404);
    }

    const costs = activity.calculateCosts();

    return success(res, {
      activity_id: activity.id,
      title: activity.title,
      total_cost: parseFloat(activity.total_cost),
      company_ratio: parseFloat(activity.company_ratio),
      cost_per_person: parseFloat(activity.cost_per_person),
      payment_deadline: activity.payment_deadline,
      cost_description: activity.cost_description,
      costs: {
        total_cost: parseFloat(costs.totalCost),
        company_cost: parseFloat(costs.companyCost),
        employee_total_cost: parseFloat(costs.employeeTotalCost),
        cost_per_person: parseFloat(costs.costPerPerson),
        participant_count: costs.participantCount
      }
    }, '获取活动费用信息成功');

  } catch (err) {
    logger.error('获取活动费用信息失败:', err);
    return error(res, '获取费用信息失败', 500);
  }
});

// 获取用户在某活动的费用信息
router.get('/activities/:id/my-cost', async (req, res) => {
  try {
    const { Activity, ActivityParticipant } = require('../models');
    const { id } = req.params;
    const userId = req.headers['x-user-id']; // 从小程序传递的用户ID

    if (!userId) {
      return error(res, '用户ID不能为空', 400);
    }

    const activity = await Activity.findByPk(id);
    if (!activity) {
      return error(res, '活动不存在', 404);
    }

    // 查找用户的参与记录
    const participant = await ActivityParticipant.findOne({
      where: {
        activity_id: id,
        user_id: userId
      }
    });

    if (!participant) {
      return error(res, '您尚未报名此活动', 404);
    }

    const costs = activity.calculateCosts();

    return success(res, {
      activity: {
        id: activity.id,
        title: activity.title,
        total_cost: parseFloat(activity.total_cost),
        company_ratio: parseFloat(activity.company_ratio),
        payment_deadline: activity.payment_deadline,
        cost_description: activity.cost_description
      },
      costs: {
        total_cost: parseFloat(costs.totalCost),
        company_cost: parseFloat(costs.companyCost),
        cost_per_person: parseFloat(costs.costPerPerson)
      },
      my_payment: {
        payment_status: participant.payment_status,
        payment_amount: parseFloat(participant.payment_amount),
        payment_time: participant.payment_time,
        payment_method: participant.payment_method,
        payment_note: participant.payment_note
      }
    }, '获取个人费用信息成功');

  } catch (err) {
    logger.error('获取个人费用信息失败:', err);
    return error(res, '获取个人费用信息失败', 500);
  }
});

// 用户报名活动（自动计算费用）
router.post('/activities/:id/register-with-cost', async (req, res) => {
  try {
    const { Activity, ActivityParticipant, User } = require('../models');
    const { id } = req.params;
    const userId = req.headers['x-user-id']; // 从小程序传递的用户ID

    if (!userId) {
      return error(res, '用户ID不能为空', 400);
    }

    const activity = await Activity.findByPk(id);
    if (!activity) {
      return error(res, '活动不存在', 404);
    }

    // 检查是否可以参与
    if (!activity.canParticipate()) {
      return error(res, '活动不可参与', 400);
    }

    // 检查是否已经报名
    const existingParticipant = await ActivityParticipant.findOne({
      where: {
        activity_id: id,
        user_id: userId
      }
    });

    if (existingParticipant) {
      return error(res, '您已经报名了此活动', 400);
    }

    // 创建参与记录
    const participant = await ActivityParticipant.create({
      activity_id: id,
      user_id: userId,
      status: 'registered',
      payment_status: 'unpaid',
      payment_amount: 0 // 先设为0，后面会更新
    });

    // 更新活动的每人费用
    const costs = await activity.updateCostPerPerson();

    // 更新参与者的应付金额
    await participant.update({
      payment_amount: costs.costPerPerson
    });

    return success(res, {
      participant,
      activity: {
        id: activity.id,
        title: activity.title,
        current_participants: activity.current_participants
      },
      costs,
      payment_amount: parseFloat(costs.costPerPerson)
    }, '报名成功');

  } catch (err) {
    logger.error('报名活动失败:', err);
    return error(res, '报名失败: ' + err.message, 500);
  }
});

// 用户更新支付状态
router.put('/activities/:id/my-payment', async (req, res) => {
  try {
    const { ActivityParticipant } = require('../models');
    const { id } = req.params;
    const userId = req.headers['x-user-id'];
    const { payment_status, payment_method, payment_note } = req.body;

    if (!userId) {
      return error(res, '用户ID不能为空', 400);
    }

    if (!['paid', 'unpaid'].includes(payment_status)) {
      return error(res, '支付状态参数无效', 400);
    }

    const participant = await ActivityParticipant.findOne({
      where: {
        activity_id: id,
        user_id: userId
      }
    });

    if (!participant) {
      return error(res, '参与记录不存在', 404);
    }

    await participant.updatePaymentStatus({
      payment_status,
      payment_method,
      payment_note
    });

    return success(res, {
      payment_status: participant.payment_status,
      payment_time: participant.payment_time,
      payment_method: participant.payment_method,
      payment_note: participant.payment_note
    }, '支付状态更新成功');

  } catch (err) {
    logger.error('更新支付状态失败:', err);
    return error(res, '更新支付状态失败', 500);
  }
});

/**
 * 申请加入团队 (小程序版本)
 * POST /api/miniapp/teams/:id/apply
 */
router.post('/teams/:id/apply', authenticateToken, async (req, res) => {
  try {
    const { id: teamId } = req.params;
    const { reason } = req.body;
    const userId = req.user.id;

    // 检查团队是否存在
    const { Team } = require('../models');
    const team = await Team.findByPk(teamId);
    if (!team) {
      return error(res, '团队不存在', 404);
    }

    // 检查用户是否可以申请
    const canApplyResult = await Team.canUserApply(teamId, userId);
    if (!canApplyResult.canApply) {
      return error(res, canApplyResult.reason, 400);
    }

    // 创建申请
    const { TeamApplication } = require('../models');
    const application = await TeamApplication.create({
      teamId,
      userId,
      reason: reason || '申请加入团队',
      status: 'pending'
    });

    logger.info(`小程序用户 ${req.user.username} 申请加入团队 ${team.name}`);
    return success(res, {
      id: application.id,
      status: application.status,
      applicationTime: application.applicationTime
    }, '申请提交成功，请等待审核');

  } catch (err) {
    logger.error('申请加入团队失败:', err);
    return error(res, '申请失败，请稍后重试', 500);
  }
});

/**
 * 获取我的申请记录 (小程序版本)
 * GET /api/miniapp/my-team-applications
 */
router.get('/my-team-applications', authenticateToken, async (req, res) => {
  try {
    console.log('=== MINIAPP MY-APPLICATIONS ROUTE HIT ===');
    console.log('User:', req.user.username);
    console.log('Path:', req.path);
    console.log('Original URL:', req.originalUrl);

    const { status, page = 1, limit = 20 } = req.query;
    const userId = req.user.id;

    // 由于team_applications表不存在，暂时返回空的申请列表
    // 这是一个临时解决方案，直到申请系统完全实现
    const applications = [];
    const count = 0;

    const pagination = {
      page: parseInt(page),
      limit: parseInt(limit),
      total: count,
      pages: Math.ceil(count / parseInt(limit))
    };

    logger.info(`小程序用户 ${req.user.username} 获取我的申请记录，共 ${count} 条记录`);
    return success(res, { applications, pagination }, '获取申请记录成功');

  } catch (err) {
    console.log('=== MINIAPP MY-APPLICATIONS ERROR ===');
    console.error(err);
    logger.error('获取我的申请记录失败:', err);
    return error(res, '获取申请记录失败', 500);
  }
});

/**
 * 获取团队申请列表（团队负责人用）
 * GET /api/miniapp/teams/:id/applications
 */
router.get('/teams/:id/applications', authenticateToken, async (req, res) => {
  try {
    console.log('=== TEAMS/:ID/APPLICATIONS ROUTE HIT ===');
    console.log('Team ID param:', req.params.id);
    console.log('Path:', req.path);
    console.log('Original URL:', req.originalUrl);

    const { id: teamId } = req.params;
    const { status, page = 1, limit = 20 } = req.query;
    const userId = req.user.id;

    // 检查用户是否是该团队的负责人
    const { Team, TeamApplication } = require('../models');
    const team = await Team.findByPk(teamId);

    if (!team) {
      console.log('Team not found with ID:', teamId);
      return error(res, '团队不存在', 404);
    }

    if (team.creator_id !== userId) {
      return error(res, '只有团队负责人可以查看申请列表', 403);
    }

    const where = { team_id: teamId };
    if (status && ['pending', 'approved', 'rejected', 'cancelled'].includes(status)) {
      where.status = status;
    }

    const { count, rows } = await TeamApplication.findAndCountAll({
      where,
      include: [
        {
          model: require('../models').User,
          as: 'user',
          attributes: ['id', 'username', 'profile']
        }
      ],
      order: [['application_time', 'DESC']],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    });

    const applications = rows.map(application => ({
      id: application.id,
      team_id: application.team_id,
      user_id: application.user_id,
      reason: application.reason,
      status: application.status,
      application_time: application.application_time,
      approved_at: application.approved_at,
      approved_by: application.approved_by,
      rejected_at: application.rejected_at,
      rejected_by: application.rejected_by,
      rejection_reason: application.rejection_reason,
      user: application.user ? {
        id: application.user.id,
        username: application.user.username,
        profile: application.user.profile
      } : null,
      created_at: application.created_at,
      updated_at: application.updated_at
    }));

    const pagination = {
      page: parseInt(page),
      limit: parseInt(limit),
      total: count,
      pages: Math.ceil(count / parseInt(limit))
    };

    logger.info(`小程序用户 ${req.user.username} 获取团队申请列表，共 ${count} 条记录`);
    return success(res, { applications, pagination }, '获取团队申请列表成功');

  } catch (err) {
    logger.error('获取团队申请列表失败:', err);
    return error(res, '获取团队申请列表失败', 500);
  }
});

/**
 * 获取团队成员列表
 * GET /api/miniapp/teams/:id/members
 */
router.get('/teams/:id/members', authenticateToken, async (req, res) => {
  try {
    const { id: teamId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const { Team, TeamMember, User } = require('../models');

    // 检查团队是否存在
    const team = await Team.findByPk(teamId);
    if (!team) {
      return error(res, '团队不存在', 404);
    }

    const { count, rows } = await TeamMember.findAndCountAll({
      where: { team_id: teamId },
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'profile']
        }
      ],
      order: [['joined_at', 'DESC']],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    });

    const members = rows.map(member => ({
      id: member.id,
      team_id: member.team_id,
      user_id: member.user_id,
      role: member.role,
      joined_at: member.joined_at,
      user: member.user ? {
        id: member.user.id,
        username: member.user.username,
        profile: member.user.profile
      } : null
    }));

    const pagination = {
      page: parseInt(page),
      limit: parseInt(limit),
      total: count,
      pages: Math.ceil(count / parseInt(limit))
    };

    logger.info(`小程序用户 ${req.user.username} 获取团队成员列表，共 ${count} 名成员`);
    return success(res, { members, pagination }, '获取团队成员列表成功');

  } catch (err) {
    logger.error('获取团队成员列表失败:', err);
    return error(res, '获取团队成员列表失败', 500);
  }
});

/**
 * 更新团队设置
 * PUT /api/miniapp/teams/:teamId/settings
 */
router.put('/teams/:teamId/settings', authenticateToken, async (req, res) => {
  try {
    const { teamId } = req.params;
    const { require_approval } = req.body;
    const userId = req.user.id;

    // 导入所需的模型
    const { Team, TeamMember } = require('../models');

    // 检查用户是否是团队管理员
    const teamMember = await TeamMember.findOne({
      where: {
        team_id: teamId,
        user_id: userId,
        role: 'admin'
      }
    });

    if (!teamMember) {
      return error(res, '您没有权限修改团队设置', 403);
    }

    // 更新团队设置
    const team = await Team.findByPk(teamId);
    if (!team) {
      return error(res, '团队不存在', 404);
    }

    await team.update({
      require_approval: require_approval
    });

    logger.info(`团队管理员 ${req.user.username} 更新了团队 ${teamId} 的设置`);
    return success(res, '团队设置更新成功', { team });

  } catch (err) {
    logger.error('更新团队设置失败:', err);
    return error(res, '更新团队设置失败', 500);
  }
});

/**
 * 获取团队的待审核申请列表
 * GET /api/miniapp/teams/:teamId/applications
 */
router.get('/teams/:teamId/applications', authenticateToken, async (req, res) => {
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
          attributes: ['id', 'username', 'profile']
        }
      ],
      order: [['applied_at', 'ASC']]
    });

    logger.info(`小程序团队管理员 ${req.user.username} 查看团队 ${teamId} 的待审核申请，共 ${applications.length} 条`);
    return success(res, '获取待审核申请成功', { applications });

  } catch (err) {
    logger.error('获取待审核申请失败:', err);
    return error(res, '获取待审核申请失败', 500);
  }
});

/**
 * 批准申请
 * POST /api/miniapp/teams/:teamId/applications/:applicationId/approve
 */
router.post('/teams/:teamId/applications/:applicationId/approve', authenticateToken, async (req, res) => {
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

    logger.info(`小程序团队管理员 ${req.user.username} 批准了申请 ${applicationId}`);
    return success(res, '申请已批准', { application: approvedApplication });

  } catch (err) {
    logger.error('批准申请失败:', err);
    return error(res, err.message || '批准申请失败', 500);
  }
});

/**
 * 拒绝申请
 * POST /api/miniapp/teams/:teamId/applications/:applicationId/reject
 */
router.post('/teams/:teamId/applications/:applicationId/reject', authenticateToken, async (req, res) => {
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

    logger.info(`小程序团队管理员 ${req.user.username} 拒绝了申请 ${applicationId}`);
    return success(res, '申请已拒绝', { application: rejectedApplication });

  } catch (err) {
    logger.error('拒绝申请失败:', err);
    return error(res, err.message || '拒绝申请失败', 500);
  }
});

module.exports = router;