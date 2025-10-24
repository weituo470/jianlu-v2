const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function unlockAdminAccount() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 3306,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME || 'jianlu_admin'
    });

    try {
        console.log('解锁admin账户并设置密码...\n');

        // 检查admin用户状态
        const [adminUsers] = await connection.execute(
            'SELECT username, email, role, status, password_hash, login_attempts, locked_until FROM users WHERE username = ?',
            ['admin']
        );

        if (adminUsers.length === 0) {
            console.log('❌ 未找到admin用户');
            return;
        }

        const admin = adminUsers[0];
        console.log('=== 当前admin用户信息 ===');
        console.log(`用户名: ${admin.username}`);
        console.log(`邮箱: ${admin.email}`);
        console.log(`角色: ${admin.role}`);
        console.log(`状态: ${admin.status}`);
        console.log(`登录尝试次数: ${admin.login_attempts || 0}`);
        console.log(`锁定到期时间: ${admin.locked_until || '未锁定'}`);

        // 生成admin123的密码哈希
        const adminPasswordHash = await bcrypt.hash('admin123', 12);
        console.log(`\n生成的admin123密码哈希: ${adminPasswordHash}`);

        // 验证新哈希
        const isValid = await bcrypt.compare('admin123', adminPasswordHash);
        console.log(`新哈希验证结果: ${isValid ? '✅ 正确' : '❌ 错误'}`);

        // 解锁账户并更新密码
        const [result] = await connection.execute(
            'UPDATE users SET password_hash = ?, login_attempts = 0, locked_until = NULL, status = "active" WHERE username = ?',
            [adminPasswordHash, 'admin']
        );

        if (result.affectedCount > 0) {
            console.log('\n✅ admin账户已成功解锁并设置新密码');
            console.log('  - 新密码: admin123');
            console.log('  - 登录尝试次数已重置');
            console.log('  - 锁定状态已清除');
        } else {
            console.log('❌ 更新admin账户失败');
        }

        // 验证更新结果
        console.log('\n🔐 验证更新结果...');
        const [updatedUsers] = await connection.execute(
            'SELECT password_hash FROM users WHERE username = ?',
            ['admin']
        );

        if (updatedUsers.length > 0) {
            const adminValid = await bcrypt.compare('admin123', updatedUsers[0].password_hash);
            console.log(`admin123密码验证: ${adminValid ? '✅ 验证成功' : '❌ 验证失败'}`);

            // 也测试原来的123456密码
            const oldValid = await bcrypt.compare('123456', updatedUsers[0].password_hash);
            console.log(`123456密码验证: ${oldValid ? '✅ 仍然有效' : '❌ 已失效'}`);
        }

        console.log('\n🎉 admin账户修复完成！');
        console.log('现在可以使用以下账号登录:');
        console.log('  用户名: admin');
        console.log('  密码: admin123');

    } catch (error) {
        console.error('解锁admin账户失败:', error);
    } finally {
        await connection.end();
    }
}

unlockAdminAccount();