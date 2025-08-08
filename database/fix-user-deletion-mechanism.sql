-- 用户删除机制根本性修复脚本
-- 执行前请确保已备份数据库

USE jianlu_admin;

-- 1. 备份现有数据
CREATE TABLE IF NOT EXISTS users_backup_deletion_fix AS 
SELECT * FROM users WHERE 1=0;

INSERT INTO users_backup_deletion_fix SELECT * FROM users;

-- 2. 创建用户删除审计表
CREATE TABLE IF NOT EXISTS user_deletion_audit (
    id VARCHAR(36) PRIMARY KEY,
    original_user_id VARCHAR(36) NOT NULL,
    deleted_user_data JSON NOT NULL,
    deletion_reason VARCHAR(255),
    deletion_type ENUM('soft', 'hard', 'auto') NOT NULL DEFAULT 'soft',
    deleted_by VARCHAR(36),
    deleted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    can_restore BOOLEAN DEFAULT TRUE,
    restored_at TIMESTAMP NULL,
    restored_by VARCHAR(36) NULL,
    INDEX idx_original_user_id (original_user_id),
    INDEX idx_deleted_by (deleted_by),
    INDEX idx_deleted_at (deleted_at),
    INDEX idx_deletion_type (deletion_type)
);

-- 3. 添加删除时间字段
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP NULL;

-- 4. 处理现有的软删除用户，释放用户名和邮箱
UPDATE users 
SET 
    username = CONCAT(username, '_deleted_', UNIX_TIMESTAMP(updated_at)),
    email = CONCAT(email, '_deleted_', UNIX_TIMESTAMP(updated_at)),
    deleted_at = updated_at
WHERE status = 'deleted';

-- 5. 为处理过的用户创建审计记录
INSERT INTO user_deletion_audit (
    id,
    original_user_id,
    deleted_user_data,
    deletion_reason,
    deletion_type,
    deleted_by,
    deleted_at
)
SELECT 
    UUID() as id,
    id as original_user_id,
    JSON_OBJECT(
        'id', id,
        'username', SUBSTRING_INDEX(username, '_deleted_', 1),
        'email', SUBSTRING_INDEX(email, '_deleted_', 1),
        'role', role,
        'status', status,
        'created_at', created_at,
        'updated_at', updated_at
    ) as deleted_user_data,
    '历史数据迁移' as deletion_reason,
    'soft' as deletion_type,
    'system' as deleted_by,
    deleted_at
FROM users 
WHERE status = 'deleted' AND deleted_at IS NOT NULL;

-- 6. 删除旧的唯一索引（如果存在）
DROP INDEX IF EXISTS username ON users;
DROP INDEX IF EXISTS email ON users;

-- 7. 创建新的条件唯一索引（只对非删除用户生效）
-- 注意：MySQL 8.0.13+ 支持函数索引，较低版本需要使用其他方法
CREATE UNIQUE INDEX idx_username_active 
ON users (username) 
WHERE status != 'deleted';

CREATE UNIQUE INDEX idx_email_active 
ON users (email) 
WHERE status != 'deleted';

-- 8. 如果MySQL版本不支持条件索引，使用以下替代方案
-- 创建复合唯一索引，包含状态字段
-- DROP INDEX IF EXISTS idx_username_active ON users;
-- DROP INDEX IF EXISTS idx_email_active ON users;
-- CREATE UNIQUE INDEX idx_username_status ON users (username, status);
-- CREATE UNIQUE INDEX idx_email_status ON users (email, status);

-- 9. 验证修复结果
SELECT '修复结果验证:' as info;

SELECT 
    '用户状态分布' as category,
    status,
    COUNT(*) as count
FROM users 
GROUP BY status;

SELECT 
    '已删除用户处理情况' as category,
    COUNT(*) as processed_deleted_users
FROM users 
WHERE status = 'deleted' AND username LIKE '%_deleted_%';

SELECT 
    '审计记录创建情况' as category,
    COUNT(*) as audit_records
FROM user_deletion_audit;

-- 10. 检查是否还有用户名冲突
SELECT 
    '用户名冲突检查' as category,
    username,
    COUNT(*) as count
FROM users 
WHERE status != 'deleted'
GROUP BY username 
HAVING COUNT(*) > 1;

SELECT 
    '邮箱冲突检查' as category,
    email,
    COUNT(*) as count
FROM users 
WHERE status != 'deleted'
GROUP BY email 
HAVING COUNT(*) > 1;