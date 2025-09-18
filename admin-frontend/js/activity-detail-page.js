// 活动详情页数据处理文件

class ActivityDetailPage {
    constructor() {
        this.activityId = null;
        this.activityData = null;
        this.participantsData = [];
    }

    // 初始化页面
    async init() {
        console.log('ActivityDetailPage.init() called');
        
        // 如果没有通过路由传递活动ID，则从URL参数获取
        if (!this.activityId) {
            const urlParams = new URLSearchParams(window.location.search);
            this.activityId = urlParams.get('id');
        }
        
        if (!this.activityId) {
            console.error('未找到活动ID');
            this.showError('无效的活动ID');
            return;
        }

        // 显示加载状态
        this.showLoading();

        try {
            console.log('开始加载活动数据，活动ID:', this.activityId);
            
            // 并行获取活动详情和参与者数据
            await Promise.all([
                this.loadActivityDetail(),
                this.loadParticipants()
            ]);

            // 渲染页面
            this.renderPage();
        } catch (error) {
            console.error('加载数据失败:', error);
            this.showError('加载数据失败: ' + error.message);
        }
    }

    // 显示加载状态
    showLoading() {
        const container = document.getElementById('activity-detail-container');
        if (container) {
            container.innerHTML = `
                <div class="text-center py-5">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">加载中...</span>
                    </div>
                    <p class="mt-2">正在加载活动详情...</p>
                </div>
            `;
        }
    }

    // 显示错误信息
    showError(message) {
        const container = document.getElementById('activity-detail-container');
        if (container) {
            container.innerHTML = `
                <div class="alert alert-danger" role="alert">
                    <i class="fas fa-exclamation-circle me-2"></i>
                    ${message}
                    <button class="btn btn-outline-danger btn-sm ms-3" onclick="activityDetailPage.init()">
                        <i class="fas fa-sync-alt me-1"></i>重新加载
                    </button>
                </div>
            `;
        }
    }

    // 加载活动详情
    async loadActivityDetail() {
        try {
            console.log('开始获取活动详情，ID:', this.activityId);
            const response = await API.activities.getDetail(this.activityId);
            console.log('活动详情响应:', response);
            
            if (response.success) {
                this.activityData = response.data;
                console.log('活动详情:', this.activityData);
            } else {
                throw new Error(response.message || '获取活动详情失败');
            }
        } catch (error) {
            console.error('获取活动详情失败:', error);
            throw error;
        }
    }

    // 加载参与者数据
    async loadParticipants() {
        try {
            console.log('开始获取参与者数据，活动ID:', this.activityId);
            const response = await API.activities.getParticipants(this.activityId);
            console.log('参与者数据响应:', response);
            
            if (response.success) {
                this.participantsData = response.data.participants || [];
                console.log('参与者数据:', this.participantsData);
            } else {
                throw new Error(response.message || '获取参与者数据失败');
            }
        } catch (error) {
            console.error('获取参与者数据失败:', error);
            throw error;
        }
    }

