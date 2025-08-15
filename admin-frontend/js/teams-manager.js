/* 最后修改时间: 2025-01-12 15:30:00 */
// 团队管理器 - 基于活动管理器的成功模式

class TeamsManager {
    constructor() {
        this.teams = [];
        this.teamTypes = [];
        this.currentFilters = {
            search: '',
            status: '',
            team_type: '',
            creator_id: ''
        };
        this.isLoading = false;
        this.currentPage = 1;
        this.pageSize = 20;
        this.totalPages = 1;
    }

    // 初始化
    async init() {
        console.log('TeamsManager 初始化...');
        await this.loadInitialData();
    }

    // 加载初始数据
    async loadInitialData() {
        if (this.isLoading) return;

        this.isLoading = true;
        try {
            // 并行加载团队数据和团队类型
            const [teamsResult, typesResult] = await Promise.all([
                this.loadTeams(),
                this.loadTeamTypes()
            ]);

            // 初始化筛选器选项
            this.initializeFilters();

            // 渲染团队列表
            this.renderTeamsList();

        } catch (error) {
            console.error('初始化失败:', error);
            this.showMessage('初始化失败: ' + error.message, 'error');
        } finally {
            this.isLoading = false;
        }
    }

    // 加载团队数据
    async loadTeams() {
        try {
            console.log('正在加载团队数据...');

            const params = {
                page: this.currentPage,
                limit: this.pageSize,
                ...this.currentFilters
            };

            const response = await API.teams.getList(params);

            if (response.success) {
                this.teams = response.data.teams || [];
                this.totalPages = response.data.pagination?.pages || 1;
                console.log(`成功加载 ${this.teams.length} 个团队`);
                return true;
            } else {
                throw new Error(response.message || '加载团队失败');
            }
        } catch (error) {
            console.error('加载团队失败:', error);
            this.showMessage('加载团队失败: ' + error.message, 'error');
            this.teams = [];
            return false;
        }
    }

    // 加载团队类型
    async loadTeamTypes() {
        try {
            console.log('正在加载团队类型...');

            const response = await API.teams.getTypes();

            if (response.success) {
                this.teamTypes = response.data || [];
                console.log(`成功加载 ${this.teamTypes.length} 个团队类型`);
                return true;
            } else {
                throw new Error(response.message || '加载团队类型失败');
            }
        } catch (error) {
            console.error('加载团队类型失败:', error);
            this.showMessage('加载团队类型失败: ' + error.message, 'error');
            this.teamTypes = [];
            return false;
        }
    }    // 初始
    化筛选器选项
    initializeFilters() {
        // 初始化团队类型筛选器
        const typeFilter = document.getElementById('type-filter');
        if (typeFilter) {
            typeFilter.innerHTML = '<option value="">全部类型</option>';
            this.teamTypes.forEach(type => {
                const option = document.createElement('option');
                option.value = type.value || type.id;
                option.textContent = type.label || type.name;
                typeFilter.appendChild(option);
            });
        }

        // 初始化创建者筛选器（从已加载的团队中提取）
        const creatorFilter = document.getElementById('creator-filter');
        if (creatorFilter) {
            creatorFilter.innerHTML = '<option value="">全部创建者</option>';
            const creators = [...new Set(this.teams.map(team => team.creator?.username).filter(Boolean))];
            creators.forEach(creator => {
                const option = document.createElement('option');
                option.value = creator;
                option.textContent = creator;
                creatorFilter.appendChild(option);
            });
        }
    }

    // 渲染团队列表
    renderTeamsList() {
        const container = document.getElementById('teams-container');
        if (!container) return;

        if (this.teams.length === 0) {
            container.innerHTML = `
                <div class="text-center py-5">
                    <i class="fas fa-users fa-3x text-muted mb-3"></i>
                    <h5 class="text-muted">暂无团队数据</h5>
                    <p class="text-muted">点击"创建团队"按钮开始创建第一个团队</p>
                    <button class="btn btn-primary" onclick="teamsManager.showCreateModal()">
                        <i class="fas fa-plus"></i> 创建团队
                    </button>
                </div>
            `;
            return;
        }

        const teamsHtml = this.teams.map(team => this.renderTeamCard(team)).join('');

        container.innerHTML = `
            <div class="row">
                ${teamsHtml}
            </div>
            ${this.renderPagination()}
        `;
    }

