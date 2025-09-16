@echo off
chcp 65001 >nul
title 简庐项目启动助手

echo.
echo ==========================================
echo           简庐项目启动助手
echo ==========================================
echo.

:: 检查Node.js是否安装
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ 错误: 未检测到Node.js，请先安装Node.js
    echo 下载地址: https://nodejs.org/
    pause
    exit /b 1
)

:: 检查Python是否安装
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ 错误: 未检测到Python，请先安装Python
    echo 下载地址: https://www.python.org/
    pause
    exit /b 1
)

:menu
cls
echo.
echo ==========================================
echo           简庐项目启动助手
echo ==========================================
echo.
echo 请选择要启动的服务:
echo.
echo [1] 启动后端服务 (端口 3460)
echo [2] 启动管理后台 (端口 8086)
echo [3] 启动微信小程序开发模式
echo [4] 启动所有服务
echo [5] 安装依赖
echo [0] 退出
echo.
set /p choice=请输入选项 (0-5):

if "%choice%"=="1" goto start_backend
if "%choice%"=="2" goto start_admin
if "%choice%"=="3" goto start_miniprogram
if "%choice%"=="4" goto start_all
if "%choice%"=="5" goto install_deps
if "%choice%"=="0" goto exit
echo 无效选项，请重新选择
goto menu

:start_backend
echo.
echo 🚀 启动后端服务（包含管理后台）...
cd backend
if not exist node_modules (
    echo 正在安装后端依赖...
    npm install
)
echo 服务将在以下地址启动：
echo - API接口: http://localhost:3460/api
echo - 管理后台: http://localhost:3460
echo 按 Ctrl+C 停止服务
echo.
start "简庐服务 - 端口 3460" cmd /k npm run dev
cd ..
goto menu

:start_admin
echo.
echo ℹ️  管理后台已集成在后端服务中
echo 请启动后端服务访问：http://localhost:3460
echo 测试账号: admin / admin123
echo.
pause
goto menu

:start_miniprogram
echo.
echo 📱 启动微信小程序开发模式...
echo.
echo 📋 启动步骤:
echo 1. 确保后端服务已启动 (localhost:3460)
echo 2. 打开HBuilderX
echo 3. 导入项目目录: %~dp0jianlu-uniapp
echo 4. 运行到微信开发者工具
echo.
echo 💡 提示:
echo - 首次运行需要配置微信开发者工具路径
echo - 在微信开发者工具中关闭域名校验
echo - 使用测试账号登录: testuser / testpassword123
echo.
call jianlu-uniapp\start-miniprogram.bat
goto menu

:start_all
echo.
echo 🚀 启动所有服务...
echo.

:: 启动后端（包含管理后台）
echo [1/2] 启动后端服务（包含管理后台）...
cd backend
if not exist node_modules (
    echo 正在安装后端依赖...
    npm install
)
echo 服务将在以下地址启动：
echo - API接口: http://localhost:3460/api
echo - 管理后台: http://localhost:3460
start "简庐服务 - 端口 3460" cmd /c npm run dev
cd ..
timeout /t 3 /nobreak >nul

:: 显示小程序启动说明
echo [2/2] 微信小程序开发模式
echo 请按照以下步骤启动小程序:
echo 1. 打开HBuilderX
echo 2. 导入项目目录: %~dp0jianlu-uniapp
echo 3. 运行到微信开发者工具
echo.
echo 所有服务已启动!
echo - 简庐服务: http://localhost:3460 (包含API和管理后台)
echo.
pause
goto menu

:install_deps
echo.
echo 📦 安装项目依赖...
echo.

:: 安装后端依赖
echo [1/2] 安装后端依赖...
cd backend
if not exist node_modules (
    npm install
    echo 后端依赖安装完成
) else (
    echo 后端依赖已存在
)
cd ..

:: 安装小程序依赖
echo [2/2] 检查小程序依赖...
cd jianlu-uniapp
if not exist node_modules (
    npm install
    echo 小程序依赖安装完成
) else (
    echo 小程序依赖已存在
)
cd ..

echo.
echo 依赖安装完成!
pause
goto menu

:exit
echo.
echo 感谢使用简庐项目启动助手!
echo.
pause
exit