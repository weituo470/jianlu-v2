// 活动详情页数据处理文件

class ActivityDetailPage {
    constructor() {
        this.activityId = null;
        this.activityData = null;
        this.participantsData = [];
        this.accountingData = {
            records: [],
            settlements: [],
            bookkeepers: [],
            expenseCategories: []
        };
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

            // 并行获取活动详情、参与者和记账数据
            await Promise.all([
                this.loadActivityDetail(),
                this.loadParticipants(),
                this.loadAccountingData()
            ]);

            // 渲染页面
            this.renderPage();

            // 初始化记账功能
            setTimeout(() => {
                this.initAccountingFeatures();
            }, 100);
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

                    <!-- 记账管理 -->
                    <div class="card">
                        <div class="card-header d-flex justify-content-between align-items-center">
                            <span><i class="fas fa-calculator me-2"></i>记账管理</span>
                            <span class="badge bg-success" id="accounting-badge">记账功能</span>
                        </div>
                        <div class="card-body">
                            <ul class="nav nav-tabs" id="accountingTab" role="tablist">
                                <li class="nav-item" role="presentation">
                                    <button class="nav-link active" id="records-tab" data-bs-toggle="tab" data-bs-target="#records" type="button" role="tab">
                                        <i class="fas fa-list me-1"></i>记账记录
                                    </button>
                                </li>
                                <li class="nav-item" role="presentation">
                                    <button class="nav-link" id="settlements-tab" data-bs-toggle="tab" data-bs-target="#settlements" type="button" role="tab">
                                        <i class="fas fa-handshake me-1"></i>费用分摊
                                    </button>
                                </li>
                                <li class="nav-item" role="presentation">
                                    <button class="nav-link" id="permissions-tab" data-bs-toggle="tab" data-bs-target="#permissions" type="button" role="tab">
                                        <i class="fas fa-key me-1"></i>记账权限
                                    </button>
                                </li>
                            </ul>

                            <div class="tab-content" id="accountingTabContent">
                                <!-- 记账记录标签页 -->
                                <div class="tab-pane fade show active" id="records" role="tabpanel">
                                    <div class="d-flex justify-content-between align-items-center mb-3">
                                        <h6 class="mb-0">记账记录列表</h6>
                                        <button class="btn btn-primary btn-sm" onclick="activityDetailPage.showAddRecordModal()">
                                            <i class="fas fa-plus me-1"></i>添加记录
                                        </button>
                                    </div>
                                    <div id="records-container">
                                        <div class="text-center py-4">
                                            <div class="spinner-border text-primary" role="status">
                                                <span class="visually-hidden">加载中...</span>
                                            </div>
                                            <p class="mt-2">正在加载记账记录...</p>
                                        </div>
                                    </div>
                                </div>

                                <!-- 费用分摊标签页 -->
                                <div class="tab-pane fade" id="settlements" role="tabpanel">
                                    <div class="d-flex justify-content-between align-items-center mb-3">
                                        <h6 class="mb-0">AA费用分摊</h6>
                                        <div class="btn-group btn-group-sm">
                                            <button class="btn btn-outline-primary" onclick="activityDetailPage.showSimulateSettlementModal()">
                                                <i class="fas fa-calculator me-1"></i>模拟计算
                                            </button>
                                            <button class="btn btn-success" onclick="activityDetailPage.showCreateSettlementModal()">
                                                <i class="fas fa-plus me-1"></i>创建结算
                                            </button>
                                        </div>
                                    </div>
                                    <div id="settlements-container">
                                        <div class="text-center py-4">
                                            <div class="spinner-border text-primary" role="status">
                                                <span class="visually-hidden">加载中...</span>
                                            </div>
                                            <p class="mt-2">正在加载结算信息...</p>
                                        </div>
                                    </div>
                                </div>

                                <!-- 记账权限标签页 -->
                                <div class="tab-pane fade" id="permissions" role="tabpanel">
                                    <div class="d-flex justify-content-between align-items-center mb-3">
                                        <h6 class="mb-0">记账权限管理</h6>
                                        <button class="btn btn-primary btn-sm" onclick="activityDetailPage.showAddBookkeeperModal()">
                                            <i class="fas fa-user-plus me-1"></i>添加记账员
                                        </button>
                                    </div>
                                    <div id="permissions-container">
                                        <div class="text-center py-4">
                                            <div class="spinner-border text-primary" role="status">
                                                <span class="visually-hidden">加载中...</span>
                                            </div>
                                            <p class="mt-2">正在加载权限信息...</p>
                                        </div>
                                    </div>
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

    // ============ 记账功能相关方法 ============

    // 加载记账数据
    async loadAccountingData() {
        try {
            console.log('开始加载记账数据，活动ID:', this.activityId);

            // 并行加载记账相关数据
            const [records, settlements, bookkeepers, categories] = await Promise.all([
                this.loadAccountingRecords(),
                this.loadSettlements(),
                this.loadBookkeepers(),
                this.loadExpenseCategories()
            ]);

            this.accountingData = {
                records: records || [],
                settlements: settlements || [],
                bookkeepers: bookkeepers || [],
                expenseCategories: categories || []
            };

            console.log('记账数据加载完成:', this.accountingData);

        } catch (error) {
            console.error('加载记账数据失败:', error);
            // 记账数据加载失败不影响主流程
        }
    }

    // 加载记账记录
    async loadAccountingRecords() {
        try {
            const response = await fetch(`${AppConfig.API_BASE_URL}/api/accounting/activities/${this.activityId}/records`, {
                headers: API.getAuthHeaders()
            });

            if (response.ok) {
                const data = await response.json();
                return data.success ? data.records : [];
            }
            return [];
        } catch (error) {
            console.error('加载记账记录失败:', error);
            return [];
        }
    }

    // 加载结算信息
    async loadSettlements() {
        try {
            const response = await fetch(`${AppConfig.API_BASE_URL}/api/accounting/activities/${this.activityId}/settlements`, {
                headers: API.getAuthHeaders()
            });

            if (response.ok) {
                const data = await response.json();
                return data.success ? data.settlements : [];
            }
            return [];
        } catch (error) {
            console.error('加载结算信息失败:', error);
            return [];
        }
    }

    // 加载记账员
    async loadBookkeepers() {
        try {
            const response = await fetch(`${AppConfig.API_BASE_URL}/api/accounting/activities/${this.activityId}/bookkeepers`, {
                headers: API.getAuthHeaders()
            });

            if (response.ok) {
                const data = await response.json();
                return data.success ? data.bookkeepers : [];
            }
            return [];
        } catch (error) {
            console.error('加载记账员失败:', error);
            return [];
        }
    }

    // 加载费用分类
    async loadExpenseCategories() {
        try {
            const response = await fetch(`${AppConfig.API_BASE_URL}/api/accounting/expense-categories`, {
                headers: API.getAuthHeaders()
            });

            if (response.ok) {
                const data = await response.json();
                return data.success ? data.categories : [];
            }
            return [];
        } catch (error) {
            console.error('加载费用分类失败:', error);
            return [];
        }
    }

    // 初始化记账功能
    initAccountingFeatures() {
        console.log('初始化记账功能');

        // 渲染记账记录
        this.renderAccountingRecords();

        // 渲染结算信息
        this.renderSettlements();

        // 渲染记账权限
        this.renderBookkeepers();

        // 绑定标签页切换事件
        this.bindAccountingTabEvents();
    }

    // 绑定记账标签页事件
    bindAccountingTabEvents() {
        // 记账记录标签页
        document.getElementById('records-tab')?.addEventListener('shown.bs.tab', () => {
            this.renderAccountingRecords();
        });

        // 费用分摊标签页
        document.getElementById('settlements-tab')?.addEventListener('shown.bs.tab', () => {
            this.renderSettlements();
        });

        // 记账权限标签页
        document.getElementById('permissions-tab')?.addEventListener('shown.bs.tab', () => {
            this.renderBookkeepers();
        });
    }

    // 渲染记账记录
    renderAccountingRecords() {
        const container = document.getElementById('records-container');
        if (!container) return;

        const records = this.accountingData.records;

        if (records.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">
                        <i class="fas fa-receipt"></i>
                    </div>
                    <p class="mb-0">暂无记账记录</p>
                    <button class="btn btn-primary btn-sm mt-2" onclick="activityDetailPage.showAddRecordModal()">
                        <i class="fas fa-plus me-1"></i>添加第一条记录
                    </button>
                </div>
            `;
            return;
        }

        // 计算统计数据
        const totalExpense = records
            .filter(r => r.record_type === 'expense')
            .reduce((sum, r) => sum + parseFloat(r.amount), 0);

        const totalReserve = records
            .filter(r => r.record_type === 'reserve')
            .reduce((sum, r) => sum + parseFloat(r.amount), 0);

        container.innerHTML = `
            <!-- 统计信息 -->
            <div class="row mb-3">
                <div class="col-md-6">
                    <div class="card bg-light">
                        <div class="card-body text-center">
                            <h6 class="card-title text-primary">总支出</h6>
                            <h4 class="text-primary">¥${totalExpense.toFixed(2)}</h4>
                        </div>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="card bg-light">
                        <div class="card-body text-center">
                            <h6 class="card-title text-success">准备金</h6>
                            <h4 class="text-success">¥${totalReserve.toFixed(2)}</h4>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 记账记录表格 -->
            <div class="table-responsive">
                <table class="table table-hover">
                    <thead>
                        <tr>
                            <th>日期</th>
                            <th>类型</th>
                            <th>分类</th>
                            <th>描述</th>
                            <th>金额</th>
                            <th>状态</th>
                            <th>操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${records.map(record => this.renderAccountingRecordRow(record)).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    // 渲染记账记录行
    renderAccountingRecordRow(record) {
        const typeMap = {
            'expense': '支出',
            'reserve': '准备金',
            'adjustment': '调整'
        };

        const statusClass = {
            'draft': 'bg-secondary',
            'confirmed': 'bg-success',
            'cancelled': 'bg-danger'
        };

        const statusMap = {
            'draft': '草稿',
            'confirmed': '已确认',
            'cancelled': '已取消'
        };

        return `
            <tr>
                <td>${record.record_date ? new Date(record.record_date).toLocaleDateString() : '-'}</td>
                <td>
                    <span class="badge ${record.record_type === 'expense' ? 'bg-danger' : record.record_type === 'reserve' ? 'bg-warning' : 'bg-info'}">
                        ${typeMap[record.record_type] || record.record_type}
                    </span>
                </td>
                <td>${record.category ? record.category.name : '-'}</td>
                <td>${record.description}</td>
                <td class="fw-bold">¥${parseFloat(record.amount).toFixed(2)}</td>
                <td>
                    <span class="badge ${statusClass[record.status] || 'bg-secondary'}">
                        ${statusMap[record.status] || record.status}
                    </span>
                </td>
                <td>
                    <div class="btn-group btn-group-sm">
                        ${record.status === 'draft' ? `
                            <button class="btn btn-success" onclick="activityDetailPage.confirmRecord('${record.id}')" title="确认">
                                <i class="fas fa-check"></i>
                            </button>
                        ` : ''}
                        ${record.status === 'draft' ? `
                            <button class="btn btn-warning" onclick="activityDetailPage.editRecord('${record.id}')" title="编辑">
                                <i class="fas fa-edit"></i>
                            </button>
                        ` : ''}
                        <button class="btn btn-info" onclick="activityDetailPage.viewRecord('${record.id}')" title="查看">
                            <i class="fas fa-eye"></i>
                        </button>
                        ${record.status === 'draft' ? `
                            <button class="btn btn-danger" onclick="activityDetailPage.deleteRecord('${record.id}')" title="删除">
                                <i class="fas fa-trash"></i>
                            </button>
                        ` : ''}
                    </div>
                </td>
            </tr>
        `;
    }

    // 渲染结算信息
    renderSettlements() {
        const container = document.getElementById('settlements-container');
        if (!container) return;

        const settlements = this.accountingData.settlements;

        if (settlements.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">
                        <i class="fas fa-calculator"></i>
                    </div>
                    <p class="mb-0">暂无结算记录</p>
                    <button class="btn btn-success btn-sm mt-2" onclick="activityDetailPage.showCreateSettlementModal()">
                        <i class="fas fa-plus me-1"></i>创建第一个结算
                    </button>
                </div>
            `;
            return;
        }

        const latestSettlement = settlements[0];
        const totalExpense = settlements.reduce((sum, s) => sum + parseFloat(s.net_expense), 0);

        container.innerHTML = `
            <!-- 统计信息 -->
            <div class="row mb-3">
                <div class="col-md-4">
                    <div class="card bg-light">
                        <div class="card-body text-center">
                            <h6 class="card-title text-primary">总净费用</h6>
                            <h4 class="text-primary">¥${totalExpense.toFixed(2)}</h4>
                        </div>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="card bg-light">
                        <div class="card-body text-center">
                            <h6 class="card-title text-success">结算数量</h6>
                            <h4 class="text-success">${settlements.length}</h4>
                        </div>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="card bg-light">
                        <div class="card-body text-center">
                            <h6 class="card-title text-info">参与者</h6>
                            <h4 class="text-info">${latestSettlement.participant_count}</h4>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 结算列表 -->
            <div class="accordion" id="settlementsAccordion">
                ${settlements.map((settlement, index) => this.renderSettlementItem(settlement, index)).join('')}
            </div>
        `;
    }

    // 渲染结算项目
    renderSettlementItem(settlement, index) {
        const statusClass = {
            'draft': 'bg-secondary',
            'finalized': 'bg-success',
            'superseded': 'bg-warning'
        };

        const statusMap = {
            'draft': '草稿',
            'finalized': '已确认',
            'superseded': '被替代'
        };

        return `
            <div class="accordion-item">
                <h2 class="accordion-header" id="heading${index}">
                    <button class="accordion-button ${index === 0 ? '' : 'collapsed'}" type="button" data-bs-toggle="collapse" data-bs-target="#collapse${index}">
                        <div class="d-flex justify-content-between align-items-center w-100">
                            <div>
                                <strong>${settlement.settlement_number}</strong>
                                <span class="badge ${statusClass[settlement.status] || 'bg-secondary'} ms-2">
                                    ${statusMap[settlement.status] || settlement.status}
                                </span>
                            </div>
                            <div>
                                <span class="text-muted me-3">¥${parseFloat(settlement.net_expense).toFixed(2)}</span>
                                <small class="text-muted">${new Date(settlement.created_at).toLocaleDateString()}</small>
                            </div>
                        </div>
                    </button>
                </h2>
                <div id="collapse${index}" class="accordion-collapse collapse ${index === 0 ? 'show' : ''}" data-bs-parent="#settlementsAccordion">
                    <div class="accordion-body">
                        <div class="row mb-3">
                            <div class="col-md-3">
                                <small class="text-muted">创建时间</small>
                                <div>${new Date(settlement.created_at).toLocaleString()}</div>
                            </div>
                            <div class="col-md-3">
                                <small class="text-muted">总费用</small>
                                <div>¥${parseFloat(settlement.total_expense).toFixed(2)}</div>
                            </div>
                            <div class="col-md-3">
                                <small class="text-muted">准备金</small>
                                <div>¥${parseFloat(settlement.total_reserve).toFixed(2)}</div>
                            </div>
                            <div class="col-md-3">
                                <small class="text-muted">净费用</small>
                                <div class="fw-bold">¥${parseFloat(settlement.net_expense).toFixed(2)}</div>
                            </div>
                        </div>
                        <div class="d-flex gap-2">
                            <button class="btn btn-sm btn-outline-primary" onclick="activityDetailPage.viewSettlement('${settlement.id}')">
                                <i class="fas fa-eye me-1"></i>查看详情
                            </button>
                            ${settlement.status === 'draft' ? `
                                <button class="btn btn-sm btn-success" onclick="activityDetailPage.finalizeSettlement('${settlement.id}')">
                                    <i class="fas fa-check me-1"></i>确认结算
                                </button>
                            ` : ''}
                            <button class="btn btn-sm btn-outline-info" onclick="activityDetailPage.downloadSettlementReport('${settlement.id}')">
                                <i class="fas fa-download me-1"></i>下载报告
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // 渲染记账权限
    renderBookkeepers() {
        const container = document.getElementById('permissions-container');
        if (!container) return;

        const bookkeepers = this.accountingData.bookkeepers;

        if (bookkeepers.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">
                        <i class="fas fa-user-times"></i>
                    </div>
                    <p class="mb-0">暂无记账员</p>
                    <button class="btn btn-primary btn-sm mt-2" onclick="activityDetailPage.showAddBookkeeperModal()">
                        <i class="fas fa-user-plus me-1"></i>添加记账员
                    </button>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <!-- 记账员列表 -->
            <div class="table-responsive">
                <table class="table table-hover">
                    <thead>
                        <tr>
                            <th>用户</th>
                            <th>权限级别</th>
                            <th>授予时间</th>
                            <th>到期时间</th>
                            <th>状态</th>
                            <th>操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${bookkeepers.map(bookkeeper => this.renderBookkeeperRow(bookkeeper)).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    // 渲染记账员行
    renderBookkeeperRow(bookkeeper) {
        const permissionLevelMap = {
            'view': '查看',
            'record': '记账',
            'confirm': '确认',
            'manage': '管理'
        };

        const permissionClass = {
            'view': 'bg-info',
            'record': 'bg-primary',
            'confirm': 'bg-warning',
            'manage': 'bg-success'
        };

        const isExpired = bookkeeper.expires_at && new Date(bookkeeper.expires_at) < new Date();
        const statusClass = isExpired ? 'bg-danger' : 'bg-success';
        const statusText = isExpired ? '已过期' : '有效';

        return `
            <tr>
                <td>
                    <div class="d-flex align-items-center">
                        <div class="me-2">
                            ${Utils.avatar.createAvatarHtml(
                                Utils.avatar.getUserAvatar(bookkeeper.user),
                                "头像",
                                32,
                                "",
                                "user"
                            )}
                        </div>
                        <div>
                            <div class="fw-bold">${bookkeeper.user?.username || '未知用户'}</div>
                            <small class="text-muted">${bookkeeper.user?.email || ''}</small>
                        </div>
                    </div>
                </td>
                <td>
                    <span class="badge ${permissionClass[bookkeeper.permission_level] || 'bg-secondary'}">
                        ${permissionLevelMap[bookkeeper.permission_level] || bookkeeper.permission_level}
                    </span>
                </td>
                <td>${bookkeeper.granted_at ? new Date(bookkeeper.granted_at).toLocaleString() : '-'}</td>
                <td>${bookkeeper.expires_at ? new Date(bookkeeper.expires_at).toLocaleString() : '永久'}</td>
                <td>
                    <span class="badge ${statusClass}">${statusText}</span>
                </td>
                <td>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-danger" onclick="activityDetailPage.removeBookkeeper('${bookkeeper.id}', '${bookkeeper.user?.username || '未知用户'}')" title="移除">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }

    // ============ 记账记录操作方法 ============

    // 显示添加记录模态框
    showAddRecordModal() {
        // 这里应该显示一个模态框来添加记账记录
        alert('添加记账记录功能开发中');
    }

    // 确认记录
    async confirmRecord(recordId) {
        if (!confirm('确定要确认此记账记录吗？')) {
            return;
        }

        try {
            const response = await fetch(`${AppConfig.API_BASE_URL}/api/accounting/records/${recordId}/confirm`, {
                method: 'POST',
                headers: API.getAuthHeaders(),
                body: JSON.stringify({})
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    Utils.toast.success('记录确认成功');
                    // 重新加载记账数据
                    await this.loadAccountingData();
                    this.renderAccountingRecords();
                } else {
                    Utils.toast.error('确认失败: ' + data.message);
                }
            } else {
                Utils.toast.error('确认失败，请检查权限');
            }
        } catch (error) {
            console.error('确认记录失败:', error);
            Utils.toast.error('确认失败: ' + error.message);
        }
    }

    // 删除记录
    async deleteRecord(recordId) {
        if (!confirm('确定要删除此记账记录吗？')) {
            return;
        }

        try {
            const response = await fetch(`${AppConfig.API_BASE_URL}/api/accounting/records/${recordId}`, {
                method: 'DELETE',
                headers: API.getAuthHeaders()
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    Utils.toast.success('记录删除成功');
                    // 重新加载记账数据
                    await this.loadAccountingData();
                    this.renderAccountingRecords();
                } else {
                    Utils.toast.error('删除失败: ' + data.message);
                }
            } else {
                Utils.toast.error('删除失败，请检查权限');
            }
        } catch (error) {
            console.error('删除记录失败:', error);
            Utils.toast.error('删除失败: ' + error.message);
        }
    }

    // ============ 结算操作方法 ============

    // 显示模拟结算模态框
    showSimulateSettlementModal() {
        alert('模拟结算功能开发中');
    }

    // 显示创建结算模态框
    showCreateSettlementModal() {
        alert('创建结算功能开发中');
    }

    // 查看结算详情
    viewSettlement(settlementId) {
        alert(`查看结算详情 (ID: ${settlementId}) 功能开发中`);
    }

    // 确认结算
    async finalizeSettlement(settlementId) {
        if (!confirm('确定要最终确认此结算吗？确认后将不能修改。')) {
            return;
        }

        try {
            const response = await fetch(`${AppConfig.API_BASE_URL}/api/accounting/settlements/${settlementId}/finalize`, {
                method: 'POST',
                headers: API.getAuthHeaders(),
                body: JSON.stringify({})
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    Utils.toast.success('结算确认成功');
                    // 重新加载结算数据
                    await this.loadAccountingData();
                    this.renderSettlements();
                } else {
                    Utils.toast.error('确认失败: ' + data.message);
                }
            } else {
                Utils.toast.error('确认失败，请检查权限');
            }
        } catch (error) {
            console.error('确认结算失败:', error);
            Utils.toast.error('确认失败: ' + error.message);
        }
    }

    // 下载结算报告
    downloadSettlementReport(settlementId) {
        // 打开报告下载链接
        window.open(`${AppConfig.API_BASE_URL}/api/accounting/settlements/${settlementId}/report?format=excel`, '_blank');
    }

    // ============ 权限操作方法 ============

    // 显示添加记账员模态框
    showAddBookkeeperModal() {
        alert('添加记账员功能开发中');
    }

    // 移除记账员
    async removeBookkeeper(bookkeeperId, username) {
        if (!confirm(`确定要移除 ${username} 的记账权限吗？`)) {
            return;
        }

        try {
            const response = await fetch(`${AppConfig.API_BASE_URL}/api/accounting/activities/${this.activityId}/bookkeepers/${bookkeeperId}`, {
                method: 'DELETE',
                headers: API.getAuthHeaders()
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    Utils.toast.success('权限移除成功');
                    // 重新加载记账数据
                    await this.loadAccountingData();
                    this.renderBookkeepers();
                } else {
                    Utils.toast.error('移除失败: ' + data.message);
                }
            } else {
                Utils.toast.error('移除失败，请检查权限');
            }
        } catch (error) {
            console.error('移除记账员失败:', error);
            Utils.toast.error('移除失败: ' + error.message);
        }
    }

    // ============ 辅助方法 ============

    // 编辑记录
    editRecord(recordId) {
        alert(`编辑记录 (ID: ${recordId}) 功能开发中`);
    }

    // 查看记录
    viewRecord(recordId) {
        alert(`查看记录详情 (ID: ${recordId}) 功能开发中`);
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