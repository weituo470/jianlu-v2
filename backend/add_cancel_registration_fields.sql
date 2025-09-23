-- 添加取消报名相关字段到activity_participants表
ALTER TABLE activity_participants
ADD COLUMN cancelled_at DATETIME NULL COMMENT '取消时间',
ADD COLUMN cancelled_by CHAR(36) NULL COMMENT '取消者ID';

-- 更新status字段的枚举值，添加'cancelled'状态
-- 注意：MySQL 5.7+ 需要先删除约束再添加
ALTER TABLE activity_participants
MODIFY COLUMN status ENUM('registered', 'attended', 'absent', 'cancelled')
NOT NULL DEFAULT 'registered' COMMENT '参与状态';