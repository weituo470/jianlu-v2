const express = require('express');
const { Op } = require('sequelize');
const router = express.Router();

const Organization = require('../models/Organization');
const OrganizationMember = require('../models/OrganizationMember');
const User = require('../models/User');
const { authenticateToken, requirePermission } = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const { success, error } = require('../utils/response');
const logger = require('../utils/logger');
const Joi = require('joi');

// 成员验证模式
const addMemberSchema = Joi.object({
  user_id: Joi.string()
    .uuid()
    .required()
    .messages({
      'string.uuid': '用户ID格式不正确',
      'any.required': '用户ID不能为空'
    }),
  role_id: Joi.string()
    .uuid()
    .allow(null)
    .messages({
      'string.uuid': '角色ID格式不正确'
    }),
  nickname: Joi.string()
    .max(50)
    .allow('')
    .messages({
      'string.max': '昵称不能超过50个字符'
    }),
  join_method: Joi.string()
    .valid('invite', 'qrcode', 'apply')
    .required()
    .messages({
      'any.only': '加入方式无效',
      'any.required': '加入方式不能为空'
    })
});

// 获取机构成员列表
router.get('/:organizationId/members', authenticateToken, async (req, res) => {
  try {
    const { organizationId } = req.params;
    const { 
      page = 1, 
      limit = 20, 
      status = 'active',
      role_id = '',
      search = ''
    } = req.query;

    // 检查机构是否存在
    const organization = await Organization.findByPk(organizationId);
    if (!organization) {
      return error(res, '机构不存在', 404);
    }

    // 构建查询条件
    const where = { organization_id: organizationId };
    
    if (status) {
      where.status = status;
    }
    
    if (role_id) {
      where.role_id = role_id;
    }

    // 分页参数
    const offset = (parseInt(page) - 1) * parseInt(limit);
    const pageLimit = parseInt(limit);

    // 构建用户搜索条件
    const userWhere = {};
    if (search) {
      userWhere[Op.or] = [
        { username: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } }
      ];
    }

    // 查询成员列表
    const { count, rows: members } = await OrganizationMember.findAndCountAll({
      where,
      include: [
        {
          model: User,
          as: 'user',
          attributes: ['id', 'username', 'email', 'profile'],
          where: Object.keys(userWhere).length > 0 ? userWhere : undefined
        },
        {
          model: require('../models/OrganizationRole'),
          as: 'role',
          attributes: ['id', 'name', 'permissions'],
          required: false
        }
      ],
      order: [['joined_at', 'ASC']],
      limit: pageLimit,
      offset,
      distinct: true
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
    logger.error('获取机构成员失败:', err);
    return error(res, '获取机构成员失败', 500);
  }
});

// 添加机构成员
router.post('/:organizationId/members',
  authenticateToken,
  requirePermission(['organization:manage_members']),
  validate(addMemberSchema),
  async (req, res) => {
    try {
      const { organizationId } = req.params;
      const { user_id, role_id, nickname, join_method } = req.body;

      // 检查机构是否存在
      const organization = await Organization.findByPk(organizationId);
      if (!organization) {
        return error(res, '机构不存在', 404);
      }

      // 检查用户是否存在
      const user = await User.findByPk(user_id);
      if (!user) {
        return error(res, '用户不存在', 404);
      }

      // 检查权限
      const isCreator = organization.creator_id === req.user.id;
      const isAdmin = req.user.role === 'super_admin' || req.user.role === 'system_admin';
      const hasPermission = await OrganizationMember.hasPermission(organizationId, req.user.id, 'organization:manage_members');

      if (!isCreator && !isAdmin && !hasPermission) {
        return error(res, '没有权限添加机构成员', 403);
      }

      // 检查用户是否已经是机构成员
      const existingMember = await OrganizationMember.findOne({
        where: {
          organization_id: organizationId,
          user_id
        }
      });

      if (existingMember) {
        return error(res, '用户已经是机构成员', 400);
      }

      // 检查加入方式是否被允许
      if (!organization.canUserJoin(join_method)) {
        return error(res, '该机构不允许此种加入方式', 400);
      }

      // 添加成员
      const member = await OrganizationMember.create({
        organization_id: organizationId,
        user_id,
        role_id: role_id || null,
        nickname: nickname || null,
        join_method,
        status: join_method === 'invite' ? 'active' : 'pending'
      });

      // 获取完整的成员信息
      const fullMember = await OrganizationMember.findByPk(member.id, {
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'username', 'email', 'profile']
          },
          {
            model: require('../models/OrganizationRole'),
            as: 'role',
            attributes: ['id', 'name', 'permissions'],
            required: false
          }
        ]
      });

      logger.info(`用户 ${req.user.username} 将 ${user.username} 添加到机构: ${organization.name}`);
      return success(res, fullMember, '成员添加成功', 201);

    } catch (err) {
      logger.error('添加机构成员失败:', err);
      return error(res, '添加机构成员失败', 500);
    }
  }
);

