@echo off
echo 正在执行活动费用分摊功能数据库迁移...
echo.

cd /d "%~dp0"
node migrate-activity-cost.js

echo.
echo 迁移完成！
pause