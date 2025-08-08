// 组件管理文件

window.Components = {
    // 渲染菜单
    renderMenu() {
        const menuContainer = document.getElementById('nav-menu');
        if (!menuContainer) return;
        
        const userPermissions = Auth.getUserPermissions();
        const menuItems = this.filterMenuByPermissions(AppConfig.MENU_ITEMS_TEMP, userPermissions);
        
        menuContainer.innerHTML = '';
        
        menuItems.forEach(item => {
            const menuItem = this.createMenuItem(item);
            menuContainer.appendChild(menuItem);
        });
    },
    
    // 根据权限过滤菜单
    filterMenuByPermissions(items, permissions) {
        return items.filter(item => {
            // 检查权限
            if (item.permissions && !item.permissions.some(p => permissions.includes(p))) {
                return false;
            }
            
            // 过滤子菜单
            if (item.children) {
                item.children = this.filterMenuByPermissions(item.children, permissions);
            }
            
            return true;
        });
    },
    
    // 创建菜单项
    createMenuItem(item) {
        const li = document.createElement('li');
        li.className = 'nav-item';
        
        if (item.children && item.children.length > 0) {
            // 有子菜单的项目
            li.innerHTML = `
                <a href="#" class="nav-link nav-toggle" data-path="${item.path}">
                    <i class="${item.icon}"></i>
                    <span>${item.title}</span>
                    <i class="fas fa-chevron-down nav-arrow"></i>
                </a>
                <ul class="nav-submenu">
                    ${item.children.map(child => `
                        <li class="nav-item">
                            <a href="#" class="nav-link" data-path="${child.path}">
                                <span>${child.title}</span>
                            </a>
                        </li>
                    `).join('')}
                </ul>
            `;
            
            // 添加子菜单切换事件
            const toggle = li.querySelector('.nav-toggle');
            const submenu = li.querySelector('.nav-submenu');
            const arrow = li.querySelector('.nav-arrow');
            
            toggle.addEventListener('click', (e) => {
                e.preventDefault();
                const isOpen = submenu.style.display === 'block';
                submenu.style.display = isOpen ? 'none' : 'block';
                arrow.style.transform = isOpen ? 'rotate(0deg)' : 'rotate(180deg)';
            });
        } else {
            // 普通菜单项
            li.innerHTML = `
                <a href="#" class="nav-link" data-path="${item.path}">
                    <i class="${item.icon}"></i>
                    <span>${item.title}</span>
                </a>
            `;
        }
        
        // 添加点击事件
        const links = li.querySelectorAll('.nav-link:not(.nav-toggle)');
        links.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const path = link.getAttribute('data-path');
                Router.navigate(path);
            });
        });
        
        return li;
    },
    
    // 更新活动菜单项
    updateActiveMenu(path) {
        const allLinks = document.querySelectorAll('.nav-link');
        allLinks.forEach(link => link.classList.remove('active'));
        
        const activeLink = document.querySelector(`.nav-link[data-path="${path}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
            
            // 展开父菜单
            const parentSubmenu = activeLink.closest('.nav-submenu');
            if (parentSubmenu) {
                parentSubmenu.style.display = 'block';
                const parentArrow = parentSubmenu.previousElementSibling.querySelector('.nav-arrow');
                if (parentArrow) {
                    parentArrow.style.transform = 'rotate(180deg)';
                }
            }
        }
    },
    
    // 渲染用户信息
    renderUserInfo() {
        const user = Auth.getCurrentUser();
        if (!user) return;
        
        const userNameEl = document.getElementById('user-name');
        const userRoleEl = document.getElementById('user-role');
        const userAvatarEl = document.querySelector('.user-avatar');
        
        if (userNameEl) {
            userNameEl.textContent = Auth.getUserDisplayName();
        }
        
        if (userRoleEl) {
            userRoleEl.textContent = Auth.getRoleName(user.role);
            userRoleEl.className = `user-role role-badge ${user.role}`;
        }
        
        if (userAvatarEl) {
            userAvatarEl.src = Auth.getUserAvatar();
        }
    },
    
    // 渲染面包屑
    renderBreadcrumb(items) {
        const breadcrumbEl = document.getElementById('breadcrumb');
        if (!breadcrumbEl) return;
        
        breadcrumbEl.innerHTML = items.map(item => 
            `<span class="breadcrumb-item">${item}</span>`
        ).join('');
    },
    
    // 创建统计卡片
    createStatCard(data) {
        const { title, value, change, icon, color = 'primary' } = data;
        
        const changeClass = change > 0 ? 'positive' : change < 0 ? 'negative' : 'neutral';
        const changeIcon = change > 0 ? 'fa-arrow-up' : change < 0 ? 'fa-arrow-down' : 'fa-minus';
        
        return `
            <div class="stat-card">
                <div class="stat-card-header">
                    <div class="stat-card-title">${title}</div>
                    <div class="stat-card-icon ${color}">
                        <i class="${icon}"></i>
                    </div>
                </div>
                <div class="stat-card-value">${Utils.number.format(value)}</div>
                <div class="stat-card-change ${changeClass}">
                    <i class="fas ${changeIcon}"></i>
                    <span>${Math.abs(change)}%</span>
                    <span>较上期</span>
                </div>
            </div>
        `;
    },
    
    // 创建数据表格
    createTable(config) {
        const { columns, data, actions = [] } = config;
        
        let html = `
            <div class="table-container">
                <table class="table">
                    <thead>
                        <tr>
                            ${columns.map(col => `<th>${col.title}</th>`).join('')}
                            ${actions.length > 0 ? '<th>操作</th>' : ''}
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        if (data.length === 0) {
            html += `
                <tr>
                    <td colspan="${columns.length + (actions.length > 0 ? 1 : 0)}" class="text-center">
                        <div class="empty-state">
                            <div class="empty-state-icon">
                                <i class="fas fa-inbox"></i>
                            </div>
                            <div class="empty-state-title">暂无数据</div>
                        </div>
                    </td>
                </tr>
            `;
        } else {
            data.forEach((row, index) => {
                html += '<tr>';
                
                columns.forEach(col => {
                    let cellValue = row[col.key];
                    
                    // 应用格式化函数
                    if (col.formatter) {
                        cellValue = col.formatter(cellValue, row, index);
                    }
                    
                    html += `<td>${cellValue}</td>`;
                });
                
                // 添加操作列
                if (actions.length > 0) {
                    html += '<td><div class="action-buttons">';
                    actions.forEach(action => {
                        if (!action.permission || Auth.hasPermission(action.permission)) {
                            html += `
                                <button class="btn btn-sm ${action.class || 'btn-secondary'}" 
                                        onclick="${action.handler}('${row.id}')">
                                    <i class="${action.icon}"></i>
                                    ${action.title}
                                </button>
                            `;
                        }
                    });
                    html += '</div></td>';
                }
                
                html += '</tr>';
            });
        }
        
        html += `
                    </tbody>
                </table>
            </div>
        `;
        
        return html;
    },
    
    // 创建分页组件
    createPagination(config) {
        const { current, total, pageSize, onChange } = config;
        const totalPages = Math.ceil(total / pageSize);
        
        if (totalPages <= 1) return '';
        
        let html = '<div class="pagination">';
        
        // 上一页
        const prevDisabled = current <= 1 ? 'disabled' : '';
        html += `
            <a href="#" class="pagination-item ${prevDisabled}" data-page="${current - 1}">
                <i class="fas fa-chevron-left"></i>
            </a>
        `;
        
        // 页码
        const startPage = Math.max(1, current - 2);
        const endPage = Math.min(totalPages, current + 2);
        
        if (startPage > 1) {
            html += '<a href="#" class="pagination-item" data-page="1">1</a>';
            if (startPage > 2) {
                html += '<span class="pagination-item disabled">...</span>';
            }
        }
        
        for (let i = startPage; i <= endPage; i++) {
            const activeClass = i === current ? 'active' : '';
            html += `<a href="#" class="pagination-item ${activeClass}" data-page="${i}">${i}</a>`;
        }
        
        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                html += '<span class="pagination-item disabled">...</span>';
            }
            html += `<a href="#" class="pagination-item" data-page="${totalPages}">${totalPages}</a>`;
        }
        
        // 下一页
        const nextDisabled = current >= totalPages ? 'disabled' : '';
        html += `
            <a href="#" class="pagination-item ${nextDisabled}" data-page="${current + 1}">
                <i class="fas fa-chevron-right"></i>
            </a>
        `;
        
        html += '</div>';
        
        // 添加事件监听
        setTimeout(() => {
            const paginationItems = document.querySelectorAll('.pagination-item:not(.disabled)');
            paginationItems.forEach(item => {
                item.addEventListener('click', (e) => {
                    e.preventDefault();
                    const page = parseInt(item.getAttribute('data-page'));
                    if (page && page !== current) {
                        onChange(page);
                    }
                });
            });
        }, 0);
        
        return html;
    },
    
    // 创建搜索框
    createSearchBox(config) {
        const { placeholder = '搜索...', onSearch, value = '' } = config;
        
        const html = `
            <div class="search-box">
                <i class="fas fa-search search-icon"></i>
                <input type="text" class="search-input" placeholder="${placeholder}" value="${value}">
            </div>
        `;
        
        // 添加事件监听
        setTimeout(() => {
            const searchInput = document.querySelector('.search-input');
            if (searchInput && onSearch) {
                const debouncedSearch = Utils.debounce(onSearch, 300);
                searchInput.addEventListener('input', (e) => {
                    debouncedSearch(e.target.value);
                });
            }
        }, 0);
        
        return html;
    },
    
    // 创建筛选器
    createFilters(config) {
        const { filters, onFilter } = config;
        
        let html = '<div class="filters">';
        
        filters.forEach(filter => {
            html += `
                <div class="filter-group">
                    <label class="filter-label">${filter.label}</label>
                    <select class="filter-select" data-key="${filter.key}">
                        <option value="">全部</option>
                        ${filter.options.map(option => 
                            `<option value="${option.value}" ${option.value === filter.value ? 'selected' : ''}>
                                ${option.label}
                            </option>`
                        ).join('')}
                    </select>
                </div>
            `;
        });
        
        html += '</div>';
        
        // 添加事件监听
        setTimeout(() => {
            const filterSelects = document.querySelectorAll('.filter-select');
            filterSelects.forEach(select => {
                select.addEventListener('change', (e) => {
                    const key = e.target.getAttribute('data-key');
                    const value = e.target.value;
                    if (onFilter) {
                        onFilter(key, value);
                    }
                });
            });
        }, 0);
        
        return html;
    },
    
    // 创建模态框
    createModal(config) {
        const { title, content, footer, onClose, modalType } = config;
        
        const modalId = Utils.generateId('modal');
        
        const html = `
            <div class="modal-overlay" id="${modalId}">
                <div class="modal"${modalType ? ` data-modal-type="${modalType}"` : ''}>
                    <div class="modal-header">
                        <h3 class="modal-title">${title}</h3>
                        <button class="modal-close">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        ${content}
                    </div>
                    ${footer ? `<div class="modal-footer">${footer}</div>` : ''}
                </div>
            </div>
        `;
        
        // 添加到页面
        document.body.insertAdjacentHTML('beforeend', html);
        
        const modal = document.getElementById(modalId);
        const closeBtn = modal.querySelector('.modal-close');
        
        // 关闭事件
        const closeModal = () => {
            modal.classList.remove('show');
            setTimeout(() => {
                document.body.removeChild(modal);
                if (onClose) onClose();
            }, 300);
        };
        
        // X按钮使用智能关闭逻辑
        closeBtn.addEventListener('click', () => {
            this.handleCloseButtonClick(modal, closeModal);
        });
        
        // 点击外部区域的智能关闭逻辑
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.handleOverlayClick(modal, closeModal);
            }
        });
        
        // 显示模态框
        setTimeout(() => {
            modal.classList.add('show');
        }, 10);
        
        return {
            modal,
            close: closeModal
        };
    },
    
    // 处理关闭按钮点击（X按钮）
    handleCloseButtonClick(modal, closeModal) {
        // 获取弹窗类型
        const modalType = modal.getAttribute('data-modal-type');
        
        // 检查是否为受保护的弹窗类型
        if (modalType && AppConfig.MODAL_BEHAVIOR_TEMP.PROTECTED_MODALS.includes(modalType)) {
            // 受保护的弹窗需要确认数据丢失
            if (AppConfig.MODAL_BEHAVIOR_TEMP.CONFIRM_ON_DATA_LOSS) {
                const hasFormData = this.checkFormData(modal);
                
                if (hasFormData) {
                    if (confirm('您有未保存的数据，确定要关闭吗？')) {
                        closeModal();
                    }
                    return;
                }
            }
        }
        
        // 普通弹窗或受保护弹窗无数据时，检查是否需要确认
        if (AppConfig.MODAL_BEHAVIOR_TEMP.CONFIRM_ON_DATA_LOSS) {
            const hasFormData = this.checkFormData(modal);
            
            if (hasFormData) {
                if (confirm('您有未保存的数据，确定要关闭吗？')) {
                    closeModal();
                }
                return;
            }
        }
        
        // 无数据或不需要确认时直接关闭
        closeModal();
    },
    
    // 处理遮罩层点击
    handleOverlayClick(modal, closeModal) {
        // 检查配置是否允许点击外部关闭
        if (!AppConfig.MODAL_BEHAVIOR_TEMP.CLICK_OUTSIDE_TO_CLOSE) {
            return; // 不允许点击外部关闭
        }
        
        // 检查是否为受保护的弹窗类型
        const modalType = modal.getAttribute('data-modal-type');
        if (modalType && AppConfig.MODAL_BEHAVIOR_TEMP.PROTECTED_MODALS.includes(modalType)) {
            return; // 受保护的弹窗不允许点击外部关闭
        }
        
        // 检查是否需要确认数据丢失
        if (AppConfig.MODAL_BEHAVIOR_TEMP.CONFIRM_ON_DATA_LOSS) {
            const hasFormData = this.checkFormData(modal);
            
            if (hasFormData) {
                // 有数据时需要确认
                if (confirm('您有未保存的数据，确定要关闭吗？')) {
                    closeModal();
                }
                return;
            }
        }
        
        // 无数据或不需要确认时直接关闭
        closeModal();
    },
    
    // 检查表单是否有数据
    checkFormData(modal) {
        const forms = modal.querySelectorAll('form');
        
        for (let form of forms) {
            const formData = new FormData(form);
            
            // 检查是否有非空的输入
            for (let [key, value] of formData.entries()) {
                if (value && value.toString().trim() !== '') {
                    return true;
                }
            }
            
            // 检查文本域和选择框
            const inputs = form.querySelectorAll('input, textarea, select');
            for (let input of inputs) {
                if (input.value && input.value.trim() !== '' && 
                    input.type !== 'hidden' && input.type !== 'submit') {
                    return true;
                }
            }
        }
        
        return false;
    },
    
    // 创建加载状态
    createLoading(text = '加载中...') {
        return `
            <div class="loading-state">
                <div class="loading-spinner-sm"></div>
                <span>${text}</span>
            </div>
        `;
    },
    
    // 格式化状态标签
    formatStatus(status) {
        const statusMap = {
            active: { text: '正常', class: 'active' },
            inactive: { text: '禁用', class: 'inactive' },
            deleted: { text: '已删除', class: 'inactive' },
            pending: { text: '待审核', class: 'pending' },
            approved: { text: '已通过', class: 'active' },
            rejected: { text: '已拒绝', class: 'inactive' }
        };
        
        const statusInfo = statusMap[status] || { text: status, class: 'draft' };
        return `<span class="status-badge ${statusInfo.class}">${statusInfo.text}</span>`;
    },
    
    // 格式化角色标签
    formatRole(role) {
        const roleName = Auth.getRoleName(role);
        return `<span class="role-badge ${role}">${roleName}</span>`;
    }
};