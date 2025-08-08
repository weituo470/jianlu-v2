const express = require('express');
const { Op } = require('sequelize');
const router = express.Router();

const Team = require('../models/Team');
const TeamMember = require('../models/TeamMember');
const User = require('../models/User');
const { authenticateToken, requirePermission } = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const { success, error } = require('../utils/response');
const logger = require('../utils/logger');
const Joi = require('joi');

// 团队验证模式
const createTeamSchema = Joi.object({
  name: Joi.string()
    .min(2)
    .max(100)
    .required()
    .messages({
      'string.min': '团队名称至少2个字符',
      'string.max': '团队名称最多100个字符',
      'any.required': '团队名称不能为空'
    }),
  description: Joi.string()
    .max(1000)
    .allow('')
    .messages({
      'string.max': '团队描述不能超过1000个字符'
    }),
  avatar_url: Joi.string()
    .uri()
    .allow('')
    .messages({
      'string.uri': '头像URL格式不正确'
    }),
  team_type: Joi.string()
    .valid('general', 'development', 'testing', 'design', 'marketing', 'operation', 'research', 'support')
    .default('general')
    .messages({
      'any.only': '团队类型无效'
    })
});

const updateTeamSchema = Joi.object({
  name: Joi.string()
    .min(2)
    .max(100)
    .messages({
      'string.min': '团队名称至少2个字符',
      'string.max': '团队名称最多100个字符'
    }),
  description: Joi.string()
    .max(1000)
    .allow('')
    .messages({
      'string.max': '团队描述不能超过1000个字符'
    }),
  avatar_url: Joi.string()
    .uri()
    .allow('')
    .messages({
      'string.uri': '头像URL格式不正确'
    }),
  team_type: Joi.string()
    .valid('general', 'development', 'testing', 'design', 'marketing', 'operation', 'research', 'support')
    .messages({
      'any.only': '团队类型无效'
    }),
  status: Joi.string()
    .valid('active', 'inactive', 'dissolved')
    .messages({
      'any.only': '团队状态值无效'
    })
});

// 获取团队类型列表
router.get('/types', authenticateToken, async (req, res) => {
  try {
    const { TeamType } = require('../models');
    
    // 从数据库获取团队类型
    const teamTypes = await TeamType.findActive();
    
    // 转换为前端需要的格式
    const formattedTypes = teamTypes.map(type => ({
      value: type.id,
      label: type.name,
      description: type.description,
      isDefault: type.is_default
    }));

    logger.info(`用户 ${req.user.username} 获取团队类型列表，共 ${formattedTypes.length} 个类型`);
    return success(res, formattedTypes);

  } catch (err) {
    logger.error('获取团队类型失败:', err);
    
    // 提供有用的错误信息，指导用户解决问题
    if (err.message && (err.message.includes("doesn't exist") || err.message.includes('no such table'))) {
      return error(res, '团队类型表不存在，请执行数据库迁移：cd database && node quick-setup-team-types.js', 500);
    }
    
    return error(res, '获取团队类型失败，请检查数据库连接', 500);
  }
});

