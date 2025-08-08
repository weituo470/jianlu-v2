# 简庐管理后台系统 - 后端API

## 项目简介

简庐管理后台系统的后端API服务，基于Node.js + Express.js + Sequelize + MySQL构建，提供完整的用户认证、权限管理和业务功能接口。

## 技术栈

- **运行时**: Node.js 18+
- **框架**: Express.js
- **数据库**: MySQL 8.0
- **ORM**: Sequelize
- **认证**: JWT + bcrypt
- **日志**: Winston
- **验证**: Joi
- **安全**: Helmet, CORS, Rate Limiting

## 快速开始

### 1. 安装依赖

```bash
cd backend
npm install
```

### 2. 环境配置

复制环境变量模板文件：

```bash
cp .env.example .env
```

编辑 `.env` 文件，配置数据库连接和其他参数：

```env
# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_NAME=jianlu_admin
DB_USER=root
DB_PASSWORD=your_password

# JWT配置
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRES_IN=24h

# 服务器配置
PORT=3458
NODE_ENV=development
```

### 3. 数据库准备

确保MySQL数据库已创建并运行，数据库表结构会在应用启动时自动创建。

### 4. 启动服务

开发模式：
```bash
npm run dev
```

生产模式：
```bash
npm start
```

## API文档

### 认证接口

#### 登录
- **POST** `/api/auth/login`
- **Body**: `{ username, password, rememberMe? }`
- **Response**: `{ token, user, expiresIn }`

#### 获取用户信息
- **GET** `/api/auth/profile`
- **Headers**: `Authorization: Bearer <token>`
- **Response**: `{ user }`

#### 刷新Token
- **POST** `/api/auth/refresh`
- **Headers**: `Authorization: Bearer <token>`
- **Response**: `{ token, expiresIn }`

#### 登出
- **POST** `/api/auth/logout`
- **Headers**: `Authorization: Bearer <token>`

### 用户管理接口

#### 获取用户列表
- **GET** `/api/users`
- **Query**: `{ page?, limit?, search?, status?, role?, startDate?, endDate? }`
- **Permission**: `user:read`

#### 获取用户详情
- **GET** `/api/users/:id`
- **Permission**: `user:read`

#### 创建用户
- **POST** `/api/users`
- **Body**: `{ username, email, password, role, profile? }`
- **Permission**: `user:create`

#### 更新用户
- **PUT** `/api/users/:id`
- **Body**: `{ username?, email?, role?, status?, profile? }`
- **Permission**: `user:update`

#### 删除用户
- **DELETE** `/api/users/:id`
- **Permission**: `user:delete`

#### 重置密码
- **POST** `/api/users/:id/reset-password`
- **Body**: `{ newPassword }`
- **Permission**: `user:update`

#### 批量操作
- **POST** `/api/users/batch`
- **Body**: `{ ids, action }`
- **Permission**: `user:update`

## 权限系统

### 角色定义

- **super_admin**: 超级管理员，拥有所有权限
- **system_admin**: 系统管理员，管理用户和系统配置
- **operation_admin**: 运营管理员，管理团队、活动和内容
- **team_admin**: 团队管理员，管理团队成员

### 权限列表

- `user:read`, `user:create`, `user:update`, `user:delete`
- `team:read`, `team:create`, `team:update`, `team:delete`
- `activity:read`, `activity:create`, `activity:update`, `activity:delete`
- `content:read`, `content:create`, `content:update`, `content:delete`
- `system:read`, `system:update`

## 错误处理

API使用统一的错误响应格式：

```json
{
  "success": false,
  "message": "错误描述",
  "code": "ERROR_CODE",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### 常见错误码

- `VALIDATION_ERROR`: 数据验证失败
- `UNAUTHORIZED`: 未授权访问
- `FORBIDDEN`: 权限不足
- `NOT_FOUND`: 资源不存在
- `DUPLICATE_ERROR`: 数据重复
- `INTERNAL_SERVER_ERROR`: 服务器内部错误

## 日志系统

应用使用Winston进行日志记录，日志文件保存在 `logs/` 目录：

- `error.log`: 错误日志
- `combined.log`: 所有日志

开发环境下日志同时输出到控制台。

## 安全特性

- JWT Token认证
- 密码bcrypt加密
- 请求频率限制
- CORS跨域保护
- Helmet安全头
- 登录失败锁定机制
- SQL注入防护（Sequelize ORM）

## 开发指南

### 添加新的API路由

1. 在 `src/routes/` 目录创建路由文件
2. 在 `src/app.js` 中注册路由
3. 添加相应的验证模式到 `src/middleware/validation.js`
4. 更新权限定义

### 添加新的数据模型

1. 在 `src/models/` 目录创建模型文件
2. 在 `src/models/index.js` 中导入并定义关联关系
3. 运行数据库同步

## 测试

```bash
# 运行测试
npm test

# 监听模式运行测试
npm run test:watch
```

## 部署

### 生产环境配置

1. 设置环境变量 `NODE_ENV=production`
2. 配置生产数据库连接
3. 设置强密码的JWT_SECRET
4. 配置日志级别和文件路径
5. 设置适当的请求限制参数

### PM2部署

```bash
# 安装PM2
npm install -g pm2

# 启动应用
pm2 start src/app.js --name jianlu-admin-backend

# 查看状态
pm2 status

# 查看日志
pm2 logs jianlu-admin-backend
```

## 许可证

MIT License