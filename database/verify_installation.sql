-- 数据库安装验证脚本
-- 验证数据库jianlu_admin是否正确创建并包含所有必要的表结构

SELECT '=== 数据库安装验证报告 ===' as report_title;

-- 1. 验证数据库连接
SELECT 'Database Connection' as check_item, 
       DATABASE() as database_name,
       USER() as current_user_info,
       'PASS' as status;

-- 2. 验证表结构
SELECT 'Table Structure' as check_item,
       COUNT(*) as table_count,
       CASE WHEN COUNT(*) = 8 THEN 'PASS' ELSE 'FAIL' END as status
FROM information_schema.tables 
WHERE table_schema = 'jianlu_admin';

-- 3. 列出所有表
SELECT 'Tables List' as check_item, table_name, 'EXISTS' as status
FROM information_schema.tables 
WHERE table_schema = 'jianlu_admin'
ORDER BY table_name;

-- 4. 验证初始数据
SELECT 'Initial Data - Users' as check_item,
       COUNT(*) as record_count,
       CASE WHEN COUNT(*) >= 1 THEN 'PASS' ELSE 'FAIL' END as status
FROM users;

SELECT 'Initial Data - System Configs' as check_item,
       COUNT(*) as record_count,
       CASE WHEN COUNT(*) >= 5 THEN 'PASS' ELSE 'FAIL' END as status
FROM system_configs;

-- 5. 验证管理员账户
SELECT 'Admin Account' as check_item,
       username,
       email,
       role,
       CASE WHEN role = 'super_admin' AND status = 'active' THEN 'PASS' ELSE 'FAIL' END as status
FROM users 
WHERE role = 'super_admin';

SELECT '=== 验证完成 ===' as report_end;