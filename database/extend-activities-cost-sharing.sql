-- =====================================
-- 扩展活动表结构 - 支持费用分摊功能
-- 创建时间: 2025-08-14
-- 描述: 为activities表添加费用分摊和报名管理相关字段
-- =====================================

-- 1. 为活动表添加费用分摊相关字段
ALTER TABLE `activities` 
ADD COLUMN `total_cost` decimal(10,2) NULL COMMENT '活动总费用(元)',
ADD COLUMN `organizer_cost` decimal(10,2) NULL COMMENT '发起人承担费用(元)',
ADD COLUMN `participant_cost` decimal(10,2) NULL COMMENT '参与者分摊费用(元)',
ADD COLUMN `cost_sharing_type` enum('equal', 'custom', 'none') NOT NULL DEFAULT 'none' COMMENT '费用分摊类型: equal-平均分摊, custom-自定义分摊, none-无费用',
ADD COLUMN `max_participants` int NULL COMMENT '最大参与人数(0或NULL表示不限制)',
ADD COLUMN `current_participants` int NOT NULL DEFAULT 0 COMMENT '当前参与人数',
ADD COLUMN `registration_deadline` timestamp NULL COMMENT '报名截止时间',
ADD COLUMN `need_approval` tinyint(1) NOT NULL DEFAULT 0 COMMENT '是否需要审核报名',
ADD COLUMN `auto_deduct` tinyint(1) NOT NULL DEFAULT 1 COMMENT '是否自动扣费',
ADD COLUMN `activity_status` enum('draft', 'published', 'registration_open', 'registration_closed', 'ongoing', 'completed', 'cancelled') NOT NULL DEFAULT 'draft' COMMENT '活动状态',
ADD COLUMN `registration_start_time` timestamp NULL COMMENT '报名开始时间',
ADD COLUMN `cost_description` text NULL COMMENT '费用说明',
ADD COLUMN `refund_policy` text NULL COMMENT '退费政策',
ADD COLUMN `notes` text NULL COMMENT '活动备注',
ADD COLUMN `tags` json NULL COMMENT '活动标签';

