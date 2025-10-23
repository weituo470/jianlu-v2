/* 最后修改时间: 2025-01-17 17:45:00 */
/* 上下游影响: 
 * - viewActivity方法完全重新设计了UI结构，从传统卡片布局改为现代化设计
 * - 移除了费用统计相关的API调用和显示逻辑
 * - 新增了approveAllPending方法的调用，需要确保该方法已实现
 * - 参与者状态统计逻辑更加详细，包含已批准、待审核、已拒绝三种状态
 * - 模态框尺寸改为xl，可能影响在小屏幕设备上的显示效果
 * - 移除了自定义CSS样式注入，改为内联样式，提高了组件独立性
 */
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
            console.log('🔄 loadActivities: 调用API前，当前activities数量:', this.activities.length);

            const response = await API.activities.getList(this.currentFilters);
            console.log('📡 API完整响应:', response);
            console.log('📡 响应类型:', typeof response);
            console.log('📡 响应成功标志:', response.success);
            console.log('📡 响应数据:', response.data);

            if (response.success) {
                const newActivities = response.data?.activities || [];
                console.log('📡 从API获取的新活动数量:', newActivities.length);

                // 详细检查新活动
                newActivities.forEach((activity, index) => {
                    console.log(`\n📋 新活动 ${index + 1}:`);
                    console.log('  ID:', activity.id);
                    console.log('  标题:', activity.title);
                    console.log('  team_id:', activity.team_id);
                    console.log('  sequence_number:', activity.sequence_number);
                    console.log('  created_at:', activity.created_at);
                });

                // 更新活动数组
                this.activities = newActivities;
                console.log(`✅ 成功更新activities数组，当前数量: ${this.activities.length}`);
                console.log('🔄 loadActivities: 数据更新完成');

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
        console.log('🎨 renderActivitiesList: 开始渲染活动列表，活动数量:', this.activities.length);
        const container = document.getElementById('activities-container');
        if (!container) {
            console.error('🎨 renderActivitiesList: 找不到容器元素 #activities-container');
            return;
        }

        if (this.activities.length === 0) {
            console.log('🎨 renderActivitiesList: 没有活动数据，显示空状态');
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

        console.log('🎨 renderActivitiesList: 开始生成活动卡片HTML');
        const activitiesHtml = this.activities.map(activity => this.createActivityCard(activity)).join('');
        console.log('🎨 renderActivitiesList: 活动卡片HTML生成完成，长度:', activitiesHtml.length);

        const finalHtml = `<div class="row">${activitiesHtml}</div>`;
        console.log('🎨 renderActivitiesList: 设置容器HTML');
        container.innerHTML = finalHtml;
        console.log('🎨 renderActivitiesList: 活动列表渲染完成');
    }

    // 创建活动卡片
    // TODO: 函数较长(100+行)，考虑拆分为多个小函数提高可读性
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
                                    ${activity.current_participants > 0 ? '<span class="text-warning ms-1" title="有报名申请需要处理"><i class="fas fa-exclamation-circle"></i></span>' : ''}
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
                            <div class="btn-group btn-group-sm">
                                <button class="btn btn-primary" onclick="activitiesManager.manageParticipants('${activity.id}')" title="管理活动参与者，审核报名申请">
                                    <i class="fas fa-users"></i> 管理参与者
                                    ${activity.current_participants > 0 ? `<span class="badge bg-warning text-dark ms-1">${activity.current_participants}</span>` : ''}
                                </button>
                                ${activity.current_participants > 0 ? `
                                <button class="btn btn-success" onclick="activitiesManager.quickApproveAll('${activity.id}')" title="快速批准所有待审核申请">
                                    <i class="fas fa-check-double"></i>
                                </button>
                                ` : ''}
                            </div>
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
            console.log('🔄 refreshList: 开始重新加载活动数据...');
            await this.loadActivities();
            console.log('🔄 refreshList: 活动数据加载完成，数量:', this.activities.length);
            this.renderActivitiesList();
            console.log('🔄 refreshList: 活动列表渲染完成');
            this.showMessage('活动列表已刷新', 'success');
        } catch (error) {
            console.error('🔄 refreshList: 刷新失败:', error);
            this.showMessage('刷新失败: ' + error.message, 'error');
        }
    }

    // 强制刷新方法（用于调试）
    async forceRefresh() {
        console.log('🔧 forceRefresh: 强制刷新开始');
        console.log('🔧 forceRefresh: 刷新前活动数量:', this.activities.length);

        try {
            // 清空当前数据
            this.activities = [];
            console.log('🔧 forceRefresh: 已清空活动数组');

            // 强制重新加载
            await this.loadActivities();
            console.log('🔧 forceRefresh: 强制加载完成，新活动数量:', this.activities.length);

            // 强制重新渲染
            this.renderActivitiesList();
            console.log('🔧 forceRefresh: 强制渲染完成');

            this.showMessage('强制刷新完成', 'success');
        } catch (error) {
            console.error('🔧 forceRefresh: 强制刷新失败:', error);
            this.showMessage('强制刷新失败: ' + error.message, 'error');
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
            // 直接使用活动创建模态框
            await this.showCreateActivityModal();
        } catch (error) {
            console.error('显示创建活动模态框失败:', error);
            this.showMessage('打开创建窗口失败: ' + error.message, 'error');
        }
    }

    // 创建活动模态框
    // TODO: 函数较长(200+行)，考虑拆分为多个小函数提高可读性
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
                                <option value="unset">未设置</option>
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
                                <option value="none">非团队活动</option>
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
            </form>
        `;

        // 创建模态框
        const modal = Components.createModal({
            title: '创建活动',
            content: modalContent,
            footer: `
                <button type="button" class="btn btn-secondary" onclick="Components.closeModal()">取消</button>
                <button type="button" class="btn btn-primary" onclick="activitiesManager.submitCreateActivity()">
                    <i class="fas fa-plus"></i>
                    创建活动
                </button>
            `
        });

        this.currentModal = modal;

        // 等待模态框显示完成后再设置表单值
        setTimeout(() => {
            // 设置默认时间（当前时间+1小时 到 当前时间+2小时）
            const now = new Date();
            const startTime = new Date(now.getTime() + 60 * 60 * 1000); // +1小时
            const endTime = new Date(now.getTime() + 2 * 60 * 60 * 1000); // +2小时

            const startTimeInput = document.getElementById('activityStartTime');
            const endTimeInput = document.getElementById('activityEndTime');

            if (startTimeInput) startTimeInput.value = this.formatDateTimeLocal(startTime);
            if (endTimeInput) endTimeInput.value = this.formatDateTimeLocal(endTime);

            // 添加实时字段验证
            this.setupFormValidation();
        }, 100);
    }

    // 设置表单实时验证
    setupFormValidation() {
        const form = document.getElementById('createActivityForm');
        if (!form) return;

        // 标题验证
        const titleInput = document.getElementById('activityTitle');
        if (titleInput) {
            titleInput.addEventListener('input', (e) => {
                const value = e.target.value.trim();
                this.clearFieldError('activityTitle');

                if (value.length > 0 && value.length < 2) {
                    this.showFieldError('activityTitle', '活动标题至少需要2个字符');
                } else if (value.length > 200) {
                    this.showFieldError('activityTitle', '活动标题不能超过200个字符');
                }
            });

            titleInput.addEventListener('blur', (e) => {
                const value = e.target.value.trim();
                if (value === '') {
                    this.showFieldError('activityTitle', '活动标题不能为空');
                }
            });
        }

        
        // 描述长度验证
        const descriptionTextarea = document.getElementById('activityDescription');
        if (descriptionTextarea) {
            descriptionTextarea.addEventListener('input', (e) => {
                const value = e.target.value;
                this.clearFieldError('activityDescription');

                if (value.length > 1000) {
                    this.showFieldError('activityDescription', `活动描述不能超过1000个字符（当前：${value.length}）`);
                }
            });
        }

        // 地点长度验证
        const locationInput = document.getElementById('activityLocation');
        if (locationInput) {
            locationInput.addEventListener('input', (e) => {
                const value = e.target.value;
                this.clearFieldError('activityLocation');

                if (value.length > 255) {
                    this.showFieldError('activityLocation', `活动地点不能超过255个字符（当前：${value.length}）`);
                }
            });
        }

        // 时间验证
        const startTimeInput = document.getElementById('activityStartTime');
        const endTimeInput = document.getElementById('activityEndTime');

        if (startTimeInput && endTimeInput) {
            const validateTimes = () => {
                const startTime = startTimeInput.value;
                const endTime = endTimeInput.value;

                this.clearFieldError('activityStartTime');
                this.clearFieldError('activityEndTime');

                if (startTime && endTime) {
                    const startDate = new Date(startTime);
                    const endDate = new Date(endTime);

                    if (endDate <= startDate) {
                        this.showFieldError('activityEndTime', '结束时间必须晚于开始时间');
                    }
                }
            };

            startTimeInput.addEventListener('change', validateTimes);
            endTimeInput.addEventListener('change', validateTimes);
        }

        // 人数验证
        const minParticipantsInput = document.getElementById('activityMinParticipants');
        const maxParticipantsInput = document.getElementById('activityMaxParticipants');

        if (minParticipantsInput && maxParticipantsInput) {
            const validateParticipants = () => {
                const min = parseInt(minParticipantsInput.value) || 0;
                const max = parseInt(maxParticipantsInput.value) || 0;

                this.clearFieldError('activityMinParticipants');
                this.clearFieldError('activityMaxParticipants');

                if (min < 1) {
                    this.showFieldError('activityMinParticipants', '最小参与人数至少为1人');
                }
                if (max < 1) {
                    this.showFieldError('activityMaxParticipants', '最大参与人数至少为1人');
                }
                if (min > 0 && max > 0 && min > max) {
                    this.showFieldError('activityMinParticipants', '最小参与人数不能大于最大参与人数');
                }
            };

            minParticipantsInput.addEventListener('input', validateParticipants);
            maxParticipantsInput.addEventListener('input', validateParticipants);
        }
    }

    // 显示字段错误
    showFieldError(fieldId, message) {
        const field = document.getElementById(fieldId);
        if (!field) return;

        field.classList.add('is-invalid');

        // 移除旧的错误消息
        const existingFeedback = field.parentNode.querySelector('.invalid-feedback');
        if (existingFeedback) {
            existingFeedback.remove();
        }

        // 添加新的错误消息
        const feedback = document.createElement('div');
        feedback.className = 'invalid-feedback';
        feedback.textContent = message;
        field.parentNode.appendChild(feedback);
    }

    // 清除字段错误
    clearFieldError(fieldId) {
        const field = document.getElementById(fieldId);
        if (!field) return;

        field.classList.remove('is-invalid');

        // 移除错误消息
        const feedback = field.parentNode.querySelector('.invalid-feedback');
        if (feedback) {
            feedback.remove();
        }
    }

    // 查看活动详情 - 全新设计
    // TODO: 函数较长(220+行)，考虑拆分为多个小函数提高可读性
    // 建议拆分：renderActivityHeader, renderActivityInfo, renderParticipantsList, renderQuickActions
    async viewActivity(activityId) {
        // 导航到活动详情页面
        window.location.href = `/activity-detail-page.html?id=${activityId}`;
        return;

        const activity = this.activities.find(a => a.id === activityId);
        if (!activity) {
            this.showMessage('活动不存在', 'error');
            return;
        }

        try {
            console.log('🔍 开始获取活动详情数据...', activityId);

            // 获取活动详细信息和参与者信息
            const [detailResponse, participantsResponse] = await Promise.all([
                API.activities.getDetail(activityId),
                API.activities.getParticipants(activityId).catch(() => ({ success: false, data: { participants: [] } }))
            ]);

            if (!detailResponse.success) {
                this.showMessage('获取活动详情失败', 'error');
                return;
            }

            const activityDetail = detailResponse.data;
            const participants = participantsResponse.success ? participantsResponse.data.participants : [];
            const pendingParticipants = participants.filter(p => p.status === 'pending');
            const approvedParticipants = participants.filter(p => p.status === 'approved');
            const rejectedParticipants = participants.filter(p => p.status === 'rejected');

            console.log('📊 活动数据:', { activityDetail, participants: participants.length, pending: pendingParticipants.length });

            // 全新的活动详情页面设计
            const modalContent = `
                <div class="activity-detail-container">
                    <!-- 活动头部信息 -->
                    <div class="activity-header" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 12px; margin-bottom: 30px;">
                        <div style="display: flex; justify-content: between; align-items: start;">
                            <div style="flex: 1;">
                                <h2 style="margin: 0 0 10px 0; font-size: 28px; font-weight: 700;">${activityDetail.title}</h2>
                                <div style="display: flex; gap: 20px; margin-bottom: 15px;">
                                    <span style="background: rgba(255,255,255,0.2); padding: 4px 12px; border-radius: 20px; font-size: 14px;">
                                        <i class="fas fa-tag"></i> ${this.getActivityTypeLabel(activityDetail.type)}
                                    </span>
                                    <span style="background: rgba(255,255,255,0.2); padding: 4px 12px; border-radius: 20px; font-size: 14px;">
                                        <i class="fas fa-users"></i> ${activityDetail.team?.name || '未指定团队'}
                                    </span>
                                </div>
                                <div style="display: flex; gap: 30px; font-size: 14px; opacity: 0.9;">
                                    <div><i class="fas fa-clock"></i> ${activityDetail.start_time ? new Date(activityDetail.start_time).toLocaleString() : '未设置时间'}</div>
                                    <div><i class="fas fa-map-marker-alt"></i> ${activityDetail.location || '未设置地点'}</div>
                                </div>
                            </div>
                            <div style="text-align: center; min-width: 120px;">
                                <div style="background: rgba(255,255,255,0.2); padding: 15px; border-radius: 12px;">
                                    <div style="font-size: 24px; font-weight: 700; margin-bottom: 5px;">${participants.length}</div>
                                    <div style="font-size: 12px; opacity: 0.8;">总参与人数</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- 主要内容区域 -->
                    <div style="display: flex; gap: 30px;">
                        <!-- 左侧：活动信息 -->
                        <div style="flex: 2;">
                            <!-- 活动描述 -->
                            ${activityDetail.description ? `
                                <div style="background: white; padding: 25px; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); margin-bottom: 25px;">
                                    <h5 style="margin: 0 0 15px 0; color: #333; font-weight: 600;">
                                        <i class="fas fa-align-left" style="color: #667eea; margin-right: 8px;"></i>
                                        活动描述
                                    </h5>
                                    <p style="margin: 0; line-height: 1.6; color: #666;">${activityDetail.description}</p>
                                </div>
                            ` : ''}

                            <!-- 活动详细信息 -->
                            <div style="background: white; padding: 25px; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                                <h5 style="margin: 0 0 20px 0; color: #333; font-weight: 600;">
                                    <i class="fas fa-info-circle" style="color: #667eea; margin-right: 8px;"></i>
                                    详细信息
                                </h5>
                                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                                    <div class="info-item">
                                        <div style="color: #999; font-size: 12px; margin-bottom: 5px;">开始时间</div>
                                        <div style="color: #333; font-weight: 500;">${activityDetail.start_time ? new Date(activityDetail.start_time).toLocaleString() : '未设置'}</div>
                                    </div>
                                    <div class="info-item">
                                        <div style="color: #999; font-size: 12px; margin-bottom: 5px;">结束时间</div>
                                        <div style="color: #333; font-weight: 500;">${activityDetail.end_time ? new Date(activityDetail.end_time).toLocaleString() : '未设置'}</div>
                                    </div>
                                    <div class="info-item">
                                        <div style="color: #999; font-size: 12px; margin-bottom: 5px;">活动地点</div>
                                        <div style="color: #333; font-weight: 500;">${activityDetail.location || '未设置'}</div>
                                    </div>
                                    <div class="info-item">
                                        <div style="color: #999; font-size: 12px; margin-bottom: 5px;">人数限制</div>
                                        <div style="color: #333; font-weight: 500;">${activityDetail.max_participants ? activityDetail.max_participants + ' 人' : '不限制'}</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- 右侧：申请管理和操作 -->
                        <div style="flex: 1; min-width: 320px;">
                            <!-- 收到申请 -->
                            <div style="background: white; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); margin-bottom: 25px;">
                                <div style="padding: 20px 25px; border-bottom: 1px solid #f0f0f0; display: flex; justify-content: between; align-items: center;">
                                    <h6 style="margin: 0; color: #333; font-weight: 600;">
                                        <i class="fas fa-user-clock" style="color: #ffc107; margin-right: 8px;"></i>
                                        收到申请
                                    </h6>
                                    <span style="background: #ffc107; color: #333; padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: 600;">
                                        ${pendingParticipants.length}
                                    </span>
                                </div>
                                <div style="padding: 20px 25px; max-height: 400px; overflow-y: auto;">
                                    ${pendingParticipants.length === 0 ? `
                                        <div style="text-align: center; padding: 30px 0; color: #999;">
                                            <i class="fas fa-inbox" style="font-size: 32px; margin-bottom: 15px; display: block; opacity: 0.5;"></i>
                                            <div style="font-size: 14px;">暂无待审核申请</div>
                                        </div>
                                    ` : `
                                        ${pendingParticipants.map(p => `
                                            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 15px; border-left: 4px solid #ffc107;">
                                                <div style="display: flex; align-items: center; margin-bottom: 12px;">
                                                    <div style="width: 36px; height: 36px; background: #667eea; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 12px;">
                                                        <i class="fas fa-user" style="color: white; font-size: 14px;"></i>
                                                    </div>
                                                    <div style="flex: 1;">
                                                        <div style="font-weight: 600; color: #333; font-size: 14px;">${p.user?.username || '未知用户'}</div>
                                                        <div style="color: #666; font-size: 12px;">${p.user?.email || ''}</div>
                                                    </div>
                                                </div>
                                                <div style="color: #999; font-size: 11px; margin-bottom: 12px;">
                                                    <i class="fas fa-clock"></i> ${new Date(p.registered_at).toLocaleString()}
                                                </div>
                                                <div style="display: flex; gap: 8px;">
                                                    <button onclick="activitiesManager.quickApproveParticipant('${activityId}', '${p.id}', '${p.user?.username || '未知用户'}')" 
                                                            style="flex: 1; background: #28a745; color: white; border: none; padding: 8px 12px; border-radius: 6px; font-size: 12px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 4px;">
                                                        <i class="fas fa-check"></i> 同意
                                                    </button>
                                                    <button onclick="activitiesManager.quickRejectParticipant('${activityId}', '${p.id}', '${p.user?.username || '未知用户'}')" 
                                                            style="flex: 1; background: #dc3545; color: white; border: none; padding: 8px 12px; border-radius: 6px; font-size: 12px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 4px;">
                                                        <i class="fas fa-times"></i> 拒绝
                                                    </button>
                                                </div>
                                            </div>
                                        `).join('')}
                                    `}
                                </div>
                            </div>

                            <!-- 参与者统计 -->
                            <div style="background: white; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); margin-bottom: 25px; padding: 25px;">
                                <h6 style="margin: 0 0 15px 0; color: #333; font-weight: 600;">
                                    <i class="fas fa-chart-pie" style="color: #667eea; margin-right: 8px;"></i>
                                    参与者统计
                                </h6>
                                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                                    <div style="text-align: center; padding: 15px; background: #e8f5e8; border-radius: 8px;">
                                        <div style="font-size: 20px; font-weight: 700; color: #28a745; margin-bottom: 5px;">${approvedParticipants.length}</div>
                                        <div style="font-size: 12px; color: #666;">已批准</div>
                                    </div>
                                    <div style="text-align: center; padding: 15px; background: #fff3cd; border-radius: 8px;">
                                        <div style="font-size: 20px; font-weight: 700; color: #ffc107; margin-bottom: 5px;">${pendingParticipants.length}</div>
                                        <div style="font-size: 12px; color: #666;">待审核</div>
                                    </div>
                                </div>
                                ${rejectedParticipants.length > 0 ? `
                                    <div style="text-align: center; padding: 15px; background: #f8d7da; border-radius: 8px; margin-top: 15px;">
                                        <div style="font-size: 20px; font-weight: 700; color: #dc3545; margin-bottom: 5px;">${rejectedParticipants.length}</div>
                                        <div style="font-size: 12px; color: #666;">已拒绝</div>
                                    </div>
                                ` : ''}
                            </div>

                            <!-- 快速操作 -->
                            <div style="background: white; border-radius: 12px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); padding: 25px;">
                                <h6 style="margin: 0 0 15px 0; color: #333; font-weight: 600;">
                                    <i class="fas fa-tools" style="color: #667eea; margin-right: 8px;"></i>
                                    快速操作
                                </h6>
                                <div style="display: flex; flex-direction: column; gap: 10px;">
                                    ${pendingParticipants.length > 0 ? `
                                        <button onclick="activitiesManager.approveAllPending('${activityId}')" 
                                                style="width: 100%; background: #28a745; color: white; border: none; padding: 12px; border-radius: 8px; font-size: 14px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;">
                                            <i class="fas fa-check-double"></i> 批准所有申请
                                        </button>
                                    ` : ''}
                                    <button onclick="activitiesManager.manageParticipants('${activityId}')" 
                                            style="width: 100%; background: #007bff; color: white; border: none; padding: 12px; border-radius: 8px; font-size: 14px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;">
                                        <i class="fas fa-users"></i> 管理所有参与者
                                    </button>
                                    <button onclick="activitiesManager.editActivity('${activityId}')" 
                                            style="width: 100%; background: #6c757d; color: white; border: none; padding: 12px; border-radius: 8px; font-size: 14px; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;">
                                        <i class="fas fa-edit"></i> 编辑活动
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            // 创建模态框
            const modal = Components.createModal({
                title: `活动详情 - ${activityDetail.title}`,
                content: modalContent,
                size: 'xl',
                footer: `
                    <button type="button" class="btn btn-secondary" onclick="document.querySelector('.modal-close').click()">关闭</button>
                `
            });

        } catch (error) {
            console.error('💥 查看活动详情失败:', error);
            this.showMessage('查看活动详情失败: ' + error.message, 'error');
        }
    }

    // 在页面中查看活动详情（非弹窗模式）
    // TODO: 函数过长(370+行)，需要拆分为多个小函数提高可读性和可维护性
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
                                        <button class="btn btn-info btn-sm" onclick="document.getElementById('participants-tab').click(); document.getElementById('participants').scrollIntoView({ behavior: 'smooth' })">
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
                                                                        ${Utils.avatar.createAvatarHtml(
                                                                                Utils.avatar.getUserAvatar(p.user),
                                                                                "头像",
                                                                                32,
                                                                                "",
                                                                                "user"
                                                                            )}
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

    // 快速批准所有待审核申请
    async quickApproveAll(activityId) {
        const activity = this.activities.find(a => a.id === activityId);
        if (!activity) {
            this.showMessage('活动不存在', 'error');
            return;
        }

        if (!confirm(`确定要批准活动"${activity.title}"的所有待审核申请吗？`)) {
            return;
        }

        try {
            console.log('🚀 开始快速批准所有申请...', { activityId, activity: activity.title });
            
            // 获取参与者列表
            const response = await API.activities.getParticipants(activityId);
            console.log('📡 获取参与者响应:', response);

            if (!response.success) {
                console.error('❌ 获取参与者列表失败:', response.message);
                this.showMessage('获取参与者列表失败: ' + (response.message || '未知错误'), 'error');
                return;
            }

            const participants = response.data.participants || [];
            const pendingParticipants = participants.filter(p => p.status === 'pending');
            
            console.log(`📋 找到 ${pendingParticipants.length} 个待审核申请`);

            if (pendingParticipants.length === 0) {
                this.showMessage('没有待审核的申请', 'info');
                return;
            }

            // 批量批准
            let successCount = 0;
            let failCount = 0;

            for (const participant of pendingParticipants) {
                try {
                    console.log(`⏳ 正在批准 ${participant.user?.username || '未知用户'}...`);
                    
                    const approveResponse = await API.activities.updateParticipantStatus(activityId, participant.id, {
                        status: 'approved'
                    });

                    if (approveResponse.success) {
                        successCount++;
                        console.log(`✅ 批准成功: ${participant.user?.username}`);
                    } else {
                        failCount++;
                        console.error(`❌ 批准失败: ${participant.user?.username}`, approveResponse.message);
                    }
                } catch (error) {
                    failCount++;
                    console.error(`💥 批准出错: ${participant.user?.username}`, error);
                }
            }

            // 显示结果
            if (successCount > 0) {
                this.showMessage(`成功批准 ${successCount} 个申请${failCount > 0 ? `，失败 ${failCount} 个` : ''}`, 'success');
                // 刷新活动列表
                await this.refreshList();
            } else {
                this.showMessage(`批准失败，请检查网络连接或权限`, 'error');
            }

        } catch (error) {
            console.error('💥 快速批准失败:', error);
            this.showMessage('快速批准失败: ' + error.message, 'error');
        }
    }

    // 快速批准参与者（从活动详情页面）
    async quickApproveParticipant(activityId, participantId, username) {
        if (!confirm(`确定要批准 ${username} 的报名申请吗？`)) {
            return;
        }

        try {
            console.log('🚀 快速批准参与者...', { activityId, participantId, username });
            
            const response = await API.activities.updateParticipantStatus(activityId, participantId, {
                status: 'approved'
            });

            if (response.success) {
                this.showMessage(`已批准 ${username} 的申请`, 'success');
                // 刷新活动详情页面
                setTimeout(() => {
                    this.viewActivity(activityId);
                }, 1000);
            } else {
                this.showMessage('批准失败: ' + response.message, 'error');
            }
        } catch (error) {
            console.error('💥 快速批准失败:', error);
            this.showMessage('批准失败: ' + error.message, 'error');
        }
    }

    // 快速拒绝参与者（从活动详情页面）
    async quickRejectParticipant(activityId, participantId, username) {
        const reason = prompt(`请输入拒绝 ${username} 申请的原因（可选）:`);
        
        // 用户点击取消
        if (reason === null) {
            return;
        }

        try {
            console.log('🚀 快速拒绝参与者...', { activityId, participantId, username, reason });
            
            const response = await API.activities.updateParticipantStatus(activityId, participantId, {
                status: 'rejected',
                reason: reason || ''
            });

            if (response.success) {
                this.showMessage(`已拒绝 ${username} 的申请`, 'success');
                // 刷新活动详情页面
                setTimeout(() => {
                    this.viewActivity(activityId);
                }, 1000);
            } else {
                this.showMessage('拒绝失败: ' + response.message, 'error');
            }
        } catch (error) {
            console.error('💥 快速拒绝失败:', error);
            this.showMessage('拒绝失败: ' + error.message, 'error');
        }
    }

    // 批准所有待审核申请
    async approveAllPending(activityId) {
        if (!confirm('确定要批准所有待审核申请吗？')) {
            return;
        }

        try {
            console.log('🚀 开始批准所有待审核申请...', activityId);
            
            // 获取参与者列表
            const response = await API.activities.getParticipants(activityId);
            if (!response.success) {
                this.showMessage('获取参与者列表失败', 'error');
                return;
            }

            const participants = response.data.participants || [];
            const pendingParticipants = participants.filter(p => p.status === 'pending');
            
            if (pendingParticipants.length === 0) {
                this.showMessage('没有待审核的申请', 'info');
                return;
            }

            let successCount = 0;
            let failCount = 0;

            // 批量批准
            for (const participant of pendingParticipants) {
                try {
                    const approveResponse = await API.activities.updateParticipantStatus(activityId, participant.id, {
                        status: 'approved'
                    });

                    if (approveResponse.success) {
                        successCount++;
                        console.log(`✅ 批准成功: ${participant.user?.username}`);
                    } else {
                        failCount++;
                        console.error(`❌ 批准失败: ${participant.user?.username}`, approveResponse.message);
                    }
                } catch (error) {
                    failCount++;
                    console.error(`💥 批准出错: ${participant.user?.username}`, error);
                }
            }

            // 显示结果
            if (successCount > 0) {
                this.showMessage(`成功批准 ${successCount} 个申请${failCount > 0 ? `，失败 ${failCount} 个` : ''}`, 'success');
                // 刷新活动详情页面
                setTimeout(() => {
                    this.viewActivity(activityId);
                }, 1500);
            } else {
                this.showMessage('批准失败，请检查网络连接或权限', 'error');
            }

        } catch (error) {
            console.error('💥 批准所有申请失败:', error);
            this.showMessage('批准失败: ' + error.message, 'error');
        }
    }

    // 管理参与者
    // TODO: 函数较长(150+行)，考虑拆分为多个小函数提高可读性
    async manageParticipants(activityId) {
        const activity = this.activities.find(a => a.id === activityId);
        if (!activity) {
            this.showMessage('活动不存在', 'error');
            return;
        }

        try {
            console.log('🔍 开始获取活动参与者列表...', { activityId, activity });
            
            // 获取参与者列表
            const response = await API.activities.getParticipants(activityId);
            console.log('📡 API响应:', response);

            if (!response.success) {
                console.error('❌ 获取参与者列表失败:', response.message);
                this.showMessage('获取参与者列表失败: ' + (response.message || '未知错误'), 'error');
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
                    <div style="display: flex; gap: 20px; margin-bottom: 30px;">
                        <div style="flex: 1; background: #007bff; color: white; padding: 20px; border-radius: 8px; text-align: center;">
                            <h3 style="margin: 0; font-size: 24px;">${participants.length}</h3>
                            <p style="margin: 5px 0 0 0;">总报名</p>
                        </div>
                        <div style="flex: 1; background: #ffc107; color: white; padding: 20px; border-radius: 8px; text-align: center;">
                            <h3 style="margin: 0; font-size: 24px;">${pendingParticipants.length}</h3>
                            <p style="margin: 5px 0 0 0;">待审核</p>
                        </div>
                        <div style="flex: 1; background: #28a745; color: white; padding: 20px; border-radius: 8px; text-align: center;">
                            <h3 style="margin: 0; font-size: 24px;">${approvedParticipants.length}</h3>
                            <p style="margin: 5px 0 0 0;">已批准</p>
                        </div>
                        <div style="flex: 1; background: #dc3545; color: white; padding: 20px; border-radius: 8px; text-align: center;">
                            <h3 style="margin: 0; font-size: 24px;">${rejectedParticipants.length}</h3>
                            <p style="margin: 5px 0 0 0;">已拒绝</p>
                        </div>
                    </div>

                    <!-- 参与者列表 -->
                    ${participants.length === 0 ? `
                        <div style="text-align: center; padding: 40px; color: #6c757d;">
                            <i class="fas fa-users fa-3x" style="margin-bottom: 20px; display: block;"></i>
                            <h4>暂无参与者</h4>
                            <p>还没有用户报名参加这个活动</p>
                        </div>
                    ` : `
                        <div style="overflow-x: auto;">
                            <table style="width: 100%; border-collapse: collapse; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                                <thead>
                                    <tr style="background: #f8f9fa;">
                                        <th style="padding: 15px; text-align: left; font-weight: 600; color: #495057; border-bottom: 2px solid #e9ecef;">用户</th>
                                        <th style="padding: 15px; text-align: left; font-weight: 600; color: #495057; border-bottom: 2px solid #e9ecef;">邮箱</th>
                                        <th style="padding: 15px; text-align: left; font-weight: 600; color: #495057; border-bottom: 2px solid #e9ecef;">状态</th>
                                        <th style="padding: 15px; text-align: left; font-weight: 600; color: #495057; border-bottom: 2px solid #e9ecef;">申请时间</th>
                                        <th style="padding: 15px; text-align: left; font-weight: 600; color: #495057; border-bottom: 2px solid #e9ecef;">操作</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${participants.map((p, index) => `
                                        <tr style="border-bottom: 1px solid #e9ecef; ${index % 2 === 0 ? 'background: #f8f9fa;' : ''}">
                                            <td style="padding: 15px;">
                                                <div style="display: flex; align-items: center;">
                                                    <div style="width: 40px; height: 40px; border-radius: 50%; background: #e9ecef; display: flex; align-items: center; justify-content: center; margin-right: 12px; color: #6c757d;">
                                                        <i class="fas fa-user"></i>
                                                    </div>
                                                    <div>
                                                        <div style="font-weight: 600; color: #495057;">${p.user?.username || '未知用户'}</div>
                                                        <small style="color: #6c757d;">${p.user?.profile?.name || ''}</small>
                                                    </div>
                                                </div>
                                            </td>
                                            <td style="padding: 15px; color: #495057;">${p.user?.email || '-'}</td>
                                            <td style="padding: 15px;">
                                                <span style="padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 500; 
                                                    ${p.status === 'pending' ? 'background: #fff3cd; color: #856404; border: 1px solid #ffeaa7;' : 
                                                      p.status === 'approved' ? 'background: #d4edda; color: #155724; border: 1px solid #c3e6cb;' : 
                                                      'background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb;'}">
                                                    ${p.status === 'pending' ? '待审核' : p.status === 'approved' ? '已批准' : '已拒绝'}
                                                </span>
                                            </td>
                                            <td style="padding: 15px; color: #6c757d; font-size: 14px;">${new Date(p.registered_at).toLocaleString()}</td>
                                            <td style="padding: 15px;">
                                                ${p.status === 'pending' ? `
                                                    <div style="display: flex; gap: 8px;">
                                                        <button onclick="activitiesManager.approveParticipant('${activityId}', '${p.id}')" 
                                                                style="padding: 6px 12px; background: #28a745; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; display: flex; align-items: center; gap: 4px;">
                                                            <i class="fas fa-check"></i> 批准
                                                        </button>
                                                        <button onclick="activitiesManager.showRejectModal('${activityId}', '${p.id}', '${p.user?.username || '未知用户'}')" 
                                                                style="padding: 6px 12px; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; display: flex; align-items: center; gap: 4px;">
                                                            <i class="fas fa-times"></i> 拒绝
                                                        </button>
                                                    </div>
                                                ` : p.status === 'approved' ? `
                                                    <span style="color: #28a745; font-size: 12px;">
                                                        <i class="fas fa-check-circle"></i> 已批准
                                                    </span>
                                                ` : `
                                                    <span style="color: #dc3545; font-size: 12px;">
                                                        <i class="fas fa-times-circle"></i> 已拒绝
                                                        ${p.rejection_reason ? `<br><small style="color: #6c757d;">${p.rejection_reason}</small>` : ''}
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
        // TODO: 将硬编码替换为从API获取的数据
        const typeMapTemp = {
            'meeting': '会议',
            'event': '活动',
            'training': '培训',
            'other': '其他'
        };
        return typeMapTemp[type] || type;
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

    // 显示详细错误信息
    showDetailedErrorMessage(message, status = 500) {
        // 处理前端验证错误（包含换行符和项目符号）
        let userMessage = message;
        let suggestions = [];

        // 如果是前端验证错误，格式化为列表显示
        if (message.includes('请填写以下必填字段：') || message.includes('请修正以下问题：')) {
            // 解析列表项
            const lines = message.split('\n');
            const items = lines.filter(line => line.startsWith('• ')).map(line => line.substring(2));
            const title = lines[0];

            let fullMessage = `<strong>${title}</strong><br><br>`;
            if (items.length > 0) {
                fullMessage += `<div class="error-list">`;
                fullMessage += `<ul class="mb-0">`;
                items.forEach(item => {
                    fullMessage += `<li>${item}</li>`;
                });
                fullMessage += `</ul>`;
                fullMessage += `</div>`;
            }

            // 添加通用建议
            fullMessage += `<div class="error-suggestions mt-3">`;
            fullMessage += `<strong>请检查相关字段并重新提交</strong>`;
            fullMessage += `</div>`;

            this.showMessage(fullMessage, 'error', 8000);
            return;
        }

        // 解析错误信息，提供更友好的提示
        if (status === 400) {
            // 客户端错误 - 通常是数据验证问题
            if (message.includes('活动标题')) {
                suggestions.push('请检查活动标题是否符合要求（2-200个字符）');
            }
            if (message.includes('活动类型')) {
                suggestions.push('请选择活动类型');
            }
            if (message.includes('团队不存在') || message.includes('所属团队')) {
                suggestions.push('请选择有效的团队，或联系管理员创建团队');
            }
            if (message.includes('最大参与人数') || message.includes('最小参与人数')) {
                suggestions.push('请检查人数设置是否合理（最少1人）');
            }
            if (message.includes('开始时间') || message.includes('结束时间')) {
                suggestions.push('请检查时间设置是否正确，结束时间必须晚于开始时间');
            }
            if (message.includes('活动地点')) {
                suggestions.push('请检查活动地点是否过长（最多255个字符）');
            }
            if (message.includes('审批设置')) {
                suggestions.push('请检查审批设置是否正确');
            }
        } else if (status === 401) {
            // 身份验证错误
            userMessage = '身份验证失败';
            suggestions.push('请重新登录后再试');
            suggestions.push('如果问题持续存在，请联系管理员');
        } else if (status === 403) {
            // 权限错误
            userMessage = '权限不足';
            suggestions.push('您没有创建活动的权限');
            suggestions.push('请联系管理员申请相关权限');
        } else if (status === 409) {
            // 冲突错误
            userMessage = '数据冲突';
            suggestions.push('请稍后重试');
            suggestions.push('如果问题持续存在，请联系管理员');
        } else if (status === 503) {
            // 服务不可用
            userMessage = '数据库连接失败';
            suggestions.push('请稍后重试');
            suggestions.push('如果问题持续存在，请联系技术支持');
        } else {
            // 其他错误
            suggestions.push('请检查输入数据是否正确');
            suggestions.push('如果问题持续存在，请联系管理员');
        }

        // 构建完整的错误消息
        let fullMessage = `<strong>创建活动失败</strong><br><br>`;
        fullMessage += `<div class="error-details">`;
        fullMessage += `<div class="error-message">${userMessage}</div>`;

        if (suggestions.length > 0) {
            fullMessage += `<div class="error-suggestions mt-2">`;
            fullMessage += `<strong>建议解决方案：</strong><br>`;
            fullMessage += `<ul class="mb-0">`;
            suggestions.forEach(suggestion => {
                fullMessage += `<li>${suggestion}</li>`;
            });
            fullMessage += `</ul>`;
            fullMessage += `</div>`;
        }

        fullMessage += `</div>`;

        // 显示详细的错误消息
        this.showMessage(fullMessage, 'error', 10000); // 显示10秒
    }

    // 显示消息
    showMessage(message, type = 'info', duration = 5000) {
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
            require_approval: formData.get('need_approval') === 'true',
            activity_status: 'published'
        };

        // 验证必填字段
        const missingFields = [];

        if (!activityData.title || activityData.title.trim() === '') {
            missingFields.push('活动标题');
        }

        // 如果有必填字段缺失，显示详细错误
        if (missingFields.length > 0) {
            const errorMessage = `请填写以下必填字段：\n• ${missingFields.join('\n• ')}`;
            this.showDetailedErrorMessage(errorMessage, 400);
            return;
        }

        // 验证字段格式和逻辑
        const validationErrors = [];

        // 验证标题长度
        if (activityData.title.length < 2) {
            validationErrors.push('活动标题至少需要2个字符');
        }
        if (activityData.title.length > 200) {
            validationErrors.push('活动标题不能超过200个字符');
        }

        // 验证描述长度
        if (activityData.description && activityData.description.length > 1000) {
            validationErrors.push('活动描述不能超过1000个字符');
        }

        // 验证地点长度
        if (activityData.location && activityData.location.length > 255) {
            validationErrors.push('活动地点不能超过255个字符');
        }

        // 验证时间（如果都有值的话）
        if (activityData.start_time && activityData.end_time) {
            const startTime = new Date(activityData.start_time);
            const endTime = new Date(activityData.end_time);
            if (endTime <= startTime) {
                validationErrors.push('结束时间必须晚于开始时间');
            }
        }

        // 验证人数设置
        if (activityData.min_participants && activityData.max_participants) {
            const minParticipants = parseInt(activityData.min_participants);
            const maxParticipants = parseInt(activityData.max_participants);

            if (minParticipants < 1) {
                validationErrors.push('最小参与人数至少为1人');
            }
            if (maxParticipants < 1) {
                validationErrors.push('最大参与人数至少为1人');
            }
            if (minParticipants > maxParticipants) {
                validationErrors.push('最小参与人数不能大于最大参与人数');
            }
        }

        // 如果有验证错误，显示详细错误
        if (validationErrors.length > 0) {
            const errorMessage = `请修正以下问题：\n• ${validationErrors.join('\n• ')}`;
            this.showDetailedErrorMessage(errorMessage, 400);
            return;
        }

        try {
            // 直接使用创建活动接口
            const response = await API.activities.create(activityData);

            if (response.success) {
                this.showMessage('活动创建成功', 'success');
                console.log('🎉 活动创建成功，响应数据:', response);

                // 关闭模态框
                Components.closeModal();

                // 等待一小段时间确保模态框完全关闭
                await new Promise(resolve => setTimeout(resolve, 300));

                // 刷新活动列表
                console.log('🔄 开始刷新活动列表...');
                await this.refreshList();
                console.log('✅ 活动列表刷新完成，当前活动数量:', this.activities.length);

                // 额外的验证步骤
                console.log('🔍 验证刷新效果...');
                setTimeout(() => {
                    console.log('🔍 延迟验证 - 当前活动数量:', this.activities.length);
                    if (this.activities.length === 0) {
                        console.warn('⚠️ 刷新后活动数量为0，可能存在问题');
                        // 强制再次刷新
                        this.forceRefresh();
                    }
                }, 1000);
            } else {
                this.showDetailedErrorMessage(response.message, response.status || 500);
            }
        } catch (error) {
            console.error('创建活动失败:', error);
            this.showDetailedErrorMessage(error.message, error.status || 500);
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

        // TODO: 将硬编码替换为从API获取的数据
        const mockLogsTemp = [
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
        mockLogsTemp.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        if (mockLogsTemp.length === 0) {
            return `
                <div class="text-center py-4 text-muted">
                    <i class="fas fa-history fa-3x mb-3 d-block"></i>
                    暂无活动日志
                </div>
            `;
        }

        return `
            <div class="timeline">
                ${mockLogsTemp.map(log => `
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

    // 切换标签页
    switchTab(tabName) {
        // 移除所有标签按钮的active类
        document.querySelectorAll('.tab-button').forEach(btn => {
            btn.classList.remove('active');
        });
        
        // 隐藏所有标签页内容
        document.querySelectorAll('.tab-pane').forEach(pane => {
            pane.classList.remove('show', 'active');
        });
        
        // 激活当前标签按钮
        event.target.classList.add('active');
        
        // 显示对应的标签页内容
        const targetPane = document.getElementById(tabName);
        if (targetPane) {
            targetPane.classList.add('show', 'active');
        }
    }
}

// 创建全局实例
window.activitiesManager = new ActivitiesManager();