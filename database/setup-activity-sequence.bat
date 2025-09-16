@echo off
chcp 65001 >nul
echo.
echo ==========================================
echo        简庐活动序号字段设置工具
echo ==========================================
echo.

echo 🔍 检查配置...

REM 检查环境变量
if "%MYSQL_USER%"=="" (
    set MYSQL_USER=root
)
if "%MYSQL_HOST%"=="" (
    set MYSQL_HOST=localhost
)
if "%MYSQL_PORT%"=="" (
    set MYSQL_PORT=3306
)
if "%MYSQL_DB%"=="" (
    set MYSQL_DB=jianlu_admin
)

echo 📋 数据库配置:
echo    用户: %MYSQL_USER%
echo    主机: %MYSQL_HOST%
echo    端口: %MYSQL_PORT%
echo    数据库: %MYSQL_DB%
echo.

echo ⚠️  请确保已设置 MYSQL_PWD 环境变量或在提示时输入密码
echo.

REM 执行SQL脚本
echo 🚀 执行数据库更新...
mysql -u %MYSQL_USER% -h %MYSQL_HOST% -P %MYSQL_PORT% %MYSQL_DB% < add-activity-sequence-field.sql

if %errorlevel% == 0 (
    echo ✅ 数据库更新成功完成
) else (
    echo ❌ 数据库更新失败，请检查错误信息
    pause
    exit /b 1
)

echo.
echo 🔄 更新现有活动序号...
node update-activity-sequence.js

if %errorlevel% == 0 (
    echo ✅ 活动序号更新成功完成
) else (
    echo ❌ 活动序号更新失败，请检查错误信息
    pause
    exit /b 1
)

echo.
echo 🎉 所有更新已完成！
echo.
pause