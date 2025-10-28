const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

const logger = require('./utils/logger');
const requestContext = require('./middleware/requestContext');
const requestLogger = require('./middleware/requestLogger');
const { connectDatabase } = require('./config/database');
const errorHandler = require('./middleware/errorHandler');

// 初始化所有模型和关联
require('./models/index');
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const teamRoutes = require('./routes/teams');
const messageRoutes = require('./routes/messages');

const app = express();
const PORT = process.env.PORT || 3460;
const ENABLE_INSPECTOR = String(process.env.ENABLE_INSPECTOR || '').toLowerCase();
const INSPECTOR_ENABLED = ['1','true','yes'].includes(ENABLE_INSPECTOR);
const inspectorSnippet = INSPECTOR_ENABLED ? '\n<script src="/dev-tools/bootstrap.js"></script>\n' : '';

function sendHtml(res, filePath) {
  if (!INSPECTOR_ENABLED) {
    return res.sendFile(filePath, { root: path.join(__dirname, '../../admin-frontend') });
  }
  const absolutePath = path.join(__dirname, '../../admin-frontend', filePath);
  fs.readFile(absolutePath, 'utf8', (err, html) => {
    if (err) {
      return res.sendFile(filePath, { root: path.join(__dirname, '../../admin-frontend') });
    }
    const patched = html.replace(/<\/body>\s*<\/html>\s*$/i, inspectorSnippet + '</body></html>');
    const output = patched.includes('</body>') ? patched : html + inspectorSnippet;
    res.send(output);
  });
}


// 配置helmet，允许小程序和跨域访问
app.use(helmet({
  contentSecurityPolicy: false,
  frameguard: false,  // 禁用X-Frame-Options限制
  crossOriginResourcePolicy: false,  // 禁用跨域资源策略限制
  crossOriginOpenerPolicy: false     // 禁用跨域开启策略限制
}));
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));

// 通用请求限制
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15分钟
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100000, // 限制每个IP 100000个请求 (放宽100倍)
  message: {
    success: false,
    message: '请求过于频繁，请稍后再试'
  }
});

// 认证路由的宽松限制
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 100000, // 认证路由允许更多请求 (放宽100倍)
  message: {
    success: false,
    message: '认证请求过于频繁，请稍后再试'
  }
});

// 应用限制 - 排除认证路由
app.use('/api/', limiter);
app.use('/api/auth', authLimiter);

// 解析请求体
app.use(requestContext);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);


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

if (INSPECTOR_ENABLED) {
  const devToolsDir = path.join(__dirname, '../../admin-frontend/dev-tools');
  if (fs.existsSync(devToolsDir)) {
    app.use('/dev-tools', express.static(devToolsDir));
  }
}

// 静态文件服务 - 提供上传的文件
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// API路由
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/teams', require('./routes/teamApplications')); // 团队申请API路由
app.use('/api/organizations', require('./routes/organizations')); // 机构管理API路由
app.use('/api/organizations', require('./routes/organizationMembers')); // 机构成员管理API路由
app.use('/api/organizations', require('./routes/organizationInvitations')); // 机构邀请管理API路由
app.use('/api/organizations', require('./routes/organizationRoles')); // 机构角色管理API路由
app.use('/api/activities', require('./routes/activities')); // 活动管理API路由
app.use('/api/activity-roles', require('./routes/activityRoles')); // 活动角色管理API路由
app.use('/api/user-activities', require('./routes/userActivities'));
app.use('/api/messages', messageRoutes); // 消息系统API路由
app.use('/api/migrate', require('./routes/migrate')); // 数据库迁移API路由
app.use('/api/banners', require('./routes/banners')); // 轮播图API路由
app.use('/api/miniapp', require('./routes/miniapp')); // 小程序API路由
app.use('/api/accounts', require('./routes/accounts')); // 用户余额管理API路由
app.use('/api/registrations', require('./routes/registrations')); // 活动报名API路由

// SPA fallback - 处理路由
app.get('*', (req, res) => {
  // 如果是API路由，返回404
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({
      success: false,
      message: '接口不存在'
    });
  }

  // 检查是否是静态资源文件（CSS、JS、图片等），应该由静态文件中间件处理
  if (req.path.match(/\.(css|js|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/i)) {
    return res.status(404).json({
      success: false,
      message: '静态文件未找到'
    });
  }

  // 检查是否是直接访问HTML文件
  if (req.path.endsWith('.html')) {
    const relative = req.path.replace(/^\/+/, '');
    const target = relative.length ? relative : 'index.html';
    return sendHtml(res, target);
  }

  // 其他所有路由都返回index.html，让前端路由处理
  sendHtml(res, 'index.html');
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