-- 修复activity_participants表，添加缺失的字段

-- 1. 首先更新status字段的枚举值，添加pending、approved、rejected状态
ALTER TABLE activity_participants
MODIFY COLUMN status ENUM('pending', 'registered', 'approved', 'attended', 'absent', 'cancelled', 'rejected')
NOT NULL DEFAULT 'registered' COMMENT '参与状态';

-- 2. 添加拒绝相关字段
ALTER TABLE activity_participants
ADD COLUMN rejection_reason TEXT NULL COMMENT '拒绝原因',
ADD COLUMN rejected_at DATETIME NULL COMMENT '拒绝时间',
ADD COLUMN rejected_by CHAR(36) NULL COMMENT '拒绝者ID';

-- 3. 添加审核相关字段
ALTER TABLE activity_participants
ADD COLUMN approved_at DATETIME NULL COMMENT '批准时间',
ADD COLUMN approved_by CHAR(36) NULL COMMENT '批准者ID';

-- 4. 添加索引优化查询性能
ALTER TABLE activity_participants
ADD INDEX idx_activity_status (activity_id, status),
ADD INDEX idx_user_activity (user_id, activity_id);