// 团队详情页面
class TeamDetailPage {
    constructor() {
        this.teamId = null;
        this.team = null;
        this.members = [];
        this.activities = [];
        this.applications = [];
        this.init();
    }

    init() {
        // 获取URL参数中的团队ID
        const urlParams = new URLSearchParams(window.location.search);
        this.teamId = urlParams.get('id');

        if (!this.teamId) {
            this.showError('团队ID不能为空');
            return;
        }

        // 检查登录状态
        if (!Auth.isLoggedIn()) {
            Auth.logout();
            window.location.href = '/index.html';
            return;
        }

        // 加载团队详情
        this.loadTeamDetail();
    }

    async loadTeamDetail() {
        try {
            // 并行加载团队信息、成员和活动
            const [teamResponse, membersResponse, activitiesResponse] = await Promise.all([
                API.teams.getDetail(this.teamId, { include_members: 'true' }),
                API.teams.getMembers(this.teamId),
                API.activities.getList({ team_id: this.teamId })
            ]);

            if (teamResponse.success) {
                this.team = teamResponse.data;

                // 处理成员数据
                if (membersResponse.success) {
                    this.members = Array.isArray(membersResponse.data.members) ? membersResponse.data.members :
                                   Array.isArray(membersResponse.data) ? membersResponse.data : [];
                }

                // 处理活动数据
                this.activities = []; // 先初始化为空数组
                if (activitiesResponse.success) {
                    const activitiesData = activitiesResponse.data.rows || activitiesResponse.data;
                    if (Array.isArray(activitiesData)) {
                        this.activities = activitiesData;
                    }
                }

                // 渲染页面
                this.render();

                // 如果开启了审核，加载待审核申请数量
                if (this.team.require_approval) {
                    this.loadPendingApplicationsCount();
                }
            } else {
                throw new Error(teamResponse.message || '获取团队详情失败');
            }
        } catch (error) {
            console.error('加载团队详情失败:', error);
            this.showError('加载团队详情失败: ' + error.message);
        }
    }

