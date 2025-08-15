-- 创建用户账户表
CREATE TABLE IF NOT EXISTS `user_accounts` (
  `id` char(36) NOT NULL COMMENT '账户ID(UUID)',
  `user_id` char(36) NOT NULL COMMENT '用户ID',
  `balance` decimal(10,2) NOT NULL DEFAULT 0.00 COMMENT '账户余额(元)',
  `frozen_amount` decimal(10,2) NOT NULL DEFAULT 0.00 COMMENT '冻结金额(元)',
  `total_income` decimal(10,2) NOT NULL DEFAULT 0.00 COMMENT '累计收入(元)',
  `total_expense` decimal(10,2) NOT NULL DEFAULT 0.00 COMMENT '累计支出(元)',
  `status` enum('active', 'frozen', 'closed') NOT NULL DEFAULT 'active' COMMENT '账户状态',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_accounts_user_id` (`user_id`),
  KEY `idx_user_accounts_status` (`status`),
  CONSTRAINT `fk_user_accounts_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='用户账户表';

-- 创建交易记录表
CREATE TABLE IF NOT EXISTS `account_transactions` (
  `id` char(36) NOT NULL COMMENT '交易ID(UUID)',
  `user_id` char(36) NOT NULL COMMENT '用户ID',
  `account_id` char(36) NOT NULL COMMENT '账户ID',
  `transaction_type` enum('recharge', 'expense', 'refund', 'transfer_in', 'transfer_out', 'freeze', 'unfreeze') NOT NULL COMMENT '交易类型',
  `amount` decimal(10,2) NOT NULL COMMENT '交易金额(元)',
  `balance_before` decimal(10,2) NOT NULL COMMENT '交易前余额(元)',
  `balance_after` decimal(10,2) NOT NULL COMMENT '交易后余额(元)',
  `related_id` char(36) NULL COMMENT '关联ID(活动ID/转账ID等)',
  `related_type` enum('activity', 'transfer', 'admin', 'system') NULL COMMENT '关联类型',
  `description` varchar(500) NOT NULL COMMENT '交易描述',
  `operator_id` char(36) NULL COMMENT '操作人ID(管理员操作时)',
  `status` enum('pending', 'completed', 'failed', 'cancelled') NOT NULL DEFAULT 'pending' COMMENT '交易状态',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `completed_at` timestamp NULL COMMENT '完成时间',
  PRIMARY KEY (`id`),
  KEY `idx_account_transactions_user_id` (`user_id`),
  KEY `idx_account_transactions_account_id` (`account_id`),
  KEY `idx_account_transactions_type` (`transaction_type`),
  KEY `idx_account_transactions_status` (`status`),
  KEY `idx_account_transactions_related` (`related_id`, `related_type`),
  KEY `idx_account_transactions_created_at` (`created_at`),
  CONSTRAINT `fk_account_transactions_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_account_transactions_account_id` FOREIGN KEY (`account_id`) REFERENCES `user_accounts` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='账户交易记录表';

-- 为现有用户创建账户
INSERT INTO `user_accounts` (`id`, `user_id`, `balance`, `frozen_amount`, `total_income`, `total_expense`, `status`)
SELECT 
  UUID() as id,
  u.id as user_id,
  0.00 as balance,
  0.00 as frozen_amount,
  0.00 as total_income,
  0.00 as total_expense,
  'active' as status
FROM `users` u
WHERE NOT EXISTS (
  SELECT 1 FROM `user_accounts` ua WHERE ua.user_id = u.id
);