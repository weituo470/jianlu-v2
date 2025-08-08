/**
 * 统一API响应格式工具
 */

/**
 * 成功响应
 * @param {Object} res - Express响应对象
 * @param {*} data - 响应数据
 * @param {string} message - 响应消息
 * @param {number} statusCode - HTTP状态码
 */
function success(res, data = null, message = '操作成功', statusCode = 200) {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    timestamp: new Date().toISOString()
  });
}

/**
 * 分页成功响应
 * @param {Object} res - Express响应对象
 * @param {Array} data - 数据列表
 * @param {Object} pagination - 分页信息
 * @param {string} message - 响应消息
 */
function successWithPagination(res, data, pagination, message = '获取成功') {
  return res.status(200).json({
    success: true,
    message,
    data,
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      totalPages: Math.ceil(pagination.total / pagination.limit)
    },
    timestamp: new Date().toISOString()
  });
}

/**
 * 错误响应
 * @param {Object} res - Express响应对象
 * @param {string} message - 错误消息
 * @param {number} statusCode - HTTP状态码
 * @param {string} code - 错误代码
 * @param {*} details - 错误详情
 */
function error(res, message = '操作失败', statusCode = 400, code = 'BAD_REQUEST', details = null) {
  return res.status(statusCode).json({
    success: false,
    message,
    code,
    details,
    timestamp: new Date().toISOString()
  });
}

/**
 * 验证错误响应
 * @param {Object} res - Express响应对象
 * @param {Array} errors - 验证错误列表
 */
function validationError(res, errors) {
  return res.status(400).json({
    success: false,
    message: '数据验证失败',
    code: 'VALIDATION_ERROR',
    errors,
    timestamp: new Date().toISOString()
  });
}

/**
 * 未授权响应
 * @param {Object} res - Express响应对象
 * @param {string} message - 错误消息
 */
function unauthorized(res, message = '未授权访问') {
  return res.status(401).json({
    success: false,
    message,
    code: 'UNAUTHORIZED',
    timestamp: new Date().toISOString()
  });
}

/**
 * 禁止访问响应
 * @param {Object} res - Express响应对象
 * @param {string} message - 错误消息
 */
function forbidden(res, message = '权限不足') {
  return res.status(403).json({
    success: false,
    message,
    code: 'FORBIDDEN',
    timestamp: new Date().toISOString()
  });
}

/**
 * 资源未找到响应
 * @param {Object} res - Express响应对象
 * @param {string} message - 错误消息
 */
function notFound(res, message = '资源不存在') {
  return res.status(404).json({
    success: false,
    message,
    code: 'NOT_FOUND',
    timestamp: new Date().toISOString()
  });
}

/**
 * 服务器错误响应
 * @param {Object} res - Express响应对象
 * @param {string} message - 错误消息
 */
function serverError(res, message = '服务器内部错误') {
  return res.status(500).json({
    success: false,
    message,
    code: 'INTERNAL_SERVER_ERROR',
    timestamp: new Date().toISOString()
  });
}

module.exports = {
  success,
  successWithPagination,
  error,
  validationError,
  unauthorized,
  forbidden,
  notFound,
  serverError
};