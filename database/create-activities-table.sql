-- 创建活动表
CREATE TABLE IF NOT EXISTS activities (
    id VARCHAR(36) PRIMARY KEY,
    team_id VARCHAR(36) NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    type VARCHAR(50) NOT NULL DEFAULT 'other',
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    location VARCHAR(255),
    max_participants INT,
    current_participants INT DEFAULT 0,
    status ENUM('draft', 'published', 'ongoing', 'completed', 'cancelled') DEFAULT 'draft',
    creator_id VARCHAR(36) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
    FOREIGN KEY (creator_id) REFERENCES users(id),
    INDEX idx_team (team_id),
    INDEX idx_creator (creator_id),
    INDEX idx_status (status),
    INDEX idx_start_time (start_time),
    INDEX idx_type (type)
);

-- 创建活动参与者表
CREATE TABLE IF NOT EXISTS activity_participants (
    id VARCHAR(36) PRIMARY KEY,
    activity_id VARCHAR(36) NOT NULL,
    user_id VARCHAR(36) NOT NULL,
    status ENUM('registered', 'attended', 'cancelled') DEFAULT 'registered',
    registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    attended_at TIMESTAMP NULL,
    notes TEXT,
    FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_participant (activity_id, user_id),
    INDEX idx_activity (activity_id),
    INDEX idx_user (user_id),
    INDEX idx_status (status)
);

-- 插入一些示例活动数据
INSERT IGNORE INTO activities (id, team_id, title, description, type, start_time, end_time, location, max_participants, status, creator_id) VALUES
('act-001', (SELECT id FROM teams LIMIT 1), '团队周会', '每周例行团队会议，讨论项目进展和问题', 'meeting', '2025-08-10 10:00:00', '2025-08-10 11:00:00', '会议室A', 20, 'published', (SELECT id FROM users WHERE role = 'super_admin' LIMIT 1)),
('act-002', (SELECT id FROM teams LIMIT 1), 'JavaScript培训', '前端开发技术培训，适合初中级开发者', 'training', '2025-08-12 14:00:00', '2025-08-12 17:00:00', '培训室B', 30, 'published', (SELECT id FROM users WHERE role = 'super_admin' LIMIT 1)),
('act-003', (SELECT id FROM teams LIMIT 1), '产品设计工作坊', '用户体验设计实践工作坊', 'workshop', '2025-08-15 09:00:00', '2025-08-15 18:00:00', '创意空间', 15, 'draft', (SELECT id FROM users WHERE role = 'super_admin' LIMIT 1)),
('act-004', (SELECT id FROM teams LIMIT 1), '团队建设活动', '户外团建活动，增进团队凝聚力', 'team_building', '2025-08-18 09:00:00', '2025-08-18 17:00:00', '郊外公园', 50, 'published', (SELECT id FROM users WHERE role = 'super_admin' LIMIT 1)),
('act-005', (SELECT id FROM teams LIMIT 1), '项目启动会', 'Q3新项目启动会议', 'project', '2025-08-20 10:00:00', '2025-08-20 12:00:00', '大会议室', 25, 'completed', (SELECT id FROM users WHERE role = 'super_admin' LIMIT 1));