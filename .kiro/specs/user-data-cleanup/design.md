# 用户数据清理设计文档

## 1. 系统架构

### 1.1 整体架构
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   前端管理界面   │    │   数据诊断API   │    │   数据清理API   │
│                │    │                │    │                │
│ - 数据状态显示   │◄──►│ - 状态统计      │◄──►│ - 安全清理      │
│ - 清理操作界面   │    │ - 脏数据识别    │    │ - 备份恢复      │
│ - 错误信息优化   │    │ - 冲突检查      │    │ - 审计日志      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │                        │
                                └────────┬───────────────┘
                                         │
                              ┌─────────────────┐
                              │   MySQL数据库   │
                              │                │
                              │ - users表       │
                              │ - 备份表        │
                              │ - 审计日志表    │
                              └─────────────────┘
```

### 1.2 数据流设计
1. **诊断阶段**: 前端 → 诊断API → 数据库查询 → 状态分析 → 结果返回
2. **清理阶段**: 前端确认 → 清理API → 数据备份 → 执行清理 → 记录日志
3. **恢复阶段**: 管理员操作 → 恢复API → 备份数据 → 数据还原

## 2. 数据库设计

### 2.1 现有表结构分析
```sql
-- 当前users表结构
CREATE TABLE users (
  id VARCHAR(36) PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('super_admin', 'admin', 'user') NOT NULL DEFAULT 'user',
  status ENUM('active', 'inactive', 'deleted') DEFAULT 'active',
  -- ... 其他字段
);
```

### 2.2 问题分析
- `username` 和 `email` 有唯一约束，包括 `deleted` 状态的记录
- 前端查询可能只显示 `status != 'deleted'` 的记录
- 创建用户时检查唯一性包括所有状态的记录

### 2.3 新增表结构

#### 2.3.1 数据清理备份表
```sql
CREATE TABLE user_cleanup_backups (
  id VARCHAR(36) PRIMARY KEY,
  cleanup_id VARCHAR(36) NOT NULL,
  original_user_data JSON NOT NULL,
  cleanup_reason VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by VARCHAR(36),
  INDEX idx_cleanup_id (cleanup_id),
  INDEX idx_created_at (created_at)
);
```

#### 2.3.2 数据清理日志表
```sql
CREATE TABLE user_cleanup_logs (
  id VARCHAR(36) PRIMARY KEY,
  cleanup_id VARCHAR(36) NOT NULL,
  operation_type ENUM('diagnose', 'backup', 'cleanup', 'restore') NOT NULL,
  affected_users INT DEFAULT 0,
  operation_details JSON,
  status ENUM('started', 'completed', 'failed') NOT NULL,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by VARCHAR(36),
  INDEX idx_cleanup_id (cleanup_id),
  INDEX idx_operation_type (operation_type),
  INDEX idx_status (status)
);
```

## 3. API设计

### 3.1 数据诊断API

#### 3.1.1 用户状态统计
```javascript
GET /api/admin/users/diagnosis/stats
Response: {
  success: true,
  data: {
    total: 150,
    active: 120,
    inactive: 20,
    deleted: 10,
    duplicates: [
      {
        username: "admin1",
        records: [
          { id: "uuid1", status: "deleted", created_at: "2024-01-01" },
          { id: "uuid2", status: "active", created_at: "2024-01-02" }
        ]
      }
    ]
  }
}
```

#### 3.1.2 脏数据检查
```javascript
GET /api/admin/users/diagnosis/dirty-data
Response: {
  success: true,
  data: {
    deletedButOccupying: [
      {
        id: "uuid1",
        username: "admin1",
        email: "admin1@example.com",
        status: "deleted",
        deleted_at: "2024-01-01"
      }
    ],
    duplicateEmails: [],
    orphanedRecords: []
  }
}
```

#### 3.1.3 特定用户检查
```javascript
GET /api/admin/users/diagnosis/check/:username
Response: {
  success: true,
  data: {
    username: "admin1",
    exists: true,
    records: [
      {
        id: "uuid1",
        status: "deleted",
        email: "admin1@example.com",
        created_at: "2024-01-01",
        updated_at: "2024-01-02"
      }
    ],
    canReuse: true,
    suggestions: ["可以安全清理已删除的记录"]
  }
}
```

### 3.2 数据清理API

#### 3.2.1 安全清理已删除用户
```javascript
POST /api/admin/users/cleanup/deleted
Request: {
  userIds: ["uuid1", "uuid2"],
  reason: "清理脏数据，释放用户名",
  createBackup: true
}
Response: {
  success: true,
  data: {
    cleanupId: "cleanup-uuid",
    backupId: "backup-uuid",
    cleanedCount: 2,
    releasedUsernames: ["admin1", "test1"]
  }
}
```

#### 3.2.2 批量清理操作
```javascript
POST /api/admin/users/cleanup/batch
Request: {
  operation: "cleanup_deleted",
  filters: {
    status: "deleted",
    olderThan: "2024-01-01"
  },
  options: {
    createBackup: true,
    dryRun: false
  }
}
```

### 3.3 数据恢复API

#### 3.3.1 恢复清理的数据
```javascript
POST /api/admin/users/cleanup/restore/:cleanupId
Response: {
  success: true,
  data: {
    restoredCount: 2,
    restoredUsers: ["admin1", "test1"]
  }
}
```

## 4. 前端设计

### 4.1 数据管理工具页面

#### 4.1.1 页面结构
```
数据管理工具
├── 数据状态概览
│   ├── 用户统计卡片
│   ├── 状态分布图表
│   └── 问题数据提醒
├── 脏数据诊断
│   ├── 自动检查按钮
│   ├── 问题数据列表
│   └── 详细信息展示
├── 数据清理操作
│   ├── 清理选项配置
│   ├── 安全确认对话框
│   └── 清理进度显示
└── 操作历史记录
    ├── 清理日志列表
    ├── 恢复操作按钮
    └── 详细日志查看
