const mysql = require('mysql2/promise');
require('dotenv').config();

async function updateBannersWithRealImages() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 3306,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME || 'jianlu_admin'
    });

    try {
        console.log('开始更新轮播图数据，使用实际的图片资源...');

        // 获取现有的banner图片文件
        const bannerImages = [
            {
                filename: 'banner-1755073170889-947455128.png',
                title: '团队建设活动',
                description: '增强团队凝聚力，共创美好未来。定期举办团建活动，促进员工之间的交流与合作。'
            },
            {
                filename: 'banner-1755073187505-625550054.png',
                title: '年度庆典晚会',
                description: '欢聚一堂，共庆辉煌。公司年度盛典，表彰优秀员工，展望未来发展。'
            },
            {
                filename: 'banner-1755073211098-704446423.png',
                title: '技能培训计划',
                description: '提升专业能力，持续学习成长。公司提供各类培训课程，助力员工职业发展。'
            },
            {
                filename: 'banner-1755073605042-901390596.png',
                title: '创新工作坊',
                description: '激发创新思维，推动技术革新。定期举办创新工作坊，探讨前沿技术趋势。'
            }
        ];

        // 清空现有的banners表
        await connection.execute('DELETE FROM banners');
        console.log('✅ 清空现有轮播图数据');

        // 插入新的轮播图数据
        for (let i = 0; i < bannerImages.length; i++) {
            const banner = bannerImages[i];
            const imageUrl = `/uploads/banners/${banner.filename}`;

            // 根据轮播图内容设置合适的链接
            let linkUrl = '/activities';
            if (banner.title.includes('培训')) {
                linkUrl = '/training';
            } else if (banner.title.includes('创新')) {
                linkUrl = '/innovation';
            } else if (banner.title.includes('庆典')) {
                linkUrl = '/annual-party';
            }

            await connection.execute(`
                INSERT INTO banners (title, description, image_url, link_url, sort_order, status)
                VALUES (?, ?, ?, ?, ?, 'active')
            `, [
                banner.title,
                banner.description,
                imageUrl,
                linkUrl,
                i + 1
            ]);

            console.log(`✅ 添加轮播图: ${banner.title}`);
        }

        // 验证更新结果
        const [banners] = await connection.execute(`
            SELECT id, title, image_url, link_url, sort_order
            FROM banners
            ORDER BY sort_order ASC
        `);

        console.log('\n🎠 更新后的轮播图列表:');
        banners.forEach(banner => {
            console.log(`  #${banner.id} - ${banner.title}`);
            console.log(`    图片: ${banner.image_url}`);
            console.log(`    链接: ${banner.link_url}`);
            console.log(`    排序: ${banner.sort_order}`);
            console.log('');
        });

        console.log('🎉 轮播图数据更新完成！现在使用的是实际的图片资源。');

    } catch (error) {
        console.error('更新轮播图数据失败:', error);
    } finally {
        await connection.end();
    }
}

updateBannersWithRealImages();