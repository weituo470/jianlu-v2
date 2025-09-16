#!/bin/bash

echo ""
echo "=========================================="
echo "           简庐项目停止助手"
echo "=========================================="
echo ""

echo "正在查找并关闭相关进程..."

# 查找并关闭占用3460端口的进程
echo ""
echo "[1/2] 检查端口 3460..."
PORT_3460_PID=$(lsof -ti:3460 2>/dev/null)
if [ ! -z "$PORT_3460_PID" ]; then
    echo "发现占用端口3460的进程，PID: $PORT_3460_PID"
    kill -9 $PORT_3460
    if [ $? -eq 0 ]; then
        echo "✓ 进程 $PORT_3460_PID 已终止"
    else
        echo "✗ 终止进程失败，可能需要sudo权限"
    fi
else
    echo "端口3460未被占用"
fi

# 查找并关闭Node.js相关进程
echo ""
echo "[2/2] 检查Node.js进程..."
NODE_PIDS=$(pgrep -f "node" 2>/dev/null)
if [ ! -z "$NODE_PIDS" ]; then
    echo "发现Node.js进程，正在关闭..."
    echo $NODE_PIDS | xargs kill -9
    if [ $? -eq 0 ]; then
        echo "✓ Node.js进程已关闭"
    else
        echo "✗ 关闭Node.js进程失败"
    fi
else
    echo "未发现运行的Node.js进程"
fi

# 查找并关闭Python HTTP服务器
echo ""
echo "检查Python进程..."
PYTHON_PIDS=$(pgrep -f "start-admin-frontend.py" 2>/dev/null)
if [ ! -z "$PYTHON_PIDS" ]; then
    echo "发现Python服务器进程，正在关闭..."
    echo $PYTHON_PIDS | xargs kill -9
    if [ $? -eq 0 ]; then
        echo "✓ Python服务器进程已关闭"
    else
        echo "✗ 关闭Python服务器进程失败"
    fi
else
    echo "未发现运行的Python服务器进程"
fi

echo ""
echo "=========================================="
echo "            停止操作完成"
echo "=========================================="
echo ""
echo "如果仍有端口被占用，请尝试："
echo "1. 使用sudo运行此脚本: sudo ./stop.sh"
echo "2. 手动重启电脑"
echo ""

# 显示端口状态
echo "端口状态检查："
echo "端口3460: $(lsof -i:3460 2>/dev/null | wc -l | xargs) 个进程占用"