const express = require('express');
const { Op } = require('sequelize');
const router = express.Router();

const Activity = require('../models/Activity');
const ActivityRole = require('../models/ActivityRole');
const ActivityParticipantRole = require('../models/ActivityParticipantRole');
const User = require('../models/User');
const { authenticateToken, requirePermission } = require('../middleware/auth');
const { validate } = require('../middleware/validation');
const { success, error } = require('../utils/response');
const logger = require('../utils/logger');
const Joi = require('joi');

// 角色分配验证模式
const assignRoleSchema = Joi.object({
  assignments: Joi.array()
    .items(Joi.object({
      user_id: Joi.string().uuid().required(),
      role_id: Joi.string().uuid().required(),
      is_hidden: Joi.boolean().default(false)
    }))
    .min(1)
    .required()
    .messages({
      'array.min': '至少需要一个角色分配',
      'any.required': '角色分配列表不能为空'
    })
});

// 获取所有活动角色
router.get('/roles', authenticateToken, async (req, res) => {
  try {
    const { include_permissions = 'false' } = req.query;

    // 获取活动角色列表
    const roles = await ActivityRole.findActive();

    // 如果需要包含权限信息
    let result = roles;
    if (include_permissions === 'true') {
      const allPermissions = ActivityRole.getAllPermissions();
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
    logger.error('获取活动角色列表失败:', err);
    return error(res, '获取活动角色列表失败', 500);
  }
});

// 获取活动权限列表
router.get('/permissions', authenticateToken, async (req, res) => {
  try {
    const permissions = ActivityRole.getAllPermissions();
    
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
    logger.error('获取活动权限列表失败:', err);
    return error(res, '获取活动权限列表失败', 500);
  }
});

// 获取活动参与者角色
router.get('/:activityId/participant-roles', authenticateToken, async (req, res) => {
  try {
    const { activityId } = req.params;
    const { include_hidden = 'false' } = req.query;

    // 检查活动是否存在
    const activity = await Activity.findByPk(activityId);
    if (!activity) {
      return error(res, '活动不存在', 404);
    }

    // 检查用户是否有权限查看
    const isCreator = activity.creator_id === req.user.id;
    const isAdmin = req.user.role === 'super_admin' || req.user.role === 'system_admin';
    const hasPermission = await ActivityParticipantRole.hasPermission(activityId, req.user.id, 'activity:manage_participants');

    if (!isCreator && !isAdmin && !hasPermission) {
      return error(res, '没有权限查看参与者角色', 403);
    }

    // 获取参与者角色列表
    const participantRoles = await ActivityParticipantRole.findByActivity(activityId);

    // 过滤隐身用户（除非是创建者或管理员）
    let result = participantRoles;
    if (include_hidden !== 'true' && !isCreator && !isAdmin) {
      result = participantRoles.filter(pr => !pr.is_hidden);
    }

    return success(res, result);

  } catch (err) {
    logger.error('获取活动参与者角色失败:', err);
    return error(res, '获取参与者角色失败', 500);
  }
});

// 分配活动角色
router.post('/:activityId/assign-roles',
  authenticateToken,
  requirePermission(['activity:assign_roles']),
  validate(assignRoleSchema),
  async (req, res) => {
    try {
      const { activityId } = req.params;
      const { assignments } = req.body;

      // 检查活动是否存在
      const activity = await Activity.findByPk(activityId);
      if (!activity) {
        return error(res, '活动不存在', 404);
      }

      // 检查权限
      const isCreator = activity.creator_id === req.user.id;
      const isAdmin = req.user.role === 'super_admin' || req.user.role === 'system_admin';
      const hasPermission = await ActivityParticipantRole.hasPermission(activityId, req.user.id, 'activity:assign_roles');

      if (!isCreator && !isAdmin && !hasPermission) {
        return error(res, '没有权限分配角色', 403);
      }

      // 验证用户和角色是否存在
      const userIds = assignments.map(a => a.user_id);
      const roleIds = assignments.map(a => a.role_id);

      const users = await User.findAll({
        where: { id: { [Op.in]: userIds } },
        attributes: ['id', 'username']
      });

      const roles = await ActivityRole.findAll({
        where: { id: { [Op.in]: roleIds }, status: 'active' },
        attributes: ['id', 'name']
      });

      if (users.length !== userIds.length) {
        return error(res, '部分用户不存在', 400);
      }

      if (roles.length !== roleIds.length) {
        return error(res, '部分角色不存在', 400);
      }

      // 批量分配角色
      const results = await ActivityParticipantRole.assignRoles(
        activityId, 
        assignments, 
        req.user.id
      );

      // 统计结果
      const created = results.filter(r => r.status === 'created');
      const exists = results.filter(r => r.status === 'exists');

      logger.info(`用户 ${req.user.username} 为活动 ${activity.title} 分配了 ${created.length} 个角色`);

      return success(res, {
        results,
        summary: {
          total: results.length,
          created: created.length,
          exists: exists.length
        }
      }, '角色分配完成');

    } catch (err) {
      logger.error('分配活动角色失败:', err);
      return error(res, '分配角色失败', 500);
    }
  }
);

// 移除活动角色
router.delete('/:activityId/participant-roles/:userId/:roleId',
  authenticateToken,
  requirePermission(['activity:assign_roles']),
  async (req, res) => {
    try {
      const { activityId, userId, roleId } = req.params;

      // 检查活动是否存在
      const activity = await Activity.findByPk(activityId);
      if (!activity) {
        return error(res, '活动不存在', 404);
      }

      // 检查权限
      const isCreator = activity.creator_id === req.user.id;
      const isAdmin = req.user.role === 'super_admin' || req.user.role === 'system_admin';
      const hasPermission = await ActivityParticipantRole.hasPermission(activityId, req.user.id, 'activity:assign_roles');

      if (!isCreator && !isAdmin && !hasPermission) {
        return error(res, '没有权限移除角色', 403);
      }

      // 不能移除创建者的创建人角色
      if (userId === activity.creator_id) {
        const role = await ActivityRole.findByPk(roleId);
        if (role && role.name === '创建人') {
          return error(res, '不能移除创建者的创建人角色', 400);
        }
      }

      // 移除角色
      const removed = await ActivityParticipantRole.removeRole(activityId, userId, roleId);

      if (!removed) {
        return error(res, '角色分配不存在', 404);
      }

      logger.info(`用户 ${req.user.username} 移除了活动 ${activity.title} 中的角色分配`);
      return success(res, null, '角色移除成功');

    } catch (err) {
      logger.error('移除活动角色失败:', err);
      return error(res, '移除角色失败', 500);
    }
  }
);

// 获取用户在活动中的角色
router.get('/:activityId/user-roles/:userId', authenticateToken, async (req, res) => {
  try {
    const { activityId, userId } = req.params;

    // 检查活动是否存在
    const activity = await Activity.findByPk(activityId);
    if (!activity) {
      return error(res, '活动不存在', 404);
    }

    // 检查权限（只能查看自己的角色或有管理权限）
    const isSelf = userId === req.user.id;
    const isCreator = activity.creator_id === req.user.id;
    const isAdmin = req.user.role === 'super_admin' || req.user.role === 'system_admin';
    const hasPermission = await ActivityParticipantRole.hasPermission(activityId, req.user.id, 'activity:manage_participants');

    if (!isSelf && !isCreator && !isAdmin && !hasPermission) {
      return error(res, '没有权限查看用户角色', 403);
    }

    // 获取用户角色
    const userRoles = await ActivityParticipantRole.getUserRoles(activityId, userId);

    // 计算用户的所有权限
    const allPermissions = new Set();
    userRoles.forEach(ur => {
      if (ur.role && ur.role.permissions) {
        ur.role.permissions.forEach(perm => allPermissions.add(perm));
      }
    });

    return success(res, {
      user_roles: userRoles,
      permissions: Array.from(allPermissions)
    });

  } catch (err) {
    logger.error('获取用户活动角色失败:', err);
    return error(res, '获取用户角色失败', 500);
  }
});

// 检查用户权限
router.get('/:activityId/check-permission/:permission', authenticateToken, async (req, res) => {
  try {
    const { activityId, permission } = req.params;
    const { user_id = req.user.id } = req.query;

    // 检查活动是否存在
    const activity = await Activity.findByPk(activityId);
    if (!activity) {
      return error(res, '活动不存在', 404);
    }

    // 检查权限
    const hasPermission = await ActivityParticipantRole.hasPermission(activityId, user_id, permission);

    return success(res, {
      user_id,
      activity_id: activityId,
      permission,
      has_permission: hasPermission
    });

  } catch (err) {
    logger.error('检查用户权限失败:', err);
    return error(res, '检查权限失败', 500);
  }
});

// 初始化系统角色
router.post('/initialize-system-roles',
  authenticateToken,
  requirePermission(['system:admin']),
  async (req, res) => {
    try {
      const roles = await ActivityRole.initializeSystemRoles();

      logger.info(`用户 ${req.user.username} 初始化了系统活动角色`);
      return success(res, {
        roles,
        count: roles.length
      }, '系统角色初始化成功');

    } catch (err) {
      logger.error('初始化系统角色失败:', err);
      return error(res, '初始化系统角色失败', 500);
    }
  }
);

module.exports = router;