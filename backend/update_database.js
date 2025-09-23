const mysql = require('mysql2/promise');
const logger = require('./src/utils/logger');

// 数据库配置
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  database: process.env.DB_NAME || 'jianlu_admin',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || ''
};

async function updateDatabase() {
  let connection;

  try {
    // 创建数据库连接
    connection = await mysql.createConnection(dbConfig);
    logger.info('数据库连接成功');

    // 检查字段是否已存在
    const [rows] = await connection.execute(`
      SELECT COLUMN_NAME
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = ?
      AND TABLE_NAME = 'activity_participants'
      AND COLUMN_NAME IN ('cancelled_at', 'cancelled_by')
    `, [dbConfig.database]);

    const existingColumns = rows.map(row => row.COLUMN_NAME);

    // 添加cancelled_at字段（如果不存在）
    if (!existingColumns.includes('cancelled_at')) {
      await connection.execute(`
        ALTER TABLE activity_participants
        ADD COLUMN cancelled_at DATETIME NULL COMMENT '取消时间'
      `);
      logger.info('成功添加 cancelled_at 字段');
    }

    // 添加cancelled_by字段（如果不存在）
    if (!existingColumns.includes('cancelled_by')) {
      await connection.execute(`
        ALTER TABLE activity_participants
        ADD COLUMN cancelled_by CHAR(36) NULL COMMENT '取消者ID'
      `);
      logger.info('成功添加 cancelled_by 字段');
    }

    // 检查并更新status字段的枚举值
    const [statusRows] = await connection.execute(`
      SELECT COLUMN_TYPE
      FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = ?
      AND TABLE_NAME = 'activity_participants'
      AND COLUMN_NAME = 'status'
    `, [dbConfig.database]);

    const columnType = statusRows[0].COLUMN_TYPE;
    if (!columnType.includes("'cancelled'")) {
      await connection.execute(`
        ALTER TABLE activity_participants
        MODIFY COLUMN status ENUM('registered', 'attended', 'absent', 'cancelled')
        NOT NULL DEFAULT 'registered' COMMENT '参与状态'
      `);
      logger.info('成功更新 status 字段枚举值');
    }

    logger.info('数据库更新完成！');

  } catch (error) {
    logger.error('数据库更新失败:', error);
    throw error;
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// 执行更新
updateDatabase()
  .then(() => {
    console.log('数据库更新成功！');
    process.exit(0);
  })
  .catch((error) => {
    console.error('数据库更新失败:', error);
    process.exit(1);
  });