const mysql = require('mysql2/promise');

// 数据库连接配置
const dbConfig = {
  host: 'localhost',
  port: 3306,
  database: 'jianlu_admin',
  user: 'jianlu_app',
  password: 'jianlu_app_password_2024'
};

async function unlockAdminAccount() {
  let connection;
  try {
    // 连接数据库
    connection = await mysql.createConnection(dbConfig);
    console.log('✅ 数据库连接成功');

    // 1. 检查admin账户当前状态
    console.log('\n=== 检查admin账户当前状态 ===');
    const [adminUser] = await connection.execute(`
      SELECT username, login_attempts, locked_until, status, last_login_at
      FROM users
      WHERE username = 'admin'
    `);

    if (adminUser.length === 0) {
      console.log('❌ 未找到admin账户');
      return;
    }

    const admin = adminUser[0];
    console.log(`当前状态:`);
    console.log(`- 用户名: ${admin.username}`);
    console.log(`- 登录尝试次数: ${admin.login_attempts}`);
    console.log(`- 锁定至: ${admin.locked_until || '未锁定'}`);
    console.log(`- 账户状态: ${admin.status}`);
    console.log(`- 最后登录: ${admin.last_login_at || '从未登录'}`);

    // 2. 解锁admin账户
    console.log('\n=== 解锁admin账户 ===');
    const [result] = await connection.execute(`
      UPDATE users
      SET login_attempts = 0,
          locked_until = NULL,
          updated_at = NOW()
      WHERE username = 'admin'
    `);

    if (result.affectedRows > 0) {
      console.log('✅ admin账户已成功解锁');
    } else {
      console.log('❌ 解锁失败');
      return;
    }

    // 3. 验证解锁结果
    console.log('\n=== 验证解锁结果 ===');
    const [updatedUser] = await connection.execute(`
      SELECT username, login_attempts, locked_until, status, updated_at
      FROM users
      WHERE username = 'admin'
    `);

    const updated = updatedUser[0];
    console.log(`解锁后状态:`);
    console.log(`- 用户名: ${updated.username}`);
    console.log(`- 登录尝试次数: ${updated.login_attempts}`);
    console.log(`- 锁定至: ${updated.locked_until || '未锁定'}`);
    console.log(`- 账户状态: ${updated.status}`);
    console.log(`- 更新时间: ${updated.updated_at}`);

    // 4. 检查与admin5的对比
    console.log('\n=== 与admin5账户对比 ===');
    const [admin5User] = await connection.execute(`
      SELECT username, login_attempts, locked_until, status
      FROM users
      WHERE username = 'admin5'
    `);

    if (admin5User.length > 0) {
      const admin5 = admin5User[0];
      console.log(`admin5状态:`);
      console.log(`- 用户名: ${admin5.username}`);
      console.log(`- 登录尝试次数: ${admin5.login_attempts}`);
      console.log(`- 锁定至: ${admin5.locked_until || '未锁定'}`);
      console.log(`- 账户状态: ${admin5.status}`);

      console.log('\n📊 对比结果:');
      console.log(`- 登录尝试次数: admin=${updated.login_attempts}, admin5=${admin5.login_attempts} ✅`);
      console.log(`- 锁定状态: admin=${updated.locked_until ? '已锁定' : '未锁定'}, admin5=${admin5.locked_until ? '已锁定' : '未锁定'} ✅`);
      console.log(`- 账户状态: admin=${updated.status}, admin5=${admin5.status} ✅`);
    }

    console.log('\n🎉 admin账户解锁完成！现在可以尝试登录了。');

  } catch (error) {
    console.error('❌ 解锁过程中发生错误:', error.message);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\n📡 数据库连接已关闭');
    }
  }
}

// 执行解锁
unlockAdminAccount();