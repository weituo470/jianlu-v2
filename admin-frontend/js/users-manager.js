// 用户管理
器 - 基于团队管理器的成功模式

class UsersManager {
    constructor() {
        this.users = [];
        this.currentFilters = {
            search: '',
            status: '',
            role: ''
        };
        this.isLoading = false;
        this.currentPage = 1;
        this.pageSize = 20;
        this.totalPages = 1;
    }

    // 初始化
    async init() {
        console.log('UsersManager 初始化...');
        await this.loadInitialData();
    }

    // 加载初始数据
    async loadInitialData() {
        if (this.isLoading) return;

        this.isLoading = true;
        try {
            await this.loadUsers();
            this.renderUsersList();
        } catch (error) {
            console.error('初始化失败:', error);
            this.showMessage('初始化失败: ' + error.message, 'error');
        } finally {
            this.isLoading = false;
        }
    }

    // 加载用户数据
    async loadUsers() {
        try {
            console.log('正在加载用户数据...');

            const params = {
                page: this.currentPage,
                limit: this.pageSize,
                ...this.currentFilters
            };

            const response = await API.users.getList(params);

            if (response.success) {
                this.users = response.data || [];
                this.totalPages = response.pagination?.pages || 1;
                console.log(`成功加载 ${this.users.length} 个用户`);
                return true;
            } else {
                throw new Error(response.message || '加载用户失败');
            }
        } catch (error) {
            console.error('加载用户失败:', error);
            this.showMessage('加载用户失败: ' + error.message, 'error');
            this.users = [];
            return false;
        }
    }

    // 渲染用户列表
    renderUsersList() {
        const container = document.getElementById('users-container');
        if (!container) return;

        if (this.users.length === 0) {
            container.innerHTML = `
                <div class="text-center py-5">
                    <i class="fas fa-users fa-3x text-muted mb-3"></i>
                    <h5 class="text-muted">暂无用户数据</h5>
                    <p class="text-muted">点击"创建用户"按钮开始创建第一个用户</p>
                    <button class="btn btn-primary" onclick="usersManager.showCreateModal()">
                        <i class="fas fa-plus"></i> 创建用户
                    </button>
                </div>
            `;
            return;
        }

        const usersHtml = this.users.map(user => this.renderUserCard(user)).join('');

        container.innerHTML = `
            <div class="row">
                ${usersHtml}
            </div>
            ${this.renderPagination()}
        `;
    }

