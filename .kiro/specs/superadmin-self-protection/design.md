# 超级管理员自我保护功能设计文档

## 1. 设计概述

### 1.1 架构原则
- **多层防护**：前端UI限制 + 后端API验证 + 数据库约束
- **用户友好**：清晰的提示信息和视觉反馈
- **安全优先**：所有保护逻辑以安全为第一考虑

### 1.2 核心组件
- 前端权限检查模块
- 后端权限验证中间件
- 用户操作保护服务
- 警告提示组件

## 2. 前端设计

### 2.1 权限检查工具函数

```javascript
// 在 auth.js 中添加
const SelfProtection = {
    // 检查是否为当前用户自己
    isSelf(userId) {
        const currentUser = Auth.getCurrentUser();
        return currentUser && currentUser.id === userId;
    },
    
    // 检查是否为超级管理员
    isSuperAdmin(user = null) {
        const targetUser = user || Auth.getCurrentUser();
        return targetUser && targetUser.role === 'super_admin';
    },
    
    // 检查是否可以禁用用户
    canDisableUser(userId) {
        if (!this.isSelf(userId)) return true;
        if (!this.isSuperAdmin()) return true;
        return false; // 超级管理员不能禁用自己
    },
    
    // 检查是否可以删除用户
    canDeleteUser(userId) {
        if (!this.isSelf(userId)) return true;
        if (!this.isSuperAdmin()) return true;
        return false; // 超级管理员不能删除自己
    },
    
    // 检查是否可以修改角色
    canChangeRole(userId, newRole) {
        if (!this.isSelf(userId)) return true;
        if (!this.isSuperAdmin()) return true;
        if (newRole === 'super_admin') return true;
        
        // 需要检查系统中超级管理员数量
        return this.checkSuperAdminCount();
    },
    
    // 检查超级管理员数量（需要从API获取）
    async checkSuperAdminCount() {
        try {
            const response = await API.users.getSuperAdminCount();
            return response.data.count > 1;
        } catch (error) {
            console.error('检查超级管理员数量失败:', error);
            return false; // 安全起见，默认不允许
        }
    }
};
```

### 2.2 UI组件修改

#### 2.2.1 用户编辑表单
```javascript
// 在 UserManager.editUser 方法中
async editUser(id) {
    try {
        const response = await API.users.getDetail(id);
        const user = response.data;
        const isSelf = SelfProtection.isSelf(id);
        const isSuperAdmin = SelfProtection.isSuperAdmin(user);
        
        // 状态选择框的禁用逻辑
        const statusDisabled = isSelf && isSuperAdmin;
        const statusOptions = `
            <option value="active" ${user.status === 'active' ? 'selected' : ''}>正常</option>
            ${!statusDisabled ? `<option value="inactive" ${user.status === 'inactive' ? 'selected' : ''}>禁用</option>` : ''}
        `;
        
        // 角色选择框的禁用逻辑
        const roleOptions = await this.generateRoleOptions(user, isSelf);
        
        const modalContent = `
            <form id="edit-user-form">
                <input type="hidden" name="id" value="${user.id}">
                
                <div class="form-group">
                    <label for="edit-status">状态 *</label>
                    <select id="edit-status" name="status" required ${statusDisabled ? 'disabled' : ''}>
                        ${statusOptions}
                    </select>
                    ${statusDisabled ? '<small class="form-text text-warning">超级管理员不能禁用自己的账户</small>' : ''}
                </div>
                
                <div class="form-group">
                    <label for="edit-role">角色 *</label>
                    <select id="edit-role" name="role" required>
                        ${roleOptions}
                    </select>
                </div>
            </form>
        `;
        
        // ... 其余代码
    } catch (error) {
        Utils.toast.error(`获取用户信息失败: ${error.message}`);
    }
}

// 生成角色选项
async generateRoleOptions(user, isSelf) {
    const currentUserRole = Auth.getUserRole();
    const isSuperAdmin = user.role === 'super_admin';
    
    let options = '';
    
    // 超级管理员选项
    if (currentUserRole === 'super_admin') {
        const canChangeSuperAdmin = !isSelf || await SelfProtection.checkSuperAdminCount();
        options += `<option value="super_admin" ${user.role === 'super_admin' ? 'selected' : ''}>超级管理员</option>`;
    }
    
    // 普通管理员选项
    if (!isSelf || !isSuperAdmin || await SelfProtection.checkSuperAdminCount()) {
        options += `<option value="admin" ${user.role === 'admin' ? 'selected' : ''}>管理员</option>`;
    }
    
    // 普通用户选项
    if (!isSelf || !isSuperAdmin || await SelfProtection.checkSuperAdminCount()) {
        options += `<option value="user" ${user.role === 'user' ? 'selected' : ''}>普通用户</option>`;
    }
    
    return options;
}
```

