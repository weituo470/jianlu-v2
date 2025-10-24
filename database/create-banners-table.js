const mysql = require('mysql2/promise');
require('dotenv').config();

async function createBannersTable() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 3306,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME || 'jianlu_admin'
    });

    try {
        console.log('开始创建banners表...');

        // 创建banners表
        const createTableSQL = `
            CREATE TABLE IF NOT EXISTS banners (
                id INT AUTO_INCREMENT PRIMARY KEY COMMENT '轮播图ID',
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
        `;

        await connection.execute(createTableSQL);
        console.log('✅ banners表创建成功');

        // 检查是否已有示例数据
        const [existingBanners] = await connection.execute('SELECT COUNT(*) as count FROM banners');

        if (existingBanners[0].count === 0) {
            console.log('正在添加示例轮播图数据...');

            // 添加示例轮播图
            const sampleBanners = [
                {
                    title: '团建活动报名',
                    description: '参加我们的团建活动，增强团队凝聚力',
                    image_url: '/images/banners/team-building.jpg',
                    link_url: '/activities',
                    sort_order: 1
                },
                {
                    title: '年会庆典',
                    description: '一年一度的公司年会盛典，精彩纷呈',
                    image_url: '/images/banners/annual-party.jpg',
                    link_url: '/activities/1',
                    sort_order: 2
                },
                {
                    title: '培训计划',
                    description: '提升技能，共同成长，最新培训课程即将开始',
                    image_url: '/images/banners/training.jpg',
                    link_url: '/training',
                    sort_order: 3
                }
            ];

            for (const banner of sampleBanners) {
                await connection.execute(`
                    INSERT INTO banners (title, description, image_url, link_url, sort_order)
                    VALUES (?, ?, ?, ?, ?)
                `, [
                    banner.title,
                    banner.description,
                    banner.image_url,
                    banner.link_url,
                    banner.sort_order
                ]);

                console.log(`✅ 添加示例轮播图: ${banner.title}`);
            }
        } else {
            console.log(`banners表中已有 ${existingBanners[0].count} 条数据，跳过示例数据添加`);
        }

        // 验证表结构
        const [tableInfo] = await connection.execute('DESCRIBE banners');
        console.log('\n📋 banners表结构:');
        tableInfo.forEach(column => {
            console.log(`  ${column.Field} - ${column.Type} - ${column.Null === 'NO' ? 'NOT NULL' : 'NULL'} - ${column.Default || '无默认值'}`);
        });

        // 查看现有数据
        const [banners] = await connection.execute('SELECT id, title, status, sort_order, created_at FROM banners ORDER BY sort_order ASC');
        console.log('\n🎠 当前轮播图列表:');
        banners.forEach(banner => {
            console.log(`  #${banner.id} - ${banner.title} (${banner.status}) - 排序: ${banner.sort_order}`);
        });

        console.log('\n🎉 banners表创建完成！');

    } catch (error) {
        console.error('创建banners表失败:', error);
    } finally {
        await connection.end();
    }
}

createBannersTable();