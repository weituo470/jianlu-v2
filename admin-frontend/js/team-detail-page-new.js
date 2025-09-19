// 团队详情页面 - 修复版本
class TeamDetailPage {
    constructor() {
        this.teamId = null;
        this.team = null;
        this.members = [];
        this.activities = [];
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
                    this.activities = Array.isArray(activitiesData) ? activitiesData : [];
                }

                // 渲染页面
                this.render();
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
                Utils.showSuccess('团队已停用');
                this.loadTeamDetail(); // 重新加载页面
            } else {
                throw new Error(response.message || '操作失败');
            }
        } catch (error) {
            Utils.showError('停用团队失败: ' + error.message);
        }
    }

    async activateTeam() {
        if (!confirm('确定要激活该团队吗？')) {
            return;
        }

        try {
            const response = await API.teams.update(this.teamId, { status: 'active' });
            if (response.success) {
                Utils.showSuccess('团队已激活');
                this.loadTeamDetail(); // 重新加载页面
            } else {
                throw new Error(response.message || '操作失败');
            }
        } catch (error) {
            Utils.showError('激活团队失败: ' + error.message);
        }
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