@echo off
chcp 65001 >nul
echo Fix Team Types with SQL
echo =========================

echo This will create the team_types table using SQL script.
echo.

set /p DB_PASSWORD="Enter MySQL root password: "
set /p DB_NAME="Enter database name (default: jianlu_admin): "
if "%DB_NAME%"=="" set DB_NAME=jianlu_admin

echo.
echo Executing SQL script...
mysql -u root -p%DB_PASSWORD% %DB_NAME% < create-team-types-table.sql

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✅ SQL script executed successfully!
    echo Team types table has been created with default data.
    echo.
    echo Next steps:
    echo 1. Restart your backend service
    echo 2. Test the team types management page
) else (
    echo.
    echo ❌ SQL script execution failed!
    echo Please check:
    echo - MySQL password is correct
    echo - Database exists
    echo - MySQL service is running
)

pause