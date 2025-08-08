@echo off
REM 简庐管理后台数据库安装脚本 (Windows)
echo ========================================
echo 简庐管理后台数据库安装脚本
echo ========================================
echo.

REM 检查MySQL是否安装
mysql --version >nul 2>&1
if %errorlevel% neq 0 (
    echo 错误: 未找到MySQL命令，请先安装MySQL 8.0
    echo 下载地址: https://dev.mysql.com/downloads/mysql/
    pause
    exit /b 1
)

echo MySQL已安装，开始数据库设置...
echo.

REM 提示用户输入root密码
set /p ROOT_PASSWORD=请输入MySQL root密码: 

echo.
echo 正在创建数据库和表结构...
mysql -u root -p%ROOT_PASSWORD% < schema.sql
if %errorlevel% neq 0 (
    echo 错误: 数据库架构创建失败
    pause
    exit /b 1
)

echo.
echo 正在设置数据库用户和权限...
mysql -u root -p%ROOT_PASSWORD% < setup.sql
if %errorlevel% neq 0 (
    echo 错误: 用户权限设置失败
    pause
    exit /b 1
)

echo.
echo 正在初始化基础数据...
mysql -u root -p%ROOT_PASSWORD% < init_data.sql
if %errorlevel% neq 0 (
    echo 错误: 初始化数据失败
    pause
    exit /b 1
)

echo.
echo ========================================
echo 数据库安装完成！
echo ========================================
echo.
echo 数据库信息:
echo   数据库名: jianlu_admin
echo   应用用户: jianlu_app
echo   应用密码: jianlu_app_password_2024
echo.
echo 默认管理员账户:
echo   用户名: admin
echo   密码: admin123
echo   邮箱: admin@jianlu.com
echo.
echo 重要提醒:
echo 1. 请立即修改默认的数据库用户密码
echo 2. 首次登录后请修改管理员密码
echo 3. 生产环境请配置防火墙规则
echo.
pause