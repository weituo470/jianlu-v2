// 主应用文件

window.App = {
    // 应用初始化
    async init() {
        console.log('简庐管理后台初始化...');

        // 显示加载屏幕
        this.showLoading();

        try {
            // 初始化认证状态
            Auth.init();

            // 初始化路由
            Router.init();

            // 初始化UI事件
            this.initUIEvents();

            // 如果已登录，初始化主应用界面
            if (Auth.isLoggedIn()) {
                await this.initMainApp();
            }

            // 启动自动Token刷新
            Auth.startAutoRefresh();

            console.log('应用初始化完成');

        } catch (error) {
            console.error('应用初始化失败:', error);
            Utils.toast.error('应用初始化失败，请刷新页面重试');
        } finally {
            // 隐藏加载屏幕
            this.hideLoading();
        }
    },

    // 显示加载屏幕
    showLoading() {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.style.display = 'flex';
        }
    },

    // 隐藏加载屏幕
    hideLoading() {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            setTimeout(() => {
                loadingScreen.style.display = 'none';
            }, 500);
        }
    },

    // 初始化主应用界面
    async initMainApp() {
        try {
            // 渲染用户信息
            Components.renderUserInfo();

            // 渲染菜单
            Components.renderMenu();

            console.log('主应用界面初始化完成');
        } catch (error) {
            console.error('主应用界面初始化失败:', error);
        }
    },

    // 初始化UI事件
    initUIEvents() {
        // 登录表单事件
        this.initLoginForm();

        // 侧边栏切换事件
        this.initSidebarToggle();

        // 用户菜单事件
        this.initUserMenu();

        // 测试账户快速登录
        this.initTestAccounts();
    },

    // 初始化登录表单
    initLoginForm() {
        const loginForm = document.getElementById('login-form');
        const loginBtn = document.getElementById('login-btn');

        if (loginForm) {
            loginForm.addEventListener('submit', async (e) => {
                e.preventDefault();

                const formData = new FormData(loginForm);
                const credentials = {
                    username: formData.get('username'),
                    password: formData.get('password'),
                    rememberMe: formData.get('rememberMe') === 'on'
                };

                // 验证输入
                if (!credentials.username || !credentials.password) {
                    Utils.toast.error('请填写用户名和密码');
                    return;
                }

                // 禁用按钮
                loginBtn.disabled = true;
                loginBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 登录中...';

                try {
                    await Auth.login(credentials);

                    // 初始化主应用界面
                    await this.initMainApp();

                    // 跳转到仪表板
                    Router.navigate('/dashboard');

                } catch (error) {
                    console.error('登录失败:', error);
                } finally {
                    // 恢复按钮
                    loginBtn.disabled = false;
                    loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> 登录';
                }
            });
        }
    },

    // 初始化侧边栏切换
    initSidebarToggle() {
        const sidebarToggle = document.getElementById('sidebar-toggle');
        const sidebar = document.getElementById('sidebar');

        if (sidebarToggle && sidebar) {
            sidebarToggle.addEventListener('click', () => {
                const isCollapsed = sidebar.classList.contains('collapsed');

                if (isCollapsed) {
                    sidebar.classList.remove('collapsed');
                    Utils.storage.set('sidebar_collapsed', false);
                } else {
                    sidebar.classList.add('collapsed');
                    Utils.storage.set('sidebar_collapsed', true);
                }
            });

            // 恢复侧边栏状态
            const isCollapsed = Utils.storage.get('sidebar_collapsed', false);
            if (isCollapsed) {
                sidebar.classList.add('collapsed');
            }
        }
    },

    // 初始化用户菜单
    initUserMenu() {
        const userInfo = document.getElementById('user-info');
        const userDropdown = document.getElementById('user-dropdown');
        const logoutBtn = document.getElementById('logout-btn');

        if (userInfo && userDropdown) {
            // 切换下拉菜单
            userInfo.addEventListener('click', (e) => {
                e.stopPropagation();
                userDropdown.classList.toggle('show');
            });

            // 点击其他地方关闭菜单
            document.addEventListener('click', () => {
                userDropdown.classList.remove('show');
            });

            userDropdown.addEventListener('click', (e) => {
                e.stopPropagation();
            });
        }

        // 登出按钮
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();

                if (confirm('确定要退出登录吗？')) {
                    Auth.logout();
                }
            });
        }
    },

    // 初始化测试账户快速登录
    initTestAccounts() {
        const accountCards = document.querySelectorAll('.account-card');

        accountCards.forEach(card => {
            card.addEventListener('click', () => {
                const username = card.getAttribute('data-username');
                const password = card.getAttribute('data-password');

                if (username && password) {
                    // 填充表单
                    const usernameInput = document.getElementById('username');
                    const passwordInput = document.getElementById('password');

                    if (usernameInput && passwordInput) {
                        usernameInput.value = username;
                        passwordInput.value = password;

                        // 触发登录
                        const loginForm = document.getElementById('login-form');
                        if (loginForm) {
                            loginForm.dispatchEvent(new Event('submit'));
                        }
                    }
                }
            });
        });
    },

    // 处理全局错误
    handleGlobalError() {
        window.addEventListener('error', (e) => {
            console.error('全局错误:', e.error);
            Utils.toast.error('应用出现错误，请刷新页面重试');
        });

        window.addEventListener('unhandledrejection', (e) => {
            console.error('未处理的Promise拒绝:', e.reason);
            Utils.toast.error('网络请求失败，请检查网络连接');
        });
    },

    // 检查浏览器兼容性
    checkBrowserCompatibility() {
        const isSupported = (
            'fetch' in window &&
            'Promise' in window &&
            'localStorage' in window &&
            'addEventListener' in window
        );

        if (!isSupported) {
            alert('您的浏览器版本过低，请升级到最新版本以获得最佳体验。');
        }

        return isSupported;
    }
};

