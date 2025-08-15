-- =====================================
-- 活动AA制用户余额系统数据库表
-- 创建时间: 2025-08-14
-- 描述: 支持活动费用分摊的用户余额管理系统
-- =====================================

-- 1. 用户账户表 - 管理每个用户的虚拟余额
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

-- 2. 账户交易记录表 - 记录所有资金变动
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

-- 3. 为现有用户创建账户
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

-- 4. 创建触发器：用户注册时自动创建账户
DELIMITER $$
CREATE TRIGGER `tr_user_create_account` 
AFTER INSERT ON `users`
FOR EACH ROW
BEGIN
  INSERT INTO `user_accounts` (`id`, `user_id`, `balance`, `frozen_amount`, `total_income`, `total_expense`, `status`)
  VALUES (UUID(), NEW.id, 0.00, 0.00, 0.00, 0.00, 'active');
END$$
DELIMITER ;

-- 5. 创建视图：用户账户信息汇总
CREATE VIEW `v_user_account_summary` AS
SELECT 
  u.id as user_id,
  u.username,
  u.nickname,
  ua.id as account_id,
  ua.balance,
  ua.frozen_amount,
  ua.total_income,
  ua.total_expense,
  ua.status as account_status,
  (ua.balance + ua.frozen_amount) as total_amount,
  ua.created_at as account_created_at,
  ua.updated_at as account_updated_at
FROM `users` u
LEFT JOIN `user_accounts` ua ON u.id = ua.user_id;

-- 6. 创建存储过程：安全的余额变更
DELIMITER $$
CREATE PROCEDURE `sp_update_account_balance`(
  IN p_user_id CHAR(36),
  IN p_transaction_type VARCHAR(50),
  IN p_amount DECIMAL(10,2),
  IN p_related_id CHAR(36),
  IN p_related_type VARCHAR(50),
  IN p_description VARCHAR(500),
  IN p_operator_id CHAR(36),
  OUT p_transaction_id CHAR(36),
  OUT p_result_code INT,
  OUT p_result_message VARCHAR(500)
)
BEGIN
  DECLARE v_account_id CHAR(36);
  DECLARE v_current_balance DECIMAL(10,2);
  DECLARE v_new_balance DECIMAL(10,2);
  DECLARE v_account_status VARCHAR(20);
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    SET p_result_code = -1;
    SET p_result_message = 'Transaction failed due to database error';
  END;

  START TRANSACTION;
  
  -- 获取账户信息
  SELECT id, balance, status INTO v_account_id, v_current_balance, v_account_status
  FROM user_accounts 
  WHERE user_id = p_user_id FOR UPDATE;
  
  -- 检查账户状态
  IF v_account_id IS NULL THEN
    SET p_result_code = 1001;
    SET p_result_message = 'Account not found';
    ROLLBACK;
  ELSEIF v_account_status != 'active' THEN
    SET p_result_code = 1002;
    SET p_result_message = 'Account is not active';
    ROLLBACK;
  ELSE
    -- 计算新余额
    IF p_transaction_type IN ('recharge', 'refund', 'transfer_in') THEN
      SET v_new_balance = v_current_balance + p_amount;
    ELSEIF p_transaction_type IN ('expense', 'transfer_out') THEN
      IF v_current_balance < p_amount THEN
        SET p_result_code = 1003;
        SET p_result_message = 'Insufficient balance';
        ROLLBACK;
      ELSE
        SET v_new_balance = v_current_balance - p_amount;
      END IF;
    ELSE
      SET p_result_code = 1004;
      SET p_result_message = 'Invalid transaction type';
      ROLLBACK;
    END IF;
    
    IF p_result_code IS NULL THEN
      -- 生成交易ID
      SET p_transaction_id = UUID();
      
      -- 插入交易记录
      INSERT INTO account_transactions (
        id, user_id, account_id, transaction_type, amount, 
        balance_before, balance_after, related_id, related_type, 
        description, operator_id, status, completed_at
      ) VALUES (
        p_transaction_id, p_user_id, v_account_id, p_transaction_type, p_amount,
        v_current_balance, v_new_balance, p_related_id, p_related_type,
        p_description, p_operator_id, 'completed', NOW()
      );
      
      -- 更新账户余额
      UPDATE user_accounts SET 
        balance = v_new_balance,
        total_income = CASE 
          WHEN p_transaction_type IN ('recharge', 'refund', 'transfer_in') 
          THEN total_income + p_amount 
          ELSE total_income 
        END,
        total_expense = CASE 
          WHEN p_transaction_type IN ('expense', 'transfer_out') 
          THEN total_expense + p_amount 
          ELSE total_expense 
        END,
        updated_at = NOW()
      WHERE id = v_account_id;
      
      SET p_result_code = 0;
      SET p_result_message = 'Transaction completed successfully';
      COMMIT;
    END IF;
  END IF;
END$$
DELIMITER ;

-- 7. 添加索引优化
ALTER TABLE `account_transactions` ADD INDEX `idx_user_date` (`user_id`, `created_at` DESC);
ALTER TABLE `account_transactions` ADD INDEX `idx_amount_type` (`transaction_type`, `amount`);

-- 8. 插入测试数据（可选，用于开发测试）
-- 为管理员账户充值1000元作为测试
-- INSERT INTO `account_transactions` (`id`, `user_id`, `account_id`, `transaction_type`, `amount`, `balance_before`, `balance_after`, `description`, `status`, `completed_at`)
-- SELECT 
--   UUID() as id,
--   u.id as user_id,
--   ua.id as account_id,
--   'recharge' as transaction_type,
--   1000.00 as amount,
--   0.00 as balance_before,
--   1000.00 as balance_after,
--   '系统初始化充值' as description,
--   'completed' as status,
--   NOW() as completed_at
-- FROM users u 
-- JOIN user_accounts ua ON u.id = ua.user_id 
-- WHERE u.username = 'admin';

-- UPDATE user_accounts ua 
-- JOIN users u ON ua.user_id = u.id 
-- SET ua.balance = 1000.00, ua.total_income = 1000.00
-- WHERE u.username = 'admin';

-- =====================================
-- 执行说明：
-- 1. 运行此脚本创建账户系统相关表
-- 2. 为现有用户自动创建账户
-- 3. 建立必要的约束和索引
-- 4. 创建存储过程确保交易安全
-- =====================================