    render() {
        const container = document.getElementById('team-detail-container');
        if (!container) return;

        // 确保 this.activities 是数组
        if (!Array.isArray(this.activities)) {
            console.error('this.activities is not an array:', this.activities);
            this.activities = [];
        }

        container.innerHTML = `
            <!-- 团队头部信息 -->
            <div class="team-header">
                <div class="team-title">
                    <div class="team-avatar">
                        ${this.team.avatar_url ?
                            `<img src="${this.team.avatar_url}" alt="${this.team.name}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">` :
                            this.team.name.charAt(0).toUpperCase()
                        }
                    </div>
                    <div>
                        <h1>${this.team.name}</h1>
                        <div class="team-meta">
                            <div class="meta-tag">
                                <i class="fas fa-tag"></i>
                                ${this.getTeamTypeLabel(this.team.team_type)}
                            </div>
                            <div class="meta-tag">
                                <i class="fas fa-circle" style="color: ${this.team.status === 'active' ? '#4cc9f0' : '#6c757d'}"></i>
                                ${this.getStatusLabel(this.team.status)}
                            </div>
                            <div class="meta-tag">
                                <i class="fas fa-calendar"></i>
                                创建于 ${new Date(this.team.created_at).toLocaleDateString('zh-CN')}
                            </div>
                        </div>
                    </div>
                </div>
                <div class="team-stats">
                    <div class="stat-card">
                        <div class="stat-value">${this.members.length}</div>
                        <div class="stat-label">团队成员</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${this.activities.length}</div>
                        <div class="stat-label">团队活动</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${this.team.activity_count || 0}</div>
                        <div class="stat-label">活动总数</div>
                    </div>
                </div>
            </div>

            <!-- 主要内容区 -->
            <div class="row">
                <!-- 左侧信息 -->
                <div class="col-lg-8">
                    <!-- 基本信息 -->
                    <div class="card">
                        <div class="card-header">
                            <h5 class="mb-0"><i class="fas fa-info-circle me-2"></i>基本信息</h5>
                        </div>
                        <div class="card-body">
                            <div class="info-grid">
                                <div class="info-item">
                                    <div class="info-label">团队名称</div>
                                    <div class="info-value">${this.team.name}</div>
                                </div>
                                <div class="info-item">
                                    <div class="info-label">团队类型</div>
                                    <div class="info-value">${this.getTeamTypeLabel(this.team.team_type)}</div>
                                </div>
                                <div class="info-item">
                                    <div class="info-label">团队状态</div>
                                    <div class="info-value">
                                        <span class="badge ${this.team.status === 'active' ? 'bg-success' : 'bg-secondary'}">
                                            ${this.getStatusLabel(this.team.status)}
                                        </span>
                                    </div>
                                </div>
                                <div class="info-item">
                                    <div class="info-label">创建者</div>
                                    <div class="info-value">
                                        ${this.team.creator ? this.team.creator.username : '未知'}
                                    </div>
                                </div>
                                <div class="info-item">
                                    <div class="info-label">创建时间</div>
                                    <div class="info-value">${new Date(this.team.created_at).toLocaleString('zh-CN')}</div>
                                </div>
                                <div class="info-item">
                                    <div class="info-label">更新时间</div>
                                    <div class="info-value">${new Date(this.team.updated_at).toLocaleString('zh-CN')}</div>
                                </div>
                            </div>

                            <!-- 团队审核设置 -->
                            ${Auth.hasPermission(['team:update']) ? `
                                <div class="mt-4 p-3" style="background: var(--gray-100); border-radius: 8px; border-left: 4px solid var(--primary-color);">
                                    <div class="d-flex justify-content-between align-items-center">
                                        <div>
                                            <div class="info-label mb-1">
                                                <i class="fas fa-shield-alt me-2"></i>加入审核设置
                                            </div>
                                            <div class="info-value" style="font-size: 13px; color: var(--gray-600);">
                                                ${this.team.require_approval ? '开启后，用户需要申请并等待管理员审核才能加入团队' : '关闭后，用户可以直接加入团队，无需审核'}
                                            </div>
                                        </div>
                                        <div class="form-check form-switch">
                                            <input class="form-check-input" type="checkbox" id="requireApprovalSwitch"
                                                   ${this.team.require_approval ? 'checked' : ''}
                                                   onchange="teamDetailPage.toggleApprovalSetting(this.checked)"
                                                   style="transform: scale(1.2);">
                                            <label class="form-check-label fw-bold" for="requireApprovalSwitch" style="color: ${this.team.require_approval ? 'var(--success-color)' : 'var(--gray-500)'};">
                                                ${this.team.require_approval ? '需要审核' : '直接加入'}
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            ` : ''}

                            ${this.team.description ? `
                                <div class="mt-3">
                                    <div class="info-label">团队描述</div>
                                    <div class="info-value" style="white-space: pre-wrap;">${this.team.description}</div>
                                </div>
                            ` : ''}
                        </div>
                    </div>

                    <!-- 标签页 -->
                    <div class="card">
                        <div class="card-header">
                            <ul class="nav nav-tabs card-header-tabs" role="tablist">
                                <li class="nav-item">
                                    <a class="nav-link active" data-bs-toggle="tab" href="#members" role="tab">
                                        <i class="fas fa-users me-2"></i>团队成员 (${this.members.length})
                                    </a>
                                </li>
                                ${this.team.require_approval && Auth.hasPermission(['team:update']) ? `
                                    <li class="nav-item">
                                        <a class="nav-link" data-bs-toggle="tab" href="#applications" role="tab" onclick="teamDetailPage.loadApplications()">
                                            <i class="fas fa-clipboard-list me-2"></i>加入申请
                                            <span id="applications-count-badge" class="badge bg-warning ms-1" style="display: none;">0</span>
                                        </a>
                                    </li>
                                ` : ''}
                                <li class="nav-item">
                                    <a class="nav-link" data-bs-toggle="tab" href="#activities" role="tab">
                                        <i class="fas fa-calendar-alt me-2"></i>团队活动 (${this.activities.length})
                                    </a>
                                </li>
                            </ul>
                        </div>
                        <div class="card-body">
                            <div class="tab-content">
                                <!-- 成员列表 -->
                                <div class="tab-pane fade show active" id="members" role="tabpanel">
                                    ${this.renderMembers()}
                                </div>

                                <!-- 加入申请列表 -->
                                ${this.team.require_approval && Auth.hasPermission(['team:update']) ? `
                                    <div class="tab-pane fade" id="applications" role="tabpanel">
                                        <div id="applications-content">
                                            <div class="text-center py-4">
                                                <div class="spinner-border text-primary" role="status">
                                                    <span class="visually-hidden">加载中...</span>
                                                </div>
                                                <p class="mt-2">正在加载申请列表...</p>
                                            </div>
                                        </div>
                                    </div>
                                ` : ''}

                                <!-- 活动列表 -->
                                <div class="tab-pane fade" id="activities" role="tabpanel">
                                    ${this.renderActivities()}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 右侧操作 -->
                <div class="col-lg-4">
                    <!-- 快速操作 -->
                    <div class="card">
                        <div class="card-header">
                            <h5 class="mb-0"><i class="fas fa-bolt me-2"></i>快速操作</h5>
                        </div>
                        <div class="card-body">
                            <div class="quick-actions">
                                ${Auth.hasPermission(['team:update']) ? `
                                    <button class="btn-quick btn-edit" onclick="teamDetailPage.editTeam()">
                                        <i class="fas fa-edit"></i>
                                        编辑团队信息
                                    </button>
                                ` : ''}

                                ${Auth.hasPermission(['team:read']) ? `
                                    <button class="btn-quick btn-manage-members" onclick="teamDetailPage.manageMembers()">
                                        <i class="fas fa-users-cog"></i>
                                        管理团队成员
                                    </button>
                                ` : ''}

                                ${this.team.require_approval && Auth.hasPermission(['team:update']) ? `
                                    <button class="btn-quick" style="background: var(--success-color); color: white;" onclick="teamDetailPage.viewApplications()">
                                        <i class="fas fa-clipboard-list"></i>
                                        查看加入申请
                                        <span id="pending-applications-badge" class="badge bg-warning ms-2" style="display: none;">0</span>
                                    </button>
                                ` : ''}

                                ${Auth.hasPermission(['activity:read']) ? `
                                    <button class="btn-quick btn-view-activities" onclick="teamDetailPage.viewAllActivities()">
                                        <i class="fas fa-calendar-alt"></i>
                                        查看所有活动
                                    </button>
                                ` : ''}

                                ${this.team.status === 'active' && Auth.hasPermission(['team:update']) ? `
                                    <button class="btn-quick" style="background: var(--warning-color); color: white;" onclick="teamDetailPage.deactivateTeam()">
                                        <i class="fas fa-pause"></i>
                                        停用团队
                                    </button>
                                ` : ''}

                                ${this.team.status === 'inactive' && Auth.hasPermission(['team:update']) ? `
                                    <button class="btn-quick btn-success" onclick="teamDetailPage.activateTeam()">
                                        <i class="fas fa-play"></i>
                                        激活团队
                                    </button>
                                ` : ''}
                            </div>
                        </div>
                    </div>

                    <!-- 团队统计 -->
                    <div class="card">
                        <div class="card-header">
                            <h5 class="mb-0"><i class="fas fa-chart-pie me-2"></i>团队统计</h5>
                        </div>
                        <div class="card-body">
                            <div class="info-grid">
                                <div class="info-item text-center">
                                    <div class="stat-value" style="color: var(--primary-color); font-size: 28px;">
                                        ${this.members.filter(m => m.role === 'admin').length}
                                    </div>
                                    <div class="stat-label">管理员</div>
                                </div>
                                <div class="info-item text-center">
                                    <div class="stat-value" style="color: var(--success-color); font-size: 28px;">
                                        ${this.members.filter(m => m.role === 'member').length}
                                    </div>
                                    <div class="stat-label">普通成员</div>
                                </div>
                            </div>
                            <hr>
                            <div class="info-item">
                                <div class="info-label">最近活动</div>
                                <div class="info-value">
                                    ${this.activities.length > 0 ?
                                        new Date(this.activities[0].created_at).toLocaleDateString('zh-CN') :
                                        '暂无活动'
                                    }
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    renderMembers() {
        if (this.members.length === 0) {
            return `
                <div class="empty-state">
                    <div class="empty-icon"><i class="fas fa-users"></i></div>
                    <p>暂无团队成员</p>
                </div>
            `;
        }

        return `
            <div class="members-container">
                ${this.members.map(member => `
                    <div class="member-item">
                        <div class="member-avatar ${member.role === 'admin' ? 'leader' : ''}">
                            ${member.avatar ?
                                `<img src="${member.avatar}" alt="${member.username}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">` :
                                member.username ? member.username.charAt(0).toUpperCase() : '?'
                            }
                        </div>
                        <div class="member-info">
                            <div class="member-name">${member.nickname || member.username}</div>
                            <div class="member-email">${member.email || ''}</div>
                            <span class="member-role role-${member.role}">
                                <i class="fas fa-${member.role === 'admin' ? 'crown' : 'user'}"></i>
                                ${member.role === 'admin' ? '管理员' : '成员'}
                            </span>
                        </div>
                        <div class="member-joined">
                            加入于 ${new Date(member.joined_at || member.TeamMember?.joined_at).toLocaleDateString('zh-CN')}
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    renderActivities() {
        // 确保 this.activities 是数组
        const activities = Array.isArray(this.activities) ? this.activities : [];

        if (activities.length === 0) {
            return `
                <div class="empty-state">
                    <div class="empty-icon"><i class="fas fa-calendar-alt"></i></div>
                    <p>该团队暂无活动</p>
                    ${Auth.hasPermission(['activity:create']) ? `
                        <button class="btn btn-primary mt-3" onclick="teamDetailPage.createActivity()">
                            <i class="fas fa-plus me-2"></i>创建第一个活动
                        </button>
                    ` : ''}
                </div>
            `;
        }

        return `
            <div class="activities-grid">
                ${activities.slice(0, 6).map(activity => `
                    <div class="activity-card">
                        <div class="activity-card-title">${activity.title}</div>
                        <div class="activity-card-meta">
                            <span class="activity-card-badge badge-type">
                                ${this.getActivityTypeLabel(activity.activity_type)}
                            </span>
                            <span class="activity-card-badge badge-status">
                                ${this.getActivityStatusLabel(activity.status)}
                            </span>
                        </div>
                        <div class="activity-card-info">
                            <i class="fas fa-calendar me-1"></i>
                            ${new Date(activity.start_time).toLocaleDateString('zh-CN')} - ${new Date(activity.end_time).toLocaleDateString('zh-CN')}
                        </div>
                        <div class="activity-card-info">
                            <i class="fas fa-users me-1"></i>
                            ${activity.current_participants || 0} 人参与
                        </div>
                        <button class="btn btn-sm btn-outline-primary mt-2" onclick="teamDetailPage.viewActivity('${activity.id}')">
                            查看详情
                        </button>
                    </div>
                `).join('')}
            </div>
            ${activities.length > 6 ? `
                <div class="text-center mt-3">
                    <button class="btn btn-outline-primary" onclick="teamDetailPage.viewAllActivities()">
                        查看全部 ${activities.length} 个活动
                    </button>
                </div>
            ` : ''}
        `;
    }

    // 操作方法
    editTeam() {
        Router.navigate(`/teams/edit/${this.teamId}`);
    }

    manageMembers() {
        Router.navigate(`/teams/${this.teamId}/members`);
    }

    viewAllActivities() {
        Router.navigate(`/activities?team_id=${this.teamId}`);
    }

    viewActivity(activityId) {
        window.location.href = `/activity-detail-page.html?id=${activityId}`;
    }

    createActivity() {
        Router.navigate('/activities/create', { team_id: this.teamId });
    }

    async deactivateTeam() {
        if (!confirm('确定要停用该团队吗？停用后将无法进行新的活动。')) {
            return;
        }

        try {
            const response = await API.teams.update(this.teamId, { status: 'inactive' });
            if (response.success) {
                Utils.toast.success('团队已停用');
                this.loadTeamDetail(); // 重新加载页面
            } else {
                throw new Error(response.message || '操作失败');
            }
        } catch (error) {
            Utils.toast.error('停用团队失败: ' + error.message);
        }
    }

    async activateTeam() {
        if (!confirm('确定要激活该团队吗？')) {
            return;
        }

        try {
            const response = await API.teams.update(this.teamId, { status: 'active' });
            if (response.success) {
                Utils.toast.success('团队已激活');
                this.loadTeamDetail(); // 重新加载页面
            } else {
                throw new Error(response.message || '操作失败');
            }
        } catch (error) {
            Utils.toast.error('激活团队失败: ' + error.message);
        }
    }

    // 切换审核设置
    async toggleApprovalSetting(requireApproval) {
        const action = requireApproval ? '开启' : '关闭';

        try {
            // 显示加载状态
            const switchElement = document.getElementById('requireApprovalSwitch');
            if (switchElement) {
                switchElement.disabled = true;
            }

            const response = await API.put(`/miniapp/teams/${this.teamId}/settings`, {
                require_approval: requireApproval
            });

            if (response.success) {
                Utils.toast.success(`审核设置已${action}`);
                this.team.require_approval = requireApproval;

                // 重新渲染页面以更新UI
                this.render();

                // 如果开启了审核，加载待审核申请数量
                if (requireApproval) {
                    this.loadPendingApplicationsCount();
                }
            } else {
                throw new Error(response.message || '操作失败');
            }
        } catch (error) {
            console.error('切换审核设置失败:', error);
            Utils.toast.error(`${action}审核设置失败: ` + error.message);

            // 恢复开关状态
            const switchElement = document.getElementById('requireApprovalSwitch');
            if (switchElement) {
                switchElement.checked = !requireApproval;
                switchElement.disabled = false;
            }
        }
    }

    // 查看团队申请
    viewApplications() {
        // 跳转到团队设置页面的申请管理部分
        window.location.href = `/team-settings.html?id=${this.teamId}#applications`;
    }

    // 加载待审核申请数量
    async loadPendingApplicationsCount() {
        if (!this.team.require_approval) return;

        try {
            const response = await API.get(`/miniapp/teams/${this.teamId}/applications`);
            if (response.success && response.data) {
                const pendingCount = response.data.filter(app => app.status === 'pending').length;
                const badge = document.getElementById('pending-applications-badge');
                if (badge && pendingCount > 0) {
                    badge.textContent = pendingCount;
                    badge.style.display = 'inline-block';
                }

                // 更新标签页徽章
                const tabBadge = document.getElementById('applications-count-badge');
                if (tabBadge && pendingCount > 0) {
                    tabBadge.textContent = pendingCount;
                    tabBadge.style.display = 'inline-block';
                }
            }
        } catch (error) {
            console.error('加载待审核申请数量失败:', error);
        }
    }

    // 加载申请列表
    async loadApplications() {
        if (!this.team.require_approval) return;

        try {
            const response = await API.get(`/miniapp/teams/${this.teamId}/applications`);
            if (response.success && response.data) {
                this.applications = response.data;
                this.renderApplications();
            } else {
                throw new Error(response.message || '获取申请列表失败');
            }
        } catch (error) {
            console.error('加载申请列表失败:', error);
            const content = document.getElementById('applications-content');
            if (content) {
                content.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-icon"><i class="fas fa-exclamation-circle"></i></div>
                        <p>加载申请列表失败</p>
                        <small class="text-muted">${error.message}</small>
                        <button class="btn btn-sm btn-primary mt-2" onclick="teamDetailPage.loadApplications()">
                            <i class="fas fa-redo"></i> 重试
                        </button>
                    </div>
                `;
            }
        }
    }

    // 渲染申请列表
    renderApplications() {
        const content = document.getElementById('applications-content');
        if (!content) return;

        if (this.applications.length === 0) {
            content.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon"><i class="fas fa-clipboard-list"></i></div>
                    <p>暂无加入申请</p>
                    <small class="text-muted">当前没有待处理的团队加入申请</small>
                </div>
            `;
            return;
        }

        const pendingApplications = this.applications.filter(app => app.status === 'pending');
        const processedApplications = this.applications.filter(app => app.status !== 'pending');

        content.innerHTML = `
            ${pendingApplications.length > 0 ? `
                <div class="mb-4">
                    <h6 class="text-warning mb-3">
                        <i class="fas fa-clock me-2"></i>待处理申请 (${pendingApplications.length})
                    </h6>
                    <div class="applications-list">
                        ${pendingApplications.map(app => this.renderApplicationItem(app, true)).join('')}
                    </div>
                </div>
            ` : ''}

            ${processedApplications.length > 0 ? `
                <div>
                    <h6 class="text-muted mb-3">
                        <i class="fas fa-history me-2"></i>已处理申请 (${processedApplications.length})
                    </h6>
                    <div class="applications-list">
                        ${processedApplications.slice(0, 5).map(app => this.renderApplicationItem(app, false)).join('')}
                    </div>
                    ${processedApplications.length > 5 ? `
                        <div class="text-center mt-3">
                            <button class="btn btn-sm btn-outline-secondary" onclick="teamDetailPage.showAllProcessedApplications()">
                                查看全部 ${processedApplications.length} 个已处理申请
                            </button>
                        </div>
                    ` : ''}
                </div>
            ` : ''}
        `;
    }

    // 辅助方法
    getTeamTypeLabel(type) {
        const types = {
            'general': '通用团队',
            'development': '开发团队',
            'testing': '测试团队',
            'design': '设计团队',
            'marketing': '市场团队',
            'operation': '运营团队',
            'research': '研究团队',
            'support': '支持团队'
        };
        return types[type] || type;
    }

    getStatusLabel(status) {
        const labels = {
            'active': '活跃',
            'inactive': '停用',
            'dissolved': '已解散'
        };
        return labels[status] || status;
    }

    getActivityTypeLabel(type) {
        const types = {
            'meeting': '会议',
            'training': '培训',
            'workshop': '工作坊',
            'social': '社交',
            'sports': '运动',
            'travel': '旅行',
            'other': '其他'
        };
        return types[type] || type;
    }

    getActivityStatusLabel(status) {
        const labels = {
            'draft': '草稿',
            'published': '已发布',
            'ongoing': '进行中',
            'completed': '已完成',
            'cancelled': '已取消'
        };
        return labels[status] || status;
    }

    // 渲染单个申请项目
    renderApplicationItem(application, isPending) {
        const statusConfig = {
            'pending': { color: 'warning', icon: 'clock', text: '待审核' },
            'approved': { color: 'success', icon: 'check', text: '已批准' },
            'rejected': { color: 'danger', icon: 'times', text: '已拒绝' },
            'cancelled': { color: 'secondary', icon: 'ban', text: '已取消' }
        };

        const config = statusConfig[application.status] || statusConfig.pending;
        const applicationTime = new Date(application.application_time || application.created_at).toLocaleString('zh-CN');

        return `
            <div class="application-item ${isPending ? 'pending' : 'processed'}" data-id="${application.id}" style="border: 1px solid #e9ecef; border-radius: 8px; padding: 15px; margin-bottom: 15px; background: ${isPending ? '#fff8e1' : '#f8f9fa'};">
                <div class="d-flex justify-content-between align-items-start mb-2">
                    <div class="d-flex align-items-center">
                        <div style="width: 40px; height: 40px; border-radius: 50%; background: #007bff; color: white; display: flex; align-items: center; justify-content: center; margin-right: 12px; font-weight: bold;">
                            ${application.user?.profile?.avatar ?
                                `<img src="${application.user.profile.avatar}" alt="${application.user.username}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">` :
                                application.user?.username?.charAt(0).toUpperCase() || '?'
                            }
                        </div>
                        <div>
                            <div style="font-weight: 600; color: #333;">${application.user?.username || '未知用户'}</div>
                            <div style="font-size: 13px; color: #666;">
                                <i class="fas fa-calendar-alt me-1"></i>
                                ${applicationTime}
                            </div>
                        </div>
                    </div>
                    <span class="badge bg-${config.color}">
                        <i class="fas fa-${config.icon} me-1"></i>
                        ${config.text}
                    </span>
                </div>

                ${application.reason ? `
                    <div style="background: #f8f9fa; padding: 10px; border-radius: 6px; margin-bottom: 12px;">
                        <i class="fas fa-comment me-2 text-primary"></i>
                        <span style="color: #555;">${application.reason}</span>
                    </div>
                ` : ''}

                ${isPending ? `
                    <div class="d-flex gap-2">
                        <button class="btn btn-sm btn-success" onclick="teamDetailPage.approveApplication('${application.id}')">
                            <i class="fas fa-check me-1"></i>批准
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="teamDetailPage.showRejectModal('${application.id}')">
                            <i class="fas fa-times me-1"></i>拒绝
                        </button>
                    </div>
                ` : `
                    ${application.status === 'rejected' && application.rejection_reason ? `
                        <div style="background: #fff3cd; padding: 8px; border-radius: 4px; border-left: 3px solid #ffc107;">
                            <i class="fas fa-exclamation-triangle me-2 text-warning"></i>
                            <small style="color: #856404;">拒绝理由：${application.rejection_reason}</small>
                        </div>
                    ` : ''}
                    ${(application.approved_at || application.rejected_at) ? `
                        <div style="margin-top: 8px;">
                            <small class="text-muted">
                                <i class="fas fa-clock me-1"></i>
                                处理时间：${new Date(application.approved_at || application.rejected_at).toLocaleString('zh-CN')}
                            </small>
                        </div>
                    ` : ''}
                `}
            </div>
        `;
    }

    // 批准申请
    async approveApplication(applicationId) {
        if (!confirm('确定要批准这个加入申请吗？')) {
            return;
        }

        try {
            const response = await API.post(`/miniapp/teams/${this.teamId}/applications/${applicationId}/approve`);
            if (response.success) {
                Utils.toast.success('申请已批准');
                // 重新加载申请列表和成员列表
                await this.loadApplications();
                await this.loadTeamDetail();
            } else {
                throw new Error(response.message || '批准申请失败');
            }
        } catch (error) {
            console.error('批准申请失败:', error);
            Utils.toast.error('批准申请失败: ' + error.message);
        }
    }

    // 显示拒绝申请模态框
    showRejectModal(applicationId) {
        const application = this.applications.find(app => app.id === applicationId);
        if (!application) return;

        // 创建模态框HTML
        const modalHtml = `
            <div class="modal fade" id="rejectApplicationModal" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">
                                <i class="fas fa-times-circle text-danger me-2"></i>
                                拒绝加入申请
                            </h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div class="mb-3">
                                <strong>申请人：</strong>${application.user?.username || '未知用户'}
                            </div>
                            ${application.reason ? `
                                <div class="mb-3">
                                    <strong>申请理由：</strong>
                                    <div class="text-muted">${application.reason}</div>
                                </div>
                            ` : ''}
                            <div class="mb-3">
                                <label for="rejectionReason" class="form-label">
                                    <i class="fas fa-comment me-1"></i>拒绝理由 <span class="text-danger">*</span>
                                </label>
                                <textarea class="form-control" id="rejectionReason" rows="3"
                                          placeholder="请输入拒绝理由，这将发送给申请人"></textarea>
                                <div class="form-text">请详细说明拒绝的原因，帮助申请人了解情况</div>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">取消</button>
                            <button type="button" class="btn btn-danger" onclick="teamDetailPage.rejectApplication('${applicationId}')">
                                <i class="fas fa-times me-1"></i>确认拒绝
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // 移除已存在的模态框
        const existingModal = document.getElementById('rejectApplicationModal');
        if (existingModal) {
            existingModal.remove();
        }

        // 添加新模态框到页面
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        // 显示模态框
        const modal = new bootstrap.Modal(document.getElementById('rejectApplicationModal'));
        modal.show();

        // 模态框关闭时清理
        document.getElementById('rejectApplicationModal').addEventListener('hidden.bs.modal', function() {
            this.remove();
        });
    }

    // 拒绝申请
    async rejectApplication(applicationId) {
        const reasonTextarea = document.getElementById('rejectionReason');
        const reason = reasonTextarea?.value?.trim();

        if (!reason) {
            Utils.toast.error('请输入拒绝理由');
            reasonTextarea?.focus();
            return;
        }

        try {
            const response = await API.post(`/miniapp/teams/${this.teamId}/applications/${applicationId}/reject`, {
                reason: reason
            });

            if (response.success) {
                Utils.toast.success('申请已拒绝');

                // 关闭模态框
                const modal = bootstrap.Modal.getInstance(document.getElementById('rejectApplicationModal'));
                if (modal) {
                    modal.hide();
                }

                // 重新加载申请列表
                await this.loadApplications();
            } else {
                throw new Error(response.message || '拒绝申请失败');
            }
        } catch (error) {
            console.error('拒绝申请失败:', error);
            Utils.toast.error('拒绝申请失败: ' + error.message);
        }
    }

    // 显示所有已处理申请
    showAllProcessedApplications() {
        // 这里可以实现显示所有已处理申请的逻辑
        // 暂时简单地重新渲染，显示更多项目
        this.renderApplications();
    }

    showError(message) {
        const container = document.getElementById('team-detail-container');
        if (container) {
            container.innerHTML = `
                <div class="alert alert-danger m-3" role="alert">
                    <i class="fas fa-exclamation-circle me-2"></i>
                    ${message}
                </div>
            `;
        }
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    window.teamDetailPage = new TeamDetailPage();
});