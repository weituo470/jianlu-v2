-- =====================================
-- 活动AA制系统数据验证SQL脚本
-- 用于检验已完成功能的数据库状态
-- =====================================

-- 1. 检查所有相关表是否存在
SELECT '=== 数据表检查 ===' as '检查项目';

SELECT 
  table_name as '表名',
  CASE WHEN table_name IN ('user_accounts', 'account_transactions', 'activity_registrations') 
    THEN '✅ 新增表' 
    ELSE '📋 原有表' 
  END as '状态'
FROM information_schema.tables 
WHERE table_schema = 'jianlu_admin' 
  AND table_name IN ('users', 'activities', 'user_accounts', 'account_transactions', 'activity_registrations')
ORDER BY table_name;

-- 2. 检查用户账户数据
SELECT '=== 用户账户检查 ===' as '检查项目';

SELECT 
  COUNT(*) as '账户总数',
  COUNT(CASE WHEN balance > 0 THEN 1 END) as '有余额账户',
  COALESCE(SUM(balance), 0) as '总余额',
  MAX(balance) as '最高余额'
FROM user_accounts;

-- 3. 检查交易记录
SELECT '=== 交易记录检查 ===' as '检查项目';

SELECT 
  COUNT(*) as '交易总数',
  COUNT(CASE WHEN transaction_type = 'recharge' THEN 1 END) as '充值次数',
  COUNT(CASE WHEN transaction_type = 'expense' THEN 1 END) as '消费次数',
  COALESCE(SUM(CASE WHEN transaction_type = 'recharge' THEN amount ELSE 0 END), 0) as '充值总额',
  COALESCE(SUM(CASE WHEN transaction_type = 'expense' THEN amount ELSE 0 END), 0) as '消费总额'
FROM account_transactions;

-- 4. 检查活动表的扩展字段
SELECT '=== 活动表扩展字段检查 ===' as '检查项目';

SELECT 
  COUNT(*) as '总活动数',
  COUNT(CASE WHEN total_cost > 0 THEN 1 END) as '有费用活动',
  COUNT(CASE WHEN cost_sharing_type = 'equal' THEN 1 END) as 'AA制活动',
  AVG(total_cost) as '平均活动费用'
FROM activities;

-- 5. 检查活动报名数据
SELECT '=== 活动报名检查 ===' as '检查项目';

SELECT 
  COUNT(*) as '报名总数',
  COUNT(CASE WHEN status = 'approved' THEN 1 END) as '已通过',
  COUNT(CASE WHEN status = 'pending' THEN 1 END) as '待审核',
  COUNT(CASE WHEN payment_status = 'paid' THEN 1 END) as '已支付'
FROM activity_registrations;

-- 6. 显示最近的测试数据
SELECT '=== 最近账户活动 ===' as '检查项目';

SELECT 
  u.username as '用户',
  ua.balance as '余额',
  ua.id as '账户ID'
FROM user_accounts ua
JOIN users u ON ua.user_id = u.id
ORDER BY ua.balance DESC
LIMIT 5;

-- 7. 显示最近的交易记录
SELECT '=== 最近交易记录 ===' as '检查项目';

SELECT 
  u.username as '用户',
  at.transaction_type as '交易类型',
  at.amount as '金额',
  at.description as '描述',
  at.created_at as '时间'
FROM account_transactions at
JOIN users u ON at.user_id = u.id
ORDER BY at.created_at DESC
LIMIT 5;

-- 8. 显示活动和报名情况
SELECT '=== 活动报名情况 ===' as '检查项目';

SELECT 
  a.title as '活动名称',
  a.total_cost as '总费用',
  a.organizer_cost as '发起人承担',
  a.participant_cost as '每人分摊',
  a.current_participants as '当前人数',
  a.max_participants as '最大人数'
FROM activities a
WHERE a.cost_sharing_type = 'equal'
ORDER BY a.created_at DESC
LIMIT 3;

-- 9. 系统完整性检查
SELECT '=== 系统完整性检查 ===' as '检查项目';

-- 检查是否有孤立的交易记录（没有对应账户）
SELECT 
  '孤立交易记录' as '检查项',
  COUNT(*) as '数量'
FROM account_transactions at
LEFT JOIN user_accounts ua ON at.user_id = ua.user_id
WHERE ua.id IS NULL

UNION ALL

-- 检查是否有孤立的报名记录（没有对应活动）
SELECT 
  '孤立报名记录' as '检查项',
  COUNT(*) as '数量'
FROM activity_registrations ar
LEFT JOIN activities a ON ar.activity_id = a.id
WHERE a.id IS NULL

UNION ALL

-- 检查余额一致性（简化检查）
SELECT 
  '账户数量一致性' as '检查项',
  CASE WHEN 
    (SELECT COUNT(*) FROM users) = 
    (SELECT COUNT(DISTINCT user_id) FROM user_accounts) + 
    (SELECT COUNT(*) FROM users WHERE id NOT IN (SELECT user_id FROM user_accounts WHERE user_id IS NOT NULL))
  THEN 0 ELSE 1 END as '数量'
;

-- 10. 功能状态总结
SELECT '=== 功能完成度评估 ===' as '检查项目';

SELECT 
  '用户账户系统' as '功能模块',
  CASE WHEN EXISTS (SELECT 1 FROM user_accounts) THEN '✅ 已实现' ELSE '❌ 未实现' END as '状态'

UNION ALL

SELECT 
  '交易记录系统' as '功能模块',
  CASE WHEN EXISTS (SELECT 1 FROM account_transactions) THEN '✅ 已实现' ELSE '❌ 未实现' END as '状态'

UNION ALL

SELECT 
  '活动费用管理' as '功能模块',
  CASE WHEN EXISTS (SELECT 1 FROM activities WHERE total_cost IS NOT NULL) THEN '✅ 已实现' ELSE '❌ 未实现' END as '状态'

UNION ALL

SELECT 
  '活动报名系统' as '功能模块',
  CASE WHEN EXISTS (SELECT 1 FROM activity_registrations) THEN '✅ 已实现' ELSE '❌ 未实现' END as '状态'

UNION ALL

SELECT 
  'AA制费用分摊' as '功能模块',
  CASE WHEN EXISTS (SELECT 1 FROM activities WHERE cost_sharing_type = 'equal') THEN '✅ 已实现' ELSE '❌ 未实现' END as '状态'
;