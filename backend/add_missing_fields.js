const mysql = require('mysql2/promise');

// 数据库配置
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  database: process.env.DB_NAME || 'jianlu_admin',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || ''
};

async function addMissingFields() {
  let connection;

  try {
    connection = await mysql.createConnection(dbConfig);
    console.log('数据库连接成功');

    // 添加 is_free 字段
    console.log('\n检查 is_free 字段...');
    const [isFreeRows] = await connection.execute(`
      SHOW COLUMNS FROM activities LIKE 'is_free'
    `);

    if (isFreeRows.length === 0) {
      await connection.execute(`
        ALTER TABLE activities
        ADD COLUMN is_free BOOLEAN DEFAULT TRUE COMMENT '是否免费活动'
      `);
      console.log('✅ is_free 字段添加成功');
    } else {
      console.log('ℹ️  is_free 字段已存在');
    }

    // 添加 base_fee 字段
    console.log('\n检查 base_fee 字段...');
    const [baseFeeRows] = await connection.execute(`
      SHOW COLUMNS FROM activities LIKE 'base_fee'
    `);

    if (baseFeeRows.length === 0) {
      await connection.execute(`
        ALTER TABLE activities
        ADD COLUMN base_fee DECIMAL(10, 2) DEFAULT 0.00 COMMENT '基础费用'
      `);
      console.log('✅ base_fee 字段添加成功');
    } else {
      console.log('ℹ️  base_fee 字段已存在');
    }

    // 添加 registration_count 字段（如果不存在）
    console.log('\n检查 registration_count 字段...');
    const [rows] = await connection.execute(`
      SHOW COLUMNS FROM activities LIKE 'registration_count'
    `);

    if (rows.length === 0) {
      await connection.execute(`
        ALTER TABLE activities
        ADD COLUMN registration_count INT DEFAULT 0 COMMENT '报名人数'
      `);
      console.log('✅ registration_count 字段添加成功');
    } else {
      console.log('ℹ️  registration_count 字段已存在');
    }

    console.log('\n✅ 所有字段更新完成！');

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
addMissingFields()
  .then(() => {
    console.log('\n数据库更新完成！');
    process.exit(0);
  })
  .catch((error) => {
    console.error('数据库更新失败:', error);
    process.exit(1);
  });