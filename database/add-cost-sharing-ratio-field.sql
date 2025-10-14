-- 为activity_participants表添加费用分摊系数字段
ALTER TABLE `activity_participants` 
ADD COLUMN `cost_sharing_ratio` decimal(5,2) NOT NULL DEFAULT 1.00 COMMENT '费用分摊系数，默认为1';