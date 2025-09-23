const { ActivityParticipant } = require('./src/models');
const { sequelize, connectDatabase, closeDatabase } = require('./src/config/database');

async function checkActivity69() {
  try {
    // 连接数据库
    await connectDatabase();

    const participants = await ActivityParticipant.findAll({
      where: { activity_id: 69 },
      logging: console.log
    });

    console.log('\n=== 69号活动的参与者信息 ===');
    console.log('参与者数量:', participants.length);

    if (participants.length === 0) {
      console.log('69号活动暂无参与者');
    } else {
      participants.forEach((p, index) => {
        console.log(`\n参与者 ${index + 1}:`);
        console.log('  ID:', p.id);
        console.log('  用户ID:', p.user_id);
        console.log('  真实姓名:', p.real_name);
        console.log('  手机号:', p.phone);
        console.log('  状态:', p.status);
        console.log('  加入方式:', p.join_as_team ? '团队' : '个人');
        if (p.team_name) console.log('  团队名:', p.team_name);
        console.log('  申请时间:', p.created_at);
      });
    }

    // 检查所有pending状态的参与者
    const pendingParticipants = await ActivityParticipant.findAll({
      where: { status: 'pending' },
      logging: false
    });

    console.log('\n=== 所有待审核的申请 ===');
    console.log('待审核数量:', pendingParticipants.length);

    pendingParticipants.forEach(p => {
      console.log(`活动ID ${p.activity_id}: ${p.real_name} (${p.phone})`);
    });

  } catch (error) {
    console.error('查询失败:', error);
  } finally {
    await closeDatabase();
    process.exit(0);
  }
}

checkActivity69();