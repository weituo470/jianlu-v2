const { User } = require('./src/models');
const mysql = require('mysql2/promise');

// 创建数据库连接
async function createConnection() {
  return await mysql.createConnection({
    host: 'localhost',
    user: 'jianlu_app',
    password: 'jianlu_app_password_2024',
    database: 'jianlu_admin'
  });
}

// 重置admin密码的脚本
async function resetAdminPassword() {
  const connection = await createConnection();
  
  try {
    console.log('数据库连接成功');
    
    // 检查admin用户是否存在
    const [users] = await connection.execute(
      'SELECT * FROM users WHERE username = ?',
      ['admin']
    );
    
    if (users.length === 0) {
      console.log('❌ admin用户不存在，正在创建...');
      
      // 创建新的admin用户 - 使用Sequelize模型来确保正确的密码哈希
      const { v4: uuidv4 } = require('uuid');
      const bcrypt = require('bcryptjs');
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash('admin123', saltRounds);
      
      const [result] = await connection.execute(
        `INSERT INTO users (id, username, email, password_hash, role, status, created_at, updated_at) 
         VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
        [uuidv4(), 'admin', 'admin@jianlu.com', passwordHash, 'super_admin', 'active']
      );
      
      console.log('✅ Admin用户创建成功！');
      console.log('📱 用户信息:');
      console.log('   用户名: admin');
      console.log('   邮箱: admin@jianlu.com');
      console.log('   角色: super_admin');
      console.log('   状态: active');
      
    } else {
      console.log('📱 找到Admin用户，正在重置密码...');
      const admin = users[0];
      console.log('   当前状态:', admin.status);
      console.log('   当前角色:', admin.role);
      
      // 生成新的密码哈希
      const bcrypt = require('bcryptjs');
      const saltRounds = 12;
      const passwordHash = await bcrypt.hash('admin123', saltRounds);
      
      // 更新admin用户
      const [result] = await connection.execute(
        `UPDATE users SET 
          password_hash = ?, 
          login_attempts = 0, 
          locked_until = NULL, 
          status = 'active',
          updated_at = NOW() 
         WHERE username = ?`,
        [passwordHash, 'admin']
      );
      
      console.log('✅ Admin密码重置成功！');
      console.log('   更新行数:', result.affectedRows);
      
      // 验证更新
      const [updatedUsers] = await connection.execute(
        'SELECT password_hash FROM users WHERE username = ?',
        ['admin']
      );
      
      if (updatedUsers.length > 0) {
        const isValid = await bcrypt.compare('admin123', updatedUsers[0].password_hash);
        console.log('   密码验证测试:', isValid ? '✅ 通过' : '❌ 失败');
      }
    }
    
    console.log('\n🔑 登录凭据:');
    console.log('   用户名: admin');
    console.log('   密码: admin123');
    console.log('   角色: super_admin');
    
  } catch (error) {
    console.error('❌ 重置密码失败:', error);
  } finally {
    await connection.end();
  }
}

// 运行重置
resetAdminPassword();