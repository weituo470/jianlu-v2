const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkActivitiesSequence() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 3306,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME || 'jianlu_admin'
    });

    try {
        const [rows] = await connection.execute('SELECT id, title, sequence_number, created_at FROM activities ORDER BY sequence_number DESC');
        console.log('当前活动的序列号:');
        rows.forEach(row => {
            console.log(`- ${row.title}: ${row.sequence_number} (创建时间: ${row.created_at})`);
        });

        console.log('\n需要修复的序列号范围...');

    } catch (error) {
        console.error('检查活动序列号失败:', error);
    } finally {
        await connection.end();
    }
}

checkActivitiesSequence();