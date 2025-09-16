@echo off
chcp 65001 >nul
title 简庐项目停止助手

echo.
echo ==========================================
echo           简庐项目停止助手
echo ==========================================
echo.

echo 正在查找并关闭相关进程...

:: 查找并关闭占用3460端口的进程
echo.
echo [1/2] 检查端口 3460...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :3460 ^| findstr LISTENING') do (
    echo 发现占用端口3460的进程，PID: %%a
    taskkill /F /PID %%a
    if !errorlevel! equ 0 (
        echo ✓ 进程 %%a 已终止
    ) else (
        echo ✗ 终止进程 %%a 失败，可能需要管理员权限
    )
)

:: 查找并关闭Node.js相关进程
echo.
echo [2/2] 检查Node.js进程...
tasklist /fi "imagename eq node.exe" /fo table 2>nul | findstr "node.exe" >nul
if %errorlevel% equ 0 (
    echo 发现Node.js进程，正在关闭...
    taskkill /F /IM node.exe
    if !errorlevel! equ 0 (
        echo ✓ Node.js进程已关闭
    ) else (
        echo ✗ 关闭Node.js进程失败
    )
) else (
    echo 未发现运行的Node.js进程
)

:: 查找并关闭Python HTTP服务器（如果还在运行）
echo.
echo 检查Python进程...
tasklist /fi "imagename eq python.exe" /fo table 2>nul | findstr "python.exe" | findstr "start-admin" >nul
if %errorlevel% equ 0 (
    echo 发现Python服务器进程，正在关闭...
    for /f "tokens=2" %%p in ('tasklist /fi "imagename eq python.exe" /fo list ^| findstr "PID:"') do (
        taskkill /F /PID %%p
    )
    if !errorlevel! equ 0 (
        echo ✓ Python服务器进程已关闭
    ) else (
        echo ✗ 关闭Python服务器进程失败
    )
) else (
    echo 未发现运行的Python服务器进程
)

echo.
echo ==========================================
echo            停止操作完成
echo ==========================================
echo.
echo 如果仍有端口被占用，请尝试：
echo 1. 以管理员身份运行此脚本
echo 2. 手动重启电脑
echo.
pause