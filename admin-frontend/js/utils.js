// Utils library

window.Utils = {
    // Local storage utilities
    storage: {
        set(key, value) {
            try {
                // 特殊处理：token是纯字符串，直接存储
                if (key === 'token' || key.includes('token')) {
                    localStorage.setItem(key, value);
                } else {
                    // 其他数据JSON序列化存储
                    localStorage.setItem(key, JSON.stringify(value));
                }
                return true;
            } catch (error) {
                console.error('Storage set error:', error);
                return false;
            }
        },
        
        get(key, defaultValue = null) {
            try {
                const item = localStorage.getItem(key);
                if (!item) return defaultValue;
                
                // 特殊处理：token是纯字符串，不需要JSON解析
                if (key === 'token' || key.includes('token')) {
                    return item;
                }
                
                // 其他数据尝试JSON解析
                try {
                    return JSON.parse(item);
                } catch (parseError) {
                    // 如果JSON解析失败，返回原始字符串
                    console.warn('JSON解析失败，返回原始值:', key, parseError.message);
                    return item;
                }
            } catch (error) {
                console.error('Storage get error:', error);
                return defaultValue;
            }
        },
        
        remove(key) {
            try {
                localStorage.removeItem(key);
                return true;
            } catch (error) {
                console.error('Storage remove error:', error);
                return false;
            }
        },
        
        clear() {
            try {
                localStorage.clear();
                return true;
            } catch (error) {
                console.error('Storage clear error:', error);
                return false;
            }
        }
    },
    
    // Toast notifications
    toast: {
        show(message, type = 'info', duration = 3000) {
            const container = document.getElementById('toast-container');
            if (!container) return;
            
            const toast = document.createElement('div');
            toast.className = `toast ${type}`;
            
            const icon = this.getIcon(type);
            toast.innerHTML = `
                <i class="${icon}"></i>
                <span>${message}</span>
            `;
            
            container.appendChild(toast);
            
            // Auto remove
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, duration);
            
            // Click to remove
            toast.addEventListener('click', () => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            });
        },
        
        success(message, duration) {
            this.show(message, 'success', duration);
        },
        
        error(message, duration) {
            this.show(message, 'error', duration);
        },
        
        warning(message, duration) {
            this.show(message, 'warning', duration);
        },
        
        info(message, duration) {
            this.show(message, 'info', duration);
        },
        
        getIcon(type) {
            const icons = {
                success: 'fas fa-check-circle',
                error: 'fas fa-exclamation-circle',
                warning: 'fas fa-exclamation-triangle',
                info: 'fas fa-info-circle'
            };
            return icons[type] || icons.info;
        }
    },
    
    // Number utilities
    number: {
        format(num) {
            if (typeof num !== 'number') {
                return String(num);
            }
            return num.toLocaleString();
        },
        
        currency(num, currency = 'CNY') {
            if (typeof num !== 'number') {
                return String(num);
            }
            return new Intl.NumberFormat('zh-CN', {
                style: 'currency',
                currency: currency
            }).format(num);
        },
        
        percentage(num, decimals = 1) {
            if (typeof num !== 'number') {
                return String(num);
            }
            return (num * 100).toFixed(decimals) + '%';
        },
        
        fileSize(bytes) {
            if (typeof bytes !== 'number') {
                return String(bytes);
            }
            
            const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
            if (bytes === 0) return '0 B';
            
            const i = Math.floor(Math.log(bytes) / Math.log(1024));
            return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
        }
    },
    
    // Date utilities
    date: {
        format(date, format = 'YYYY-MM-DD HH:mm:ss') {
            if (!date) return '';
            
            const d = new Date(date);
            if (isNaN(d.getTime())) return String(date);
            
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            const hours = String(d.getHours()).padStart(2, '0');
            const minutes = String(d.getMinutes()).padStart(2, '0');
            const seconds = String(d.getSeconds()).padStart(2, '0');
            
            return format
                .replace('YYYY', year)
                .replace('MM', month)
                .replace('DD', day)
                .replace('HH', hours)
                .replace('mm', minutes)
                .replace('ss', seconds);
        },
        
        relative(date) {
            if (!date) return '';
            
            const d = new Date(date);
            if (isNaN(d.getTime())) return String(date);
            
            const now = new Date();
            const diff = now - d;
            const seconds = Math.floor(diff / 1000);
            const minutes = Math.floor(seconds / 60);
            const hours = Math.floor(minutes / 60);
            const days = Math.floor(hours / 24);
            
            if (days > 0) return `${days}天前`;
            if (hours > 0) return `${hours}小时前`;
            if (minutes > 0) return `${minutes}分钟前`;
            return '刚刚';
        }
    },
    
    // String utilities
    string: {
        truncate(str, length = 50, suffix = '...') {
            if (!str || str.length <= length) return str;
            return str.substring(0, length) + suffix;
        },
        
        capitalize(str) {
            if (!str) return '';
            return str.charAt(0).toUpperCase() + str.slice(1);
        },
        
        camelCase(str) {
            return str.replace(/-([a-z])/g, (g) => g[1].toUpperCase());
        },
        
        kebabCase(str) {
            return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
        }
    },
    
    // URL utilities
    url: {
        getParams() {
            const params = {};
            const searchParams = new URLSearchParams(window.location.search);
            for (const [key, value] of searchParams) {
                params[key] = value;
            }
            return params;
        },
        
        setParams(params) {
            const url = new URL(window.location);
            Object.keys(params).forEach(key => {
                if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
                    url.searchParams.set(key, params[key]);
                } else {
                    url.searchParams.delete(key);
                }
            });
            window.history.replaceState({}, '', url);
        }
    },
    
    // Validation utilities
    validate: {
        email(email) {
            const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            return re.test(email);
        },
        
        phone(phone) {
            const re = /^1[3-9]\d{9}$/;
            return re.test(phone);
        },
        
        url(url) {
            try {
                new URL(url);
                return true;
            } catch {
                return false;
            }
        },
        
        required(value) {
            return value !== null && value !== undefined && value !== '';
        },
        
        minLength(value, min) {
            return value && value.length >= min;
        },
        
        maxLength(value, max) {
            return !value || value.length <= max;
        }
    },
    
    // DOM utilities
    dom: {
        $(selector, context = document) {
            return context.querySelector(selector);
        },
        
        $$(selector, context = document) {
            return Array.from(context.querySelectorAll(selector));
        },
        
        create(tag, attributes = {}, content = '') {
            const element = document.createElement(tag);
            
            Object.keys(attributes).forEach(key => {
                if (key === 'className') {
                    element.className = attributes[key];
                } else if (key === 'innerHTML') {
                    element.innerHTML = attributes[key];
                } else {
                    element.setAttribute(key, attributes[key]);
                }
            });
            
            if (content) {
                element.textContent = content;
            }
            
            return element;
        },
        
        remove(element) {
            if (element && element.parentNode) {
                element.parentNode.removeChild(element);
            }
        }
    },
    
    // Debounce and throttle
    debounce(func, wait, immediate = false) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                timeout = null;
                if (!immediate) func(...args);
            };
            const callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            if (callNow) func(...args);
        };
    },
    
    throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },
    
    // Deep clone
    deepClone(obj) {
        if (obj === null || typeof obj !== 'object') return obj;
        if (obj instanceof Date) return new Date(obj.getTime());
        if (obj instanceof Array) return obj.map(item => this.deepClone(item));
        if (typeof obj === 'object') {
            const clonedObj = {};
            Object.keys(obj).forEach(key => {
                clonedObj[key] = this.deepClone(obj[key]);
            });
            return clonedObj;
        }
    },
    
    // Generate random ID
    generateId(prefix = 'id') {
        return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    },
    
    // Delay execution
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    },
    
    // 头像处理工具
    avatar: {
        // 获取用户头像URL，带错误处理
        getUserAvatar(user, size = 32) {
            if (!user) return null;

            // 如果用户有自定义头像且URL有效
            if (user.profile?.avatar && user.profile.avatar !== 'null' && user.profile.avatar !== 'undefined' && user.profile.avatar.trim() !== '') {
                return user.profile.avatar;
            }

            // 返回null，让createAvatarHtml处理默认头像
            return null;
        },
        
        // 获取团队头像URL，带错误处理
        getTeamAvatar(team, size = 60) {
            if (!team) return null;

            // 如果团队有自定义头像且URL有效
            if (team.avatar_url && team.avatar_url !== 'null' && team.avatar_url !== 'undefined' && team.avatar_url.trim() !== '') {
                return team.avatar_url;
            }

            // 返回null，让createAvatarHtml处理默认头像
            return null;
        },
        
        // 生成带错误处理的头像HTML
        createAvatarHtml(url, alt, size = 32, className = '', type = 'user') {
            // 创建默认头像 - 根据类型使用不同图标
            const icon = type === 'team' ? 'fa-users' : 'fa-user';

            // 确保URL是有效的
            if (!url || url === 'null' || url === 'undefined' || url.trim() === '') {
                return `<div class="${className} d-flex align-items-center justify-content-center bg-light rounded-circle" style="width: ${size}px; height: ${size}px;"><i class="fas ${icon} text-muted"></i></div>`;
            }

            // 为图片添加唯一的ID以便于错误处理
            const imgId = 'avatar_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

            return `
                <img id="${imgId}" src="${url}" alt="${alt}" class="${className}" width="${size}" height="${size}"
                     onerror="this.style.display='none';
                              const defaultDiv = document.createElement('div');
                              defaultDiv.className = '${className} d-flex align-items-center justify-content-center bg-light rounded-circle';
                              defaultDiv.style.width = '${size}px';
                              defaultDiv.style.height = '${size}px';
                              defaultDiv.innerHTML = '<i class=\\'fas ${icon} text-muted\\'></i>';
                              this.parentNode.insertBefore(defaultDiv, this.nextSibling);">
            `;
        }
    },
    
    // Modal utilities
    modal: {
        show(title, content, options = {}) {
            // 创建遮罩层
            const overlay = document.createElement('div');
            overlay.className = 'modal-overlay show';
            
            // 设置弹窗类型（用于行为控制）
            if (options.modalType) {
                overlay.setAttribute('data-modal-type', options.modalType);
            }
            
            // 创建弹窗内容
            const modal = document.createElement('div');
            modal.className = 'modal';
            
            // 弹窗HTML结构
            modal.innerHTML = `
                <div class="modal-header">
                    <h3 class="modal-title">${title}</h3>
                    <button class="modal-close" type="button">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    ${content}
                </div>
            `;
            
            overlay.appendChild(modal);
            document.body.appendChild(overlay);
            
            // 保存overlay引用
            this.overlay = overlay;
            
            // 绑定关闭按钮事件（使用智能关闭）
            const closeBtn = modal.querySelector('.modal-close');
            closeBtn.addEventListener('click', () => {
                this.handleCloseButtonClick();
            });
            
            // 点击遮罩层关闭模态框（带确认机制）
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    this.handleOverlayClick();
                }
            });
            
            return this;
        },
        
        // 处理关闭按钮点击（X按钮）
        handleCloseButtonClick() {
            // X按钮也要遵循智能关闭规则
            
            // 检查是否为受保护的弹窗类型
            const modalType = this.overlay.getAttribute('data-modal-type');
            if (modalType && AppConfig.MODAL_BEHAVIOR_TEMP.PROTECTED_MODALS.includes(modalType)) {
                // 受保护的弹窗需要确认数据丢失
                if (AppConfig.MODAL_BEHAVIOR_TEMP.CONFIRM_ON_DATA_LOSS) {
                    const hasFormData = this.checkFormData();
                    
                    if (hasFormData) {
                        if (confirm('您有未保存的数据，确定要关闭吗？')) {
                            this.close();
                        }
                        return;
                    }
                }
            }
            
            // 普通弹窗或受保护弹窗无数据时，检查是否需要确认
            if (AppConfig.MODAL_BEHAVIOR_TEMP.CONFIRM_ON_DATA_LOSS) {
                const hasFormData = this.checkFormData();
                
                if (hasFormData) {
                    if (confirm('您有未保存的数据，确定要关闭吗？')) {
                        this.close();
                    }
                    return;
                }
            }
            
            // 无数据或不需要确认时直接关闭
            this.close();
        },
        
        // 处理遮罩层点击
        handleOverlayClick() {
            // 检查配置是否允许点击外部关闭
            if (!AppConfig.MODAL_BEHAVIOR_TEMP.CLICK_OUTSIDE_TO_CLOSE) {
                return; // 不允许点击外部关闭
            }
            
            // 检查是否为受保护的弹窗类型
            const modalType = this.overlay.getAttribute('data-modal-type');
            if (modalType && AppConfig.MODAL_BEHAVIOR_TEMP.PROTECTED_MODALS.includes(modalType)) {
                return; // 受保护的弹窗不允许点击外部关闭
            }
            
            // 检查是否需要确认数据丢失
            if (AppConfig.MODAL_BEHAVIOR_TEMP.CONFIRM_ON_DATA_LOSS) {
                const hasFormData = this.checkFormData();
                
                if (hasFormData) {
                    // 有数据时需要确认
                    if (confirm('您有未保存的数据，确定要关闭吗？')) {
                        this.close();
                    }
                    return;
                }
            }
            
            // 无数据或不需要确认时直接关闭
            this.close();
        },
        
        // 检查表单是否有数据
        checkFormData() {
            const forms = this.overlay.querySelectorAll('form');
            
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

        close() {
            if (this.overlay && this.overlay.parentNode) {
                this.overlay.parentNode.removeChild(this.overlay);
            }
        }
    }
};