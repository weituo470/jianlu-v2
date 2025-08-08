-- 简庐管理后台系统初始化数据
USE jianlu_admin;

-- 插入默认系统管理员账户
-- 密码: admin123 (实际部署时需要修改)
INSERT INTO users (id, username, email, password_hash, role, status, profile) VALUES 
(
  UUID(),
  'admin',
  'admin@jianlu.com',
  '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj/VcSAg/9qm', -- admin123的bcrypt哈希
  'super_admin',
  'active',
  JSON_OBJECT(
    'name', 'System Administrator',
    'phone', '',
    'department', 'IT Department',
    'position', 'System Administrator'
  )
);

-- 插入系统默认配置
INSERT INTO system_configs (id, config_key, config_value, description, category, is_public) VALUES
(UUID(), 'system.name', JSON_QUOTE('Jianlu Admin System'), 'System Name', 'system', TRUE),
(UUID(), 'system.version', JSON_QUOTE('1.0.0'), 'System Version', 'system', TRUE),
(UUID(), 'auth.session_timeout', '3600', 'Session timeout in seconds', 'auth', FALSE),
(UUID(), 'auth.max_login_attempts', '5', 'Maximum login attempts', 'auth', FALSE),
(UUID(), 'auth.lockout_duration', '1800', 'Account lockout duration in seconds', 'auth', FALSE),
(UUID(), 'team.max_members', '100', 'Maximum team members', 'team', FALSE),
(UUID(), 'activity.max_participants', '200', 'Maximum activity participants', 'activity', FALSE),
(UUID(), 'upload.max_file_size', '10485760', 'Maximum file upload size in bytes', 'upload', FALSE),
(UUID(), 'upload.allowed_types', JSON_ARRAY('jpg', 'jpeg', 'png', 'gif', 'pdf', 'doc', 'docx'), 'Allowed file types', 'upload', FALSE);

-- Create sample team (optional, for testing)
INSERT INTO teams (id, name, description, creator_id, status) VALUES
(
  UUID(),
  'Development Team',
  'Technical team responsible for system development and maintenance',
  (SELECT id FROM users WHERE username = 'admin' LIMIT 1),
  'active'
);