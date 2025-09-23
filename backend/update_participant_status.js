const mysql = require('mysql2/promise');

// 数据库配置
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  database: process.env.DB_NAME || 'jianlu_admin',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || ''
};

async function updateParticipantStatus() {
  let connection;

  try {
    connection = await mysql.createConnection(dbConfig);
    console.log('数据库连接成功');

    // MySQL需要分步修改ENUM类型
    console.log('\n更新activity_participants表的status字段...');

    // 1. 先添加新的枚举值
    await connection.execute(`
      ALTER TABLE activity_participants
      MODIFY COLUMN status ENUM('pending', 'registered', 'approved', 'attended', 'absent', 'cancelled', 'rejected')
      NOT NULL DEFAULT 'registered'
      COMMENT '参与状态'
    `);

    console.log('✅ status字段更新成功');

  } catch (error) {
    console.error('更新失败:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// 执行更新
updateParticipantStatus()
  .then(() => {
    console.log('\n数据库更新完成！');
    process.exit(0);
  })
  .catch((error) => {
    console.error('数据库更新失败:', error);
    process.exit(1);
  });