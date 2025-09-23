const mysql = require('mysql2/promise');

// 数据库配置
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  database: process.env.DB_NAME || 'jianlu_admin',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || ''
};

async function verifyDatabase() {
  let connection;

  try {
    // 创建数据库连接
    connection = await mysql.createConnection(dbConfig);
    console.log('数据库连接成功');

    // 检查activity_participants表的结构
    const [rows] = await connection.execute(`
      DESCRIBE activity_participants
    `);

    console.log('\nactivity_participants 表结构:');
    rows.forEach(row => {
      console.log(`${row.Field}: ${row.Type} ${row.Null === 'YES' ? 'NULL' : 'NOT NULL'} ${row.Default ? `DEFAULT ${row.Default}` : ''}`);
    });

    // 检查是否有取消报名的测试数据
    const [participants] = await connection.execute(`
      SELECT id, activity_id, user_id, status, cancelled_at, cancelled_by
      FROM activity_participants
      WHERE status = 'cancelled'
      LIMIT 5
    `);

    console.log('\n已取消的报名记录:', participants.length);
    if (participants.length > 0) {
      console.log(participants);
    }

  } catch (error) {
    console.error('数据库验证失败:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// 执行验证
verifyDatabase()
  .then(() => {
    console.log('\n数据库验证完成！');
    process.exit(0);
  })
  .catch((error) => {
    console.error('数据库验证失败:', error);
    process.exit(1);
  });