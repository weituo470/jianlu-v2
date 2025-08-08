-- 数据库连接测试脚本
-- 显示数据库信息
SELECT 'Database Connection Test' as test_name;
SELECT DATABASE() as current_database;
SELECT USER() as current_user_info;
SELECT VERSION() as mysql_version;

-- 显示表结构
SHOW TABLES;

-- 验证数据
SELECT 'User Data' as section;
SELECT username, email, role, status FROM users;

SELECT 'System Config' as section;
SELECT config_key, config_value, category FROM system_configs LIMIT 5;

SELECT 'Team Data' as section;
SELECT name, status, member_count FROM teams;