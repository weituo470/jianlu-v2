# 快速修复团队类型表

## 🚀 立即可用的解决方案

你的数据库配置已经设置好了：
- 用户: root
- 密码: wei159753...
- 数据库: jianlu_admin

## 方法1：使用SQL脚本（推荐）

```bash
cd database
simple-fix.bat
```

## 方法2：手动执行SQL

1. 打开MySQL命令行：
```bash
mysql -u root -p
```

2. 输入密码：`wei159753...`

3. 选择数据库：
```sql
USE jianlu_admin;
```

4. 执行SQL文件：
```sql
source create-team-types-table.sql;
```

## 方法3：使用Sequelize（需要先安装依赖）

```bash
cd backend
npm install mysql2
cd ../database
node auto-fix-team-types.js
```

## 验证修复

修复完成后：
1. 重启后端服务
2. 访问团队类型管理页面
3. 应该能看到8个默认团队类型
4. 测试新增和删除功能

## 如果还有问题

请告诉我具体的错误信息，我会进一步帮助你解决。