// 团队类型管理器 - 重写版本
// 简化设计，专注核心功能

class TeamTypesManager {
    constructor() {
        this.types = [];
        this.isLoading = false;
    }

    // 初始化
    async init() {
        console.log('TeamTypesManager 初始化...');
        await this.loadTypes();
    }

    // 加载团队类型数据
    async loadTypes() {
        if (this.isLoading) return;
        
        this.isLoading = true;
        try {
            console.log('正在加载团队类型数据...');
            
            // 使用现有系统的API调用方式
            if (typeof API !== 'undefined' && API.teams && API.teams.getTypes) {
                const response = await API.teams.getTypes();
                if (response.success) {
                    this.types = response.data.map(type => ({
                        id: type.value,
                        name: type.label,
                        description: type.description || '无描述',
                        isDefault: false // 所有类型都视为可编辑
                    }));
                    console.log(`成功加载 ${this.types.length} 个团队类型`);
                } else {
                    throw new Error(response.message || '加载失败');
                }
            } else {
                // 降级到直接fetch调用
                const token = localStorage.getItem('token');
                const response = await fetch('/api/teams/types', {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const data = await response.json();
                
                if (data.success) {
                    this.types = data.data.map(type => ({
                        id: type.value,
                        name: type.label,
                        description: type.description || '无描述',
                        isDefault: false // 所有类型都视为可编辑
                    }));
                    console.log(`成功加载 ${this.types.length} 个团队类型`);
                } else {
                    throw new Error(data.message || '加载失败');
                }
            }
        } catch (error) {
            console.error('加载团队类型失败:', error);
            this.showMessage('加载团队类型失败: ' + error.message, 'error');
            this.types = [];
        } finally {
            this.isLoading = false;
        }
    }

    // 渲染团队类型列表
    renderList() {
        if (this.types.length === 0) {
            return `
                <div class="text-center py-4">
                    <i class="fas fa-inbox fa-3x text-muted mb-3"></i>
                    <p class="text-muted">暂无团队类型数据</p>
                    <button class="btn btn-primary" onclick="teamTypesManager.loadTypes(); teamTypesManager.refreshPage();">
                        <i class="fas fa-sync-alt"></i> 重新加载
                    </button>
                </div>
            `;
        }

        return `
            <div class="table-responsive">
                <table class="table table-striped">
                    <thead>
                        <tr>
                            <th>类型ID</th>
                            <th>类型名称</th>
                            <th>描述</th>
                            <th>类型</th>
                            <th width="120">操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${this.types.map(type => `
                            <tr>
                                <td><code>${type.id}</code></td>
                                <td><strong>${type.name}</strong></td>
                                <td>${type.description}</td>
                                <td>
                                    <span class="badge bg-success">
                                        可编辑
                                    </span>
                                </td>
                                <td>
                                    <button class="btn btn-sm btn-outline-primary me-1" 
                                            onclick="teamTypesManager.editType('${type.id}')"
                                            title="编辑">
                                        <i class="fas fa-edit"></i>
                                    </button>
                                    <button class="btn btn-sm btn-outline-danger" 
                                            onclick="teamTypesManager.deleteType('${type.id}')"
                                            title="删除">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    // 显示新增弹窗
    showAddModal() {
        console.log('showAddModal被调用');
        
        const modalContent = `
            <form id="addTypeForm">
                <div class="form-group">
                    <label for="typeId">类型ID *</label>
                    <input type="text" id="typeId" name="id" required 
                           placeholder="例如: custom_team" pattern="[a-z_]+">
                    <small class="form-text">只能包含小写字母和下划线</small>
                </div>
                
                <div class="form-group">
                    <label for="typeName">类型名称 *</label>
                    <input type="text" id="typeName" name="name" required 
                           placeholder="例如: 自定义团队">
                </div>
                
                <div class="form-group">
                    <label for="typeDescription">描述</label>
                    <textarea id="typeDescription" name="description" rows="3"
                              placeholder="请输入类型描述"></textarea>
                </div>
            </form>
        `;

        // 使用系统的模态框组件
        if (typeof Components !== 'undefined' && Components.createModal) {
            this.currentModal = Components.createModal({
                title: '新增团队类型',
                content: modalContent,
                modalType: 'team-type-create',
                footer: `
                    <button type="button" class="btn btn-secondary" onclick="teamTypesManager.closeModal()">
                        取消
                    </button>
                    <button type="button" class="btn btn-primary" onclick="teamTypesManager.submitAdd()">
                        <i class="fas fa-plus"></i>
                        新增
                    </button>
                `
            });
        } else {
            // 降级到简单的模态框实现
            this.createSimpleModal(modalContent);
        }
    }
    
    // 简单模态框实现（降级方案）
    createSimpleModal(content) {
        const modalHtml = `
            <div class="modal-overlay" id="addTypeModal" style="
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0,0,0,0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 9999;
            ">
                <div class="modal" style="
                    background: white;
                    border-radius: 8px;
                    max-width: 500px;
                    width: 90%;
                    max-height: 90vh;
                    overflow: auto;
                ">
                    <div class="modal-header" style="
                        padding: 20px;
                        border-bottom: 1px solid #eee;
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                    ">
                        <h3 class="modal-title">新增团队类型</h3>
                        <button class="modal-close" onclick="teamTypesManager.closeModal()" style="
                            background: none;
                            border: none;
                            font-size: 20px;
                            cursor: pointer;
                        ">×</button>
                    </div>
                    <div class="modal-body" style="padding: 20px;">
                        ${content}
                    </div>
                    <div class="modal-footer" style="
                        padding: 20px;
                        border-top: 1px solid #eee;
                        display: flex;
                        justify-content: flex-end;
                        gap: 10px;
                    ">
                        <button type="button" class="btn btn-secondary" onclick="teamTypesManager.closeModal()">取消</button>
                        <button type="button" class="btn btn-primary" onclick="teamTypesManager.submitAdd()">
                            <i class="fas fa-plus"></i> 新增
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        // 点击背景关闭
        const modal = document.getElementById('addTypeModal');
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeModal();
            }
        });
    }
    

    
    // 关闭模态框
    closeModal() {
        if (this.currentModal && this.currentModal.close) {
            // 使用系统模态框的关闭方法
            this.currentModal.close();
            this.currentModal = null;
        } else {
            // 降级方案：直接移除元素
            const modalElement = document.getElementById('addTypeModal');
            if (modalElement) {
                modalElement.remove();
            }
        }
    }

    // 提交新增
    async submitAdd() {
        const form = document.getElementById('addTypeForm');
        const formData = new FormData(form);
        
        const typeData = {
            id: formData.get('id').trim(),
            name: formData.get('name').trim(),
            description: formData.get('description').trim()
        };

        // 验证
        if (!typeData.id || !typeData.name) {
            this.showMessage('请填写必填字段', 'error');
            return;
        }

        if (!/^[a-z_]+$/.test(typeData.id)) {
            this.showMessage('类型ID只能包含小写字母和下划线', 'error');
            return;
        }

        if (this.types.find(t => t.id === typeData.id)) {
            this.showMessage('类型ID已存在', 'error');
            return;
        }

        try {
            console.log('正在新增团队类型:', typeData);
            
            let result;
            // 使用现有系统的API调用方式
            if (typeof API !== 'undefined' && API.teams && API.teams.createType) {
                result = await API.teams.createType(typeData);
            } else {
                // 降级到直接fetch调用
                const token = localStorage.getItem('token');
                const response = await fetch('/api/teams/types', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(typeData)
                });
                result = await response.json();
            }
            
            if (result.success) {
                this.showMessage('团队类型新增成功', 'success');
                
                // 关闭模态框
                this.closeModal();
                
                // 重新加载数据
                await this.loadTypes();
                this.refreshPage();
            } else {
                throw new Error(result.message || '新增失败');
            }
        } catch (error) {
            console.error('新增团队类型失败:', error);
            this.showMessage('新增失败: ' + error.message, 'error');
        }
    }

    // 编辑类型
    editType(typeId) {
        const type = this.types.find(t => t.id === typeId);
        if (!type) {
            this.showMessage('团队类型不存在', 'error');
            return;
        }

        // 所有类型都可以编辑

        console.log('编辑团队类型:', typeId);
        // TODO: 实现编辑功能
        this.showMessage('编辑功能开发中...', 'info');
    }

    // 删除类型
    async deleteType(typeId) {
        const type = this.types.find(t => t.id === typeId);
        if (!type) {
            this.showMessage('团队类型不存在', 'error');
            return;
        }

        // 所有类型都可以删除

        if (!confirm(`确定要删除团队类型"${type.name}"吗？\n\n此操作不可恢复！`)) {
            return;
        }

        try {
            console.log('正在删除团队类型:', typeId);
            
            let result;
            // 使用现有系统的API调用方式
            if (typeof API !== 'undefined' && API.teams && API.teams.deleteType) {
                result = await API.teams.deleteType(typeId);
            } else {
                // 降级到直接fetch调用
                const token = localStorage.getItem('token');
                const response = await fetch(`/api/teams/types/${typeId}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
                result = await response.json();
            }
            
            if (result.success) {
                this.showMessage('团队类型删除成功', 'success');
                
                // 重新加载数据
                await this.loadTypes();
                this.refreshPage();
            } else {
                throw new Error(result.message || '删除失败');
            }
        } catch (error) {
            console.error('删除团队类型失败:', error);
            this.showMessage('删除失败: ' + error.message, 'error');
        }
    }

    // 刷新页面显示
    refreshPage() {
        const container = document.getElementById('team-types-container');
        if (container) {
            container.innerHTML = this.renderList();
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
            // 如果没有消息容器，创建一个
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
}

// 创建全局实例
window.teamTypesManager = new TeamTypesManager();