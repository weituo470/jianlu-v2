// 路由管理文件

window.Router = {
    // 当前路由
    currentRoute: null,

    // 路由配置
    routes: {
        '/login': {
            title: '登录',
            component: 'LoginPage',
            requireAuth: false
        },
        '/dashboard': {
            title: '仪表板',
            component: 'DashboardPage',
            requireAuth: true,
            permissions: ['dashboard:read']
        },
        '/users': {
            title: '用户管理',
            component: 'UsersPage',
            requireAuth: true,
            permissions: ['user:read']
        },

        '/users/:id': {
            title: '用户详情',
            component: 'UserDetailPage',
            requireAuth: true,
            permissions: ['user:read']
        },
        '/teams': {
            title: '团队管理',
            component: 'TeamsPage',
            requireAuth: true,
            permissions: ['team:read']
        },
        '/teams/list': {
            title: '团队列表',
            component: 'TeamsListPage',
            requireAuth: true,
            permissions: ['team:read']
        },
        '/teams/types': {
            title: '团队类型',
            component: 'TeamTypesPageNew',
            requireAuth: true,
            permissions: ['team:read']
        },

        '/activities': {
            title: '活动管理',
            component: 'ActivitiesPage',
            requireAuth: true,
            permissions: ['activity:read']
        },
        '/activities/list': {
            title: '活动列表',
            component: 'ActivitiesListPage',
            requireAuth: true,
            permissions: ['activity:read']
        },
        '/activities/types': {
            title: '活动类型',
            component: 'ActivityTypesPage',
            requireAuth: true,
            permissions: ['activity:read']
        },
        '/activities/detail/:id': {
            title: '活动详情',
            component: 'ActivityDetailPage',
            requireAuth: true,
            permissions: ['activity:read']
        },
        '/content': {
            title: '内容管理',
            component: 'ContentPage',
            requireAuth: true,
            permissions: ['content:read']
        },
        '/content/banners': {
            title: '轮播图管理',
            component: 'BannersPage',
            requireAuth: true,
            permissions: ['content:read']
        },
        '/settings': {
            title: '系统设置',
            component: 'SettingsPage',
            requireAuth: true,
            permissions: ['system:read']
        }
    },

    // 初始化路由
    init() {
        // 监听浏览器前进后退
        window.addEventListener('popstate', (e) => {
            this.handleRoute(window.location.pathname);
        });

        // 处理初始路由
        const path = window.location.pathname;
        this.handleRoute(path === '/' ? '/dashboard' : path);
    },

    // 导航到指定路由
    navigate(path, options = {}) {
        if (path === this.currentRoute && !options.force) return;

        window.history.pushState({}, '', path);
        this.handleRoute(path, options);
    },

    // 处理路由
    async handleRoute(path, options = {}) {
        console.log('路由导航:', path);

        // 防止重复处理相同路由（除非强制刷新）
        if (path === this.currentRoute && !options.force) {
            return;
        }

        // 查找匹配的路由
        const route = this.findRoute(path);
        if (!route) {
            console.error('路由未找到:', path);
            if (path !== '/dashboard') {
                this.navigate('/dashboard');
            }
            return;
        }

        // 权限检查
        if (route.requireAuth !== false) {
            if (!Auth.requireAuth()) return;

            if (route.permissions && !Auth.hasPermission(route.permissions)) {
                Utils.toast.error('权限不足，无法访问');
                if (path !== '/dashboard') {
                    this.navigate('/dashboard');
                }
                return;
            }
        }

        // 如果已登录用户访问登录页，重定向到仪表板
        if (path === '/login' && Auth.isLoggedIn()) {
            if (this.currentRoute !== '/dashboard') {
                this.navigate('/dashboard');
            }
            return;
        }

        this.currentRoute = path;

        // 更新页面标题
        document.title = `${route.title} - ${AppConfig.APP_NAME}`;

        // 显示/隐藏相应的页面容器
        this.togglePageContainers(path);

        // 渲染页面内容
        await this.renderPage(route, path);

        // 更新导航状态
        if (path !== '/login') {
            Components.updateActiveMenu(path);
            this.updateBreadcrumb(route, path);
        }
    },

    // 查找匹配的路由
    findRoute(path) {
        // 精确匹配
        if (this.routes[path]) {
            return { ...this.routes[path], params: {} };
        }

        // 参数匹配
        for (const routePath in this.routes) {
            const params = this.matchRoute(routePath, path);
            if (params) {
                return { ...this.routes[routePath], params };
            }
        }

        return null;
    },

    // 匹配路由参数
    matchRoute(routePath, actualPath) {
        const routeParts = routePath.split('/');
        const actualParts = actualPath.split('/');

        if (routeParts.length !== actualParts.length) {
            return null;
        }

        const params = {};

        for (let i = 0; i < routeParts.length; i++) {
            const routePart = routeParts[i];
            const actualPart = actualParts[i];

            if (routePart.startsWith(':')) {
                // 参数部分
                const paramName = routePart.slice(1);
                params[paramName] = actualPart;
            } else if (routePart !== actualPart) {
                // 不匹配
                return null;
            }
        }

        return params;
    },

    // 获取当前路由参数
    getCurrentParams() {
        const route = this.findRoute(this.currentRoute);
        return route ? route.params : {};
    },

    // 切换页面容器显示状态
    togglePageContainers(path) {
        const loginPage = document.getElementById('login-page');
        const mainApp = document.getElementById('main-app');

        if (path === '/login') {
            loginPage.style.display = 'flex';
            mainApp.style.display = 'none';
        } else {
            loginPage.style.display = 'none';
            mainApp.style.display = 'grid';
        }
    },

    // 渲染页面内容
    async renderPage(route, path) {
        const pageContent = document.getElementById('page-content');
        if (!pageContent) return;

        // 显示加载状态
        pageContent.innerHTML = Components.createLoading('页面加载中...');

        try {
            // 根据组件名称渲染不同页面
            switch (route.component) {
                case 'DashboardPage':
                    await this.renderDashboard();
                    break;
                case 'UsersPage':
                    await this.renderUsers();
                    break;

                case 'UserDetailPage':
                    await this.renderUserDetail(route.params.id);
                    break;
                case 'TeamsPage':
                    await this.renderTeams();
                    break;
                case 'TeamsListPage':
                    await this.renderTeamsList();
                    break;
                case 'TeamTypesPage':
                    await this.renderTeamTypes();
                    break;
                case 'TeamTypesPageNew':
                    await this.renderTeamTypesNew();
                    break;

                case 'ActivitiesPage':
                    await this.renderActivities();
                    break;
                case 'ActivitiesListPage':
                    await this.renderActivitiesList();
                    break;
                case 'ActivityDetailPage':
                    await this.renderActivityDetail();
                    break;
                case 'ActivityTypesPage':
                    await this.renderActivityTypes();
                    break;
                case 'ContentPage':
                    await this.renderContent();
                    break;
                case 'BannersPage':
                    await this.renderBanners();
                    break;
                case 'SettingsPage':
                    await this.renderSettings();
                    break;
                default:
                    pageContent.innerHTML = `
                        <div class="empty-state">
                            <div class="empty-state-icon">
                                <i class="fas fa-exclamation-triangle"></i>
                            </div>
                            <div class="empty-state-title">页面未实现</div>
                            <div class="empty-state-description">该页面正在开发中</div>
                        </div>
                    `;
            }
        } catch (error) {
            console.error('页面渲染失败:', error);
            pageContent.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">
                        <i class="fas fa-exclamation-circle"></i>
                    </div>
                    <div class="empty-state-title">页面加载失败</div>
                    <div class="empty-state-description">${error.message}</div>
                </div>
            `;
        }
    },

    // 渲染仪表板页面
    async renderDashboard() {
        const pageContent = document.getElementById('page-content');

        try {
            // 显示加载状态
            pageContent.innerHTML = Components.createLoading('加载仪表板数据...');

            const currentUser = Auth.getCurrentUser();
            const isAdmin = Auth.hasPermission('user:read');

            // 根据用户角色获取不同的数据
            let users = [];
            let stats = [];
            let recentActivities = [];

            if (isAdmin) {
                // 管理员：获取完整的仪表板数据
                const [usersResponse, dashboardData] = await Promise.all([
                    API.users.getList({ page: 1, limit: 10 }),
                    this.getDashboardStats()
                ]);
                users = usersResponse.data || [];
                stats = dashboardData.stats;
                recentActivities = dashboardData.activities;
            } else {
                // 普通用户：获取个人相关数据
                stats = [
                    {
                        title: '我的资料',
                        value: '完整',
                        icon: 'fas fa-user',
                        color: 'primary',
                        description: '个人资料已完善'
                    },
                    {
                        title: '账户状态',
                        value: currentUser.status === 'active' ? '正常' : '异常',
                        icon: 'fas fa-shield-alt',
                        color: currentUser.status === 'active' ? 'success' : 'warning',
                        description: '账户运行状态'
                    },
                    {
                        title: '角色权限',
                        value: AppConfig.ROLE_NAMES_TEMP[currentUser.role] || currentUser.role,
                        icon: 'fas fa-key',
                        color: 'info',
                        description: '当前用户角色'
                    },
                    {
                        title: '注册时间',
                        value: Utils.date.format(currentUser.created_at, 'MM-DD'),
                        icon: 'fas fa-calendar',
                        color: 'secondary',
                        description: '账户创建日期'
                    }
                ];
                recentActivities = [
                    {
                        title: '登录系统',
                        time: '刚刚',
                        type: 'login'
                    }
                ];
            }

            pageContent.innerHTML = `
                <div class="dashboard">
                    <!-- 欢迎区域 -->
                    <div class="welcome-section" style="margin-bottom: 32px;">
                        <div class="card">
                            <div class="card-body" style="padding: 24px;">
                                <div style="display: flex; justify-content: space-between; align-items: center;">
                                    <div>
                                        <h2 style="margin: 0 0 8px 0; color: var(--text-primary);">
                                            欢迎回来，${Auth.getUserDisplayName() || Auth.getCurrentUser()?.username}！
                                        </h2>
                                        <p style="margin: 0; color: var(--text-secondary);">
                                            今天是 ${Utils.date.format(new Date(), 'YYYY年MM月DD日')}，祝您工作愉快！
                                        </p>
                                    </div>
                                    <div class="welcome-actions">
                                        <button class="btn btn-primary" onclick="location.reload()">
                                            <i class="fas fa-sync-alt"></i>
                                            刷新数据
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- 统计卡片 -->
                    <div class="dashboard-stats">
                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 24px; margin-bottom: 32px;">
                            ${stats.map(stat => Components.createStatCard(stat)).join('')}
                        </div>
                    </div>
                    
                    <!-- 主要内容区域 -->
                    <div class="dashboard-content">
                        ${isAdmin ? `
                            <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 24px;">
                                <!-- 管理员视图：左侧内容 -->
                                <div class="dashboard-main">
                                    <!-- 最近用户 -->
                                    <div class="card" style="margin-bottom: 24px;">
                                        <div class="card-header">
                                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                                <h3 class="card-title">最近注册用户</h3>
                                                <a href="#" onclick="Router.navigate('/users')" class="btn btn-sm btn-secondary">
                                                    查看全部
                                                </a>
                                            </div>
                                        </div>
                                        <div class="card-body">
                                            ${this.createRecentUsersTable(users)}
                                        </div>
                                    </div>
                                    
                                    <!-- 系统状态 -->
                                    <div class="card">
                                        <div class="card-header">
                                            <h3 class="card-title">系统状态</h3>
                                        </div>
                                        <div class="card-body">
                                            ${this.createSystemStatus()}
                                        </div>
                                    </div>
                                </div>
                                
                                <!-- 管理员视图：右侧边栏 -->
                                <div class="dashboard-sidebar">
                                    <!-- 快速操作 -->
                                    <div class="card" style="margin-bottom: 24px;">
                                        <div class="card-header">
                                            <h3 class="card-title">快速操作</h3>
                                        </div>
                                        <div class="card-body">
                                            ${this.createQuickActions()}
                                        </div>
                                    </div>
                                    
                                    <!-- 最近活动 -->
                                    <div class="card">
                                        <div class="card-header">
                                            <h3 class="card-title">最近活动</h3>
                                        </div>
                                        <div class="card-body">
                                            ${this.createRecentActivities(recentActivities)}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ` : `
                            <!-- 普通用户视图 -->
                            <div style="display: grid; grid-template-columns: 1fr; gap: 24px; max-width: 800px; margin: 0 auto;">
                                <!-- 个人信息卡片 -->
                                <div class="card">
                                    <div class="card-header">
                                        <h3 class="card-title">个人信息</h3>
                                    </div>
                                    <div class="card-body">
                                        <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px;">
                                            <div class="info-item">
                                                <label>用户名</label>
                                                <div class="info-value">${currentUser.username}</div>
                                            </div>
                                            <div class="info-item">
                                                <label>邮箱</label>
                                                <div class="info-value">${currentUser.email}</div>
                                            </div>
                                            <div class="info-item">
                                                <label>角色</label>
                                                <div class="info-value">${AppConfig.ROLE_NAMES_TEMP[currentUser.role] || currentUser.role}</div>
                                            </div>
                                            <div class="info-item">
                                                <label>状态</label>
                                                <div class="info-value">
                                                    <span class="badge badge-${currentUser.status === 'active' ? 'success' : 'warning'}">
                                                        ${currentUser.status === 'active' ? '正常' : '异常'}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                <!-- 快速操作 -->
                                <div class="card">
                                    <div class="card-header">
                                        <h3 class="card-title">快速操作</h3>
                                    </div>
                                    <div class="card-body">
                                        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;">
                                            <button class="btn btn-primary" onclick="Router.navigate('/profile')" style="padding: 16px; height: auto;">
                                                <i class="fas fa-user-edit" style="display: block; font-size: 24px; margin-bottom: 8px;"></i>
                                                <div>编辑个人资料</div>
                                                <small style="opacity: 0.8;">修改个人信息</small>
                                            </button>
                                            <button class="btn btn-secondary" onclick="Auth.logout()" style="padding: 16px; height: auto;">
                                                <i class="fas fa-sign-out-alt" style="display: block; font-size: 24px; margin-bottom: 8px;"></i>
                                                <div>退出登录</div>
                                                <small style="opacity: 0.8;">安全退出系统</small>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                
                                <!-- 系统信息 -->
                                <div class="card">
                                    <div class="card-header">
                                        <h3 class="card-title">系统信息</h3>
                                    </div>
                                    <div class="card-body">
                                        <div style="text-align: center; color: var(--text-secondary);">
                                            <p>欢迎使用${AppConfig.APP_NAME}</p>
                                            <p>版本: ${AppConfig.APP_VERSION}</p>
                                            <p>如有问题，请联系系统管理员</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        `}
                    </div>
                </div>
            `;

            // 初始化仪表板管理器
            if (typeof DashboardManager !== 'undefined') {
                DashboardManager.init();
            } else {
                console.warn('DashboardManager 未定义，跳过初始化');
            }

            // 添加查看用户函数到全局
            window.viewUser = (id) => {
                Router.navigate(`/users/${id}`);
            };

        } catch (error) {
            throw new Error(`仪表板数据加载失败: ${error.message}`);
        }
    },

    // 渲染用户管理页面
    async renderUsers() {
        const pageContent = document.getElementById('page-content');

        try {
            // 获取URL参数
            const params = Utils.url.getParams();
            const currentPage = parseInt(params.page) || 1;
            const searchQuery = params.search || '';
            const statusFilter = params.status || '';
            const roleFilter = params.role || '';

            // 构建API请求参数
            const apiParams = {
                page: currentPage,
                limit: 20
            };

            if (searchQuery) apiParams.search = searchQuery;
            if (statusFilter) apiParams.status = statusFilter;
            if (roleFilter) apiParams.role = roleFilter;

            const response = await API.users.getList(apiParams);
            const users = response.data || [];
            const pagination = response.pagination || {};

            pageContent.innerHTML = `
                <div class="users-page">
                    <div class="page-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                        <h2>用户管理</h2>
                        <div class="header-actions">
                            <button class="btn btn-secondary" onclick="UserManager.refreshList()">
                                <i class="fas fa-sync-alt"></i>
                                刷新
                            </button>
                        </div>
                    </div>
                    
                    <!-- 搜索和筛选 - 紧凑布局 -->
                    <div class="filters-section" style="margin-bottom: 16px;">
                        <div style="display: flex; gap: 12px; align-items: center; flex-wrap: wrap;">
                            <!-- 搜索框 -->
                            <div style="flex: 1; min-width: 200px;">
                                <div class="search-input-group" style="height: 36px;">
                                    <input type="text" class="form-control" placeholder="搜索用户名或邮箱..." 
                                           value="${searchQuery}" 
                                           id="user-search-input"
                                           onkeyup="if(event.key==='Enter') UserManager.handleSearch(this.value)"
                                           style="height: 36px;">
                                    <button class="btn btn-outline-secondary" type="button" 
                                            onclick="UserManager.handleSearch(document.getElementById('user-search-input').value)"
                                            style="height: 36px; background-color: #f8f9fa; padding: 0 12px;">
                                        <i class="fas fa-search"></i>
                                    </button>
                                </div>
                            </div>
                            
                            <!-- 状态筛选 -->
                            <div style="display: flex; align-items: center; gap: 6px;">
                                <label style="margin: 0; font-size: 14px; white-space: nowrap;">状态:</label>
                                <select class="form-control" style="width: 80px; height: 36px; font-size: 14px;" 
                                        onchange="UserManager.handleFilter('status', this.value)">
                                    <option value="">全部</option>
                                    <option value="active" ${statusFilter === 'active' ? 'selected' : ''}>正常</option>
                                    <option value="inactive" ${statusFilter === 'inactive' ? 'selected' : ''}>禁用</option>
                                </select>
                            </div>
                            
                            <!-- 角色筛选 -->
                            <div style="display: flex; align-items: center; gap: 6px;">
                                <label style="margin: 0; font-size: 14px; white-space: nowrap;">角色:</label>
                                <select class="form-control" style="width: 120px; height: 36px; font-size: 14px;" 
                                        onchange="UserManager.handleFilter('role', this.value)">
                                    <option value="">全部</option>
                                    <option value="super_admin" ${roleFilter === 'super_admin' ? 'selected' : ''}>超级管理员</option>
                                    <option value="system_admin" ${roleFilter === 'system_admin' ? 'selected' : ''}>系统管理员</option>
                                    <option value="operation_admin" ${roleFilter === 'operation_admin' ? 'selected' : ''}>运营管理员</option>
                                    <option value="team_admin" ${roleFilter === 'team_admin' ? 'selected' : ''}>团队管理员</option>
                                </select>
                            </div>
                            
                            <!-- 创建用户按钮 -->
                            ${Auth.hasPermission('user:create') ? `
                                <button class="btn btn-primary" onclick="UserManager.showCreateModal()" style="height: 36px; white-space: nowrap;">
                                    <i class="fas fa-plus"></i>
                                    创建用户
                                </button>
                            ` : ''}
                        </div>
                    </div>
                    
                    <!-- 用户列表 -->
                    <div class="card">
                        <div class="card-header">
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <h3 class="card-title">用户列表 (${pagination.total || 0})</h3>
                                <div class="header-actions" style="display: flex; gap: 6px;">
                                    ${Auth.hasPermission('user:delete') ? `
                                        <button class="btn btn-danger btn-sm" onclick="UserManager.batchDelete()" id="batch-delete-btn" style="display: none;">
                                            <i class="fas fa-trash"></i>
                                            批量删除
                                        </button>
                                    ` : ''}
                                </div>
                            </div>
                        </div>
                        <div class="card-body">
                            ${this.createUsersTable(users)}
                            
                            ${Components.createPagination({
                current: pagination.page || 1,
                total: pagination.total || 0,
                pageSize: pagination.limit || 20,
                onChange: (page) => UserManager.changePage(page)
            })}
                        </div>
                    </div>
                </div>
            `;

            // 初始化用户管理器
            UserManager.init();

        } catch (error) {
            throw new Error(`用户数据加载失败: ${error.message}`);
        }
    },



    async renderUserDetail(id) {
        const pageContent = document.getElementById('page-content');

        try {
            // 显示加载状态
            pageContent.innerHTML = Components.createLoading('加载用户详情...');

            // 获取用户详情
            const response = await API.users.getDetail(id);
            const user = response.data;

            pageContent.innerHTML = `
                <div class="user-detail-page">
                    <!-- 页面头部 -->
                    <div class="page-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                        <div>
                            <h2>用户详情</h2>
                            <p style="color: var(--text-secondary); margin: 4px 0 0 0;">查看和管理用户信息</p>
                        </div>
                        <div class="header-actions">
                            ${Auth.hasPermission('user:update') ? `
                                <button class="btn btn-primary" onclick="UserManager.editUser('${user.id}')">
                                    <i class="fas fa-edit"></i>
                                    编辑用户
                                </button>
                            ` : ''}
                            <button class="btn btn-secondary" onclick="Router.navigate('/users')">
                                <i class="fas fa-arrow-left"></i>
                                返回列表
                            </button>
                        </div>
                    </div>
                    
                    <div class="user-detail-content">
                        <div style="display: grid; grid-template-columns: 1fr 300px; gap: 24px;">
                            <!-- 主要信息 -->
                            <div class="main-info">
                                <!-- 基本信息卡片 -->
                                <div class="card" style="margin-bottom: 24px;">
                                    <div class="card-header">
                                        <h3 class="card-title">基本信息</h3>
                                    </div>
                                    <div class="card-body">
                                        <div class="info-grid" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px;">
                                            <div class="info-item">
                                                <label>用户名</label>
                                                <div class="info-value">${user.username}</div>
                                            </div>
                                            <div class="info-item">
                                                <label>邮箱</label>
                                                <div class="info-value">${user.email}</div>
                                            </div>
                                            <div class="info-item">
                                                <label>角色</label>
                                                <div class="info-value">${Components.formatRole(user.role)}</div>
                                            </div>
                                            <div class="info-item">
                                                <label>状态</label>
                                                <div class="info-value">${Components.formatStatus(user.status)}</div>
                                            </div>
                                            <div class="info-item">
                                                <label>昵称</label>
                                                <div class="info-value">${user.profile?.nickname || '未设置'}</div>
                                            </div>
                                            <div class="info-item">
                                                <label>用户ID</label>
                                                <div class="info-value" style="font-family: monospace; font-size: 12px;">${user.id}</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                <!-- 登录信息卡片 -->
                                <div class="card" style="margin-bottom: 24px;">
                                    <div class="card-header">
                                        <h3 class="card-title">登录信息</h3>
                                    </div>
                                    <div class="card-body">
                                        <div class="info-grid" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px;">
                                            <div class="info-item">
                                                <label>注册时间</label>
                                                <div class="info-value">${Utils.date.format(user.created_at)}</div>
                                            </div>
                                            <div class="info-item">
                                                <label>最后更新</label>
                                                <div class="info-value">${Utils.date.format(user.updated_at)}</div>
                                            </div>
                                            <div class="info-item">
                                                <label>最后登录</label>
                                                <div class="info-value">${user.last_login_at ? Utils.date.format(user.last_login_at) : '从未登录'}</div>
                                            </div>
                                            <div class="info-item">
                                                <label>登录尝试次数</label>
                                                <div class="info-value">${user.login_attempts || 0}</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                <!-- 标签页导航 -->
                                <div class="card">
                                    <div class="card-header">
                                        <div class="tab-nav">
                                            <button class="tab-btn active" onclick="this.showTab('permissions')">权限信息</button>
                                            <button class="tab-btn" onclick="this.showTab('activities')">活动记录</button>
                                        </div>
                                    </div>
                                    <div class="card-body">
                                        <!-- 权限信息标签页 -->
                                        <div class="tab-content active" id="permissions-tab">
                                            <div class="permissions-list">
                                                ${this.renderUserPermissions(user.role)}
                                            </div>
                                        </div>
                                        
                                        <!-- 活动记录标签页 -->
                                        <div class="tab-content" id="activities-tab">
                                            <div id="user-activities-container">
                                                <div class="loading-state">
                                                    <div class="loading-spinner-sm"></div>
                                                    <span>加载活动记录...</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <!-- 侧边栏操作 -->
                            <div class="sidebar-actions">
                                <!-- 用户头像卡片 -->
                                <div class="card" style="margin-bottom: 24px;">
                                    <div class="card-body" style="text-align: center;">
                                        <img src="${this.getUserAvatar(user)}" alt="用户头像" 
                                             style="width: 80px; height: 80px; border-radius: 50%; margin-bottom: 16px;">
                                        <h4>${user.profile?.nickname || user.username}</h4>
                                        <p style="color: var(--text-secondary); font-size: 14px;">${Auth.getRoleName(user.role)}</p>
                                    </div>
                                </div>
                                
                                <!-- 快速操作卡片 -->
                                <div class="card">
                                    <div class="card-header">
                                        <h3 class="card-title">快速操作</h3>
                                    </div>
                                    <div class="card-body">
                                        <div class="action-list">
                                            ${Auth.hasPermission('user:update') ? `
                                                <button class="btn btn-secondary btn-block" onclick="UserManager.editUser('${user.id}')" style="margin-bottom: 8px;">
                                                    <i class="fas fa-edit"></i>
                                                    编辑信息
                                                </button>
                                            ` : ''}
                                            
                                            ${Auth.hasPermission('user:update') ? `
                                                <button class="btn btn-warning btn-block" onclick="UserManager.resetPassword('${user.id}')" style="margin-bottom: 8px;">
                                                    <i class="fas fa-key"></i>
                                                    重置密码
                                                </button>
                                            ` : ''}
                                            
                                            ${Auth.hasPermission('user:update') && user.status === 'active' ? `
                                                <button class="btn btn-warning btn-block" onclick="UserManager.toggleUserStatus('${user.id}', 'inactive')" style="margin-bottom: 8px;">
                                                    <i class="fas fa-ban"></i>
                                                    禁用用户
                                                </button>
                                            ` : ''}
                                            
                                            ${Auth.hasPermission('user:update') && user.status === 'inactive' ? `
                                                <button class="btn btn-success btn-block" onclick="UserManager.toggleUserStatus('${user.id}', 'active')" style="margin-bottom: 8px;">
                                                    <i class="fas fa-check"></i>
                                                    启用用户
                                                </button>
                                            ` : ''}
                                            
                                            ${Auth.hasPermission('user:delete') && user.username !== 'admin' ? `
                                                <button class="btn btn-danger btn-block" onclick="UserManager.deleteUser('${user.id}')">
                                                    <i class="fas fa-trash"></i>
                                                    删除用户
                                                </button>
                                            ` : ''}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            // 初始化用户管理器
            UserManager.init();

            // 添加标签页切换功能
            window.showTab = function (tabName) {
                // 移除所有活动状态
                document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
                document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

                // 激活当前标签
                event.target.classList.add('active');
                document.getElementById(`${tabName}-tab`).classList.add('active');

                // 如果是活动记录标签，加载数据
                if (tabName === 'activities') {
                    Router.loadUserActivities(id);
                }
            };

        } catch (error) {
            pageContent.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">
                        <i class="fas fa-exclamation-circle"></i>
                    </div>
                    <div class="empty-state-title">加载失败</div>
                    <div class="empty-state-description">${error.message}</div>
                    <button class="btn btn-primary" onclick="Router.navigate('/users')" style="margin-top: 16px;">
                        返回用户列表
                    </button>
                </div>
            `;
        }
    },

    // 渲染团队管理主页面（重定向到团队列表）
    async renderTeams() {
        // 重定向到团队列表页面
        this.navigate('/teams/list');
    },

    // 渲染团队列表页面
    async renderTeamsList() {
        const pageContent = document.getElementById('page-content');

        try {
            // 显示加载状态
            pageContent.innerHTML = Components.createLoading('加载团队数据...');

            // 获取URL参数
            const params = Utils.url.getParams();
            const currentPage = parseInt(params.page) || 1;
            const searchQuery = params.search || '';
            const statusFilter = params.status || '';

            // 构建API请求参数
            const apiParams = {
                page: currentPage,
                limit: 20
            };

            if (searchQuery) apiParams.search = searchQuery;
            if (statusFilter) apiParams.status = statusFilter;

            // 先显示基础页面结构，避免API错误导致页面无法显示
            pageContent.innerHTML = `
                <div class="teams-page">
                    <div class="page-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                        <h2>团队列表</h2>
                        <div class="header-actions" style="display: flex; gap: 8px;">
                            <button class="btn btn-secondary" onclick="TeamManager.refreshList()">
                                <i class="fas fa-sync-alt"></i>
                                刷新
                            </button>
                        </div>
                    </div>
                    
                    <!-- 搜索和筛选 - 紧凑布局 -->
                    <div class="filters-section" style="margin-bottom: 16px;">
                        <div style="display: flex; gap: 12px; align-items: center; flex-wrap: wrap;">
                            <!-- 搜索框 -->
                            <div style="flex: 1; min-width: 200px;">
                                <div class="search-input-group" style="height: 36px;">
                                    <input type="text" class="form-control" placeholder="搜索团队名称..." 
                                           value="${searchQuery}" 
                                           id="team-search-input"
                                           onkeyup="if(event.key==='Enter') TeamManager.handleSearch(this.value)"
                                           style="height: 36px;">
                                    <button class="btn btn-outline-secondary" type="button" 
                                            onclick="TeamManager.handleSearch(document.getElementById('team-search-input').value)"
                                            style="height: 36px; background-color: #f8f9fa; padding: 0 12px;">
                                        <i class="fas fa-search"></i>
                                    </button>
                                </div>
                            </div>
                            
                            <!-- 团队类型筛选 -->
                            <div style="display: flex; align-items: center; gap: 6px;">
                                <label style="margin: 0; font-size: 14px; white-space: nowrap;">类型:</label>
                                <select class="form-control" style="width: 120px; height: 36px; font-size: 14px;" 
                                        onchange="TeamManager.handleFilter('team_type', this.value)">
                                    <option value="">全部</option>
                                    <option value="general" ${statusFilter === 'general' ? 'selected' : ''}>通用团队</option>
                                    <option value="development" ${statusFilter === 'development' ? 'selected' : ''}>开发团队</option>
                                    <option value="testing" ${statusFilter === 'testing' ? 'selected' : ''}>测试团队</option>
                                    <option value="design" ${statusFilter === 'design' ? 'selected' : ''}>设计团队</option>
                                    <option value="marketing" ${statusFilter === 'marketing' ? 'selected' : ''}>市场团队</option>
                                    <option value="operation" ${statusFilter === 'operation' ? 'selected' : ''}>运营团队</option>
                                    <option value="research" ${statusFilter === 'research' ? 'selected' : ''}>研发团队</option>
                                    <option value="support" ${statusFilter === 'support' ? 'selected' : ''}>支持团队</option>
                                </select>
                            </div>
                            
                            <!-- 创建团队按钮 -->
                            ${Auth.hasPermission(['team:create']) ? `
                                <button class="btn btn-primary" onclick="TeamManager.showCreateModal()" style="height: 36px; white-space: nowrap;">
                                    <i class="fas fa-plus"></i>
                                    创建团队
                                </button>
                            ` : ''}
                        </div>
                    </div>
                    
                    <!-- 团队列表 -->
                    <div class="card">
                        <div class="card-header">
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <h3 class="card-title">团队列表</h3>
                                <div class="header-actions" style="display: flex; gap: 6px;">
                                    ${Auth.hasPermission(['team:delete']) ? `
                                        <button class="btn btn-danger btn-sm" onclick="TeamManager.batchDelete()" id="batch-delete-teams-btn" style="display: none;">
                                            <i class="fas fa-trash"></i>
                                            批量删除
                                        </button>
                                    ` : ''}
                                </div>
                            </div>
                        </div>
                        <div class="card-body" id="teams-table-container">
                            ${Components.createLoading('加载团队列表...')}
                        </div>
                    </div>
                </div>
            `;

            // 异步加载团队数据
            try {
                const response = await API.teams.getList(apiParams);
                const teams = response.data?.teams || [];
                const pagination = response.data?.pagination || {};

                // 更新团队列表
                const tableContainer = document.getElementById('teams-table-container');
                if (tableContainer) {
                    tableContainer.innerHTML = `
                        ${this.createTeamsTable(teams)}
                        ${this.createSimplePagination(pagination, currentPage)}
                    `;
                }

                // 更新标题中的数量
                const cardTitle = document.querySelector('.card-title');
                if (cardTitle) {
                    cardTitle.textContent = `团队列表 (${pagination.total || 0})`;
                }

            } catch (apiError) {
                console.error('团队API调用失败:', apiError);
                const tableContainer = document.getElementById('teams-table-container');
                if (tableContainer) {
                    tableContainer.innerHTML = `
                        <div class="empty-state">
                            <div class="empty-state-icon">
                                <i class="fas fa-exclamation-triangle"></i>
                            </div>
                            <div class="empty-state-title">加载失败</div>
                            <div class="empty-state-description">
                                ${apiError.message || '无法加载团队数据，请检查网络连接或联系管理员'}
                            </div>
                            <button class="btn btn-primary" onclick="TeamManager.refreshList()">
                                <i class="fas fa-sync-alt"></i>
                                重试
                            </button>
                        </div>
                    `;
                }
            }

            // 初始化团队管理器
            if (typeof TeamManager !== 'undefined') {
                TeamManager.init();
            }

        } catch (error) {
            console.error('团队页面渲染失败:', error);
            pageContent.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">
                        <i class="fas fa-exclamation-circle"></i>
                    </div>
                    <div class="empty-state-title">页面加载失败</div>
                    <div class="empty-state-description">${error.message}</div>
                    <button class="btn btn-primary" onclick="Router.navigate('/teams', {force: true})">
                        <i class="fas fa-sync-alt"></i>
                        重新加载
                    </button>
                </div>
            `;
        }
    },

    // 创建活动列表表格
    createActivitiesTable(activities) {
        if (!activities || activities.length === 0) {
            return `
                <div class="empty-state">
                    <div class="empty-state-icon">
                        <i class="fas fa-calendar-times"></i>
                    </div>
                    <div class="empty-state-title">暂无活动</div>
                    <div class="empty-state-description">还没有创建任何活动</div>
                    ${Auth.hasPermission(['activity:create']) ? `
                        <button class="btn btn-primary" onclick="ActivityManager.showCreateModal()">
                            <i class="fas fa-plus"></i>
                            创建第一个活动
                        </button>
                    ` : ''}
                </div>
            `;
        }

        return `
            <div class="table-responsive">
                <table class="table">
                    <thead>
                        <tr>
                            ${Auth.hasPermission(['activity:delete']) ? `
                                <th width="50">
                                    <input type="checkbox" id="select-all-activities" class="form-check-input">
                                </th>
                            ` : ''}
                            <th>活动标题</th>
                            <th>活动类型</th>
                            <th>所属团队</th>
                            <th>开始时间</th>
                            <th>参与人数</th>
                            <th>状态</th>
                            <th>创建者</th>
                            <th width="200">操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${activities.map(activity => `
                            <tr>
                                ${Auth.hasPermission(['activity:delete']) ? `
                                    <td>
                                        <input type="checkbox" class="activity-checkbox form-check-input" value="${activity.id}">
                                    </td>
                                ` : ''}
                                <td>
                                    <div style="display: flex; align-items: center;">
                                        <div style="width: 32px; height: 32px; border-radius: 50%; background: ${this.getActivityIconBackground(activity.type)}; display: flex; align-items: center; justify-content: center; margin-right: 12px;">
                                            <i class="${this.getActivityIcon(activity.type)}" style="color: ${this.getActivityIconColor(activity.type)}; font-size: 14px;"></i>
                                        </div>
                                        <div>
                                            <div style="font-weight: 500;">${activity.title || '未命名活动'}</div>
                                            ${activity.description ? `<small style="color: #666;">${activity.description.substring(0, 50)}${activity.description.length > 50 ? '...' : ''}</small>` : ''}
                                        </div>
                                    </div>
                                </td>
                                <td>
                                    <span class="badge badge-secondary">
                                        ${this.getActivityTypeLabel(activity.type)}
                                    </span>
                                </td>
                                <td>
                                    <div>
                                        <div>${activity.team_name || '未知团队'}</div>
                                    </div>
                                </td>
                                <td>
                                    <div>
                                        <div>${Utils.date.format(activity.start_time, 'MM-DD HH:mm')}</div>
                                        ${activity.location ? `<small style="color: #666;"><i class="fas fa-map-marker-alt"></i> ${activity.location}</small>` : ''}
                                    </div>
                                </td>
                                <td>
                                    <span class="badge badge-info">
                                        ${activity.current_participants}/${activity.max_participants || '∞'}
                                    </span>
                                </td>
                                <td>
                                    <span class="badge ${this.getActivityStatusBadgeClass(activity.status)}">
                                        ${this.getActivityStatusLabel(activity.status)}
                                    </span>
                                </td>
                                <td>
                                    <div>
                                        <div>${activity.creator_name || '未知'}</div>
                                    </div>
                                </td>
                                <td>
                                    <div class="btn-group">
                                        <button class="btn btn-sm btn-primary" onclick="activitiesManager.viewActivity('${activity.id}')" title="查看详情">
                                            <i class="fas fa-eye"></i>
                                        </button>
                                        ${Auth.hasPermission(['activity:update']) ? `
                                            <button class="btn btn-sm btn-warning" onclick="ActivityManager.editActivity('${activity.id}')" title="编辑">
                                                <i class="fas fa-edit"></i>
                                            </button>
                                        ` : ''}
                                        ${Auth.hasPermission(['activity:delete']) ? `
                                            <button class="btn btn-sm btn-danger" onclick="ActivityManager.deleteActivity('${activity.id}')" title="删除">
                                                <i class="fas fa-trash"></i>
                                            </button>
                                        ` : ''}
                                    </div>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    },

    // 获取活动类型标签
    getActivityTypeLabel(type) {
        const typeLabels = {
            'meeting': '会议',
            'training': '培训',
            'workshop': '工作坊',
            'team_building': '团建',
            'project': '项目',
            'presentation': '演示',
            'brainstorm': '头脑风暴',
            'review': '评审',
            'ceremony': '仪式',
            'other': '其他'
        };
        return typeLabels[type] || type;
    },

    // 获取活动状态标签
    getActivityStatusLabel(status) {
        const statusLabels = {
            'draft': '草稿',
            'published': '已发布',
            'ongoing': '进行中',
            'completed': '已完成',
            'cancelled': '已取消'
        };
        return statusLabels[status] || status;
    },

    // 获取活动状态徽章样式
    getActivityStatusBadgeClass(status) {
        const statusClasses = {
            'draft': 'badge-secondary',
            'published': 'badge-success',
            'ongoing': 'badge-primary',
            'completed': 'badge-info',
            'cancelled': 'badge-danger'
        };
        return statusClasses[status] || 'badge-secondary';
    },

    // 获取活动图标
    getActivityIcon(type) {
        const iconMap = {
            'meeting': 'fas fa-users',
            'training': 'fas fa-graduation-cap',
            'workshop': 'fas fa-tools',
            'team_building': 'fas fa-heart',
            'project': 'fas fa-project-diagram',
            'presentation': 'fas fa-presentation',
            'brainstorm': 'fas fa-lightbulb',
            'review': 'fas fa-search',
            'ceremony': 'fas fa-trophy',
            'other': 'fas fa-calendar'
        };
        return iconMap[type] || 'fas fa-calendar';
    },

    // 获取活动图标背景色
    getActivityIconBackground(type) {
        const backgroundMap = {
            'meeting': '#e3f2fd',
            'training': '#f3e5f5',
            'workshop': '#fff3e0',
            'team_building': '#fce4ec',
            'project': '#e8f5e8',
            'presentation': '#fff8e1',
            'brainstorm': '#f1f8e9',
            'review': '#e0f2f1',
            'ceremony': '#fff3e0',
            'other': '#f5f5f5'
        };
        return backgroundMap[type] || '#f5f5f5';
    },

    // 获取活动图标颜色
    getActivityIconColor(type) {
        const colorMap = {
            'meeting': '#1976d2',
            'training': '#7b1fa2',
            'workshop': '#f57c00',
            'team_building': '#c2185b',
            'project': '#388e3c',
            'presentation': '#fbc02d',
            'brainstorm': '#689f38',
            'review': '#00796b',
            'ceremony': '#f57c00',
            'other': '#757575'
        };
        return colorMap[type] || '#757575';
    },

    // 创建团队列表表格
    createTeamsTable(teams) {
        if (!teams || teams.length === 0) {
            return `
                <div class="empty-state">
                    <div class="empty-state-icon">
                        <i class="fas fa-users"></i>
                    </div>
                    <div class="empty-state-title">暂无团队</div>
                    <div class="empty-state-description">还没有创建任何团队</div>
                    ${Auth.hasPermission(['team:create']) ? `
                        <button class="btn btn-primary" onclick="TeamManager.showCreateModal()">
                            <i class="fas fa-plus"></i>
                            创建第一个团队
                        </button>
                    ` : ''}
                </div>
            `;
        }

        return `
            <div class="table-responsive">
                <table class="table">
                    <thead>
                        <tr>
                            ${Auth.hasPermission(['team:delete']) ? `
                                <th width="50">
                                    <input type="checkbox" id="select-all-teams" class="form-check-input">
                                </th>
                            ` : ''}
                            <th>团队名称</th>
                            <th>团队类型</th>
                            <th>创建者</th>
                            <th>成员数量</th>
                            <th>活动数量</th>
                            <th>状态</th>
                            <th>创建时间</th>
                            <th width="200">操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${teams.map(team => `
                            <tr>
                                ${Auth.hasPermission(['team:delete']) ? `
                                    <td>
                                        <input type="checkbox" class="team-checkbox form-check-input" value="${team.id}">
                                    </td>
                                ` : ''}
                                <td>
                                    <div style="display: flex; align-items: center;">
                                        ${team.avatar_url ? `
                                            <img src="${team.avatar_url}" alt="团队头像" 
                                                 style="width: 32px; height: 32px; border-radius: 50%; margin-right: 12px; object-fit: cover;">
                                        ` : `
                                            <div style="width: 32px; height: 32px; border-radius: 50%; background: #f0f0f0; display: flex; align-items: center; justify-content: center; margin-right: 12px;">
                                                <i class="fas fa-users" style="color: #999; font-size: 14px;"></i>
                                            </div>
                                        `}
                                        <div>
                                            <div style="font-weight: 500;">${team.name || '未命名团队'}</div>
                                            ${team.description ? `<small style="color: #666;">${team.description.substring(0, 50)}${team.description.length > 50 ? '...' : ''}</small>` : ''}
                                        </div>
                                    </div>
                                </td>
                                <td>
                                    <span class="badge badge-primary">
                                        ${AppConfig.TEAM_TYPE_NAMES_TEMP[team.team_type] || team.team_type || '通用团队'}
                                    </span>
                                </td>
                                <td>
                                    <div style="display: flex; align-items: center;">
                                        <div>
                                            <div>${team.creator?.username || '未知'}</div>
                                            <small style="color: #666;">${team.creator?.email || ''}</small>
                                        </div>
                                    </div>
                                </td>
                                <td>
                                    <span class="badge badge-info">${team.member_count || 0}</span>
                                </td>
                                <td>
                                    <span class="badge badge-secondary">${team.activity_count || 0}</span>
                                </td>
                                <td>
                                    <span class="badge badge-${team.status === 'active' ? 'success' : team.status === 'inactive' ? 'warning' : 'danger'}">
                                        ${team.status === 'active' ? '正常' : team.status === 'inactive' ? '禁用' : '已解散'}
                                    </span>
                                </td>
                                <td>
                                    <small>${team.created_at ? Utils.date.format(team.created_at, 'YYYY-MM-DD HH:mm') : '未知'}</small>
                                </td>
                                <td>
                                    <div class="btn-group">
                                        <button class="btn btn-sm btn-primary" onclick="TeamManager.viewTeam('${team.id}')" title="查看详情">
                                            <i class="fas fa-eye"></i>
                                        </button>
                                        ${Auth.hasPermission(['team:update']) ? `
                                            <button class="btn btn-sm btn-warning" onclick="TeamManager.editTeam('${team.id}')" title="编辑">
                                                <i class="fas fa-edit"></i>
                                            </button>
                                        ` : ''}
                                        ${Auth.hasPermission(['team:delete']) ? `
                                            <button class="btn btn-sm btn-danger" onclick="TeamManager.deleteTeam('${team.id}')" title="删除">
                                                <i class="fas fa-trash"></i>
                                            </button>
                                        ` : ''}
                                    </div>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    },

    // 创建简单分页
    createSimplePagination(pagination, currentPage) {
        if (!pagination || !pagination.total || pagination.total <= pagination.limit) {
            return '';
        }

        const totalPages = Math.ceil(pagination.total / pagination.limit);
        const current = currentPage || pagination.page || 1;

        let paginationHtml = '<div class="pagination-wrapper" style="margin-top: 20px; text-align: center;">';
        paginationHtml += '<div class="pagination">';

        // 上一页
        if (current > 1) {
            paginationHtml += `<button class="btn btn-sm btn-secondary" onclick="Router.loadActivitiesData(${current - 1})">上一页</button>`;
        }

        // 页码
        for (let i = Math.max(1, current - 2); i <= Math.min(totalPages, current + 2); i++) {
            if (i === current) {
                paginationHtml += `<button class="btn btn-sm btn-primary">${i}</button>`;
            } else {
                paginationHtml += `<button class="btn btn-sm btn-outline-primary" onclick="Router.loadActivitiesData(${i})">${i}</button>`;
            }
        }

        // 下一页
        if (current < totalPages) {
            paginationHtml += `<button class="btn btn-sm btn-secondary" onclick="Router.loadActivitiesData(${current + 1})">下一页</button>`;
        }

        paginationHtml += '</div>';
        paginationHtml += `<div style="margin-top: 10px; color: #666; font-size: 14px;">共 ${pagination.total} 条记录，第 ${current} / ${totalPages} 页</div>`;
        paginationHtml += '</div>';

        return paginationHtml;
    },

    // 加载用户活动记录
    async loadUserActivities(userId, page = 1) {
        const container = document.getElementById('user-activities-container');
        if (!container) return;

        try {
            container.innerHTML = Components.createLoading('加载活动记录...');

            const response = await API.userActivities.getUserActivities(userId, {
                page,
                limit: 20
            });

            if (response.success && response.data.length > 0) {
                const activities = response.data;

                let html = '<div class="activities-list">';
                activities.forEach(activity => {
                    const actionIcon = this.getActivityIcon(activity.action_type);
                    const actionColor = this.getActivityColor(activity.action_type);

                    html += `
                        <div class="activity-item">
                            <div class="activity-icon ${actionColor}">
                                <i class="${actionIcon}"></i>
                            </div>
                            <div class="activity-content">
                                <div class="activity-description">${activity.action_description}</div>
                                <div class="activity-meta">
                                    ${activity.admin ? `由 ${activity.admin.username} 执行` : '用户自行操作'} • 
                                    ${Utils.date.format(activity.created_at)} • 
                                    ${activity.ip_address || '未知IP'}
                                </div>
                            </div>
                        </div>
                    `;
                });
                html += '</div>';

                // 添加分页
                if (response.pagination && response.pagination.total > 20) {
                    html += Components.createPagination({
                        current: response.pagination.page,
                        total: response.pagination.total,
                        pageSize: response.pagination.limit,
                        onChange: (page) => this.loadUserActivities(userId, page)
                    });
                }

                container.innerHTML = html;
            } else {
                container.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-icon">
                            <i class="fas fa-history"></i>
                        </div>
                        <div class="empty-state-title">暂无活动记录</div>
                        <div class="empty-state-message">该用户还没有任何活动记录</div>
                    </div>
                `;
            }

        } catch (error) {
            console.error('加载用户活动记录失败:', error);
            container.innerHTML = `
                <div class="error-state">
                    <div class="error-icon">
                        <i class="fas fa-exclamation-triangle"></i>
                    </div>
                    <div class="error-title">加载失败</div>
                    <div class="error-message">${error.message}</div>
                    <button class="btn btn-secondary btn-sm" onclick="Router.loadUserActivities('${userId}')">重试</button>
                </div>
            `;
        }
    },

    // 获取活动图标
    getActivityIcon(actionType) {
        const iconMap = {
            login: 'fas fa-sign-in-alt',
            logout: 'fas fa-sign-out-alt',
            profile_update: 'fas fa-user-edit',
            password_change: 'fas fa-key',
            password_reset: 'fas fa-unlock',
            status_change: 'fas fa-toggle-on',
            role_change: 'fas fa-user-tag',
            created: 'fas fa-plus-circle',
            deleted: 'fas fa-trash',
            batch_operation: 'fas fa-tasks'
        };
        return iconMap[actionType] || 'fas fa-circle';
    },

    // 获取活动颜色
    getActivityColor(actionType) {
        const colorMap = {
            login: 'success',
            logout: 'info',
            profile_update: 'primary',
            password_change: 'warning',
            password_reset: 'warning',
            status_change: 'info',
            role_change: 'primary',
            created: 'success',
            deleted: 'danger',
            batch_operation: 'secondary'
        };
        return colorMap[actionType] || 'secondary';
    },

    // 渲染团队类型管理页面
    async renderTeamTypes() {
        const pageContent = document.getElementById('page-content');

        try {
            // 显示加载状态
            pageContent.innerHTML = Components.createLoading('加载团队类型数据...');

            // 加载团队类型数据
            console.log('开始加载团队类型数据...');
            await TeamTypeManager.loadTeamTypes();
            console.log('团队类型数据加载完成，数量:', TeamTypeManager.teamTypes.length);

            pageContent.innerHTML = `
                <div class="team-types-page">
                    <div class="page-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                        <div>
                            <h2>团队类型管理</h2>
                            <p class="text-muted">管理系统中的团队类型，支持添加、编辑和删除自定义类型</p>
                        </div>
                        <div class="header-actions" style="display: flex; gap: 8px;">
                            ${Auth.hasPermission(['system:update']) ? `
                                <button class="btn btn-primary" onclick="TeamTypeManager.showAddModal()">
                                    <i class="fas fa-plus"></i>
                                    新增类型
                                </button>
                            ` : `
                                <div class="alert alert-warning" style="margin: 0; padding: 8px 12px; font-size: 14px;">
                                    <i class="fas fa-exclamation-triangle"></i>
                                    没有权限新增团队类型
                                </div>
                            `}
                            <button class="btn btn-secondary" onclick="TeamTypeManager.refreshList()">
                                <i class="fas fa-sync-alt"></i>
                                刷新
                            </button>
                        </div>
                    </div>
                    
                    <div class="card">
                        <div class="card-body">
                            <div id="team-types-list">
                                ${TeamTypeManager.renderTeamTypeList()}
                            </div>
                        </div>
                    </div>
                </div>
            `;

        } catch (error) {
            console.error('渲染团队类型页面失败:', error);
            pageContent.innerHTML = `
                <div class="error-state">
                    <div class="error-state-icon">
                        <i class="fas fa-exclamation-triangle"></i>
                    </div>
                    <div class="error-state-title">加载失败</div>
                    <div class="error-state-description">无法加载团队类型数据，请刷新页面重试</div>
                    <button class="btn btn-primary" onclick="location.reload()">
                        <i class="fas fa-sync-alt"></i>
                        刷新页面
                    </button>
                </div>
            `;
        }
    },

    // 渲染新版团队类型管理页面
    async renderTeamTypesNew() {
        const pageContent = document.getElementById('page-content');

        try {
            // 加载团队类型管理器脚本
            if (typeof TeamTypesManager === 'undefined') {
                await this.loadScript('/js/team-types-manager.js');
            }

            pageContent.innerHTML = `
                <div class="team-types-new-page">
                    <!-- 消息容器 -->
                    <div id="messages-container"></div>
                    
                    <!-- 页面头部 -->
                    <div class="page-header" style="background: white; border-radius: 8px; padding: 24px; margin-bottom: 24px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <h1 style="font-size: 1.5rem; margin-bottom: 8px;">
                                    <i class="fas fa-tags text-primary"></i>
                                    团队类型管理
                                </h1>
                                <p style="color: #6c757d; margin: 0;">管理系统中的团队类型，支持添加、编辑和删除自定义类型</p>
                            </div>
                            <div style="display: flex; gap: 8px; align-items: center;">
                                <button class="btn btn-primary" onclick="teamTypesManager.showAddModal()">
                                    <i class="fas fa-plus"></i>
                                    新增类型
                                </button>
                                <button class="btn btn-secondary" onclick="teamTypesManager.loadTypes(); teamTypesManager.refreshPage();">
                                    <i class="fas fa-sync-alt"></i>
                                    刷新
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- 主要内容 -->
                    <div class="content-card" style="background: white; border-radius: 8px; padding: 24px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                        <div id="team-types-container" style="text-align: center; padding: 40px; color: #6c757d;">
                            <div class="spinner-border text-primary" role="status">
                                <span class="visually-hidden">加载中...</span>
                            </div>
                            <p style="margin-top: 16px;">正在加载团队类型数据...</p>
                        </div>
                    </div>

                    <!-- 页面底部信息 -->
                    <div style="text-align: center; margin-top: 24px; color: #6c757d;">
                        <small>
                            <i class="fas fa-info-circle"></i>
                            系统默认类型不可编辑或删除 | 自定义类型支持完整的增删改操作
                        </small>
                    </div>
                </div>
            `;

            // 初始化团队类型管理器
            if (typeof teamTypesManager === 'undefined') {
                window.teamTypesManager = new TeamTypesManager();
            }
            
            await teamTypesManager.init();
            teamTypesManager.refreshPage();

        } catch (error) {
            console.error('渲染新版团队类型页面失败:', error);
            pageContent.innerHTML = `
                <div class="error-state">
                    <div class="error-state-icon">
                        <i class="fas fa-exclamation-triangle"></i>
                    </div>
                    <div class="error-state-title">加载失败</div>
                    <div class="error-state-description">无法加载团队类型管理器，请刷新页面重试</div>
                    <button class="btn btn-primary" onclick="location.reload()">
                        <i class="fas fa-sync-alt"></i>
                        刷新页面
                    </button>
                </div>
            `;
        }
    },

    // 动态加载脚本
    loadScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    },

    // 渲染活动管理主页面（重定向到活动列表）
    async renderActivities() {
        // 重定向到活动列表页面
        this.navigate('/activities/list');
    },

    // 渲染活动列表页面
    async renderActivitiesList() {
        const pageContent = document.getElementById('page-content');

        try {
            // 获取URL参数
            const params = Utils.url.getParams();
            const currentPage = parseInt(params.page) || 1;
            const searchQuery = params.search || '';
            const statusFilter = params.status || '';
            const typeFilter = params.type || '';

            // 先显示基础页面结构，避免API错误导致页面无法显示
            pageContent.innerHTML = `
                <div class="activities-page">
                    <div class="page-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px;">
                        <h2 style="color: var(--text-primary);">活动列表</h2>
                        <div class="header-actions" style="display: flex; gap: 8px;">
                            <button class="btn btn-secondary" onclick="activitiesManager.refreshList()">
                                <i class="fas fa-sync-alt"></i>
                                刷新
                            </button>
                        </div>
                    </div>
                    
                    <!-- 搜索和筛选 - 紧凑布局 -->
                    <div class="filters-section" style="margin-bottom: 16px;">
                        <div style="display: flex; gap: 12px; align-items: center; flex-wrap: wrap;">
                            <!-- 搜索框 -->
                            <div style="flex: 1; min-width: 200px;">
                                <div class="search-input-group" style="height: 36px;">
                                    <input type="text" class="form-control" placeholder="搜索活动标题..." 
                                           value="${searchQuery}" 
                                           id="activity-search-input"
                                           onkeyup="if(event.key==='Enter') activitiesManager.handleSearch(this.value)"
                                           style="height: 36px; color: var(--text-primary); background-color: var(--bg-primary);">
                                    <button class="btn btn-outline-secondary" type="button" 
                                            onclick="activitiesManager.handleSearch(document.getElementById('activity-search-input').value)"
                                            style="height: 36px; background-color: var(--bg-tertiary); padding: 0 12px; color: var(--text-primary);">
                                        <i class="fas fa-search"></i>
                                    </button>
                                </div>
                            </div>
                            
                            <!-- 状态筛选 -->
                            <div style="display: flex; align-items: center; gap: 6px;">
                                <label style="margin: 0; font-size: 14px; white-space: nowrap; color: var(--text-primary);">状态:</label>
                                <select class="form-control" style="width: 100px; height: 36px; font-size: 14px; color: var(--text-primary); background-color: var(--bg-primary);" 
                                        onchange="activitiesManager.handleFilter('status', this.value)">
                                    <option value="">全部</option>
                                    <option value="draft" ${statusFilter === 'draft' ? 'selected' : ''}>草稿</option>
                                    <option value="published" ${statusFilter === 'published' ? 'selected' : ''}>已发布</option>
                                    <option value="ongoing" ${statusFilter === 'ongoing' ? 'selected' : ''}>进行中</option>
                                    <option value="completed" ${statusFilter === 'completed' ? 'selected' : ''}>已完成</option>
                                    <option value="cancelled" ${statusFilter === 'cancelled' ? 'selected' : ''}>已取消</option>
                                </select>
                            </div>
                            
                            <!-- 类型筛选 -->
                            <div style="display: flex; align-items: center; gap: 6px;">
                                <label style="margin: 0; font-size: 14px; white-space: nowrap; color: var(--text-primary);">类型:</label>
                                <select class="form-control" style="width: 100px; height: 36px; font-size: 14px; color: var(--text-primary); background-color: var(--bg-primary);" 
                                        onchange="activitiesManager.handleFilter('type', this.value)">
                                    <option value="">全部</option>
                                    <option value="meeting" ${typeFilter === 'meeting' ? 'selected' : ''}>会议</option>
                                    <option value="training" ${typeFilter === 'training' ? 'selected' : ''}>培训</option>
                                    <option value="workshop" ${typeFilter === 'workshop' ? 'selected' : ''}>工作坊</option>
                                    <option value="team_building" ${typeFilter === 'team_building' ? 'selected' : ''}>团建</option>
                                    <option value="other" ${typeFilter === 'other' ? 'selected' : ''}>其他</option>
                                </select>
                            </div>
                            
                            <!-- 创建活动按钮 -->
                            ${Auth.hasPermission(['activity:create']) ? `
                                <button class="btn btn-primary" onclick="ActivityManager.showCreateModal()" style="height: 36px; white-space: nowrap;">
                                    <i class="fas fa-plus"></i>
                                    创建活动
                                </button>
                                <button class="btn btn-success" onclick="ActivityManager.showAAActivityModal()" style="height: 36px; white-space: nowrap; margin-left: 8px;">
                                    <i class="fas fa-money-bill-wave"></i>
                                    创建AA活动
                                </button>
                            ` : ''}
                        </div>
                    </div>
                    
                    <!-- 活动列表 -->
                    <div class="card">
                        <div class="card-header">
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <h3 class="card-title">活动列表</h3>
                                <div class="header-actions" style="display: flex; gap: 6px;">
                                    ${Auth.hasPermission(['activity:create']) ? `
                                        <button class="btn btn-warning btn-sm" onclick="activitiesManager.updateSequenceNumbers()" title="按创建时间重新排序所有活动">
                                            <i class="fas fa-sort-numeric-up"></i>
                                            更新序号
                                        </button>
                                    ` : ''}
                                    ${Auth.hasPermission(['activity:delete']) ? `
                                        <button class="btn btn-danger btn-sm" onclick="activitiesManager.batchDelete()" id="batch-delete-activities-btn" style="display: none;">
                                            <i class="fas fa-trash"></i>
                                            批量删除
                                        </button>
                                    ` : ''}
                                </div>
                            </div>
                        </div>
                        <div class="card-body" id="activities-table-container">
                            ${Components.createLoading('加载活动列表...')}
                        </div>
                    </div>
                </div>
            `;

            // 异步加载活动数据
            this.loadActivitiesData(currentPage, searchQuery, statusFilter, typeFilter);

        } catch (error) {
            throw new Error(`活动列表加载失败: ${error.message}`);
        }
    },

    // 异步加载活动数据
    async loadActivitiesData(currentPage, searchQuery, statusFilter, typeFilter) {
        try {
            // 构建API请求参数
            const apiParams = {
                page: currentPage,
                limit: 20
            };

            if (searchQuery) apiParams.search = searchQuery;
            if (statusFilter) apiParams.status = statusFilter;
            if (typeFilter) apiParams.type = typeFilter;

            console.log('🔍 Router.js - 请求活动列表:', apiParams);
            const response = await API.activities.getList(apiParams);
            console.log('📡 Router.js - API响应:', response);
            
            // 修复：正确解析返回的数据结构
            const activities = response.data?.activities || [];
            const pagination = response.data?.pagination || {};
            
            console.log('📋 Router.js - 处理后的活动数据:', activities);
            if (activities.length > 0) {
                console.log('🔍 Router.js - 第一个活动详情:');
                console.log('  team_name:', activities[0].team_name);
                console.log('  creator_name:', activities[0].creator_name);
                console.log('  team对象:', activities[0].team);
                console.log('  creator对象:', activities[0].creator);
            }

            // 更新表格内容
            const tableContainer = document.getElementById('activities-table-container');
            if (tableContainer) {
                tableContainer.innerHTML = `
                    ${this.createActivitiesTable(activities)}
                    ${this.createSimplePagination(pagination, currentPage)}
                `;
            }

            // 动态加载活动管理器脚本
            if (typeof ActivitiesManager === 'undefined') {
                await this.loadScript('/js/activities-manager.js');
            }
            
            // 动态加载ActivityManager脚本（用于创建活动）
            if (typeof ActivityManager === 'undefined') {
                await this.loadScript('/js/activity-manager.js');
            }

            // 初始化活动管理器
            if (typeof activitiesManager === 'undefined') {
                window.activitiesManager = new ActivitiesManager();
            }
            await activitiesManager.init();
            
            // 初始化ActivityManager
            if (typeof ActivityManager !== 'undefined') {
                ActivityManager.init();
            }

        } catch (error) {
            console.error('加载活动数据失败:', error);
            const tableContainer = document.getElementById('activities-table-container');
            if (tableContainer) {
                tableContainer.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-icon">
                            <i class="fas fa-exclamation-circle"></i>
                        </div>
                        <div class="empty-state-title" style="color: var(--text-primary);">加载失败</div>
                        <div class="empty-state-description" style="color: var(--text-secondary);">${error.message}</div>
                        <button class="btn btn-primary" onclick="Router.navigate('/activities/list', {force: true})">
                            <i class="fas fa-sync-alt"></i>
                            重新加载
                        </button>
                    </div>
                `;
            }
        }
    },

    // 创建活动表格
    createActivitiesTable(activities) {
        if (!activities || activities.length === 0) {
            return `
                <div class="empty-state">
                    <div class="empty-state-icon">
                        <i class="fas fa-calendar-alt"></i>
                    </div>
                    <div class="empty-state-title">暂无活动</div>
                    <div class="empty-state-description">还没有创建任何活动</div>
                </div>
            `;
        }

        const statusMap = {
            'draft': { text: '草稿', class: 'secondary' },
            'published': { text: '已发布', class: 'success' },
            'ongoing': { text: '进行中', class: 'primary' },
            'completed': { text: '已完成', class: 'info' },
            'cancelled': { text: '已取消', class: 'danger' }
        };

        const typeMap = {
            'meeting': '会议',
            'event': '活动',
            'training': '培训',
            'other': '其他'
        };

        return `
            <div class="table-responsive">
                <table class="table table-hover">
                    <thead>
                        <tr>
                            <th width="80">序号</th>
                            <th>活动标题</th>
                            <th>类型</th>
                            <th>所属团队</th>
                            <th>开始时间</th>
                            <th>结束时间</th>
                            <th>参与人数</th>
                            <th>状态</th>
                            <th>创建者</th>
                            <th>操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${activities.map(activity => {
            const status = statusMap[activity.status] || { text: activity.status, class: 'secondary' };
            const type = typeMap[activity.type] || activity.type;
            const startTime = Utils.date.format(activity.start_time, 'MM-DD HH:mm');
            const endTime = Utils.date.format(activity.end_time, 'MM-DD HH:mm');
            const participantText = activity.max_participants
                ? `${activity.current_participants}/${activity.max_participants}`
                : `${activity.current_participants}`;

            return `
                                <tr>
                                    <td>
                                        ${activity.sequence_number && activity.sequence_number > 0 ? `
                                            <span class="activity-sequence-badge">#${activity.sequence_number}</span>
                                        ` : '-'}
                                    </td>
                                    <td>
                                        <div style="font-weight: 500; color: var(--text-primary);">${activity.title}</div>
                                        ${activity.description ? `<small style="color: var(--text-secondary);">${activity.description.substring(0, 50)}${activity.description.length > 50 ? '...' : ''}</small>` : ''}
                                    </td>
                                    <td>
                                        <span class="badge badge-outline-primary" style="color: var(--text-primary);">${type}</span>
                                    </td>
                                    <td>
                                        <div style="color: var(--text-primary);">${activity.team_name || '未知团队'}</div>
                                    </td>
                                    <td style="color: var(--text-primary);">${startTime}</td>
                                    <td style="color: var(--text-primary);">${endTime}</td>
                                    <td>
                                        <span class="badge badge-outline-info" style="color: var(--text-primary);">${participantText}</span>
                                    </td>
                                    <td>
                                        <span class="badge badge-${status.class}" style="color: var(--text-primary);">${status.text}</span>
                                    </td>
                                    <td>
                                        <div style="color: var(--text-primary);">${activity.creator_name || '未知用户'}</div>
                                        <small style="color: var(--text-secondary);">${activity.creator?.email || ''}</small>
                                    </td>
                                    <td>
                                        <div class="btn-group">
                                            <button class="btn btn-sm btn-primary" onclick="Router.navigate('/activities/detail/${activity.id}')" title="查看详情">
                                                <i class="fas fa-eye"></i>
                                            </button>
                                            ${Auth.hasPermission(['activity:update']) ? `
                                                <button class="btn btn-sm btn-warning" onclick="ActivityManager.editActivity('${activity.id}')" title="编辑">
                                                    <i class="fas fa-edit"></i>
                                                </button>
                                            ` : ''}
                                            ${Auth.hasPermission(['activity:delete']) ? `
                                                <button class="btn btn-sm btn-danger" onclick="ActivityManager.deleteActivity('${activity.id}')" title="删除">
                                                    <i class="fas fa-trash"></i>
                                                </button>
                                            ` : ''}
                                        </div>
                                    </td>
                                </tr>
                            `;
        }).join('')}
                    </tbody>
                </table>
            </div>
        `;
    },

    // 渲染活动详情页面
    async renderActivityDetail() {
        const pageContent = document.getElementById('page-content');
        const activityId = this.getCurrentParams().id;

        try {
            // 动态加载活动管理器脚本
            if (typeof ActivitiesManager === 'undefined') {
                await this.loadScript('/js/activities-manager.js');
            }

            // 初始化活动管理器
            if (typeof activitiesManager === 'undefined') {
                window.activitiesManager = new ActivitiesManager();
            }

            // 设置页面内容
            pageContent.innerHTML = `
                <div class="activity-detail-page">
                    <!-- 页面头部 -->
                    <div class="page-header" style="background: white; border-radius: 8px; padding: 24px; margin-bottom: 24px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <div style="display: flex; align-items: center; gap: 16px;">
                                <button class="btn btn-secondary" onclick="Router.navigate('/activities/list')">
                                    <i class="fas fa-arrow-left"></i>
                                    返回列表
                                </button>
                                <h2 class="page-title" style="margin: 0;">活动详情</h2>
                            </div>
                            <div class="header-actions" style="display: flex; gap: 8px;">
                                ${Auth.hasPermission(['activity:update']) ? `
                                    <button class="btn btn-warning" onclick="ActivityManager.editActivity('${activityId}')">
                                        <i class="fas fa-edit"></i>
                                        编辑活动
                                    </button>
                                ` : ''}
                                ${Auth.hasPermission(['activity:delete']) ? `
                                    <button class="btn btn-danger" onclick="ActivityManager.deleteActivity('${activityId}')">
                                        <i class="fas fa-trash"></i>
                                        删除活动
                                    </button>
                                ` : ''}
                            </div>
                        </div>
                    </div>

                    <!-- 活动详情内容 -->
                    <div id="activity-detail-content">
                        ${Components.createLoading('加载活动详情...')}
                    </div>
                </div>
            `;

            // 调用活动管理器的查看详情方法，但传入内容容器ID而不是弹窗
            await activitiesManager.viewActivityInPage(activityId, 'activity-detail-content');

        } catch (error) {
            console.error('加载活动详情失败:', error);
            pageContent.innerHTML = `
                <div class="error-state" style="text-align: center; padding: 100rpx 40rpx;">
                    <div class="error-icon" style="font-size: 80rpx; margin-bottom: 20rpx;">❌</div>
                    <div class="error-title" style="font-size: 32rpx; margin-bottom: 16rpx;">加载失败</div>
                    <div class="error-message" style="color: #666;">${error.message}</div>
                    <button class="btn btn-primary" onclick="Router.navigate('/activities/list')" style="margin-top: 20rpx;">
                        返回列表
                    </button>
                </div>
            `;
        }
    },

    // 渲染活动详情页面
    async renderActivityDetail() {
        const pageContent = document.getElementById('page-content');
        const activityId = this.getCurrentParams().id;

        try {
            // 设置页面内容为新的活动详情页
            pageContent.innerHTML = `
                <div class="activity-detail-page">
                    <!-- 页面头部 -->
                    <div class="page-header" style="background: white; border-radius: 8px; padding: 24px; margin-bottom: 24px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <div style="display: flex; align-items: center; gap: 16px;">
                                <button class="btn btn-secondary" onclick="Router.navigate('/activities/list')">
                                    <i class="fas fa-arrow-left"></i>
                                    返回列表
                                </button>
                                <h2 class="page-title" style="margin: 0;">活动详情</h2>
                            </div>
                            <div class="header-actions" style="display: flex; gap: 8px;">
                                ${Auth.hasPermission(['activity:update']) ? `
                                    <button class="btn btn-warning" onclick="ActivityManager.editActivity('${activityId}')">
                                        <i class="fas fa-edit"></i>
                                        编辑活动
                                    </button>
                                ` : ''}
                                ${Auth.hasPermission(['activity:delete']) ? `
                                    <button class="btn btn-danger" onclick="ActivityManager.deleteActivity('${activityId}')">
                                        <i class="fas fa-trash"></i>
                                        删除活动
                                    </button>
                                ` : ''}
                            </div>
                        </div>
                    </div>

                    <!-- 活动详情内容 -->
                    <div id="activity-detail-container">
                        <div class="text-center py-5">
                            <div class="spinner-border text-primary" role="status">
                                <span class="visually-hidden">加载中...</span>
                            </div>
                            <p class="mt-2">正在加载活动详情...</p>
                        </div>
                    </div>
                </div>
            `;

            // 动态加载活动详情页脚本
            if (typeof ActivityDetailPage === 'undefined') {
                await this.loadScript('/js/activity-detail-page.js');
            }

            // 初始化活动详情页
            if (typeof activityDetailPage === 'undefined' || activityDetailPage.activityId !== activityId) {
                window.activityDetailPage = new ActivityDetailPage();
            }
            
            // 设置活动ID并初始化
            activityDetailPage.activityId = activityId;
            await activityDetailPage.init();

        } catch (error) {
            console.error('加载活动详情失败:', error);
            pageContent.innerHTML = `
                <div class="error-state" style="text-align: center; padding: 100rpx 40rpx;">
                    <div class="error-icon" style="font-size: 80rpx; margin-bottom: 20rpx;">❌</div>
                    <div class="error-title" style="font-size: 32rpx; margin-bottom: 16rpx;">加载失败</div>
                    <div class="error-message" style="color: #666;">${error.message}</div>
                    <button class="btn btn-primary" onclick="Router.navigate('/activities/list')" style="margin-top: 20rpx;">
                        返回列表
                    </button>
                </div>
            `;
        }
    },

    // 渲染活动类型管理页面
    async renderActivityTypes() {
        const pageContent = document.getElementById('page-content');

        try {
            // 加载活动类型管理器脚本
            if (typeof ActivityTypesManager === 'undefined') {
                await this.loadScript('/js/activity-types-manager.js');
            }

            pageContent.innerHTML = `
                <div class="activity-types-page">
                    <!-- 消息容器 -->
                    <div id="messages-container"></div>
                    
                    <!-- 页面头部 -->
                    <div class="page-header" style="background: white; border-radius: 8px; padding: 24px; margin-bottom: 24px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <h1 style="font-size: 1.5rem; margin-bottom: 8px;">
                                    <i class="fas fa-calendar-alt text-primary"></i>
                                    活动类型管理
                                </h1>
                                <p style="color: #6c757d; margin: 0;">管理系统中的活动类型，支持添加、编辑和删除自定义类型</p>
                            </div>
                            <div style="display: flex; gap: 8px; align-items: center;">
                                <button class="btn btn-primary" onclick="activityTypesManager.showAddModal()">
                                    <i class="fas fa-plus"></i>
                                    新增类型
                                </button>
                                <button class="btn btn-secondary" onclick="activityTypesManager.loadTypes(); activityTypesManager.refreshPage();">
                                    <i class="fas fa-sync-alt"></i>
                                    刷新
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- 主要内容 -->
                    <div class="content-card" style="background: white; border-radius: 8px; padding: 24px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                        <div id="activity-types-container" style="text-align: center; padding: 40px; color: #6c757d;">
                            <div class="spinner-border text-primary" role="status">
                                <span class="visually-hidden">加载中...</span>
                            </div>
                            <p style="margin-top: 16px;">正在加载活动类型数据...</p>
                        </div>
                    </div>

                    <!-- 页面底部信息 -->
                    <div style="text-align: center; margin-top: 24px; color: #6c757d;">
                        <small>
                            <i class="fas fa-info-circle"></i>
                            所有活动类型都支持完整的增删改操作 | 如有活动正在使用某类型则无法删除
                        </small>
                    </div>
                </div>
            `;

            // 初始化活动类型管理器
            if (typeof activityTypesManager !== 'undefined') {
                await activityTypesManager.init();
                activityTypesManager.refreshPage();
            }

        } catch (error) {
            console.error('渲染活动类型页面失败:', error);
            pageContent.innerHTML = `
                <div class="error-state">
                    <div class="error-state-icon">
                        <i class="fas fa-exclamation-triangle"></i>
                    </div>
                    <div class="error-state-title">加载失败</div>
                    <div class="error-state-description">无法加载活动类型数据，请刷新页面重试</div>
                    <button class="btn btn-primary" onclick="location.reload()">
                        <i class="fas fa-sync-alt"></i>
                        刷新页面
                    </button>
                </div>
            `;
        }
    },

    async renderContent() {
        const pageContent = document.getElementById('page-content');
        pageContent.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">
                    <i class="fas fa-file-alt"></i>
                </div>
                <div class="empty-state-title">内容管理页面</div>
                <div class="empty-state-description">该页面正在开发中</div>
            </div>
        `;
    },

    async renderSettings() {
        const pageContent = document.getElementById('page-content');
        pageContent.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">
                    <i class="fas fa-cog"></i>
                </div>
                <div class="empty-state-title">系统设置页面</div>
                <div class="empty-state-description">该页面正在开发中</div>
            </div>
        `;
    },

    // 创建用户表格
    createUsersTable(users) {
        if (users.length === 0) {
            return `
                <div class="empty-state">
                    <div class="empty-state-icon">
                        <i class="fas fa-users"></i>
                    </div>
                    <div class="empty-state-title">暂无用户数据</div>
                    <div class="empty-state-description">还没有用户，点击上方按钮创建第一个用户</div>
                </div>
            `;
        }

        return `
            <div class="table-container">
                <table class="table">
                    <thead>
                        <tr>
                            ${Auth.hasPermission('user:delete') ? '<th><input type="checkbox" id="select-all"></th>' : ''}
                            <th>用户名</th>
                            <th>邮箱</th>
                            <th>角色</th>
                            <th>状态</th>
                            <th>最后登录</th>
                            <th>注册时间</th>
                            <th>操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${users.map(user => `
                            <tr>
                                ${Auth.hasPermission('user:delete') ? `<td><input type="checkbox" class="user-checkbox" value="${user.id}"></td>` : ''}
                                <td>
                                    <div style="display: flex; align-items: center; gap: 8px;">
                                        <img src="${this.getUserAvatar(user)}" alt="头像" style="width: 32px; height: 32px; border-radius: 50%;">
                                        <span>${user.username}</span>
                                    </div>
                                </td>
                                <td>${user.email}</td>
                                <td>${Components.formatRole(user.role)}</td>
                                <td>${Components.formatStatus(user.status)}</td>
                                <td>${user.last_login_at ? Utils.date.relative(user.last_login_at) : '从未登录'}</td>
                                <td>${Utils.date.format(user.created_at, 'YYYY-MM-DD')}</td>
                                <td>
                                    <div class="action-buttons">
                                        ${Auth.hasPermission('user:read') ? `
                                            <button class="btn btn-sm btn-primary" onclick="UserManager.viewUser('${user.id}')" title="查看详情">
                                                <i class="fas fa-eye"></i>
                                            </button>
                                        ` : ''}
                                        ${Auth.hasPermission('user:update') && !(user.role === 'super_admin' && Auth.getUserRole() !== 'super_admin') ? `
                                            <button class="btn btn-sm btn-secondary" onclick="UserManager.editUser('${user.id}')" title="编辑用户">
                                                <i class="fas fa-edit"></i>
                                            </button>
                                        ` : ''}
                                        ${Auth.hasPermission('user:update') && !(user.role === 'super_admin' && Auth.getUserRole() !== 'super_admin') ? `
                                            <button class="btn btn-sm btn-warning" onclick="UserManager.resetPassword('${user.id}')" title="重置密码">
                                                <i class="fas fa-key"></i>
                                            </button>
                                        ` : ''}
                                        ${Auth.hasPermission('user:update') && user.status === 'active' && !(user.role === 'super_admin' && Auth.getUserRole() !== 'super_admin') ? `
                                            <button class="btn btn-sm btn-warning" onclick="UserManager.toggleUserStatus('${user.id}', 'inactive')" title="禁用用户">
                                                <i class="fas fa-ban"></i>
                                            </button>
                                        ` : ''}
                                        ${Auth.hasPermission('user:update') && user.status === 'inactive' && !(user.role === 'super_admin' && Auth.getUserRole() !== 'super_admin') ? `
                                            <button class="btn btn-sm btn-success" onclick="UserManager.toggleUserStatus('${user.id}', 'active')" title="启用用户">
                                                <i class="fas fa-check"></i>
                                            </button>
                                        ` : ''}
                                        ${Auth.hasPermission('user:delete') && user.username !== 'admin' && !(user.role === 'super_admin' && Auth.getUserRole() !== 'super_admin') ? `
                                            <button class="btn btn-sm btn-danger" onclick="UserManager.deleteUser('${user.id}')" title="删除用户">
                                                <i class="fas fa-trash"></i>
                                            </button>
                                        ` : ''}
                                    </div>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    },

    // 获取用户头像
    getUserAvatar(user) {
        if (user.profile && user.profile.avatar) {
            return user.profile.avatar;
        }
        return `https://via.placeholder.com/32x32?text=${encodeURIComponent(user.username?.charAt(0) || 'U')}`;
    },

    // 渲染用户权限
    renderUserPermissions(role) {
        const permissions = AppConfig.ROLE_PERMISSIONS_TEMP[role] || [];

        if (permissions.length === 0) {
            return '<p style="color: var(--text-secondary);">该角色暂无权限</p>';
        }

        const permissionGroups = {
            '用户管理': permissions.filter(p => p.startsWith('user:')),
            '团队管理': permissions.filter(p => p.startsWith('team:')),
            '活动管理': permissions.filter(p => p.startsWith('activity:')),
            '内容管理': permissions.filter(p => p.startsWith('content:')),
            '系统管理': permissions.filter(p => p.startsWith('system:'))
        };

        let html = '';

        Object.keys(permissionGroups).forEach(groupName => {
            const groupPermissions = permissionGroups[groupName];
            if (groupPermissions.length > 0) {
                html += `
                    <div class="permission-group" style="margin-bottom: 16px;">
                        <h5 style="margin-bottom: 8px; color: var(--text-primary);">${groupName}</h5>
                        <div class="permission-tags" style="display: flex; flex-wrap: wrap; gap: 6px;">
                            ${groupPermissions.map(permission => {
                    const permissionName = this.getPermissionDisplayName(permission);
                    return `<span class="permission-tag" style="
                                    background: var(--bg-tertiary);
                                    color: var(--text-secondary);
                                    padding: 4px 8px;
                                    border-radius: 12px;
                                    font-size: 12px;
                                ">${permissionName}</span>`;
                }).join('')}
                        </div>
                    </div>
                `;
            }
        });

        return html;
    },

    // 获取权限显示名称
    getPermissionDisplayName(permission) {
        const permissionNames = {
            'user:read': '查看',
            'user:create': '创建',
            'user:update': '编辑',
            'user:delete': '删除',
            'team:read': '查看',
            'team:create': '创建',
            'team:update': '编辑',
            'team:delete': '删除',
            'activity:read': '查看',
            'activity:create': '创建',
            'activity:update': '编辑',
            'activity:delete': '删除',
            'content:read': '查看',
            'content:create': '创建',
            'content:update': '编辑',
            'content:delete': '删除',
            'system:read': '查看',
            'system:update': '修改'
        };

        return permissionNames[permission] || permission;
    },

    // 获取仪表板统计数据
    async getDashboardStats() {
        try {
            // 获取用户统计
            const usersResponse = await API.users.getList({ page: 1, limit: 1 });
            const totalUsers = usersResponse.pagination?.total || 0;

            // 模拟其他统计数据
            const stats = [
                {
                    title: '总用户数',
                    value: totalUsers,
                    change: Math.floor(Math.random() * 20) - 5,
                    icon: 'fas fa-users',
                    color: 'primary'
                },
                {
                    title: '活跃用户',
                    value: Math.floor(totalUsers * 0.7),
                    change: Math.floor(Math.random() * 15),
                    icon: 'fas fa-user-check',
                    color: 'success'
                },
                {
                    title: '总团队数',
                    value: Math.floor(totalUsers / 3),
                    change: Math.floor(Math.random() * 10) - 3,
                    icon: 'fas fa-user-friends',
                    color: 'info'
                },
                {
                    title: '活动数量',
                    value: Math.floor(totalUsers * 1.5),
                    change: Math.floor(Math.random() * 25),
                    icon: 'fas fa-calendar-alt',
                    color: 'warning'
                }
            ];

            // 模拟最近活动
            const activities = [
                {
                    type: 'user_created',
                    message: '新用户注册',
                    user: 'testuser123',
                    time: new Date(Date.now() - 5 * 60 * 1000),
                    icon: 'fas fa-user-plus',
                    color: 'success'
                },
                {
                    type: 'user_login',
                    message: '用户登录',
                    user: 'admin',
                    time: new Date(Date.now() - 15 * 60 * 1000),
                    icon: 'fas fa-sign-in-alt',
                    color: 'info'
                },
                {
                    type: 'team_created',
                    message: '创建新团队',
                    user: 'teamadmin',
                    time: new Date(Date.now() - 30 * 60 * 1000),
                    icon: 'fas fa-users',
                    color: 'primary'
                },
                {
                    type: 'activity_published',
                    message: '发布新活动',
                    user: 'opadmin',
                    time: new Date(Date.now() - 60 * 60 * 1000),
                    icon: 'fas fa-calendar-plus',
                    color: 'warning'
                }
            ];

            return { stats, activities };
        } catch (error) {
            console.error('获取仪表板数据失败:', error);
            return {
                stats: [],
                activities: []
            };
        }
    },

    // 创建最近用户表格
    createRecentUsersTable(users) {
        if (users.length === 0) {
            return '<p style="color: var(--text-secondary); text-align: center; padding: 20px;">暂无最近注册用户</p>';
        }

        return `
            <div class="recent-users">
                ${users.slice(0, 5).map(user => `
                    <div class="user-item" style="
                        display: flex; 
                        align-items: center; 
                        padding: 12px 0; 
                        border-bottom: 1px solid var(--border-color);
                        cursor: pointer;
                        transition: background-color 0.3s;
                    " onclick="Router.navigate('/users/${user.id}')" onmouseover="this.style.backgroundColor='var(--bg-tertiary)'" onmouseout="this.style.backgroundColor='transparent'">
                        <img src="${this.getUserAvatar(user)}" alt="头像" style="
                            width: 40px; 
                            height: 40px; 
                            border-radius: 50%; 
                            margin-right: 12px;
                        ">
                        <div style="flex: 1;">
                            <div style="font-weight: 500; color: var(--text-primary);">${user.username}</div>
                            <div style="font-size: 12px; color: var(--text-secondary);">
                                ${user.email} • ${Components.formatRole(user.role)}
                            </div>
                        </div>
                        <div style="text-align: right; color: var(--text-secondary); font-size: 12px;">
                            ${Utils.date.relative(user.created_at)}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    },

    // 创建系统状态
    createSystemStatus() {
        const statusItems = [
            {
                label: '服务器状态',
                value: '正常运行',
                status: 'success',
                icon: 'fas fa-server'
            },
            {
                label: '数据库连接',
                value: '连接正常',
                status: 'success',
                icon: 'fas fa-database'
            },
            {
                label: '内存使用',
                value: '68%',
                status: 'warning',
                icon: 'fas fa-memory'
            },
            {
                label: '磁盘空间',
                value: '45%',
                status: 'success',
                icon: 'fas fa-hdd'
            }
        ];

        return `
            <div class="system-status">
                ${statusItems.map(item => `
                    <div class="status-item" style="
                        display: flex; 
                        align-items: center; 
                        justify-content: space-between;
                        padding: 12px 0;
                        border-bottom: 1px solid var(--border-color);
                    ">
                        <div style="display: flex; align-items: center; gap: 12px;">
                            <i class="${item.icon}" style="
                                width: 20px; 
                                text-align: center; 
                                color: var(--text-secondary);
                            "></i>
                            <span style="color: var(--text-primary);">${item.label}</span>
                        </div>
                        <span class="status-badge ${item.status}">${item.value}</span>
                    </div>
                `).join('')}
            </div>
        `;
    },

    // 创建快速操作
    createQuickActions() {
        const actions = [
            {
                title: '创建用户',
                icon: 'fas fa-user-plus',
                action: 'UserManager.showCreateModal()',
                permission: 'user:create',
                color: 'primary'
            },
            {
                title: '创建团队',
                icon: 'fas fa-users',
                action: 'alert("创建团队功能开发中")',
                permission: 'team:create',
                color: 'info'
            },
            {
                title: '发布活动',
                icon: 'fas fa-calendar-plus',
                action: 'alert("发布活动功能开发中")',
                permission: 'activity:create',
                color: 'warning'
            },
            {
                title: '系统设置',
                icon: 'fas fa-cog',
                action: 'Router.navigate("/settings")',
                permission: 'system:read',
                color: 'secondary'
            }
        ];

        return `
            <div class="quick-actions">
                ${actions.filter(action => !action.permission || Auth.hasPermission(action.permission)).map(action => `
                    <button class="btn btn-${action.color} btn-block" onclick="${action.action}" style="
                        margin-bottom: 8px;
                        display: flex;
                        align-items: center;
                        justify-content: flex-start;
                        gap: 12px;
                    ">
                        <i class="${action.icon}"></i>
                        ${action.title}
                    </button>
                `).join('')}
            </div>
        `;
    },

    // 创建最近活动
    createRecentActivities(activities) {
        if (activities.length === 0) {
            return '<p style="color: var(--text-secondary); text-align: center; padding: 20px;">暂无最近活动</p>';
        }

        return `
            <div class="recent-activities">
                ${activities.map(activity => `
                    <div class="activity-item" style="
                        display: flex; 
                        align-items: flex-start; 
                        padding: 12px 0;
                        border-bottom: 1px solid var(--border-color);
                    ">
                        <div class="activity-icon" style="
                            width: 32px;
                            height: 32px;
                            border-radius: 50%;
                            background: rgba(var(--${activity.color === 'success' ? '16, 185, 129' : activity.color === 'info' ? '6, 182, 212' : activity.color === 'warning' ? '245, 158, 11' : '59, 130, 246'}), 0.1);
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            margin-right: 12px;
                            flex-shrink: 0;
                        ">
                            <i class="${activity.icon}" style="
                                font-size: 14px;
                                color: var(--${activity.color === 'success' ? 'success' : activity.color === 'info' ? 'info' : activity.color === 'warning' ? 'warning' : 'primary'}-color);
                            "></i>
                        </div>
                        <div style="flex: 1; min-width: 0;">
                            <div style="font-size: 14px; color: var(--text-primary); margin-bottom: 2px;">
                                ${activity.message}
                            </div>
                            <div style="font-size: 12px; color: var(--text-secondary);">
                                ${activity.user} • ${Utils.date.relative(activity.time)}
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    },

    // 更新面包屑导航
    updateBreadcrumb(route, path) {
        const breadcrumbItems = ['首页'];

        // 根据路径生成面包屑
        const pathParts = path.split('/').filter(part => part);
        pathParts.forEach((part, index) => {
            if (index === pathParts.length - 1) {
                breadcrumbItems.push(route.title);
            } else {
                // 可以根据需要添加中间层级
            }
        });

        Components.renderBreadcrumb(breadcrumbItems);
    },

    // 渲染轮播图管理页面
    async renderBanners() {
        const pageContent = document.getElementById('page-content');

        try {
            // 加载轮播图管理器脚本
            if (typeof BannersManager === 'undefined') {
                await this.loadScript('/js/banners-manager.js');
            }

            pageContent.innerHTML = `
                <div class="banners-page">
                    <!-- 消息容器 -->
                    <div id="messages-container"></div>
                    
                    <!-- 页面头部 -->
                    <div class="page-header" style="background: white; border-radius: 8px; padding: 24px; margin-bottom: 24px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <h1 style="font-size: 1.5rem; margin-bottom: 8px;">
                                    <i class="fas fa-images text-primary"></i>
                                    轮播图管理
                                </h1>
                                <p style="color: #6c757d; margin: 0;">管理首页轮播图，支持图片上传、排序和状态控制</p>
                            </div>
                            <div style="display: flex; gap: 8px; align-items: center;">
                                <button class="btn btn-primary" onclick="bannersManager.showCreateModal()">
                                    <i class="fas fa-plus"></i>
                                    新增轮播图
                                </button>
                                <button class="btn btn-secondary" onclick="bannersManager.refreshList()">
                                    <i class="fas fa-sync-alt"></i>
                                    刷新
                                </button>
                            </div>
                        </div>
                    </div>

                    <!-- 主要内容 -->
                    <div class="content-card" style="background: white; border-radius: 8px; padding: 24px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                        <div id="banners-container">
                            <div style="text-align: center; padding: 40px; color: #6c757d;">
                                <div class="spinner-border text-primary" role="status">
                                    <span class="visually-hidden">加载中...</span>
                                </div>
                                <p style="margin-top: 12px;">正在加载轮播图数据...</p>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            // 初始化轮播图管理器
            console.log('开始初始化轮播图管理器...');
            console.log('window.bannersManager:', typeof window.bannersManager, window.bannersManager);
            console.log('bannersManager:', typeof bannersManager);
            
            if (window.bannersManager) {
                console.log('使用 window.bannersManager.init()');
                await window.bannersManager.init();
            } else if (typeof bannersManager !== 'undefined') {
                console.log('使用 bannersManager.init()');
                await bannersManager.init();
            } else {
                console.error('BannersManager未正确加载');
                // 尝试手动加载脚本
                console.log('尝试手动创建 BannersManager');
                if (typeof BannersManager !== 'undefined') {
                    window.bannersManager = new BannersManager();
                    await window.bannersManager.init();
                } else {
                    console.error('BannersManager 类未定义');
                }
            }

        } catch (error) {
            console.error('渲染轮播图页面失败:', error);
            pageContent.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">
                        <i class="fas fa-exclamation-circle"></i>
                    </div>
                    <div class="empty-state-title">页面加载失败</div>
                    <div class="empty-state-description">${error.message}</div>
                </div>
            `;
        }
    }
};
