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

// 临时测试数据 (与小程序前端页面显示的测试账号保持一致)
const testUsersTemp = [
  {
    id: 'test-admin-id',
    username: 'admin',
    password: 'admin123',  // 与小程序前端显示的测试账号一致
    email: 'admin@example.com',
    role: 'admin',
    status: 'active',
    profile: { name: '管理员' }
  },
  {
    id: 'test-user-id',
    username: 'testuser',  // 与小程序前端显示的测试账号一致
    password: 'testpass123',  // 与小程序前端显示的测试账号一致
    email: 'testuser@example.com',
    role: 'user',
    status: 'active',
    profile: { name: '测试用户' }
  }
];

const activitiesTemp = [
  {
    id: 'activity-1',
    title: '团队周会',
    description: '讨论本周工作进展和下周计划',
    type: 'meeting',
    start_time: '2025-01-15T09:00:00.000Z',
    end_time: '2025-01-15T10:00:00.000Z',
    location: '会议室A',
    max_participants: 20,
    current_participants: 8,
    status: 'published',
    team: { id: 'team-1', name: '开发团队', avatar_url: null },
    creator: { id: 'test-admin-id', username: 'admin' },
    created_at: '2025-01-12T06:50:00.000Z'
  },
  {
    id: 'activity-2',
    title: '技术分享会',
    description: '分享最新的前端技术趋势',
    type: 'training',
    start_time: '2025-01-16T14:00:00.000Z',
    end_time: '2025-01-16T16:00:00.000Z',
    location: '培训室B',
    max_participants: 30,
    current_participants: 15,
    status: 'published',
    team: { id: 'team-1', name: '开发团队', avatar_url: null },
    creator: { id: 'test-admin-id', username: 'admin' },
    created_at: '2025-01-12T07:30:00.000Z'
  },
  {
    id: 'activity-3',
    title: '团建活动',
    description: '户外团建，增进团队感情',
    type: 'event',
    start_time: '2025-01-18T10:00:00.000Z',
    end_time: '2025-01-18T18:00:00.000Z',
    location: '公园',
    max_participants: 50,
    current_participants: 25,
    status: 'published',
    team: { id: 'team-2', name: '运营团队', avatar_url: null },
    creator: { id: 'test-user-id', username: 'user' },
    created_at: '2025-01-12T08:15:00.000Z'
  }
];

const teamsTemp = [
  {
    id: 'team-1',
    name: '开发团队',
    description: '负责产品开发和技术实现',
    avatar_url: null,
    team_type: 'development',
    status: 'active',
    member_count: 8,
    creator: { id: 'test-admin-id', username: 'admin' },
    created_at: '2025-01-10T09:00:00.000Z'
  },
  {
    id: 'team-2',
    name: '运营团队',
    description: '负责产品运营和市场推广',
    avatar_url: null,
    team_type: 'operation',
    status: 'active',
    member_count: 5,
    creator: { id: 'test-user-id', username: 'user' },
    created_at: '2025-01-10T10:30:00.000Z'
  },
  {
    id: 'team-3',
    name: '设计团队',
    description: '负责UI/UX设计',
    avatar_url: null,
    team_type: 'design',
    status: 'active',
    member_count: 3,
    creator: { id: 'test-admin-id', username: 'admin' },
    created_at: '2025-01-10T11:15:00.000Z'
  }
];

const activityTypesTemp = [
  { id: 'meeting', name: '会议', description: '团队会议、讨论会等', isDefault: true },
  { id: 'training', name: '培训', description: '技能培训、学习分享等', isDefault: true },
  { id: 'event', name: '活动', description: '团建、聚会等活动', isDefault: true },
  { id: 'workshop', name: '工作坊', description: '实践性学习活动', isDefault: true },
  { id: 'other', name: '其他', description: '其他类型活动', isDefault: true }
];

const teamTypesTemp = [
  { id: 'general', name: '通用团队', description: '通用类型的团队', isDefault: true },
  { id: 'development', name: '开发团队', description: '软件开发团队', isDefault: true },
  { id: 'operation', name: '运营团队', description: '产品运营团队', isDefault: true },
  { id: 'design', name: '设计团队', description: 'UI/UX设计团队', isDefault: true },
  { id: 'testing', name: '测试团队', description: '质量保证团队', isDefault: true }
];

/**
 * 小程序用户登录
 * POST /api/miniapp/login
 * TODO: 函数复杂度较高(60行)，建议拆分为多个小函数：validateUser、generateToken、formatResponse
 */
