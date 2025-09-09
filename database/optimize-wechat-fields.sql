-- 微信登录功能数据库优化
USE jianlu_admin;

-- 确保微信相关字段有正确的索引和约束
ALTER TABLE users 
MODIFY COLUMN wechat_openid VARCHAR(100) NULL UNIQUE COMMENT '微信OpenID';

-- 添加索引以提高查询性能
ALTER TABLE users 
ADD INDEX IF NOT EXISTS idx_wechat_openid (wechat_openid),
ADD INDEX IF NOT EXISTS idx_wechat_unionid (wechat_unionid),
ADD INDEX IF NOT EXISTS idx_register_method ((JSON_UNQUOTE(JSON_EXTRACT(profile, '$.register_method'))));

-- 更新现有数据的register_method字段
UPDATE users 
SET profile = JSON_SET(profile, '$.register_method', 'wechat')
WHERE wechat_openid IS NOT NULL 
AND JSON_EXTRACT(profile, '$.register_method') IS NULL;

-- 验证字段修改成功
SHOW COLUMNS FROM users LIKE 'wechat_openid';
SHOW INDEX FROM users WHERE Column_name IN ('wechat_openid', 'wechat_unionid');

-- 显示微信用户统计
SELECT 
    COUNT(*) as total_users,
    COUNT(wechat_openid) as wechat_users,
    COUNT(CASE WHEN wechat_openid IS NOT NULL THEN 1 END) as wechat_user_count
FROM users;