const express = require('express');
const { Op } = require('sequelize');
const router = express.Router();

const Organization = require('../models/Organization');
const OrganizationRole = require('../models/OrganizationRole');
const OrganizationMember = require('../models/OrganizationMember');
const { authenticateToken, requirePermission } = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const { success, error } = require('../utils/response');
const logger = require('../utils/logger');
const Joi = require('joi');

// 角色验证模式
const createRoleSchema = Joi.object({
  name: Joi.string()
    .min(1)
    .max(100)
    .required()
    .messages({
      'string.min': '角色名称至少1个字符',
      'string.max': '角色名称最多100个字符',
      'any.required': '角色名称不能为空'
    }),
  description: Joi.string()
    .max(500)
    .allow('')
    .messages({
      'string.max': '角色描述不能超过500个字符'
    }),
  permissions: Joi.array()
    .items(Joi.string())
    .default([])
    .messages({
      'array.base': '权限必须是数组格式'
    }),
  is_default: Joi.boolean()
    .default(false)
});

// 获取机构角色列表
router.get('/:organizationId/roles', authenticateToken, async (req, res) => {
  try {
    const { organizationId } = req.params;
    const { include_permissions = 'false' } = req.query;

    // 检查机构是否存在
    const organization = await Organization.findByPk(organizationId);
    if (!organization) {
      return error(res, '机构不存在', 404);
    }

    // 检查用户是否是机构成员
    const isMember = await OrganizationMember.isOrganizationMember(organizationId, req.user.id);
    if (!isMember) {
      return error(res, '您不是该机构成员', 403);
    }

    // 获取角色列表
    const roles = await OrganizationRole.findByOrganization(organizationId);

    // 如果需要包含权限信息，添加权限描述
    let result = roles;
    if (include_permissions === 'true') {
      const allPermissions = OrganizationRole.getAllPermissions();
      const permissionMap = {};
      allPermissions.forEach(p => {
        permissionMap[p.key] = p;
      });

      result = roles.map(role => {
        const roleData = role.toJSON();
        roleData.permission_details = (roleData.permissions || []).map(permKey => 
          permissionMap[permKey] || { key: permKey, name: permKey, category: '未知' }
        );
        return roleData;
      });
    }

    return success(res, result);

  } catch (err) {
    logger.error('获取机构角色列表失败:', err);
    return error(res, '获取角色列表失败', 500);
  }
});

// 获取所有可用权限
router.get('/permissions', authenticateToken, async (req, res) => {
  try {
    const permissions = OrganizationRole.getAllPermissions();
    
    // 按分类分组
    const groupedPermissions = {};
    permissions.forEach(perm => {
      if (!groupedPermissions[perm.category]) {
        groupedPermissions[perm.category] = [];
      }
      groupedPermissions[perm.category].push(perm);
    });

    return success(res, {
      all_permissions: permissions,
      grouped_permissions: groupedPermissions
    });

  } catch (err) {
    logger.error('获取权限列表失败:', err);
    return error(res, '获取权限列表失败', 500);
  }
});

// 创建机构角色
router.post('/:organizationId/roles',
  authenticateToken,
  requirePermission(['organization:manage_roles']),
  validate(createRoleSchema),
  async (req, res) => {
    try {
      const { organizationId } = req.params;
      const { name, description, permissions, is_default } = req.body;

      // 检查机构是否存在
      const organization = await Organization.findByPk(organizationId);
      if (!organization) {
        return error(res, '机构不存在', 404);
      }

      // 检查权限
      const isCreator = organization.creator_id === req.user.id;
      const isAdmin = req.user.role === 'super_admin' || req.user.role === 'system_admin';
      const hasPermission = await OrganizationMember.hasPermission(organizationId, req.user.id, 'organization:manage_roles');

      if (!isCreator && !isAdmin && !hasPermission) {
        return error(res, '没有权限创建角色', 403);
      }

      // 检查角色名称是否已存在
      const existingRole = await OrganizationRole.findOne({
        where: {
          organization_id: organizationId,
          name,
          status: 'active'
        }
      });

      if (existingRole) {
        return error(res, '角色名称已存在', 400);
      }

      // 验证权限是否有效
      const allPermissions = OrganizationRole.getAllPermissions();
      const validPermissionKeys = allPermissions.map(p => p.key);
      const invalidPermissions = permissions.filter(p => !validPermissionKeys.includes(p));
      
      if (invalidPermissions.length > 0) {
        return error(res, `无效的权限: ${invalidPermissions.join(', ')}`, 400);
      }

      // 如果设置为默认角色，先取消其他默认角色
      if (is_default) {
        await OrganizationRole.update(
          { is_default: false },
          {
            where: {
              organization_id: organizationId,
              is_default: true
            }
          }
        );
      }

      // 创建角色
      const role = await OrganizationRole.create({
        organization_id: organizationId,
        name,
        description: description || '',
        permissions: permissions || [],
        is_default: is_default || false,
        is_system: false
      });

      logger.info(`用户 ${req.user.username} 在机构 ${organization.name} 创建了角色: ${name}`);
      return success(res, role, '角色创建成功', 201);

    } catch (err) {
      logger.error('创建机构角色失败:', err);
      return error(res, '创建角色失败', 500);
    }
  }
);

