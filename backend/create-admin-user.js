const { User } = require('./src/models');
const { sequelize } = require('./src/config/database');

// 创建admin用户的脚本
async function createAdminUser() {
  try {
    // 等待数据库连接
    await sequelize.authenticate();
    console.log('数据库连接成功');
    
    // 检查用户是否已存在
    const existingUser = await User.findOne({
      where: { 
        username: 'superadmin',
        status: { [require('sequelize').Op.ne]: 'deleted' }
      }
    });
    
    if (existingUser) {
      console.log('用户已存在，正在更新密码...');
      existingUser.password = 'admin123';
      await existingUser.save();
      console.log('✅ 用户密码更新成功！');
    } else {
      console.log('创建新用户...');
      const user = await User.create({
        username: 'superadmin',
        email: 'superadmin@jianlu.com',
        password: 'admin123', // 明文密码，模型会自动哈希
        role: 'super_admin',
        status: 'active'
      });
      console.log('✅ 用户创建成功！');
    }
    
    // 验证用户信息
    const user = await User.findOne({
      where: { username: 'superadmin' }
    });
    
    console.log('📱 用户信息:');
    console.log('   用户名:', user.username);
    console.log('   邮箱:', user.email);
    console.log('   角色:', user.role);
    console.log('   状态:', user.status);
    console.log('   密码哈希:', user.password_hash ? '已设置' : '未设置');
    
    // 测试密码验证
    const isValid = await user.validatePassword('admin123');
    console.log('   密码验证:', isValid ? '✅ 通过' : '❌ 失败');
    
    console.log('\n🔑 登录凭据:');
    console.log('   用户名: superadmin');
    console.log('   密码: admin123');
    
  } catch (error) {
    console.error('❌ 创建用户失败:', error);
  } finally {
    await sequelize.close();
  }
}

// 运行创建用户脚本
createAdminUser();