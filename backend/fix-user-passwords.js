const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function fixUserPasswords() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 3306,
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME || 'jianlu_admin'
    });

    try {
        console.log('开始修复用户密码...\n');

        // 生成正确的密码哈希
        const correctPasswordHash = await bcrypt.hash('123456', 12);
        console.log(`生成的正确密码哈希: ${correctPasswordHash}`);

        // 测试新哈希
        const isValid = await bcrypt.compare('123456', correctPasswordHash);
        console.log(`新哈希验证结果: ${isValid ? '✅ 正确' : '❌ 错误'}\n`);

        // 修复所有测试用户的密码
        const testUsers = ['zhangsan', 'lisi', 'wangwu', 'zhaoliu', 'qianqi'];
        let fixedCount = 0;

        for (const username of testUsers) {
            try {
                const [result] = await connection.execute(
                    'UPDATE users SET password_hash = ? WHERE username = ?',
                    [correctPasswordHash, username]
                );

                if (result.affectedCount > 0) {
                    console.log(`✅ 已修复用户 ${username} 的密码`);
                    fixedCount++;
                } else {
                    console.log(`⚠️ 用户 ${username} 不存在或未更新`);
                }
            } catch (error) {
                console.error(`❌ 修复用户 ${username} 失败:`, error.message);
            }
        }

        // 也修复admin用户的密码
        try {
            const [adminResult] = await connection.execute(
                'UPDATE users SET password_hash = ? WHERE username = ?',
                [correctPasswordHash, 'admin']
            );

            if (adminResult.affectedCount > 0) {
                console.log(`✅ 已修复用户 admin 的密码`);
                fixedCount++;
            }
        } catch (error) {
            console.error(`❌ 修复admin用户失败:`, error.message);
        }

        console.log(`\n📊 修复完成统计:`);
        console.log(`  - 成功修复: ${fixedCount} 个用户`);
        console.log(`  - 默认密码: 123456`);

        // 验证修复结果
        console.log('\n🔐 验证修复结果...');
        for (const username of [...testUsers, 'admin']) {
            try {
                const [users] = await connection.execute(
                    'SELECT password_hash FROM users WHERE username = ?',
                    [username]
                );

                if (users.length > 0) {
                    const isValid = await bcrypt.compare('123456', users[0].password_hash);
                    console.log(`  ${username}: ${isValid ? '✅ 登录正常' : '❌ 仍有问题'}`);
                }
            } catch (error) {
                console.log(`  ${username}: ❌ 验证失败 - ${error.message}`);
            }
        }

        console.log('\n🎉 用户密码修复完成！现在可以使用以下账号登录:');
        console.log('  - zhangsan : 123456');
        console.log('  - lisi : 123456');
        console.log('  - wangwu : 123456');
        console.log('  - zhaoliu : 123456');
        console.log('  - qianqi : 123456');
        console.log('  - admin : 123456');

    } catch (error) {
        console.error('修复用户密码失败:', error);
    } finally {
        await connection.end();
    }
}

fixUserPasswords();