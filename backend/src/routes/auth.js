const express = require('express');
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { success, error, unauthorized } = require('../utils/response');
const { validate, loginSchema } = require('../middleware/validation');
const { authenticateToken } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * 用户登录
 * POST /api/auth/login
 */
router.post('/login', validate(loginSchema), async (req, res, next) => {
  try {
    const { username, password, rememberMe } = req.body;

    // 查找用户
    const user = await User.findByUsername(username);
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

    // 生成JWT Token
    const tokenPayload = {
      id: user.id,
      username: user.username,
      role: user.role,
      permissions: getUserPermissions(user.role)
    };

    const tokenOptions = {
      expiresIn: rememberMe ? '7d' : (process.env.JWT_EXPIRES_IN || '24h')
    };

    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, tokenOptions);

    // 记录登录日志
    logger.info(`用户登录成功: ${username} - IP: ${req.ip}`);

    // 返回登录成功响应
    success(res, {
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        profile: user.profile,
        permissions: getUserPermissions(user.role)
      },
      expiresIn: tokenOptions.expiresIn
    }, '登录成功');

  } catch (err) {
    next(err);
  }
});

/**
 * 获取当前用户信息
 * GET /api/auth/profile
 */
router.get('/profile', authenticateToken, async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return unauthorized(res, '用户不存在');
    }

    success(res, {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      profile: user.profile,
      permissions: getUserPermissions(user.role),
      lastLoginAt: user.last_login_at
    }, '获取用户信息成功');

  } catch (err) {
    next(err);
  }
});

/**
 * 刷新Token
 * POST /api/auth/refresh
 */
router.post('/refresh', authenticateToken, async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user || user.status !== 'active') {
      return unauthorized(res, '用户状态异常');
    }

    // 生成新的Token
    const tokenPayload = {
      id: user.id,
      username: user.username,
      role: user.role,
      permissions: getUserPermissions(user.role)
    };

    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '24h'
    });

    success(res, {
      token,
      expiresIn: process.env.JWT_EXPIRES_IN || '24h'
    }, 'Token刷新成功');

  } catch (err) {
    next(err);
  }
});

/**
 * 用户登出
 * POST /api/auth/logout
 */
router.post('/logout', authenticateToken, async (req, res, next) => {
  try {
    // 记录登出日志
    logger.info(`用户登出: ${req.user.username} - IP: ${req.ip}`);

    // 在实际应用中，可以将token加入黑名单
    // 这里简单返回成功响应
    success(res, null, '登出成功');

  } catch (err) {
    next(err);
  }
});

/**
 * 根据角色获取权限列表
 * @param {string} role - 用户角色
 * @returns {Array} 权限列表
 */
function getUserPermissions(role) {
  const permissions = {
    // 超级管理员：拥有全部权限
    super_admin: [
      'dashboard:read', 'dashboard:write',
      'user:read', 'user:create', 'user:update', 'user:delete',
      'team:read', 'team:create', 'team:update', 'team:delete',
      'activity:read', 'activity:create', 'activity:update', 'activity:delete',
      'content:read', 'content:create', 'content:update', 'content:delete',
      'system:read', 'system:update', 'system:delete'
    ],
    // 系统管理员
    system_admin: [
      'dashboard:read',
      'user:read', 'user:create', 'user:update', 'user:delete',
      'team:read', 'team:create', 'team:update', 'team:delete',
      'activity:read', 'activity:create', 'activity:update', 'activity:delete',
      'content:read', 'content:create', 'content:update', 'content:delete',
      'system:read', 'system:update'
    ],
    // 运营管理员
    operation_admin: [
      'dashboard:read',
      'user:read', 'user:update',
      'team:read', 'team:create', 'team:update',
      'activity:read', 'activity:create', 'activity:update', 'activity:delete',
      'content:read', 'content:update', 'content:delete'
    ],
    // 团队管理员
    team_admin: [
      'dashboard:read',
      'user:read',
      'team:read', 'team:create', 'team:update',
      'activity:read', 'activity:create', 'activity:update'
    ],
    // 管理员（兼容旧配置）
    admin: [
      'dashboard:read',
      'user:read', 'user:create', 'user:update', 'user:delete',
      'team:read', 'team:create', 'team:update', 'team:delete',
      'activity:read', 'activity:create', 'activity:update', 'activity:delete',
      'content:read', 'content:create', 'content:update', 'content:delete',
      'system:read', 'system:update'
    ],
    // 普通用户：可以访问仪表板和管理自己的信息
    user: [
      'dashboard:read', 'profile:read', 'profile:update'
    ]
  };

  return permissions[role] || [];
}

module.exports = router;