router.post('/login', validate(miniappLoginSchema), async (req, res) => {
  try {
    const { username, password } = req.body;

    let user;
    
    try {
      // 首先尝试从数据库查找真实用户
      const { User } = require('../models');
      user = await User.findByUsername(username);
      
      if (user) {
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
        
        logger.info(`管理后台用户通过小程序登录成功: ${username} - IP: ${req.ip}`);
      }
    } catch (dbError) {
      logger.warn('数据库查询失败，使用临时测试数据:', dbError.message);
      
      // 数据库查询失败时，降级到测试用户
      user = testUsersTemp.find(u => u.username === username);
      if (!user) {
        return unauthorized(res, '用户名或密码错误');
      }

      // 检查账户状态
      if (user.status !== 'active') {
        return unauthorized(res, '账户已被禁用，请联系管理员');
      }

      // 验证密码 (简单比较)
      if (user.password !== password) {
        return unauthorized(res, '用户名或密码错误');
      }
      
      logger.info(`测试用户通过小程序登录成功: ${username} - IP: ${req.ip}`);
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

    try {
      // 首先尝试从数据库获取真实数据
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
        whereConditions.activity_type = type;
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
        order: [['created_at', 'DESC']],
        limit: parseInt(limit),
        offset: (parseInt(page) - 1) * parseInt(limit)
      });

      // 格式化返回数据 (适合小程序显示)
      const activities = activityRows.map(activity => ({
        id: activity.id,
        title: activity.title,
        description: activity.description,
        activity_type: activity.activity_type,
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
      }));

      const pagination = {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / parseInt(limit))
      };

      logger.info(`小程序用户 ${req.user.username} 获取活动列表，共 ${count} 个活动 (数据库查询)`);
      return success(res, { activities, pagination }, '获取活动列表成功');

    } catch (dbError) {
      logger.warn('数据库查询失败，使用临时测试数据:', dbError.message);
      
      // 数据库查询失败时，降级到测试数据
      let filteredActivities = activitiesTemp;
      
      if (search) {
        filteredActivities = filteredActivities.filter(activity => 
          activity.title.includes(search) || activity.description.includes(search)
        );
      }
      
      if (status) {
        filteredActivities = filteredActivities.filter(activity => activity.status === status);
      }
      
      if (type) {
        filteredActivities = filteredActivities.filter(activity => activity.type === type);
      }

      const offset = (parseInt(page) - 1) * parseInt(limit);
      const paginatedActivities = filteredActivities.slice(offset, offset + parseInt(limit));

      const pagination = {
        page: parseInt(page),
        limit: parseInt(limit),
        total: filteredActivities.length,
        pages: Math.ceil(filteredActivities.length / parseInt(limit))
      };

      logger.info(`小程序用户 ${req.user.username} 获取活动列表，共 ${filteredActivities.length} 个活动 (临时数据)`);
      return success(res, { activities: paginatedActivities, pagination }, '获取活动列表成功');
    }

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
    const activity = activitiesTemp.find(a => a.id === id);

    if (!activity) {
      return error(res, '活动不存在', 404);
    }

    logger.info(`小程序用户 ${req.user.username} 查看活动详情: ${activity.title}`);
    return success(res, activity, '获取活动详情成功');

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

    let teams;
    
    try {
      // 首先尝试从数据库查询真实团队数据
      const { Team, User } = require('../models');
      
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

      // 格式化返回数据 (适合小程序显示)
      teams = teamRows.map(team => ({
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
        created_at: team.created_at
      }));

      const pagination = {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / parseInt(limit))
      };

      logger.info(`小程序用户 ${req.user.username} 获取团队列表，共 ${count} 个团队 (数据库查询)`);
      return success(res, { teams, pagination }, '获取团队列表成功');

    } catch (dbError) {
      logger.warn('数据库查询失败，使用临时测试数据:', dbError.message);
      
      // 数据库查询失败时，降级到测试数据
      let filteredTeams = teamsTemp;
      
      if (search) {
        filteredTeams = filteredTeams.filter(team => team.name.includes(search));
      }
      
      if (team_type) {
        filteredTeams = filteredTeams.filter(team => team.team_type === team_type);
      }

      const offset = (parseInt(page) - 1) * parseInt(limit);
      const paginatedTeams = filteredTeams.slice(offset, offset + parseInt(limit));

      const pagination = {
        page: parseInt(page),
        limit: parseInt(limit),
        total: filteredTeams.length,
        pages: Math.ceil(filteredTeams.length / parseInt(limit))
      };

      logger.info(`小程序用户 ${req.user.username} 获取团队列表，共 ${filteredTeams.length} 个团队 (临时数据)`);
      return success(res, { 
        teams: paginatedTeams, 
        pagination,
        _warning: "此数据为临时测试数据，非真实数据库数据"
      }, '获取团队列表成功');
    }

  } catch (err) {
    logger.error('获取团队列表失败:', err);
    return error(res, '获取团队列表失败', 500);
  }
});

