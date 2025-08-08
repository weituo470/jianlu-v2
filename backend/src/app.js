const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

const logger = require('./utils/logger');
const { connectDatabase } = require('./config/database');
const errorHandler = require('./middleware/errorHandler');

// 初始化所有模型和关联
require('./models/index');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const teamRoutes = require('./routes/teams');

const app = express();
const PORT = process.env.PORT || 3458;

// 临时禁用CSP以排查问题
app.use(helmet({
  contentSecurityPolicy: false
}));
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));

// 请求限制
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15分钟
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // 限制每个IP 100个请求
  message: {
    success: false,
    message: '请求过于频繁，请稍后再试'
  }
});
app.use('/api/', limiter);

// 解析请求体
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// 请求日志
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path} - ${req.ip}`);
  next();
});

// 健康检查
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: '服务运行正常',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0'
  });
});

// 静态文件服务 - 提供管理端前端文件
app.use(express.static(path.join(__dirname, '../../admin-frontend')));

// API路由
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/activities', require('./routes/activities'));
app.use('/api/user-activities', require('./routes/userActivities'));

// SPA fallback - 处理路由
app.get('*', (req, res) => {
  // 如果是API路由，返回404
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({
      success: false,
      message: '接口不存在'
    });
  }
  
  // 检查是否是直接访问HTML文件
  if (req.path.endsWith('.html')) {
    const filePath = path.join(__dirname, '../../admin-frontend', req.path);
    return res.sendFile(filePath, (err) => {
      if (err) {
        // 如果文件不存在，返回index.html
        res.sendFile('index.html', { root: path.join(__dirname, '../../admin-frontend') });
      }
    });
  }
  
  // 其他所有路由都返回index.html，让前端路由处理
  res.sendFile('index.html', { root: path.join(__dirname, '../../admin-frontend') });
});

// 错误处理中间件
app.use(errorHandler);

// 启动服务器
async function startServer() {
  try {
    // 连接数据库
    await connectDatabase();
    logger.info('数据库连接成功');

    // 启动服务器
    app.listen(PORT, () => {
      logger.info(`服务器启动成功，端口: ${PORT}`);
      logger.info(`环境: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    logger.error('服务器启动失败:', error);
    process.exit(1);
  }
}

// 优雅关闭
process.on('SIGTERM', () => {
  logger.info('收到SIGTERM信号，正在关闭服务器...');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('收到SIGINT信号，正在关闭服务器...');
  process.exit(0);
});

startServer();

module.exports = app;