// 用户管理器
window.UserManager = {
    selectedUsers: new Set(),

    // 初始化
    init() {
        this.initCheckboxes();
        this.selectedUsers.clear();
    },

    // 初始化复选框
    initCheckboxes() {
        const selectAllCheckbox = document.getElementById('select-all');
        const userCheckboxes = document.querySelectorAll('.user-checkbox');
        const batchDeleteBtn = document.getElementById('batch-delete-btn');

        if (selectAllCheckbox) {
            selectAllCheckbox.addEventListener('change', (e) => {
                userCheckboxes.forEach(checkbox => {
                    checkbox.checked = e.target.checked;
                    if (e.target.checked) {
                        this.selectedUsers.add(checkbox.value);
                    } else {
                        this.selectedUsers.delete(checkbox.value);
                    }
                });
                this.updateBatchDeleteButton();
            });
        }

        userCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                if (e.target.checked) {
                    this.selectedUsers.add(e.target.value);
                } else {
                    this.selectedUsers.delete(e.target.value);
                }
                this.updateBatchDeleteButton();

                // 更新全选状态
                if (selectAllCheckbox) {
                    selectAllCheckbox.checked = userCheckboxes.length > 0 &&
                        Array.from(userCheckboxes).every(cb => cb.checked);
                }
            });
        });
    },

    // 更新批量操作按钮状态
    updateBatchDeleteButton() {
        const batchDeleteBtn = document.getElementById('batch-delete-btn');
        const batchActionsBtn = document.getElementById('batch-actions-btn');

        if (this.selectedUsers.size > 0) {
            if (batchDeleteBtn) {
                batchDeleteBtn.style.display = 'inline-flex';
                batchDeleteBtn.innerHTML = `<i class="fas fa-trash"></i> 批量删除 (${this.selectedUsers.size})`;
            }
            if (batchActionsBtn) {
                batchActionsBtn.style.display = 'inline-flex';
                batchActionsBtn.innerHTML = `<i class="fas fa-tasks"></i> 批量操作 (${this.selectedUsers.size})`;
            }
        } else {
            if (batchDeleteBtn) {
                batchDeleteBtn.style.display = 'none';
            }
            if (batchActionsBtn) {
                batchActionsBtn.style.display = 'none';
            }
        }
    },

    // 搜索处理
    handleSearch: Utils.debounce(function (value) {
        const params = Utils.url.getParams();
        params.search = value || undefined;
        params.page = 1; // 重置到第一页
        Utils.url.setParams(params);
        Router.navigate('/users');
    }, 500),

    // 筛选处理
    handleFilter(key, value) {
        const params = Utils.url.getParams();
        params[key] = value || undefined;
        params.page = 1; // 重置到第一页
        Utils.url.setParams(params);
        Router.navigate('/users');
    },

    // 翻页处理
    changePage(page) {
        const params = Utils.url.getParams();
        params.page = page;
        Utils.url.setParams(params);
        Router.navigate('/users');
    },

    // 刷新列表
    refreshList() {
        // 强制刷新用户列表页面
        Router.navigate('/users', { force: true });
    },

    // 查看用户详情
    viewUser(id) {
        Router.navigate(`/users/${id}`);
    },

    // 显示创建用户模态框
    showCreateModal() {
        const modalContent = `
            <form id="create-user-form">
                <div class="form-group">
                    <label for="create-username">用户名 *</label>
                    <input type="text" id="create-username" name="username" required 
                           placeholder="请输入用户名" minlength="3" maxlength="50">
                    <small class="form-text">3-50个字符，只能包含字母、数字和下划线</small>
                </div>
                
                <div class="form-group">
                    <label for="create-email">邮箱 *</label>
                    <input type="email" id="create-email" name="email" required 
                           placeholder="请输入邮箱地址">
                </div>
                
                <div class="form-group">
                    <label for="create-password">密码 *</label>
                    <input type="password" id="create-password" name="password" required 
                           placeholder="请输入密码" minlength="8">
                    <small class="form-text">至少8个字符，建议包含字母、数字和特殊字符</small>
                </div>
                
                <div class="form-group">
                    <label for="create-role">角色 *</label>
                    <select id="create-role" name="role" required>
                        <option value="">请选择角色</option>
                        <option value="user">普通用户</option>
                        ${Auth.hasRole(['super_admin']) ? `
                            <option value="admin">管理员</option>
                            <option value="super_admin">超级管理员</option>
                        ` : ''}
                    </select>
                </div>
                
                <div class="form-group">
                    <label for="create-nickname">昵称</label>
                    <input type="text" id="create-nickname" name="nickname" 
                           placeholder="请输入昵称（可选）">
                </div>
            </form>
        `;

        const modal = Components.createModal({
            title: '创建用户',
            content: modalContent,
            modalType: 'user-create',
            footer: `
                <button type="button" class="btn btn-secondary" onclick="this.closest('.modal-overlay').querySelector('.modal-close').click()">
                    取消
                </button>
                <button type="button" class="btn btn-primary" onclick="UserManager.createUser()">
                    <i class="fas fa-plus"></i>
                    创建用户
                </button>
            `
        });
    },

    // 创建用户
    async createUser() {
        const form = document.getElementById('create-user-form');
        const formData = new FormData(form);

        const userData = {
            username: formData.get('username'),
            email: formData.get('email'),
            password: formData.get('password'),
            role: formData.get('role'),
            profile: {
                nickname: formData.get('nickname') || ''
            }
        };

        // 表单验证
        if (!userData.username || !userData.email || !userData.password || !userData.role) {
            Utils.toast.error('请填写所有必填字段');
            return;
        }

        if (!Utils.validate.email(userData.email)) {
            Utils.toast.error('请输入有效的邮箱地址');
            return;
        }

        if (userData.password.length < 8) {
            Utils.toast.error('密码长度至少8个字符');
            return;
        }

        try {
            const response = await API.users.create(userData);

            if (response.success) {
                Utils.toast.success('用户创建成功');

                // 关闭模态框
                const modal = document.querySelector('.modal-overlay.show');
                if (modal) {
                    modal.querySelector('.modal-close').click();
                }

                // 刷新列表
                this.refreshList();
            } else {
                throw new Error(response.message || '创建用户失败');
            }
        } catch (error) {
            Utils.toast.error(`创建用户失败: ${error.message}`);
        }
    },

    // 编辑用户
    async editUser(id) {
        try {
            // 获取用户详情
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

            // 角色选择框的选项生成
            const roleOptions = await this.generateRoleOptions(user, isSelf);

            const modalContent = `
                <form id="edit-user-form">
                    <input type="hidden" name="id" value="${user.id}">
                    
                    <div class="form-group">
                        <label for="edit-username">用户名 *</label>
                        <input type="text" id="edit-username" name="username" required 
                               value="${user.username}" placeholder="请输入用户名" 
                               minlength="3" maxlength="50">
                    </div>
                    
                    <div class="form-group">
                        <label for="edit-email">邮箱 *</label>
                        <input type="email" id="edit-email" name="email" required 
                               value="${user.email}" placeholder="请输入邮箱地址">
                    </div>
                    
                    <div class="form-group">
                        <label for="edit-role">角色 *</label>
                        <select id="edit-role" name="role" required>
                            ${roleOptions}
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label for="edit-status">状态 *</label>
                        <select id="edit-status" name="status" required ${statusDisabled ? 'disabled' : ''}>
                            ${statusOptions}
                        </select>
                        ${statusDisabled ? '<small class="form-text text-warning">超级管理员不能禁用自己的账户</small>' : ''}
                    </div>
                    
                    <div class="form-group">
                        <label for="edit-nickname">昵称</label>
                        <input type="text" id="edit-nickname" name="nickname" 
                               value="${user.profile?.nickname || ''}" placeholder="请输入昵称（可选）">
                    </div>
                </form>
            `;

            Components.createModal({
                title: '编辑用户',
                content: modalContent,
                modalType: 'user-edit',
                footer: `
                    <button type="button" class="btn btn-secondary" onclick="this.closest('.modal-overlay').querySelector('.modal-close').click()">
                        取消
                    </button>
                    <button type="button" class="btn btn-primary" onclick="UserManager.updateUser()">
                        <i class="fas fa-save"></i>
                        保存更改
                    </button>
                `
            });

        } catch (error) {
            Utils.toast.error(`获取用户信息失败: ${error.message}`);
        }
    },

    // 生成角色选项
    async generateRoleOptions(user, isSelf) {
        const currentUserRole = Auth.getUserRole();
        const isSuperAdmin = user.role === 'super_admin';

        let options = '';

        // 超级管理员选项
        if (currentUserRole === 'super_admin') {
            options += `<option value="super_admin" ${user.role === 'super_admin' ? 'selected' : ''}>超级管理员</option>`;
        }

        // 普通管理员选项
        const canChangeTo = !isSelf || !isSuperAdmin || await SelfProtection.checkSuperAdminCount();
        if (canChangeTo) {
            options += `<option value="admin" ${user.role === 'admin' ? 'selected' : ''}>管理员</option>`;
        }

        // 普通用户选项
        if (canChangeTo) {
            options += `<option value="user" ${user.role === 'user' ? 'selected' : ''}>普通用户</option>`;
        }

        // 如果是唯一的超级管理员，添加提示
        if (isSelf && isSuperAdmin && !await SelfProtection.checkSuperAdminCount()) {
            options += `<!-- 系统必须保留至少一个超级管理员 -->`;
        }

        return options;
    },

    // 更新用户
    async updateUser() {
        const form = document.getElementById('edit-user-form');
        const formData = new FormData(form);

        const userData = {
            username: formData.get('username'),
            email: formData.get('email'),
            role: formData.get('role'),
            status: formData.get('status'),
            profile: {
                nickname: formData.get('nickname') || ''
            }
        };

        const userId = formData.get('id');

        // 表单验证
        if (!userData.username || !userData.email || !userData.role || !userData.status) {
            Utils.toast.error('请填写所有必填字段');
            return;
        }

        if (!Utils.validate.email(userData.email)) {
            Utils.toast.error('请输入有效的邮箱地址');
            return;
        }

        // 检查状态变更保护
        if (userData.status === 'inactive' && !SelfProtection.canDisableUser(userId)) {
            SelfProtection.showProtectionWarning('disable', userId);
            return;
        }

        // 检查角色变更保护
        if (!(await SelfProtection.canChangeRole(userId, userData.role))) {
            SelfProtection.showProtectionWarning('changeRole', userId);
            return;
        }

        try {
            const response = await API.users.update(userId, userData);

            if (response.success) {
                Utils.toast.success('用户更新成功');

                // 关闭模态框
                const modal = document.querySelector('.modal-overlay.show');
                if (modal) {
                    modal.querySelector('.modal-close').click();
                }

                // 刷新列表
                this.refreshList();
            } else {
                throw new Error(response.message || '更新用户失败');
            }
        } catch (error) {
            Utils.toast.error(`更新用户失败: ${error.message}`);
        }
    },

    // 删除用户
    async deleteUser(id) {
        // 检查是否可以删除用户
        if (!SelfProtection.canDeleteUser(id)) {
            SelfProtection.showProtectionWarning('delete', id);
            return;
        }

        if (!confirm('确定要删除该用户吗？此操作不可恢复！')) {
            return;
        }

        try {
            const response = await API.users.delete(id);

            if (response.success) {
                Utils.toast.success('用户删除成功');
                this.refreshList();
            } else {
                throw new Error(response.message || '用户删除失败');
            }
        } catch (error) {
            Utils.toast.error(`用户删除失败: ${error.message}`);
        }
    },

    // 重置密码
    resetPassword(id) {
        const modalContent = `
            <form id="reset-password-form">
                <input type="hidden" name="id" value="${id}">
                
                <div class="form-group">
                    <label for="new-password">新密码 *</label>
                    <input type="password" id="new-password" name="password" required 
                           placeholder="请输入新密码" minlength="8">
                    <small class="form-text">至少8个字符，建议包含字母、数字和特殊字符</small>
                </div>
                
                <div class="form-group">
                    <label for="confirm-password">确认密码 *</label>
                    <input type="password" id="confirm-password" name="confirmPassword" required 
                           placeholder="请再次输入新密码">
                </div>
            </form>
        `;

        Components.createModal({
            title: '重置用户密码',
            content: modalContent,
            footer: `
                <button type="button" class="btn btn-secondary" onclick="this.closest('.modal-overlay').querySelector('.modal-close').click()">
                    取消
                </button>
                <button type="button" class="btn btn-warning" onclick="UserManager.confirmResetPassword()">
                    <i class="fas fa-key"></i>
                    重置密码
                </button>
            `
        });
    },

    // 确认重置密码
    async confirmResetPassword() {
        const form = document.getElementById('reset-password-form');
        const formData = new FormData(form);

        const password = formData.get('password');
        const confirmPassword = formData.get('confirmPassword');
        const userId = formData.get('id');

        // 验证
        if (!password || !confirmPassword) {
            Utils.toast.error('请填写密码字段');
            return;
        }

        if (password.length < 8) {
            Utils.toast.error('密码长度至少8个字符');
            return;
        }

        if (password !== confirmPassword) {
            Utils.toast.error('两次输入的密码不一致');
            return;
        }

        try {
            const response = await API.users.resetPassword(userId, password);

            if (response.success) {
                Utils.toast.success('密码重置成功');

                // 关闭模态框
                const modal = document.querySelector('.modal-overlay.show');
                if (modal) {
                    modal.querySelector('.modal-close').click();
                }
            } else {
                throw new Error(response.message || '密码重置失败');
            }
        } catch (error) {
            Utils.toast.error(`密码重置失败: ${error.message}`);
        }
    },

    // 切换用户状态
    async toggleUserStatus(id, status) {
        // 检查是否可以禁用用户
        if (status === 'inactive' && !SelfProtection.canDisableUser(id)) {
            SelfProtection.showProtectionWarning('disable', id);
            return;
        }

        const statusText = status === 'active' ? '启用' : '禁用';

        if (!confirm(`确定要${statusText}该用户吗？`)) {
            return;
        }

        try {
            const response = await API.users.update(id, { status });

            if (response.success) {
                Utils.toast.success(`用户${statusText}成功`);
                this.refreshList();
            } else {
                throw new Error(response.message || `用户${statusText}失败`);
            }
        } catch (error) {
            Utils.toast.error(`用户${statusText}失败: ${error.message}`);
        }
    },

    // 批量删除
    async batchDelete() {
        if (this.selectedUsers.size === 0) {
            Utils.toast.warning('请选择要删除的用户');
            return;
        }

        const originalIds = Array.from(this.selectedUsers);

        // 过滤掉受保护的用户（超级管理员自己）
        const filteredIds = SelfProtection.filterProtectedUsers(originalIds, 'delete');

        if (filteredIds.length === 0) {
            Utils.toast.warning('没有可删除的用户');
            return;
        }

        const confirmMessage = filteredIds.length === originalIds.length
            ? `确定要删除选中的 ${filteredIds.length} 个用户吗？此操作不可恢复！`
            : `确定要删除选中的 ${filteredIds.length} 个用户吗？（已排除您自己）此操作不可恢复！`;

        if (!confirm(confirmMessage)) {
            return;
        }

        try {
            const response = await API.users.batchUpdate(filteredIds, 'delete');

            if (response.success) {
                Utils.toast.success(`成功删除 ${filteredIds.length} 个用户`);
                this.selectedUsers.clear();
                this.refreshList();
            } else {
                throw new Error(response.message || '批量删除失败');
            }
        } catch (error) {
            Utils.toast.error(`批量删除失败: ${error.message}`);
        }
    }
};

// 确保UserManager在全局作用域中可用
window.UserManager = UserManager;

