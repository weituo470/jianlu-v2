@echo off
echo 🧹 清理uni-app项目缓存
echo =====================

echo 1. 删除编译缓存...
if exist "unpackage" (
    rmdir /s /q "unpackage"
    echo ✅ 已删除 unpackage 目录
) else (
    echo ⚠️  unpackage 目录不存在
)

echo.
echo 2. 删除临时文件...
if exist "*.log" (
    del /q "*.log"
    echo ✅ 已删除日志文件
)

echo.
echo 3. 清理完成！
echo.
echo 📋 接下来的步骤：
echo    1. 重启 HBuilderX
echo    2. 重启微信开发者工具
echo    3. 在HBuilderX中重新运行到微信小程序模拟器
echo.
pause