#### 2.2.2 用户列表操作按钮
```javascript
// 在用户列表渲染中
function renderUserActions(user) {
    const currentUser = Auth.getCurrentUser();
    const isSelf = currentUser.id === user.id;
    const isSuperAdmin = user.role === 'super_admin';
    
    // 禁用/启用按钮
    const canToggleStatus = SelfProtection.canDisableUser(user.id);
    const statusButton = canToggleStatus ? `
        <button class="btn btn-sm ${user.status === 'active' ? 'btn-warning' : 'btn-success'}" 
                onclick="UserManager.toggleUserStatus('${user.id}', '${user.status === 'active' ? 'inactive' : 'active'}')">
            <i class="fas fa-${user.status === 'active' ? 'ban' : 'check'}"></i>
            ${user.status === 'active' ? '禁用' : '启用'}
        </button>
    ` : `
        <button class="btn btn-sm btn-secondary" disabled title="超级管理员不能禁用自己">
            <i class="fas fa-ban"></i>
            禁用
        </button>
    `;
    
    // 删除按钮
    const canDelete = SelfProtection.canDeleteUser(user.id);
    const deleteButton = canDelete ? `
        <button class="btn btn-sm btn-danger" onclick="UserManager.deleteUser('${user.id}')">
            <i class="fas fa-trash"></i>
            删除
        </button>
    ` : `
        <button class="btn btn-sm btn-secondary" disabled title="超级管理员不能删除自己">
            <i class="fas fa-trash"></i>
            删除
        </button>
    `;
    
    return `
        <div class="btn-group">
            <button class="btn btn-sm btn-primary" onclick="UserManager.editUser('${user.id}')">
                <i class="fas fa-edit"></i>
                编辑
            </button>
            ${statusButton}
            ${deleteButton}
        </div>
    `;
}
```

### 2.3 批量操作保护
```javascript
// 修改批量操作方法
async batchDelete() {
    if (this.selectedUsers.size === 0) {
        Utils.toast.warning('请选择要删除的用户');
        return;
    }
    
    const currentUser = Auth.getCurrentUser();
    const userIds = Array.from(this.selectedUsers);
    
    // 检查是否包含当前用户
    const includesSelf = userIds.includes(currentUser.id);
    const isSuperAdmin = currentUser.role === 'super_admin';
    
    if (includesSelf && isSuperAdmin) {
        // 自动排除自己
        const filteredIds = userIds.filter(id => id !== currentUser.id);
        
        if (filteredIds.length === 0) {
            Utils.toast.warning('超级管理员不能删除自己');
            return;
        }
        
        Utils.toast.warning('已自动排除您自己，将删除其他选中的用户');
        
        if (!confirm(`确定要删除选中的 ${filteredIds.length} 个用户吗？（已排除您自己）`)) {
            return;
        }
        
        // 使用过滤后的ID列表
        this.performBatchDelete(filteredIds);
    } else {
        if (!confirm(`确定要删除选中的 ${userIds.length} 个用户吗？此操作不可恢复！`)) {
            return;
        }
        
        this.performBatchDelete(userIds);
    }
}
```

