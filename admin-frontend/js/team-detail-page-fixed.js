// 团队详情页面 - 最终修复版本
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
                    if (Array.isArray(activitiesData)) {
                        this.activities = activitiesData;
                    }
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

        container.innerHTML = `
            <div class="alert alert-info">
                <h4>团队详情</h4>
                <p><strong>团队名称:</strong> ${this.team.name}</p>
                <p><strong>团队ID:</strong> ${this.team.id}</p>
                <p><strong>成员数量:</strong> ${this.members.length}</p>
                <p><strong>活动数量:</strong> ${this.activities.length}</p>
                <p><strong>创建时间:</strong> ${new Date(this.team.created_at).toLocaleString('zh-CN')}</p>
                <p><strong>团队类型:</strong> ${this.getTeamTypeLabel(this.team.team_type)}</p>
                <p><strong>团队状态:</strong> ${this.getStatusLabel(this.team.status)}</p>
            </div>

            ${this.members.length > 0 ? `
                <div class="card mt-3">
                    <div class="card-header">
                        <h5>团队成员列表</h5>
                    </div>
                    <div class="card-body">
                        ${this.members.map(member => `
                            <div class="mb-2 p-2 border rounded">
                                <strong>${member.nickname || member.username}</strong>
                                ${member.email ? `<br><small>${member.email}</small>` : ''}
                                <br><span class="badge bg-${member.role === 'admin' ? 'warning' : 'primary'}">
                                    ${member.role === 'admin' ? '管理员' : '成员'}
                                </span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}

            ${this.activities.length > 0 ? `
                <div class="card mt-3">
                    <div class="card-header">
                        <h5>团队活动列表</h5>
                    </div>
                    <div class="card-body">
                        ${this.activities.slice(0, 5).map(activity => `
                            <div class="mb-2 p-2 border rounded">
                                <strong>${activity.title}</strong>
                                <br><small>${new Date(activity.start_time).toLocaleDateString('zh-CN')}</small>
                                <br><span class="badge bg-success">${this.getActivityStatusLabel(activity.status)}</span>
                            </div>
                        `).join('')}
                    </div>
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