// 团队管理器
window.TeamManager = {
    selectedTeams: new Set(),

    // 初始化
    init() {
        this.initCheckboxes();
        this.selectedTeams.clear();
    },

    // 修复token格式问题
    fixTokenFormat() {
        try {
            const currentToken = localStorage.getItem('token');
            if (currentToken) {
                // 检查token是否被错误地JSON序列化
                if (currentToken.startsWith('"') && currentToken.endsWith('"')) {
                    // 移除多余的引号
                    const fixedToken = currentToken.slice(1, -1);
                    localStorage.setItem('token', fixedToken);
                    console.log('🔧 修复了token格式问题');
                }
                
                // 检查token是否为有效的JWT格式
                const parts = currentToken.replace(/^"|"$/g, '').split('.');
                if (parts.length !== 3) {
                    console.warn('⚠️ Token格式可能不正确，不是标准JWT格式');
                }
            }
        } catch (error) {
            console.error('修复token格式时出错:', error);
        }
    },

    // 检查认证状态
    checkAuthStatus() {
        if (!Auth.isLoggedIn()) {
            console.warn('⚠️ 用户未登录，跳转到登录页');
            Router.navigate('/login');
            return false;
        }
        
        // 详细检查token状态
        const token = localStorage.getItem('token');
        const user = localStorage.getItem('user');
        const tokenExpires = localStorage.getItem('token_expires');
        
        console.log('🔍 认证状态检查:', {
            hasToken: !!token,
            tokenLength: token ? token.length : 0,
            hasUser: !!user,
            hasExpires: !!tokenExpires,
            tokenPrefix: token ? token.substring(0, 10) : 'none'
        });
        
        // 检查token格式是否正确（JWT通常有3个部分，用.分隔）
        if (token && !token.includes('.')) {
            console.warn('⚠️ Token格式可能不正确，不是标准JWT格式');
            Utils.toast.warning('登录令牌格式异常，可能需要重新登录');
        }
        
        // 检查token是否即将过期（30分钟内）
        if (tokenExpires) {
            const expiresAt = parseInt(tokenExpires);
            const now = Date.now();
            const thirtyMinutes = 30 * 60 * 1000;
            
            if (now > expiresAt) {
                console.warn('⚠️ Token已过期');
                Utils.toast.error('登录已过期，请刷新页面重新登录');
                return false;
            } else if (now + thirtyMinutes > expiresAt) {
                console.warn('⚠️ Token即将过期，建议重新登录');
                Utils.toast.warning('登录即将过期，建议刷新页面重新获取令牌');
            }
        }
        
        return true;
    },

    // 初始化复选框
    initCheckboxes() {
        const selectAllCheckbox = document.getElementById('select-all-teams');
        const teamCheckboxes = document.querySelectorAll('.team-checkbox');
        const batchDeleteBtn = document.getElementById('batch-delete-teams-btn');

        if (selectAllCheckbox) {
            selectAllCheckbox.addEventListener('change', (e) => {
                teamCheckboxes.forEach(checkbox => {
                    checkbox.checked = e.target.checked;
                    if (e.target.checked) {
                        this.selectedTeams.add(checkbox.value);
                    } else {
                        this.selectedTeams.delete(checkbox.value);
                    }
                });
                this.updateBatchDeleteButton();
            });
        }

        teamCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                if (e.target.checked) {
                    this.selectedTeams.add(e.target.value);
                } else {
                    this.selectedTeams.delete(e.target.value);
                }
                this.updateBatchDeleteButton();

                // 更新全选状态
                if (selectAllCheckbox) {
                    selectAllCheckbox.checked = teamCheckboxes.length > 0 &&
                        Array.from(teamCheckboxes).every(cb => cb.checked);
                }
            });
        });
    },

    // 更新批量操作按钮状态
    updateBatchDeleteButton() {
        const batchDeleteBtn = document.getElementById('batch-delete-teams-btn');
        const batchActionsBtn = document.getElementById('batch-actions-teams-btn');

        if (this.selectedTeams.size > 0) {
            if (batchDeleteBtn) {
                batchDeleteBtn.style.display = 'inline-flex';
                batchDeleteBtn.innerHTML = `<i class="fas fa-trash"></i> 批量删除 (${this.selectedTeams.size})`;
            }
            if (batchActionsBtn) {
                batchActionsBtn.style.display = 'inline-flex';
                batchActionsBtn.innerHTML = `<i class="fas fa-tasks"></i> 批量操作 (${this.selectedTeams.size})`;
            }
        } else {
            if (batchDeleteBtn) {
                batchDeleteBtn.style.display = 'none';
            }
            if (batchActionsBtn) {
                batchActionsBtn.style.display = 'none';
            }
        }
    },

    // 搜索处理
    handleSearch: Utils.debounce(function (value) {
        const params = Utils.url.getParams();
        params.search = value || undefined;
        params.page = 1; // 重置到第一页
        Utils.url.setParams(params);
        Router.navigate('/teams');
    }, 500),

    // 筛选处理
    handleFilter(key, value) {
        const params = Utils.url.getParams();
        params[key] = value || undefined;
        params.page = 1; // 重置到第一页
        Utils.url.setParams(params);
        Router.navigate('/teams');
    },

    // 翻页处理
    changePage(page) {
        const params = Utils.url.getParams();
        params.page = page;
        Utils.url.setParams(params);
        Router.navigate('/teams');
    },

    // 刷新列表
    refreshList() {
        // 强制刷新团队列表页面
        Router.navigate('/teams', { force: true });
    },

    // 查看团队详情
    viewTeam(id) {
        window.location.href = `/team-detail-page.html?id=${id}`;
    },

    // 显示创建团队模态框
    async showCreateModal() {
        // 直接复制团队类型管理页面的成功实现
        const token = localStorage.getItem('token');
        let typeOptionsHtml = '<option value="">请选择团队类型</option>';
        
        try {
            const response = await fetch('/api/teams/types', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });
            
            const data = await response.json();
            if (data.success && data.data) {
                typeOptionsHtml += data.data.map(type => 
                    `<option value="${type.value}">${type.label}</option>`
                ).join('');
            }
        } catch (error) {
            console.error('加载团队类型失败:', error);
            // 使用默认选项
            typeOptionsHtml += `
                <option value="general">通用团队</option>
                <option value="development">开发团队</option>
            `;
        }
        
        const modalContent = `
            <form id="create-team-form">
                <div class="form-group">
                    <label for="create-team-name">团队名称 *</label>
                    <input type="text" id="create-team-name" name="name" required 
                           placeholder="请输入团队名称" maxlength="100">
                    <small class="form-text">团队名称将作为团队的唯一标识</small>
                </div>
                
                <div class="form-group">
                    <label for="create-team-description">团队描述</label>
                    <textarea id="create-team-description" name="description" 
                              placeholder="请输入团队描述（可选）" rows="4" maxlength="1000"></textarea>
                    <small class="form-text">简要描述团队的目标和职责</small>
                </div>
                
                <div class="form-group">
                    <label for="create-team-type">团队类型 *</label>
                    <select id="create-team-type" name="team_type" required>
                        ${typeOptionsHtml}
                    </select>
                    <small class="form-text">选择团队的主要职能类型</small>
                </div>
                
                <div class="form-group">
                    <label for="create-team-avatar">团队头像URL</label>
                    <input type="url" id="create-team-avatar" name="avatar_url" 
                           placeholder="https://example.com/avatar.jpg（可选）">
                    <small class="form-text">团队头像的网络地址</small>
                </div>
            </form>
        `;

        Components.createModal({
            title: '创建团队',
            content: modalContent,
            footer: `
                <button type="button" class="btn btn-secondary" onclick="this.closest('.modal-overlay').querySelector('.modal-close').click()">
                    取消
                </button>
                <button type="button" class="btn btn-primary" onclick="TeamManager.createTeam()">
                    <i class="fas fa-plus"></i>
                    创建团队
                </button>
            `
        });
    },



    // 创建团队
    async createTeam() {
        const form = document.getElementById('create-team-form');
        const formData = new FormData(form);

        const teamData = {
            name: formData.get('name'),
            description: formData.get('description'),
            avatar_url: formData.get('avatar_url'),
            team_type: formData.get('team_type') || 'general'
        };

        // 表单验证
        if (!teamData.name) {
            Utils.toast.error('请填写团队名称');
            return;
        }

        if (teamData.name.length < 2 || teamData.name.length > 100) {
            Utils.toast.error('团队名称长度必须在2-100个字符之间');
            return;
        }

        if (teamData.avatar_url && !teamData.avatar_url.match(/^https?:\/\/.+/)) {
            Utils.toast.error('头像URL格式不正确');
            return;
        }

        try {
            const response = await API.teams.create(teamData);

            if (response.success) {
                Utils.toast.success('团队创建成功');

                // 关闭模态框
                const modal = document.querySelector('.modal-overlay.show');
                if (modal) {
                    modal.querySelector('.modal-close').click();
                }

                // 刷新列表
                this.refreshList();
            } else {
                throw new Error(response.message || '创建团队失败');
            }
        } catch (error) {
            Utils.toast.error(`创建团队失败: ${error.message}`);
        }
    },

    // 编辑团队
    async editTeam(id) {
        try {
            // 获取团队详情
            const response = await API.teams.getDetail(id);
            const team = response.data;

            // 获取团队类型选项
            const typeOptionsHtml = await TeamTypeManager.generateTypeOptionsHtml(team.team_type);

            const modalContent = `
                <form id="edit-team-form">
                    <input type="hidden" name="id" value="${team.id}">
                    
                    <div class="form-group">
                        <label for="edit-team-name">团队名称 *</label>
                        <input type="text" id="edit-team-name" name="name" required 
                               value="${team.name}" placeholder="请输入团队名称" 
                               maxlength="100">
                    </div>
                    
                    <div class="form-group">
                        <label for="edit-team-description">团队描述</label>
                        <textarea id="edit-team-description" name="description" 
                                  placeholder="请输入团队描述（可选）" rows="4" 
                                  maxlength="1000">${team.description || ''}</textarea>
                    </div>
                    
                    <div class="form-group">
                        <label for="edit-team-type">团队类型 *</label>
                        <select id="edit-team-type" name="team_type" required>
                            ${typeOptionsHtml}
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label for="edit-team-avatar">团队头像URL</label>
                        <input type="url" id="edit-team-avatar" name="avatar_url" 
                               value="${team.avatar_url || ''}" 
                               placeholder="https://example.com/avatar.jpg（可选）">
                    </div>
                    
                    <div class="form-group">
                        <label for="edit-team-status">团队状态 *</label>
                        <select id="edit-team-status" name="status" required>
                            <option value="active" ${team.status === 'active' ? 'selected' : ''}>正常</option>
                            <option value="inactive" ${team.status === 'inactive' ? 'selected' : ''}>禁用</option>
                            <option value="dissolved" ${team.status === 'dissolved' ? 'selected' : ''}>已解散</option>
                        </select>
                    </div>
                </form>
            `;

            Components.createModal({
                title: '编辑团队',
                content: modalContent,
                footer: `
                    <button type="button" class="btn btn-secondary" onclick="this.closest('.modal-overlay').querySelector('.modal-close').click()">
                        取消
                    </button>
                    <button type="button" class="btn btn-primary" onclick="TeamManager.updateTeam()">
                        <i class="fas fa-save"></i>
                        保存更改
                    </button>
                `
            });

        } catch (error) {
            Utils.toast.error(`获取团队信息失败: ${error.message}`);
        }
    },

    // 更新团队
    async updateTeam() {
        const form = document.getElementById('edit-team-form');
        const formData = new FormData(form);

        const teamData = {
            name: formData.get('name'),
            description: formData.get('description'),
            avatar_url: formData.get('avatar_url'),
            team_type: formData.get('team_type'),
            status: formData.get('status')
        };

        const teamId = formData.get('id');

        // 表单验证
        if (!teamData.name) {
            Utils.toast.error('请填写团队名称');
            return;
        }

        if (teamData.name.length < 2 || teamData.name.length > 100) {
            Utils.toast.error('团队名称长度必须在2-100个字符之间');
            return;
        }

        if (teamData.avatar_url && !teamData.avatar_url.match(/^https?:\/\/.+/)) {
            Utils.toast.error('头像URL格式不正确');
            return;
        }

        try {
            const response = await API.teams.update(teamId, teamData);

            if (response.success) {
                Utils.toast.success('团队更新成功');

                // 关闭模态框
                const modal = document.querySelector('.modal-overlay.show');
                if (modal) {
                    modal.querySelector('.modal-close').click();
                }

                // 刷新列表
                this.refreshList();
            } else {
                throw new Error(response.message || '更新团队失败');
            }
        } catch (error) {
            Utils.toast.error(`更新团队失败: ${error.message}`);
        }
    },

    // 删除团队
    async deleteTeam(id) {
        if (!confirm('确定要删除该团队吗？此操作不可恢复！')) {
            return;
        }

        try {
            const response = await API.teams.delete(id);

            if (response.success) {
                Utils.toast.success('团队删除成功');
                this.refreshList();
            } else {
                throw new Error(response.message || '团队删除失败');
            }
        } catch (error) {
            Utils.toast.error(`团队删除失败: ${error.message}`);
        }
    },

    // 批量删除
    async batchDelete() {
        if (this.selectedTeams.size === 0) {
            Utils.toast.warning('请选择要删除的团队');
            return;
        }

        if (!confirm(`确定要删除选中的 ${this.selectedTeams.size} 个团队吗？此操作不可恢复！`)) {
            return;
        }

        const teamIds = Array.from(this.selectedTeams);

        try {
            // 逐个删除团队
            const promises = teamIds.map(id => API.teams.delete(id));
            const results = await Promise.allSettled(promises);

            const successCount = results.filter(result => result.status === 'fulfilled').length;
            const failCount = results.length - successCount;

            if (successCount > 0) {
                Utils.toast.success(`成功删除 ${successCount} 个团队`);
            }

            if (failCount > 0) {
                Utils.toast.warning(`${failCount} 个团队删除失败`);
            }

            this.selectedTeams.clear();
            this.refreshList();

        } catch (error) {
            Utils.toast.error(`批量删除失败: ${error.message}`);
        }
    }
};

