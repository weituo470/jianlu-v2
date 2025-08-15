-- 创建轮播图表
CREATE TABLE IF NOT EXISTS banners (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL COMMENT '轮播图标题',
    description TEXT COMMENT '轮播图描述',
    image_url VARCHAR(500) NOT NULL COMMENT '图片URL',
    link_url VARCHAR(500) COMMENT '跳转链接',
    status ENUM('active', 'inactive') DEFAULT 'active' COMMENT '状态：active-显示，inactive-隐藏',
    sort_order INT DEFAULT 0 COMMENT '排序顺序，数字越小越靠前',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    
    INDEX idx_status (status),
    INDEX idx_sort_order (sort_order),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='轮播图表';