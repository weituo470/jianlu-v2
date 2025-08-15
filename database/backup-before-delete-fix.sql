-- 数据安全修复前的备份脚本
-- 执行时间: 2025-01-15
-- 目的: 在修复用户删除机制前备份关键数据

-- 备份用户表
CREATE TABLE users_backup_20250115 AS SELECT * FROM users;

-- 备份用户删除审计表
CREATE TABLE user_deletion_audit_backup_20250115 AS SELECT * FROM user_deletion_audit;

-- 验证备份完整性
SELECT 
    'users' as table_name,
    COUNT(*) as original_count,
    (SELECT COUNT(*) FROM users_backup_20250115) as backup_count,
    CASE 
        WHEN COUNT(*) = (SELECT COUNT(*) FROM users_backup_20250115) 
        THEN '✅ 备份完整' 
        ELSE '❌ 备份不完整' 
    END as status
FROM users

UNION ALL

SELECT 
    'user_deletion_audit' as table_name,
    COUNT(*) as original_count,
    (SELECT COUNT(*) FROM user_deletion_audit_backup_20250115) as backup_count,
    CASE 
        WHEN COUNT(*) = (SELECT COUNT(*) FROM user_deletion_audit_backup_20250115) 
        THEN '✅ 备份完整' 
        ELSE '❌ 备份不完整' 
    END as status
FROM user_deletion_audit;

-- 记录备份操作
INSERT INTO system_logs (operation, description, created_at) VALUES 
('DATA_BACKUP', '用户删除机制修复前数据备份', NOW());