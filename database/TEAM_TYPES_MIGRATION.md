# 团队类型数据迁移指南

## 📋 概述

本迁移将团队类型数据从硬编码实现迁移到数据库表中，实现真正的数据持久化。

## 🎯 迁移内容

### 1. 数据库表结构
- **表名**: `team_types`
- **主要字段**:
  - `id`: 团队类型ID（主键）
  - `name`: 团队类型名称
  - `description`: 描述
  - `is_default`: 是否为系统默认类型
  - `sort_order`: 排序顺序
  - `is_active`: 是否启用

### 2. 默认数据
迁移将创建以下8个默认团队类型：
- 通用团队 (general)
- 开发团队 (development)
- 测试团队 (testing)
- 设计团队 (design)
- 市场团队 (marketing)
- 运营团队 (operation)
- 研发团队 (research)
- 支持团队 (support)

## 🚀 执行迁移

### 方法1：使用批处理脚本（推荐）
```bash
cd database
run-team-types-migration.bat
```

### 方法2：直接执行SQL
```bash
mysql -u your_username -p your_database < create-team-types-table.sql
```

### 方法3：使用Node.js脚本
```bash
cd database
node migrate-team-types.js
```

## ✅ 验证迁移

### 1. 检查数据库表
```sql
-- 查看表结构
DESCRIBE team_types;

-- 查看数据
SELECT * FROM team_types ORDER BY sort_order;
```

### 2. 测试API接口
```bash
# 获取团队类型列表
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:3458/api/teams/types

# 创建新团队类型
curl -X POST -H "Content-Type: application/json" -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"id":"custom","name":"自定义团队","description":"测试用自定义团队类型"}' \
  http://localhost:3458/api/teams/types
```

### 3. 测试前端功能
1. 访问团队类型管理页面
2. 验证列表显示正常
3. 测试新增功能
4. 测试删除功能
5. 重启服务后验证数据持久化

## 🔧 迁移后的变化

### ✅ 新增功能
- **真正的数据持久化**: 新增/删除操作会保存到数据库
- **数据验证**: 更严格的数据验证和约束
- **关联查询**: 支持与团队表的关联查询
- **扩展性**: 可以轻松添加新字段和功能

### 🔄 API变化
- **获取列表**: 从数据库读取，支持排序
- **新增类型**: 真正保存到数据库，支持重复检查
- **删除类型**: 真正从数据库删除，支持使用检查
- **错误处理**: 更详细的错误信息和状态码

### 📊 数据模型
```javascript
// 新的数据模型
const TeamType = {
  id: 'string',           // 类型ID
  name: 'string',         // 类型名称
  description: 'text',    // 描述
  is_default: 'boolean',  // 是否默认类型
  sort_order: 'integer',  // 排序
  is_active: 'boolean',   // 是否启用
  created_at: 'datetime', // 创建时间
  updated_at: 'datetime'  // 更新时间
}
```

## 🚨 注意事项

### 1. 备份数据
迁移前建议备份现有数据库

### 2. 服务重启
迁移完成后需要重启后端服务以加载新的模型

### 3. 权限检查
确保执行迁移的用户有数据库创建表的权限

### 4. 依赖关系
如果有现有团队数据，确保team_type字段的值在新表中存在

## 🔍 故障排除

### 常见问题

#### 1. 数据库连接失败
```
Error: connect ECONNREFUSED 127.0.0.1:3306
```
**解决方案**: 检查数据库服务是否启动，连接配置是否正确

#### 2. 权限不足
```
Error: Access denied for user
```
**解决方案**: 确保数据库用户有CREATE、INSERT权限

#### 3. 表已存在
```
Error: Table 'team_types' already exists
```
**解决方案**: 这是正常情况，脚本会跳过表创建，只插入数据

#### 4. 模型加载失败
```
Error: Cannot find module '../backend/src/models'
```
**解决方案**: 确保在正确的目录下执行脚本

## 📈 后续优化

### 1. 短期优化
- [ ] 添加团队类型使用统计
- [ ] 支持批量操作
- [ ] 添加软删除功能

### 2. 长期规划
- [ ] 团队类型权限管理
- [ ] 自定义字段支持
- [ ] 团队类型模板功能

## 📞 支持

如果在迁移过程中遇到问题，请：
1. 检查错误日志
2. 验证数据库连接
3. 确认权限设置
4. 查看本文档的故障排除部分

---

**迁移完成后，团队类型管理功能将具备完整的数据持久化能力！**