```

#### 4.1.2 用户列表优化
```javascript
// 修改用户列表查询逻辑
const getUserList = async (params) => {
  const {
    page = 1,
    limit = 20,
    search = '',
    status = 'active,inactive', // 默认不显示deleted
    includeDeleted = false
  } = params;
  
  const queryParams = {
    page,
    limit,
    search,
    status: includeDeleted ? 'active,inactive,deleted' : status
  };
  
  return API.get('/users', { params: queryParams });
};
```

### 4.2 错误信息优化

#### 4.2.1 创建用户错误处理
```javascript
const handleCreateUserError = (error) => {
  if (error.code === 'DUPLICATE_USERNAME') {
    return {
      type: 'warning',
      title: '用户名已存在',
      message: `用户名 "${error.details.username}" 已被使用`,
      details: error.details.existingUser,
      actions: [
        {
          text: '查看现有用户',
          action: () => showUserDetails(error.details.existingUser.id)
        },
        {
          text: '清理脏数据',
          action: () => openCleanupDialog(error.details.username),
          condition: error.details.existingUser.status === 'deleted'
        }
      ]
    };
  }
};
```

## 5. 核心算法

### 5.1 脏数据识别算法
```javascript
const identifyDirtyData = async () => {
  // 1. 查找已删除但占用用户名的记录
  const deletedUsers = await User.findAll({
    where: { status: 'deleted' },
    attributes: ['id', 'username', 'email', 'created_at', 'updated_at']
  });
  
  // 2. 检查是否有同名的活跃用户
  const dirtyData = [];
  for (const deletedUser of deletedUsers) {
    const activeUser = await User.findOne({
      where: {
        username: deletedUser.username,
        status: { [Op.ne]: 'deleted' }
      }
    });
    
    if (!activeUser) {
      // 已删除用户占用用户名，但没有活跃用户
      dirtyData.push({
        type: 'deleted_occupying',
        user: deletedUser,
        canCleanup: true,
        reason: '已删除用户占用用户名'
      });
    }
  }
  
  return dirtyData;
};
```

### 5.2 安全清理算法
```javascript
const safeCleanup = async (userIds, options = {}) => {
  const cleanupId = uuidv4();
  const transaction = await sequelize.transaction();
  
  try {
    // 1. 创建备份
    if (options.createBackup) {
      const usersToBackup = await User.findAll({
        where: { id: { [Op.in]: userIds } },
        transaction
      });
      
      for (const user of usersToBackup) {
        await UserCleanupBackup.create({
          id: uuidv4(),
          cleanup_id: cleanupId,
          original_user_data: user.toJSON(),
          cleanup_reason: options.reason,
          created_by: options.operatorId
        }, { transaction });
      }
    }
    
    // 2. 执行清理
    const deletedCount = await User.destroy({
      where: { id: { [Op.in]: userIds } },
      transaction
    });
    
    // 3. 记录日志
    await UserCleanupLog.create({
      id: uuidv4(),
      cleanup_id: cleanupId,
      operation_type: 'cleanup',
      affected_users: deletedCount,
      operation_details: { userIds, options },
      status: 'completed',
      created_by: options.operatorId
    }, { transaction });
    
    await transaction.commit();
    return { cleanupId, deletedCount };
    
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
};
```

## 6. 安全措施

### 6.1 权限控制
- 只有超级管理员可以执行数据清理操作
- 所有操作需要二次确认
- 敏感操作需要输入管理员密码

### 6.2 数据保护
- 清理前强制创建备份
- 提供数据恢复功能
- 限制批量操作的数量

### 6.3 审计追踪
- 记录所有清理操作的详细日志
- 包含操作者、时间、影响范围等信息
- 支持操作历史查询和分析

## 7. 测试策略

### 7.1 单元测试
- 脏数据识别算法测试
- 安全清理算法测试
- API接口功能测试

### 7.2 集成测试
- 完整的清理流程测试
- 数据备份和恢复测试
- 前端界面交互测试

### 7.3 安全测试
- 权限控制测试
- 数据完整性测试
- 异常情况处理测试

---

**设计版本**: v1.0  
**设计状态**: 待开发  
**预计开发时间**: 3-5天