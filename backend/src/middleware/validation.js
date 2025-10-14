const Joi = require('joi');
const { validationResult } = require('express-validator');
const { ValidationError } = require('../utils/errors');

/**
 * Collect express-validator results and forward to the central error handler.
 */
function validateRequest(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formattedErrors = errors.array().map(error => ({
      field: error.path || error.param,
      message: error.msg,
      value: error.value
    }));

    return next(new ValidationError(undefined, formattedErrors));
  }
  next();
}

/**
 * Apply a Joi schema to a request section and forward validation failures.
 * @param {Object} schema Joi schema definition
 * @param {string} source Request section ('body', 'query', 'params')
 */
function validate(schema, source = 'body') {
  return (req, res, next) => {
    const data = req[source];
    const { error, value } = schema.validate(data, {
      abortEarly: false, // collect all validation issues
      allowUnknown: false, // reject unknown fields
      stripUnknown: true // remove unknown fields before downstream usage
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context.value
      }));

      return next(new ValidationError(undefined, errors));
    }

    req[source] = value;
    next();
  };
}

const loginSchema = Joi.object({
   username: Joi.string()
     .pattern(/^[a-zA-Z0-9_]+$/)
     .min(3)
     .max(30)
     .required()
     .messages({
       'string.pattern.base': '鐢ㄦ埛鍚嶅彧鑳藉寘鍚瓧姣嶃€佹暟瀛楀拰涓嬪垝绾?',
       'string.min': '鐢ㄦ埛鍚嶈嚦灏?涓瓧绗?',
       'string.max': '鐢ㄦ埛鍚嶆渶澶?0涓瓧绗?',
       'any.required': '鐢ㄦ埛鍚嶄笉鑳戒负绌?'
     }),
   password: Joi.string()
     .min(6)
     .max(50)
     .required()
     .messages({
       'string.min': '瀵嗙爜鑷冲皯6涓瓧绗?',
       'string.max': '瀵嗙爜鏈€澶?0涓瓧绗?',
       'any.required': '瀵嗙爜涓嶈兘涓虹┖'
     }),
   rememberMe: Joi.boolean().default(false)
 });
 
 /**
  * 鐢ㄦ埛鍒涘缓楠岃瘉妯″紡
  */
 const createUserSchema = Joi.object({
   username: Joi.string()
     .pattern(/^[a-zA-Z0-9_]+$/)
     .min(3)
     .max(30)
     .required()
     .messages({
       'string.pattern.base': '鐢ㄦ埛鍚嶅彧鑳藉寘鍚瓧姣嶃€佹暟瀛楀拰涓嬪垝绾?',
       'string.min': '鐢ㄦ埛鍚嶈嚦灏?涓瓧绗?',
       'string.max': '鐢ㄦ埛鍚嶆渶澶?0涓瓧绗?',
       'any.required': '鐢ㄦ埛鍚嶄笉鑳戒负绌?'
     }),
   email: Joi.string()
     .email()
     .required()
     .messages({
       'string.email': '閭鏍煎紡涓嶆纭?',
       'any.required': '閭涓嶈兘涓虹┖'
     }),
   password: Joi.string()
     .min(6)
     .max(50)
     .required()
     .messages({
       'string.min': '瀵嗙爜鑷冲皯6涓瓧绗?',
       'string.max': '瀵嗙爜鏈€澶?0涓瓧绗?',
       'any.required': '瀵嗙爜涓嶈兘涓虹┖'
     }),
   role: Joi.string()
     .valid('super_admin', 'admin', 'user')
     .required()
     .messages({
       'any.only': '瑙掕壊蹇呴』鏄痵uper_admin銆乤dmin鎴杣ser涔嬩竴',
       'any.required': '瑙掕壊涓嶈兘涓虹┖'
     }),
   profile: Joi.object({
     nickname: Joi.string().max(50),
     avatar: Joi.string().uri(),
     phone: Joi.string().pattern(/^1[3-9]\d{9}$/),
     department: Joi.string().max(100)
   }).default({})
 });
 
 /**
  * 鐢ㄦ埛鏇存柊楠岃瘉妯″紡
  */
 const updateUserSchema = Joi.object({
   username: Joi.string()
     .alphanum()
     .min(3)
     .max(30)
     .messages({
       'string.alphanum': '鐢ㄦ埛鍚嶅彧鑳藉寘鍚瓧姣嶅拰鏁板瓧',
       'string.min': '鐢ㄦ埛鍚嶈嚦灏?涓瓧绗?',
       'string.max': '鐢ㄦ埛鍚嶆渶澶?0涓瓧绗?'
     }),
   email: Joi.string()
     .email()
     .messages({
       'string.email': '閭鏍煎紡涓嶆纭?'
     }),
   role: Joi.string()
     .valid('super_admin', 'admin', 'user')
     .messages({
       'any.only': '瑙掕壊蹇呴』鏄痵uper_admin銆乤dmin鎴杣ser涔嬩竴'
     }),
   status: Joi.string()
     .valid('active', 'inactive')
     .messages({
       'any.only': '鐘舵€佸繀椤绘槸active鎴杋nactive'
     }),
   profile: Joi.object({
     nickname: Joi.string().max(50),
     avatar: Joi.string().uri(),
     phone: Joi.string().pattern(/^1[3-9]\d{9}$/),
     department: Joi.string().max(100)
   })
 });
 
 /**
  * 鍒嗛〉鏌ヨ楠岃瘉妯″紡
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
  * ID鍙傛暟楠岃瘉妯″紡
  */
 const idParamSchema = Joi.object({
   id: Joi.string().uuid().required().messages({
     'string.guid': 'ID鏍煎紡涓嶆纭?',
     'any.required': 'ID涓嶈兘涓虹┖'
   })
 });
 
 /**
  * 瀵嗙爜閲嶇疆楠岃瘉妯″紡
  */
 const resetPasswordSchema = Joi.object({
   newPassword: Joi.string()
     .min(6)
     .max(50)
     .required()
     .messages({
       'string.min': '鏂板瘑鐮佽嚦灏?涓瓧绗?',
       'string.max': '鏂板瘑鐮佹渶澶?0涓瓧绗?',
       'any.required': '鏂板瘑鐮佷笉鑳戒负绌?'
     })
 });
 
 /**
  * 鎵归噺鎿嶄綔楠岃瘉妯″紡
  */
 const batchOperationSchema = Joi.object({
   ids: Joi.array()
     .items(Joi.string().uuid())
     .min(1)
     .required()
     .messages({
       'array.min': '鑷冲皯閫夋嫨涓€涓」鐩?',
       'any.required': 'ID鍒楄〃涓嶈兘涓虹┖'
     }),
   action: Joi.string()
     .valid('activate', 'deactivate', 'delete')
     .required()
     .messages({
       'any.only': '鎿嶄綔绫诲瀷蹇呴』鏄痑ctivate銆乨eactivate鎴杁elete',
       'any.required': '鎿嶄綔绫诲瀷涓嶈兘涓虹┖'
     })
 });
 
 /**
  * 寰俊鐧诲綍楠岃瘉妯″紡
  */
 const wechatLoginSchema = Joi.object({
   code: Joi.string()
     .min(10)
     .max(100)
     .required()
     .messages({
       'string.min': '鎺堟潈鐮佹牸寮忎笉姝ｇ‘',
       'string.max': '鎺堟潈鐮佹牸寮忎笉姝ｇ‘',
       'any.required': '寰俊鎺堟潈鐮佷笉鑳戒负绌?'
     })
 });
 
 module.exports = {
   validate,
   validateRequest,
   loginSchema,
   createUserSchema,
   updateUserSchema,
   paginationSchema,
   idParamSchema,
   resetPasswordSchema,
   batchOperationSchema,
   wechatLoginSchema
 };