-- 2. 创建活动报名表
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
  `contact_phone` varchar(20) NULL COMMENT '联系电话',
  `emergency_contact` varchar(100) NULL COMMENT '紧急联系人',
  `dietary_requirements` varchar(200) NULL COMMENT '饮食要求',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_activity_registrations` (`activity_id`, `user_id`),
  KEY `idx_activity_registrations_activity_id` (`activity_id`),
  KEY `idx_activity_registrations_user_id` (`user_id`),
  KEY `idx_activity_registrations_status` (`status`),
  KEY `idx_activity_registrations_payment_status` (`payment_status`),
  KEY `idx_activity_registrations_registration_time` (`registration_time`),
  CONSTRAINT `fk_activity_registrations_activity_id` FOREIGN KEY (`activity_id`) REFERENCES `activities` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_activity_registrations_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_activity_registrations_approved_by` FOREIGN KEY (`approved_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='活动报名表';

-- 3. 创建费用分摊记录表
CREATE TABLE IF NOT EXISTS `activity_cost_sharing` (
  `id` char(36) NOT NULL COMMENT '分摊记录ID(UUID)',
  `activity_id` char(36) NOT NULL COMMENT '活动ID',
  `registration_id` char(36) NOT NULL COMMENT '报名记录ID',
  `user_id` char(36) NOT NULL COMMENT '用户ID',
  `cost_type` enum('organizer', 'participant', 'additional') NOT NULL COMMENT '费用类型',
  `amount` decimal(10,2) NOT NULL COMMENT '分摊金额(元)',
  `calculated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '计算时间',
  `description` varchar(200) NULL COMMENT '费用描述',
  `transaction_id` char(36) NULL COMMENT '关联交易记录ID',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_cost_sharing_registration` (`registration_id`),
  KEY `idx_activity_cost_sharing_activity_id` (`activity_id`),
  KEY `idx_activity_cost_sharing_user_id` (`user_id`),
  KEY `idx_activity_cost_sharing_cost_type` (`cost_type`),
  KEY `idx_activity_cost_sharing_transaction_id` (`transaction_id`),
  CONSTRAINT `fk_activity_cost_sharing_activity_id` FOREIGN KEY (`activity_id`) REFERENCES `activities` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_activity_cost_sharing_registration_id` FOREIGN KEY (`registration_id`) REFERENCES `activity_registrations` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_activity_cost_sharing_user_id` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_activity_cost_sharing_transaction_id` FOREIGN KEY (`transaction_id`) REFERENCES `account_transactions` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='活动费用分摊记录表';

-- 4. 创建视图：活动费用统计
CREATE VIEW `v_activity_cost_summary` AS
SELECT 
  a.id as activity_id,
  a.title as activity_title,
  a.total_cost,
  a.organizer_cost,
  a.participant_cost,
  a.cost_sharing_type,
  a.max_participants,
  a.current_participants,
  a.activity_status,
  COUNT(DISTINCT ar.id) as total_registrations,
  COUNT(DISTINCT CASE WHEN ar.status = 'approved' THEN ar.id END) as approved_registrations,
  COUNT(DISTINCT CASE WHEN ar.payment_status = 'paid' THEN ar.id END) as paid_registrations,
  COALESCE(SUM(CASE WHEN ar.status = 'approved' THEN ar.cost_amount ELSE 0 END), 0) as total_participant_cost,
  COALESCE(SUM(CASE WHEN ar.payment_status = 'paid' THEN ar.paid_amount ELSE 0 END), 0) as total_paid_amount,
  COALESCE(SUM(CASE WHEN ar.status = 'approved' THEN ar.cost_amount ELSE 0 END) - SUM(CASE WHEN ar.payment_status = 'paid' THEN ar.paid_amount ELSE 0 END), 0) as total_outstanding
FROM activities a
LEFT JOIN activity_registrations ar ON a.id = ar.activity_id
WHERE a.cost_sharing_type != 'none'
GROUP BY a.id, a.title, a.total_cost, a.organizer_cost, a.participant_cost, a.cost_sharing_type, a.max_participants, a.current_participants, a.activity_status;

-- 5. 创建触发器：报名时自动更新活动参与人数
DELIMITER $$
CREATE TRIGGER `tr_registration_count_insert` 
AFTER INSERT ON `activity_registrations`
FOR EACH ROW
BEGIN
  IF NEW.status = 'approved' OR (SELECT need_approval FROM activities WHERE id = NEW.activity_id) = 0 THEN
    UPDATE activities 
    SET current_participants = current_participants + 1
    WHERE id = NEW.activity_id;
  END IF;
END$$

CREATE TRIGGER `tr_registration_count_update` 
AFTER UPDATE ON `activity_registrations`
FOR EACH ROW
BEGIN
  DECLARE delta INT DEFAULT 0;
  
  -- 计算参与人数变化
  IF OLD.status != 'approved' AND NEW.status = 'approved' THEN
    SET delta = 1;
  ELSEIF OLD.status = 'approved' AND NEW.status != 'approved' THEN
    SET delta = -1;
  END IF;
  
  -- 更新活动参与人数
  IF delta != 0 THEN
    UPDATE activities 
    SET current_participants = GREATEST(0, current_participants + delta)
    WHERE id = NEW.activity_id;
  END IF;
END$$

CREATE TRIGGER `tr_registration_count_delete` 
AFTER DELETE ON `activity_registrations`
FOR EACH ROW
BEGIN
  IF OLD.status = 'approved' THEN
    UPDATE activities 
    SET current_participants = GREATEST(0, current_participants - 1)
    WHERE id = OLD.activity_id;
  END IF;
END$$
DELIMITER ;

-- 6. 创建存储过程：计算活动费用分摊
DELIMITER $$
CREATE PROCEDURE `sp_calculate_activity_cost_sharing`(
  IN p_activity_id CHAR(36),
  OUT p_result_code INT,
  OUT p_result_message VARCHAR(500)
)
BEGIN
  DECLARE v_total_cost DECIMAL(10,2);
  DECLARE v_organizer_cost DECIMAL(10,2);
  DECLARE v_participant_cost DECIMAL(10,2);
  DECLARE v_cost_sharing_type VARCHAR(20);
  DECLARE v_approved_count INT;
  DECLARE v_cost_per_person DECIMAL(10,2);
  DECLARE v_organizer_id CHAR(36);
  
  DECLARE EXIT HANDLER FOR SQLEXCEPTION
  BEGIN
    ROLLBACK;
    SET p_result_code = -1;
    SET p_result_message = 'Calculation failed due to database error';
  END;

  START TRANSACTION;
  
  -- 获取活动费用信息
  SELECT total_cost, organizer_cost, cost_sharing_type, created_by
  INTO v_total_cost, v_organizer_cost, v_cost_sharing_type, v_organizer_id
  FROM activities 
  WHERE id = p_activity_id;
  
  IF v_total_cost IS NULL OR v_cost_sharing_type = 'none' THEN
    SET p_result_code = 1001;
    SET p_result_message = 'Activity has no cost sharing';
    ROLLBACK;
  ELSE
    -- 计算参与者分摊费用
    SELECT COUNT(*) INTO v_approved_count
    FROM activity_registrations 
    WHERE activity_id = p_activity_id AND status = 'approved';
    
    IF v_approved_count = 0 THEN
      SET v_cost_per_person = 0;
      SET v_participant_cost = 0;
    ELSE
      SET v_participant_cost = v_total_cost - COALESCE(v_organizer_cost, 0);
      SET v_cost_per_person = v_participant_cost / v_approved_count;
    END IF;
    
    -- 更新活动表的参与者费用
    UPDATE activities 
    SET participant_cost = v_cost_per_person
    WHERE id = p_activity_id;
    
    -- 更新报名表的费用信息
    UPDATE activity_registrations 
    SET cost_amount = v_cost_per_person
    WHERE activity_id = p_activity_id AND status = 'approved';
    
    -- 清除旧的费用分摊记录
    DELETE FROM activity_cost_sharing WHERE activity_id = p_activity_id;
    
    -- 插入新的费用分摊记录
    INSERT INTO activity_cost_sharing (
      id, activity_id, registration_id, user_id, cost_type, amount, description
    )
    SELECT 
      UUID() as id,
      p_activity_id as activity_id,
      ar.id as registration_id,
      ar.user_id,
      'participant' as cost_type,
      v_cost_per_person as amount,
      CONCAT('活动费用分摊 (', v_approved_count, '人分摊)') as description
    FROM activity_registrations ar
    WHERE ar.activity_id = p_activity_id AND ar.status = 'approved';
    
    -- 如果发起人也有费用，插入发起人费用记录
    IF v_organizer_cost > 0 THEN
      INSERT INTO activity_cost_sharing (
        id, activity_id, registration_id, user_id, cost_type, amount, description
      ) VALUES (
        UUID(),
        p_activity_id,
        NULL,
        v_organizer_id,
        'organizer',
        v_organizer_cost,
        '活动发起人承担费用'
      );
    END IF;
    
    SET p_result_code = 0;
    SET p_result_message = CONCAT('Cost sharing calculated successfully. Per person: ', v_cost_per_person, ' yuan');
    COMMIT;
  END IF;
END$$
DELIMITER ;

-- 7. 添加活动状态相关索引
ALTER TABLE `activities` ADD INDEX `idx_activity_status` (`activity_status`);
ALTER TABLE `activities` ADD INDEX `idx_cost_sharing_type` (`cost_sharing_type`);
ALTER TABLE `activities` ADD INDEX `idx_registration_deadline` (`registration_deadline`);
ALTER TABLE `activities` ADD INDEX `idx_current_participants` (`current_participants`);

-- 8. 更新现有活动的状态（将现有活动设为已发布状态）
UPDATE `activities` 
SET activity_status = 'published', 
    registration_start_time = created_at
WHERE activity_status = 'draft';

-- =====================================
-- 执行说明：
-- 1. 运行此脚本扩展活动表结构
-- 2. 创建报名和费用分摊相关表
-- 3. 建立必要的触发器和存储过程
-- 4. 创建统计视图便于查询
-- =====================================