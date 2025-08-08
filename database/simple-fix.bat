@echo off
chcp 65001 >nul
echo Simple Team Types Fix
echo =====================

echo Using your configured password: wei159753...
echo Database: jianlu_admin
echo.

echo Method 1: Using MySQL command line
echo -----------------------------------
echo mysql -u root -pwei159753... jianlu_admin < create-team-types-table.sql
echo.

mysql -u root -pwei159753... jianlu_admin < create-team-types-table.sql

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✅ Team types table created successfully!
    echo.
    echo Next steps:
    echo 1. Restart your backend service
    echo 2. Test the team types management page
    echo.
    echo The table now contains 8 default team types.
) else (
    echo.
    echo ❌ MySQL command failed. Trying alternative method...
    echo.
    echo Method 2: Manual SQL execution
    echo ------------------------------
    echo Please run these commands manually in MySQL:
    echo.
    echo 1. Connect to MySQL: mysql -u root -p
    echo 2. Use database: USE jianlu_admin;
    echo 3. Run the SQL file: source create-team-types-table.sql;
    echo.
    echo Or copy and paste the SQL content from create-team-types-table.sql
)

pause