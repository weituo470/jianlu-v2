// 认证管理文件

window.Auth = {
    // 当前用户信息
    currentUser: null,
    
    // 初始化认证状态
    init() {
        const token = Utils.storage.get(AppConfig.TOKEN_KEY);
        const user = Utils.storage.get(AppConfig.USER_KEY);
        
        if (token && user) {
            this.currentUser = user;
            return true;
        }
        
        return false;
    },
    
    // 用户登录
    async login(credentials) {
        try {
            const response = await API.auth.login(credentials);
            
            if (response.success) {
                const { token, user, expiresIn } = response.data;
                
                // 保存认证信息
                Utils.storage.set(AppConfig.TOKEN_KEY, token);
                Utils.storage.set(AppConfig.USER_KEY, user);
                
                // 计算过期时间
                const expiresAt = Date.now() + this.parseExpiresIn(expiresIn);
                // 过期时间作为字符串存储，避免JSON解析问题
                localStorage.setItem(AppConfig.TOKEN_EXPIRES_KEY, expiresAt.toString());
                
                this.currentUser = user;
                
                Utils.toast.success('登录成功');
                return { success: true, user };
            } else {
                throw new Error(response.message || '登录失败');
            }
        } catch (error) {
            Utils.toast.error(error.message);
            throw error;
        }
    },
    
    // 用户登出
    async logout() {
        try {
            // 调用登出API（如果有有效token的话）
            const token = Utils.storage.get(AppConfig.TOKEN_KEY);
            if (token) {
                await API.auth.logout();
            }
        } catch (error) {
            console.error('登出API调用失败:', error);
        } finally {
            // 清除认证数据
            this.clearAuthData();
            
            // 跳转到登录页
            Router.navigate('/login');
            Utils.toast.info('已退出登录');
        }
    },
    
    // 检查是否已登录
    isLoggedIn() {
        const token = Utils.storage.get(AppConfig.TOKEN_KEY);
        const expiresAtStr = localStorage.getItem(AppConfig.TOKEN_EXPIRES_KEY);
        
        if (!token || !expiresAtStr) {
            return false;
        }
        
        // 检查是否过期
        const expiresAt = parseInt(expiresAtStr);
        if (isNaN(expiresAt) || Date.now() > expiresAt) {
            // Token过期时直接清除本地存储，不调用logout API避免无限循环
            this.clearAuthData();
            return false;
        }
        
        return true;
    },
    
    // 清除认证数据（内部方法）
    clearAuthData() {
        Utils.storage.remove(AppConfig.TOKEN_KEY);
        Utils.storage.remove(AppConfig.USER_KEY);
        Utils.storage.remove(AppConfig.TOKEN_EXPIRES_KEY);
        this.currentUser = null;
    },

    // 获取认证Token
    getToken() {
        return Utils.storage.get(AppConfig.TOKEN_KEY);
    },

    // 获取当前用户
    getCurrentUser() {
        if (!this.currentUser) {
            this.currentUser = Utils.storage.get(AppConfig.USER_KEY);
        }
        return this.currentUser;
    },
    
    // 获取用户角色
    getUserRole() {
        const user = this.getCurrentUser();
        return user ? user.role : null;
    },
    
    // 获取用户权限
    getUserPermissions() {
        const user = this.getCurrentUser();
        if (!user) return [];
        
        // 优先使用服务器返回的权限
        if (user.permissions && Array.isArray(user.permissions)) {
            return user.permissions;
        }
        
        // 否则根据角色获取权限
        return AppConfig.ROLE_PERMISSIONS_TEMP[user.role] || [];
    },
    
    // 检查权限
    hasPermission(permissions) {
        if (!this.isLoggedIn()) return false;
        
        const userRole = this.getUserRole();
        const userPermissions = this.getUserPermissions();
        
        // 超级管理员拥有所有权限
        if (userRole === 'super_admin') return true;
        
        // 转换为数组
        const requiredPermissions = Array.isArray(permissions) ? permissions : [permissions];
        
        // 检查是否拥有任一权限
        return requiredPermissions.some(permission => userPermissions.includes(permission));
    },
    
    // 检查角色
    hasRole(roles) {
        if (!this.isLoggedIn()) return false;
        
        const userRole = this.getUserRole();
        
        // 超级管理员拥有所有角色权限
        if (userRole === 'super_admin') return true;
        
        // 转换为数组
        const requiredRoles = Array.isArray(roles) ? roles : [roles];
        
        // 检查是否拥有指定角色
        return requiredRoles.includes(userRole);
    },
    
    // 刷新Token
    async refreshToken() {
        try {
            const response = await API.auth.refreshToken();
            
            if (response.success) {
                const { token, expiresIn } = response.data;
                
                // 更新Token
                Utils.storage.set(AppConfig.TOKEN_KEY, token);
                
                // 更新过期时间
                const expiresAt = Date.now() + this.parseExpiresIn(expiresIn);
                Utils.storage.set(AppConfig.TOKEN_EXPIRES_KEY, expiresAt);
                
                return true;
            }
        } catch (error) {
            console.error('Token刷新失败:', error);
            this.logout();
        }
        
        return false;
    },
    
    // 自动刷新Token
    startAutoRefresh() {
        // 每5分钟检查一次Token是否需要刷新
        setInterval(() => {
            const expiresAt = Utils.storage.get(AppConfig.TOKEN_EXPIRES_KEY);
            if (!expiresAt) return;
            
            // 如果Token在30分钟内过期，则刷新
            const refreshThreshold = 30 * 60 * 1000; // 30分钟
            if (Date.now() + refreshThreshold > expiresAt) {
                this.refreshToken();
            }
        }, 5 * 60 * 1000); // 5分钟
    },
    
    // 解析过期时间
    parseExpiresIn(expiresIn) {
        if (typeof expiresIn === 'number') {
            return expiresIn * 1000; // 秒转毫秒
        }
        
        if (typeof expiresIn === 'string') {
            const match = expiresIn.match(/^(\d+)([smhd])$/);
            if (match) {
                const value = parseInt(match[1]);
                const unit = match[2];
                
                switch (unit) {
                    case 's': return value * 1000;
                    case 'm': return value * 60 * 1000;
                    case 'h': return value * 60 * 60 * 1000;
                    case 'd': return value * 24 * 60 * 60 * 1000;
                }
            }
        }
        
        // 默认24小时
        return 24 * 60 * 60 * 1000;
    },
    
    // 权限守卫
    requireAuth() {
        if (!this.isLoggedIn()) {
            // 避免在登录页面时重复重定向
            if (window.location.pathname !== '/login') {
                Router.navigate('/login');
            }
            return false;
        }
        return true;
    },
    
    // 权限守卫 - 需要特定权限
    requirePermission(permissions) {
        if (!this.requireAuth()) return false;
        
        if (!this.hasPermission(permissions)) {
            Utils.toast.error('权限不足，无法访问');
            Router.navigate('/dashboard');
            return false;
        }
        
        return true;
    },
    
    // 权限守卫 - 需要特定角色
    requireRole(roles) {
        if (!this.requireAuth()) return false;
        
        if (!this.hasRole(roles)) {
            Utils.toast.error('权限不足，无法访问');
            Router.navigate('/dashboard');
            return false;
        }
        
        return true;
    },
    
    // 获取角色显示名称
    getRoleName(role) {
        return AppConfig.ROLE_NAMES_TEMP[role] || role;
    },
    
    // 获取用户显示名称
    getUserDisplayName() {
        const user = this.getCurrentUser();
        if (!user) return '';
        
        return user.profile?.nickname || user.username || '';
    },
    
    // 获取用户头像
    getUserAvatar() {
        const user = this.getCurrentUser();
        if (!user) return '';
        
        // 使用工具函数处理头像显示
        return Utils.avatar.getUserAvatar(user, 32);
    }
};

