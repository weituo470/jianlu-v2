const mysql = require('mysql2/promise');

// 数据库配置
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  database: process.env.DB_NAME || 'jianlu_admin',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || ''
};

async function checkAllFields() {
  let connection;

  try {
    connection = await mysql.createConnection(dbConfig);
    console.log('数据库连接成功');

    const [rows] = await connection.execute('DESCRIBE activities');

    console.log('\nActivities表完整结构:');
    rows.forEach((row, index) => {
      console.log(`${index + 1}. ${row.Field}: ${row.Type} ${row.Null === 'YES' ? 'NULL' : 'NOT NULL'} ${row.Default ? `DEFAULT ${row.Default}` : ''} ${row.Comment ? `// ${row.Comment}` : ''}`);
    });

  } catch (error) {
    console.error('查询失败:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

checkAllFields();