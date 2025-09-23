const mysql = require('mysql2/promise');

// 数据库配置
const dbConfig = {
  host: 'localhost',
  port: 3306,
  user: 'jianlu_app',
  password: 'jianlu_app_password_2024',
  database: 'jianlu_admin'
};

async function addCreatedAtField() {
  let connection;

  try {
    console.log('正在连接数据库...');
    connection = await mysql.createConnection(dbConfig);
    console.log('数据库连接成功');

    // 先检查字段是否存在
    const [rows] = await connection.execute(`
      SHOW COLUMNS FROM activity_participants LIKE 'created_at'
    `);

    if (rows.length === 0) {
      // 添加created_at字段
      const sql = `
        ALTER TABLE activity_participants
        ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间';
      `;

      console.log('正在添加created_at字段...');
      await connection.execute(sql);
      console.log('✓ created_at字段添加成功');
    } else {
      console.log('- created_at字段已存在，跳过添加');
    }

    // 更新现有记录的created_at值为registered_at的值
    const updateSql = `
      UPDATE activity_participants
      SET created_at = registered_at
      WHERE created_at IS NULL OR created_at < registered_at;
    `;

    console.log('正在更新现有记录的created_at值...');
    await connection.execute(updateSql);
    console.log('✓ 现有记录更新成功');

  } catch (error) {
    console.error('操作失败:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
    process.exit(0);
  }
}

addCreatedAtField();