require('dotenv').config();
const { sequelize } = require('./src/config/database');

async function updateTeamApproval() {
  try {
    console.log('🔧 将测试团队设置为需要审核...');
    
    // 更新测试团队为需要审核
    await sequelize.query(`
      UPDATE teams 
      SET require_approval = 1 
      WHERE name = '测试团队' 
      LIMIT 1
    `);
    
    console.log('✅ 设置完成！');
    
    // 查看更新后的结果
    const [results] = await sequelize.query(`
      SELECT id, name, require_approval 
      FROM teams 
      WHERE name = '测试团队'
    `);
    
    console.log('✅ 更新后的设置:');
    console.table(results);
    
    // 查看所有团队的审核设置
    const [allTeams] = await sequelize.query(`
      SELECT name, require_approval 
      FROM teams 
      ORDER BY created_at DESC 
      LIMIT 5
    `);
    
    console.log('✅ 前5个团队的审核设置:');
    console.table(allTeams);
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ 更新失败:', error.message);
    process.exit(1);
  }
}

updateTeamApproval();