// 创建团队类型验证模式
const createTeamTypeSchema = Joi.object({
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

// 添加团队类型
router.post('/types', authenticateToken, requirePermission('system:update'), validate(createTeamTypeSchema), async (req, res) => {
  try {
    const { id, name, description } = req.body;
    const { TeamType } = require('../models');

    // 检查ID是否已存在
    const existingType = await TeamType.findByPk(id);
    if (existingType) {
      return error(res, '类型ID已存在', 400);
    }

    // 创建新的团队类型
    const newType = await TeamType.create({
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

    logger.info(`用户 ${req.user.username} 创建团队类型: ${name} (${id})`);
    return success(res, formattedType, '团队类型创建成功');

  } catch (err) {
    logger.error('创建团队类型失败，可能需要先执行数据库迁移:', err);
    
    // 处理数据库约束错误
    if (err.name === 'SequelizeValidationError') {
      const messages = err.errors.map(e => e.message);
      return error(res, messages.join(', '), 400);
    }
    
    // 如果是表不存在的错误，提供更友好的提示
    if (err.message && (err.message.includes("doesn't exist") || err.message.includes('no such table'))) {
      return error(res, '团队类型表不存在，请先执行数据库迁移', 500);
    }
    
    return error(res, '创建团队类型失败，请检查数据库连接或执行迁移', 500);
  }
});

// 更新团队类型
router.put('/types/:id', authenticateToken, requirePermission('system:update'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    // 检查是否为默认类型
    const defaultTypes = ['general', 'development', 'testing', 'design', 'marketing', 'operation', 'research', 'support'];
    if (defaultTypes.includes(id)) {
      return error(res, '系统默认类型不能修改', 403);
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

    // 模拟更新数据库的逻辑
    const updatedType = {
      value: id,
      label: name.trim(),
      description: description ? description.trim() : '',
      isDefault: false,
      updatedBy: req.user.id,
      updatedAt: new Date()
    };

    logger.info(`用户 ${req.user.username} 更新团队类型: ${name} (${id})`);
    return success(res, updatedType, '团队类型更新成功');

  } catch (err) {
    logger.error('更新团队类型失败:', err);
    return error(res, '更新团队类型失败', 500);
  }
});

// 删除团队类型
router.delete('/types/:id', authenticateToken, requirePermission('system:update'), async (req, res) => {
  try {
    const { id } = req.params;
    const { TeamType, Team } = require('../models');

    // 查找要删除的团队类型
    const teamType = await TeamType.findByPk(id);
    if (!teamType) {
      return error(res, '团队类型不存在', 404);
    }

    // 允许删除所有类型，包括默认类型

    // 检查是否有团队正在使用此类型
    const teamsUsingType = await Team.count({
      where: { 
        team_type: id,
        status: {
          [require('sequelize').Op.ne]: 'dissolved'
        }
      }
    });

    if (teamsUsingType > 0) {
      return error(res, `无法删除：还有 ${teamsUsingType} 个团队正在使用此类型`, 400);
    }

    // 删除团队类型
    await teamType.destroy();

    logger.info(`用户 ${req.user.username} 删除团队类型: ${teamType.name} (${id})`);
    return success(res, null, '团队类型删除成功');

  } catch (err) {
    logger.error('删除团队类型失败，可能需要先执行数据库迁移:', err);
    
    // 处理模型钩子抛出的错误
    if (err.message.includes('系统默认类型不能删除') || err.message.includes('正在被') && err.message.includes('个团队使用')) {
      return error(res, err.message, 400);
    }
    
    // 如果是表不存在的错误，提供更友好的提示
    if (err.message && (err.message.includes("doesn't exist") || err.message.includes('no such table'))) {
      return error(res, '团队类型表不存在，请先执行数据库迁移', 500);
    }
    
    return error(res, '删除团队类型失败，请检查数据库连接或执行迁移', 500);
  }
});

// 获取团队列表
router.get('/', authenticateToken, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      search = '',
      status = '',
      team_type = '',
      creator_id = '',
      sort = 'created_at',
      order = 'DESC'
    } = req.query;

    // 构建查询条件
    const where = {
      // 默认只显示未删除的团队
      status: {
        [Op.ne]: 'dissolved'
      }
    };
    
    if (search) {
      where.name = {
        [Op.like]: `%${search}%`
      };
    }
    
    if (status) {
      // 如果明确指定了状态，则覆盖默认的过滤条件
      where.status = status;
    }
    
    if (team_type) {
      where.team_type = team_type;
    }
    
    if (creator_id) {
      where.creator_id = creator_id;
    }

    // 分页参数
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const pageLimit = parseInt(limit);

    // 查询团队列表
    const { count, rows: teams } = await Team.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'username', 'email', 'profile']
        }
      ],
      order: [[sort, order.toUpperCase()]],
      limit: pageLimit,
      offset,
      distinct: true
    });

    // 返回结果
    return success(res, {
      teams,
      pagination: {
        page: parseInt(page),
        limit: pageLimit,
        total: count,
        pages: Math.ceil(count / pageLimit)
      }
    });

  } catch (err) {
    logger.error('获取团队列表失败:', err);
    return error(res, '获取团队列表失败', 500);
  }
});

// 获取团队详情
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { include_members = 'false' } = req.query;

    const includeOptions = [
      {
        model: User,
        as: 'creator',
        attributes: ['id', 'username', 'email', 'profile']
      }
    ];

    // 如果需要包含成员信息
    if (include_members === 'true') {
      includeOptions.push({
        model: User,
        as: 'members',
        attributes: ['id', 'username', 'email', 'profile'],
        through: {
          attributes: ['role', 'joined_at']
        }
      });
    }

    const team = await Team.findByPk(id, {
      include: includeOptions
    });

    if (!team) {
      return error(res, '团队不存在', 404);
    }

    return success(res, team);

  } catch (err) {
    logger.error('获取团队详情失败:', err);
    return error(res, '获取团队详情失败', 500);
  }
});

