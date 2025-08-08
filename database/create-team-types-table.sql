-- 创建团队类型表
-- 执行时间：2024年12月

-- 创建团队类型表
CREATE TABLE IF NOT EXISTS team_types (
    id VARCHAR(50) PRIMARY KEY COMMENT '团队类型ID',
    name VARCHAR(100) NOT NULL COMMENT '团队类型名称',
    description TEXT COMMENT '团队类型描述',
    is_default BOOLEAN DEFAULT FALSE NOT NULL COMMENT '是否为系统默认类型',
    sort_order INT DEFAULT 0 NOT NULL COMMENT '排序顺序',
    is_active BOOLEAN DEFAULT TRUE NOT NULL COMMENT '是否启用',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='团队类型表';

-- 创建索引
CREATE INDEX idx_team_types_is_active ON team_types(is_active);
CREATE INDEX idx_team_types_is_default ON team_types(is_default);
CREATE INDEX idx_team_types_sort_order ON team_types(sort_order);

-- 插入默认数据
INSERT INTO team_types (id, name, description, is_default, sort_order, is_active) VALUES
('general', '通用团队', '适用于一般性工作团队', TRUE, 1, TRUE),
('development', '开发团队', '负责软件开发和技术实现', TRUE, 2, TRUE),
('testing', '测试团队', '负责产品测试和质量保证', TRUE, 3, TRUE),
('design', '设计团队', '负责UI/UX设计和视觉创意', TRUE, 4, TRUE),
('marketing', '市场团队', '负责市场推广和品牌建设', TRUE, 5, TRUE),
('operation', '运营团队', '负责产品运营和用户增长', TRUE, 6, TRUE),
('research', '研发团队', '负责技术研究和创新', TRUE, 7, TRUE),
('support', '支持团队', '负责客户服务和技术支持', TRUE, 8, TRUE)
ON DUPLICATE KEY UPDATE
    name = VALUES(name),
    description = VALUES(description),
    is_default = VALUES(is_default),
    sort_order = VALUES(sort_order),
    updated_at = CURRENT_TIMESTAMP;

-- 更新Team表，添加外键约束（如果需要的话）
-- 注意：由于现有的Team表可能已经有数据，我们不强制添加外键约束
-- 但可以添加一个检查，确保team_type字段的值在team_types表中存在

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
FROM team_types 
ORDER BY sort_order, created_at;

-- 显示创建结果
SELECT 
    CONCAT('✅ 团队类型表创建成功，共插入 ', COUNT(*), ' 条默认数据') as result
FROM team_types;