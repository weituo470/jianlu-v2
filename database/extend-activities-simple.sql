-- 扩展活动表结构
ALTER TABLE `activities` 
ADD COLUMN `total_cost` decimal(10,2) NULL COMMENT '活动总费用(元)',
ADD COLUMN `organizer_cost` decimal(10,2) NULL COMMENT '发起人承担费用(元)',
ADD COLUMN `participant_cost` decimal(10,2) NULL COMMENT '参与者分摊费用(元)',
ADD COLUMN `cost_sharing_type` enum('equal', 'custom', 'none') NOT NULL DEFAULT 'none' COMMENT '费用分摊类型',
ADD COLUMN `max_participants` int NULL COMMENT '最大参与人数',
ADD COLUMN `current_participants` int NOT NULL DEFAULT 0 COMMENT '当前参与人数',
ADD COLUMN `registration_deadline` timestamp NULL COMMENT '报名截止时间',
ADD COLUMN `need_approval` tinyint(1) NOT NULL DEFAULT 0 COMMENT '是否需要审核报名',
ADD COLUMN `auto_deduct` tinyint(1) NOT NULL DEFAULT 1 COMMENT '是否自动扣费',
ADD COLUMN `activity_status` enum('draft', 'published', 'registration_open', 'registration_closed', 'ongoing', 'completed', 'cancelled') NOT NULL DEFAULT 'draft' COMMENT '活动状态',
ADD COLUMN `registration_start_time` timestamp NULL COMMENT '报名开始时间',
ADD COLUMN `cost_description` text NULL COMMENT '费用说明',
ADD COLUMN `refund_policy` text NULL COMMENT '退费政策';

-- 创建活动报名表
CREATE TABLE IF NOT EXISTS `activity_registrations` (
  `id` char(36) NOT NULL COMMENT '报名ID(UUID)',
  `activity_id` char(36) NOT NULL COMMENT '活动ID',
  `user_id` char(36) NOT NULL COMMENT '用户ID',
  `registration_time` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '报名时间',
  `status` enum('pending', 'approved', 'rejected', 'cancelled', 'completed') NOT NULL DEFAULT 'pending' COMMENT '报名状态',
  `cost_amount` decimal(10,2) NOT NULL DEFAULT 0.00 COMMENT '应付费用(元)',
  `paid_amount` decimal(10,2) NOT NULL DEFAULT 0.00 COMMENT '已付费用(元)',
  `payment_status` enum('unpaid', 'paid', 'partial', 'refunded') NOT NULL DEFAULT 'unpaid' COMMENT '支付状态',
  `payment_time` timestamp NULL COMMENT '付费时间',
  `approval_time` timestamp NULL COMMENT '审核时间',
  `approved_by` char(36) NULL COMMENT '审核人ID',
  `approval_note` varchar(500) NULL COMMENT '审核备注',
  `participant_note` varchar(500) NULL COMMENT '参与者备注',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_activity_registrations` (`activity_id`, `user_id`),
  KEY `idx_activity_registrations_activity_id` (`activity_id`),
  KEY `idx_activity_registrations_user_id` (`user_id`),
  KEY `idx_activity_registrations_status` (`status`),
  KEY `idx_activity_registrations_payment_status` (`payment_status`),
  CONSTRAINT `fk_activity_registrations_activity_id` FOREIGN KEY (`activity_id`) REFERENCES `activities` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_activity_registrations_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='活动报名表';

-- 创建费用分摊记录表
CREATE TABLE IF NOT EXISTS `activity_cost_sharing` (
  `id` char(36) NOT NULL COMMENT '分摊记录ID(UUID)',
  `activity_id` char(36) NOT NULL COMMENT '活动ID',
  `registration_id` char(36) NULL COMMENT '报名记录ID',
  `user_id` char(36) NOT NULL COMMENT '用户ID',
  `cost_type` enum('organizer', 'participant', 'additional') NOT NULL COMMENT '费用类型',
  `amount` decimal(10,2) NOT NULL COMMENT '分摊金额(元)',
  `calculated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '计算时间',
  `description` varchar(200) NULL COMMENT '费用描述',
  `transaction_id` char(36) NULL COMMENT '关联交易记录ID',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  KEY `idx_activity_cost_sharing_activity_id` (`activity_id`),
  KEY `idx_activity_cost_sharing_user_id` (`user_id`),
  KEY `idx_activity_cost_sharing_cost_type` (`cost_type`),
  CONSTRAINT `fk_activity_cost_sharing_activity_id` FOREIGN KEY (`activity_id`) REFERENCES `activities` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_activity_cost_sharing_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='活动费用分摊记录表';

-- 更新现有活动状态
UPDATE `activities` 
SET activity_status = 'published', 
    registration_start_time = created_at
WHERE activity_status = 'draft';