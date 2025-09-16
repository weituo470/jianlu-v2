#!/bin/bash

# 简庐项目启动助手 (Linux/Mac版本)

echo ""
echo "=========================================="
echo "           简庐项目启动助手"
echo "=========================================="
echo ""

# 检查Node.js是否安装
if ! command -v node &> /dev/null; then
    echo "❌ 错误: 未检测到Node.js，请先安装Node.js"
    echo "下载地址: https://nodejs.org/"
    exit 1
fi

# 检查Python3是否安装
if ! command -v python3 &> /dev/null; then
    echo "❌ 错误: 未检测到Python3，请先安装Python3"
    echo "下载地址: https://www.python.org/"
    exit 1
fi

# 显示菜单
show_menu() {
    echo ""
    echo "请选择要启动的服务:"
    echo ""
    echo "[1] 启动后端服务 (端口 3460)"
    echo "[2] 启动管理后台 (端口 8086)"
    echo "[3] 启动微信小程序开发模式"
    echo "[4] 启动所有服务"
    echo "[5] 安装依赖"
    echo "[0] 退出"
    echo ""
}

# 启动后端服务（包含管理后台）
start_backend() {
    echo ""
    echo "🚀 启动后端服务（包含管理后台）..."
    cd backend
    if [ ! -d "node_modules" ]; then
        echo "正在安装后端依赖..."
        npm install
    fi
    echo "服务将在以下地址启动："
    echo "- API接口: http://localhost:3460/api"
    echo "- 管理后台: http://localhost:3460"
    echo "按 Ctrl+C 停止服务"
    echo ""
    gnome-terminal --title="简庐服务 - 端口 3460" -- npm run dev || \
    x-terminal-emulator -T "简庐服务 - 端口 3460" -e npm run dev || \
    echo "请在新的终端窗口手动运行: cd backend && npm run dev"
    cd ..
}

# 启动管理后台
start_admin() {
    echo ""
    echo "ℹ️  管理后台已集成在后端服务中"
    echo "请启动后端服务访问：http://localhost:3460"
    echo "测试账号: admin / admin123"
    echo ""
}

# 启动小程序开发模式
start_miniprogram() {
    echo ""
    echo "📱 启动微信小程序开发模式..."
    echo ""
    echo "📋 启动步骤:"
    echo "1. 确保后端服务已启动 (localhost:3460)"
    echo "2. 打开HBuilderX"
    echo "3. 导入项目目录: $(pwd)/jianlu-uniapp"
    echo "4. 运行到微信开发者工具"
    echo ""
    echo "💡 提示:"
    echo "- 首次运行需要配置微信开发者工具路径"
    echo "- 在微信开发者工具中关闭域名校验"
    echo "- 使用测试账号登录: testuser / testpassword123"
    echo ""
}

# 启动所有服务
start_all() {
    echo ""
    echo "🚀 启动所有服务..."
    echo ""

    # 启动后端（包含管理后台）
    echo "[1/2] 启动后端服务（包含管理后台）..."
    cd backend
    if [ ! -d "node_modules" ]; then
        echo "正在安装后端依赖..."
        npm install
    fi
    echo "服务将在以下地址启动："
    echo "- API接口: http://localhost:3460/api"
    echo "- 管理后台: http://localhost:3460"
    gnome-terminal --title="简庐服务 - 端口 3460" -- npm run dev || \
    x-terminal-emulator -T "简庐服务 - 端口 3460" -e npm run dev || \
    echo "请在新的终端窗口手动运行: cd backend && npm run dev" &
    cd ..
    sleep 3

    # 显示小程序启动说明
    echo "[2/2] 微信小程序开发模式"
    start_miniprogram

    echo ""
    echo "所有服务已启动!"
    echo "- 简庐服务: http://localhost:3460 (包含API和管理后台)"
    echo ""
}

# 安装依赖
install_deps() {
    echo ""
    echo "📦 安装项目依赖..."
    echo ""

    # 安装后端依赖
    echo "[1/2] 安装后端依赖..."
    cd backend
    if [ ! -d "node_modules" ]; then
        npm install
        echo "后端依赖安装完成"
    else
        echo "后端依赖已存在"
    fi
    cd ..

    # 安装小程序依赖
    echo "[2/2] 检查小程序依赖..."
    cd jianlu-uniapp
    if [ ! -d "node_modules" ]; then
        npm install
        echo "小程序依赖安装完成"
    else
        echo "小程序依赖已存在"
    fi
    cd ..

    echo ""
    echo "依赖安装完成!"
}

# 主循环
while true; do
    show_menu
    read -p "请输入选项 (0-5): " choice

    case $choice in
        1) start_backend ;;
        2) start_admin ;;
        3) start_miniprogram; read -p "按回车键继续..." ;;
        4) start_all; read -p "按回车键继续..." ;;
        5) install_deps; read -p "按回车键继续..." ;;
        0)
            echo ""
            echo "感谢使用简庐项目启动助手!"
            echo ""
            exit 0
            ;;
        *)
            echo "无效选项，请重新选择"
            sleep 1
            ;;
    esac
done