/**
 * 获取团队详情 (小程序版本)
 * GET /api/miniapp/teams/:id
 */
router.get('/teams/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    try {
      // 首先尝试从数据库查询真实团队数据
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

      logger.info(`小程序用户 ${req.user.username} 查看团队详情: ${team.name} (数据库查询)`);
      return success(res, formattedTeam, '获取团队详情成功');

    } catch (dbError) {
      logger.warn('数据库查询失败，使用临时测试数据:', dbError.message);
      
      // 数据库查询失败时，降级到测试数据
      const team = teamsTemp.find(t => t.id === id);

      if (!team) {
        return error(res, '团队不存在', 404);
      }

      logger.info(`小程序用户 ${req.user.username} 查看团队详情: ${team.name} (临时数据)`);
      return success(res, {
        ...team,
        _warning: "此数据为临时测试数据，非真实数据库数据"
      }, '获取团队详情成功');
    }

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
    // 首先尝试从数据库获取真实数据
    try {
      const { ActivityType } = require('../models');
      
      // 从数据库获取活动类型
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
      
      logger.info(`小程序用户 ${req.user.username} 获取活动类型列表，共 ${formattedTypes.length} 个类型 (数据库查询)`);
      return success(res, formattedTypes, '获取活动类型成功');
      
    } catch (dbError) {
      logger.warn('数据库操作失败，使用临时数据:', dbError.message);
      
      // 数据库操作失败时，降级到临时数据
      logger.info(`小程序用户 ${req.user.username} 获取活动类型列表，共 ${activityTypesTemp.length} 个类型 (临时数据)`);
      return success(res, activityTypesTemp, '获取活动类型成功');
    }
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
    logger.info(`小程序用户 ${req.user.username} 获取团队类型列表，共 ${teamTypesTemp.length} 个类型`);
    return success(res, teamTypesTemp, '获取团队类型成功');
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
    const { title, description, type, team_id, start_time, end_time, location, max_participants } = req.body;

    if (!title || title.trim().length < 2) {
      return error(res, '活动标题至少2个字符', 400);
    }

    const newActivity = {
      id: 'activity-' + Date.now(),
      title: title.trim(),
      description: description || '',
      type: type || 'other',
      start_time: start_time || null,
      end_time: end_time || null,
      location: location || null,
      max_participants: max_participants || null,
      current_participants: 0,
      status: 'draft',
      team: team_id ? teamsTemp.find(t => t.id === team_id) || teamsTemp[0] : teamsTemp[0],
      creator: { id: req.user.id, username: req.user.username },
      created_at: new Date().toISOString()
    };

    // 模拟添加到数据中
    activitiesTemp.push(newActivity);

    logger.info(`小程序用户 ${req.user.username} 创建活动: ${title}`);
    return success(res, newActivity, '活动创建成功', 201);

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

    try {
      // 首先尝试真实数据库操作
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

      logger.info(`小程序用户 ${req.user.username} 创建团队: ${name} (数据库保存)`);
      return success(res, formattedTeam, '团队创建成功', 201);

    } catch (dbError) {
      logger.warn('数据库操作失败，使用临时数据:', dbError.message);
      
      // 数据库操作失败时，降级到临时数据
      if (teamsTemp.find(t => t.name === name.trim())) {
        return error(res, '团队名称已存在', 400);
      }

      const newTeam = {
        id: 'team-' + Date.now(),
        name: name.trim(),
        description: description || '',
        avatar_url: avatar_url || null,
        team_type,
        status: 'active',
        member_count: 1,
        creator: { id: req.user.id, username: req.user.username },
        created_at: new Date().toISOString()
      };

      // 模拟添加到数据中
      teamsTemp.push(newTeam);

      logger.info(`小程序用户 ${req.user.username} 创建团队: ${name} (临时数据)`);
      return success(res, {
        ...newTeam,
        _warning: "此数据为临时测试数据，未保存到数据库"
      }, '团队创建成功', 201);
    }

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

module.exports = router;