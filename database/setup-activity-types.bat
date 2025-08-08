@echo off
chcp 65001 >nul
echo.
echo ==========================================
echo    活动类型管理系统 - 快速设置
echo ==========================================
echo.

echo 🚀 开始设置活动类型管理功能...
echo.

echo 📝 步骤1: 执行数据库迁移
node migrate-activity-types.js
if %errorlevel% neq 0 (
    echo ❌ 数据库迁移失败
    pause
    exit /b 1
)

echo.
echo ✅ 活动类型管理功能设置完成！
echo.
echo 📋 功能说明:
echo    - 活动类型数据表已创建
echo    - 默认活动类型已插入
echo    - 前端页面已准备就绪
echo.
echo 🌐 访问方式:
echo    - 管理后台: http://localhost:3458/activities/types
echo    - 或通过导航菜单: 活动管理 → 活动类型
echo.
echo 💡 提示:
echo    - 所有活动类型都支持增删改操作
echo    - 如有活动正在使用某类型则无法删除
echo    - 可以通过API接口进行数据操作
echo.

pause