const logger = require('../utils/logger');
const {
  AppError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError
} = require('../utils/errors');
const { buildErrorMeta } = require('../utils/logging');

const isProduction = process.env.NODE_ENV === 'production';

function mapSequelizeValidation(error) {
  if (!Array.isArray(error?.errors)) {
    return null;
  }
  return error.errors.map(item => ({
    field: item.path,
    message: item.message,
    value: item.value
  }));
}

function normalizeError(err) {
  if (err instanceof AppError) {
    return err;
  }

  switch (err?.name) {
    case 'ValidationError':
      return new ValidationError(err.message, err.details);
    case 'UnauthorizedError':
    case 'JsonWebTokenError':
      return new UnauthorizedError('认证失败，请重新登录');
    case 'TokenExpiredError':
      return new AppError('登录已过期，请重新登录', {
        statusCode: 401,
        code: 'TOKEN_EXPIRED'
      });
    case 'ForbiddenError':
      return new ForbiddenError('权限不足');
    case 'NotFoundError':
      return new NotFoundError('资源不存在');
    case 'SequelizeValidationError':
      return new ValidationError('数据验证失败', mapSequelizeValidation(err));
    case 'SequelizeUniqueConstraintError': {
      const field = err.errors?.[0]?.path || 'unknown';
      return new ConflictError(`${field}已存在`);
    }
    case 'SequelizeForeignKeyConstraintError':
      return new AppError('关联数据不存在', {
        statusCode: 400,
        code: 'FOREIGN_KEY_ERROR'
      });
    case 'SequelizeConnectionError':
    case 'SequelizeDatabaseError':
      return new AppError('数据库连接错误', {
        statusCode: 500,
        code: 'DATABASE_ERROR',
        details: {
          sql: err.sql,
          parameters: err.parameters
        }
      });
    default:
      break;
  }

  if (typeof err?.status === 'number' && err.status >= 400) {
    return new AppError(err.message || '请求错误', {
      statusCode: err.status,
      code: err.code || 'HTTP_ERROR',
      details: err.details,
      cause: err
    });
  }

  return new AppError(isProduction ? '服务器内部错误' : err?.message || '服务器内部错误', {
    statusCode: 500,
    code: 'INTERNAL_SERVER_ERROR',
    details: !isProduction ? { stack: err?.stack } : undefined,
    cause: err,
    expose: false
  });
}

function buildResponsePayload(appError, requestId) {
  const payload = {
    success: false,
    message: appError.message,
    code: appError.code,
    requestId,
    timestamp: new Date().toISOString()
  };

  if (appError.details) {
    payload.details = appError.details;
  }

  return payload;
}

function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  const appError = normalizeError(err || new Error('Unknown error'));
  const requestId = req.context?.id;

  if (requestId) {
    res.setHeader('X-Request-Id', requestId);
  }

  const logMeta = buildErrorMeta(err, req, {
    requestId,
    statusCode: appError.statusCode,
    code: appError.code
  });
  logger.error('request.error', logMeta);

  res.locals.errorDetails = {
    code: appError.code,
    message: appError.message,
    details: appError.details
  };

  const payload = buildResponsePayload(appError, requestId);

  if (!isProduction && !appError.isOperational) {
    payload.stack = err?.stack;
  }

  return res.status(appError.statusCode || 500).json(payload);
}

module.exports = errorHandler;

