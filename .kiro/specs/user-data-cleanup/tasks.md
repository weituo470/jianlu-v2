# 用户数据清理任务清单

## 📋 问题解决方案

### 问题描述
- 创建用户时提示"用户名已存在"，但在管理后台用户列表中看不到该用户
- 用户表中存在状态为 `deleted` 的脏数据占用用户名

### 解决方案
提供多种工具来诊断和清理用户数据中的脏数据

## 🛠️ 可用工具

### 1. 命令行诊断工具
**文件**: `backend/diagnose-user-data.js`

**使用方法**:
```bash
# 完整诊断
cd backend
node diagnose-user-data.js check

# 检查特定用户名
node diagnose-user-data.js check admin1

# 清理脏数据（预演模式）
node diagnose-user-data.js cleanup --dry-run

# 执行清理
node diagnose-user-data.js cleanup
```

**功能特性**:
- ✅ 用户状态统计
- ✅ 重复用户名检查
- ✅ 脏数据识别
- ✅ 安全清理操作
- ✅ 自动备份

### 2. Web界面诊断工具
**文件**: `test-user-data-cleanup.html`

**使用方法**:
1. 在浏览器中打开 `test-user-data-cleanup.html`
2. 自动登录管理员账号
3. 使用各种诊断和清理功能

**功能特性**:
- 📊 数据统计概览
- 🔍 特定用户名检查
- 🧹 脏数据诊断
- 👥 显示所有用户（包括已删除）
- 🗑️ 安全数据清理
- 🧪 测试用户创建

### 3. 快速清理脚本
**文件**: `backend/quick-cleanup-admin1.js`

**使用方法**:
```bash
cd backend
node quick-cleanup-admin1.js
```

**功能特性**:
- 🎯 专门清理admin1用户的脏数据
- 💾 自动创建备份
- ⚡ 快速执行

## 📝 执行步骤

### 步骤1：诊断问题
```bash
# 使用命令行工具诊断
cd backend
node diagnose-user-data.js check admin1
```

或者打开 `test-user-data-cleanup.html` 在Web界面中检查。

### 步骤2：清理脏数据
如果发现脏数据，可以选择以下方式之一：

**方式1：使用命令行工具**
```bash
# 预览清理操作
node diagnose-user-data.js cleanup --dry-run

# 执行清理
node diagnose-user-data.js cleanup
```

**方式2：使用Web界面**
1. 打开 `test-user-data-cleanup.html`
2. 点击"诊断脏数据"
3. 点击"预览清理操作"
4. 点击"执行清理"

**方式3：快速清理admin1**
```bash
node quick-cleanup-admin1.js
```

### 步骤3：验证结果
清理完成后，测试创建用户：

**命令行验证**:
```bash
node diagnose-user-data.js check admin1
```

**Web界面验证**:
在 `test-user-data-cleanup.html` 中使用"测试用户创建"功能。

## ⚠️ 安全注意事项

### 数据备份
- 所有清理操作都会自动创建备份
- 备份文件保存在当前目录
- 格式：`*_cleanup_backup_*.json`

### 权限要求
- 需要管理员权限执行清理操作
- Web工具需要先登录管理员账号

### 操作确认
- 清理操作不可逆
- 执行前会要求确认
- 建议先使用预演模式

## 🔧 技术实现

### 脏数据识别逻辑
```javascript
// 查找已删除但占用用户名的记录
const deletedUsers = await User.findAll({
    where: { status: 'deleted' }
});

// 检查是否有同名的活跃用户
for (const deletedUser of deletedUsers) {
    const activeUser = await User.findOne({
        where: {
            username: deletedUser.username,
            status: { [Op.ne]: 'deleted' }
        }
    });
    
    if (!activeUser) {
        // 这是脏数据，可以安全清理
        dirtyData.push(deletedUser);
    }
}
```

### 安全清理流程
1. **备份数据** - 创建JSON备份文件
2. **事务处理** - 使用数据库事务确保一致性
3. **批量删除** - 物理删除已标识的脏数据
4. **结果验证** - 确认清理结果

## 📊 预期效果

### 清理前
- 创建admin1用户失败，提示"用户名已存在"
- 用户列表中看不到admin1用户
- 数据库中存在status='deleted'的admin1记录

### 清理后
- admin1用户名可以正常创建
- 数据库中不再有占用用户名的脏数据
- 用户列表显示正常

## 🧪 测试验证

### 测试用例1：诊断功能
- [ ] 能够正确统计各状态用户数量
- [ ] 能够识别重复用户名
- [ ] 能够发现脏数据

### 测试用例2：清理功能
- [ ] 能够安全清理脏数据
- [ ] 清理后用户名可以重新使用
- [ ] 备份文件正确创建

### 测试用例3：Web界面
- [ ] 界面功能正常
- [ ] 数据显示准确
- [ ] 操作流程顺畅

## 📞 故障排除

### 常见问题

**Q1: 清理后仍然无法创建用户？**
A: 检查是否还有其他状态的同名用户，或者重启后端服务。

**Q2: 备份文件在哪里？**
A: 备份文件保存在执行脚本的当前目录，文件名包含时间戳。

**Q3: 如何恢复误删的数据？**
A: 使用备份文件中的数据，手动重新插入数据库。

### 紧急恢复
如果误删了重要数据，可以使用备份文件恢复：
```javascript
// 从备份文件恢复数据的示例代码
const backupData = JSON.parse(fs.readFileSync('backup_file.json'));
for (const userData of backupData) {
    await User.create(userData);
}
```

---

**任务状态**: ✅ 工具已创建，待测试使用  
**优先级**: 高  
**预计解决时间**: 立即可用