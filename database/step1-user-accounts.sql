CREATE TABLE `user_accounts` (
  `id` char(36) NOT NULL,
  `user_id` char(36) NOT NULL,
  `balance` decimal(10,2) NOT NULL DEFAULT 0.00,
  `status` enum('active', 'frozen', 'closed') NOT NULL DEFAULT 'active',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;