const mysql = require('mysql2/promise');
const fs = require('fs').promises;
const path = require('path');

async function migrateBanners() {
    let connection;
    
    try {
        // 数据库连接配置
        const dbConfig = {
            host: 'localhost',
            user: 'jianlu_app',
            password: 'jianlu_app_password_2024',
            database: 'jianlu_admin',
            charset: 'utf8mb4'
        };

        console.log('🔗 连接数据库...');
        connection = await mysql.createConnection(dbConfig);
        
        // 读取SQL文件
        const sqlPath = path.join(__dirname, 'create-banners-table.sql');
        const sql = await fs.readFile(sqlPath, 'utf8');
        
        console.log('📋 执行轮播图表创建SQL...');
        await connection.execute(sql);
        
        console.log('✅ 轮播图表创建成功！');
        
        // 插入示例数据
        console.log('📝 插入示例轮播图数据...');
        const sampleBanners = [
            {
                title: '欢迎使用简庐',
                description: '简庐 - 您的团队协作和个人日记管理平台',
                image_url: '/images/banners/welcome.jpg',
                link_url: '',
                status: 'active',
                sort_order: 1
            },
            {
                title: '团队协作',
                description: '高效的团队管理和活动组织',
                image_url: '/images/banners/teamwork.jpg',
                link_url: '/teams',
                status: 'active',
                sort_order: 2
            },
            {
                title: '活动管理',
                description: '轻松创建和管理各类活动',
                image_url: '/images/banners/activities.jpg',
                link_url: '/activities',
                status: 'inactive',
                sort_order: 3
            }
        ];
        
        for (const banner of sampleBanners) {
            await connection.execute(
                `INSERT INTO banners (title, description, image_url, link_url, status, sort_order) 
                 VALUES (?, ?, ?, ?, ?, ?)`,
                [banner.title, banner.description, banner.image_url, banner.link_url, banner.status, banner.sort_order]
            );
        }
        
        console.log(`✅ 成功插入 ${sampleBanners.length} 条示例轮播图数据`);
        
        // 验证数据
        const [rows] = await connection.execute('SELECT COUNT(*) as count FROM banners');
        console.log(`📊 轮播图表当前共有 ${rows[0].count} 条记录`);
        
    } catch (error) {
        console.error('❌ 轮播图表迁移失败:', error);
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
            console.log('🔐 数据库连接已关闭');
        }
    }
}

// 如果直接运行此文件
if (require.main === module) {
    migrateBanners().then(() => {
        console.log('🎉 轮播图表迁移完成！');
        process.exit(0);
    }).catch(error => {
        console.error('💥 迁移过程中发生错误:', error);
        process.exit(1);
    });
}

module.exports = migrateBanners;