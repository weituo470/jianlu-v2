const logger = require('../utils/logger');
const { serverError, error } = require('../utils/response');

/**
 * 全局错误处理中间件
 */
function errorHandler(err, req, res, next) {
  // 记录错误日志
  logger.error('API错误:', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    body: req.body,
    params: req.params,
    query: req.query
  });

  // 如果响应已经发送，则交给默认错误处理器
  if (res.headersSent) {
    return next(err);
  }

  // 处理不同类型的错误
  switch (err.name) {
    case 'ValidationError':
      return error(res, err.message, 400, 'VALIDATION_ERROR', err.details);
    
    case 'UnauthorizedError':
    case 'JsonWebTokenError':
      return error(res, '认证失败，请重新登录', 401, 'UNAUTHORIZED');
    
    case 'TokenExpiredError':
      return error(res, '登录已过期，请重新登录', 401, 'TOKEN_EXPIRED');
    
    case 'ForbiddenError':
      return error(res, '权限不足', 403, 'FORBIDDEN');
    
    case 'NotFoundError':
      return error(res, '资源不存在', 404, 'NOT_FOUND');
    
    case 'SequelizeValidationError':
      const validationErrors = err.errors.map(error => ({
        field: error.path,
        message: error.message,
        value: error.value
      }));
      return error(res, '数据验证失败', 400, 'VALIDATION_ERROR', validationErrors);
    
    case 'SequelizeUniqueConstraintError':
      const field = err.errors[0]?.path || 'unknown';
      return error(res, `${field}已存在`, 400, 'DUPLICATE_ERROR');
    
    case 'SequelizeForeignKeyConstraintError':
      return error(res, '关联数据不存在', 400, 'FOREIGN_KEY_ERROR');
    
    case 'SequelizeConnectionError':
    case 'SequelizeDatabaseError':
      return serverError(res, '数据库连接错误');
    
    default:
      // 开发环境返回详细错误信息
      if (process.env.NODE_ENV === 'development') {
        return res.status(500).json({
          success: false,
          message: err.message,
          code: 'INTERNAL_SERVER_ERROR',
          stack: err.stack,
          timestamp: new Date().toISOString()
        });
      }
      
      // 生产环境返回通用错误信息
      return serverError(res);
  }
}

module.exports = errorHandler;