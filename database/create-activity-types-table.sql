-- 创建活动类型表
-- 执行时间：2024年12月

-- 创建活动类型表
CREATE TABLE IF NOT EXISTS activity_types (
    id VARCHAR(50) PRIMARY KEY COMMENT '活动类型ID',
    name VARCHAR(100) NOT NULL COMMENT '活动类型名称',
    description TEXT COMMENT '活动类型描述',
    is_default BOOLEAN DEFAULT FALSE NOT NULL COMMENT '是否为系统默认类型',
    sort_order INT DEFAULT 0 NOT NULL COMMENT '排序顺序',
    is_active BOOLEAN DEFAULT TRUE NOT NULL COMMENT '是否启用',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='活动类型表';

-- 创建索引
CREATE INDEX idx_activity_types_is_active ON activity_types(is_active);
CREATE INDEX idx_activity_types_is_default ON activity_types(is_default);
CREATE INDEX idx_activity_types_sort_order ON activity_types(sort_order);

-- 插入默认数据
INSERT INTO activity_types (id, name, description, is_default, sort_order, is_active) VALUES
('meeting', '会议', '团队会议、讨论会、评审会等', TRUE, 1, TRUE),
('training', '培训', '技能培训、知识分享、学习活动等', TRUE, 2, TRUE),
('workshop', '工作坊', '实践性强的学习和创作活动', TRUE, 3, TRUE),
('team_building', '团建', '团队建设、娱乐活动、聚餐等', TRUE, 4, TRUE),
('project', '项目', '项目启动、里程碑、项目总结等', TRUE, 5, TRUE),
('presentation', '演示', '产品演示、成果展示、汇报等', TRUE, 6, TRUE),
('brainstorm', '头脑风暴', '创意讨论、方案设计、问题解决等', TRUE, 7, TRUE),
('review', '评审', '代码评审、设计评审、方案评审等', TRUE, 8, TRUE),
('ceremony', '仪式', '开工仪式、庆祝活动、颁奖等', TRUE, 9, TRUE),
('other', '其他', '其他类型的活动', TRUE, 10, TRUE)
ON DUPLICATE KEY UPDATE
    name = VALUES(name),
    description = VALUES(description),
    is_default = VALUES(is_default),
    sort_order = VALUES(sort_order),
    updated_at = CURRENT_TIMESTAMP;

-- 更新Activity表，添加外键约束（如果需要的话）
-- 注意：由于现有的Activity表可能已经有数据，我们不强制添加外键约束
-- 但可以添加一个检查，确保activity_type字段的值在activity_types表中存在

-- 验证数据
SELECT 
    id,
    name,
    description,
    is_default,
    sort_order,
    is_active,
    created_at,
    updated_at
FROM activity_types 
ORDER BY sort_order, created_at;

-- 显示创建结果
SELECT 
    CONCAT('✅ 活动类型表创建成功，共插入 ', COUNT(*), ' 条默认数据') as result
FROM activity_types;