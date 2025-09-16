-- 为活动表添加序号字段
-- 注意：请先在命令行中设置环境变量 MYSQL_PWD 或在 mysql 命令中使用 -p 参数指定密码

-- 使用数据库
USE jianlu_admin;

-- 添加序号字段
ALTER TABLE activities 
ADD COLUMN sequence_number INT NOT NULL DEFAULT 0 COMMENT '活动序号，用于排序，数值越大越新';

-- 创建索引以提高按序号查询的性能
CREATE INDEX idx_activities_sequence_number ON activities(sequence_number);

-- 更新现有活动的序号（按创建时间倒序分配序号）
SET @row_number = 0;
UPDATE activities 
SET sequence_number = (@row_number := @row_number + 1) 
ORDER BY created_at DESC;

-- 验证更新结果
SELECT id, title, created_at, sequence_number 
FROM activities 
ORDER BY sequence_number DESC 
LIMIT 10;