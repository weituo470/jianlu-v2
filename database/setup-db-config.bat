@echo off
chcp 65001 >nul
echo Database Configuration Setup
echo =============================

echo Current configuration:
node check-db-config.js

echo.
echo =============================
echo.

set /p DB_PASSWORD="Enter MySQL password (or press Enter if no password): "
set /p DB_USER="Enter MySQL username (default: root): "
if "%DB_USER%"=="" set DB_USER=root

set /p DB_NAME="Enter database name (default: jianlu_admin): "
if "%DB_NAME%"=="" set DB_NAME=jianlu_admin

echo.
echo Setting environment variables...
set DB_HOST=localhost
set DB_PORT=3306

echo DB_HOST=%DB_HOST%
echo DB_PORT=%DB_PORT%
echo DB_USER=%DB_USER%
echo DB_PASSWORD=%DB_PASSWORD%
echo DB_NAME=%DB_NAME%

echo.
echo Testing connection with new settings...
node check-db-config.js

echo.
echo =============================
echo Configuration complete!
echo Now you can run: node auto-fix-team-types.js
echo =============================

pause