// 更新机构角色
router.put('/:organizationId/roles/:roleId',
  authenticateToken,
  requirePermission(['organization:manage_roles']),
  async (req, res) => {
    try {
      const { organizationId, roleId } = req.params;
      const { name, description, permissions, is_default } = req.body;

      // 检查机构是否存在
      const organization = await Organization.findByPk(organizationId);
      if (!organization) {
        return error(res, '机构不存在', 404);
      }

      // 检查角色是否存在
      const role = await OrganizationRole.findOne({
        where: {
          id: roleId,
          organization_id: organizationId
        }
      });

      if (!role) {
        return error(res, '角色不存在', 404);
      }

      // 检查权限
      const isCreator = organization.creator_id === req.user.id;
      const isAdmin = req.user.role === 'super_admin' || req.user.role === 'system_admin';
      const hasPermission = await OrganizationMember.hasPermission(organizationId, req.user.id, 'organization:manage_roles');

      if (!isCreator && !isAdmin && !hasPermission) {
        return error(res, '没有权限更新角色', 403);
      }

      // 系统预设角色不能修改名称和核心权限
      if (role.is_system && (name !== role.name)) {
        return error(res, '系统预设角色不能修改名称', 400);
      }

      // 检查角色名称是否已存在（排除当前角色）
      if (name && name !== role.name) {
        const existingRole = await OrganizationRole.findOne({
          where: {
            organization_id: organizationId,
            name,
            id: { [Op.ne]: roleId },
            status: 'active'
          }
        });

        if (existingRole) {
          return error(res, '角色名称已存在', 400);
        }
      }

      // 验证权限是否有效
      if (permissions) {
        const allPermissions = OrganizationRole.getAllPermissions();
        const validPermissionKeys = allPermissions.map(p => p.key);
        const invalidPermissions = permissions.filter(p => !validPermissionKeys.includes(p));
        
        if (invalidPermissions.length > 0) {
          return error(res, `无效的权限: ${invalidPermissions.join(', ')}`, 400);
        }
      }

      // 如果设置为默认角色，先取消其他默认角色
      if (is_default && !role.is_default) {
        await OrganizationRole.update(
          { is_default: false },
          {
            where: {
              organization_id: organizationId,
              is_default: true
            }
          }
        );
      }

      // 更新角色
      const updateData = {};
      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (permissions !== undefined) updateData.permissions = permissions;
      if (is_default !== undefined) updateData.is_default = is_default;

      await role.update(updateData);

      logger.info(`用户 ${req.user.username} 更新了机构 ${organization.name} 的角色: ${role.name}`);
      return success(res, role, '角色更新成功');

    } catch (err) {
      logger.error('更新机构角色失败:', err);
      return error(res, '更新角色失败', 500);
    }
  }
);

// 删除机构角色
router.delete('/:organizationId/roles/:roleId',
  authenticateToken,
  requirePermission(['organization:manage_roles']),
  async (req, res) => {
    try {
      const { organizationId, roleId } = req.params;

      // 检查机构是否存在
      const organization = await Organization.findByPk(organizationId);
      if (!organization) {
        return error(res, '机构不存在', 404);
      }

      // 检查角色是否存在
      const role = await OrganizationRole.findOne({
        where: {
          id: roleId,
          organization_id: organizationId
        }
      });

      if (!role) {
        return error(res, '角色不存在', 404);
      }

      // 检查权限
      const isCreator = organization.creator_id === req.user.id;
      const isAdmin = req.user.role === 'super_admin' || req.user.role === 'system_admin';
      const hasPermission = await OrganizationMember.hasPermission(organizationId, req.user.id, 'organization:manage_roles');

      if (!isCreator && !isAdmin && !hasPermission) {
        return error(res, '没有权限删除角色', 403);
      }

      // 系统预设角色不能删除
      if (role.is_system) {
        return error(res, '系统预设角色不能删除', 400);
      }

      // 检查是否有成员正在使用此角色
      const membersCount = await OrganizationMember.count({
        where: {
          organization_id: organizationId,
          role_id: roleId,
          status: 'active'
        }
      });

      if (membersCount > 0) {
        return error(res, `无法删除：还有 ${membersCount} 个成员正在使用此角色`, 400);
      }

      // 删除角色
      await role.update({ status: 'inactive' });

      logger.info(`用户 ${req.user.username} 删除了机构 ${organization.name} 的角色: ${role.name}`);
      return success(res, null, '角色删除成功');

    } catch (err) {
      logger.error('删除机构角色失败:', err);
      return error(res, '删除角色失败', 500);
    }
  }
);

// 获取角色详情
router.get('/:organizationId/roles/:roleId', authenticateToken, async (req, res) => {
  try {
    const { organizationId, roleId } = req.params;

    // 检查机构是否存在
    const organization = await Organization.findByPk(organizationId);
    if (!organization) {
      return error(res, '机构不存在', 404);
    }

    // 检查用户是否是机构成员
    const isMember = await OrganizationMember.isOrganizationMember(organizationId, req.user.id);
    if (!isMember) {
      return error(res, '您不是该机构成员', 403);
    }

    // 获取角色详情
    const role = await OrganizationRole.findOne({
      where: {
        id: roleId,
        organization_id: organizationId
      },
      include: [
        {
          model: OrganizationMember,
          as: 'members',
          attributes: ['id', 'user_id', 'nickname', 'status'],
          include: [
            {
              model: require('../models/User'),
              as: 'user',
              attributes: ['id', 'username', 'email', 'profile']
            }
          ]
        }
      ]
    });

    if (!role) {
      return error(res, '角色不存在', 404);
    }

    // 添加权限详情
    const allPermissions = OrganizationRole.getAllPermissions();
    const permissionMap = {};
    allPermissions.forEach(p => {
      permissionMap[p.key] = p;
    });

    const roleData = role.toJSON();
    roleData.permission_details = (roleData.permissions || []).map(permKey => 
      permissionMap[permKey] || { key: permKey, name: permKey, category: '未知' }
    );

    return success(res, roleData);

  } catch (err) {
    logger.error('获取角色详情失败:', err);
    return error(res, '获取角色详情失败', 500);
  }
});

module.exports = router;