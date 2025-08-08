// 活动管理器
// 基于团队管理器和活动类型管理器的成功模式

class ActivitiesManager {
    constructor() {
        this.activities = [];
        this.teams = [];
        this.activityTypes = [];
        this.currentFilters = {
            search: '',
            status: '',
            type: '',
            team: ''
        };
        this.isLoading = false;
    }

    // 初始化
    async init() {
        console.log('ActivitiesManager 初始化...');
        await this.loadInitialData();
    }

    // 加载初始数据
    async loadInitialData() {
        if (this.isLoading) return;
        
        this.isLoading = true;
        try {
            // 并行加载所有必要数据
            const [activitiesResult, teamsResult, typesResult] = await Promise.all([
                this.loadActivities(),
                this.loadTeams(),
                this.loadActivityTypes()
            ]);

            // 初始化筛选器选项
            this.initializeFilters();
            
            // 渲染活动列表
            this.renderActivitiesList();
            
        } catch (error) {
            console.error('初始化失败:', error);
            this.showMessage('初始化失败: ' + error.message, 'error');
        } finally {
            this.isLoading = false;
        }
    }

    // 加载活动数据
    async loadActivities() {
        try {
            console.log('正在加载活动数据...');
            
            const response = await API.activities.getList(this.currentFilters);
            if (response.success) {
                this.activities = response.data || [];
                console.log(`成功加载 ${this.activities.length} 个活动`);
                return true;
            } else {
                throw new Error(response.message || '加载失败');
            }
        } catch (error) {
            console.error('加载活动失败:', error);
            this.activities = [];
            throw error;
        }
    }

    // 加载团队数据
    async loadTeams() {
        try {
            const response = await API.teams.getList();
            if (response.success) {
                this.teams = response.data || [];
                console.log(`成功加载 ${this.teams.length} 个团队`);
                return true;
            }
        } catch (error) {
            console.error('加载团队失败:', error);
            this.teams = [];
        }
    }

    // 加载活动类型数据
    async loadActivityTypes() {
        try {
            const response = await API.activities.getTypes();
            if (response.success) {
                this.activityTypes = response.data || [];
                console.log(`成功加载 ${this.activityTypes.length} 个活动类型`);
                return true;
            }
        } catch (error) {
            console.error('加载活动类型失败:', error);
            this.activityTypes = [];
        }
    }

    // 初始化筛选器选项
    initializeFilters() {
        // 初始化活动类型筛选器
        const typeFilter = document.getElementById('type-filter');
        if (typeFilter) {
            typeFilter.innerHTML = '<option value="">全部类型</option>';
            this.activityTypes.forEach(type => {
                const option = document.createElement('option');
                option.value = type.value;
                option.textContent = type.label;
                typeFilter.appendChild(option);
            });
        }

        // 初始化团队筛选器
        const teamFilter = document.getElementById('team-filter');
        if (teamFilter) {
            teamFilter.innerHTML = '<option value="">全部团队</option>';
            this.teams.forEach(team => {
                const option = document.createElement('option');
                option.value = team.id;
                option.textContent = team.name;
                teamFilter.appendChild(option);
            });
        }
    }

    // 渲染活动列表
    renderActivitiesList() {
        const container = document.getElementById('activities-container');
        if (!container) return;

        if (this.activities.length === 0) {
            container.innerHTML = `
                <div class="text-center py-5">
                    <i class="fas fa-calendar-times fa-3x text-muted mb-3"></i>
                    <h5 class="text-muted">暂无活动数据</h5>
                    <p class="text-muted">还没有创建任何活动，点击上方按钮创建第一个活动</p>
                    <button class="btn btn-primary" onclick="activitiesManager.showCreateModal()">
                        <i class="fas fa-plus"></i>
                        创建活动
                    </button>
                </div>
            `;
            return;
        }

        const activitiesHtml = this.activities.map(activity => this.createActivityCard(activity)).join('');
        container.innerHTML = `
            <div class="row">
                ${activitiesHtml}
            </div>
        `;
    }

