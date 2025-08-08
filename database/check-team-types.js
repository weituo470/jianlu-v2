// 设置环境变量
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '3306';
process.env.DB_NAME = 'jianlu_admin';
process.env.DB_USER = 'jianlu_app';
process.env.DB_PASSWORD = 'jianlu_app_password_2024';

const { sequelize } = require('../backend/src/config/database');
const TeamType = require('../backend/src/models/TeamType');

async function checkTeamTypes() {
  try {
    await sequelize.authenticate();
    console.log('数据库连接成功');
    
    // 检查所有团队类型
    const allTypes = await TeamType.findAll();
    console.log('所有团队类型数据:', allTypes.length, '条');
    allTypes.forEach(type => {
      console.log(`- ${type.id}: ${type.name} (is_active: ${type.is_active}, is_default: ${type.is_default})`);
    });
    
    console.log('\n--- 分隔线 ---\n');
    
    // 检查活跃的团队类型
    const activeTypes = await TeamType.findActive();
    console.log('活跃团队类型数据:', activeTypes.length, '条');
    activeTypes.forEach(type => {
      console.log(`- ${type.id}: ${type.name} (is_active: ${type.is_active})`);
    });
    
  } catch (error) {
    console.error('检查失败:', error.message);
    if (error.message.includes("doesn't exist")) {
      console.log('提示：请先运行 node quick-setup-team-types.js 创建团队类型表');
    }
  } finally {
    await sequelize.close();
  }
}

checkTeamTypes();