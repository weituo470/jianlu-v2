-- 为团队表添加类型字段
ALTER TABLE teams ADD COLUMN team_type VARCHAR(50) NOT NULL DEFAULT 'general' COMMENT '团队类型';

-- 添加索引以提高查询性能
CREATE INDEX idx_teams_team_type ON teams(team_type);

-- 插入一些示例数据（可选）
UPDATE teams SET team_type = 'development' WHERE name LIKE '%开发%' OR name LIKE '%Development%';
UPDATE teams SET team_type = 'testing' WHERE name LIKE '%测试%' OR name LIKE '%Test%';
UPDATE teams SET team_type = 'design' WHERE name LIKE '%设计%' OR name LIKE '%Design%';
UPDATE teams SET team_type = 'marketing' WHERE name LIKE '%市场%' OR name LIKE '%Marketing%';
UPDATE teams SET team_type = 'operation' WHERE name LIKE '%运营%' OR name LIKE '%Operation%';

-- 查看修改结果
SELECT id, name, team_type, status, created_at FROM teams LIMIT 10;