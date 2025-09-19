const { sequelize } = require('./src/config/database');
const { User } = require('./src/models');
const bcrypt = require('bcrypt');

async function resetPassword() {
  try {
    // 查找admin用户
    const admin = await User.findOne({
      where: { username: 'admin' }
    });

    if (admin) {
      console.log('找到admin用户:', admin.username);

      // 重置密码
      const hashedPassword = await bcrypt.hash('admin123', 10);
      admin.password = hashedPassword;
      await admin.save();

      console.log('密码已重置为: admin123');
    } else {
      console.log('未找到admin用户，创建新用户...');

      // 创建admin用户
      const hashedPassword = await bcrypt.hash('admin123', 10);
      const newAdmin = await User.create({
        username: 'admin',
        email: 'admin@example.com',
        password: hashedPassword,
        role: 'super_admin',
        status: 'active'
      });

      console.log('已创建admin用户，密码: admin123');
    }

    await sequelize.close();
  } catch (error) {
    console.error('错误:', error.message);
  }
}

resetPassword();