// 审核成员申请
router.put('/:organizationId/members/:memberId/approve',
  authenticateToken,
  requirePermission(['organization:approve_members']),
  async (req, res) => {
    try {
      const { organizationId, memberId } = req.params;
      const { approved } = req.body;

      // 检查机构是否存在
      const organization = await Organization.findByPk(organizationId);
      if (!organization) {
        return error(res, '机构不存在', 404);
      }

      // 检查成员是否存在
      const member = await OrganizationMember.findOne({
        where: {
          id: memberId,
          organization_id: organizationId
        },
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'username', 'email']
          }
        ]
      });

      if (!member) {
        return error(res, '成员不存在', 404);
      }

      // 检查权限
      const isCreator = organization.creator_id === req.user.id;
      const isAdmin = req.user.role === 'super_admin' || req.user.role === 'system_admin';
      const hasPermission = await OrganizationMember.hasPermission(organizationId, req.user.id, 'organization:approve_members');

      if (!isCreator && !isAdmin && !hasPermission) {
        return error(res, '没有权限审核成员申请', 403);
      }

      // 更新成员状态
      const newStatus = approved ? 'active' : 'inactive';
      await member.update({ status: newStatus });

      // 获取更新后的成员信息
      const updatedMember = await OrganizationMember.findByPk(member.id, {
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'username', 'email', 'profile']
          },
          {
            model: require('../models/OrganizationRole'),
            as: 'role',
            attributes: ['id', 'name', 'permissions'],
            required: false
          }
        ]
      });

      const action = approved ? '通过' : '拒绝';
      logger.info(`用户 ${req.user.username} ${action}了机构 ${organization.name} 的成员申请`);
      return success(res, updatedMember, `成员申请${action}成功`);

    } catch (err) {
      logger.error('审核成员申请失败:', err);
      return error(res, '审核成员申请失败', 500);
    }
  }
);

// 移除机构成员
router.delete('/:organizationId/members/:memberId',
  authenticateToken,
  requirePermission(['organization:manage_members']),
  async (req, res) => {
    try {
      const { organizationId, memberId } = req.params;

      // 检查机构是否存在
      const organization = await Organization.findByPk(organizationId);
      if (!organization) {
        return error(res, '机构不存在', 404);
      }

      // 检查成员是否存在
      const member = await OrganizationMember.findOne({
        where: {
          id: memberId,
          organization_id: organizationId
        },
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'username']
          }
        ]
      });

      if (!member) {
        return error(res, '成员不存在', 404);
      }

      // 检查权限
      const isCreator = organization.creator_id === req.user.id;
      const isAdmin = req.user.role === 'super_admin' || req.user.role === 'system_admin';
      const hasPermission = await OrganizationMember.hasPermission(organizationId, req.user.id, 'organization:manage_members');
      const isSelf = member.user_id === req.user.id;

      if (!isCreator && !isAdmin && !hasPermission && !isSelf) {
        return error(res, '没有权限移除机构成员', 403);
      }

      // 不能移除机构创建者
      if (member.user_id === organization.creator_id) {
        return error(res, '不能移除机构创建者', 400);
      }

      // 移除成员
      await member.destroy();

      logger.info(`用户 ${req.user.username} 从机构 ${organization.name} 移除了成员 ${member.user.username}`);
      return success(res, null, '成员移除成功');

    } catch (err) {
      logger.error('移除机构成员失败:', err);
      return error(res, '移除机构成员失败', 500);
    }
  }
);