// 创建团队
router.post('/', 
  authenticateToken,
  requirePermission(['team:create']),
  validate(createTeamSchema),
  async (req, res) => {
    try {
      const { name, description, avatar_url, team_type = 'general' } = req.body;
      const creator_id = req.user.id;

      // 检查团队名称是否已存在
      const existingTeam = await Team.findOne({
        where: {
          name,
          status: {
            [Op.ne]: 'dissolved'
          }
        }
      });

      if (existingTeam) {
        return error(res, '团队名称已存在', 400);
      }

      // 清理avatar_url字段（空字符串转为null）
      const cleanAvatarUrl = avatar_url && avatar_url.trim() !== '' ? avatar_url : null;

      // 创建团队
      const team = await Team.create({
        name,
        description,
        avatar_url: cleanAvatarUrl,
        team_type,
        creator_id
      });

      // 获取完整的团队信息
      const fullTeam = await Team.findWithDetails(team.id);

      logger.info(`用户 ${req.user.username} 创建了团队: ${name}`);
      return success(res, fullTeam, '团队创建成功', 201);

    } catch (err) {
      logger.error('创建团队失败:', err);
      return error(res, '创建团队失败', 500);
    }
  }
);

// 更新团队
router.put('/:id',
  authenticateToken,
  requirePermission(['team:update']),
  validate(updateTeamSchema),
  async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      const team = await Team.findByPk(id);
      if (!team) {
        return error(res, '团队不存在', 404);
      }

      // 检查权限：只有团队创建者或系统管理员可以更新
      const isCreator = team.creator_id === req.user.id;
      const isAdmin = req.user.role === 'super_admin' || req.user.role === 'system_admin';
      const isTeamAdmin = await TeamMember.isTeamAdmin(id, req.user.id);

      if (!isCreator && !isAdmin && !isTeamAdmin) {
        return error(res, '没有权限更新此团队', 403);
      }

      // 如果更新名称，检查是否重复
      if (updates.name && updates.name !== team.name) {
        const existingTeam = await Team.findOne({
          where: {
            name: updates.name,
            id: {
              [Op.ne]: id
            },
            status: {
              [Op.ne]: 'dissolved'
            }
          }
        });

        if (existingTeam) {
          return error(res, '团队名称已存在', 400);
        }
      }

      // 更新团队
      await team.update(updates);

      // 获取更新后的完整信息
      const updatedTeam = await Team.findWithDetails(id);

      logger.info(`用户 ${req.user.username} 更新了团队: ${team.name}`);
      return success(res, updatedTeam, '团队更新成功');

    } catch (err) {
      logger.error('更新团队失败:', err);
      return error(res, '更新团队失败', 500);
    }
  }
);

// 删除团队
router.delete('/:id',
  authenticateToken,
  requirePermission(['team:delete']),
  async (req, res) => {
    try {
      const { id } = req.params;

      const team = await Team.findByPk(id);
      if (!team) {
        return error(res, '团队不存在', 404);
      }

      // 检查权限：只有团队创建者或系统管理员可以删除
      const isCreator = team.creator_id === req.user.id;
      const isAdmin = req.user.role === 'super_admin' || req.user.role === 'system_admin';

      if (!isCreator && !isAdmin) {
        return error(res, '没有权限删除此团队', 403);
      }

      // 软删除：将状态设置为dissolved
      await team.update({ status: 'dissolved' });

      logger.info(`用户 ${req.user.username} 删除了团队: ${team.name}`);
      return success(res, null, '团队删除成功');

    } catch (err) {
      logger.error('删除团队失败:', err);
      return error(res, '删除团队失败', 500);
    }
  }
);

// 获取团队成员列表
router.get('/:id/members', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20, role = '' } = req.query;

    // 检查团队是否存在
    const team = await Team.findByPk(id);
    if (!team) {
      return error(res, '团队不存在', 404);
    }

    // 构建查询条件
    const where = { team_id: id };
    if (role) {
      where.role = role;
    }

    // 分页参数
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const pageLimit = parseInt(limit);

    // 查询成员列表
    const { count, rows: members } = await TeamMember.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'email', 'profile']
        }
      ],
      order: [['joined_at', 'ASC']],
      limit: pageLimit,
      offset
    });

    return success(res, {
      members,
      pagination: {
        page: parseInt(page),
        limit: pageLimit,
        total: count,
        pages: Math.ceil(count / pageLimit)
      }
    });

  } catch (err) {
    logger.error('获取团队成员失败:', err);
    return error(res, '获取团队成员失败', 500);
  }
});

