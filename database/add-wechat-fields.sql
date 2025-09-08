-- 为微信登录功能添加字段到users表
USE jianlu_admin;

-- 添加微信相关字段
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS wechat_openid VARCHAR(100) NULL COMMENT '微信OpenID',
ADD COLUMN IF NOT EXISTS wechat_unionid VARCHAR(100) NULL COMMENT '微信UnionID',
ADD COLUMN IF NOT EXISTS wechat_nickname VARCHAR(100) NULL COMMENT '微信昵称',
ADD COLUMN IF NOT EXISTS wechat_avatar TEXT NULL COMMENT '微信头像URL';

-- 添加索引以提高查询性能
ALTER TABLE users 
ADD INDEX IF NOT EXISTS idx_wechat_openid (wechat_openid);

-- 为deleted_at字段添加索引（如果不存在）
ALTER TABLE users 
ADD INDEX IF NOT EXISTS idx_deleted_at (deleted_at);

-- 添加updated_at字段的ON UPDATE CURRENT_TIMESTAMP属性（如果需要）
ALTER TABLE users 
MODIFY COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- 验证字段添加成功
DESCRIBE users;