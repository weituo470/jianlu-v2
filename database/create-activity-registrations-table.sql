-- 创建活动报名表
-- 创建时间: 2025-10-23
-- 描述: 存储用户活动报名信息和审批状态

CREATE TABLE IF NOT EXISTS `activity_registrations` (
  `id` varchar(36) NOT NULL,
  `activity_id` varchar(36) NOT NULL,
  `user_id` varchar(36) NOT NULL,
  `registration_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `status` enum('pending','approved','rejected','cancelled','completed') NOT NULL DEFAULT 'pending',
  `cost_amount` decimal(10,2) NOT NULL DEFAULT '0.00',
  `paid_amount` decimal(10,2) NOT NULL DEFAULT '0.00',
  `payment_status` enum('unpaid','paid','partial','refunded') NOT NULL DEFAULT 'unpaid',
  `payment_time` datetime DEFAULT NULL,
  `approval_time` datetime DEFAULT NULL,
  `approved_by` varchar(36) DEFAULT NULL,
  `approval_note` varchar(500) DEFAULT NULL,
  `participant_note` varchar(500) DEFAULT NULL,
  `contact_phone` varchar(20) DEFAULT NULL,
  `emergency_contact` varchar(100) DEFAULT NULL,
  `dietary_requirements` varchar(200) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_activity_registrations_activity_id` (`activity_id`),
  KEY `idx_activity_registrations_user_id` (`user_id`),
  KEY `idx_activity_registrations_status` (`status`),
  CONSTRAINT `fk_activity_registrations_activity` FOREIGN KEY (`activity_id`) REFERENCES `activities` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_activity_registrations_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='活动报名表';

-- 添加额外索引
ALTER TABLE `activity_registrations` ADD INDEX `idx_activity_registrations_activity_user` (`activity_id`, `user_id`);
ALTER TABLE `activity_registrations` ADD INDEX `idx_activity_registrations_activity_status` (`activity_id`, `status`);
ALTER TABLE `activity_registrations` ADD INDEX `idx_activity_registrations_user_status` (`user_id`, `status`);
ALTER TABLE `activity_registrations` ADD INDEX `idx_activity_registrations_registration_time` (`registration_time`);