// 确保TeamManager在全局作用域中可用
window.TeamManager = TeamManager;

// 页面加载完成后初始化应用
document.addEventListener('DOMContentLoaded', () => {
    // 检查浏览器兼容性
    if (!App.checkBrowserCompatibility()) {
        return;
    }

    // 处理全局错误
    App.handleGlobalError();

    // 初始化应用
    App.init();
});

// 页面可见性变化处理
document.addEventListener('visibilitychange', () => {
    if (!document.hidden && Auth.isLoggedIn()) {
        // 页面重新可见时，检查Token是否仍然有效
        Auth.refreshToken();
    }
});

// 网络状态变化处理
window.addEventListener('online', () => {
    Utils.toast.success('网络连接已恢复');
});

window.addEventListener('offline', () => {
    Utils.toast.warning('网络连接已断开');
});

// 团队类型管理器
window.TeamTypeManager = {
    // 团队类型列表（从后端获取）
    teamTypes: [],

    // 从后端获取团队类型列表
    async loadTeamTypes() {
        console.log('🚀 开始加载团队类型...');
        
        try {
            // 直接使用localStorage获取token，与团队类型管理页面保持一致
            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('没有找到认证token');
            }
            
            console.log('📞 直接调用团队类型API...');
            const response = await fetch('/api/teams/types', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            console.log('📡 API响应:', data);
            
            if (data.success) {
                this.teamTypes = data.data.map(type => ({
                    id: type.value,
                    name: type.label,
                    description: type.description || this.getTypeDescription(type.value),
                    isDefault: type.isDefault !== false // 默认为true，除非明确设置为false
                }));
                console.log('✅ 团队类型加载成功:', this.teamTypes);
                console.log('🔍 this对象检查:', this);
                console.log('🔍 this.teamTypes长度:', this.teamTypes.length);
                return this.teamTypes;
            } else {
                throw new Error(data.message || '获取团队类型失败');
            }
        } catch (error) {
            console.error('💥 API调用异常:', error);
            throw new Error('获取团队类型失败: ' + error.message);
        }
    },

    // 获取类型描述
    getTypeDescription(typeValue) {
        // TODO: 将硬编码描述迁移到后端API，与团队类型数据一起管理
        const descriptionsTemp = {
            'general': '适用于一般性工作团队',
            'development': '负责软件开发和技术实现',
            'testing': '负责产品测试和质量保证',
            'design': '负责UI/UX设计和视觉创意',
            'marketing': '负责市场推广和品牌建设',
            'operation': '负责产品运营和用户增长',
            'research': '负责技术研究和创新',
            'support': '负责客户服务和技术支持'
        };
        return descriptionsTemp[typeValue] || '自定义团队类型';
    },

    // 获取团队类型选项（用于下拉框）
    async getTypeOptions() {
        console.log('🎯 getTypeOptions被调用，当前teamTypes长度:', this.teamTypes.length);
        
        if (this.teamTypes.length === 0) {
            console.log('📞 teamTypes为空，调用loadTeamTypes...');
            await this.loadTeamTypes();
            console.log('📞 loadTeamTypes完成，新的teamTypes长度:', this.teamTypes.length);
        }
        
        const options = this.teamTypes.map(type => ({
            value: type.id,
            label: type.name
        }));
        
        console.log('🎯 getTypeOptions返回选项:', options);
        return options;
    },

    // 生成团队类型选项HTML
    async generateTypeOptionsHtml(selectedValue = '') {
        console.log('🎯 生成团队类型选项HTML...');
        
        const options = await this.getTypeOptions();
        console.log('📋 获取到的选项数量:', options.length, '选项:', options);
        
        if (options.length === 0) {
            console.warn('⚠️ 没有团队类型选项，返回空选项');
            return '<option value="">暂无可用类型</option>';
        }
        
        // 添加默认选项
        let html = '<option value="">请选择团队类型</option>';
        
        // 添加团队类型选项
        html += options.map(option =>
            `<option value="${option.value}" ${option.value === selectedValue ? 'selected' : ''}>${option.label}</option>`
        ).join('');
        
        console.log('🏗️ 生成的HTML成功，选项数量:', options.length);
        return html;
    },

    // 显示团队类型管理模态框
    async showManageModal() {
        // 先加载最新的团队类型数据
        await this.loadTeamTypes();
        const modalContent = `
            <div class="team-type-manager">
                <div class="team-type-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h4>团队类型管理</h4>
                    <button class="btn btn-primary btn-sm" onclick="TeamTypeManager.showAddModal()">
                        <i class="fas fa-plus"></i>
                        新增类型
                    </button>
                </div>
                
                <div class="team-type-list" id="team-type-list">
                    ${this.renderTeamTypeList()}
                </div>
            </div>
        `;

        const modal = Components.createModal({
            title: '团队类型管理',
            content: modalContent,
            size: 'large',
            footer: `
                <button type="button" class="btn btn-secondary" onclick="this.closest('.modal-overlay').querySelector('.modal-close').click()">
                    关闭
                </button>
            `
        });
    },

    // 渲染团队类型列表
    renderTeamTypeList() {
        return `
            <div class="table-responsive">
                <table class="table">
                    <thead>
                        <tr>
                            <th>类型ID</th>
                            <th>类型名称</th>
                            <th>描述</th>
                            <th>类型</th>
                            <th width="120">操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${this.teamTypes.map(type => `
                            <tr>
                                <td><code>${type.id}</code></td>
                                <td>${type.name}</td>
                                <td>${type.description}</td>
                                <td>
                                    <span class="badge ${type.isDefault ? 'badge-primary' : 'badge-success'}">
                                        ${type.isDefault ? '系统默认' : '自定义'}
                                    </span>
                                </td>
                                <td>
                                    <button class="btn btn-sm btn-warning" 
                                            onclick="TeamTypeManager.editType('${type.id}')" 
                                            title="编辑"
                                            ${type.isDefault ? 'disabled' : ''}>
                                        <i class="fas fa-edit"></i>
                                    </button>
                                    <button class="btn btn-sm btn-danger" 
                                            onclick="TeamTypeManager.deleteType('${type.id}')" 
                                            title="删除"
                                            ${type.isDefault ? 'disabled' : ''}>
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>

        `;
    },

    // 显示新增团队类型模态框
    showAddModal() {
        console.log('TeamTypeManager.showAddModal() 被调用');
        
        // 检查权限
        if (!Auth.hasPermission(['system:update'])) {
            console.error('权限检查失败：没有system:update权限');
            Utils.toast.error('没有权限执行此操作');
            return;
        }
        const modalContent = `
            <form id="add-team-type-form">
                <div class="form-group">
                    <label for="type-id">类型ID *</label>
                    <input type="text" id="type-id" name="id" class="form-control" required 
                           placeholder="请输入类型ID（英文，如：custom_team）" 
                           pattern="[a-z_]+" title="只能包含小写字母和下划线">
                    <small class="form-text">类型ID用于系统内部标识，只能包含小写字母和下划线</small>
                </div>
                
                <div class="form-group">
                    <label for="type-name">类型名称 *</label>
                    <input type="text" id="type-name" name="name" class="form-control" required 
                           placeholder="请输入类型名称（如：自定义团队）">
                </div>
                
                <div class="form-group">
                    <label for="type-description">描述</label>
                    <textarea id="type-description" name="description" class="form-control" rows="3" 
                              placeholder="请输入类型描述"></textarea>
                </div>
            </form>
        `;

        const modal = Components.createModal({
            title: '新增团队类型',
            content: modalContent,
            footer: `
                <button type="button" class="btn btn-secondary" onclick="this.closest('.modal-overlay').querySelector('.modal-close').click()">
                    取消
                </button>
                <button type="button" class="btn btn-primary" onclick="TeamTypeManager.addType()">
                    <i class="fas fa-plus"></i>
                    新增
                </button>
            `
        });
    },

    // 新增团队类型
    async addType() {
        const form = document.getElementById('add-team-type-form');
        const formData = new FormData(form);

        const typeData = {
            id: formData.get('id'),
            name: formData.get('name'),
            description: formData.get('description') || ''
        };

        // 表单验证
        if (!typeData.id || !typeData.name) {
            Utils.toast.error('请填写必填字段');
            return;
        }

        // 检查ID是否已存在
        if (this.teamTypes.find(type => type.id === typeData.id)) {
            Utils.toast.error('类型ID已存在');
            return;
        }

        // 验证ID格式
        if (!/^[a-z_]+$/.test(typeData.id)) {
            Utils.toast.error('类型ID只能包含小写字母和下划线');
            return;
        }

        try {
            // 调用后端API保存团队类型
            const response = await API.teams.createType(typeData);
            if (!response.success) {
                Utils.toast.error('保存失败：' + response.message);
                return;
            }

            // 添加到当前列表
            this.teamTypes.push({
                id: response.data.value,
                name: response.data.label,
                description: response.data.description,
                isDefault: false
            });

            Utils.toast.success('团队类型添加成功');

            // 关闭模态框
            const modal = document.querySelector('.modal-overlay.show');
            if (modal) {
                modal.querySelector('.modal-close').click();
            }

            // 刷新列表
            this.refreshTypeList();

        } catch (error) {
            console.error('添加团队类型失败:', error);
            Utils.toast.error('添加失败：' + error.message);
        }
    },

    // 编辑团队类型
    editType(typeId) {
        const type = this.teamTypes.find(t => t.id === typeId);
        if (!type) {
            Utils.toast.error('团队类型不存在');
            return;
        }

        const modalContent = `
            <form id="edit-team-type-form">
                <input type="hidden" name="id" value="${type.id}">
                
                <div class="form-group">
                    <label for="edit-type-id">类型ID</label>
                    <input type="text" id="edit-type-id" class="form-control" value="${type.id}" disabled>
                    <small class="form-text">类型ID不可修改</small>
                </div>
                
                <div class="form-group">
                    <label for="edit-type-name">类型名称 *</label>
                    <input type="text" id="edit-type-name" name="name" class="form-control" required 
                           value="${type.name}" placeholder="请输入类型名称">
                </div>
                
                <div class="form-group">
                    <label for="edit-type-description">描述</label>
                    <textarea id="edit-type-description" name="description" class="form-control" rows="3" 
                              placeholder="请输入类型描述">${type.description}</textarea>
                </div>
            </form>
        `;

        const modal = Components.createModal({
            title: '编辑团队类型',
            content: modalContent,
            footer: `
                <button type="button" class="btn btn-secondary" onclick="this.closest('.modal-overlay').querySelector('.modal-close').click()">
                    取消
                </button>
                <button type="button" class="btn btn-primary" onclick="TeamTypeManager.updateType('${typeId}')">
                    <i class="fas fa-save"></i>
                    保存
                </button>
            `
        });
    },

    // 更新团队类型
    async updateType(typeId) {
        const form = document.getElementById('edit-team-type-form');
        const formData = new FormData(form);

        const typeData = {
            name: formData.get('name'),
            description: formData.get('description') || ''
        };

        // 表单验证
        if (!typeData.name) {
            Utils.toast.error('请填写类型名称');
            return;
        }

        const type = this.teamTypes.find(t => t.id === typeId);
        if (!type) {
            Utils.toast.error('团队类型不存在');
            return;
        }

        // 检查是否为默认类型
        if (type.isDefault) {
            Utils.toast.error('默认团队类型不能编辑');
            return;
        }

        try {
            // 调用后端API更新团队类型
            const response = await API.teams.updateType(typeId, typeData);
            if (!response.success) {
                Utils.toast.error('更新失败：' + response.message);
                return;
            }

            // 更新当前列表中的数据
            const currentTypeIndex = this.teamTypes.findIndex(t => t.id === typeId);
            if (currentTypeIndex !== -1) {
                this.teamTypes[currentTypeIndex] = {
                    ...this.teamTypes[currentTypeIndex],
                    name: response.data.label,
                    description: response.data.description
                };
            }

            Utils.toast.success('团队类型更新成功');

            // 关闭模态框
            const modal = document.querySelector('.modal-overlay.show');
            if (modal) {
                modal.querySelector('.modal-close').click();
            }

            // 刷新列表
            this.refreshTypeList();

        } catch (error) {
            console.error('更新团队类型失败:', error);
            Utils.toast.error('更新失败：' + error.message);
        }
    },

    // 删除团队类型
    async deleteType(typeId) {
        console.log('TeamTypeManager.deleteType() 被调用，typeId:', typeId);
        const type = this.teamTypes.find(t => t.id === typeId);
        if (!type) {
            Utils.toast.error('团队类型不存在');
            return;
        }

        // 检查是否为默认类型
        if (type.isDefault) {
            Utils.toast.error('默认团队类型不能删除');
            return;
        }

        if (confirm(`确定要删除团队类型"${type.name}"吗？\n\n注意：删除后使用此类型的团队将显示为未知类型。`)) {
            try {
                // 调用后端API删除团队类型
                const response = await API.teams.deleteType(typeId);
                if (!response.success) {
                    Utils.toast.error('删除失败：' + response.message);
                    return;
                }

                // 从当前列表中移除
                this.teamTypes = this.teamTypes.filter(t => t.id !== typeId);

                Utils.toast.success('团队类型删除成功');

                // 刷新列表
                this.refreshTypeList();

            } catch (error) {
                console.error('删除团队类型失败:', error);
                Utils.toast.error('删除失败：' + error.message);
            }
        }
    },

    // 刷新类型列表
    refreshTypeList() {
        const listContainer = document.getElementById('team-type-list');
        if (listContainer) {
            listContainer.innerHTML = this.renderTeamTypeList();
        }
        
        // 如果在团队类型页面，也刷新页面列表
        const pageListContainer = document.getElementById('team-types-list');
        if (pageListContainer) {
            pageListContainer.innerHTML = this.renderTeamTypeList();
        }
    },

    // 刷新团队类型页面
    async refreshList() {
        try {
            await this.loadTeamTypes();
            this.refreshTypeList();
            Utils.toast.success('团队类型列表已刷新');
        } catch (error) {
            console.error('刷新团队类型列表失败:', error);
            Utils.toast.error('刷新失败：' + error.message);
        }
    },

    // 获取团队类型名称
    getTypeName(typeId) {
        const type = this.teamTypes.find(t => t.id === typeId);
        return type ? type.name : '未知类型';
    },

    // 获取所有团队类型选项
    getTypeOptions() {
        return this.teamTypes.map(type => ({
            value: type.id,
            label: type.name
        }));
    }
};
// 活动管理器
window.ActivityManager = {
    selectedActivities: new Set(),

    // 初始化
    init() {
        this.selectedActivities.clear();
    },

    // 搜索处理
    handleSearch: Utils.debounce(function (value) {
        const params = Utils.url.getParams();
        params.search = value || undefined;
        params.page = 1; // 重置到第一页
        Utils.url.setParams(params);
        Router.navigate('/activities');
    }, 500),

    // 筛选处理
    handleFilter(key, value) {
        const params = Utils.url.getParams();
        params[key] = value || undefined;
        params.page = 1; // 重置到第一页
        Utils.url.setParams(params);
        Router.navigate('/activities');
    },

    // 翻页处理
    changePage(page) {
        const params = Utils.url.getParams();
        params.page = page;
        Utils.url.setParams(params);
        Router.navigate('/activities');
    },

    // 刷新列表
    refreshList() {
        // 强制刷新活动列表页面
        Router.navigate('/activities', { force: true });
    },

    // 查看活动详情
    viewActivity(id) {
        Router.navigate(`/activities/${id}`);
    },

    // 显示创建活动模态框
    async showCreateModal() {
        try {
            // 获取团队列表用于选择
            const teamsResponse = await API.teams.getList({ limit: 100 });
            const teams = teamsResponse.data?.teams || [];
            
            // 获取所有活动类型（从API获取真实数据）
            let allTypes = [];
            try {
                const typesResponse = await API.activities.getTypes();
                if (typesResponse.success) {
                    allTypes = typesResponse.data || [];
                    console.log('ActivityManager: 成功加载活动类型:', allTypes);
                } else {
                    console.warn('ActivityManager: 加载活动类型失败:', typesResponse.message);
                    // 降级到默认类型
                    allTypes = [
                        { value: 'other', label: '其他' },
                        { value: 'meeting', label: '会议' },
                        { value: 'training', label: '培训' }
                    ];
                }
            } catch (error) {
                console.error('ActivityManager: 获取活动类型失败:', error);
                // 降级到默认类型
                allTypes = [
                    { value: 'other', label: '其他' },
                    { value: 'meeting', label: '会议' },
                    { value: 'training', label: '培训' }
                ];
            }

            const modalContent = `
                <form id="create-activity-form">
                    <div class="form-group">
                        <label for="create-team-id">所属团队</label>
                        <select id="create-team-id" name="team_id" class="form-control">
                            <option value="">请选择团队</option>
                            ${teams.map(team => `<option value="${team.id}">${team.name}</option>`).join('')}
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label for="create-title">活动标题 *</label>
                        <input type="text" id="create-title" name="title" required 
                               placeholder="请输入活动标题" maxlength="200" class="form-control">
                    </div>
                    
                    <div class="form-group">
                        <label for="create-type">活动类型</label>
                        <select id="create-type" name="type" class="form-control">
                            <option value="other">其他</option>
                            ${allTypes.map(type => `<option value="${type.value}">${type.label}</option>`).join('')}
                        </select>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group col-md-6">
                            <label for="create-start-time">开始时间</label>
                            <input type="datetime-local" id="create-start-time" name="start_time" class="form-control">
                        </div>
                        <div class="form-group col-md-6">
                            <label for="create-end-time">结束时间</label>
                            <input type="datetime-local" id="create-end-time" name="end_time" class="form-control">
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label for="create-location">活动地点</label>
                        <input type="text" id="create-location" name="location" 
                               placeholder="请输入活动地点（可选）" maxlength="255" class="form-control">
                    </div>
                    
                    <div class="form-group">
                        <label for="create-max-participants">最大参与人数</label>
                        <input type="number" id="create-max-participants" name="max_participants" 
                               placeholder="不限制请留空" min="1" class="form-control">
                    </div>
                    
                    <div class="form-group">
                        <label for="create-description">活动描述</label>
                        <textarea id="create-description" name="description" rows="4" 
                                  placeholder="请输入活动描述（可选）" maxlength="2000" class="form-control"></textarea>
                    </div>
                </form>
            `;

            Components.createModal({
                title: '创建活动',
                content: modalContent,
                modalType: 'activity-create',
                footer: `
                    <button type="button" class="btn btn-secondary" onclick="this.closest('.modal-overlay').querySelector('.modal-close').click()">
                        取消
                    </button>
                    <button type="button" class="btn btn-primary" onclick="ActivityManager.createActivity()">
                        <i class="fas fa-plus"></i>
                        创建活动
                    </button>
                `
            });

        } catch (error) {
            Utils.toast.error(`获取团队列表失败: ${error.message}`);
        }
    },

    // 创建活动
    async createActivity() {
        console.log('ActivityManager.createActivity 被调用');
        const form = document.getElementById('create-activity-form');
        if (!form) {
            console.error('找不到表单 create-activity-form');
            alert('表单不存在，请刷新页面重试');
            return;
        }
        console.log('找到表单:', form);
        const formData = new FormData(form);

        const activityData = {
            team_id: formData.get('team_id'),
            title: formData.get('title'),
            type: formData.get('type'),
            start_time: formData.get('start_time'),
            end_time: formData.get('end_time'),
            location: formData.get('location') || '',
            max_participants: formData.get('max_participants') ? parseInt(formData.get('max_participants')) : null,
            description: formData.get('description') || ''
        };

        // 表单验证 - 只验证活动标题
        if (!activityData.title) {
            Utils.toast.error('请填写活动标题');
            return;
        }

        // 设置默认值
        if (!activityData.type || activityData.type.trim() === '') {
            activityData.type = 'other';
        }
        
        // 如果没有选择团队，获取第一个可用团队
        if (!activityData.team_id || activityData.team_id.trim() === '') {
            const teamsResponse = await API.teams.getList();
            const teams = teamsResponse.success ? teamsResponse.data : [];
            if (teams.length > 0) {
                activityData.team_id = teams[0].id;
            }
        }
        
        // 时间字段处理：用户不填就留空，不设置默认值
        if (!activityData.start_time || activityData.start_time.trim() === '') {
            activityData.start_time = null;
        }
        
        if (!activityData.end_time || activityData.end_time.trim() === '') {
            activityData.end_time = null;
        }

        // 时间验证（只有当用户填写了时间时才验证）
        if (activityData.start_time && activityData.end_time) {
            const startTime = new Date(activityData.start_time);
            const endTime = new Date(activityData.end_time);
            if (endTime <= startTime) {
                Utils.toast.error('结束时间必须晚于开始时间');
                return;
            }
        }

        try {
            console.log('准备创建活动，数据:', activityData);
            const response = await API.activities.create(activityData);
            console.log('API响应:', response);

            if (response.success) {
                console.log('活动创建成功');
                Utils.toast.success('活动创建成功');

                // 关闭模态框
                const modal = document.querySelector('.modal-overlay.show');
                if (modal) {
                    modal.querySelector('.modal-close').click();
                }

                // 刷新列表
                this.refreshList();
                
                // 如果在活动管理页面，也刷新activitiesManager
                if (window.activitiesManager && typeof window.activitiesManager.refreshList === 'function') {
                    console.log('刷新activitiesManager列表');
                    window.activitiesManager.refreshList();
                }
            } else {
                throw new Error(response.message || '创建活动失败');
            }
        } catch (error) {
            console.error('创建活动失败:', error);
            Utils.toast.error(`创建活动失败: ${error.message}`);
        }
    },

    // 编辑活动
    async editActivity(id) {
        try {
            // 获取活动详情
            const response = await API.activities.getDetail(id);
            const activity = response.data;

            // 获取团队列表
            const teamsResponse = await API.teams.getList({ limit: 100 });
            const teams = teamsResponse.data?.teams || [];
            
            // 获取所有活动类型（包括自定义类型）
            // TODO: 将硬编码替换为从API获取的系统默认类型
            const defaultTypesTemp = [
                { value: 'meeting', label: '会议' },
                { value: 'event', label: '活动' },
                { value: 'training', label: '培训' },
                { value: 'other', label: '其他' }
            ];
            const customTypes = Utils.storage.get('custom_activity_types', []);
            const allTypes = [...defaultTypesTemp, ...customTypes];

            // 格式化时间为datetime-local格式
            const formatDateTimeLocal = (dateStr) => {
                const date = new Date(dateStr);
                return date.toISOString().slice(0, 16);
            };

            const modalContent = `
                <form id="edit-activity-form">
                    <input type="hidden" name="id" value="${activity.id}">
                    
                    <div class="form-group">
                        <label for="edit-team-id">所属团队 *</label>
                        <select id="edit-team-id" name="team_id" required class="form-control">
                            <option value="">请选择团队</option>
                            ${teams.map(team => `
                                <option value="${team.id}" ${team.id === activity.team_id ? 'selected' : ''}>
                                    ${team.name}
                                </option>
                            `).join('')}
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label for="edit-title">活动标题 *</label>
                        <input type="text" id="edit-title" name="title" required 
                               value="${activity.title}" placeholder="请输入活动标题" 
                               maxlength="200" class="form-control">
                    </div>
                    
                    <div class="form-group">
                        <label for="edit-type">活动类型 *</label>
                        <select id="edit-type" name="type" required class="form-control">
                            ${allTypes.map(type => `
                                <option value="${type.value}" ${activity.type === type.value ? 'selected' : ''}>
                                    ${type.label}
                                </option>
                            `).join('')}
                        </select>
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group col-md-6">
                            <label for="edit-start-time">开始时间 *</label>
                            <input type="datetime-local" id="edit-start-time" name="start_time" required 
                                   value="${formatDateTimeLocal(activity.start_time)}" class="form-control">
                        </div>
                        <div class="form-group col-md-6">
                            <label for="edit-end-time">结束时间 *</label>
                            <input type="datetime-local" id="edit-end-time" name="end_time" required 
                                   value="${formatDateTimeLocal(activity.end_time)}" class="form-control">
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label for="edit-location">活动地点</label>
                        <input type="text" id="edit-location" name="location" 
                               value="${activity.location || ''}" placeholder="请输入活动地点（可选）" 
                               maxlength="255" class="form-control">
                    </div>
                    
                    <div class="form-group">
                        <label for="edit-max-participants">最大参与人数</label>
                        <input type="number" id="edit-max-participants" name="max_participants" 
                               value="${activity.max_participants || ''}" placeholder="不限制请留空" 
                               min="1" class="form-control">
                    </div>
                    
                    <div class="form-group">
                        <label for="edit-status">活动状态 *</label>
                        <select id="edit-status" name="status" required class="form-control">
                            <option value="draft" ${activity.status === 'draft' ? 'selected' : ''}>草稿</option>
                            <option value="published" ${activity.status === 'published' ? 'selected' : ''}>已发布</option>
                            <option value="ongoing" ${activity.status === 'ongoing' ? 'selected' : ''}>进行中</option>
                            <option value="completed" ${activity.status === 'completed' ? 'selected' : ''}>已完成</option>
                            <option value="cancelled" ${activity.status === 'cancelled' ? 'selected' : ''}>已取消</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label for="edit-description">活动描述</label>
                        <textarea id="edit-description" name="description" rows="4" 
                                  placeholder="请输入活动描述（可选）" maxlength="2000" class="form-control">${activity.description || ''}</textarea>
                    </div>
                </form>
            `;

            Components.createModal({
                title: '编辑活动',
                content: modalContent,
                modalType: 'activity-edit',
                footer: `
                    <button type="button" class="btn btn-secondary" onclick="this.closest('.modal-overlay').querySelector('.modal-close').click()">
                        取消
                    </button>
                    <button type="button" class="btn btn-primary" onclick="ActivityManager.updateActivity()">
                        <i class="fas fa-save"></i>
                        保存更改
                    </button>
                `
            });

        } catch (error) {
            Utils.toast.error(`获取活动信息失败: ${error.message}`);
        }
    },

    // 更新活动
    async updateActivity() {
        console.log('ActivityManager.updateActivity 被调用');
        const form = document.getElementById('edit-activity-form');
        if (!form) {
            console.error('找不到表单 edit-activity-form');
            alert('表单不存在，请刷新页面重试');
            return;
        }
        console.log('找到编辑表单:', form);
        const formData = new FormData(form);

        const activityData = {
            team_id: formData.get('team_id'),
            title: formData.get('title'),
            type: formData.get('type'),
            start_time: formData.get('start_time'),
            end_time: formData.get('end_time'),
            location: formData.get('location') || '',
            max_participants: formData.get('max_participants') ? parseInt(formData.get('max_participants')) : null,
            status: formData.get('status'),
            description: formData.get('description') || ''
        };

        const activityId = formData.get('id');

        // 表单验证
        if (!activityData.team_id || !activityData.title || !activityData.type ||
            !activityData.start_time || !activityData.end_time || !activityData.status) {
            Utils.toast.error('请填写所有必填字段');
            return;
        }

        // 时间验证
        const startTime = new Date(activityData.start_time);
        const endTime = new Date(activityData.end_time);

        if (endTime <= startTime) {
            Utils.toast.error('结束时间必须晚于开始时间');
            return;
        }

        try {
            console.log('准备更新活动，ID:', activityId, '数据:', activityData);
            const response = await API.activities.update(activityId, activityData);
            console.log('更新API响应:', response);

            if (response.success) {
                console.log('活动更新成功');
                Utils.toast.success('活动更新成功');

                // 关闭模态框
                const modal = document.querySelector('.modal-overlay.show');
                if (modal) {
                    modal.querySelector('.modal-close').click();
                }

                // 刷新列表
                this.refreshList();
            } else {
                throw new Error(response.message || '更新活动失败');
            }
        } catch (error) {
            console.error('更新活动失败:', error);
            Utils.toast.error(`更新活动失败: ${error.message}`);
        }
    },

    // 删除活动
    async deleteActivity(id) {
        console.log('ActivityManager.deleteActivity 被调用，ID:', id);
        if (!confirm('确定要删除该活动吗？此操作不可恢复！')) {
            return;
        }

        try {
            console.log('准备删除活动，ID:', id);
            const response = await API.activities.delete(id);
            console.log('删除API响应:', response);

            if (response.success) {
                console.log('活动删除成功');
                Utils.toast.success('活动删除成功');
                this.refreshList();
            } else {
                throw new Error(response.message || '活动删除失败');
            }
        } catch (error) {
            console.error('活动删除失败:', error);
            Utils.toast.error(`活动删除失败: ${error.message}`);
        }
    },

    // 显示活动类型管理器
    async showActivityTypeManager() {
        try {
            // 获取活动类型列表（从localStorage获取自定义类型）
            // TODO: 将硬编码替换为从API获取的系统默认类型
            const defaultTypesTemp = [
                { value: 'meeting', label: '会议' },
                { value: 'event', label: '活动' },
                { value: 'training', label: '培训' },
                { value: 'other', label: '其他' }
            ];
            
            // 获取自定义活动类型
            const customTypes = Utils.storage.get('custom_activity_types', []);
            const activityTypes = [...defaultTypesTemp, ...customTypes];

            const modalContent = `
                <div class="activity-type-manager">
                    <div class="activity-type-list">
                        <h5>当前活动类型</h5>
                        <div class="type-list" style="max-height: 300px; overflow-y: auto;">
                            ${activityTypes.map(type => {
                                const isDefault = ['meeting', 'event', 'training', 'other'].includes(type.value);
                                return `
                                <div class="type-item" style="display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; border: 1px solid #e9ecef; border-radius: 4px; margin-bottom: 8px;">
                                    <div>
                                        <strong>${type.label}</strong>
                                        <small style="color: #6c757d; margin-left: 8px;">(${type.value})</small>
                                        ${isDefault ? '<span style="color: #28a745; margin-left: 8px; font-size: 12px;">系统默认</span>' : '<span style="color: #007bff; margin-left: 8px; font-size: 12px;">自定义</span>'}
                                    </div>
                                    <div class="type-actions">
                                        <button class="btn btn-sm btn-outline-primary" onclick="ActivityManager.editActivityType('${type.value}', '${type.label}')" title="编辑" ${isDefault ? 'disabled' : ''}>
                                            <i class="fas fa-edit"></i>
                                        </button>
                                        <button class="btn btn-sm btn-outline-danger" onclick="ActivityManager.deleteActivityType('${type.value}')" title="删除" ${isDefault ? 'disabled' : ''}>
                                            <i class="fas fa-trash"></i>
                                        </button>
                                    </div>
                                </div>
                                `;
                            }).join('')}
                        </div>
                    </div>
                    
                    <hr style="margin: 20px 0;">
                    
                    <div class="add-type-form">
                        <h5>添加新类型</h5>
                        <form id="add-activity-type-form">
                            <div class="form-row">
                                <div class="form-group col-md-6">
                                    <label for="new-type-value">类型值 *</label>
                                    <input type="text" id="new-type-value" name="value" required 
                                           placeholder="例如: workshop" class="form-control">
                                    <small class="form-text text-muted">只能包含字母、数字和下划线</small>
                                </div>
                                <div class="form-group col-md-6">
                                    <label for="new-type-label">显示名称 *</label>
                                    <input type="text" id="new-type-label" name="label" required 
                                           placeholder="例如: 工作坊" class="form-control">
                                </div>
                            </div>
                            <button type="button" class="btn btn-success" onclick="ActivityManager.addActivityType()">
                                <i class="fas fa-plus"></i>
                                添加类型
                            </button>
                        </form>
                    </div>
                    
                    <div class="alert alert-info" style="margin-top: 15px;">
                        <i class="fas fa-info-circle"></i>
                        <strong>说明：</strong>系统默认的活动类型（会议、活动、培训、其他）不能删除，但可以编辑显示名称。
                    </div>
                </div>
            `;

            Components.createModal({
                title: '活动类型管理',
                content: modalContent,
                size: 'large',
                footer: `
                    <button type="button" class="btn btn-secondary" onclick="this.closest('.modal-overlay').querySelector('.modal-close').click()">
                        关闭
                    </button>
                `
            });

        } catch (error) {
            Utils.toast.error(`获取活动类型失败: ${error.message}`);
        }
    },

    // 添加活动类型
    async addActivityType() {
        const form = document.getElementById('add-activity-type-form');
        const formData = new FormData(form);

        const typeData = {
            value: formData.get('value').trim(),
            label: formData.get('label').trim()
        };

        // 表单验证
        if (!typeData.value || !typeData.label) {
            this.showFormError('请填写所有必填字段');
            return;
        }

        // 验证类型值格式
        if (!/^[a-zA-Z0-9_]+$/.test(typeData.value)) {
            this.showFormError('类型值只能包含字母、数字和下划线');
            return;
        }

        // 检查是否与系统默认类型冲突
        // TODO: 将硬编码替换为从API获取的系统默认类型值列表
        const defaultTypesTemp = ['meeting', 'event', 'training', 'other'];
        if (defaultTypesTemp.includes(typeData.value)) {
            this.showFormError('不能添加与系统默认类型相同的类型值');
            return;
        }

        try {
            // 获取现有的自定义活动类型
            const customTypes = Utils.storage.get('custom_activity_types', []);
            
            // 检查是否已存在相同的类型值
            if (customTypes.some(type => type.value === typeData.value)) {
                this.showFormError('该类型值已存在，请使用其他值');
                return;
            }
            
            // 检查是否已存在相同的类型名称
            if (customTypes.some(type => type.label === typeData.label)) {
                this.showFormError('该类型名称已存在，请使用其他名称');
                return;
            }
            
            // 添加新的活动类型
            customTypes.push(typeData);
            Utils.storage.set('custom_activity_types', customTypes);
            
            Utils.toast.success('活动类型添加成功');
            
            // 重新显示活动类型管理器
            const modal = document.querySelector('.modal-overlay.show');
            if (modal) {
                modal.querySelector('.modal-close').click();
            }
            
            setTimeout(() => {
                this.showActivityTypeManager();
            }, 300);

        } catch (error) {
            Utils.toast.error(`添加活动类型失败: ${error.message}`);
        }
    },

    // 编辑活动类型
    async editActivityType(value, currentLabel) {
        const newLabel = prompt('请输入新的显示名称:', currentLabel);
        
        if (newLabel && newLabel.trim() !== currentLabel) {
            try {
                // 检查是否为默认类型（默认类型不能编辑）
                // TODO: 将硬编码替换为从API获取的系统默认类型值列表
                const defaultTypesTemp = ['meeting', 'event', 'training', 'other'];
                if (defaultTypesTemp.includes(value)) {
                    Utils.toast.warning('系统默认类型不能编辑');
                    return;
                }
                
                // 更新自定义活动类型
                const customTypes = Utils.storage.get('custom_activity_types', []);
                const typeIndex = customTypes.findIndex(type => type.value === value);
                
                if (typeIndex !== -1) {
                    customTypes[typeIndex].label = newLabel.trim();
                    Utils.storage.set('custom_activity_types', customTypes);
                    Utils.toast.success('活动类型更新成功');
                } else {
                    Utils.toast.error('找不到要编辑的活动类型');
                    return;
                }
                
                // 重新显示活动类型管理器
                const modal = document.querySelector('.modal-overlay.show');
                if (modal) {
                    modal.querySelector('.modal-close').click();
                }
                
                setTimeout(() => {
                    this.showActivityTypeManager();
                }, 300);

            } catch (error) {
                Utils.toast.error(`更新活动类型失败: ${error.message}`);
            }
        }
    },

    // 删除活动类型
    async deleteActivityType(value) {
        // 检查是否为系统默认类型
        // TODO: 将硬编码替换为从API获取的系统默认类型值列表
        const defaultTypesTemp = ['meeting', 'event', 'training', 'other'];
        if (defaultTypesTemp.includes(value)) {
            Utils.toast.warning('系统默认的活动类型不能删除');
            return;
        }

        if (!confirm(`确定要删除活动类型"${value}"吗？\n\n注意：删除后使用此类型的活动将显示为未知类型。`)) {
            return;
        }

        try {
            // 删除自定义活动类型
            const customTypes = Utils.storage.get('custom_activity_types', []);
            const filteredTypes = customTypes.filter(type => type.value !== value);
            
            if (filteredTypes.length === customTypes.length) {
                Utils.toast.error('找不到要删除的活动类型');
                return;
            }
            
            Utils.storage.set('custom_activity_types', filteredTypes);
            Utils.toast.success('活动类型删除成功');
            
            // 重新显示活动类型管理器
            const modal = document.querySelector('.modal-overlay.show');
            if (modal) {
                modal.querySelector('.modal-close').click();
            }
            
            setTimeout(() => {
                this.showActivityTypeManager();
            }, 300);

        } catch (error) {
            Utils.toast.error(`删除活动类型失败: ${error.message}`);
        }
    },

    // 显示表单错误（在模态框内显示）
    showFormError(message) {
        // 清除之前的错误提示
        const existingError = document.querySelector('.form-error-alert');
        if (existingError) {
            existingError.remove();
        }

        // 创建醒目的错误提示
        const errorHtml = `
            <div class="form-error-alert alert alert-danger alert-dismissible fade show" role="alert" style="
                margin: 15px 0;
                border-left: 4px solid #dc3545;
                background-color: #f8d7da;
                border-color: #f5c6cb;
                font-weight: 500;
                animation: shake 0.5s ease-in-out;
            ">
                <i class="fas fa-exclamation-triangle me-2"></i>
                <strong>错误：</strong>${message}
                <button type="button" class="btn-close" onclick="this.parentElement.remove()"></button>
            </div>
        `;

        // 在表单顶部显示错误
        const form = document.getElementById('add-activity-type-form');
        if (form) {
            form.insertAdjacentHTML('afterbegin', errorHtml);
            
            // 滚动到错误提示位置
            const errorAlert = form.querySelector('.form-error-alert');
            if (errorAlert) {
                errorAlert.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                
                // 添加震动效果的CSS
                if (!document.getElementById('shake-animation')) {
                    const style = document.createElement('style');
                    style.id = 'shake-animation';
                    style.textContent = `
                        @keyframes shake {
                            0%, 100% { transform: translateX(0); }
                            25% { transform: translateX(-5px); }
                            75% { transform: translateX(5px); }
                        }
                    `;
                    document.head.appendChild(style);
                }
            }
        } else {
            // 降级到普通toast提示
            Utils.toast.error(message);
        }
    }
};


// ActivityManager已经在上面定义为window.ActivityManager，无需重复定义

// 将AA活动功能添加到ActivityManager中
ActivityManager.showAAActivityModal = async function() {
    console.log('🎯 显示AA活动创建模态框');
    
    try {
        // 确保所需的API和组件存在
        if (typeof API === 'undefined') {
            throw new Error('API未加载，请刷新页面重试');
        }
        
        // 获取团队列表和活动类型
        const [teamsResponse, typesResponse] = await Promise.all([
            API.teams.getList(),
            API.activities.getTypes()
        ]);

        const teams = teamsResponse.success ? (teamsResponse.data?.teams || teamsResponse.data || []) : [];
        const activityTypes = typesResponse.success ? typesResponse.data : [];

        console.log('加载团队数据:', teams.length);
        console.log('加载活动类型:', activityTypes.length);

        const modalContent = `
            <form id="aaActivityForm">
                <div class="alert alert-info mb-4">
                    <i class="fas fa-info-circle me-2"></i>
                    <strong>AA制活动</strong> - 支持费用分摊的团队活动
                </div>
                
                <div class="row">
                    <div class="col-md-6">
                        <div class="form-group mb-3">
                            <label for="aaActivityTitle" class="form-label">活动标题 *</label>
                            <input type="text" class="form-control" id="aaActivityTitle" name="title" required 
                                   placeholder="例如：公司团建聚餐">
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="form-group mb-3">
                            <label for="aaActivityType" class="form-label">活动类型</label>
                            <select class="form-control" id="aaActivityType" name="type">
                                <option value="team_building">团建</option>
                                <option value="other">其他</option>
                                <option value="meeting">会议</option>
                                <option value="training">培训</option>
                                <option value="workshop">工作坊</option>
                                <option value="presentation">演示</option>
                                ${activityTypes.map(type => `
                                    <option value="${type.value}">${type.label}</option>
                                `).join('')}
                            </select>
                        </div>
                    </div>
                </div>
                
                <div class="row">
                    <div class="col-md-6">
                        <div class="form-group mb-3">
                            <label for="aaActivityTeam" class="form-label">所属团队</label>
                            <select class="form-control" id="aaActivityTeam" name="team_id">
                                <option value="">请选择团队</option>
                                ${teams.map(team => `
                                    <option value="${team.id}">${team.name}</option>
                                `).join('')}
                            </select>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="form-group mb-3">
                            <label for="aaActivityLocation" class="form-label">活动地点</label>
                            <input type="text" class="form-control" id="aaActivityLocation" name="location" 
                                   placeholder="例如：公司餐厅">
                        </div>
                    </div>
                </div>
                
                <div class="row">
                    <div class="col-md-6">
                        <div class="form-group mb-3">
                            <label for="aaActivityStartTime" class="form-label">开始时间</label>
                            <input type="datetime-local" class="form-control" id="aaActivityStartTime" name="start_time">
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="form-group mb-3">
                            <label for="aaActivityEndTime" class="form-label">结束时间</label>
                            <input type="datetime-local" class="form-control" id="aaActivityEndTime" name="end_time">
                        </div>
                    </div>
                </div>
                
                <div class="form-group mb-4">
                    <label for="aaActivityDescription" class="form-label">活动描述</label>
                    <textarea class="form-control" id="aaActivityDescription" name="description" rows="3"
                              placeholder="描述活动内容、注意事项等"></textarea>
                </div>
                
                <!-- 💰 AA制费用设置区域 -->
                <div class="card" style="border: 2px solid #28a745; background: #f8fff9;">
                    <div class="card-header" style="background: #28a745; color: white;">
                        <h5 class="mb-0">
                            <i class="fas fa-money-bill-wave me-2"></i>
                            💰 AA制费用设置
                        </h5>
                        <small>设置活动费用和分摊方式</small>
                    </div>
                    <div class="card-body">
                        <div class="row">
                            <div class="col-md-6">
                                <div class="form-group mb-3">
                                    <label for="aaTotalCost" class="form-label">活动总费用 (元) *</label>
                                    <input type="number" class="form-control" id="aaTotalCost" name="total_cost" 
                                           step="0.01" min="0" placeholder="1000.00" value="1000"
                                           onchange="ActivityManager.calculateAACosts()" oninput="ActivityManager.calculateAACosts()">
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="form-group mb-3">
                                    <label for="aaOrganizerCost" class="form-label">发起人承担费用 (元)</label>
                                    <input type="number" class="form-control" id="aaOrganizerCost" name="organizer_cost" 
                                           step="0.01" min="0" placeholder="500.00" value="500"
                                           onchange="ActivityManager.calculateAACosts()" oninput="ActivityManager.calculateAACosts()">
                                </div>
                            </div>
                        </div>
                        
                        <div class="row">
                            <div class="col-md-6">
                                <div class="form-group mb-3">
                                    <label for="aaPaymentDeadline" class="form-label">支付截止时间</label>
                                    <input type="datetime-local" class="form-control" id="aaPaymentDeadline" name="payment_deadline">
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="form-group mb-3">
                                    <label for="aaMaxParticipants" class="form-label">最大参与人数</label>
                                    <input type="number" class="form-control" id="aaMaxParticipants" name="max_participants" 
                                           min="1" placeholder="10" value="10"
                                           onchange="ActivityManager.calculateAACosts()" oninput="ActivityManager.calculateAACosts()">
                                </div>
                            </div>
                        </div>
                        
                        <!-- 费用预览 -->
                        <div class="alert alert-success" id="aaCostPreview">
                            <h6 class="mb-3">💡 费用分摊预览</h6>
                            <div class="row text-center">
                                <div class="col-4">
                                    <div class="border-end">
                                        <h4 class="text-primary mb-1" id="aaOrganizerCostPreview">¥500.00</h4>
                                        <small class="text-muted">发起人承担</small>
                                    </div>
                                </div>
                                <div class="col-4">
                                    <div class="border-end">
                                        <h4 class="text-success mb-1" id="aaParticipantCostTotal">¥500.00</h4>
                                        <small class="text-muted">参与者总计</small>
                                    </div>
                                </div>
                                <div class="col-4">
                                    <h4 class="text-warning mb-1" id="aaCostPerPerson">¥50.00</h4>
                                    <small class="text-muted">每人应付</small>
                                </div>
                            </div>
                            <div class="text-center mt-2">
                                <small class="text-muted">
                                    <i class="fas fa-info-circle"></i>
                                    费用将根据实际报名人数重新计算
                                </small>
                            </div>
                        </div>
                        
                        <div class="form-group mb-0">
                            <label for="aaCostDescription" class="form-label">费用说明</label>
                            <textarea class="form-control" id="aaCostDescription" name="cost_description" rows="2"
                                      placeholder="例如：包含餐费、场地费、交通费等">包含餐费、场地费等所有费用</textarea>
                        </div>
                    </div>
                </div>
            </form>
        `;

        // 使用现有的模态框系统
        const modal = Components.createModal({
            title: '创建AA制活动',
            content: modalContent,
            modalType: 'aa-activity-create',
            footer: `
                <button type="button" class="btn btn-secondary" onclick="this.closest('.modal-overlay').querySelector('.modal-close').click()">
                    <i class="fas fa-times"></i>
                    取消
                </button>
                <button type="button" class="btn btn-success" onclick="ActivityManager.submitAAActivity()">
                    <i class="fas fa-money-bill-wave"></i>
                    创建AA活动
                </button>
            `
        });
        
        // 设置默认时间
        setTimeout(() => {
            const now = new Date();
            const startTime = new Date(now.getTime() + 60 * 60 * 1000); // +1小时
            const endTime = new Date(now.getTime() + 3 * 60 * 60 * 1000); // +3小时

            const formatDateTimeLocal = (date) => {
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                const hours = String(date.getHours()).padStart(2, '0');
                const minutes = String(date.getMinutes()).padStart(2, '0');
                return `${year}-${month}-${day}T${hours}:${minutes}`;
            };

            document.getElementById('aaActivityStartTime').value = formatDateTimeLocal(startTime);
            document.getElementById('aaActivityEndTime').value = formatDateTimeLocal(endTime);
            
            // 设置支付截止时间（活动开始前1天）
            const paymentDeadline = new Date(startTime.getTime() - 24 * 60 * 60 * 1000);
            document.getElementById('aaPaymentDeadline').value = formatDateTimeLocal(paymentDeadline);
            
            // 初始化费用计算
            ActivityManager.calculateAACosts();
        }, 100);
        
        console.log('✅ AA活动模态框显示成功！');
        
    } catch (error) {
        console.error('❌ 显示AA活动模态框失败:', error);
        alert('显示创建窗口失败: ' + error.message);
    }
};

// AA费用计算函数
ActivityManager.calculateAACosts = function() {
    const totalCostInput = document.getElementById('aaTotalCost');
    const organizerCostInput = document.getElementById('aaOrganizerCost');
    const maxParticipantsInput = document.getElementById('aaMaxParticipants');
    
    if (!totalCostInput || !organizerCostInput) return;
    
    const totalCost = parseFloat(totalCostInput.value) || 0;
    const organizerCost = parseFloat(organizerCostInput.value) || 0;
    const maxParticipants = parseInt(maxParticipantsInput?.value) || 10;
    
    // 计算各项费用
    const participantCostTotal = Math.max(0, totalCost - organizerCost);
    const costPerPerson = maxParticipants > 0 ? participantCostTotal / maxParticipants : 0;
    
    // 更新预览显示
    const organizerCostPreview = document.getElementById('aaOrganizerCostPreview');
    const participantCostTotalElem = document.getElementById('aaParticipantCostTotal');
    const costPerPersonPreview = document.getElementById('aaCostPerPerson');
    
    if (organizerCostPreview) organizerCostPreview.textContent = `¥${organizerCost.toFixed(2)}`;
    if (participantCostTotalElem) participantCostTotalElem.textContent = `¥${participantCostTotal.toFixed(2)}`;
    if (costPerPersonPreview) costPerPersonPreview.textContent = `¥${costPerPerson.toFixed(2)}`;
    
    console.log('💰 AA费用计算:', { totalCost, organizerCost, participantCostTotal, costPerPerson, maxParticipants });
};

// 提交AA活动函数
ActivityManager.submitAAActivity = async function() {
    console.log('🚀 提交AA活动');
    
    try {
        const form = document.getElementById('aaActivityForm');
        const formData = new FormData(form);
        
        const activityData = {
            title: formData.get('title').trim(),
            description: formData.get('description').trim(),
            type: formData.get('type'),
            team_id: formData.get('team_id'),
            start_time: formData.get('start_time'),
            end_time: formData.get('end_time'),
            location: formData.get('location').trim(),
            max_participants: formData.get('max_participants') ? parseInt(formData.get('max_participants')) : null,
            need_approval: false,
            // AA制费用相关字段
            total_cost: parseFloat(formData.get('total_cost')) || 0,
            organizer_cost: parseFloat(formData.get('organizer_cost')) || 0,
            payment_deadline: formData.get('payment_deadline') || null,
            cost_description: formData.get('cost_description') ? formData.get('cost_description').trim() : '',
            cost_sharing_type: 'equal',
            activity_status: 'published'
        };

        // 验证必填字段
        if (!activityData.title) {
            alert('请填写活动标题');
            return;
        }
        
        if (activityData.total_cost <= 0) {
            alert('请填写活动总费用');
            return;
        }

        // 验证费用
        if (activityData.organizer_cost > activityData.total_cost) {
            alert('发起人承担费用不能超过活动总费用');
            return;
        }

        console.log('🎯 发送AA活动数据:', activityData);

        // 使用AA制API创建活动
        const response = await API.activities.createWithCost(activityData);
        
        if (response.success) {
            alert('🎉 AA制活动创建成功！');
            
            // 关闭模态框
            const closeBtn = document.querySelector('.modal-overlay .modal-close');
            if (closeBtn) {
                closeBtn.click();
            }
            
            // 刷新页面
            location.reload();
        } else {
            alert('创建失败: ' + response.message);
        }
        
    } catch (error) {
        console.error('❌ 提交AA活动失败:', error);
        alert('创建失败: ' + error.message);
    }
};