// 更新成员角色
router.put('/:organizationId/members/:memberId/role',
  authenticateToken,
  requirePermission(['organization:assign_roles']),
  async (req, res) => {
    try {
      const { organizationId, memberId } = req.params;
      const { role_id } = req.body;

      // 检查机构是否存在
      const organization = await Organization.findByPk(organizationId);
      if (!organization) {
        return error(res, '机构不存在', 404);
      }

      // 检查成员是否存在
      const member = await OrganizationMember.findOne({
        where: {
          id: memberId,
          organization_id: organizationId
        }
      });

      if (!member) {
        return error(res, '成员不存在', 404);
      }

      // 检查权限：只有机构创建者或系统管理员可以分配角色
      const isCreator = organization.creator_id === req.user.id;
      const isAdmin = req.user.role === 'super_admin' || req.user.role === 'system_admin';

      if (!isCreator && !isAdmin) {
        return error(res, '没有权限分配成员角色', 403);
      }

      // 不能修改机构创建者的角色
      if (member.user_id === organization.creator_id) {
        return error(res, '不能修改机构创建者的角色', 400);
      }

      // 更新角色
      await member.update({ role_id: role_id || null });

      // 获取更新后的成员信息
      const updatedMember = await OrganizationMember.findByPk(member.id, {
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'username', 'email', 'profile']
          },
          {
            model: require('../models/OrganizationRole'),
            as: 'role',
            attributes: ['id', 'name', 'permissions'],
            required: false
          }
        ]
      });

      logger.info(`用户 ${req.user.username} 更新了机构 ${organization.name} 中成员的角色`);
      return success(res, updatedMember, '角色更新成功');

    } catch (err) {
      logger.error('更新成员角色失败:', err);
      return error(res, '更新成员角色失败', 500);
    }
  }
);

// 更新成员昵称
router.put('/:organizationId/members/:memberId/nickname',
  authenticateToken,
  async (req, res) => {
    try {
      const { organizationId, memberId } = req.params;
      const { nickname } = req.body;

      // 检查成员是否存在
      const member = await OrganizationMember.findOne({
        where: {
          id: memberId,
          organization_id: organizationId
        }
      });

      if (!member) {
        return error(res, '成员不存在', 404);
      }

      // 只有成员自己或管理员可以修改昵称
      const isOwner = member.user_id === req.user.id;
      const isAdmin = req.user.role === 'super_admin' || req.user.role === 'system_admin';
      const hasPermission = await OrganizationMember.hasPermission(organizationId, req.user.id, 'organization:manage_members');

      if (!isOwner && !isAdmin && !hasPermission) {
        return error(res, '没有权限修改昵称', 403);
      }

      // 验证昵称长度
      if (nickname && nickname.length > 50) {
        return error(res, '昵称不能超过50个字符', 400);
      }

      // 更新昵称
      await member.update({ nickname: nickname || null });

      // 获取更新后的成员信息
      const updatedMember = await OrganizationMember.findByPk(member.id, {
        include: [
          {
            model: User,
            as: 'user',
            attributes: ['id', 'username', 'email', 'profile']
          }
        ]
      });

      logger.info(`用户 ${req.user.username} 更新了机构昵称`);
      return success(res, updatedMember, '昵称更新成功');

    } catch (err) {
      logger.error('更新成员昵称失败:', err);
      return error(res, '更新成员昵称失败', 500);
    }
  }
);

module.exports = router;