-- 用户活动记录表
CREATE TABLE IF NOT EXISTS user_activities (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    admin_id VARCHAR(36) NULL,
    action_type VARCHAR(50) NOT NULL,
    action_description TEXT NOT NULL,
    target_type VARCHAR(50) NULL,
    target_id VARCHAR(36) NULL,
    ip_address VARCHAR(45) NULL,
    user_agent TEXT NULL,
    metadata JSON NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_admin_id (admin_id),
    INDEX idx_action_type (action_type),
    INDEX idx_created_at (created_at),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 插入一些示例数据
INSERT INTO user_activities (id, user_id, admin_id, action_type, action_description, ip_address, created_at) VALUES
(UUID(), (SELECT id FROM users WHERE username = 'admin'), NULL, 'login', '用户登录系统', '127.0.0.1', NOW() - INTERVAL 1 HOUR),
(UUID(), (SELECT id FROM users WHERE username = 'admin'), NULL, 'profile_update', '更新个人资料', '127.0.0.1', NOW() - INTERVAL 2 HOUR),
(UUID(), (SELECT id FROM users WHERE username = 'sysadmin'), (SELECT id FROM users WHERE username = 'admin'), 'status_change', '管理员修改用户状态', '127.0.0.1', NOW() - INTERVAL 3 HOUR),
(UUID(), (SELECT id FROM users WHERE username = 'opadmin'), (SELECT id FROM users WHERE username = 'admin'), 'password_reset', '管理员重置用户密码', '127.0.0.1', NOW() - INTERVAL 4 HOUR),
(UUID(), (SELECT id FROM users WHERE username = 'teamadmin'), NULL, 'login', '用户登录系统', '127.0.0.1', NOW() - INTERVAL 5 HOUR);