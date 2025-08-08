-- 数据库用户和权限设置脚本
-- 注意：此脚本需要以root用户身份执行

-- 创建应用数据库用户
CREATE USER IF NOT EXISTS 'jianlu_app'@'localhost' IDENTIFIED BY 'jianlu_app_password_2024';
CREATE USER IF NOT EXISTS 'jianlu_app'@'%' IDENTIFIED BY 'jianlu_app_password_2024';

-- 授予应用用户对数据库的完整权限
GRANT ALL PRIVILEGES ON jianlu_admin.* TO 'jianlu_app'@'localhost';
GRANT ALL PRIVILEGES ON jianlu_admin.* TO 'jianlu_app'@'%';

-- 创建只读用户（用于报表和分析）
CREATE USER IF NOT EXISTS 'jianlu_readonly'@'localhost' IDENTIFIED BY 'jianlu_readonly_password_2024';
CREATE USER IF NOT EXISTS 'jianlu_readonly'@'%' IDENTIFIED BY 'jianlu_readonly_password_2024';

-- 授予只读用户查询权限
GRANT SELECT ON jianlu_admin.* TO 'jianlu_readonly'@'localhost';
GRANT SELECT ON jianlu_admin.* TO 'jianlu_readonly'@'%';

-- 刷新权限
FLUSH PRIVILEGES;

-- 显示创建的用户
SELECT User, Host FROM mysql.user WHERE User LIKE 'jianlu_%';