// 缁勪欢绠＄悊鏂囦欢

window.Components = {
    // 娓叉煋鑿滃崟
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
    
    // 鏍规嵁鏉冮檺杩囨护鑿滃崟
    filterMenuByPermissions(items, permissions) {
        return items.filter(item => {
            // 妫€鏌ユ潈闄?
            if (item.permissions && !item.permissions.some(p => permissions.includes(p))) {
                return false;
            }
            
            // 杩囨护瀛愯彍鍗?
            if (item.children) {
                item.children = this.filterMenuByPermissions(item.children, permissions);
            }
            
            return true;
        });
    },
    
    // 鍒涘缓鑿滃崟椤?
    createMenuItem(item) {
        const li = document.createElement('li');
        li.className = 'nav-item';
        
        if (item.children && item.children.length > 0) {
            // 鏈夊瓙鑿滃崟鐨勯」鐩?
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
            
            // 娣诲姞瀛愯彍鍗曞垏鎹簨浠?
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
            // 鏅€氳彍鍗曢」
            li.innerHTML = `
                <a href="#" class="nav-link" data-path="${item.path}">
                    <i class="${item.icon}"></i>
                    <span>${item.title}</span>
                </a>
            `;
        }
        
        // 娣诲姞鐐瑰嚮浜嬩欢
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
    
    // 鏇存柊娲诲姩鑿滃崟椤?
    updateActiveMenu(path) {
        const allLinks = document.querySelectorAll('.nav-link');
        allLinks.forEach(link => link.classList.remove('active'));
        
        const activeLink = document.querySelector(`.nav-link[data-path="${path}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
            
            // 灞曞紑鐖惰彍鍗?
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
    
    // 娓叉煋鐢ㄦ埛淇℃伅
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
            // 浣跨敤宸ュ叿鍑芥暟澶勭悊澶村儚鏄剧ず
            const avatarUrl = Utils.avatar.getUserAvatar(user, 32);
            if (avatarUrl) {
                userAvatarEl.src = avatarUrl;
                userAvatarEl.style.display = 'inline-block';
            } else {
                // 濡傛灉娌℃湁澶村儚URL锛屼娇鐢ㄩ粯璁ゅ浘鏍?
                userAvatarEl.style.display = 'none';
                // 鍒涘缓鎴栨洿鏂伴粯璁ゅ浘鏍?
                let defaultAvatar = userAvatarEl.parentNode.querySelector('.default-avatar');
                if (!defaultAvatar) {
                    defaultAvatar = document.createElement('i');
                    defaultAvatar.className = 'fas fa-user text-muted default-avatar';
                    defaultAvatar.style.fontSize = '20px';
                    userAvatarEl.parentNode.insertBefore(defaultAvatar, userAvatarEl.nextSibling);
                }
            }
        }
    },
    
    // 娓叉煋闈㈠寘灞?
    renderBreadcrumb(items) {
        const breadcrumbEl = document.getElementById('breadcrumb');
        if (!breadcrumbEl) return;
        
        breadcrumbEl.innerHTML = items.map(item => 
            `<span class="breadcrumb-item">${item}</span>`
        ).join('');
    },
    
    // 鍒涘缓缁熻鍗＄墖
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
                    <span>杈冧笂鏈?/span>
                </div>
            </div>
        `;
    },
    
    // 鍒涘缓鏁版嵁琛ㄦ牸
    createTable(config) {
        const { columns, data, actions = [] } = config;
        
        let html = `
            <div class="table-container">
                <table class="table">
                    <thead>
                        <tr>
                            ${columns.map(col => `<th>${col.title}</th>`).join('')}
                            ${actions.length > 0 ? '<th>鎿嶄綔</th>' : ''}
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
                            <div class="empty-state-title">鏆傛棤鏁版嵁</div>
                        </div>
                    </td>
                </tr>
            `;
        } else {
            data.forEach((row, index) => {
                html += '<tr>';
                
                columns.forEach(col => {
                    let cellValue = row[col.key];
                    
                    // 搴旂敤鏍煎紡鍖栧嚱鏁?
                    if (col.formatter) {
                        cellValue = col.formatter(cellValue, row, index);
                    }
                    
                    html += `<td>${cellValue}</td>`;
                });
                
                // 娣诲姞鎿嶄綔鍒?
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
    
    // 鍒涘缓鍒嗛〉缁勪欢
    createPagination(config) {
        const { current, total, pageSize, onChange } = config;
        const totalPages = Math.ceil(total / pageSize);
        
        if (totalPages <= 1) return '';
        
        let html = '<div class="pagination">';
        
        // 涓婁竴椤?
        const prevDisabled = current <= 1 ? 'disabled' : '';
        html += `
            <a href="#" class="pagination-item ${prevDisabled}" data-page="${current - 1}">
                <i class="fas fa-chevron-left"></i>
            </a>
        `;
        
        // 椤电爜
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
        
        // 涓嬩竴椤?
        const nextDisabled = current >= totalPages ? 'disabled' : '';
        html += `
            <a href="#" class="pagination-item ${nextDisabled}" data-page="${current + 1}">
                <i class="fas fa-chevron-right"></i>
            </a>
        `;
        
        html += '</div>';
        
        // 娣诲姞浜嬩欢鐩戝惉
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
    
    // 鍒涘缓鎼滅储妗?
    createSearchBox(config) {
        const { placeholder = '鎼滅储...', onSearch, value = '' } = config;
        
        const html = `
            <div class="search-box">
                <i class="fas fa-search search-icon"></i>
                <input type="text" class="search-input" placeholder="${placeholder}" value="${value}">
            </div>
        `;
        
        // 娣诲姞浜嬩欢鐩戝惉
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
    
    // 鍒涘缓绛涢€夊櫒
    createFilters(config) {
        const { filters, onFilter } = config;
        
        let html = '<div class="filters">';
        
        filters.forEach(filter => {
            html += `
                <div class="filter-group">
                    <label class="filter-label">${filter.label}</label>
                    <select class="filter-select" data-key="${filter.key}">
                        <option value="">鍏ㄩ儴</option>
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
        
        // 娣诲姞浜嬩欢鐩戝惉
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
    
    // 鍒涘缓妯℃€佹
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
        
        // 娣诲姞鍒伴〉闈?
        document.body.insertAdjacentHTML('beforeend', html);
        
        const modal = document.getElementById(modalId);
        const closeBtn = modal.querySelector('.modal-close');
        
        // 鍏抽棴浜嬩欢
        const closeModal = () => {
            modal.classList.remove('show');
            setTimeout(() => {
                document.body.removeChild(modal);
                if (onClose) onClose();
            }, 300);
        };
        
        // X鎸夐挳浣跨敤鏅鸿兘鍏抽棴閫昏緫
        closeBtn.addEventListener('click', () => {
            this.handleCloseButtonClick(modal, closeModal);
        });
        
        // 鐐瑰嚮澶栭儴鍖哄煙鐨勬櫤鑳藉叧闂€昏緫
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.handleOverlayClick(modal, closeModal);
            }
        });
        
        // 鏄剧ず妯℃€佹
        setTimeout(() => {
            modal.classList.add('show');
        }, 10);
        
        return {
            modal,
            close: closeModal
        };
    },
    
    // 澶勭悊鍏抽棴鎸夐挳鐐瑰嚮锛圶鎸夐挳锛?
    handleCloseButtonClick(modal, closeModal) {
        // 鑾峰彇寮圭獥绫诲瀷
        const modalType = modal.getAttribute('data-modal-type');
        
        // 妫€鏌ユ槸鍚︿负鍙椾繚鎶ょ殑寮圭獥绫诲瀷
        if (modalType && AppConfig.MODAL_BEHAVIOR_TEMP.PROTECTED_MODALS.includes(modalType)) {
            // 鍙椾繚鎶ょ殑寮圭獥闇€瑕佺‘璁ゆ暟鎹涪澶?
            if (AppConfig.MODAL_BEHAVIOR_TEMP.CONFIRM_ON_DATA_LOSS) {
                const hasFormData = this.checkFormData(modal);
                
                if (hasFormData) {
                    if (confirm('鎮ㄦ湁鏈繚瀛樼殑鏁版嵁锛岀‘瀹氳鍏抽棴鍚楋紵')) {
                        closeModal();
                    }
                    return;
                }
            }
        }
        
        // 鏅€氬脊绐楁垨鍙椾繚鎶ゅ脊绐楁棤鏁版嵁鏃讹紝妫€鏌ユ槸鍚﹂渶瑕佺‘璁?
        if (AppConfig.MODAL_BEHAVIOR_TEMP.CONFIRM_ON_DATA_LOSS) {
            const hasFormData = this.checkFormData(modal);
            
            if (hasFormData) {
                if (confirm('鎮ㄦ湁鏈繚瀛樼殑鏁版嵁锛岀‘瀹氳鍏抽棴鍚楋紵')) {
                    closeModal();
                }
                return;
            }
        }
        
        // 鏃犳暟鎹垨涓嶉渶瑕佺‘璁ゆ椂鐩存帴鍏抽棴
        closeModal();
    },
    
    // 澶勭悊閬僵灞傜偣鍑?
    handleOverlayClick(modal, closeModal) {
        // 妫€鏌ラ厤缃槸鍚﹀厑璁哥偣鍑诲閮ㄥ叧闂?
        if (!AppConfig.MODAL_BEHAVIOR_TEMP.CLICK_OUTSIDE_TO_CLOSE) {
            return; // 涓嶅厑璁哥偣鍑诲閮ㄥ叧闂?
        }
        
        // 妫€鏌ユ槸鍚︿负鍙椾繚鎶ょ殑寮圭獥绫诲瀷
        const modalType = modal.getAttribute('data-modal-type');
        if (modalType && AppConfig.MODAL_BEHAVIOR_TEMP.PROTECTED_MODALS.includes(modalType)) {
            return; // 鍙椾繚鎶ょ殑寮圭獥涓嶅厑璁哥偣鍑诲閮ㄥ叧闂?
        }
        
        // 妫€鏌ユ槸鍚﹂渶瑕佺‘璁ゆ暟鎹涪澶?
        if (AppConfig.MODAL_BEHAVIOR_TEMP.CONFIRM_ON_DATA_LOSS) {
            const hasFormData = this.checkFormData(modal);
            
            if (hasFormData) {
                // 鏈夋暟鎹椂闇€瑕佺‘璁?
                if (confirm('鎮ㄦ湁鏈繚瀛樼殑鏁版嵁锛岀‘瀹氳鍏抽棴鍚楋紵')) {
                    closeModal();
                }
                return;
            }
        }
        
        // 鏃犳暟鎹垨涓嶉渶瑕佺‘璁ゆ椂鐩存帴鍏抽棴
        closeModal();
    },
    
    // 妫€鏌ヨ〃鍗曟槸鍚︽湁鏁版嵁
    checkFormData(modal) {
        const forms = modal.querySelectorAll('form');
        
        for (let form of forms) {
            const formData = new FormData(form);
            
            // 妫€鏌ユ槸鍚︽湁闈炵┖鐨勮緭鍏?
            for (let [key, value] of formData.entries()) {
                if (value && value.toString().trim() !== '') {
                    return true;
                }
            }
            
            // 妫€鏌ユ枃鏈煙鍜岄€夋嫨妗?
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
    
    // 鍒涘缓鍔犺浇鐘舵€?
    createLoading(text = '鍔犺浇涓?..') {
        return `
            <div class="loading-state">
                <div class="loading-spinner-sm"></div>
                <span>${text}</span>
            </div>
        `;
    },
    
    // 鏍煎紡鍖栫姸鎬佹爣绛?
    formatStatus(status) {
        const statusMap = {
            active: { text: '姝ｅ父', class: 'active' },
            inactive: { text: '绂佺敤', class: 'inactive' },
            deleted: { text: '宸插垹闄?, class: 'inactive' },
            pending: { text: '寰呭鏍?, class: 'pending' },
            approved: { text: '宸查€氳繃', class: 'active' },
            rejected: { text: '宸叉嫆缁?, class: 'inactive' }
        };
        
        const statusInfo = statusMap[status] || { text: status, class: 'draft' };
        return `<span class="status-badge ${statusInfo.class}">${statusInfo.text}</span>`;
    },
    
    // 鏍煎紡鍖栬鑹叉爣绛?
    formatRole(role) {
        const roleName = Auth.getRoleName(role);
        return `<span class="role-badge ${role}">${roleName}</span>`;
    }
};