    // 渲染页面
    renderPage() {
        const container = document.getElementById('activity-detail-container');
        if (!container) {
            console.error('未找到页面容器');
            return;
        }

        // 检查必要数据是否存在
        if (!this.activityData) {
            this.showError('活动数据不存在');
            return;
        }

        // 分离不同状态的参与者
        const pendingParticipants = this.participantsData.filter(p => p.status === 'pending');
        const approvedParticipants = this.participantsData.filter(p => p.status === 'approved');
        const rejectedParticipants = this.participantsData.filter(p => p.status === 'rejected');

        // 渲染页面内容
        container.innerHTML = `
            <!-- 页面头部 -->
            <div class="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h1 class="h3 mb-0">活动管理</h1>
                    <nav aria-label="breadcrumb">
                        <ol class="breadcrumb">
                            <li class="breadcrumb-item"><a href="#" onclick="goToList()">活动列表</a></li>
                            <li class="breadcrumb-item active">活动详情</li>
                        </ol>
                    </nav>
                </div>
                <button class="btn btn-outline-secondary" onclick="goToList()">
                    <i class="fas fa-arrow-left me-2"></i>返回列表
                </button>
            </div>

            <!-- 活动头部信息 -->
            <div class="activity-header">
                <h2 class="activity-title">${this.activityData.title || '未命名活动'}</h2>
                
                <div class="activity-meta">
                    <div class="meta-tag">
                        <i class="fas fa-tag"></i>
                        <span>${this.getActivityTypeLabel(this.activityData.type)}</span>
                    </div>
                    <div class="meta-tag">
                        <i class="fas fa-users"></i>
                        <span>${this.activityData.team?.name || '未指定团队'}</span>
                    </div>
                    <div class="meta-tag">
                        <i class="fas fa-user"></i>
                        <span>${this.activityData.creator?.username || '未知用户'}</span>
                    </div>
                </div>
                
                <div class="activity-stats">
                    <div class="stat-card">
                        <div class="stat-value">${this.participantsData.length}</div>
                        <div class="stat-label">总参与</div>
                    </div>
                    ${this.activityData.total_cost ? `
                    <div class="stat-card">
                        <div class="stat-value">¥${parseFloat(this.activityData.total_cost).toFixed(2)}</div>
                        <div class="stat-label">总费用</div>
                    </div>
                    ` : ''}
                    ${this.activityData.total_cost && this.participantsData.length > 0 ? `
                    <div class="stat-card">
                        <div class="stat-value">¥${(parseFloat(this.activityData.total_cost) / this.participantsData.length).toFixed(2)}</div>
                        <div class="stat-label">人均费用</div>
                    </div>
                    ` : ''}
                </div>
            </div>

            <div class="row">
                <!-- 左侧内容 -->
                <div class="col-lg-8">
                    <!-- 活动信息卡片 -->
                    <div class="card">
                        <div class="card-header d-flex justify-content-between align-items-center">
                            <span><i class="fas fa-info-circle me-2"></i>活动信息</span>
                            <span class="badge ${this.getStatusBadgeClass(this.activityData.status)}">${this.getStatusLabel(this.activityData.status)}</span>
                        </div>
                        <div class="card-body">
                            <div class="info-grid">
                                <div class="info-item">
                                    <div class="info-label">开始时间</div>
                                    <div class="info-value">${this.activityData.start_time ? new Date(this.activityData.start_time).toLocaleString() : '未设置'}</div>
                                </div>
                                <div class="info-item">
                                    <div class="info-label">结束时间</div>
                                    <div class="info-value">${this.activityData.end_time ? new Date(this.activityData.end_time).toLocaleString() : '未设置'}</div>
                                </div>
                                <div class="info-item">
                                    <div class="info-label">活动地点</div>
                                    <div class="info-value">${this.activityData.location || '未设置'}</div>
                                </div>
                                <div class="info-item">
                                    <div class="info-label">人数限制</div>
                                    <div class="info-value">${this.activityData.max_participants ? this.activityData.max_participants + '人' : '不限制'}</div>
                                </div>
                            </div>
                            
                            ${this.activityData.description ? `
                            <div class="mb-3">
                                <div class="info-label mb-2">活动描述</div>
                                <div class="info-value">
                                    ${this.activityData.description}
                                </div>
                            </div>
                            ` : ''}
                            
                            ${this.activityData.cost_description ? `
                            <div class="mb-3">
                                <div class="info-label mb-2">费用说明</div>
                                <div class="info-value">
                                    ${this.activityData.cost_description}
                                </div>
                            </div>
                            ` : ''}
                        </div>
                    </div>

                    <!-- 参与者列表 -->
                    <div class="card">
                        <div class="card-header d-flex justify-content-between align-items-center">
                            <span><i class="fas fa-users me-2"></i>参与者列表</span>
                            <span class="badge bg-primary">${this.participantsData.length}人</span>
                        </div>
                        <div class="card-body">
                            <ul class="nav nav-tabs" id="participantsTab" role="tablist">
                                <li class="nav-item" role="presentation">
                                    <button class="nav-link active" id="all-tab" data-bs-toggle="tab" data-bs-target="#all" type="button" role="tab">全部 (${this.participantsData.length})</button>
                                </li>
                                <li class="nav-item" role="presentation">
                                    <button class="nav-link" id="approved-tab" data-bs-toggle="tab" data-bs-target="#approved" type="button" role="tab">已批准 (${approvedParticipants.length})</button>
                                </li>
                                <li class="nav-item" role="presentation">
                                    <button class="nav-link" id="pending-tab" data-bs-toggle="tab" data-bs-target="#pending" type="button" role="tab">待审核 (${pendingParticipants.length})</button>
                                </li>
                            </ul>
                            
                            <div class="tab-content" id="participantsTabContent">
                                <div class="tab-pane fade show active" id="all" role="tabpanel">
                                    ${this.renderParticipantsTable(this.participantsData)}
                                </div>
                                
                                <div class="tab-pane fade" id="approved" role="tabpanel">
                                    ${this.renderParticipantsTable(approvedParticipants)}
                                </div>
                                
                                <div class="tab-pane fade" id="pending" role="tabpanel">
                                    ${this.renderParticipantsTable(pendingParticipants)}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- 右侧内容 -->
                <div class="col-lg-4">
                    <!-- 待审核申请 -->
                    <div class="card">
                        <div class="card-header d-flex justify-content-between align-items-center">
                            <span><i class="fas fa-user-clock me-2"></i>待审核申请</span>
                            <span class="badge bg-warning text-dark">${pendingParticipants.length}</span>
                        </div>
                        <div class="card-body applications-container">
                            ${pendingParticipants.length > 0 ? 
                                pendingParticipants.map(participant => this.renderApplicationItem(participant)).join('') :
                                `<div class="empty-state">
                                    <div class="empty-icon">
                                        <i class="fas fa-inbox"></i>
                                    </div>
                                    <p class="mb-0">暂无待审核申请</p>
                                </div>`
                            }
                        </div>
                    </div>

                    <!-- 参与者统计 -->
                    <div class="card">
                        <div class="card-header">
                            <span><i class="fas fa-chart-pie me-2"></i>参与者统计</span>
                        </div>
                        <div class="card-body">
                            <div class="stats-grid">
                                <div class="stat-box stat-approved">
                                    <div class="stat-number">${approvedParticipants.length}</div>
                                    <div class="stat-text">已批准</div>
                                </div>
                                <div class="stat-box stat-pending">
                                    <div class="stat-number">${pendingParticipants.length}</div>
                                    <div class="stat-text">待审核</div>
                                </div>
                                <div class="stat-box stat-rejected">
                                    <div class="stat-number">${rejectedParticipants.length}</div>
                                    <div class="stat-text">已拒绝</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- 快速操作 -->
                    <div class="card">
                        <div class="card-header">
                            <span><i class="fas fa-bolt me-2"></i>快速操作</span>
                        </div>
                        <div class="card-body">
                            <div class="quick-actions">
                                ${pendingParticipants.length > 0 ? `
                                <button class="btn-quick btn-approve-all" onclick="activityDetailPage.approveAllPending()">
                                    <i class="fas fa-check-double"></i>
                                    批准所有申请
                                </button>
                                ` : ''}
                                <button class="btn-quick btn-manage" onclick="activityDetailPage.manageParticipants()">
                                    <i class="fas fa-users"></i>
                                    管理所有参与者
                                </button>
                                ${Auth.hasPermission && Auth.hasPermission(['activity:update']) ? `
                                <button class="btn-quick btn-edit" onclick="activityDetailPage.editActivity()">
                                    <i class="fas fa-edit"></i>
                                    编辑活动信息
                                </button>
                                ` : ''}
                            </div>
                        </div>
                    </div>

                    <!-- 活动日志 -->
                    <div class="card">
                        <div class="card-header">
                            <span><i class="fas fa-history me-2"></i>活动日志</span>
                        </div>
                        <div class="card-body">
                            <div class="timeline">
                                <div class="timeline-item">
                                    <div class="timeline-marker">
                                        <i class="fas fa-plus-circle text-success"></i>
                                    </div>
                                    <div class="timeline-content">
                                        <div class="timeline-title">活动创建</div>
                                        <div class="timeline-desc">活动已创建</div>
                                        <div class="timeline-meta">${this.activityData.creator?.username || '未知用户'} · ${this.activityData.created_at ? new Date(this.activityData.created_at).toLocaleString() : '未知时间'}</div>
                                    </div>
                                </div>
                                ${this.activityData.status === 'published' ? `
                                <div class="timeline-item">
                                    <div class="timeline-marker">
                                        <i class="fas fa-bullhorn text-primary"></i>
                                    </div>
                                    <div class="timeline-content">
                                        <div class="timeline-title">活动发布</div>
                                        <div class="timeline-desc">活动状态更新为已发布</div>
                                        <div class="timeline-meta">${this.activityData.creator?.username || '未知用户'} · ${this.activityData.updated_at ? new Date(this.activityData.updated_at).toLocaleString() : '未知时间'}</div>
                                    </div>
                                </div>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // 渲染参与者表格
    renderParticipantsTable(participants) {
        if (participants.length === 0) {
            return `
                <div class="empty-state">
                    <div class="empty-icon">
                        <i class="fas fa-user-slash"></i>
                    </div>
                    <p class="mb-0">暂无参与者</p>
                </div>
            `;
        }

        return `
            <div class="table-responsive">
                <table class="table table-hover participants-table">
                    <thead>
                        <tr>
                            <th>用户</th>
                            <th>部门</th>
                            <th>申请时间</th>
                            <th>状态</th>
                            <th>操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${participants.map(participant => `
                            <tr>
                                <td>
                                    <div class="d-flex align-items-center">
                                        <div class="application-avatar me-2">
                                            ${Utils.avatar.createAvatarHtml(
                                            Utils.avatar.getUserAvatar(participant.user),
                                            "头像",
                                            32,
                                            "",
                                            "user"
                                        )}
                                        </div>
                                        <div>
                                            <div class="fw-bold">${participant.user?.username || '未知用户'}</div>
                                            <small class="text-muted">${participant.user?.email || ''}</small>
                                        </div>
                                    </div>
                                </td>
                                <td>${participant.user?.profile?.department || '未分配'}</td>
                                <td>${participant.registered_at ? new Date(participant.registered_at).toLocaleString() : '未知时间'}</td>
                                <td><span class="status-badge ${this.getParticipantStatusBadgeClass(participant.status)}">${this.getParticipantStatusLabel(participant.status)}</span></td>
                                <td>
                                    ${participant.status === 'pending' ? `
                                        <div class="btn-group btn-group-sm">
                                            <button class="btn btn-success" onclick="activityDetailPage.approveParticipant('${participant.id}')">
                                                <i class="fas fa-check"></i>
                                            </button>
                                            <button class="btn btn-danger" onclick="activityDetailPage.rejectParticipant('${participant.id}', '${participant.user?.username || '未知用户'}')">
                                                <i class="fas fa-times"></i>
                                            </button>
                                        </div>
                                    ` : `
                                        <button class="btn btn-sm btn-outline-secondary">
                                            <i class="fas fa-eye"></i>
                                        </button>
                                    `}
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    // 渲染申请项目
    renderApplicationItem(participant) {
        return `
            <div class="application-item">
                <div class="application-header">
                    <div class="application-avatar">
                        ${Utils.avatar.createAvatarHtml(
                                Utils.avatar.getUserAvatar(participant.user),
                                "头像",
                                32,
                                "",
                                "user"
                            )}
                    </div>
                    <div class="application-user">
                        <div class="application-name">${participant.user?.username || '未知用户'}</div>
                        <div class="application-email">${participant.user?.email || ''}</div>
                    </div>
                </div>
                <div class="application-time">
                    <i class="fas fa-clock me-1"></i>
                    ${participant.registered_at ? new Date(participant.registered_at).toLocaleString() : '未知时间'}
                </div>
                <div class="application-actions">
                    <button class="btn-action btn-approve" onclick="activityDetailPage.approveParticipant('${participant.id}')">
                        <i class="fas fa-check"></i> 同意
                    </button>
                    <button class="btn-action btn-reject" onclick="activityDetailPage.rejectParticipant('${participant.id}', '${participant.user?.username || '未知用户'}')">
                        <i class="fas fa-times"></i> 拒绝
                    </button>
                </div>
            </div>
        `;
    }

    // 获取活动类型标签
    getActivityTypeLabel(type) {
        const typeMap = {
            'meeting': '会议',
            'event': '活动',
            'training': '培训',
            'other': '其他'
        };
        return typeMap[type] || type;
    }

    // 获取状态标签
    getStatusLabel(status) {
        const statusMap = {
            'draft': '草稿',
            'published': '已发布',
            'ongoing': '进行中',
            'completed': '已完成',
            'cancelled': '已取消'
        };
        return statusMap[status] || status;
    }

    // 获取状态徽章样式
    getStatusBadgeClass(status) {
        const classMap = {
            'draft': 'bg-secondary',
            'published': 'bg-success',
            'ongoing': 'bg-primary',
            'completed': 'bg-info',
            'cancelled': 'bg-danger'
        };
        return classMap[status] || 'bg-secondary';
    }

    // 获取参与者状态标签
    getParticipantStatusLabel(status) {
        const statusMap = {
            'pending': '待审核',
            'approved': '已批准',
            'rejected': '已拒绝'
        };
        return statusMap[status] || status;
    }

    // 获取参与者状态徽章样式
    getParticipantStatusBadgeClass(status) {
        const classMap = {
            'pending': 'status-pending',
            'approved': 'status-approved',
            'rejected': 'status-rejected'
        };
        return classMap[status] || 'status-pending';
    }

    // 批准参与者
    async approveParticipant(participantId) {
        if (!confirm('确定要批准此申请吗？')) {
            return;
        }

        try {
            const response = await API.activities.updateParticipantStatus(this.activityId, participantId, {
                status: 'approved'
            });

            if (response.success) {
                Utils.toast.success('批准成功');
                // 重新加载数据
                await this.init();
            } else {
                Utils.toast.error('批准失败: ' + response.message);
            }
        } catch (error) {
            console.error('批准失败:', error);
            Utils.toast.error('批准失败: ' + error.message);
        }
    }

    // 拒绝参与者
    async rejectParticipant(participantId, username) {
        const reason = prompt(`请输入拒绝 ${username} 申请的原因（可选）:`);
        
        // 用户点击取消
        if (reason === null) {
            return;
        }

        try {
            const response = await API.activities.updateParticipantStatus(this.activityId, participantId, {
                status: 'rejected',
                reason: reason || ''
            });

            if (response.success) {
                Utils.toast.success('拒绝成功');
                // 重新加载数据
                await this.init();
            } else {
                Utils.toast.error('拒绝失败: ' + response.message);
            }
        } catch (error) {
            console.error('拒绝失败:', error);
            Utils.toast.error('拒绝失败: ' + error.message);
        }
    }

    // 批准所有待审核申请
    async approveAllPending() {
        const pendingParticipants = this.participantsData.filter(p => p.status === 'pending');
        
        if (pendingParticipants.length === 0) {
            Utils.toast.info('没有待审核的申请');
            return;
        }

        if (!confirm(`确定要批准所有 ${pendingParticipants.length} 个待审核申请吗？`)) {
            return;
        }

        try {
            let successCount = 0;
            let failCount = 0;

            // 批量批准
            for (const participant of pendingParticipants) {
                try {
                    const response = await API.activities.updateParticipantStatus(this.activityId, participant.id, {
                        status: 'approved'
                    });

                    if (response.success) {
                        successCount++;
                    } else {
                        failCount++;
                        console.error(`批准失败: ${participant.user?.username}`, response.message);
                    }
                } catch (error) {
                    failCount++;
                    console.error(`批准出错: ${participant.user?.username}`, error);
                }
            }

            if (successCount > 0) {
                Utils.toast.success(`成功批准 ${successCount} 个申请${failCount > 0 ? `，失败 ${failCount} 个` : ''}`);
                // 重新加载数据
                await this.init();
            } else {
                Utils.toast.error('批准失败，请检查网络连接或权限');
            }
        } catch (error) {
            console.error('批量批准失败:', error);
            Utils.toast.error('批量批准失败: ' + error.message);
        }
    }

    // 管理所有参与者
    manageParticipants() {
        // 这里可以跳转到专门的参与者管理页面，或者打开一个模态框
        alert('管理所有参与者功能开发中');
    }

    // 编辑活动
    editActivity() {
        // 跳转到编辑页面
        if (typeof Router !== 'undefined' && Router.navigate) {
            Router.navigate(`/activities/edit/${this.activityId}`);
        } else {
            alert('路由功能不可用');
        }
    }
}

// 初始化页面
document.addEventListener('DOMContentLoaded', async function() {
    console.log('DOMContentLoaded event fired');
    
    // 确保必要的依赖已加载
    if (typeof API === 'undefined' || typeof Auth === 'undefined' || typeof Utils === 'undefined') {
        console.error('缺少必要的依赖文件');
        const container = document.getElementById('activity-detail-container');
        if (container) {
            container.innerHTML = `
                <div class="alert alert-danger" role="alert">
                    <i class="fas fa-exclamation-circle me-2"></i>
                    缺少必要的依赖文件，请检查网络连接或刷新页面
                </div>
            `;
        }
        return;
    }

    // 创建全局实例
    window.activityDetailPage = new ActivityDetailPage();
    
    // 初始化页面
    await activityDetailPage.init();
});

// 返回列表页面
function goToList() {
    if (typeof Router !== 'undefined' && Router.navigate) {
        Router.navigate('/activities/list');
    } else {
        window.location.href = '/activities/list';
    }
}