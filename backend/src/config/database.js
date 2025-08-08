const { Sequelize } = require('sequelize');
const logger = require('../utils/logger');

// 数据库配置
const sequelize = new Sequelize({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  database: process.env.DB_NAME || 'jianlu_admin',
  username: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  dialect: 'mysql',
  logging: (msg) => logger.debug(msg),
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000
  },
  define: {
    timestamps: true,
    underscored: true,
    freezeTableName: true
  },
  timezone: '+08:00'
});

// 连接数据库
async function connectDatabase() {
  try {
    await sequelize.authenticate();
    logger.info('数据库连接验证成功');
    
    // 暂时禁用自动同步，避免模型冲突
    // if (process.env.NODE_ENV === 'development') {
    //   await sequelize.sync({ alter: false });
    //   logger.info('数据库模型同步完成');
    // }
    
    return sequelize;
  } catch (error) {
    logger.error('数据库连接失败:', error);
    throw error;
  }
}

// 关闭数据库连接
async function closeDatabase() {
  try {
    await sequelize.close();
    logger.info('数据库连接已关闭');
  } catch (error) {
    logger.error('关闭数据库连接失败:', error);
  }
}

module.exports = {
  sequelize,
  connectDatabase,
  closeDatabase
};