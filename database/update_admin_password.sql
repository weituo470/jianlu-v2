USE jianlu_admin;

-- 更新管理员密码哈希 (密码: admin123)
UPDATE users 
SET password_hash = '$2a$12$zDHqVNS8sifSwdgh.035IuOIakba5iQDIKlyGBdlCyNzBneRY4qTC'
WHERE username = 'admin';

-- 验证更新结果
SELECT username, password_hash, role, status FROM users WHERE username = 'admin';