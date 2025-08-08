@echo off
chcp 65001 >nul
echo Team Types Auto Fix
echo ==================

echo Checking and fixing team types table...
node auto-fix-team-types.js

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ✅ Fix completed!
    echo.
    echo Next steps:
    echo 1. Restart backend service
    echo 2. Refresh team types management page
    echo 3. Test add/delete functions
    echo.
    echo Team types data will now be read from database!
) else (
    echo.
    echo ❌ Fix failed!
    echo Please check error message and fix the problem
    echo.
    echo Common issues:
    echo - Make sure MySQL service is running
    echo - Check database connection config
    echo - Verify user permissions
)

pause