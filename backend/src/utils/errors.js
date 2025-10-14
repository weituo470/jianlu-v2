class AppError extends Error {
  constructor(message, options = {}) {
    const {
      statusCode = 500,
      code = 'INTERNAL_SERVER_ERROR',
      details = null,
      cause = undefined,
      expose = true
    } = options;
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    this.isOperational = expose;
    if (cause) {
      this.cause = cause;
    }
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends AppError {
  constructor(message = '数据验证失败', details = null) {
    super(message, {
      statusCode: 400,
      code: 'VALIDATION_ERROR',
      details
    });
  }
}

class UnauthorizedError extends AppError {
  constructor(message = '未授权访问') {
    super(message, {
      statusCode: 401,
      code: 'UNAUTHORIZED'
    });
  }
}

class ForbiddenError extends AppError {
  constructor(message = '权限不足') {
    super(message, {
      statusCode: 403,
      code: 'FORBIDDEN'
    });
  }
}

class NotFoundError extends AppError {
  constructor(message = '资源不存在') {
    super(message, {
      statusCode: 404,
      code: 'NOT_FOUND'
    });
  }
}

class ConflictError extends AppError {
  constructor(message = '资源冲突', details = null) {
    super(message, {
      statusCode: 409,
      code: 'CONFLICT_ERROR',
      details
    });
  }
}

module.exports = {
  AppError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError
};
