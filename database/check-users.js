const mysql = require('mysql2/promise');
require('dotenv').config();

async function checkUsers() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 3306,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME || 'jianlu_admin'
    });

    try {
        const [rows] = await connection.execute('SELECT username, email, role, status, password_hash FROM users WHERE username != "admin"');
        console.log('创建的测试用户:');
        rows.forEach(row => {
            console.log(`- ${row.username} (${row.email})`);
            console.log(`  角色: ${row.role}, 状态: ${row.status}`);
            console.log(`  密码哈希: ${row.password_hash.substring(0, 20)}...`);
            console.log('');
        });
    } catch (error) {
        console.error('检查用户失败:', error);
    } finally {
        await connection.end();
    }
}

checkUsers();