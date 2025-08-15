require('dotenv').config();
const mysql = require('mysql2/promise');

async function checkBanners() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    try {
        console.log('检查轮播图数据...');
        const [rows] = await connection.query('SELECT * FROM banners ORDER BY created_at DESC LIMIT 10');
        console.log(`找到 ${rows.length} 条轮播图记录:`);
        
        rows.forEach((row, index) => {
            console.log(`${index + 1}. ID: ${row.id}`);
            console.log(`   标题: ${row.title}`);
            console.log(`   状态: ${row.status}`);
            console.log(`   创建时间: ${row.created_at}`);
            console.log(`   图片URL: ${row.image_url}`);
            console.log('---');
        });
        
    } catch (error) {
        console.error('查询失败:', error.message);
    } finally {
        await connection.end();
    }
}

checkBanners();