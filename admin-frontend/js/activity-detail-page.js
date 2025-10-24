// 活动详情页数据处理文件

class ActivityDetailPage {
    constructor() {
        this.activityId = null;
        this.activityData = null;
        this.participantsData = [];
        this.expensesData = []; // 添加费用记录数据属性
        this.expenseSummary = { totalCount: 0, totalAmount: 0, averageAmount: 0 }; // 添加费用统计数据属性
        this.aaCostsData = null; // 添加AA费用分摊数据属性
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
            
            // 并行获取活动详情、参与者数据、费用记录数据、费用统计数据和AA费用分摊数据
            await Promise.all([
                this.loadActivityDetail(),
                this.loadParticipants(),
                this.loadExpenses(), // 加载费用记录数据
                this.loadExpenseSummary(), // 加载费用统计数据
                this.loadAACosts() // 加载AA费用分摊数据
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

    // 加载费用记录数据
    async loadExpenses() {
        try {
            console.log('开始获取费用记录数据，活动ID:', this.activityId);
            const response = await API.activities.getExpenses(this.activityId);
            console.log('费用记录数据响应:', response);
            
            if (response.success) {
                this.expensesData = response.data.expenses || [];
                console.log('费用记录数据:', this.expensesData);
            } else {
                throw new Error(response.message || '获取费用记录数据失败');
            }
        } catch (error) {
            console.error('获取费用记录数据失败:', error);
            // 不抛出错误，因为记账功能可能是新功能
            this.expensesData = [];
        }
    }

    // 加载费用统计数据
    async loadExpenseSummary() {
        try {
            console.log('开始获取费用统计数据，活动ID:', this.activityId);
            const response = await API.activities.getExpenseSummary(this.activityId);
            console.log('费用统计数据响应:', response);
            
            if (response.success) {
                this.expenseSummary = response.data.summary || { totalCount: 0, totalAmount: 0, averageAmount: 0 };
                console.log('费用统计数据:', this.expenseSummary);
            } else {
                throw new Error(response.message || '获取费用统计数据失败');
            }
        } catch (error) {
            console.error('获取费用统计数据失败:', error);
            // 使用默认值
            this.expenseSummary = { totalCount: 0, totalAmount: 0, averageAmount: 0 };
        }
    }

    // 加载AA费用分摊数据
    async loadAACosts() {
        try {
            console.log('开始计算AA费用分摊，活动ID:', this.activityId);
            const response = await API.activities.calculateAACosts(this.activityId);
            console.log('AA费用分摊数据响应:', response);
            
            if (response.success) {
                this.aaCostsData = response.data.aaCosts || null;
                console.log('AA费用分摊数据:', this.aaCostsData);
            } else {
                throw new Error(response.message || '计算AA费用分摊失败');
            }
        } catch (error) {
            console.error('计算AA费用分摊失败:', error);
            // 不抛出错误，因为AA分摊功能可能是新功能
            this.aaCostsData = null;
        }
    }

    // 创建费用记录表格HTML
    createExpensesTableHTML() {
        return `
            <div class="table-responsive">
                <table class="table table-hover">
                    <thead>
                        <tr>
                            <th>事项</th>
                            <th>金额</th>
                            <th>日期</th>
                            <th>付款人</th>
                            <th>记录人</th>
                            <th>操作</th>
                        </tr>
                    </thead>
                    <tbody id="expenses-table-body">
                        ${this.renderExpensesTableBody()}
                    </tbody>
                </table>
            </div>
        `;
    }

    // 创建空状态HTML
    createEmptyStateHTML() {
        return `
            <div class="empty-state">
                <div class="empty-icon">
                    <i class="fas fa-receipt"></i>
                </div>
                <p class="mb-0">暂无费用记录</p>
                <p class="text-muted small">添加第一条费用记录开始记账</p>
            </div>
        `;
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

        // 计算总费用（从费用记录数据）
        const totalExpenses = this.expensesData.reduce((sum, expense) => sum + parseFloat(expense.amount), 0);

        // 渲染页面内容
        container.innerHTML = `
            <!-- 页面头部 -->
            <div class="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h1 class="h3 mb-0">活动管理</h1>
                    <nav aria-label="breadcrumb">
                        <ol class="breadcrumb">
                            <li class="breadcrumb-item"><a href="#" id="breadcrumb-link">活动列表</a></li>
                            <li class="breadcrumb-item active">活动详情</li>
                        </ol>
                    </nav>
                </div>
                <button class="btn btn-outline-secondary" id="back-to-list-btn">
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
                    <!-- 添加费用统计卡片 -->
                    ${this.expenseSummary.totalCount > 0 ? `
                    <div class="stat-card">
                        <div class="stat-value">¥${this.expenseSummary.totalAmount.toFixed(2)}</div>
                        <div class="stat-label">记账总额</div>
                    </div>
                    ` : ''}
                </div>
            </div>

            <!-- 标签页导航 -->
            <ul class="nav nav-tabs mb-4" id="activityDetailTabs" role="tablist">
                <li class="nav-item" role="presentation">
                    <button class="nav-link active" id="details-tab" data-bs-toggle="tab" data-bs-target="#details" type="button" role="tab">
                        <i class="fas fa-info-circle me-2"></i>活动详情
                    </button>
                </li>
                <li class="nav-item" role="presentation">
                    <button class="nav-link" id="expenses-tab" data-bs-toggle="tab" data-bs-target="#expenses" type="button" role="tab">
                        <i class="fas fa-receipt me-2"></i>费用记账
                        ${this.expensesData.length > 0 ? `<span class="badge bg-primary ms-2">${this.expensesData.length}</span>` : ''}
                    </button>
                </li>
                <li class="nav-item" role="presentation">
                    <button class="nav-link" id="aa-costs-tab" data-bs-toggle="tab" data-bs-target="#aa-costs" type="button" role="tab">
                        <i class="fas fa-calculator me-2"></i>AA分摊
                    </button>
                </li>
            </ul>

            <!-- 标签页内容 -->
            <div class="tab-content" id="activityDetailTabContent">
                <!-- 活动详情标签页 -->
                <div class="tab-pane fade show active" id="details" role="tabpanel">
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
                </div>

                <!-- 费用记账标签页 -->
                <div class="tab-pane fade" id="expenses" role="tabpanel">
                    <div class="row">
                        <!-- 左侧：费用记录表单 -->
                        <div class="col-lg-4">
                            <div class="card">
                                <div class="card-header">
                                    <span><i class="fas fa-plus-circle me-2"></i>添加费用记录</span>
                                </div>
                                <div class="card-body">
                                    <form id="expenseForm">
                                        <div class="mb-3">
                                            <label for="expenseItem" class="form-label">费用事项 *</label>
                                            <input type="text" class="form-control" id="expenseItem" required>
                                        </div>
                                        <div class="mb-3">
                                            <label for="expenseAmount" class="form-label">金额 (¥) *</label>
                                            <input type="number" class="form-control" id="expenseAmount" step="0.01" min="0" required>
                                        </div>
                                        <div class="mb-3">
                                            <label for="expenseDate" class="form-label">费用日期 *</label>
                                            <input type="date" class="form-control" id="expenseDate" required>
                                        </div>
                                        <div class="mb-3">
                                            <label for="expensePayer" class="form-label">付款人</label>
                                            <input type="text" class="form-control" id="expensePayer">
                                        </div>
                                        <div class="mb-3">
                                            <label for="expenseDescription" class="form-label">备注</label>
                                            <textarea class="form-control" id="expenseDescription" rows="3"></textarea>
                                        </div>
                                        <div class="mb-3">
                                            <label for="expenseImage" class="form-label">图片存档</label>
                                            <input type="file" class="form-control" id="expenseImage" accept="image/*">
                                        </div>
                                        <button type="submit" class="btn btn-primary w-100">
                                            <i class="fas fa-plus me-2"></i>添加费用记录
                                        </button>
                                    </form>
                                </div>
                            </div>
                        </div>

                        <!-- 右侧：费用记录列表 -->
                        <div class="col-lg-8">
                            <div class="card">
                                <div class="card-header d-flex justify-content-between align-items-center">
                                    <span><i class="fas fa-receipt me-2"></i>费用记录列表</span>
                                    <div>
                                        <span class="badge bg-success me-2">总费用: ¥${this.expenseSummary.totalAmount.toFixed(2)}</span>
                                        <span class="badge bg-primary">${this.expenseSummary.totalCount}条记录</span>
                                    </div>
                                </div>
                                <div class="card-body" id="expenses-card-body">
                                    ${this.expensesData.length > 0 ? this.createExpensesTableHTML() : this.createEmptyStateHTML()}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- AA费用分摊标签页 -->
                <div class="tab-pane fade" id="aa-costs" role="tabpanel">
                    <div id="aa-costs-content">
                        <!-- AA费用分摊内容将通过JavaScript动态渲染 -->
                    </div>
                </div>
            </div>
        `;

        // 绑定表单提交事件
        this.bindExpenseFormEvents();

        // 绑定返回按钮事件
        this.bindNavigationEvents();
    }

    // 绑定导航事件
    bindNavigationEvents() {
        // 面包屑链接
        const breadcrumbLink = document.getElementById('breadcrumb-link');
        if (breadcrumbLink) {
            breadcrumbLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.goBackToList();
            });
        }

        // 返回按钮
        const backBtn = document.getElementById('back-to-list-btn');
        if (backBtn) {
            backBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.goBackToList();
            });
        }
    }

    // 返回列表页面
    goBackToList() {
        console.log('返回活动列表页面');

        try {
            console.log('使用window.location跳转到活动列表页面');
            // 直接跳转到活动列表页面，不使用Router
            window.location.href = '/activities/list';
        } catch (error) {
            console.error('导航失败:', error);
            // 最后的降级方案
            window.location.href = '/activities/list';
        }
    }

    // 绑定费用记录表单事件
    bindExpenseFormEvents() {
        const expenseForm = document.getElementById('expenseForm');
        if (expenseForm) {
            expenseForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.submitExpenseForm();
            });
        }
    }

    // 提交费用记录表单
    async submitExpenseForm() {
        console.log('💰 开始提交费用记录表单');

        const item = document.getElementById('expenseItem').value;
        const amount = document.getElementById('expenseAmount').value;
        const expenseDate = document.getElementById('expenseDate').value;
        const payer = document.getElementById('expensePayer').value;
        const description = document.getElementById('expenseDescription').value;
        // 图片上传功能需要额外处理，这里简化处理
        const image = document.getElementById('expenseImage').files[0];

        console.log('📋 表单数据:', {
            item,
            amount,
            expenseDate,
            payer,
            description,
            hasImage: !!image,
            activityId: this.activityId
        });

        // 简单验证
        if (!item || !amount || !expenseDate) {
            console.log('❌ 表单验证失败: 缺少必填字段');
            Utils.toast.error('请填写必填字段');
            return;
        }

        try {
            // 验证活动ID
            if (!this.activityId) {
                throw new Error('活动ID不能为空');
            }

            const expenseData = {
                item,
                amount: parseFloat(amount),
                expense_date: expenseDate,
                payer: payer || null,
                description: description || null
            };

            // 如果有图片，需要先上传图片（这里简化处理）
            if (image) {
                // 在实际实现中，这里需要上传图片并获取图片路径
                expenseData.image_path = 'path/to/image'; // 占位符
                console.log('📷 图片上传功能暂未实现，使用占位符');
            }

            console.log('📡 发送创建费用记录请求:', expenseData);
            const response = await API.activities.createExpense(this.activityId, expenseData);
            console.log('📡 API响应:', response);

            if (response.success) {
                console.log('✅ 费用记录创建成功:', response.data);
                Utils.toast.success('费用记录添加成功');
                // 重置表单
                document.getElementById('expenseForm').reset();
                // 重新加载费用数据，而不是整个页面
                console.log('🔄 重新加载费用数据');
                await this.loadExpenses();
                await this.loadExpenseSummary();
                // 重新渲染费用标签页内容
                this.renderExpensesTab();
                // 激活费用标签页
                this.activateExpensesTab();
            } else {
                console.error('❌ 创建失败，服务器响应:', response);
                Utils.toast.error('添加费用记录失败: ' + response.message);
            }
        } catch (error) {
            console.error('❌ 添加费用记录失败:', error);
            Utils.toast.error('添加费用记录失败: ' + error.message);
        }
    }

    // 编辑费用记录
    async editExpense(expenseId) {
        // 在实际实现中，这里需要打开编辑模态框或跳转到编辑页面
        Utils.toast.info('编辑功能开发中');
    }

    // 删除费用记录
    async deleteExpense(expenseId) {
        if (!confirm('确定要删除这条费用记录吗？')) {
            return;
        }

        console.log('🗑️ 开始删除费用记录');
        console.log('📋 活动ID:', this.activityId);
        console.log('📋 费用记录ID:', expenseId);

        try {
            // 验证参数
            if (!this.activityId || !expenseId) {
                throw new Error('活动ID或费用记录ID不能为空');
            }

            console.log('📡 发送删除请求到API');
            const response = await API.activities.deleteExpense(this.activityId, expenseId);
            console.log('📡 API响应:', response);

            if (response.success) {
                Utils.toast.success('费用记录删除成功');
                // 重新加载费用数据
                await this.loadExpenses();
                await this.loadExpenseSummary();
                // 重新渲染费用标签页内容
                this.renderExpensesTab();
                // 激活费用标签页
                this.activateExpensesTab();
            } else {
                console.error('❌ 删除失败，服务器响应:', response);
                Utils.toast.error('删除费用记录失败: ' + response.message);
            }
        } catch (error) {
            console.error('❌ 删除费用记录失败:', error);
            Utils.toast.error('删除费用记录失败: ' + error.message);
        }
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

    // 渲染费用标签页内容
    renderExpensesTab() {
        console.log('🔄 renderExpensesTab: 开始渲染费用标签页');
        console.log('📊 当前费用数据:', this.expensesData);

        // 更新费用统计信息 - 使用更精确的选择器
        const totalAmountElement = document.querySelector('#expenses-tab-pane .card-header .badge.bg-success') ||
                                 document.querySelector('#expenses .card-header .badge.bg-success');
        if (totalAmountElement) {
            totalAmountElement.textContent = `总费用: ¥${this.expenseSummary.totalAmount.toFixed(2)}`;
        }

        const totalCountElement = document.querySelector('#expenses-tab-pane .card-header .badge.bg-primary') ||
                                document.querySelector('#expenses .card-header .badge.bg-primary');
        if (totalCountElement) {
            totalCountElement.textContent = `${this.expenseSummary.totalCount}条记录`;
        }

        // 获取右侧费用记录列表的容器 - 使用正确的ID
        const cardBody = document.getElementById('expenses-card-body');
        if (!cardBody) {
            console.error('❌ 未找到费用记录列表容器 #expenses-card-body');
            // 降级方案：尝试查找其他可能的容器
            const fallbackCardBody = document.querySelector('#expenses .col-lg-8 .card-body');
            if (fallbackCardBody) {
                console.log('✅ 使用降级方案找到容器');
                this.updateExpensesContainer(fallbackCardBody);
            } else {
                console.error('❌ 降级方案也失败，无法找到容器');
            }
            return;
        }

        console.log('✅ 找到正确的容器 #expenses-card-body');
        this.updateExpensesContainer(cardBody);
    }

    // 更新费用记录容器内容
    updateExpensesContainer(cardBody) {
        if (this.expensesData.length > 0) {
            // 有费用记录，确保表格结构存在并更新内容
            const tableBody = document.querySelector('#expenses-table-body');
            if (tableBody) {
                // 表格体存在，直接更新内容
                console.log('✅ 表格体存在，更新内容');
                tableBody.innerHTML = this.renderExpensesTableBody();
            } else {
                // 表格体不存在，创建完整的表格结构
                console.log('📝 创建费用记录表格结构');
                cardBody.innerHTML = this.createExpensesTableHTML();
            }
        } else {
            // 没有费用记录，显示空状态
            console.log('📝 显示空状态');
            cardBody.innerHTML = this.createEmptyStateHTML();
        }
    }

    // 激活费用标签页
    activateExpensesTab() {
        // 激活费用标签页
        const expensesTab = document.querySelector('#expenses-tab');
        if (expensesTab) {
            const tab = new bootstrap.Tab(expensesTab);
            tab.show();
        }
    }

    // 渲染费用表格内容
    renderExpensesTableBody() {
        if (this.expensesData.length === 0) {
            return '';
        }
        
        // 计算合计金额
        const totalAmount = this.expensesData.reduce((sum, expense) => sum + parseFloat(expense.amount), 0);
        
        // 生成表格行
        let rows = `
            <!-- 合计行 -->
            <tr class="table-info">
                <td><strong>合计</strong></td>
                <td><strong>¥${totalAmount.toFixed(2)}</strong></td>
                <td colspan="4"></td>
            </tr>
        `;
        
        // 添加费用记录行
        rows += this.expensesData.map(expense => `
            <tr>
                <td>${expense.item}</td>
                <td>¥${parseFloat(expense.amount).toFixed(2)}</td>
                <td>${new Date(expense.expense_date).toLocaleDateString()}</td>
                <td>${expense.payer || '-'}</td>
                <td>${expense.recorder?.username || '-'}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary me-1" onclick="activityDetailPage.editExpense('${expense.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="activityDetailPage.deleteExpense('${expense.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
        
        return rows;
    }

    // 更新参与者分摊系数
    async updateParticipantRatio(userId, ratio) {
        try {
            const response = await API.activities.updateParticipantRatio(this.activityId, userId, ratio);

            if (response.success) {
                Utils.toast.success('更新分摊系数成功');
                // 重新加载AA费用分摊数据
                await this.loadAACosts();
                // 重新渲染AA费用分摊标签页
                this.renderAACostsTab();
            } else {
                Utils.toast.error('更新分摊系数失败: ' + response.message);
            }
        } catch (error) {
            console.error('更新分摊系数失败:', error);
            Utils.toast.error('更新分摊系数失败: ' + error.message);
        }
    }

    // 渲染AA费用分摊标签页
    renderAACostsTab() {
        const aaCostsTab = document.getElementById('aa-costs-content');
        if (!aaCostsTab || !this.aaCostsData) return;

        if (this.aaCostsData.participantCount === 0) {
            aaCostsTab.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">
                        <i class="fas fa-users"></i>
                    </div>
                    <p class="mb-0">暂无参与者</p>
                    <p class="text-muted small">活动需要有参与者才能进行费用分摊</p>
                </div>
            `;
            return;
        }

        // 计算总系数
        const totalRatio = this.aaCostsData.participants.reduce((sum, p) => sum + parseFloat(p.cost_sharing_ratio), 0);

        aaCostsTab.innerHTML = `
            <div class="card">
                <div class="card-header">
                    <h5 class="card-title mb-0">
                        <i class="fas fa-calculator me-2"></i>AA费用分摊计算
                    </h5>
                </div>
                <div class="card-body">
                    <div class="row mb-4">
                        <div class="col-md-4">
                            <div class="stat-card">
                                <div class="stat-label">活动总费用</div>
                                <div class="stat-value">¥${this.aaCostsData.totalCost}</div>
                            </div>
                        </div>
                        <div class="col-md-4">
                            <div class="stat-card">
                                <div class="stat-label">参与人数</div>
                                <div class="stat-value">${this.aaCostsData.participantCount}</div>
                            </div>
                        </div>
                        <div class="col-md-4">
                            <div class="stat-card">
                                <div class="stat-label">平均费用</div>
                                <div class="stat-value">¥${this.aaCostsData.averageCost}</div>
                            </div>
                        </div>
                    </div>

                    <div class="table-responsive">
                        <table class="table table-hover">
                            <thead>
                                <tr>
                                    <th>参与者</th>
                                    <th>分摊系数</th>
                                    <th>应付金额</th>
                                    <th>操作</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${this.aaCostsData.participants.map(participant => `
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
                                        <td>
                                            <div class="input-group" style="max-width: 120px;">
                                                <input type="number" 
                                                       class="form-control form-control-sm ratio-input" 
                                                       value="${participant.cost_sharing_ratio}" 
                                                       min="0" 
                                                       max="10" 
                                                       step="0.1"
                                                       data-user-id="${participant.user_id}">
                                                <button class="btn btn-outline-primary btn-sm ratio-update" 
                                                        type="button"
                                                        data-user-id="${participant.user_id}">
                                                    <i class="fas fa-sync"></i>
                                                </button>
                                            </div>
                                        </td>
                                        <td>
                                            <span class="fw-bold text-success">¥${participant.amount}</span>
                                        </td>
                                        <td>
                                            <span class="badge bg-info">
                                                ${((parseFloat(participant.amount) / parseFloat(this.aaCostsData.averageCost)) * 100).toFixed(0)}%
                                            </span>
                                        </td>
                                    </tr>
                                `).join('')}
                                <tr class="table-info">
                                    <td><strong>合计</strong></td>
                                    <td><strong>${totalRatio.toFixed(2)}</strong></td>
                                    <td><strong>¥${this.aaCostsData.totalCost}</strong></td>
                                    <td></td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <div class="alert alert-info mt-3">
                        <h6 class="alert-heading">
                            <i class="fas fa-info-circle me-2"></i>分摊说明
                        </h6>
                        <p class="mb-1">
                            <strong>计算公式：</strong>个人应付金额 = 活动总费用 × (个人系数 / 所有参与者系数总和)
                        </p>
                        <p class="mb-1">
                            <strong>系数说明：</strong>默认系数为1，系数越大分摊比例越高，系数为0表示不参与分摊
                        </p>
                        <p class="mb-0">
                            <strong>当前总系数：</strong>${totalRatio.toFixed(2)}
                        </p>
                    </div>
                </div>
            </div>
        `;

        // 绑定系数更新事件
        this.bindRatioUpdateEvents();
    }

    // 绑定系数更新事件
    bindRatioUpdateEvents() {
        // 输入框回车事件
        const ratioInputs = document.querySelectorAll('.ratio-input');
        ratioInputs.forEach(input => {
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    const userId = input.dataset.userId;
                    const ratio = parseFloat(input.value) || 1;
                    this.updateParticipantRatio(userId, ratio);
                }
            });
        });

        // 更新按钮点击事件
        const updateButtons = document.querySelectorAll('.ratio-update');
        updateButtons.forEach(button => {
            button.addEventListener('click', () => {
                const userId = button.dataset.userId;
                const input = document.querySelector(`.ratio-input[data-user-id="${userId}"]`);
                const ratio = parseFloat(input.value) || 1;
                this.updateParticipantRatio(userId, ratio);
            });
        });
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

// 返回列表页面（全局函数，保持向后兼容）
function goToList() {
    console.log('全局goToList函数被调用');

    // 如果页面实例已存在，使用实例方法
    if (typeof window.activityDetailPage !== 'undefined' && window.activityDetailPage) {
        window.activityDetailPage.goBackToList();
    } else {
        // 降级方案：直接跳转
        console.log('页面实例不存在，直接跳转到活动列表页面');
        window.location.href = '/activities/list';
    }
}