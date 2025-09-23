-- 为团队表添加审核开关字段
ALTER TABLE teams ADD COLUMN require_approval BOOLEAN DEFAULT FALSE NOT NULL COMMENT '是否需要审核加入申请';

-- 添加索引
CREATE INDEX idx_teams_require_approval ON teams(require_approval);
