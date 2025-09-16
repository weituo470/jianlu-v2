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
            console.log('🔄 正在加载活动数据...');
            console.log('当前筛选条件:', this.currentFilters);
            
            const response = await API.activities.getList(this.currentFilters);
            console.log('📡 API完整响应:', response);
            console.log('📡 响应类型:', typeof response);
            console.log('📡 响应成功标志:', response.success);
            console.log('📡 响应数据:', response.data);
            
            if (response.success) {
                this.activities = response.data?.activities || [];
                console.log(`✅ 成功加载 ${this.activities.length} 个活动`);
                
                // 打印所有活动的关键信息
                this.activities.forEach((activity, index) => {
                    console.log(`\n📋 活动 ${index + 1}:`);
                    console.log('  ID:', activity.id);
                    console.log('  标题:', activity.title);
                    console.log('  team_id:', activity.team_id);
                    console.log('  team_name:', activity.team_name);
                    console.log('  team_name类型:', typeof activity.team_name);
                    console.log('  creator_id:', activity.creator_id);
                    console.log('  creator_name:', activity.creator_name);
                    console.log('  creator_name类型:', typeof activity.creator_name);
                });
                
                return true;
            } else {
                console.error('❌ API返回失败:', response.message);
                throw new Error(response.message || '加载失败');
            }
        } catch (error) {
            console.error('💥 加载活动失败:', error);
            this.activities = [];
            throw error;
        }
    }

    // 加载团队数据
    async loadTeams() {
        try {
            const response = await API.teams.getList();
            if (response.success) {
                // 团队API返回的数据结构是 {data: {teams: [...], pagination: {...}}}
                this.teams = response.data?.teams || [];
                console.log(`成功加载 ${this.teams.length} 个团队`);
                return true;
            } else {
                this.teams = [];
                console.warn('加载团队失败:', response.message);
                return false;
            }
        } catch (error) {
            console.error('加载团队失败:', error);
            this.teams = [];
            return false;
        }
    }

    // 加载活动类型数据
    async loadActivityTypes() {
        try {
            console.log('开始加载活动类型数据...');
            const response = await API.activities.getTypes();
            console.log('活动类型API响应:', response);
            
            if (response.success) {
                this.activityTypes = response.data || [];
                console.log(`成功加载 ${this.activityTypes.length} 个活动类型:`, this.activityTypes);
                return true;
            } else {
                this.activityTypes = [];
                console.warn('加载活动类型失败:', response.message);
                return false;
            }
        } catch (error) {
            console.error('加载活动类型失败:', error);
            this.activityTypes = [];
            return false;
        }
    }

    // 初始化筛选器选项
    initializeFilters() {
        // 初始化活动类型筛选器
        const typeFilter = document.getElementById('type-filter');
        if (typeFilter && Array.isArray(this.activityTypes)) {
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
        if (teamFilter && Array.isArray(this.teams)) {
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
        console.log('\n🎯 === createActivityCard 深度调试 ===');
        console.log('📦 原始活动数据:', activity);
        console.log('🏢 team_name 值:', activity.team_name);
        console.log('🏢 team_name 类型:', typeof activity.team_name);
        console.log('🏢 team_name 长度:', activity.team_name ? activity.team_name.length : 'null/undefined');
        console.log('🏢 team_name JSON:', JSON.stringify(activity.team_name));
        console.log('👤 creator_name 值:', activity.creator_name);
        console.log('👤 creator_name 类型:', typeof activity.creator_name);
        console.log('👤 creator_name 长度:', activity.creator_name ? activity.creator_name.length : 'null/undefined');
        console.log('👤 creator_name JSON:', JSON.stringify(activity.creator_name));
        
        // 检查是否有null、undefined或空字符串
        console.log('🔍 team_name 检查:');
        console.log('  - 是否null:', activity.team_name === null);
        console.log('  - 是否undefined:', activity.team_name === undefined);
        console.log('  - 是否空字符串:', activity.team_name === '');
        console.log('  - 布尔转换:', !!activity.team_name);
        
        console.log('🔍 creator_name 检查:');
        console.log('  - 是否null:', activity.creator_name === null);
        console.log('  - 是否undefined:', activity.creator_name === undefined);
        console.log('  - 是否空字符串:', activity.creator_name === '');
        console.log('  - 布尔转换:', !!activity.creator_name);
        
        const statusBadgeClass = this.getStatusBadgeClass(activity.status);
        const statusText = this.getStatusText(activity.status);
        const typeText = this.getTypeText(activity.type);
        const teamName = activity.team_name || '未知团队';
        const creatorName = activity.creator_name || '未知用户';
        
        console.log('✅ 最终显示的团队名称:', teamName);
        console.log('✅ 最终显示的创建者名称:', creatorName);
        console.log('==========================================\n');
        
        return `
            <div class="col-md-6 col-lg-4 mb-4">
                <div class="card h-100">
                    <div class="card-header d-flex justify-content-between align-items-center">
                        <div class="d-flex align-items-center">
                            ${activity.sequence_number && activity.sequence_number > 0 ? `<span class="activity-sequence-badge">#${activity.sequence_number}</span>` : ''}
                            <span class="badge ${statusBadgeClass}">${statusText}</span>
                        </div>
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
                                    <i class="fas fa-user"></i>
                                    ${creatorName}
                                </small>
                                <small class="text-muted">
                                    <i class="fas fa-clock"></i>
                                    ${Utils.date.format(activity.created_at, 'MM-DD HH:mm')}
                                </small>
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

    // 获取参与者状态徽章样式
    getParticipantStatusBadgeClass(status) {
        const statusClasses = {
            'pending': 'bg-warning text-dark',
            'registered': 'bg-info',
            'approved': 'bg-success',
            'attended': 'bg-primary',
            'absent': 'bg-secondary',
            'cancelled': 'bg-danger',
            'rejected': 'bg-danger'
        };
        return statusClasses[status] || 'bg-secondary';
    }

    // 获取参与者状态标签
    getParticipantStatusLabel(status) {
        const statusLabels = {
            'pending': '待审核',
            'registered': '已报名',
            'approved': '已批准',
            'attended': '已参与',
            'absent': '未参与',
            'cancelled': '已取消',
            'rejected': '已拒绝'
        };
        return statusLabels[status] || status;
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
        if (!Array.isArray(this.activityTypes)) {
            return type;
        }
        const activityType = this.activityTypes.find(t => t.value === type);
        return activityType ? activityType.label : type;
    }

  
    // 处理搜索
    async handleSearch(searchValue = null) {
        if (searchValue !== null) {
            this.currentFilters.search = searchValue.trim();
        } else {
            const searchInput = document.getElementById('search-input');
            this.currentFilters.search = searchInput ? searchInput.value.trim() : '';
        }
        await this.refreshList();
    }

    // 处理筛选
    async handleFilter(filterType = null, filterValue = null) {
        if (filterType && filterValue !== null) {
            this.currentFilters[filterType] = filterValue;
        } else {
            const statusFilter = document.getElementById('status-filter');
            const typeFilter = document.getElementById('type-filter');
            const teamFilter = document.getElementById('team-filter');

            this.currentFilters.status = statusFilter ? statusFilter.value : '';
            this.currentFilters.type = typeFilter ? typeFilter.value : '';
            this.currentFilters.team = teamFilter ? teamFilter.value : '';
        }

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

    // 更新活动序号
    async updateSequenceNumbers() {
        if (!confirm('确定要更新所有活动的序号吗？\n\n这将按创建时间重新排序所有活动。')) {
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/activities/update-sequence`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${auth.getToken()}`
                }
            });

            const result = await response.json();

            if (result.success) {
                this.showMessage(`成功更新了 ${result.data.updated} 个活动的序号`, 'success');
                await this.refreshList();
            } else {
                throw new Error(result.message || '更新序号失败');
            }
        } catch (error) {
            console.error('更新活动序号失败:', error);
            this.showMessage('更新序号失败: ' + error.message, 'error');
        }
    }

    // 显示创建活动模态框
    async showCreateModal() {
        try {
            // 直接使用我们自己的AA制功能模态框
            await this.showCreateActivityModal();
        } catch (error) {
            console.error('显示创建活动模态框失败:', error);
            this.showMessage('打开创建窗口失败: ' + error.message, 'error');
        }
    }

    // 创建活动模态框（包含AA制功能）
    async showCreateActivityModal() {
        // 调试：检查活动类型数据
        console.log('创建活动模态框时的活动类型数据:', this.activityTypes);
        console.log('活动类型数组长度:', this.activityTypes ? this.activityTypes.length : 'undefined');
        
        const modalContent = `
            <form id="createActivityForm">
                <div class="row">
                    <div class="col-md-6">
                        <div class="form-group mb-3">
                            <label for="activityTitle" class="form-label">活动标题 *</label>
                            <input type="text" class="form-control" id="activityTitle" name="title" required 
                                   placeholder="请输入活动标题">
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="form-group mb-3">
                            <label for="activityType" class="form-label">活动类型</label>
                            <select class="form-control" id="activityType" name="type">
                                <option value="">请选择活动类型</option>
                                ${this.activityTypes.map(type => `
                                    <option value="${type.value}">${type.label}</option>
                                `).join('')}
                            </select>
                        </div>
                    </div>
                </div>
                
                <div class="row">
                    <div class="col-md-6">
                        <div class="form-group mb-3">
                            <label for="activityTeam" class="form-label">所属团队</label>
                            <select class="form-control" id="activityTeam" name="team_id">
                                <option value="">请选择团队</option>
                                ${this.teams.map(team => `
                                    <option value="${team.id}">${team.name}</option>
                                `).join('')}
                            </select>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="form-group mb-3">
                            <label for="activityLocation" class="form-label">活动地点</label>
                            <input type="text" class="form-control" id="activityLocation" name="location" 
                                   placeholder="请输入活动地点">
                        </div>
                    </div>
                </div>
                
                <div class="row">
                    <div class="col-md-6">
                        <div class="form-group mb-3">
                            <label for="activityStartTime" class="form-label">开始时间</label>
                            <input type="datetime-local" class="form-control" id="activityStartTime" name="start_time">
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="form-group mb-3">
                            <label for="activityEndTime" class="form-label">结束时间</label>
                            <input type="datetime-local" class="form-control" id="activityEndTime" name="end_time">
                        </div>
                    </div>
                </div>
                
                <div class="row">
                    <div class="col-md-6">
                        <div class="form-group mb-3">
                            <div class="form-check form-switch">
                                <input class="form-check-input" type="checkbox" id="enableParticipantLimit" 
                                       name="enable_participant_limit" checked onchange="activitiesManager.toggleParticipantLimit()">
                                <label class="form-check-label" for="enableParticipantLimit">
                                    开启人数限制
                                </label>
                            </div>
                            <small class="text-muted">开启后需要设置最低和最高参与人数</small>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="form-group mb-3">
                            <label for="activityMaxParticipants" class="form-label">最大参与人数</label>
                            <input type="number" class="form-control" id="activityMaxParticipants" name="max_participants" 
                                   min="1" value="30" placeholder="不限制请留空">
                        </div>
                    </div>
                </div>
                
                <div class="row" id="participantLimitRow">
                    <div class="col-md-6">
                        <div class="form-group mb-3">
                            <label for="activityMinParticipants" class="form-label">最低参与人数</label>
                            <input type="number" class="form-control" id="activityMinParticipants" name="min_participants" 
                                   min="1" value="3" placeholder="默认3人">
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="form-group mb-3">
                            <label for="needApproval" class="form-label">是否需要审核</label>
                            <select class="form-control" id="needApproval" name="need_approval">
                                <option value="false">无需审核</option>
                                <option value="true">需要审核</option>
                            </select>
                        </div>
                    </div>
                </div>
                
                <div class="form-group mb-3">
                    <label for="activityDescription" class="form-label">活动描述</label>
                    <textarea class="form-control" id="activityDescription" name="description" rows="3"
                              placeholder="请输入活动描述"></textarea>
                </div>
                
                <!-- AA制费用设置区域 -->
                <div class="card mt-4">
                    <div class="card-header">
                        <h6 class="mb-0">
                            <i class="fas fa-money-bill-wave me-2"></i>
                            AA制费用设置
                            <small class="text-muted">(可选，用于活动费用分摊)</small>
                        </h6>
                    </div>
                    <div class="card-body">
                        <div class="row">
                            <div class="col-md-6">
                                <div class="form-group mb-3">
                                    <label for="activityTotalCost" class="form-label">活动总费用 (元)</label>
                                    <input type="number" class="form-control" id="activityTotalCost" name="total_cost" 
                                           step="0.01" min="0" placeholder="0.00" onchange="activitiesManager.calculateCosts()">
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="form-group mb-3">
                                    <label for="activityOrganizerCost" class="form-label">发起人承担费用 (元)</label>
                                    <input type="number" class="form-control" id="activityOrganizerCost" name="organizer_cost" 
                                           step="0.01" min="0" placeholder="0.00" onchange="activitiesManager.calculateCosts()">
                                </div>
                            </div>
                        </div>
                        
                        <div class="row">
                            <div class="col-md-6">
                                <div class="form-group mb-3">
                                    <label for="activityPaymentDeadline" class="form-label">支付截止时间</label>
                                    <input type="datetime-local" class="form-control" id="activityPaymentDeadline" name="payment_deadline">
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="form-group mb-3">
                                    <label class="form-label">费用预览</label>
                                    <div class="cost-preview p-3 bg-light rounded">
                                        <div class="row text-center">
                                            <div class="col-4">
                                                <div class="text-primary">
                                                    <strong id="organizerCostPreview">¥0.00</strong>
                                                </div>
                                                <small class="text-muted">发起人承担</small>
                                            </div>
                                            <div class="col-4">
                                                <div class="text-success">
                                                    <strong id="participantCostTotal">¥0.00</strong>
                                                </div>
                                                <small class="text-muted">参与者总计</small>
                                            </div>
                                            <div class="col-4">
                                                <div class="text-warning">
                                                    <strong id="costPerPersonPreview">¥0.00</strong>
                                                </div>
                                                <small class="text-muted">每人应付</small>
                                            </div>
                                        </div>
                                        <div class="text-center mt-2">
                                            <small class="text-muted">
                                                <i class="fas fa-info-circle"></i>
                                                每人费用将根据实际报名人数动态计算
                                            </small>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="form-group mb-0">
                            <label for="activityCostDescription" class="form-label">费用说明</label>
                            <textarea class="form-control" id="activityCostDescription" name="cost_description" rows="2"
                                      placeholder="例如：包含餐费、场地费、交通费等"></textarea>
                        </div>
                    </div>
                </div>
            </form>
        `;

        // 创建模态框
        const modal = this.createModal({
            title: '创建活动',
            content: modalContent,
            size: 'lg',
            footer: `
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">取消</button>
                <button type="button" class="btn btn-primary" onclick="activitiesManager.submitCreateActivity()">
                    <i class="fas fa-plus"></i>
                    创建活动
                </button>
            `
        });

        // 设置默认时间（当前时间+1小时 到 当前时间+2小时）
        const now = new Date();
        const startTime = new Date(now.getTime() + 60 * 60 * 1000); // +1小时
        const endTime = new Date(now.getTime() + 2 * 60 * 60 * 1000); // +2小时

        document.getElementById('activityStartTime').value = this.formatDateTimeLocal(startTime);
        document.getElementById('activityEndTime').value = this.formatDateTimeLocal(endTime);
        
        // 初始计算费用
        this.calculateCosts();
    }

    // 查看活动详情
    async viewActivity(activityId) {
        const activity = this.activities.find(a => a.id === activityId);
        if (!activity) {
            this.showMessage('活动不存在', 'error');
            return;
        }

        try {
            // 获取活动详细信息和费用统计
            const [detailResponse, costResponse] = await Promise.all([
                API.activities.getDetail(activityId),
                API.activities.getCostSummary(activityId).catch(() => ({ success: false })) // 费用信息可能不存在
            ]);

            if (!detailResponse.success) {
                this.showMessage('获取活动详情失败', 'error');
                return;
            }

            const activityDetail = detailResponse.data;
            const hasCost = costResponse.success && costResponse.data.costs.totalCost > 0;

            // 构建活动详情内容
            let modalContent = `
                <div class="row">
                    <div class="col-md-8">
                        <div class="card">
                            <div class="card-header">
                                <h5 class="mb-0">
                                    <i class="fas fa-calendar-alt me-2"></i>
                                    ${activityDetail.title}
                                </h5>
                            </div>
                            <div class="card-body">
                                <div class="row mb-3">
                                    <div class="col-sm-3"><strong>活动类型:</strong></div>
                                    <div class="col-sm-9">${this.getActivityTypeLabel(activityDetail.type)}</div>
                                </div>
                                <div class="row mb-3">
                                    <div class="col-sm-3"><strong>所属团队:</strong></div>
                                    <div class="col-sm-9">${activityDetail.team?.name || '未指定'}</div>
                                </div>
                                <div class="row mb-3">
                                    <div class="col-sm-3"><strong>活动时间:</strong></div>
                                    <div class="col-sm-9">
                                        ${activityDetail.start_time ? new Date(activityDetail.start_time).toLocaleString() : '未设置'} 
                                        ${activityDetail.end_time ? ' 至 ' + new Date(activityDetail.end_time).toLocaleString() : ''}
                                    </div>
                                </div>
                                <div class="row mb-3">
                                    <div class="col-sm-3"><strong>活动地点:</strong></div>
                                    <div class="col-sm-9">${activityDetail.location || '未指定'}</div>
                                </div>
                                <div class="row mb-3">
                                    <div class="col-sm-3"><strong>参与人数:</strong></div>
                                    <div class="col-sm-9">
                                        ${activityDetail.current_participants || 0}人
                                        ${activityDetail.max_participants ? ` / ${activityDetail.max_participants}人` : ' (不限制)'}
                                    </div>
                                </div>
                                <div class="row mb-3">
                                    <div class="col-sm-3"><strong>活动状态:</strong></div>
                                    <div class="col-sm-9">
                                        <span class="badge ${this.getStatusBadgeClass(activityDetail.status)}">
                                            ${this.getStatusLabel(activityDetail.status)}
                                        </span>
                                    </div>
                                </div>
                                ${activityDetail.description ? `
                                <div class="row mb-3">
                                    <div class="col-sm-3"><strong>活动描述:</strong></div>
                                    <div class="col-sm-9">${activityDetail.description}</div>
                                </div>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                    <div class="col-md-4">
                        ${hasCost ? this.renderCostSummaryPanel(costResponse.data) : ''}
                        <div class="card mt-3">
                            <div class="card-header">
                                <h6 class="mb-0">操作</h6>
                            </div>
                            <div class="card-body">
                                <div class="d-grid gap-2">
                                    <button class="btn btn-primary btn-sm" onclick="activitiesManager.editActivity('${activityId}')">
                                        <i class="fas fa-edit"></i> 编辑活动
                                    </button>
                                    <button class="btn btn-info btn-sm" onclick="activitiesManager.manageParticipants('${activityId}')">
                                        <i class="fas fa-users"></i> 管理参与者
                                    </button>
                                    ${hasCost ? `
                                    <button class="btn btn-success btn-sm" onclick="activitiesManager.viewPaymentStatus('${activityId}')">
                                        <i class="fas fa-money-bill-wave"></i> 支付状态
                                    </button>
                                    ` : ''}
                                    <button class="btn btn-danger btn-sm" onclick="activitiesManager.deleteActivity('${activityId}')">
                                        <i class="fas fa-trash"></i> 删除活动
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            // 创建模态框
            const modal = Components.createModal({
                title: '活动详情',
                content: modalContent,
                size: 'xl',
                footer: `
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">关闭</button>
                `
            });

        } catch (error) {
            console.error('查看活动详情失败:', error);
            this.showMessage('查看活动详情失败: ' + error.message, 'error');
        }
    }

    // 在页面中查看活动详情（非弹窗模式）
    async viewActivityInPage(activityId, containerId) {
        try {
            let activity = this.activities.find(a => a.id === activityId);
            if (!activity) {
                // 如果在缓存中没找到，重新获取
                const response = await API.activities.getDetail(activityId);
                if (response.success) {
                    activity = response.data;
                } else {
                    throw new Error('活动不存在');
                }
            }

            // 获取活动详情
            const detailResponse = await API.activities.getDetail(activityId);

            if (!detailResponse.success) {
                throw new Error('获取活动详情失败');
            }

            const activityDetail = detailResponse.data;

            // 尝试获取费用统计（如果失败不会影响页面显示）
            let costData = null;
            let hasCost = false;
            try {
                const costResponse = await API.activities.getCostSummary(activityId);
                if (costResponse.success) {
                    costData = costResponse.data;
                    hasCost = costData.costs.totalCost > 0;
                }
            } catch (error) {
                console.warn('获取费用统计失败:', error);
            }

            // 获取参与者列表
            let participants = [];
            try {
                const participantsResponse = await API.activities.getParticipants(activityId);
                if (participantsResponse.success) {
                    participants = participantsResponse.data.participants;
                }
            } catch (error) {
                console.warn('获取参与者列表失败:', error);
            }

            // 构建活动详情内容
            const detailContent = `
                <div class="activity-detail-container">
                    <!-- 活动基本信息卡片 -->
                    <div class="row mb-4">
                        <div class="col-md-8">
                            <div class="card activity-info-card">
                                <div class="card-header d-flex justify-content-between align-items-center">
                                    <h5 class="mb-0">
                                        <i class="fas fa-calendar-alt me-2 text-primary"></i>
                                        ${activityDetail.title}
                                        ${activityDetail.sequence_number ? `<span class="badge bg-secondary ms-2">#${activityDetail.sequence_number}</span>` : ''}
                                    </h5>
                                    <span class="badge ${this.getStatusBadgeClass(activityDetail.status)} fs-6">
                                        ${this.getStatusLabel(activityDetail.status)}
                                    </span>
                                </div>
                                <div class="card-body">
                                    <div class="row mb-3">
                                        <div class="col-sm-3 text-muted"><strong>活动类型:</strong></div>
                                        <div class="col-sm-9">${this.getActivityTypeLabel(activityDetail.type)}</div>
                                    </div>
                                    <div class="row mb-3">
                                        <div class="col-sm-3 text-muted"><strong>所属团队:</strong></div>
                                        <div class="col-sm-9">${activityDetail.team?.name || '未指定'}</div>
                                    </div>
                                    <div class="row mb-3">
                                        <div class="col-sm-3 text-muted"><strong>创建者:</strong></div>
                                        <div class="col-sm-9">${activityDetail.creator?.username || '未知'}</div>
                                    </div>
                                    <div class="row mb-3">
                                        <div class="col-sm-3 text-muted"><strong>活动时间:</strong></div>
                                        <div class="col-sm-9">
                                            <div class="d-flex align-items-center">
                                                <i class="fas fa-clock me-2 text-muted"></i>
                                                <span>
                                                    ${activityDetail.start_time ? new Date(activityDetail.start_time).toLocaleString() : '未设置'}
                                                    ${activityDetail.end_time ? '<br>至 ' + new Date(activityDetail.end_time).toLocaleString() : ''}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="row mb-3">
                                        <div class="col-sm-3 text-muted"><strong>活动地点:</strong></div>
                                        <div class="col-sm-9">
                                            <div class="d-flex align-items-center">
                                                <i class="fas fa-map-marker-alt me-2 text-muted"></i>
                                                <span>${activityDetail.location || '未指定'}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="row mb-3">
                                        <div class="col-sm-3 text-muted"><strong>参与人数:</strong></div>
                                        <div class="col-sm-9">
                                            <div class="progress" style="height: 25px;">
                                                <div class="progress-bar ${activityDetail.current_participants === activityDetail.max_participants ? 'bg-danger' : 'bg-success'}"
                                                     role="progressbar"
                                                     style="width: ${activityDetail.max_participants ? (activityDetail.current_participants / activityDetail.max_participants * 100) : 0}%">
                                                    ${activityDetail.current_participants || 0}人
                                                    ${activityDetail.max_participants ? ` / ${activityDetail.max_participants}人` : ' (不限制)'}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    ${activityDetail.payment_deadline ? `
                                    <div class="row mb-3">
                                        <div class="col-sm-3 text-muted"><strong>支付截止:</strong></div>
                                        <div class="col-sm-9">
                                            <div class="d-flex align-items-center">
                                                <i class="fas fa-money-check-alt me-2 text-muted"></i>
                                                <span>${new Date(activityDetail.payment_deadline).toLocaleString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                    ` : ''}
                                    ${activityDetail.description ? `
                                    <div class="row mb-3">
                                        <div class="col-sm-3 text-muted"><strong>活动描述:</strong></div>
                                        <div class="col-sm-9">
                                            <div class="activity-description">
                                                ${activityDetail.description.replace(/\n/g, '<br>')}
                                            </div>
                                        </div>
                                    </div>
                                    ` : ''}
                                </div>
                            </div>
                        </div>
                        <div class="col-md-4">
                            ${hasCost ? this.renderCostSummaryPanel(costData) : ''}

                            <!-- 快速操作卡片 -->
                            <div class="card mt-3">
                                <div class="card-header">
                                    <h6 class="mb-0">
                                        <i class="fas fa-tasks me-2"></i>
                                        快速操作
                                    </h6>
                                </div>
                                <div class="card-body">
                                    <div class="d-grid gap-2">
                                        ${Auth.hasPermission(['activity:update']) ? `
                                            <button class="btn btn-warning btn-sm" onclick="activitiesManager.editActivity('${activityId}')">
                                                <i class="fas fa-edit me-1"></i> 编辑活动
                                            </button>
                                        ` : ''}
                                        <button class="btn btn-info btn-sm" disabled title="功能开发中">
                                            <i class="fas fa-users me-1"></i> 查看参与者
                                        </button>
                                        ${hasCost ? `
                                            <button class="btn btn-success btn-sm" onclick="activitiesManager.viewPaymentStatus('${activityId}')">
                                                <i class="fas fa-money-bill-wave me-1"></i> 支付状态
                                            </button>
                                        ` : ''}
                                        ${Auth.hasPermission(['activity:delete']) ? `
                                            <button class="btn btn-danger btn-sm" onclick="activitiesManager.deleteActivity('${activityId}')">
                                                <i class="fas fa-trash me-1"></i> 删除活动
                                            </button>
                                        ` : ''}
                                    </div>
                                </div>
                            </div>

                            <!-- 活动统计 -->
                            <div class="card mt-3">
                                <div class="card-header">
                                    <h6 class="mb-0">
                                        <i class="fas fa-chart-bar me-2"></i>
                                        活动统计
                                    </h6>
                                </div>
                                <div class="card-body">
                                    <div class="row text-center">
                                        <div class="col-6 mb-2">
                                            <div class="text-primary">
                                                <i class="fas fa-users"></i>
                                                <div class="fs-5">${participants.length}</div>
                                            </div>
                                            <small class="text-muted">总参与</small>
                                        </div>
                                        <div class="col-6 mb-2">
                                            <div class="text-success">
                                                <i class="fas fa-user-check"></i>
                                                <div class="fs-5">${participants.filter(p => p.payment_status === 'paid').length}</div>
                                            </div>
                                            <small class="text-muted">已支付</small>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- 标签页导航 -->
                    <ul class="nav nav-tabs" id="activityDetailTabs" role="tablist">
                        <li class="nav-item" role="presentation">
                            <button class="nav-link active" id="participants-tab" data-bs-toggle="tab" data-bs-target="#participants" type="button" role="tab">
                                <i class="fas fa-users me-1"></i>
                                参与者
                            </button>
                        </li>
                        <li class="nav-item" role="presentation">
                            <button class="nav-link" id="logs-tab" data-bs-toggle="tab" data-bs-target="#logs" type="button" role="tab">
                                <i class="fas fa-history me-1"></i>
                                活动日志
                            </button>
                        </li>
                    </ul>

                    <!-- 标签页内容 -->
                    <div class="tab-content" id="activityDetailTabsContent">
                        <!-- 参与者列表标签页 -->
                        <div class="tab-pane fade show active" id="participants" role="tabpanel">
                            <div class="card">
                                <div class="card-header d-flex justify-content-between align-items-center">
                                    <h5 class="mb-0">
                                        <i class="fas fa-users me-2"></i>
                                        参与者列表
                                    </h5>
                                    <span class="badge bg-primary">${participants.length} 人</span>
                                </div>
                                <div class="card-body">
                                    ${participants.length === 0 ? `
                                        <div class="text-center py-4 text-muted">
                                            <i class="fas fa-user-slash fa-3x mb-3 d-block"></i>
                                            <h5>暂无参与者</h5>
                                            <p class="mb-0">该活动目前还没有人报名参加</p>
                                        </div>
                                    ` : `
                                        <div class="table-responsive">
                                            <table class="table table-hover">
                                                <thead>
                                                    <tr>
                                                        <th>用户信息</th>
                                                        <th>部门</th>
                                                        <th>联系方式</th>
                                                        <th>申请时间</th>
                                                        <th>状态</th>
                                                        <th>操作</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    ${participants.map(p => `
                                                        <tr>
                                                            <td>
                                                                <div class="d-flex align-items-center">
                                                                    <div class="avatar-placeholder me-2">
                                                                        <i class="fas fa-user"></i>
                                                                    </div>
                                                                    <div>
                                                                        <div class="fw-bold">${p.user?.username || '未知'}</div>
                                                                        <small class="text-muted">${p.user?.profile?.name || '未设置姓名'}</small>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td>${p.user?.profile?.department || '未分配'}</td>
                                                            <td>
                                                                <div>${p.user?.email || '-'}</div>
                                                                ${p.user?.profile?.phone ? `<small class="text-muted">${p.user.profile.phone}</small>` : ''}
                                                            </td>
                                                            <td>${new Date(p.registered_at).toLocaleString()}</td>
                                                            <td>
                                                                <span class="badge ${this.getParticipantStatusBadgeClass(p.status)}">
                                                                    ${this.getParticipantStatusLabel(p.status)}
                                                                </span>
                                                            </td>
                                                            <td>
                                                                ${p.status === 'pending' ? `
                                                                    <div class="btn-group btn-group-sm">
                                                                        <button class="btn btn-success" onclick="activitiesManager.approveParticipantFromDetail('${activityId}', '${p.id}')" title="批准">
                                                                            <i class="fas fa-check"></i>
                                                                        </button>
                                                                        <button class="btn btn-danger" onclick="activitiesManager.rejectParticipantFromDetail('${activityId}', '${p.id}', '${p.user?.username || '未知用户'}')" title="拒绝">
                                                                            <i class="fas fa-times"></i>
                                                                        </button>
                                                                    </div>
                                                                ` : `
                                                                    <span class="text-muted">
                                                                        ${p.status === 'approved' ? '<i class="fas fa-check-circle text-success"></i>' : ''}
                                                                        ${p.status === 'rejected' ? '<i class="fas fa-times-circle text-danger"></i>' : ''}
                                                                    </span>
                                                                `}
                                                            </td>
                                                        </tr>
                                                    `).join('')}
                                                </tbody>
                                            </table>
                                        </div>
                                    `}
                                </div>
                            </div>
                        </div>

                        <!-- 活动日志标签页 -->
                        <div class="tab-pane fade" id="logs" role="tabpanel">
                            <div class="card">
                                <div class="card-header">
                                    <h5 class="mb-0">
                                        <i class="fas fa-history me-2"></i>
                                        活动操作日志
                                    </h5>
                                </div>
                                <div class="card-body">
                                    <div id="activity-logs-container">
                                        ${this.renderActivityLogs(activityId)}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            // 将内容渲染到指定容器
            const container = document.getElementById(containerId);
            if (container) {
                container.innerHTML = detailContent;
            }

        } catch (error) {
            console.error('查看活动详情失败:', error);
            const container = document.getElementById(containerId);
            if (container) {
                container.innerHTML = `
                    <div class="alert alert-danger" role="alert">
                        <i class="fas fa-exclamation-circle me-2"></i>
                        加载活动详情失败: ${error.message}
                    </div>
                `;
            }
        }
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

    // 批量删除活动
    async batchDelete() {
        const checkedBoxes = document.querySelectorAll('.activity-checkbox:checked');
        if (checkedBoxes.length === 0) {
            this.showMessage('请选择要删除的活动', 'warning');
            return;
        }

        const activityIds = Array.from(checkedBoxes).map(cb => cb.value);
        const activityTitles = activityIds.map(id => {
            const activity = this.activities.find(a => a.id === id);
            return activity ? activity.title : id;
        });

        if (!confirm(`确定要删除以下 ${activityIds.length} 个活动吗？\n\n${activityTitles.join('\n')}\n\n此操作不可撤销。`)) {
            return;
        }

        try {
            let successCount = 0;
            let failCount = 0;

            for (const activityId of activityIds) {
                try {
                    const response = await API.activities.delete(activityId);
                    if (response.success) {
                        successCount++;
                    } else {
                        failCount++;
                    }
                } catch (error) {
                    failCount++;
                    console.error(`删除活动 ${activityId} 失败:`, error);
                }
            }

            if (successCount > 0) {
                this.showMessage(`成功删除 ${successCount} 个活动${failCount > 0 ? `，${failCount} 个失败` : ''}`, 
                    failCount > 0 ? 'warning' : 'success');
                await this.refreshList();
            } else {
                this.showMessage('批量删除失败', 'error');
            }

        } catch (error) {
            console.error('批量删除活动失败:', error);
            this.showMessage('批量删除失败: ' + error.message, 'error');
        }
    }

    // 管理参与者
    async manageParticipants(activityId) {
        const activity = this.activities.find(a => a.id === activityId);
        if (!activity) {
            this.showMessage('活动不存在', 'error');
            return;
        }

        try {
            // 获取参与者列表
            const response = await API.activities.getParticipants(activityId);

            if (!response.success) {
                this.showMessage('获取参与者列表失败', 'error');
                return;
            }

            const { participants } = response.data;

            // 按状态分组
            const pendingParticipants = participants.filter(p => p.status === 'pending');
            const approvedParticipants = participants.filter(p => p.status === 'approved');
            const rejectedParticipants = participants.filter(p => p.status === 'rejected');

            const modalContent = `
                <div class="participants-management">
                    <!-- 统计信息 -->
                    <div class="row mb-4">
                        <div class="col-md-3">
                            <div class="card bg-primary text-white">
                                <div class="card-body text-center">
                                    <h4>${participants.length}</h4>
                                    <p class="mb-0">总报名</p>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="card bg-warning text-white">
                                <div class="card-body text-center">
                                    <h4>${pendingParticipants.length}</h4>
                                    <p class="mb-0">待审核</p>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="card bg-success text-white">
                                <div class="card-body text-center">
                                    <h4>${approvedParticipants.length}</h4>
                                    <p class="mb-0">已批准</p>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="card bg-danger text-white">
                                <div class="card-body text-center">
                                    <h4>${rejectedParticipants.length}</h4>
                                    <p class="mb-0">已拒绝</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- 标签页 -->
                    <ul class="nav nav-tabs" id="participantsTabs" role="tablist">
                        <li class="nav-item" role="presentation">
                            <button class="nav-link ${pendingParticipants.length > 0 ? 'active' : ''}" id="pending-tab" data-bs-toggle="tab" data-bs-target="#pending" type="button">
                                待审核 (${pendingParticipants.length})
                            </button>
                        </li>
                        <li class="nav-item" role="presentation">
                            <button class="nav-link ${pendingParticipants.length === 0 ? 'active' : ''}" id="approved-tab" data-bs-toggle="tab" data-bs-target="#approved" type="button">
                                已批准 (${approvedParticipants.length})
                            </button>
                        </li>
                        <li class="nav-item" role="presentation">
                            <button class="nav-link" id="rejected-tab" data-bs-toggle="tab" data-bs-target="#rejected" type="button">
                                已拒绝 (${rejectedParticipants.length})
                            </button>
                        </li>
                    </ul>

                    <!-- 标签页内容 -->
                    <div class="tab-content mt-3" id="participantsTabsContent">
                        <!-- 待审核列表 -->
                        <div class="tab-pane fade ${pendingParticipants.length > 0 ? 'show active' : ''}" id="pending" role="tabpanel">
                            ${pendingParticipants.length === 0 ? `
                                <div class="text-center py-4 text-muted">
                                    <i class="fas fa-check-circle fa-3x mb-3 d-block"></i>
                                    <h5>暂无待审核的申请</h5>
                                </div>
                            ` : `
                                <div class="table-responsive">
                                    <table class="table table-hover">
                                        <thead>
                                            <tr>
                                                <th>用户</th>
                                                <th>邮箱</th>
                                                <th>申请时间</th>
                                                <th>操作</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${pendingParticipants.map(p => `
                                                <tr>
                                                    <td>
                                                        <div class="d-flex align-items-center">
                                                            <div class="avatar-placeholder me-2">
                                                                <i class="fas fa-user"></i>
                                                            </div>
                                                            <div>
                                                                <div class="fw-bold">${p.user?.username || '未知'}</div>
                                                                <small class="text-muted">${p.user?.profile?.name || ''}</small>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td>${p.user?.email || '-'}</td>
                                                    <td>${new Date(p.registered_at).toLocaleString()}</td>
                                                    <td>
                                                        <div class="btn-group btn-group-sm">
                                                            <button class="btn btn-success" onclick="activitiesManager.approveParticipant('${activityId}', '${p.id}')">
                                                                <i class="fas fa-check"></i> 批准
                                                            </button>
                                                            <button class="btn btn-danger" onclick="activitiesManager.showRejectModal('${activityId}', '${p.id}', '${p.user?.username || '未知用户'}')">
                                                                <i class="fas fa-times"></i> 拒绝
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            `).join('')}
                                        </tbody>
                                    </table>
                                </div>
                            `}
                        </div>

                        <!-- 已批准列表 -->
                        <div class="tab-pane fade ${pendingParticipants.length === 0 ? 'show active' : ''}" id="approved" role="tabpanel">
                            ${approvedParticipants.length === 0 ? `
                                <div class="text-center py-4 text-muted">
                                    <i class="fas fa-user-check fa-3x mb-3 d-block"></i>
                                    <h5>暂无已批准的参与者</h5>
                                </div>
                            ` : `
                                <div class="table-responsive">
                                    <table class="table table-hover">
                                        <thead>
                                            <tr>
                                                <th>用户</th>
                                                <th>邮箱</th>
                                                <th>批准时间</th>
                                                <th>支付状态</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${approvedParticipants.map(p => `
                                                <tr>
                                                    <td>
                                                        <div class="d-flex align-items-center">
                                                            <div class="avatar-placeholder me-2">
                                                                <i class="fas fa-user"></i>
                                                            </div>
                                                            <div>
                                                                <div class="fw-bold">${p.user?.username || '未知'}</div>
                                                                <small class="text-muted">${p.user?.profile?.name || ''}</small>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td>${p.user?.email || '-'}</td>
                                                    <td>${new Date(p.registered_at).toLocaleString()}</td>
                                                    <td>
                                                        <span class="badge ${this.getPaymentStatusBadgeClass(p.payment_status)}">
                                                            ${this.getPaymentStatusLabel(p.payment_status)}
                                                        </span>
                                                    </td>
                                                </tr>
                                            `).join('')}
                                        </tbody>
                                    </table>
                                </div>
                            `}
                        </div>

                        <!-- 已拒绝列表 -->
                        <div class="tab-pane fade" id="rejected" role="tabpanel">
                            ${rejectedParticipants.length === 0 ? `
                                <div class="text-center py-4 text-muted">
                                    <i class="fas fa-user-times fa-3x mb-3 d-block"></i>
                                    <h5>暂无已拒绝的申请</h5>
                                </div>
                            ` : `
                                <div class="table-responsive">
                                    <table class="table table-hover">
                                        <thead>
                                            <tr>
                                                <th>用户</th>
                                                <th>邮箱</th>
                                                <th>拒绝时间</th>
                                                <th>拒绝原因</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${rejectedParticipants.map(p => `
                                                <tr>
                                                    <td>
                                                        <div class="d-flex align-items-center">
                                                            <div class="avatar-placeholder me-2">
                                                                <i class="fas fa-user"></i>
                                                            </div>
                                                            <div>
                                                                <div class="fw-bold">${p.user?.username || '未知'}</div>
                                                                <small class="text-muted">${p.user?.profile?.name || ''}</small>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td>${p.user?.email || '-'}</td>
                                                    <td>${p.rejected_at ? new Date(p.rejected_at).toLocaleString() : '-'}</td>
                                                    <td>${p.rejection_reason || '-'}</td>
                                                </tr>
                                            `).join('')}
                                        </tbody>
                                    </table>
                                </div>
                            `}
                        </div>
                    </div>
                </div>

                <style>
                    .avatar-placeholder {
                        width: 40px;
                        height: 40px;
                        border-radius: 50%;
                        background-color: #e9ecef;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        color: #6c757d;
                    }
                </style>
            `;

            // 创建模态框
            const modal = Components.createModal({
                title: `管理参与者 - ${activity.title}`,
                content: modalContent,
                size: 'xl',
                footer: `
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">关闭</button>
                    ${pendingParticipants.length > 0 ? `
                        <button type="button" class="btn btn-success" onclick="activitiesManager.approveAllParticipants('${activityId}')">
                            <i class="fas fa-check-double"></i> 批准全部
                        </button>
                    ` : ''}
                `
            });

            // 存储参与者数据到模态框，方便后续操作
            modal.participants = participants;

        } catch (error) {
            console.error('管理参与者失败:', error);
            this.showMessage('管理参与者失败: ' + error.message, 'error');
        }
    }

    // 查看参与者
    async viewParticipants(activityId) {
        try {
            const response = await API.activities.getParticipants(activityId);

            if (!response.success) {
                this.showMessage('获取参与者列表失败', 'error');
                return;
            }

            const { participants } = response.data;
            const activity = this.activities.find(a => a.id === activityId);

            const modalContent = `
                <div class="table-responsive">
                    <table class="table table-hover">
                        <thead>
                            <tr>
                                <th>姓名</th>
                                <th>部门</th>
                                <th>邮箱</th>
                                <th>参与时间</th>
                                <th>支付状态</th>
                                <th>支付金额</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${participants.map(p => `
                                <tr>
                                    <td>${p.user?.username || '未知'}</td>
                                    <td>${p.user?.department || '未分配'}</td>
                                    <td>${p.user?.email || '-'}</td>
                                    <td>${new Date(p.registered_at).toLocaleString()}</td>
                                    <td>
                                        <span class="badge ${this.getPaymentStatusBadgeClass(p.payment_status)}">
                                            ${this.getPaymentStatusLabel(p.payment_status)}
                                        </span>
                                    </td>
                                    <td>${p.payment_amount ? '¥' + parseFloat(p.payment_amount).toFixed(2) : '-'}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;

            // 创建模态框
            const modal = Components.createModal({
                title: `参与者列表 - ${activity?.title || '活动'}`,
                content: modalContent,
                size: 'lg',
                footer: `
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">关闭</button>
                    ${Auth.hasPermission(['activity:update']) ? `
                        <button type="button" class="btn btn-primary" onclick="activitiesManager.manageParticipants('${activityId}')">
                            管理参与者
                        </button>
                    ` : ''}
                `
            });

        } catch (error) {
            console.error('查看参与者失败:', error);
            this.showMessage('查看参与者失败: ' + error.message, 'error');
        }
    }

    // 标记为已支付
    async markAsPaid(participantId) {
        if (!confirm('确定要将此参与者标记为已支付吗？')) {
            return;
        }

        try {
            const response = await API.activities.updatePaymentStatus(participantId, {
                payment_status: 'paid',
                payment_method: '管理员标记',
                payment_note: '管理员手动标记为已支付'
            });

            if (response.success) {
                this.showMessage('支付状态更新成功', 'success');
                // 刷新当前页面
                window.location.reload();
            } else {
                this.showMessage('更新支付状态失败: ' + response.message, 'error');
            }

        } catch (error) {
            console.error('更新支付状态失败:', error);
            this.showMessage('更新支付状态失败: ' + error.message, 'error');
        }
    }

    // 渲染费用统计面板
    renderCostSummaryPanel(costData) {
        const { activity, costs, payment } = costData;
        
        return `
            <div class="card">
                <div class="card-header">
                    <h6 class="mb-0">
                        <i class="fas fa-money-bill-wave me-2"></i>
                        费用统计
                    </h6>
                </div>
                <div class="card-body">
                    <div class="row text-center mb-3">
                        <div class="col-4">
                            <div class="text-primary">
                                <strong>¥${parseFloat(costs.totalCost).toFixed(2)}</strong>
                            </div>
                            <small class="text-muted">总费用</small>
                        </div>
                        <div class="col-4">
                            <div class="text-success">
                                <strong>¥${parseFloat(costs.companyCost).toFixed(2)}</strong>
                            </div>
                            <small class="text-muted">公司承担</small>
                        </div>
                        <div class="col-4">
                            <div class="text-warning">
                                <strong>¥${parseFloat(costs.employeeTotalCost).toFixed(2)}</strong>
                            </div>
                            <small class="text-muted">员工总计</small>
                        </div>
                    </div>
                    
                    <div class="text-center mb-3">
                        <div class="text-info">
                            <strong>¥${parseFloat(costs.costPerPerson).toFixed(2)}</strong>
                        </div>
                        <small class="text-muted">每人应付</small>
                    </div>
                    
                    <hr>
                    
                    <div class="row text-center">
                        <div class="col-4">
                            <div class="text-success">
                                <strong>${payment.paid}</strong>
                            </div>
                            <small class="text-muted">已支付</small>
                        </div>
                        <div class="col-4">
                            <div class="text-danger">
                                <strong>${payment.unpaid}</strong>
                            </div>
                            <small class="text-muted">未支付</small>
                        </div>
                        <div class="col-4">
                            <div class="text-secondary">
                                <strong>${payment.exempted}</strong>
                            </div>
                            <small class="text-muted">免缴</small>
                        </div>
                    </div>
                    
                    ${activity.payment_deadline ? `
                    <div class="mt-3 text-center">
                        <small class="text-muted">
                            <i class="fas fa-clock"></i>
                            支付截止: ${new Date(activity.payment_deadline).toLocaleString()}
                        </small>
                    </div>
                    ` : ''}
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
            'published': 'bg-primary',
            'ongoing': 'bg-success',
            'completed': 'bg-info',
            'cancelled': 'bg-danger'
        };
        return classMap[status] || 'bg-secondary';
    }

    // 查看支付状态
    async viewPaymentStatus(activityId) {
        try {
            const response = await API.activities.getPaymentStatus(activityId);
            
            if (!response.success) {
                this.showMessage('获取支付状态失败', 'error');
                return;
            }

            const { activity, summary, participants } = response.data;

            const modalContent = `
                <div class="row mb-4">
                    <div class="col-md-12">
                        <div class="card">
                            <div class="card-header">
                                <h6 class="mb-0">支付统计</h6>
                            </div>
                            <div class="card-body">
                                <div class="row text-center">
                                    <div class="col-3">
                                        <div class="text-primary"><strong>${summary.total}</strong></div>
                                        <small class="text-muted">总人数</small>
                                    </div>
                                    <div class="col-3">
                                        <div class="text-success"><strong>${summary.paid}</strong></div>
                                        <small class="text-muted">已支付</small>
                                    </div>
                                    <div class="col-3">
                                        <div class="text-danger"><strong>${summary.unpaid}</strong></div>
                                        <small class="text-muted">未支付</small>
                                    </div>
                                    <div class="col-3">
                                        <div class="text-secondary"><strong>${summary.exempted}</strong></div>
                                        <small class="text-muted">免缴</small>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="table-responsive">
                    <table class="table table-striped">
                        <thead>
                            <tr>
                                <th>员工姓名</th>
                                <th>应付金额</th>
                                <th>支付状态</th>
                                <th>支付时间</th>
                                <th>支付方式</th>
                                <th>操作</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${participants.map(p => `
                                <tr>
                                    <td>${p.user.username}</td>
                                    <td>¥${parseFloat(p.payment_amount).toFixed(2)}</td>
                                    <td>
                                        <span class="badge ${this.getPaymentStatusBadgeClass(p.payment_status)}">
                                            ${this.getPaymentStatusLabel(p.payment_status)}
                                        </span>
                                    </td>
                                    <td>${p.payment_time ? new Date(p.payment_time).toLocaleString() : '-'}</td>
                                    <td>${p.payment_method || '-'}</td>
                                    <td>
                                        <div class="btn-group btn-group-sm">
                                            <button class="btn btn-outline-success" onclick="activitiesManager.updatePaymentStatus('${p.id}', 'paid')">
                                                标记已付
                                            </button>
                                            <button class="btn btn-outline-secondary" onclick="activitiesManager.updatePaymentStatus('${p.id}', 'exempted')">
                                                免缴
                                            </button>
                                            <button class="btn btn-outline-danger" onclick="activitiesManager.updatePaymentStatus('${p.id}', 'unpaid')">
                                                未支付
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;

            // 创建模态框
            const modal = Components.createModal({
                title: `支付状态管理 - ${activity.title}`,
                content: modalContent,
                size: 'xl',
                footer: `
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">关闭</button>
                `
            });

        } catch (error) {
            console.error('查看支付状态失败:', error);
            this.showMessage('查看支付状态失败: ' + error.message, 'error');
        }
    }

    // 获取支付状态标签
    getPaymentStatusLabel(status) {
        const statusMap = {
            'unpaid': '未支付',
            'paid': '已支付',
            'exempted': '免缴'
        };
        return statusMap[status] || status;
    }

    // 获取支付状态徽章样式
    getPaymentStatusBadgeClass(status) {
        const classMap = {
            'unpaid': 'bg-danger',
            'paid': 'bg-success',
            'exempted': 'bg-secondary'
        };
        return classMap[status] || 'bg-secondary';
    }

    // 更新支付状态
    async updatePaymentStatus(participantId, status) {
        try {
            const response = await API.activities.updatePaymentStatus(participantId, {
                payment_status: status,
                payment_method: status === 'paid' ? '管理员标记' : null,
                payment_note: status === 'paid' ? '管理员手动标记为已支付' : null
            });

            if (response.success) {
                this.showMessage('支付状态更新成功', 'success');
                // 刷新当前模态框内容
                const modal = document.querySelector('.modal.show');
                if (modal) {
                    const bsModal = bootstrap.Modal.getInstance(modal);
                    if (bsModal) {
                        bsModal.hide();
                    }
                }
                // 重新打开支付状态页面
                setTimeout(() => {
                    const activityId = participantId.split('-')[0]; // 假设participantId包含activityId
                    // 这里需要从当前上下文获取activityId，简化处理
                    window.location.reload();
                }, 500);
            } else {
                this.showMessage('更新支付状态失败', 'error');
            }

        } catch (error) {
            console.error('更新支付状态失败:', error);
            this.showMessage('更新支付状态失败: ' + error.message, 'error');
        }
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

    // 格式化日期时间为本地输入格式
    formatDateTimeLocal(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    }

    // 切换人数限制开关
    toggleParticipantLimit() {
        const enableLimit = document.getElementById('enableParticipantLimit').checked;
        const limitRow = document.getElementById('participantLimitRow');
        const minInput = document.getElementById('activityMinParticipants');
        const maxInput = document.getElementById('activityMaxParticipants');
        
        if (enableLimit) {
            limitRow.style.display = 'flex';
            minInput.value = minInput.value || 3;
            maxInput.value = maxInput.value || 30;
        } else {
            limitRow.style.display = 'none';
            minInput.value = '';
            maxInput.value = '';
        }
    }

    // 计算费用预览
    calculateCosts() {
        const totalCostInput = document.getElementById('activityTotalCost');
        const organizerCostInput = document.getElementById('activityOrganizerCost');
        
        if (!totalCostInput || !organizerCostInput) return;
        
        const totalCost = parseFloat(totalCostInput.value) || 0;
        const organizerCost = parseFloat(organizerCostInput.value) || 0;
        
        // 计算各项费用
        const participantCostTotal = Math.max(0, totalCost - organizerCost);
        const estimatedParticipants = 10; // 预估参与人数，用于预览
        const costPerPerson = estimatedParticipants > 0 ? participantCostTotal / estimatedParticipants : 0;
        
        // 更新预览显示
        const organizerCostPreview = document.getElementById('organizerCostPreview');
        const participantCostTotalElem = document.getElementById('participantCostTotal');
        const costPerPersonPreview = document.getElementById('costPerPersonPreview');
        
        if (organizerCostPreview) organizerCostPreview.textContent = `¥${organizerCost.toFixed(2)}`;
        if (participantCostTotalElem) participantCostTotalElem.textContent = `¥${participantCostTotal.toFixed(2)}`;
        if (costPerPersonPreview) costPerPersonPreview.textContent = `¥${costPerPerson.toFixed(2)}`;
    }

    // 提交创建活动
    async submitCreateActivity() {
        const form = document.getElementById('createActivityForm');
        const formData = new FormData(form);
        
        const activityData = {
            title: formData.get('title').trim(),
            description: formData.get('description').trim(),
            type: formData.get('type'),
            team_id: formData.get('team_id'),
            start_time: formData.get('start_time'),
            end_time: formData.get('end_time'),
            location: formData.get('location').trim(),
            enable_participant_limit: formData.get('enable_participant_limit') === 'on',
            min_participants: formData.get('min_participants') ? parseInt(formData.get('min_participants')) : 3,
            max_participants: formData.get('max_participants') ? parseInt(formData.get('max_participants')) : 30,
            need_approval: formData.get('need_approval') === 'true',
            // AA制费用相关字段
            total_cost: formData.get('total_cost') ? parseFloat(formData.get('total_cost')) : 0,
            organizer_cost: formData.get('organizer_cost') ? parseFloat(formData.get('organizer_cost')) : 0,
            payment_deadline: formData.get('payment_deadline') || null,
            cost_description: formData.get('cost_description') ? formData.get('cost_description').trim() : '',
            cost_sharing_type: 'equal',
            activity_status: 'published'
        };

        // 验证必填字段
        if (!activityData.title) {
            this.showMessage('请填写活动标题', 'error');
            return;
        }

        // 验证时间（如果都有值的话）
        if (activityData.start_time && activityData.end_time) {
            const startTime = new Date(activityData.start_time);
            const endTime = new Date(activityData.end_time);
            if (endTime <= startTime) {
                this.showMessage('结束时间必须晚于开始时间', 'error');
                return;
            }
        }

        // 验证费用信息
        if (activityData.total_cost > 0) {
            if (activityData.organizer_cost > activityData.total_cost) {
                this.showMessage('发起人承担费用不能超过活动总费用', 'error');
                return;
            }
        }

        try {
            // 根据是否有费用信息选择不同的API接口
            const response = activityData.total_cost > 0 
                ? await API.activities.createWithCost(activityData)
                : await API.activities.create(activityData);
            
            if (response.success) {
                this.showMessage('活动创建成功', 'success');
                
                // 关闭模态框
                const modal = document.querySelector('.modal.show');
                if (modal) {
                    const bsModal = bootstrap.Modal.getInstance(modal);
                    if (bsModal) {
                        bsModal.hide();
                    }
                }
                
                // 刷新活动列表
                await this.refreshList();
            } else {
                this.showMessage('创建失败: ' + response.message, 'error');
            }
        } catch (error) {
            console.error('创建活动失败:', error);
            this.showMessage('创建失败: ' + error.message, 'error');
        }
    }

    // 创建模态框（简化版）
    createModal({ title, content, size = 'md', footer = '' }) {
        const modalId = 'activityModal';
        
        // 移除已存在的模态框
        const existingModal = document.getElementById(modalId);
        if (existingModal) {
            existingModal.remove();
        }
        
        const modalHtml = `
            <div class="modal fade" id="${modalId}" tabindex="-1">
                <div class="modal-dialog modal-${size}">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">${title}</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            ${content}
                        </div>
                        ${footer ? `<div class="modal-footer">${footer}</div>` : ''}
                    </div>
                </div>
            </div>
        `;
        
        // 添加到页面
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        // 显示模态框
        const modal = document.getElementById(modalId);
        const bsModal = new bootstrap.Modal(modal);
        bsModal.show();
        
        return modal;
    }

    // 批准单个参与者
    async approveParticipant(activityId, participantId) {
        if (!confirm('确定要批准这个报名申请吗？')) {
            return;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/activities/${activityId}/participants/${participantId}/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${auth.getToken()}`
                },
                body: JSON.stringify({
                    status: 'approved'
                })
            });

            const result = await response.json();

            if (result.success) {
                this.showMessage('已批准报名申请', 'success');
                // 刷新当前模态框
                const modal = document.querySelector('.modal.show');
                if (modal) {
                    const bsModal = bootstrap.Modal.getInstance(modal);
                    if (bsModal) {
                        bsModal.hide();
                    }
                }
                // 重新打开管理参与者界面
                setTimeout(() => {
                    this.manageParticipants(activityId);
                }, 500);
            } else {
                this.showMessage('批准失败: ' + result.message, 'error');
            }
        } catch (error) {
            console.error('批准参与者失败:', error);
            this.showMessage('批准失败: ' + error.message, 'error');
        }
    }

    // 显示拒绝模态框
    showRejectModal(activityId, participantId, username) {
        const modalContent = `
            <form id="rejectForm">
                <div class="mb-3">
                    <label class="form-label">拒绝原因</label>
                    <textarea class="form-control" id="rejectReason" rows="3"
                              placeholder="请输入拒绝原因（可选）"></textarea>
                </div>
            </form>
        `;

        const modal = Components.createModal({
            title: `拒绝 ${username} 的报名申请`,
            content: modalContent,
            size: 'md',
            footer: `
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">取消</button>
                <button type="button" class="btn btn-danger" onclick="activitiesManager.rejectParticipant('${activityId}', '${participantId}')">
                    <i class="fas fa-times"></i> 确认拒绝
                </button>
            `
        });

        // 存储活动ID和参与者ID
        modal.activityId = activityId;
        modal.participantId = participantId;
    }

    // 拒绝单个参与者
    async rejectParticipant(activityId, participantId) {
        const rejectReason = document.getElementById('rejectReason')?.value.trim() || '';

        try {
            const response = await fetch(`${API_BASE_URL}/activities/${activityId}/participants/${participantId}/status`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${auth.getToken()}`
                },
                body: JSON.stringify({
                    status: 'rejected',
                    reason: rejectReason
                })
            });

            const result = await response.json();

            if (result.success) {
                this.showMessage('已拒绝报名申请', 'success');
                // 关闭拒绝模态框
                const rejectModal = document.querySelector('.modal.show');
                if (rejectModal) {
                    const bsModal = bootstrap.Modal.getInstance(rejectModal);
                    if (bsModal) {
                        bsModal.hide();
                    }
                }
                // 刷新管理参与者界面
                const manageModal = document.querySelectorAll('.modal')[0];
                if (manageModal) {
                    const bsModal = bootstrap.Modal.getInstance(manageModal);
                    if (bsModal) {
                        bsModal.hide();
                    }
                }
                setTimeout(() => {
                    this.manageParticipants(activityId);
                }, 500);
            } else {
                this.showMessage('拒绝失败: ' + result.message, 'error');
            }
        } catch (error) {
            console.error('拒绝参与者失败:', error);
            this.showMessage('拒绝失败: ' + error.message, 'error');
        }
    }

    // 批准所有待审核的参与者
    async approveAllParticipants(activityId) {
        const modal = document.querySelector('.modal.show');
        if (!modal || !modal.participants) {
            this.showMessage('获取参与者数据失败', 'error');
            return;
        }

        const pendingParticipants = modal.participants.filter(p => p.status === 'pending');
        if (pendingParticipants.length === 0) {
            this.showMessage('没有待审核的申请', 'info');
            return;
        }

        if (!confirm(`确定要批准所有 ${pendingParticipants.length} 个待审核申请吗？`)) {
            return;
        }

        let successCount = 0;
        let failCount = 0;

        for (const participant of pendingParticipants) {
            try {
                const response = await fetch(`${API_BASE_URL}/activities/${activityId}/participants/${participant.id}/status`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${auth.getToken()}`
                    },
                    body: JSON.stringify({
                        status: 'approved'
                    })
                });

                const result = await response.json();
                if (result.success) {
                    successCount++;
                } else {
                    failCount++;
                    console.error(`批准参与者 ${participant.user?.username} 失败:`, result.message);
                }
            } catch (error) {
                failCount++;
                console.error(`批准参与者 ${participant.user?.username} 出错:`, error);
            }
        }

        if (successCount > 0) {
            this.showMessage(`成功批准 ${successCount} 个申请${failCount > 0 ? `，${failCount} 个失败` : ''}`,
                failCount > 0 ? 'warning' : 'success');
            // 刷新管理参与者界面
            const bsModal = bootstrap.Modal.getInstance(modal);
            if (bsModal) {
                bsModal.hide();
            }
            setTimeout(() => {
                this.manageParticipants(activityId);
            }, 500);
        } else {
            this.showMessage('批量批准失败', 'error');
        }
    }

    // 渲染活动日志
    renderActivityLogs(activityId) {
        // 获取当前活动数据
        const activity = this.activities.find(a => a.id == activityId);
        const activityDetail = activity || {};

        // 模拟日志数据（实际应该从API获取）
        const mockLogs = [
            {
                id: 1,
                action: '创建活动',
                description: '活动已创建',
                user: { username: activityDetail.creator_name || '系统' },
                created_at: activityDetail.created_at || new Date(),
                icon: 'fas fa-plus-circle',
                color: 'success'
            },
            {
                id: 2,
                action: '发布活动',
                description: '活动状态已更新为已发布',
                user: { username: activityDetail.creator_name || '系统' },
                created_at: activityDetail.created_at || new Date(),
                icon: 'fas fa-bullhorn',
                color: 'primary'
            }
        ];

        // 按时间倒序排序
        mockLogs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        if (mockLogs.length === 0) {
            return `
                <div class="text-center py-4 text-muted">
                    <i class="fas fa-history fa-3x mb-3 d-block"></i>
                    暂无活动日志
                </div>
            `;
        }

        return `
            <div class="timeline">
                ${mockLogs.map(log => `
                    <div class="timeline-item">
                        <div class="timeline-marker">
                            <i class="${log.icon} text-${log.color}"></i>
                        </div>
                        <div class="timeline-content">
                            <div class="d-flex justify-content-between align-items-start">
                                <div>
                                    <h6 class="mb-1">${log.action}</h6>
                                    <p class="mb-1 text-muted">${log.description}</p>
                                    <small class="text-muted">
                                        操作人: ${log.user?.username || '系统'} ·
                                        ${new Date(log.created_at).toLocaleString()}
                                    </small>
                                </div>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>

            <style>
                .timeline {
                    position: relative;
                    padding-left: 30px;
                }
                .timeline::before {
                    content: '';
                    position: absolute;
                    left: 10px;
                    top: 0;
                    bottom: 0;
                    width: 2px;
                    background-color: #e9ecef;
                }
                .timeline-item {
                    position: relative;
                    padding-bottom: 20px;
                }
                .timeline-marker {
                    position: absolute;
                    left: -20px;
                    top: 0;
                    width: 20px;
                    height: 20px;
                    border-radius: 50%;
                    background-color: white;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border: 2px solid #e9ecef;
                }
                .timeline-content {
                    background-color: #f8f9fa;
                    padding: 12px 16px;
                    border-radius: 8px;
                    margin-left: 10px;
                }
                .timeline-item:last-child {
                    padding-bottom: 0;
                }
            </style>
        `;
    }

    // 从活动详情页面批准参与者
    async approveParticipantFromDetail(activityId, participantId) {
        try {
            const response = await API.activities.updateParticipantStatus(activityId, participantId, {
                status: 'approved'
            });

            if (response.success) {
                this.showMessage('批准成功', 'success');
                // 刷新活动详情页面
                this.viewActivityInPage(activityId, 'activityDetailContainer');
            } else {
                this.showMessage('批准失败: ' + response.message, 'error');
            }
        } catch (error) {
            console.error('批准参与者失败:', error);
            this.showMessage('批准失败: ' + error.message, 'error');
        }
    }

    // 从活动详情页面拒绝参与者
    async rejectParticipantFromDetail(activityId, participantId, username) {
        // 弹出输入拒绝原因的对话框
        const reason = prompt(`请输入拒绝 ${username} 的申请原因（可选）:`);

        if (reason === null) {
            // 用户点击了取消
            return;
        }

        try {
            const response = await API.activities.updateParticipantStatus(activityId, participantId, {
                status: 'rejected',
                reason: reason || ''
            });

            if (response.success) {
                this.showMessage('拒绝成功', 'success');
                // 刷新活动详情页面
                this.viewActivityInPage(activityId, 'activityDetailContainer');
            } else {
                this.showMessage('拒绝失败: ' + response.message, 'error');
            }
        } catch (error) {
            console.error('拒绝参与者失败:', error);
            this.showMessage('拒绝失败: ' + error.message, 'error');
        }
    }
}

// 创建全局实例
window.activitiesManager = new ActivitiesManager();