-- 修复activities表结构，使其与Sequoi模型匹配
-- 执行时间：2024年12月

-- 1. 修改team_id字段，允许为NULL（公开活动可能不属于特定团队）
ALTER TABLE `activities`
MODIFY COLUMN `team_id` VARCHAR(36) NULL COMMENT '团队ID，公开活动可以为空';

-- 2. 添加缺失的字段
ALTER TABLE `activities`
ADD COLUMN IF NOT EXISTS `visibility` ENUM('public', 'team') NOT NULL DEFAULT 'public' COMMENT '活动可见性：public(公开活动), team(团队活动)',
ADD COLUMN IF NOT EXISTS `enable_participant_limit` BOOLEAN DEFAULT TRUE NOT NULL COMMENT '是否开启人数限制，默认开启',
ADD COLUMN IF NOT EXISTS `min_participants` INT NULL DEFAULT 3 COMMENT '最少参与人数，默认3人',
ADD COLUMN IF NOT EXISTS `company_ratio` DECIMAL(5,2) DEFAULT 0.00 COMMENT '公司承担比例(0-100)',
ADD COLUMN IF NOT EXISTS `cost_per_person` DECIMAL(10,2) DEFAULT 0.00 COMMENT '每人应付费用',
ADD COLUMN IF NOT EXISTS `payment_deadline` TIMESTAMP NULL COMMENT '支付截止时间',
ADD COLUMN IF NOT EXISTS `sequence_number` INT NOT NULL DEFAULT 0 COMMENT '活动序号，用于排序，数值越大越新',
ADD COLUMN IF NOT EXISTS `company_budget` DECIMAL(10,2) NULL DEFAULT NULL COMMENT '公司预算上限',
ADD COLUMN IF NOT EXISTS `auto_cancel_threshold` ENUM('min_participants', 'max_participants', 'both') NULL DEFAULT NULL COMMENT '自动取消条件',
ADD COLUMN IF NOT EXISTS `activity_special_type` ENUM('dinner_party', 'team_building', 'company_event', 'normal') NULL DEFAULT 'normal' COMMENT '活动特殊类型';

-- 3. 修改现有字段以匹配模型
-- 确保start_time和end_time允许为NULL
ALTER TABLE `activities`
MODIFY COLUMN `start_time` TIMESTAMP NULL COMMENT '开始时间',
MODIFY COLUMN `end_time` TIMESTAMP NULL COMMENT '结束时间';

-- 4. 添加缺失的索引
ALTER TABLE `activities`
ADD INDEX IF NOT EXISTS `idx_visibility` (`visibility`),
ADD INDEX IF NOT EXISTS `idx_sequence_number` (`sequence_number`),
ADD INDEX IF NOT EXISTS `idx_activity_special_type` (`activity_special_type`);

-- 5. 更新现有数据，设置默认值
-- 为现有活动设置序号（基于创建时间）
UPDATE `activities`
SET `sequence_number` = UNIX_TIMESTAMP(`created_at`)
WHERE `sequence_number` = 0;

-- 为现有活动设置默认可见性
UPDATE `activities`
SET `visibility` = CASE
    WHEN `team_id` IS NULL THEN 'public'
    ELSE 'team'
END
WHERE `visibility` = 'public' AND `team_id` IS NOT NULL;

-- 6. 验证表结构
SELECT
    COLUMN_NAME,
    DATA_TYPE,
    IS_NULLABLE,
    COLUMN_DEFAULT,
    COLUMN_COMMENT
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'jianlu_admin'
  AND TABLE_NAME = 'activities'
ORDER BY ORDINAL_POSITION;

-- 显示修复结果
SELECT
    CONCAT('✅ activities表结构修复完成，共添加/修改了 ', COUNT(*), ' 个字段') as result
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_SCHEMA = 'jianlu_admin'
  AND TABLE_NAME = 'activities';