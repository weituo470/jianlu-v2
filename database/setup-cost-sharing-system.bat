@echo off
chcp 65001 >nul
echo =====================================
echo 活动AA制数据库结构更新脚本
echo =====================================
echo.

echo [1/3] 正在创建用户余额系统表...
mysql -u root -p --default-character-set=utf8mb4 jianlu_dev < create-account-system.sql
if errorlevel 1 (
    echo ❌ 用户余额系统表创建失败！
    pause
    exit /b 1
) else (
    echo ✅ 用户余额系统表创建成功！
)
echo.

echo [2/3] 正在扩展活动表结构...
mysql -u root -p --default-character-set=utf8mb4 jianlu_dev < extend-activities-cost-sharing.sql
if errorlevel 1 (
    echo ❌ 活动表结构扩展失败！
    pause
    exit /b 1
) else (
    echo ✅ 活动表结构扩展成功！
)
echo.

echo [3/3] 正在验证数据库结构...
mysql -u root -p --default-character-set=utf8mb4 jianlu_dev -e "
SELECT 'user_accounts' as table_name, COUNT(*) as record_count FROM user_accounts
UNION ALL
SELECT 'account_transactions' as table_name, COUNT(*) as record_count FROM account_transactions  
UNION ALL
SELECT 'activity_registrations' as table_name, COUNT(*) as record_count FROM activity_registrations
UNION ALL  
SELECT 'activity_cost_sharing' as table_name, COUNT(*) as record_count FROM activity_cost_sharing;

SELECT 'activities表字段检查' as check_name, 
       CASE WHEN COUNT(*) >= 5 THEN '✅ 字段已添加' ELSE '❌ 字段缺失' END as status
FROM information_schema.COLUMNS 
WHERE table_schema = 'jianlu_dev' 
  AND table_name = 'activities' 
  AND column_name IN ('total_cost', 'organizer_cost', 'participant_cost', 'cost_sharing_type', 'activity_status');
"

if errorlevel 1 (
    echo ❌ 数据库结构验证失败！
    pause
    exit /b 1
) else (
    echo ✅ 数据库结构验证通过！
)
echo.

echo =====================================
echo 🎉 数据库更新完成！
echo =====================================
echo 接下来可以：
echo 1. 重启后端服务
echo 2. 测试余额系统功能
echo 3. 开发费用分摊API
echo =====================================
pause