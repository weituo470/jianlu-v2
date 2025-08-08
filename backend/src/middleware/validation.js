const Joi = require('joi');
const { validationError } = require('../utils/response');

/**
 * 数据验证中间件
 * @param {Object} schema - Joi验证模式
 * @param {string} source - 验证数据源 ('body', 'query', 'params')
 */
function validate(schema, source = 'body') {
  return (req, res, next) => {
    const data = req[source];
    const { error, value } = schema.validate(data, {
      abortEarly: false, // 返回所有验证错误
      allowUnknown: false, // 不允许未知字段
      stripUnknown: true // 移除未知字段
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context.value
      }));
      
      return validationError(res, errors);
    }

    // 将验证后的数据替换原始数据
    req[source] = value;
    next();
  };
}

/**
 * 登录验证模式
 */
const loginSchema = Joi.object({
  username: Joi.string()
    .pattern(/^[a-zA-Z0-9_]+$/)
    .min(3)
    .max(30)
    .required()
    .messages({
      'string.pattern.base': '用户名只能包含字母、数字和下划线',
      'string.min': '用户名至少3个字符',
      'string.max': '用户名最多30个字符',
      'any.required': '用户名不能为空'
    }),
  password: Joi.string()
    .min(6)
    .max(50)
    .required()
    .messages({
      'string.min': '密码至少6个字符',
      'string.max': '密码最多50个字符',
      'any.required': '密码不能为空'
    }),
  rememberMe: Joi.boolean().default(false)
});

/**
 * 用户创建验证模式
 */
const createUserSchema = Joi.object({
  username: Joi.string()
    .pattern(/^[a-zA-Z0-9_]+$/)
    .min(3)
    .max(30)
    .required()
    .messages({
      'string.pattern.base': '用户名只能包含字母、数字和下划线',
      'string.min': '用户名至少3个字符',
      'string.max': '用户名最多30个字符',
      'any.required': '用户名不能为空'
    }),
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.email': '邮箱格式不正确',
      'any.required': '邮箱不能为空'
    }),
  password: Joi.string()
    .min(6)
    .max(50)
    .required()
    .messages({
      'string.min': '密码至少6个字符',
      'string.max': '密码最多50个字符',
      'any.required': '密码不能为空'
    }),
  role: Joi.string()
    .valid('super_admin', 'admin', 'user')
    .required()
    .messages({
      'any.only': '角色必须是super_admin、admin或user之一',
      'any.required': '角色不能为空'
    }),
  profile: Joi.object({
    nickname: Joi.string().max(50),
    avatar: Joi.string().uri(),
    phone: Joi.string().pattern(/^1[3-9]\d{9}$/),
    department: Joi.string().max(100)
  }).default({})
});

/**
 * 用户更新验证模式
 */
const updateUserSchema = Joi.object({
  username: Joi.string()
    .alphanum()
    .min(3)
    .max(30)
    .messages({
      'string.alphanum': '用户名只能包含字母和数字',
      'string.min': '用户名至少3个字符',
      'string.max': '用户名最多30个字符'
    }),
  email: Joi.string()
    .email()
    .messages({
      'string.email': '邮箱格式不正确'
    }),
  role: Joi.string()
    .valid('super_admin', 'admin', 'user')
    .messages({
      'any.only': '角色必须是super_admin、admin或user之一'
    }),
  status: Joi.string()
    .valid('active', 'inactive')
    .messages({
      'any.only': '状态必须是active或inactive'
    }),
  profile: Joi.object({
    nickname: Joi.string().max(50),
    avatar: Joi.string().uri(),
    phone: Joi.string().pattern(/^1[3-9]\d{9}$/),
    department: Joi.string().max(100)
  })
});

/**
 * 分页查询验证模式
 */
const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
  search: Joi.string().max(100).allow(''),
  status: Joi.string().valid('active', 'inactive', 'deleted').allow(''),
  role: Joi.string().valid('super_admin', 'admin', 'user').allow(''),
  startDate: Joi.date().iso(),
  endDate: Joi.date().iso().min(Joi.ref('startDate'))
});

/**
 * ID参数验证模式
 */
const idParamSchema = Joi.object({
  id: Joi.string().uuid().required().messages({
    'string.guid': 'ID格式不正确',
    'any.required': 'ID不能为空'
  })
});

/**
 * 密码重置验证模式
 */
const resetPasswordSchema = Joi.object({
  newPassword: Joi.string()
    .min(6)
    .max(50)
    .required()
    .messages({
      'string.min': '新密码至少6个字符',
      'string.max': '新密码最多50个字符',
      'any.required': '新密码不能为空'
    })
});

/**
 * 批量操作验证模式
 */
const batchOperationSchema = Joi.object({
  ids: Joi.array()
    .items(Joi.string().uuid())
    .min(1)
    .required()
    .messages({
      'array.min': '至少选择一个项目',
      'any.required': 'ID列表不能为空'
    }),
  action: Joi.string()
    .valid('activate', 'deactivate', 'delete')
    .required()
    .messages({
      'any.only': '操作类型必须是activate、deactivate或delete',
      'any.required': '操作类型不能为空'
    })
});

module.exports = {
  validate,
  loginSchema,
  createUserSchema,
  updateUserSchema,
  paginationSchema,
  idParamSchema,
  resetPasswordSchema,
  batchOperationSchema
};