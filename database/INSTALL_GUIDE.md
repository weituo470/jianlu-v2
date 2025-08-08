# 简庐管理后台数据库完整安装指南

## 前置要求

- Windows 10/11 或 Linux 系统
- 管理员权限
- 至少 2GB 可用磁盘空间

## 第一步：安装 MySQL 8.0

### Windows 系统安装

1. **下载 MySQL 安装包**
   - 访问 [MySQL 官方下载页面](https://dev.mysql.com/downloads/mysql/)
   - 选择 "MySQL Installer for Windows"
   - 下载 mysql-installer-web-community-8.0.xx.x.msi

2. **运行安装程序**
   ```
   双击下载的 .msi 文件
   选择 "Developer Default" 或 "Server only"
   点击 "Next" 继续
   ```

3. **配置 MySQL 服务器**
   ```
   设置 root 用户密码（请记住此密码）
   选择端口 3306（默认）
   配置为 Windows 服务自动启动
   ```

4. **验证安装**
   ```cmd
   # 打开命令提示符（以管理员身份）
   mysql --version
   
   # 如果显示版本信息，说明安装成功
   ```

### Linux 系统安装 (Ubuntu/Debian)

```bash
# 更新包列表
sudo apt update

# 安装 MySQL 服务器
sudo apt install mysql-server-8.0

# 启动 MySQL 服务
sudo systemctl start mysql
sudo systemctl enable mysql

# 运行安全配置脚本
sudo mysql_secure_installation
```

### Linux 系统安装 (CentOS/RHEL)

```bash
# 安装 MySQL 仓库
sudo yum install mysql-server

# 启动服务
sudo systemctl start mysqld
sudo systemctl enable mysqld

# 获取临时密码
sudo grep 'temporary password' /var/log/mysqld.log

# 运行安全配置
sudo mysql_secure_installation
```

## 第二步：执行数据库安装脚本

### 方法一：使用自动安装脚本 (Windows)

1. **运行安装脚本**
   ```cmd
   cd database
   install.bat
   ```

2. **按提示输入 root 密码**

### 方法二：手动执行 SQL 脚本

1. **连接到 MySQL**
   ```bash
   mysql -u root -p
   ```

2. **执行架构脚本**
   ```sql
   source /path/to/database/schema.sql;
   ```

3. **设置用户权限**
   ```sql
   source /path/to/database/setup.sql;
   ```

4. **初始化数据**
   ```sql
   source /path/to/database/init_data.sql;
   ```

## 第三步：验证安装

### 检查数据库和表

```sql
-- 连接数据库
mysql -u jianlu_app -p

-- 输入密码：jianlu_app_password_2024

-- 查看数据库
SHOW DATABASES;

-- 使用数据库
USE jianlu_admin;

-- 查看表结构
SHOW TABLES;

-- 验证管理员账户
SELECT username, email, role FROM users WHERE role = 'super_admin';
```

### 预期输出

```
+----------+------------------+-------------+
| username | email            | role        |
+----------+------------------+-------------+
| admin    | admin@jianlu.com | super_admin |
+----------+------------------+-------------+
```

## 第四步：安全配置

### 1. 修改默认密码

```sql
-- 修改应用用户密码
ALTER USER 'jianlu_app'@'localhost' IDENTIFIED BY '你的新密码';
ALTER USER 'jianlu_app'@'%' IDENTIFIED BY '你的新密码';

-- 修改只读用户密码
ALTER USER 'jianlu_readonly'@'localhost' IDENTIFIED BY '你的新密码';
ALTER USER 'jianlu_readonly'@'%' IDENTIFIED BY '你的新密码';

FLUSH PRIVILEGES;
```

### 2. 配置防火墙（生产环境）

```bash
# Ubuntu/Debian
sudo ufw allow from 你的应用服务器IP to any port 3306

# CentOS/RHEL
sudo firewall-cmd --permanent --add-rich-rule="rule family='ipv4' source address='你的应用服务器IP' port protocol='tcp' port='3306' accept"
sudo firewall-cmd --reload
```

## 故障排除

### 问题 1：MySQL 命令未找到

**解决方案：**
- Windows：将 MySQL bin 目录添加到系统 PATH 环境变量
- Linux：重新安装 MySQL 客户端工具

### 问题 2：连接被拒绝

**解决方案：**
```bash
# 检查 MySQL 服务状态
# Windows
net start mysql80

# Linux
sudo systemctl status mysql
sudo systemctl start mysql
```

### 问题 3：权限不足

**解决方案：**
```sql
-- 以 root 用户重新授权
GRANT ALL PRIVILEGES ON jianlu_admin.* TO 'jianlu_app'@'localhost';
FLUSH PRIVILEGES;
```

## 下一步

数据库安装完成后，您可以：

1. 配置应用程序的数据库连接
2. 启动后端服务
3. 使用默认管理员账户登录系统
4. 修改默认密码和配置

## 联系支持

如果在安装过程中遇到问题，请：
1. 检查 MySQL 错误日志
2. 确认所有步骤都已正确执行
3. 验证网络连接和防火墙设置