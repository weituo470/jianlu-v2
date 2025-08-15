-- 为活动表添加费用相关字段
-- 团建活动费用分摊功能数据库扩展

-- 扩展 activities 表，添加费用相关字段
ALTER TABLE activities ADD COLUMN (
    total_cost DECIMAL(10,2) DEFAULT 0.00 COMMENT '活动总费用',
    company_ratio DECIMAL(5,2) DEFAULT 0.00 COMMENT '公司承担比例(0-100)',
    cost_per_person DECIMAL(10,2) DEFAULT 0.00 COMMENT '每人应付费用',
    payment_deadline DATETIME NULL COMMENT '支付截止时间',
    cost_description TEXT NULL COMMENT '费用说明'
);

-- 扩展 user_activities 表，添加支付相关字段
ALTER TABLE user_activities ADD COLUMN (
    payment_status ENUM('unpaid', 'paid', 'exempted') DEFAULT 'unpaid' COMMENT '支付状态',
    payment_amount DECIMAL(10,2) DEFAULT 0.00 COMMENT '应付金额',
    payment_time DATETIME NULL COMMENT '支付时间',
    payment_method VARCHAR(50) NULL COMMENT '支付方式',
    payment_note TEXT NULL COMMENT '支付备注'
);

-- 添加索引以提高查询性能
CREATE INDEX idx_activities_cost ON activities(total_cost, company_ratio);
CREATE INDEX idx_user_activities_payment ON user_activities(payment_status, payment_time);

-- 插入测试数据（可选）
-- INSERT INTO activities (title, description, total_cost, company_ratio, cost_per_person, payment_deadline, cost_description) 
-- VALUES ('公司团建聚餐', '周末团建活动，增进同事感情', 1000.00, 50.00, 50.00, '2025-01-20 18:00:00', '包含餐费和场地费');