    // 创建活动卡片
    createActivityCard(activity) {
        const statusBadgeClass = this.getStatusBadgeClass(activity.status);
        const statusText = this.getStatusText(activity.status);
        const typeText = this.getTypeText(activity.type);
        const teamName = this.getTeamName(activity.team_id);
        
        return `
            <div class="col-md-6 col-lg-4 mb-4">
                <div class="card h-100">
                    <div class="card-header d-flex justify-content-between align-items-center">
                        <span class="badge ${statusBadgeClass}">${statusText}</span>
                        <div class="dropdown">
                            <button class="btn btn-sm btn-outline-secondary dropdown-toggle" type="button" 
                                    data-bs-toggle="dropdown">
                                <i class="fas fa-ellipsis-v"></i>
                            </button>
                            <ul class="dropdown-menu">
                                <li><a class="dropdown-item" href="#" onclick="activitiesManager.viewActivity('${activity.id}')">
                                    <i class="fas fa-eye"></i> 查看详情
                                </a></li>
                                <li><a class="dropdown-item" href="#" onclick="activitiesManager.editActivity('${activity.id}')">
                                    <i class="fas fa-edit"></i> 编辑
                                </a></li>
                                <li><hr class="dropdown-divider"></li>
                                <li><a class="dropdown-item text-danger" href="#" onclick="activitiesManager.deleteActivity('${activity.id}')">
                                    <i class="fas fa-trash"></i> 删除
                                </a></li>
                            </ul>
                        </div>
                    </div>
                    <div class="card-body">
                        <h6 class="card-title">${activity.title}</h6>
                        <p class="card-text text-muted small">${activity.description || '暂无描述'}</p>
                        
                        <div class="activity-meta">
                            <div class="d-flex justify-content-between align-items-center mb-2">
                                <span class="badge bg-secondary">${typeText}</span>
                                <small class="text-muted">${teamName}</small>
                            </div>
                            
                            <div class="d-flex justify-content-between align-items-center mb-2">
                                <small class="text-muted">
                                    <i class="fas fa-clock"></i>
                                    ${Utils.date.format(activity.start_time, 'MM-DD HH:mm')}
                                </small>
                                <small class="text-muted">
                                    <i class="fas fa-users"></i>
                                    ${activity.current_participants}/${activity.max_participants || '∞'}
                                </small>
                            </div>
                            
                            ${activity.location ? `
                                <div class="mb-2">
                                    <small class="text-muted">
                                        <i class="fas fa-map-marker-alt"></i>
                                        ${activity.location}
                                    </small>
                                </div>
                            ` : ''}
                        </div>
                    </div>
                    <div class="card-footer">
                        <div class="d-flex justify-content-between">
                            <button class="btn btn-sm btn-outline-primary" onclick="activitiesManager.viewActivity('${activity.id}')">
                                查看详情
                            </button>
                            <button class="btn btn-sm btn-primary" onclick="activitiesManager.manageParticipants('${activity.id}')">
                                管理参与者
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // 获取状态徽章样式
    getStatusBadgeClass(status) {
        const statusClasses = {
            'draft': 'bg-secondary',
            'published': 'bg-success',
            'ongoing': 'bg-primary',
            'completed': 'bg-info',
            'cancelled': 'bg-danger'
        };
        return statusClasses[status] || 'bg-secondary';
    }

    // 获取状态文本
    getStatusText(status) {
        const statusTexts = {
            'draft': '草稿',
            'published': '已发布',
            'ongoing': '进行中',
            'completed': '已完成',
            'cancelled': '已取消'
        };
        return statusTexts[status] || status;
    }

    // 获取类型文本
    getTypeText(type) {
        const activityType = this.activityTypes.find(t => t.value === type);
        return activityType ? activityType.label : type;
    }

    // 获取团队名称
    getTeamName(teamId) {
        const team = this.teams.find(t => t.id === teamId);
        return team ? team.name : '未知团队';
    }

    // 处理搜索
    async handleSearch() {
        const searchInput = document.getElementById('search-input');
        this.currentFilters.search = searchInput ? searchInput.value.trim() : '';
        await this.refreshList();
    }

    // 处理筛选
    async handleFilter() {
        const statusFilter = document.getElementById('status-filter');
        const typeFilter = document.getElementById('type-filter');
        const teamFilter = document.getElementById('team-filter');

        this.currentFilters.status = statusFilter ? statusFilter.value : '';
        this.currentFilters.type = typeFilter ? typeFilter.value : '';
        this.currentFilters.team = teamFilter ? teamFilter.value : '';

        await this.refreshList();
    }

    // 清除筛选
    async clearFilters() {
        this.currentFilters = {
            search: '',
            status: '',
            type: '',
            team: ''
        };

        // 重置表单
        const searchInput = document.getElementById('search-input');
        const statusFilter = document.getElementById('status-filter');
        const typeFilter = document.getElementById('type-filter');
        const teamFilter = document.getElementById('team-filter');

        if (searchInput) searchInput.value = '';
        if (statusFilter) statusFilter.value = '';
        if (typeFilter) typeFilter.value = '';
        if (teamFilter) teamFilter.value = '';

        await this.refreshList();
    }

    // 刷新列表
    async refreshList() {
        try {
            await this.loadActivities();
            this.renderActivitiesList();
            this.showMessage('活动列表已刷新', 'success');
        } catch (error) {
            this.showMessage('刷新失败: ' + error.message, 'error');
        }
    }

    // 显示创建活动模态框
    showCreateModal() {
        this.showMessage('创建活动功能开发中...', 'info');
    }

    // 查看活动详情
    viewActivity(activityId) {
        const activity = this.activities.find(a => a.id === activityId);
        if (!activity) {
            this.showMessage('活动不存在', 'error');
            return;
        }
        this.showMessage(`查看活动详情功能开发中: ${activity.title}`, 'info');
    }

    // 编辑活动
    editActivity(activityId) {
        const activity = this.activities.find(a => a.id === activityId);
        if (!activity) {
            this.showMessage('活动不存在', 'error');
            return;
        }
        this.showMessage(`编辑活动功能开发中: ${activity.title}`, 'info');
    }

    // 删除活动
    async deleteActivity(activityId) {
        const activity = this.activities.find(a => a.id === activityId);
        if (!activity) {
            this.showMessage('活动不存在', 'error');
            return;
        }

        if (!confirm(`确定要删除活动"${activity.title}"吗？\n\n此操作不可恢复！`)) {
            return;
        }

        try {
            const response = await API.activities.delete(activityId);
            if (response.success) {
                this.showMessage('活动删除成功', 'success');
                await this.refreshList();
            } else {
                throw new Error(response.message || '删除失败');
            }
        } catch (error) {
            console.error('删除活动失败:', error);
            this.showMessage('删除失败: ' + error.message, 'error');
        }
    }

    // 管理参与者
    manageParticipants(activityId) {
        const activity = this.activities.find(a => a.id === activityId);
        if (!activity) {
            this.showMessage('活动不存在', 'error');
            return;
        }
        this.showMessage(`管理参与者功能开发中: ${activity.title}`, 'info');
    }

    // 显示消息
    showMessage(message, type = 'info') {
        // 创建消息提示
        const alertClass = {
            'success': 'alert-success',
            'error': 'alert-danger',
            'warning': 'alert-warning',
            'info': 'alert-info'
        }[type] || 'alert-info';

        const alertHtml = `
            <div class="alert ${alertClass} alert-dismissible fade show" role="alert">
                <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : type === 'warning' ? 'exclamation-triangle' : 'info-circle'}"></i>
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;

        // 显示在页面顶部
        let container = document.getElementById('messages-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'messages-container';
            container.style.position = 'fixed';
            container.style.top = '20px';
            container.style.right = '20px';
            container.style.zIndex = '9999';
            container.style.maxWidth = '400px';
            document.body.appendChild(container);
        }
        container.insertAdjacentHTML('afterbegin', alertHtml);

        // 3秒后自动消失
        setTimeout(() => {
            const alert = container.querySelector('.alert');
            if (alert) {
                alert.remove();
            }
        }, 3000);
    }
}

// 创建全局实例
window.activitiesManager = new ActivitiesManager();