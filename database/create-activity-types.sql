-- 创建活动类型表
CREATE TABLE IF NOT EXISTS `activity_types` (
  `id` varchar(50) NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` text,
  `is_default` tinyint(1) NOT NULL DEFAULT '0' COMMENT '是否为系统默认类型',
  `sort_order` int(11) NOT NULL DEFAULT '0' COMMENT '排序顺序',
  `is_active` tinyint(1) NOT NULL DEFAULT '1' COMMENT '是否启用',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_is_active` (`is_active`),
  KEY `idx_is_default` (`is_default`),
  KEY `idx_sort_order` (`sort_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='活动类型表';

-- 插入默认活动类型
INSERT INTO `activity_types` (`id`, `name`, `description`, `is_default`, `sort_order`, `is_active`) VALUES
('meeting', '会议', '团队会议、项目讨论、工作汇报等', 1, 1, 1),
('training', '培训', '技能培训、知识分享、学习交流等', 1, 2, 1),
('workshop', '工作坊', '创意研讨、头脑风暴、协作设计等', 1, 3, 1),
('team_building', '团建', '团队建设、员工活动、娱乐聚会等', 1, 4, 1),
('presentation', '演示', '产品展示、方案汇报、成果分享等', 1, 5, 1),
('other', '其他', '其他类型的活动', 1, 6, 1)
ON DUPLICATE KEY UPDATE 
  `name` = VALUES(`name`),
  `description` = VALUES(`description`),
  `updated_at` = CURRENT_TIMESTAMP;