    // 渲染单个用户卡片
    renderUserCard(user) {
        const statusBadge = this.getStatusBadge(user.status);
        const roleBadge = this.getRoleBadge(user.role);

        return `
            <div class="col-md-6 col-lg-4 mb-4">
                <div class="card h-100">
                    <div class="card-body">
                        <div class="mb-3">
                            <h5 class="card-title mb-1">${user.username}</h5>
                            <small class="text-muted">${user.email}</small>
                            <div class="mt-1">
                                ${statusBadge}
                                ${roleBadge}
                            </div>
                        </div>

                        <div class="d-flex justify-content-between align-items-center">
                            <small class="text-muted">
                                ${this.formatDate(user.created_at)}
                            </small>
                            <div class="btn-group" role="group">
                                <button class="btn btn-sm btn-outline-primary"
                                        onclick="usersManager.viewUserDetail('${user.id}')"
                                        title="查看详情">
                                    <i class="fas fa-eye"></i>
                                </button>
                                <button class="btn btn-sm btn-outline-warning"
                                        onclick="usersManager.showEditModal('${user.id}')"
                                        title="编辑">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="btn btn-sm btn-outline-danger"
                                        onclick="usersManager.deleteUser('${user.id}')"
                                        title="删除">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // 获取状态徽章
    getStatusBadge(status) {
        const statusMap = {
            'active': '<span class="badge bg-success">活跃</span>',
            'inactive': '<span class="badge bg-warning">非活跃</span>',
            'deleted': '<span class="badge bg-danger">已删除</span>'
        };
        return statusMap[status] || '<span class="badge bg-secondary">未知</span>';
    }

    // 获取角色徽章
    getRoleBadge(role) {
        const roleMap = {
            'super_admin': '<span class="badge bg-danger ms-1">超级管理员</span>',
            'admin': '<span class="badge bg-warning ms-1">管理员</span>',
            'user': '<span class="badge bg-info ms-1">普通用户</span>'
        };
        return roleMap[role] || '<span class="badge bg-secondary ms-1">未知</span>';
    }

    // 格式化日期
    formatDate(dateString) {
        if (!dateString) return '未知时间';
        const date = new Date(dateString);
        return date.toLocaleDateString('zh-CN') + ' ' + date.toLocaleTimeString('zh-CN', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    // 渲染分页
    renderPagination() {
        if (this.totalPages <= 1) return '';

        let paginationHtml = '<nav class="mt-4"><ul class="pagination justify-content-center">';

        // 上一页
        paginationHtml += `
            <li class="page-item ${this.currentPage === 1 ? 'disabled' : ''}">
                <a class="page-link" href="#" onclick="usersManager.goToPage(${this.currentPage - 1})">上一页</a>
            </li>
        `;

        // 页码
        for (let i = 1; i <= this.totalPages; i++) {
            if (i === this.currentPage ||
                i === 1 ||
                i === this.totalPages ||
                (i >= this.currentPage - 2 && i <= this.currentPage + 2)) {
                paginationHtml += `
                    <li class="page-item ${i === this.currentPage ? 'active' : ''}">
                        <a class="page-link" href="#" onclick="usersManager.goToPage(${i})">${i}</a>
                    </li>
                `;
            } else if (i === this.currentPage - 3 || i === this.currentPage + 3) {
                paginationHtml += '<li class="page-item disabled"><span class="page-link">...</span></li>';
            }
        }

        // 下一页
        paginationHtml += `
            <li class="page-item ${this.currentPage === this.totalPages ? 'disabled' : ''}">
                <a class="page-link" href="#" onclick="usersManager.goToPage(${this.currentPage + 1})">下一页</a>
            </li>
        `;

        paginationHtml += '</ul></nav>';
        return paginationHtml;
    }

    // 跳转到指定页面
    async goToPage(page) {
        if (page < 1 || page > this.totalPages || page === this.currentPage) return;

        this.currentPage = page;
        await this.loadUsers();
        this.renderUsersList();
    }

    // 搜索处理
    async handleSearch() {
        const searchInput = document.getElementById('search-input');
        const searchValue = searchInput ? searchInput.value.trim() : '';

        this.currentFilters.search = searchValue;
        this.currentPage = 1; // 重置到第一页

        await this.loadUsers();
        this.renderUsersList();
    }

    // 筛选处理
    async handleFilter() {
        const statusFilter = document.getElementById('status-filter');
        const roleFilter = document.getElementById('role-filter');

        this.currentFilters.status = statusFilter ? statusFilter.value : '';
        this.currentFilters.role = roleFilter ? roleFilter.value : '';

        this.currentPage = 1; // 重置到第一页

        await this.loadUsers();
        this.renderUsersList();
    }

    // 清除筛选
    async clearFilters() {
        // 重置筛选条件
        this.currentFilters = {
            search: '',
            status: '',
            role: ''
        };
        this.currentPage = 1;

        // 重置表单元素
        const searchInput = document.getElementById('search-input');
        const statusFilter = document.getElementById('status-filter');
        const roleFilter = document.getElementById('role-filter');

        if (searchInput) searchInput.value = '';
        if (statusFilter) statusFilter.value = '';
        if (roleFilter) roleFilter.value = '';

        await this.loadUsers();
        this.renderUsersList();
    }

    // 刷新列表
    async refreshList() {
        await this.loadInitialData();
    }

    // 查看用户详情
    async viewUserDetail(userId) {
        try {
            const response = await API.users.getDetails(userId);

            if (response.success) {
                const userData = response.data;
                this.showUserDetailModal(userData);
            } else {
                throw new Error(response.message || '获取用户详情失败');
            }
        } catch (error) {
            console.error('获取用户详情失败:', error);
            this.showMessage('获取用户详情失败: ' + error.message, 'error');
        }
    }

    // 显示用户详情模态框
    showUserDetailModal(userData) {
        const { user, joinedTeams, createdTeams, participatedActivities, createdActivities, statistics } = userData;

        const teamsHtml = joinedTeams.length > 0 ?
            joinedTeams.map(team => `
                <div class="d-flex align-items-center mb-2">
                    <div class="me-3">
                        <i class="fas fa-users fa-lg text-primary"></i>
                    </div>
                    <div>
                        <div class="fw-bold">${team.name}</div>
                        <small class="text-muted">
                            ${team.memberRole === 'admin' ? '管理员' : '成员'} · 
                            加入时间: ${this.formatDate(team.joinedAt)}
                        </small>
                    </div>
                </div>
            `).join('') :
            '<p class="text-muted">暂未加入任何团队</p>';

        const activitiesHtml = participatedActivities.length > 0 ?
            participatedActivities.slice(0, 5).map(activity => `
                <div class="d-flex align-items-center mb-2">
                    <div class="me-3">
                        <i class="fas fa-calendar fa-lg text-success"></i>
                    </div>
                    <div>
                        <div class="fw-bold">${activity.title}</div>
                        <small class="text-muted">
                            ${activity.team?.name || '未知团队'} · 
                            状态: ${activity.participationStatus}
                        </small>
                    </div>
                </div>
            `).join('') :
            '<p class="text-muted">暂未参与任何活动</p>';

        const modalContent = `
            <div class="row">
                <div class="col-12 mb-3">
                    <h5>${user.username}</h5>
                    ${this.getStatusBadge(user.status)}
                    ${this.getRoleBadge(user.role)}
                </div>
            </div>
            <div class="row">
                <div class="col-md-6">
                    <table class="table table-borderless">
                        <tr>
                            <td class="fw-bold" width="100">邮箱:</td>
                            <td>${user.email}</td>
                        </tr>
                        <tr>
                            <td class="fw-bold">注册时间:</td>
                            <td>${this.formatDate(user.created_at)}</td>
                        </tr>
                        <tr>
                            <td class="fw-bold">最后登录:</td>
                            <td>${this.formatDate(user.last_login_at) || '从未登录'}</td>
                        </tr>
                    </table>
                </div>
            </div>

            <div class="row mt-3">
                <div class="col-md-6">
                    <h6>统计信息</h6>
                    <ul class="list-unstyled">
                        <li><strong>加入团队:</strong> ${statistics.joinedTeamsCount} 个</li>
                        <li><strong>创建团队:</strong> ${statistics.createdTeamsCount} 个</li>
                        <li><strong>参与活动:</strong> ${statistics.participatedActivitiesCount} 个</li>
                        <li><strong>创建活动:</strong> ${statistics.createdActivitiesCount} 个</li>
                        <li><strong>管理团队:</strong> ${statistics.adminTeamsCount} 个</li>
                    </ul>
                </div>
                <div class="col-md-6">
                    <h6>加入的团队 (${joinedTeams.length})</h6>
                    <div class="border rounded p-3" style="max-height: 200px; overflow-y: auto;">
                        ${teamsHtml}
                    </div>
                </div>
            </div>
            
            <div class="mt-3">
                <h6>参与的活动 (${participatedActivities.length})</h6>
                <div class="border rounded p-3" style="max-height: 200px; overflow-y: auto;">
                    ${activitiesHtml}
                    ${participatedActivities.length > 5 ? '<p class="text-muted mt-2">... 还有更多活动</p>' : ''}
                </div>
            </div>
        `;

        const modal = Components.createModal({
            title: '用户详情',
            content: modalContent,
            size: 'lg',
            footer: `
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">关闭</button>
                <button type="button" class="btn btn-primary" onclick="usersManager.showEditModal('${user.id}'); usersManager.closeModal();">
                    <i class="fas fa-edit"></i> 编辑用户
                </button>
            `
        });

        this.currentModal = modal;
    }

    // 显示创建用户模态框
    showCreateModal() {
        // TODO: 实现创建用户功能
        this.showMessage('创建用户功能开发中...', 'info');
    }

    // 显示编辑用户模态框
    showEditModal(userId) {
        // TODO: 实现编辑用户功能
        this.showMessage('编辑用户功能开发中...', 'info');
    }

    // 删除用户
    async deleteUser(userId) {
        // TODO: 实现删除用户功能
        this.showMessage('删除用户功能开发中...', 'info');
    }

    // 关闭模态框
    closeModal() {
        if (this.currentModal) {
            const modalElement = document.querySelector('.modal.show');
            if (modalElement) {
                const modal = bootstrap.Modal.getInstance(modalElement);
                if (modal) {
                    modal.hide();
                }
            }
            this.currentModal = null;
        }
    }

    // 显示消息提示
    showMessage(message, type = 'info') {
        Utils.toast[type](message);
    }
}

// 创建全局实例
window.usersManager = new UsersManager();