## 3. 后端设计

### 3.1 权限验证中间件
```javascript
// 在 middleware/auth.js 中添加
const selfProtectionMiddleware = {
    // 检查超级管理员自我保护
    checkSuperAdminSelfProtection: async (req, res, next) => {
        try {
            const currentUser = req.user;
            const targetUserId = req.params.id || req.body.id;
            
            // 如果不是操作自己，直接通过
            if (currentUser.id !== parseInt(targetUserId)) {
                return next();
            }
            
            // 如果不是超级管理员，直接通过
            if (currentUser.role !== 'super_admin') {
                return next();
            }
            
            // 检查具体操作类型
            const operation = req.body.operation || req.method;
            
            switch (operation) {
                case 'disable':
                case 'DELETE':
                    return res.status(403).json({
                        success: false,
                        message: '超级管理员不能禁用或删除自己的账户',
                        code: 'SUPERADMIN_SELF_PROTECTION'
                    });
                    
                case 'changeRole':
                    if (req.body.role !== 'super_admin') {
                        const superAdminCount = await User.count({
                            where: { role: 'super_admin', status: 'active' }
                        });
                        
                        if (superAdminCount <= 1) {
                            return res.status(403).json({
                                success: false,
                                message: '系统必须保留至少一个超级管理员',
                                code: 'LAST_SUPERADMIN_PROTECTION'
                            });
                        }
                    }
                    break;
            }
            
            next();
        } catch (error) {
            console.error('超级管理员自我保护检查失败:', error);
            res.status(500).json({
                success: false,
                message: '权限检查失败',
                code: 'PERMISSION_CHECK_ERROR'
            });
        }
    }
};
```

### 3.2 API路由保护
```javascript
// 在 routes/users.js 中修改
const express = require('express');
const router = express.Router();
const { authMiddleware, selfProtectionMiddleware } = require('../middleware/auth');

// 更新用户状态
router.put('/:id/status', 
    authMiddleware.requireRole(['super_admin', 'admin']),
    selfProtectionMiddleware.checkSuperAdminSelfProtection,
    async (req, res) => {
        // 原有的状态更新逻辑
    }
);

// 删除用户
router.delete('/:id',
    authMiddleware.requireRole(['super_admin', 'admin']),
    selfProtectionMiddleware.checkSuperAdminSelfProtection,
    async (req, res) => {
        // 原有的删除逻辑
    }
);

// 更新用户角色
router.put('/:id/role',
    authMiddleware.requireRole(['super_admin']),
    selfProtectionMiddleware.checkSuperAdminSelfProtection,
    async (req, res) => {
        // 原有的角色更新逻辑
    }
);

// 获取超级管理员数量
router.get('/superadmin-count',
    authMiddleware.requireRole(['super_admin']),
    async (req, res) => {
        try {
            const count = await User.count({
                where: { 
                    role: 'super_admin', 
                    status: 'active' 
                }
            });
            
            res.json({
                success: true,
                data: { count }
            });
        } catch (error) {
            console.error('获取超级管理员数量失败:', error);
            res.status(500).json({
                success: false,
                message: '获取超级管理员数量失败'
            });
        }
    }
);
```

## 4. 数据库约束

