const bcrypt = require('bcrypt');
const { sequelize } = require('./src/models');

// 重置admin密码的脚本
async function resetAdminPassword() {
  try {
    // 设置新密码
    const newPassword = 'admin123';
    
    // 生成密码哈希
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    const passwordHash = await bcrypt.hash(newPassword, saltRounds);
    
    console.log('新密码:', newPassword);
    console.log('密码哈希:', passwordHash);
    
    // 更新数据库
    const [result] = await sequelize.query(`
      UPDATE users 
      SET password = :newPassword, 
          password_hash = :passwordHash,
          updated_at = NOW()
      WHERE username = 'admin'
    `, {
      replacements: {
        newPassword: newPassword,
        passwordHash: passwordHash
      }
    });
    
    console.log('更新结果:', result);
    
    // 验证更新
    const [users] = await sequelize.query(`
      SELECT id, username, email, password, password_hash, status, role
      FROM users 
      WHERE username = 'admin'
    `);
    
    console.log('更新后的用户信息:', users[0]);
    
    console.log('✅ Admin密码重置成功！');
    console.log('📱 登录信息:');
    console.log('   用户名: admin');
    console.log('   邮箱: admin@jianlu.com');
    console.log('   密码: admin123');
    console.log('   角色: super_admin');
    
  } catch (error) {
    console.error('❌ 重置密码失败:', error);
  } finally {
    await sequelize.close();
  }
}

// 运行重置
resetAdminPassword();