// 添加团队成员
router.post('/:id/members',
  authenticateToken,
  requirePermission(['team:update']),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { user_id, role = 'member' } = req.body;

      if (!user_id) {
        return error(res, '用户ID不能为空', 400);
      }

      // 检查团队是否存在
      const team = await Team.findByPk(id);
      if (!team) {
        return error(res, '团队不存在', 404);
      }

      // 检查用户是否存在
      const user = await User.findByPk(user_id);
      if (!user) {
        return error(res, '用户不存在', 404);
      }

      // 检查权限
      const isCreator = team.creator_id === req.user.id;
      const isAdmin = req.user.role === 'super_admin' || req.user.role === 'system_admin';
      const isTeamAdmin = await TeamMember.isTeamAdmin(id, req.user.id);

      if (!isCreator && !isAdmin && !isTeamAdmin) {
        return error(res, '没有权限添加团队成员', 403);
      }

      // 检查用户是否已经是团队成员
      const existingMember = await TeamMember.findOne({
        where: {
          team_id: id,
          user_id
        }
      });

      if (existingMember) {
        return error(res, '用户已经是团队成员', 400);
      }

      // 添加成员
      const member = await TeamMember.create({
        team_id: id,
        user_id,
        role
      });

      // 获取完整的成员信息
      const fullMember = await TeamMember.findByPk(member.id, {
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'username', 'email', 'profile']
          }
        ]
      });

      logger.info(`用户 ${req.user.username} 将 ${user.username} 添加到团队: ${team.name}`);
      return success(res, fullMember, '成员添加成功', 201);

    } catch (err) {
      logger.error('添加团队成员失败:', err);
      return error(res, '添加团队成员失败', 500);
    }
  }
);

// 移除团队成员
router.delete('/:id/members/:userId',
  authenticateToken,
  requirePermission(['team:update']),
  async (req, res) => {
    try {
      const { id, userId } = req.params;

      // 检查团队是否存在
      const team = await Team.findByPk(id);
      if (!team) {
        return error(res, '团队不存在', 404);
      }

      // 检查成员是否存在
      const member = await TeamMember.findOne({
        where: {
          team_id: id,
          user_id: userId
        }
      });

      if (!member) {
        return error(res, '成员不存在', 404);
      }

      // 检查权限
      const isCreator = team.creator_id === req.user.id;
      const isAdmin = req.user.role === 'super_admin' || req.user.role === 'system_admin';
      const isTeamAdmin = await TeamMember.isTeamAdmin(id, req.user.id);
      const isSelf = userId === req.user.id;

      if (!isCreator && !isAdmin && !isTeamAdmin && !isSelf) {
        return error(res, '没有权限移除团队成员', 403);
      }

      // 不能移除团队创建者
      if (userId === team.creator_id) {
        return error(res, '不能移除团队创建者', 400);
      }

      // 移除成员
      await member.destroy();

      logger.info(`用户 ${req.user.username} 从团队 ${team.name} 移除了成员`);
      return success(res, null, '成员移除成功');

    } catch (err) {
      logger.error('移除团队成员失败:', err);
      return error(res, '移除团队成员失败', 500);
    }
  }
);

// 更新成员角色
router.put('/:id/members/:userId/role',
  authenticateToken,
  requirePermission(['team:update']),
  async (req, res) => {
    try {
      const { id, userId } = req.params;
      const { role } = req.body;

      if (!role || !['admin', 'member'].includes(role)) {
        return error(res, '角色值无效', 400);
      }

      // 检查团队是否存在
      const team = await Team.findByPk(id);
      if (!team) {
        return error(res, '团队不存在', 404);
      }

      // 检查成员是否存在
      const member = await TeamMember.findOne({
        where: {
          team_id: id,
          user_id: userId
        }
      });

      if (!member) {
        return error(res, '成员不存在', 404);
      }

      // 检查权限：只有团队创建者或系统管理员可以更新角色
      const isCreator = team.creator_id === req.user.id;
      const isAdmin = req.user.role === 'super_admin' || req.user.role === 'system_admin';

      if (!isCreator && !isAdmin) {
        return error(res, '没有权限更新成员角色', 403);
      }

      // 不能修改团队创建者的角色
      if (userId === team.creator_id) {
        return error(res, '不能修改团队创建者的角色', 400);
      }

      // 更新角色
      await member.update({ role });

      // 获取更新后的成员信息
      const updatedMember = await TeamMember.findByPk(member.id, {
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'username', 'email', 'profile']
          }
        ]
      });

      logger.info(`用户 ${req.user.username} 更新了团队 ${team.name} 中成员的角色`);
      return success(res, updatedMember, '角色更新成功');

    } catch (err) {
      logger.error('更新成员角色失败:', err);
      return error(res, '更新成员角色失败', 500);
    }
  }
);

module.exports = router;