### 4.1 触发器保护
```sql
-- 创建超级管理员保护触发器
DELIMITER $$

CREATE TRIGGER prevent_last_superadmin_disable
BEFORE UPDATE ON users
FOR EACH ROW
BEGIN
    DECLARE superadmin_count INT;
    
    -- 如果是超级管理员被禁用
    IF OLD.role = 'super_admin' AND OLD.status = 'active' AND NEW.status = 'inactive' THEN
        SELECT COUNT(*) INTO superadmin_count 
        FROM users 
        WHERE role = 'super_admin' AND status = 'active' AND id != NEW.id;
        
        IF superadmin_count = 0 THEN
            SIGNAL SQLSTATE '45000' 
            SET MESSAGE_TEXT = '不能禁用最后一个超级管理员';
        END IF;
    END IF;
    
    -- 如果是超级管理员角色被降级
    IF OLD.role = 'super_admin' AND NEW.role != 'super_admin' THEN
        SELECT COUNT(*) INTO superadmin_count 
        FROM users 
        WHERE role = 'super_admin' AND status = 'active' AND id != NEW.id;
        
        IF superadmin_count = 0 THEN
            SIGNAL SQLSTATE '45000' 
            SET MESSAGE_TEXT = '不能降级最后一个超级管理员';
        END IF;
    END IF;
END$$

CREATE TRIGGER prevent_last_superadmin_delete
BEFORE DELETE ON users
FOR EACH ROW
BEGIN
    DECLARE superadmin_count INT;
    
    -- 如果删除的是超级管理员
    IF OLD.role = 'super_admin' AND OLD.status = 'active' THEN
        SELECT COUNT(*) INTO superadmin_count 
        FROM users 
        WHERE role = 'super_admin' AND status = 'active' AND id != OLD.id;
        
        IF superadmin_count = 0 THEN
            SIGNAL SQLSTATE '45000' 
            SET MESSAGE_TEXT = '不能删除最后一个超级管理员';
        END IF;
    END IF;
END$$

DELIMITER ;
```

## 5. 错误处理和用户提示

### 5.1 错误代码定义
```javascript
const PROTECTION_ERRORS = {
    SUPERADMIN_SELF_DISABLE: {
        code: 'SUPERADMIN_SELF_DISABLE',
        message: '超级管理员不能禁用自己的账户',
        suggestion: '如需禁用此账户，请联系其他超级管理员操作'
    },
    SUPERADMIN_SELF_DELETE: {
        code: 'SUPERADMIN_SELF_DELETE',
        message: '超级管理员不能删除自己的账户',
        suggestion: '如需删除此账户，请联系其他超级管理员操作'
    },
    LAST_SUPERADMIN_PROTECTION: {
        code: 'LAST_SUPERADMIN_PROTECTION',
        message: '系统必须保留至少一个超级管理员',
        suggestion: '请先创建其他超级管理员账户，然后再进行此操作'
    }
};
```

### 5.2 友好提示组件
```javascript
// 创建保护提示组件
const ProtectionAlert = {
    show(errorCode, customMessage = null) {
        const error = PROTECTION_ERRORS[errorCode];
        if (!error) return;
        
        const message = customMessage || error.message;
        const suggestion = error.suggestion;
        
        const alertHtml = `
            <div class="alert alert-warning protection-alert" role="alert">
                <div class="alert-header">
                    <i class="fas fa-shield-alt"></i>
                    <strong>安全保护</strong>
                </div>
                <div class="alert-body">
                    <p class="alert-message">${message}</p>
                    <p class="alert-suggestion"><small>${suggestion}</small></p>
                </div>
            </div>
        `;
        
        // 显示提示
        Utils.toast.warning(message);
        
        // 如果在模态框中，也显示内联提示
        const modal = document.querySelector('.modal.show');
        if (modal) {
            const existingAlert = modal.querySelector('.protection-alert');
            if (existingAlert) {
                existingAlert.remove();
            }
            
            const modalBody = modal.querySelector('.modal-body');
            if (modalBody) {
                modalBody.insertAdjacentHTML('afterbegin', alertHtml);
            }
        }
    }
};
```

## 6. 测试策略

### 6.1 单元测试
- 权限检查函数测试
- 中间件保护逻辑测试
- 数据库约束测试

### 6.2 集成测试
- 前后端协同保护测试
- API端点保护测试
- 用户界面交互测试

### 6.3 安全测试
- 绕过保护机制的尝试
- 恶意请求防护测试
- 边界条件测试

---

**文档版本**：v1.0  
**创建日期**：2025年8月4日  
**状态**：待评审