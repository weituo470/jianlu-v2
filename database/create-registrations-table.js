const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

async function createRegistrationsTable() {
  try {
    // 数据库连接配置 - 从backend配置复制
    const connection = await mysql.createConnection({
      host: 'localhost',
      port: 3306,
      user: 'root',
      password: 'wei159753...', // 从.env文件获取的密码
      database: 'jianlu_admin'
    });

    console.log('连接数据库成功');

    // 读取SQL文件
    const sqlFile = path.join(__dirname, 'create-activity-registrations-table.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');

    console.log('开始创建activity_registrations表...');

    // 分步执行SQL
    const statements = sql.split(';').filter(stmt => stmt.trim().length > 0);

    for (const statement of statements) {
      const stmt = statement.trim();
      if (stmt) {
        console.log('执行SQL:', stmt.substring(0, 100) + '...');
        await connection.execute(stmt);
      }
    }

    console.log('✅ activity_registrations表创建成功！');

    await connection.end();

  } catch (error) {
    console.error('❌ 创建表失败:', error.message);
    process.exit(1);
  }
}

createRegistrationsTable();