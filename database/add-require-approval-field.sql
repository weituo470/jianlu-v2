-- 添加require_approval字段到activities表
-- Migration: 2025-10-23-add-require-approval-field.sql

-- 添加审批字段到activities表
ALTER TABLE activities ADD COLUMN require_approval BOOLEAN DEFAULT false NOT NULL COMMENT '是否需要审批，默认不需要';

-- 验证字段是否添加成功
SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT, COLUMN_COMMENT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'activities' AND COLUMN_NAME = 'require_approval';

-- 输出成功信息
SELECT 'require_approval字段已成功添加到activities表' as migration_status;