// 直接通过SQL更新用户密码，避免模型hooks
const mysql = require('mysql2/promise');

async function fixUserPassword() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'jianlu_app',
    password: 'jianlu_app_password_2024',
    database: 'jianlu_admin'
  });

  try {
    // 更新superadmin用户的密码
    const [result] = await connection.execute(
      `UPDATE users SET password = 'admin123', password_hash = 'admin123', updated_at = NOW() WHERE username = 'superadmin'`
    );
    
    console.log('更新结果:', result);
    
    // 验证更新
    const [users] = await connection.execute(
      `SELECT username, email, password, role, status FROM users WHERE username = 'superadmin'`
    );
    
    console.log('用户信息:', users[0]);
    
    console.log('✅ 密码已重置！');
    console.log('📱 登录信息:');
    console.log('   用户名: superadmin');
    console.log('   密码: admin123');
    console.log('   角色: super_admin');
    
  } catch (error) {
    console.error('❌ 更新失败:', error);
  } finally {
    await connection.end();
  }
}

fixUserPassword();