-- 创建活动记账表
CREATE TABLE IF NOT EXISTS activity_expenses (
    id VARCHAR(36) PRIMARY KEY COMMENT '费用记录ID',
    activity_id VARCHAR(36) NOT NULL COMMENT '关联的活动ID',
    item VARCHAR(200) NOT NULL COMMENT '费用事项',
    amount DECIMAL(10,2) NOT NULL DEFAULT 0.00 COMMENT '金额',
    expense_date DATE NOT NULL COMMENT '费用发生日期',
    description TEXT COMMENT '备注说明',
    payer VARCHAR(100) COMMENT '付款人',
    image_path VARCHAR(500) COMMENT '图片存档路径',
    recorder_id VARCHAR(36) NOT NULL COMMENT '记录人ID',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    
    -- 索引
    INDEX idx_activity_id (activity_id),
    INDEX idx_recorder_id (recorder_id),
    INDEX idx_expense_date (expense_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='活动费用记录表';

-- 添加外键约束
ALTER TABLE activity_expenses 
ADD CONSTRAINT fk_activity_expenses_activity_id 
FOREIGN KEY (activity_id) REFERENCES activities(id) ON DELETE CASCADE;

ALTER TABLE activity_expenses 
ADD CONSTRAINT fk_activity_expenses_recorder_id 
FOREIGN KEY (recorder_id) REFERENCES users(id) ON DELETE CASCADE;