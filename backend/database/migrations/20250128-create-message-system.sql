-- 创建消息表
CREATE TABLE `messages` (
  `id` varchar(36) NOT NULL,
  `title` varchar(200) NOT NULL,
  `content` text NOT NULL,
  `type` enum('system','personal','activity','team','announcement') NOT NULL DEFAULT 'system',
  `priority` enum('low','normal','high','urgent') NOT NULL DEFAULT 'normal',
  `sender_id` varchar(36) DEFAULT NULL,
  `recipient_id` varchar(36) DEFAULT NULL,
  `recipient_role` enum('super_admin','admin','user') DEFAULT NULL,
  `is_global` tinyint(1) NOT NULL DEFAULT '0',
  `is_read` tinyint(1) NOT NULL DEFAULT '0',
  `read_at` datetime DEFAULT NULL,
  `scheduled_at` datetime DEFAULT NULL,
  `expires_at` datetime DEFAULT NULL,
  `status` enum('draft','sent','scheduled','expired','cancelled') NOT NULL DEFAULT 'draft',
  `metadata` json DEFAULT '{}',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_recipient_id` (`recipient_id`),
  KEY `idx_sender_id` (`sender_id`),
  KEY `idx_type` (`type`),
  KEY `idx_status` (`status`),
  KEY `idx_is_read` (`is_read`),
  KEY `idx_priority` (`priority`),
  KEY `idx_created_at` (`created_at`),
  KEY `idx_scheduled_at` (`scheduled_at`),
  KEY `idx_expires_at` (`expires_at`),
  CONSTRAINT `fk_messages_sender` FOREIGN KEY (`sender_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_messages_recipient` FOREIGN KEY (`recipient_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 创建消息模板表
CREATE TABLE `message_templates` (
  `id` varchar(36) NOT NULL,
  `name` varchar(100) NOT NULL,
  `title_template` varchar(200) NOT NULL,
  `content_template` text NOT NULL,
  `type` enum('system','personal','activity','team','announcement') NOT NULL DEFAULT 'system',
  `priority` enum('low','normal','high','urgent') NOT NULL DEFAULT 'normal',
  `variables` json DEFAULT '[]',
  `description` varchar(500) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_by` varchar(36) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_name` (`name`),
  KEY `idx_type` (`type`),
  KEY `idx_is_active` (`is_active`),
  CONSTRAINT `fk_message_templates_creator` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 创建消息阅读记录表（用于群发消息的独立阅读状态追踪）
CREATE TABLE `message_read_records` (
  `id` varchar(36) NOT NULL,
  `message_id` varchar(36) NOT NULL,
  `user_id` varchar(36) NOT NULL,
  `read_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `read_device` varchar(100) DEFAULT NULL,
  `read_ip` varchar(45) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_message_user` (`message_id`,`user_id`),
  KEY `idx_message_id` (`message_id`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_read_at` (`read_at`),
  CONSTRAINT `fk_message_read_message` FOREIGN KEY (`message_id`) REFERENCES `messages` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_message_read_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 创建系统配置表（用于消息系统配置）
CREATE TABLE IF NOT EXISTS `system_configs` (
  `id` varchar(36) NOT NULL,
  `config_key` varchar(100) NOT NULL,
  `config_value` text,
  `config_type` enum('string','number','boolean','json') NOT NULL DEFAULT 'string',
  `description` varchar(500) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_config_key` (`config_key`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 插入默认的系统配置
INSERT INTO `system_configs` (`id`, `config_key`, `config_value`, `config_type`, `description`) VALUES
(UUID(), 'message_retention_days', '365', 'number', '消息保留天数'),
(UUID(), 'max_message_per_user', '1000', 'number', '每个用户最大消息数量'),
(UUID(), 'enable_message_scheduling', 'true', 'boolean', '是否启用消息定时发送'),
(UUID(), 'default_message_priority', 'normal', 'string', '默认消息优先级'),
(UUID(), 'enable_message_template', 'true', 'boolean', '是否启用消息模板'),
(UUID(), 'auto_delete_expired_messages', 'true', 'boolean', '是否自动删除过期消息'),
(UUID(), 'message_cleanup_interval_hours', '24', 'number', '消息清理间隔（小时）');

-- 插入默认消息模板
INSERT INTO `message_templates` (`id`, `name`, `title_template`, `content_template`, `type`, `priority`, `variables`, `description`) VALUES
(UUID(), 'welcome', '欢迎加入简庐管理系统', '亲爱的{{user_name}}，欢迎您加入简庐管理系统！\n\n系统功能：\n- 团队管理\n- 活动报名\n- 费用结算\n- 消息通知\n\n如有问题，请联系管理员。', 'system', 'normal', JSON_ARRAY(JSON_OBJECT('name', 'user_name', 'description', '用户姓名', 'required', true)), '新用户欢迎模板'),
(UUID(), 'activity_reminder', '活动提醒：{{activity_name}}', '亲爱的{{user_name}}，您报名的活动"{{activity_name}}"即将开始。\n\n活动时间：{{activity_time}}\n活动地点：{{activity_location}}\n\n请准时参加！', 'activity', 'high', JSON_ARRAY(JSON_OBJECT('name', 'user_name', 'description', '用户姓名', 'required', true), JSON_OBJECT('name', 'activity_name', 'description', '活动名称', 'required', true), JSON_OBJECT('name', 'activity_time', 'description', '活动时间', 'required', true), JSON_OBJECT('name', 'activity_location', 'description', '活动地点', 'required', true)), '活动提醒模板'),
(UUID(), 'maintenance_notice', '系统维护通知', '尊敬的用户：\n\n系统将于{{maintenance_time}}进行维护升级，预计持续{{duration}}。\n\n维护期间系统将暂时无法访问，请提前做好准备。\n\n给您带来的不便，敬请谅解。', 'system', 'urgent', JSON_ARRAY(JSON_OBJECT('name', 'maintenance_time', 'description', '维护时间', 'required', true), JSON_OBJECT('name', 'duration', 'description', '维护时长', 'required', true)), '系统维护通知模板'),
(UUID(), 'team_invitation', '团队邀请：{{team_name}}', '亲爱的{{user_name}}，您被邀请加入团队"{{team_name}}"。\n\n邀请人：{{inviter_name}}\n团队描述：{{team_description}}\n\n请登录系统查看详情并决定是否接受邀请。', 'team', 'normal', JSON_ARRAY(JSON_OBJECT('name', 'user_name', 'description', '用户姓名', 'required', true), JSON_OBJECT('name', 'team_name', 'description', '团队名称', 'required', true), JSON_OBJECT('name', 'inviter_name', 'description', '邀请人姓名', 'required', true), JSON_OBJECT('name', 'team_description', 'description', '团队描述', 'required', false)), '团队邀请模板');