// 超级管理员自我保护模块
window.SelfProtection = {
    // 检查是否为当前用户自己
    isSelf(userId) {
        const currentUser = Auth.getCurrentUser();
        return currentUser && currentUser.id == userId; // 使用 == 来处理字符串和数字的比较
    },
    
    // 检查是否为超级管理员
    isSuperAdmin(user = null) {
        const targetUser = user || Auth.getCurrentUser();
        return targetUser && targetUser.role === 'super_admin';
    },
    
    // 检查是否可以禁用用户
    canDisableUser(userId) {
        // 如果不是操作自己，允许
        if (!this.isSelf(userId)) return true;
        
        // 如果不是超级管理员，允许
        if (!this.isSuperAdmin()) return true;
        
        // 超级管理员不能禁用自己
        return false;
    },
    
    // 检查是否可以删除用户
    canDeleteUser(userId) {
        // 如果不是操作自己，允许
        if (!this.isSelf(userId)) return true;
        
        // 如果不是超级管理员，允许
        if (!this.isSuperAdmin()) return true;
        
        // 超级管理员不能删除自己
        return false;
    },
    
    // 检查是否可以修改角色
    async canChangeRole(userId, newRole) {
        // 如果不是操作自己，允许
        if (!this.isSelf(userId)) return true;
        
        // 如果不是超级管理员，允许
        if (!this.isSuperAdmin()) return true;
        
        // 如果新角色仍然是超级管理员，允许
        if (newRole === 'super_admin') return true;
        
        // 检查系统中超级管理员数量
        return await this.checkSuperAdminCount();
    },
    
    // 检查超级管理员数量（需要从API获取）
    async checkSuperAdminCount() {
        try {
            const response = await API.users.getSuperAdminCount();
            return response.success && response.data.count > 1;
        } catch (error) {
            console.error('检查超级管理员数量失败:', error);
            return false; // 安全起见，默认不允许
        }
    },
    
    // 获取保护错误信息
    getProtectionError(operation, userId) {
        if (!this.isSelf(userId) || !this.isSuperAdmin()) {
            return null;
        }
        
        const errors = {
            disable: {
                code: 'SUPERADMIN_SELF_DISABLE',
                message: '超级管理员不能禁用自己的账户',
                suggestion: '如需禁用此账户，请联系其他超级管理员操作'
            },
            delete: {
                code: 'SUPERADMIN_SELF_DELETE',
                message: '超级管理员不能删除自己的账户',
                suggestion: '如需删除此账户，请联系其他超级管理员操作'
            },
            changeRole: {
                code: 'LAST_SUPERADMIN_PROTECTION',
                message: '系统必须保留至少一个超级管理员',
                suggestion: '请先创建其他超级管理员账户，然后再进行此操作'
            }
        };
        
        return errors[operation] || null;
    },
    
    // 显示保护警告
    showProtectionWarning(operation, userId) {
        const error = this.getProtectionError(operation, userId);
        if (!error) return false;
        
        Utils.toast.warning(error.message);
        
        // 如果在模态框中，也显示内联提示
        const modal = document.querySelector('.modal.show');
        if (modal) {
            this.showInlineWarning(modal, error);
        }
        
        return true;
    },
    
    // 在模态框中显示内联警告
    showInlineWarning(modal, error) {
        const existingAlert = modal.querySelector('.protection-alert');
        if (existingAlert) {
            existingAlert.remove();
        }
        
        const alertHtml = `
            <div class="alert alert-warning protection-alert" role="alert" style="margin-bottom: 15px;">
                <div style="display: flex; align-items: center; margin-bottom: 8px;">
                    <i class="fas fa-shield-alt" style="margin-right: 8px; color: #856404;"></i>
                    <strong>安全保护</strong>
                </div>
                <div>
                    <p style="margin: 0 0 5px 0; color: #856404;">${error.message}</p>
                    <small style="color: #6c757d;">${error.suggestion}</small>
                </div>
            </div>
        `;
        
        const modalBody = modal.querySelector('.modal-body');
        if (modalBody) {
            modalBody.insertAdjacentHTML('afterbegin', alertHtml);
        }
    },
    
    // 过滤批量操作中的受保护用户
    filterProtectedUsers(userIds, operation) {
        const currentUser = Auth.getCurrentUser();
        if (!currentUser || currentUser.role !== 'super_admin') {
            return userIds; // 非超级管理员，不需要过滤
        }
        
        const filteredIds = userIds.filter(id => id != currentUser.id);
        
        if (filteredIds.length < userIds.length) {
            const operationNames = {
                disable: '禁用',
                delete: '删除',
                changeRole: '修改角色'
            };
            
            const operationName = operationNames[operation] || operation;
            Utils.toast.warning(`已自动排除您自己，将${operationName}其他选中的用户`);
        }
        
        return filteredIds;
    }
};