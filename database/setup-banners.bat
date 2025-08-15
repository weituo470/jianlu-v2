@echo off
echo 开始设置轮播图数据库...

node migrate-banners.js

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✅ 轮播图数据库设置完成！
    echo.
    echo 📋 已创建：
    echo   - banners 表
    echo   - 示例轮播图数据
    echo.
    echo 🚀 现在可以使用轮播图管理功能了！
) else (
    echo.
    echo ❌ 轮播图数据库设置失败！
    echo 请检查数据库连接和权限设置。
)

pause