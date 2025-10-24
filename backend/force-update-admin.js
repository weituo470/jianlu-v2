const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function forceUpdateAdmin() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 3306,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME || 'jianlu_admin'
    });

    try {
        console.log('强制更新admin账户...\n');

        // 生成admin123的密码哈希
        const adminPasswordHash = await bcrypt.hash('admin123', 12);
        console.log(`生成的admin123密码哈希: ${adminPasswordHash}`);

        // 使用原生SQL强制更新
        const updateSQL = `
            UPDATE users
            SET
                password_hash = ?,
                login_attempts = 0,
                locked_until = NULL,
                status = 'active',
                updated_at = NOW()
            WHERE username = 'admin'
        `;

        const [result] = await connection.execute(updateSQL, [adminPasswordHash]);

        console.log(`\n更新结果: ${result.affectedCount > 0 ? '✅ 更新成功' : '❌ 更新失败'}`);
        console.log(`受影响的行数: ${result.affectedCount}`);

        // 验证更新结果
        const [users] = await connection.execute(
            'SELECT password_hash, login_attempts, locked_until FROM users WHERE username = ?',
            ['admin']
        );

        if (users.length > 0) {
            const user = users[0];
            console.log('\n=== 更新后的admin信息 ===');
            console.log(`登录尝试次数: ${user.login_attempts}`);
            console.log(`锁定到期时间: ${user.locked_until || '未锁定'}`);

            const isValid = await bcrypt.compare('admin123', user.password_hash);
            console.log(`admin123密码验证: ${isValid ? '✅ 验证成功' : '❌ 验证失败'}`);
        }

        console.log('\n🎉 admin账户强制更新完成！');
        console.log('现在可以使用 admin / admin123 登录');

    } catch (error) {
        console.error('强制更新admin账户失败:', error);
    } finally {
        await connection.end();
    }
}

forceUpdateAdmin();