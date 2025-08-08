const jwt = require('jsonwebtoken');
const { unauthorized, forbidden } = require('../utils/response');
const logger = require('../utils/logger');

/**
 * JWT认证中间件
 */
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return unauthorized(res, '缺少访问令牌');
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    
    // 记录用户访问日志
    logger.info(`用户访问: ${decoded.username} - ${req.method} ${req.path}`);
    
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return unauthorized(res, '登录已过期，请重新登录');
    } else if (error.name === 'JsonWebTokenError') {
      return unauthorized(res, '无效的访问令牌');
    } else {
      logger.error('JWT验证错误:', error);
      return unauthorized(res, '认证失败');
    }
  }
}

/**
 * 权限验证中间件
 * @param {string|Array} requiredRoles - 需要的角色
 */
function requireRole(requiredRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return unauthorized(res, '用户未认证');
    }

    const userRole = req.user.role;
    const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles];

    // 超级管理员拥有所有权限
    if (userRole === 'super_admin') {
      return next();
    }

    // 检查用户角色是否在允许的角色列表中
    if (!roles.includes(userRole)) {
      logger.warn(`权限不足: 用户${req.user.username}(${userRole})尝试访问需要${roles.join('或')}权限的资源`);
      return forbidden(res, '权限不足，无法访问此资源');
    }

    next();
  };
}

/**
 * 权限验证中间件 - 检查特定权限
 * @param {string|Array} requiredPermissions - 需要的权限
 */
function requirePermission(requiredPermissions) {
  return (req, res, next) => {
    if (!req.user) {
      return unauthorized(res, '用户未认证');
    }

    const userPermissions = req.user.permissions || [];
    const permissions = Array.isArray(requiredPermissions) ? requiredPermissions : [requiredPermissions];

    // 超级管理员拥有所有权限
    if (req.user.role === 'super_admin') {
      return next();
    }

    // 检查用户是否拥有所需权限
    const hasPermission = permissions.some(permission => userPermissions.includes(permission));

    if (!hasPermission) {
      logger.warn(`权限不足: 用户${req.user.username}尝试访问需要${permissions.join('或')}权限的资源`);
      return forbidden(res, '权限不足，无法执行此操作');
    }

    next();
  };
}

/**
 * 可选认证中间件 - 如果有token则验证，没有则跳过
 */
function optionalAuth(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
  } catch (error) {
    // 可选认证失败时不返回错误，继续执行
    logger.debug('可选认证失败:', error.message);
  }

  next();
}

module.exports = {
  authenticateToken,
  requireRole,
  requirePermission,
  optionalAuth
};