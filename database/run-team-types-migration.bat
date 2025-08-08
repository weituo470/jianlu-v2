@echo off
echo 团队类型数据迁移脚本
echo ==================

echo 正在执行团队类型数据迁移...
node migrate-team-types.js

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✅ 迁移完成！
    echo.
    echo 现在可以：
    echo 1. 重启后端服务
    echo 2. 访问团队类型管理页面测试功能
    echo 3. 新增和删除操作现在会真正保存到数据库
) else (
    echo.
    echo ❌ 迁移失败！请检查错误信息
)

pause