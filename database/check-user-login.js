const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function checkUserLogin() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 3306,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME || 'jianlu_admin'
    });

    try {
        console.log('检查用户登录数据...\n');

        // 检查lisi用户
        const [lisiUsers] = await connection.execute(
            'SELECT username, email, role, status, password_hash FROM users WHERE username = ?',
            ['lisi']
        );

        console.log('=== lisi用户信息 ===');
        if (lisiUsers.length > 0) {
            const user = lisiUsers[0];
            console.log(`用户名: ${user.username}`);
            console.log(`邮箱: ${user.email}`);
            console.log(`角色: ${user.role}`);
            console.log(`状态: ${user.status}`);
            console.log(`密码哈希: ${user.password_hash}`);
            console.log(`密码哈希长度: ${user.password_hash.length}`);

            // 验证密码
            const isValid = await bcrypt.compare('123456', user.password_hash);
            console.log(`密码验证结果: ${isValid ? '✅ 密码正确' : '❌ 密码错误'}`);

            // 尝试手动生成哈希对比
            const manualHash = await bcrypt.hash('123456', 12);
            console.log(`手动生成的哈希: ${manualHash}`);

        } else {
            console.log('❌ 未找到lisi用户');
        }

        console.log('\n=== admin用户信息（对比） ===');
        const [adminUsers] = await connection.execute(
            'SELECT username, password_hash FROM users WHERE username = ?',
            ['admin']
        );

        if (adminUsers.length > 0) {
            const admin = adminUsers[0];
            console.log(`用户名: ${admin.username}`);
            console.log(`密码哈希: ${admin.password_hash}`);
            console.log(`密码哈希长度: ${admin.password_hash.length}`);

            // 验证admin密码
            const adminValid = await bcrypt.compare('123456', admin.password_hash);
            console.log(`admin密码验证结果: ${adminValid ? '✅ 密码正确' : '❌ 密码错误'}`);
        }

        console.log('\n=== 所有测试用户 ===');
        const [allUsers] = await connection.execute(
            'SELECT username, email, role, status FROM users WHERE username != "admin" ORDER BY username'
        );

        console.log(`找到 ${allUsers.length} 个测试用户:`);
        allUsers.forEach(user => {
            console.log(`  - ${user.username} (${user.email}) - ${user.role} - ${user.status}`);
        });

    } catch (error) {
        console.error('检查用户数据失败:', error);
    } finally {
        await connection.end();
    }
}

checkUserLogin();