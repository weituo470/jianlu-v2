-- 用户角色简化数据库更新脚本
-- 执行前请确保已备份数据库

USE jianlu_admin;

-- 1. 备份现有用户数据
CREATE TABLE IF NOT EXISTS users_backup_roles AS 
SELECT * FROM users WHERE 1=0;

INSERT INTO users_backup_roles SELECT * FROM users;

-- 2. 查看当前角色分布
SELECT '当前角色分布:' as info;
SELECT role, COUNT(*) as count FROM users GROUP BY role;

-- 3. 更新角色枚举定义
ALTER TABLE users 
MODIFY COLUMN role ENUM('super_admin', 'admin', 'user') 
NOT NULL DEFAULT 'user';

-- 4. 数据迁移：将细分的管理员角色统一为admin
UPDATE users 
SET role = 'admin' 
WHERE role IN ('system_admin', 'operation_admin', 'team_admin');

-- 5. 验证迁移结果
SELECT '迁移后角色分布:' as info;
SELECT role, COUNT(*) as count FROM users GROUP BY role;

-- 6. 检查是否有超级管理员
SELECT '超级管理员检查:' as info;
SELECT username, email, role, status 
FROM users 
WHERE role = 'super_admin';

-- 7. 如果没有超级管理员，创建一个默认的
INSERT IGNORE INTO users (
    id, 
    username, 
    email, 
    password_hash, 
    role, 
    status, 
    profile,
    created_at,
    updated_at
) VALUES (
    UUID(),
    'superadmin',
    'superadmin@jianlu.com',
    '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/VcSAg/9qm', -- superadmin123
    'super_admin',
    'active',
    JSON_OBJECT('nickname', '超级管理员', 'department', '系统管理部'),
    NOW(),
    NOW()
);

-- 8. 最终验证
SELECT '最终验证结果:' as info;
SELECT 
    role,
    COUNT(*) as count,
    GROUP_CONCAT(username) as users
FROM users 
WHERE status != 'deleted'
GROUP BY role 
ORDER BY 
    CASE role 
        WHEN 'super_admin' THEN 1 
        WHEN 'admin' THEN 2 
        WHEN 'user' THEN 3 
    END;