    // 渲染单个团队卡片
    renderTeamCard(team) {
        const statusBadge = this.getStatusBadge(team.status);
        const memberCount = team.member_count || 0;
        const avatarUrl = team.avatar_url || 'https://via.placeholder.com/60x60?text=团队';

        return `
            <div class="col-md-6 col-lg-4 mb-4">
                <div class="card h-100">
                    <div class="card-body">
                        <div class="d-flex align-items-start mb-3">
                            <img src="${avatarUrl}" alt="团队头像" class="rounded me-3" width="60" height="60">
                            <div class="flex-grow-1">
                                <h5 class="card-title mb-1">${team.name}</h5>
                                <small class="text-muted">创建者: ${team.creator?.username || '未知'}</small>
                                <div class="mt-1">
                                    ${statusBadge}
                                    <span class="badge bg-secondary ms-1">
                                        <i class="fas fa-user"></i> ${memberCount}人
                                    </span>
                                </div>
                            </div>
                        </div>
                        
                        <p class="card-text text-muted small">
                            ${team.description || '暂无描述'}
                        </p>
                        
                        <div class="d-flex justify-content-between align-items-center">
                            <small class="text-muted">
                                ${this.formatDate(team.created_at)}
                            </small>
                            <div class="btn-group" role="group">
                                <button class="btn btn-sm btn-outline-primary" 
                                        onclick="teamsManager.viewTeamDetail('${team.id}')"
                                        title="查看详情">
                                    <i class="fas fa-eye"></i>
                                </button>
                                <button class="btn btn-sm btn-outline-warning" 
                                        onclick="teamsManager.showEditModal('${team.id}')"
                                        title="编辑">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="btn btn-sm btn-outline-danger" 
                                        onclick="teamsManager.deleteTeam('${team.id}')"
                                        title="删除">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    // 获取状态徽章
    getStatusBadge(status) {
        const statusMap = {
            'active': '<span class="badge bg-success">活跃</span>',
            'inactive': '<span class="badge bg-warning">非活跃</span>',
            'dissolved': '<span class="badge bg-danger">已解散</span>'
        };
        return statusMap[status] || '<span class="badge bg-secondary">未知</span>';
    }

    // 格式化日期
    formatDate(dateString) {
        if (!dateString) return '未知时间';
        const date = new Date(dateString);
        return date.toLocaleDateString('zh-CN') + ' ' + date.toLocaleTimeString('zh-CN', {
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    // 渲染分页
    renderPagination() {
        if (this.totalPages <= 1) return '';

        let paginationHtml = '<nav class="mt-4"><ul class="pagination justify-content-center">';

        // 上一页
        paginationHtml += `
            <li class="page-item ${this.currentPage === 1 ? 'disabled' : ''}">
                <a class="page-link" href="#" onclick="teamsManager.goToPage(${this.currentPage - 1})">上一页</a>
            </li>
        `;

        // 页码
        for (let i = 1; i <= this.totalPages; i++) {
            if (i === this.currentPage ||
                i === 1 ||
                i === this.totalPages ||
                (i >= this.currentPage - 2 && i <= this.currentPage + 2)) {
                paginationHtml += `
                    <li class="page-item ${i === this.currentPage ? 'active' : ''}">
                        <a class="page-link" href="#" onclick="teamsManager.goToPage(${i})">${i}</a>
                    </li>
                `;
            } else if (i === this.currentPage - 3 || i === this.currentPage + 3) {
                paginationHtml += '<li class="page-item disabled"><span class="page-link">...</span></li>';
            }
        }

        // 下一页
        paginationHtml += `
            <li class="page-item ${this.currentPage === this.totalPages ? 'disabled' : ''}">
                <a class="page-link" href="#" onclick="teamsManager.goToPage(${this.currentPage + 1})">下一页</a>
            </li>
        `;

        paginationHtml += '</ul></nav>';
        return paginationHtml;
    }

    // 跳转到指定页面
    async goToPage(page) {
        if (page < 1 || page > this.totalPages || page === this.currentPage) return;

        this.currentPage = page;
        await this.loadTeams();
        this.renderTeamsList();
    }

    // 搜索处理
    async handleSearch() {
        const searchInput = document.getElementById('search-input');
        const searchValue = searchInput ? searchInput.value.trim() : '';

        this.currentFilters.search = searchValue;
        this.currentPage = 1; // 重置到第一页

        await this.loadTeams();
        this.renderTeamsList();
    }

    // 筛选处理
    async handleFilter() {
        const statusFilter = document.getElementById('status-filter');
        const typeFilter = document.getElementById('type-filter');
        const creatorFilter = document.getElementById('creator-filter');

        this.currentFilters.status = statusFilter ? statusFilter.value : '';
        this.currentFilters.team_type = typeFilter ? typeFilter.value : '';
        this.currentFilters.creator_id = creatorFilter ? creatorFilter.value : '';

        this.currentPage = 1; // 重置到第一页

        await this.loadTeams();
        this.renderTeamsList();
    }

    // 清除筛选
    async clearFilters() {
        // 重置筛选条件
        this.currentFilters = {
            search: '',
            status: '',
            team_type: '',
            creator_id: ''
        };
        this.currentPage = 1;

        // 重置表单元素
        const searchInput = document.getElementById('search-input');
        const statusFilter = document.getElementById('status-filter');
        const typeFilter = document.getElementById('type-filter');
        const creatorFilter = document.getElementById('creator-filter');

        if (searchInput) searchInput.value = '';
        if (statusFilter) statusFilter.value = '';
        if (typeFilter) typeFilter.value = '';
        if (creatorFilter) creatorFilter.value = '';

        await this.loadTeams();
        this.renderTeamsList();
    }

    // 刷新列表
    async refreshList() {
        await this.loadInitialData();
    }
    // 显示创建团队模态框
    showCreateModal() {
        const modalContent = `
            <form id="createTeamForm">
                <div class="mb-3">
                    <label for="teamName" class="form-label">团队名称 <span class="text-danger">*</span></label>
                    <input type="text" class="form-control" id="teamName" name="name" required 
                           placeholder="请输入团队名称" maxlength="100">
                </div>
                
                <div class="mb-3">
                    <label for="teamDescription" class="form-label">团队描述</label>
                    <textarea class="form-control" id="teamDescription" name="description" rows="3"
                              placeholder="请输入团队描述" maxlength="1000"></textarea>
                </div>
                
                <div class="mb-3">
                    <label for="teamType" class="form-label">团队类型</label>
                    <select class="form-select" id="teamType" name="team_type">
                        <option value="general">通用团队</option>
                        ${this.teamTypes.map(type =>
            `<option value="${type.value || type.id}">${type.label || type.name}</option>`
        ).join('')}
                    </select>
                </div>
                
                <div class="mb-3">
                    <label for="teamAvatar" class="form-label">团队头像URL</label>
                    <input type="url" class="form-control" id="teamAvatar" name="avatar_url" 
                           placeholder="请输入头像URL（可选）">
                </div>
            </form>
        `;

        const modal = Components.createModal({
            title: '创建团队',
            content: modalContent,
            footer: `
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">取消</button>
                <button type="button" class="btn btn-primary" onclick="teamsManager.submitCreate()">
                    <i class="fas fa-plus"></i> 创建
                </button>
            `
        });

        this.currentModal = modal;
    }

    // 提交创建团队
    async submitCreate() {
        const form = document.getElementById('createTeamForm');
        if (!form) return;

        const formData = new FormData(form);
        const teamData = {
            name: formData.get('name').trim(),
            description: formData.get('description').trim(),
            team_type: formData.get('team_type'),
            avatar_url: formData.get('avatar_url').trim() || null
        };

        // 验证必填字段
        if (!teamData.name) {
            this.showMessage('请输入团队名称', 'error');
            return;
        }

        if (teamData.name.length < 2) {
            this.showMessage('团队名称至少2个字符', 'error');
            return;
        }

        try {
            const response = await API.teams.create(teamData);

            if (response.success) {
                this.showMessage('团队创建成功', 'success');
                // 使用FormUtils安全关闭模态框，避免浏览器未保存数据警告
                FormUtils.onFormSubmitSuccess('createTeamForm', () => {
                    this.closeModal();
                });
                await this.refreshList();
            } else {
                throw new Error(response.message || '创建失败');
            }
        } catch (error) {
            console.error('创建团队失败:', error);
            this.showMessage('创建团队失败: ' + error.message, 'error');
        }
    }

    // 显示编辑团队模态框
    async showEditModal(teamId) {
        const team = this.teams.find(t => t.id === teamId);
        if (!team) {
            this.showMessage('团队不存在', 'error');
            return;
        }

        const modalContent = `
            <form id="editTeamForm">
                <input type="hidden" name="id" value="${team.id}">
                
                <div class="mb-3">
                    <label for="editTeamName" class="form-label">团队名称 <span class="text-danger">*</span></label>
                    <input type="text" class="form-control" id="editTeamName" name="name" required 
                           value="${team.name}" placeholder="请输入团队名称" maxlength="100">
                </div>
                
                <div class="mb-3">
                    <label for="editTeamDescription" class="form-label">团队描述</label>
                    <textarea class="form-control" id="editTeamDescription" name="description" rows="3"
                              placeholder="请输入团队描述" maxlength="1000">${team.description || ''}</textarea>
                </div>
                
                <div class="mb-3">
                    <label for="editTeamType" class="form-label">团队类型</label>
                    <select class="form-select" id="editTeamType" name="team_type">
                        <option value="general" ${team.team_type === 'general' ? 'selected' : ''}>通用团队</option>
                        ${this.teamTypes.map(type =>
            `<option value="${type.value || type.id}" ${team.team_type === (type.value || type.id) ? 'selected' : ''}>${type.label || type.name}</option>`
        ).join('')}
                    </select>
                </div>
                
                <div class="mb-3">
                    <label for="editTeamAvatar" class="form-label">团队头像URL</label>
                    <input type="url" class="form-control" id="editTeamAvatar" name="avatar_url" 
                           value="${team.avatar_url || ''}" placeholder="请输入头像URL（可选）">
                </div>
                
                <div class="mb-3">
                    <label for="editTeamStatus" class="form-label">团队状态</label>
                    <select class="form-select" id="editTeamStatus" name="status">
                        <option value="active" ${team.status === 'active' ? 'selected' : ''}>活跃</option>
                        <option value="inactive" ${team.status === 'inactive' ? 'selected' : ''}>非活跃</option>
                        <option value="dissolved" ${team.status === 'dissolved' ? 'selected' : ''}>已解散</option>
                    </select>
                </div>
            </form>
        `;

        const modal = Components.createModal({
            title: '编辑团队',
            content: modalContent,
            footer: `
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">取消</button>
                <button type="button" class="btn btn-primary" onclick="teamsManager.submitEdit()">
                    <i class="fas fa-save"></i> 保存
                </button>
            `
        });

        this.currentModal = modal;
    }
    // 提交编辑团队
    async submitEdit() {
        const form = document.getElementById('editTeamForm');
        if (!form) return;

        const formData = new FormData(form);
        const teamId = formData.get('id');
        const teamData = {
            name: formData.get('name').trim(),
            description: formData.get('description').trim(),
            team_type: formData.get('team_type'),
            avatar_url: formData.get('avatar_url').trim() || null,
            status: formData.get('status')
        };

        // 验证必填字段
        if (!teamData.name) {
            this.showMessage('请输入团队名称', 'error');
            return;
        }

        if (teamData.name.length < 2) {
            this.showMessage('团队名称至少2个字符', 'error');
            return;
        }

        try {
            const response = await API.teams.update(teamId, teamData);

            if (response.success) {
                this.showMessage('团队更新成功', 'success');
                // 使用FormUtils安全关闭模态框，避免浏览器未保存数据警告
                FormUtils.onFormSubmitSuccess('editTeamForm', () => {
                    this.closeModal();
                });
                await this.refreshList();
            } else {
                throw new Error(response.message || '更新失败');
            }
        } catch (error) {
            console.error('更新团队失败:', error);
            this.showMessage('更新团队失败: ' + error.message, 'error');
        }
    }

    // 删除团队
    async deleteTeam(teamId) {
        const team = this.teams.find(t => t.id === teamId);
        if (!team) {
            this.showMessage('团队不存在', 'error');
            return;
        }

        const confirmMessage = `确定要删除团队"${team.name}"吗？\n\n此操作不可恢复！`;
        if (!confirm(confirmMessage)) {
            return;
        }

        try {
            const response = await API.teams.delete(teamId);

            if (response.success) {
                this.showMessage('团队删除成功', 'success');
                await this.refreshList();
            } else {
                throw new Error(response.message || '删除失败');
            }
        } catch (error) {
            console.error('删除团队失败:', error);
            this.showMessage('删除团队失败: ' + error.message, 'error');
        }
    }

    // 查看团队详情
    async viewTeamDetail(teamId) {
        try {
            const response = await API.teams.getDetail(teamId, { include_members: 'true' });

            if (response.success) {
                const team = response.data;
                this.showTeamDetailModal(team);
            } else {
                throw new Error(response.message || '获取团队详情失败');
            }
        } catch (error) {
            console.error('获取团队详情失败:', error);
            this.showMessage('获取团队详情失败: ' + error.message, 'error');
        }
    }

    // 显示团队详情模态框
    showTeamDetailModal(team) {
        const members = team.members || [];
        const membersHtml = members.length > 0 ?
            members.map(member => `
                <div class="d-flex align-items-center mb-2">
                    <div class="me-3">
                        <i class="fas fa-user-circle fa-2x text-muted"></i>
                    </div>
                    <div>
                        <div class="fw-bold">${member.user?.username || '未知用户'}</div>
                        <small class="text-muted">
                            ${member.role === 'admin' ? '管理员' : '成员'} · 
                            加入时间: ${this.formatDate(member.joined_at)}
                        </small>
                    </div>
                </div>
            `).join('') :
            '<p class="text-muted">暂无成员</p>';

        const modalContent = `
            <div class="row">
                <div class="col-md-4 text-center mb-3">
                    <img src="${team.avatar_url || 'https://via.placeholder.com/120x120?text=团队'}" 
                         alt="团队头像" class="rounded mb-3" width="120" height="120">
                    <h5>${team.name}</h5>
                    ${this.getStatusBadge(team.status)}
                </div>
                <div class="col-md-8">
                    <table class="table table-borderless">
                        <tr>
                            <td class="fw-bold" width="100">团队类型:</td>
                            <td>${this.getTeamTypeName(team.team_type)}</td>
                        </tr>
                        <tr>
                            <td class="fw-bold">创建者:</td>
                            <td>${team.creator?.username || '未知'}</td>
                        </tr>
                        <tr>
                            <td class="fw-bold">成员数量:</td>
                            <td>${members.length} 人</td>
                        </tr>
                        <tr>
                            <td class="fw-bold">创建时间:</td>
                            <td>${this.formatDate(team.created_at)}</td>
                        </tr>
                        <tr>
                            <td class="fw-bold">最后更新:</td>
                            <td>${this.formatDate(team.updated_at)}</td>
                        </tr>
                    </table>
                </div>
            </div>
            
            <div class="mt-3">
                <h6>团队描述</h6>
                <p class="text-muted">${team.description || '暂无描述'}</p>
            </div>
            
            <div class="mt-3">
                <h6>团队成员 (${members.length})</h6>
                <div class="border rounded p-3" style="max-height: 200px; overflow-y: auto;">
                    ${membersHtml}
                </div>
            </div>
        `;

        const modal = Components.createModal({
            title: '团队详情',
            content: modalContent,
            size: 'lg',
            footer: `
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">关闭</button>
                <button type="button" class="btn btn-primary" onclick="teamsManager.showEditModal('${team.id}'); teamsManager.closeModal();">
                    <i class="fas fa-edit"></i> 编辑团队
                </button>
            `
        });

        this.currentModal = modal;
    }

    // 获取团队类型名称
    getTeamTypeName(typeValue) {
        const type = this.teamTypes.find(t => (t.value || t.id) === typeValue);
        return type ? (type.label || type.name) : typeValue || '未知类型';
    }

    // 关闭模态框
    closeModal() {
        if (this.currentModal) {
            const modalElement = document.querySelector('.modal.show');
            if (modalElement) {
                const modal = bootstrap.Modal.getInstance(modalElement);
                if (modal) {
                    modal.hide();
                }
            }
            this.currentModal = null;
        }
    }

    // 显示消息提示
    showMessage(message, type = 'info') {
        Utils.toast[type](message);
    }
}

// 创建全局实例
window.teamsManager = new TeamsManager();