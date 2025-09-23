// 团队设置管理
class TeamSettingsManager {
    constructor() {
        this.teamId = null;
        this.currentTeam = null;
        this.currentApplication = null;
        this.init();
    }

    init() {
        // 从URL获取团队ID
        const urlParams = new URLSearchParams(window.location.search);
        this.teamId = urlParams.get('id');
        
        if (!this.teamId) {
            showMessage('未指定团队ID', 'error');
            setTimeout(() => window.location.href = '/teams/list', 2000);
            return;
        }

        this.bindEvents();
        this.loadTeamInfo();
        this.loadApplications();
    }

    bindEvents() {
        // 保存设置
        document.getElementById('save-settings').addEventListener('click', () => {
            this.saveSettings();
        });

        // 重置设置
        document.getElementById('reset-settings').addEventListener('click', () => {
            this.resetSettings();
        });

        // 刷新申请列表
        document.getElementById('refresh-applications').addEventListener('click', () => {
            this.loadApplications();
        });

        // 审核开关变化
        document.getElementById('require-approval').addEventListener('change', (e) => {
            const applicationsCard = document.getElementById('applications-card');
            if (e.target.checked) {
                applicationsCard.style.display = 'block';
                this.loadApplications();
            } else {
                applicationsCard.style.display = 'none';
            }
        });

        // 批准申请
        document.getElementById('approve-btn').addEventListener('click', () => {
            this.approveApplication();
        });

        // 拒绝申请
        document.getElementById('reject-btn').addEventListener('click', () => {
            this.showRejectModal();
        });

        // 确认拒绝
        document.getElementById('confirm-reject').addEventListener('click', () => {
            this.rejectApplication();
        });
    }

    async loadTeamInfo() {
        try {
            const response = await api.get(`/teams/${this.teamId}`);
            this.currentTeam = response.data.team;
            this.renderTeamInfo();
            
            // 设置审核开关状态
            const requireApprovalCheckbox = document.getElementById('require-approval');
            requireApprovalCheckbox.checked = this.currentTeam.require_approval;
            
            // 显示/隐藏申请管理卡片
            const applicationsCard = document.getElementById('applications-card');
            if (this.currentTeam.require_approval) {
                applicationsCard.style.display = 'block';
            }
            
        } catch (error) {
            console.error('加载团队信息失败:', error);
            showMessage('加载团队信息失败', 'error');
        }
    }

    renderTeamInfo() {
        const teamInfoContainer = document.getElementById('team-info');
        teamInfoContainer.innerHTML = `
            <div class="team-info-grid">
                <div class="info-item">
                    <label>团队名称：</label>
                    <span>${this.currentTeam.name}</span>
                </div>
                <div class="info-item">
                    <label>团队类型：</label>
                    <span>${this.currentTeam.team_type || '通用'}</span>
                </div>
                <div class="info-item">
                    <label>成员数量：</label>
                    <span>${this.currentTeam.member_count || 0} 人</span>
                </div>
                <div class="info-item">
                    <label>创建时间：</label>
                    <span>${formatDate(this.currentTeam.created_at)}</span>
                </div>
                <div class="info-item full-width">
                    <label>团队描述：</label>
                    <span>${this.currentTeam.description || '暂无描述'}</span>
                </div>
            </div>
        `;
    }

    async saveSettings() {
        try {
            const requireApproval = document.getElementById('require-approval').checked;
            
            const response = await api.put(`/miniapp/teams/${this.teamId}/settings`, {
                require_approval: requireApproval
            });
            
            showMessage('设置保存成功', 'success');
            this.currentTeam.require_approval = requireApproval;
            
            // 更新申请管理卡片显示状态
            const applicationsCard = document.getElementById('applications-card');
            if (requireApproval) {
                applicationsCard.style.display = 'block';
                this.loadApplications();
            } else {
                applicationsCard.style.display = 'none';
            }
            
        } catch (error) {
            console.error('保存设置失败:', error);
            showMessage('保存设置失败', 'error');
        }
    }

    resetSettings() {
        if (this.currentTeam) {
            document.getElementById('require-approval').checked = this.currentTeam.require_approval;
            
            const applicationsCard = document.getElementById('applications-card');
            if (this.currentTeam.require_approval) {
                applicationsCard.style.display = 'block';
            } else {
                applicationsCard.style.display = 'none';
            }
        }
    }

    async loadApplications() {
        try {
            const response = await api.get(`/miniapp/teams/${this.teamId}/applications`);
            this.renderApplications(response.data.applications);
        } catch (error) {
            console.error('加载申请列表失败:', error);
            showMessage('加载申请列表失败', 'error');
        }
    }

    renderApplications(applications) {
        const applicationsContainer = document.getElementById('applications-list');
        
        if (!applications || applications.length === 0) {
            applicationsContainer.innerHTML = `
                <div class="empty-state">
                    <p>暂无待审核申请</p>
                </div>
            `;
            return;
        }

        applicationsContainer.innerHTML = applications.map(app => `
            <div class="application-item" data-id="${app.id}">
                <div class="application-info">
                    <div class="applicant-name">${app.user.username}</div>
                    <div class="application-time">${formatDate(app.applied_at)}</div>
                    <div class="application-reason">${app.reason || '无申请理由'}</div>
                </div>
                <div class="application-actions">
                    <button class="btn btn-success btn-sm" onclick="teamSettings.showApplicationModal('${app.id}')">
                        查看详情
                    </button>
                </div>
            </div>
        `).join('');
    }

    showApplicationModal(applicationId) {
        // 这里会在下一部分实现
        console.log('Show application modal for:', applicationId);
    }

    showRejectModal() {
        document.getElementById('reject-modal').style.display = 'flex';
    }

    closeRejectModal() {
        document.getElementById('reject-modal').style.display = 'none';
        document.getElementById('reject-reason').value = '';
    }

    async approveApplication() {
        // 这里会在下一部分实现
        console.log('Approve application');
    }

    async rejectApplication() {
        // 这里会在下一部分实现
        console.log('Reject application');
    }
}

// 全局函数
function closeApplicationModal() {
    document.getElementById('application-modal').style.display = 'none';
}

function closeRejectModal() {
    teamSettings.closeRejectModal();
}

// 初始化
const teamSettings = new TeamSettingsManager();
