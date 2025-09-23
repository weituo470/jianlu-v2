const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

// 数据库配置
const dbConfig = {
  host: 'localhost',
  port: 3306,
  user: 'jianlu_app',
  password: 'jianlu_app_password_2024',
  database: 'jianlu_admin'
};

async function executeMigration() {
  let connection;

  try {
    console.log('正在连接数据库...');
    connection = await mysql.createConnection(dbConfig);
    console.log('数据库连接成功');

    // 读取SQL文件
    const sqlPath = path.join(__dirname, 'create_application_history_table.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('正在执行数据库迁移...');

    // 分割SQL语句并逐个执行
    const statements = sql.split(';').filter(stmt => stmt.trim());

    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await connection.execute(statement);
          console.log('✓ 执行成功:', statement.substring(0, 50) + '...');
        } catch (error) {
          if (error.code === 'ER_TABLE_EXISTS_ERROR') {
            console.log('- 表已存在，跳过:', error.message.split('\'')[1]);
          } else {
            console.error('✗ 执行失败:', error.message);
          }
        }
      }
    }

    console.log('\n数据库迁移完成！');

  } catch (error) {
    console.error('迁移失败:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
    process.exit(0);
  }
}

executeMigration();