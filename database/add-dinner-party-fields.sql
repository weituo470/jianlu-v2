-- 聚餐活动功能数据库迁移
USE jianlu_admin;

-- 为activities表添加聚餐活动特殊字段
ALTER TABLE activities 
ADD COLUMN min_participants INT NULL COMMENT '最少参与人数，低于此人数活动自动取消' AFTER cost_description,
ADD COLUMN company_budget DECIMAL(10,2) NULL DEFAULT 0.00 COMMENT '公司预算上限' AFTER min_participants,
ADD COLUMN auto_cancel_threshold ENUM('min_participants', 'max_participants', 'both') NULL DEFAULT NULL COMMENT '自动取消条件' AFTER company_budget,
ADD COLUMN activity_special_type ENUM('dinner_party', 'team_building', 'company_event', 'normal') NULL DEFAULT 'normal' COMMENT '活动特殊类型' AFTER auto_cancel_threshold;

-- 添加索引以提高查询性能
ALTER TABLE activities 
ADD INDEX idx_activity_special_type (activity_special_type),
ADD INDEX idx_min_participants (min_participants),
ADD INDEX idx_company_budget (company_budget);

-- 验证字段添加成功
SHOW COLUMNS FROM activities LIKE '%min_participants%';
SHOW COLUMNS FROM activities LIKE '%company_budget%';
SHOW COLUMNS FROM activities LIKE '%auto_cancel_threshold%';
SHOW COLUMNS FROM activities LIKE '%activity_special_type%';

-- 显示数据库表结构信息
DESCRIBE activities;

-- 插入一个示例聚餐活动数据用于测试
INSERT INTO activities (
    id, 
    title, 
    description, 
    type, 
    team_id, 
    start_time, 
    end_time, 
    location, 
    min_participants, 
    max_participants, 
    company_budget, 
    total_cost, 
    company_ratio, 
    activity_special_type, 
    auto_cancel_threshold, 
    status, 
    creator_id, 
    created_at, 
    updated_at
) VALUES (
    UUID(), 
    '周末聚餐活动示例', 
    '公司团队周末聚餐，增进同事感情', 
    'social', 
    (SELECT id FROM teams LIMIT 1), 
    DATE_ADD(NOW(), INTERVAL 7 DAY), 
    DATE_ADD(NOW(), INTERVAL 7 DAY + INTERVAL 3 HOUR), 
    '某餐厅', 
    5, 
    10, 
    1000.00, 
    1200.00, 
    100.00, 
    'dinner_party', 
    'both', 
    'published', 
    (SELECT id FROM users LIMIT 1), 
    NOW(), 
    NOW()
);

-- 验证示例数据插入成功
SELECT * FROM activities WHERE activity_special_type = 'dinner_party';

-- 显示迁移完成信息
SELECT '数据库迁移完成！聚餐活动功能已添加。' as message;