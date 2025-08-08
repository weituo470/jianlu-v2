@echo off
chcp 65001 >nul
echo.
echo ==========================================
echo           简庐小程序启动助手
echo ==========================================
echo.

echo 🔍 检查配置...
node check-config.js

echo.
echo 📋 启动步骤:
echo 1. 确保后端服务已启动 (localhost:3458)
echo 2. 打开HBuilderX
echo 3. 导入项目目录: %~dp0
echo 4. 运行到微信开发者工具
echo.

echo 💡 提示:
echo - 首次运行需要配置微信开发者工具路径
echo - 在微信开发者工具中关闭域名校验
echo - 使用测试账号登录: testuser / testpassword123
echo.

pause