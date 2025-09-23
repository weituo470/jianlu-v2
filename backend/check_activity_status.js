const mysql = require('mysql2/promise');

// 数据库配置
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  database: process.env.DB_NAME || 'jianlu_admin',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || ''
};

async function checkActivityStatus() {
  let connection;

  try {
    // 创建数据库连接
    connection = await mysql.createConnection(dbConfig);
    console.log('数据库连接成功');

    // 查询刚刚创建的活动
    const [activities] = await connection.execute(`
      SELECT id, title, require_approval, status
      FROM activities
      WHERE title LIKE '测试需要审核的活动%' OR title LIKE '测试不需要审核的活动%'
      ORDER BY created_at DESC
    `);

    console.log('\n活动列表:');
    activities.forEach(activity => {
      console.log(`- ${activity.title}: require_approval=${activity.require_approval}, status=${activity.status}`);
    });

    // 查询参与记录
    const [participants] = await connection.execute(`
      SELECT ap.id, ap.activity_id, ap.status as participant_status, a.title, a.require_approval
      FROM activity_participants ap
      JOIN activities a ON ap.activity_id = a.id
      WHERE a.title LIKE '测试需要审核的活动%' OR a.title LIKE '测试不需要审核的活动%'
      ORDER BY ap.registered_at DESC
    `);

    console.log('\n参与记录:');
    participants.forEach(p => {
      console.log(`- ${p.title}: participant_status=${p.participant_status}, require_approval=${p.require_approval}`);
    });

  } catch (error) {
    console.error('查询失败:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// 执行查询
checkActivityStatus()
  .then(() => {
    console.log('\n查询完成！');
    process.exit(0);
  })
  .catch((error) => {
    console.error('查询失败:', error);
    process.exit(1);
  });