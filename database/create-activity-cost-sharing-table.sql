-- 创建活动费用分摊表
-- 创建时间: 2025-10-23
-- 描述: 存储活动费用分摊信息

CREATE TABLE IF NOT EXISTS `activity_cost_sharing` (
  `id` varchar(36) NOT NULL,
  `activity_id` varchar(36) NOT NULL,
  `registration_id` varchar(36) DEFAULT NULL,
  `user_id` varchar(36) NOT NULL,
  `cost_type` enum('organizer','participant','additional') NOT NULL,
  `amount` decimal(10,2) NOT NULL DEFAULT '0.00',
  `calculated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `description` varchar(200) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_activity_cost_sharing_activity_id` (`activity_id`),
  KEY `idx_activity_cost_sharing_registration_id` (`registration_id`),
  KEY `idx_activity_cost_sharing_user_id` (`user_id`),
  KEY `idx_activity_cost_sharing_cost_type` (`cost_type`),
  CONSTRAINT `fk_activity_cost_sharing_activity` FOREIGN KEY (`activity_id`) REFERENCES `activities` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_activity_cost_sharing_registration` FOREIGN KEY (`registration_id`) REFERENCES `activity_registrations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_activity_cost_sharing_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='活动费用分摊表';

-- 添加索引
CREATE INDEX `idx_activity_cost_sharing_activity_user` ON `activity_cost_sharing` (`activity_id`, `user_id`);
CREATE INDEX `idx_activity_cost_sharing_activity_type` ON `activity_cost_sharing` (`activity_id`, `cost_type`);