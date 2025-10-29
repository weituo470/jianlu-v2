/**
 * 消息导航栏组件
 * 处理顶部导航栏的消息通知功能
 */
window.MessageNavbar = (function() {
    'use strict';

    let isDropdownOpen = false;
    let unreadCount = 0;
    let refreshInterval = null;

    /**
     * 初始化消息导航栏
     */
    function init() {
        console.log('初始化消息导航栏...');
        bindEvents();
        startPolling();
        loadUnreadCount();
    }

    /**
     * 绑定事件
     */
    function bindEvents() {
        // 消息图标点击事件
        const messageIcon = document.getElementById('message-icon');
        if (messageIcon) {
            messageIcon.addEventListener('click', toggleMessageDropdown);
        }

        // 关闭下拉菜单事件
        const closeBtn = document.getElementById('close-message-dropdown');
        if (closeBtn) {
            closeBtn.addEventListener('click', hideMessageDropdown);
        }

        // 点击外部关闭下拉菜单
        document.addEventListener('click', function(e) {
            const messageNotification = document.querySelector('.message-notification');
            if (messageNotification && !messageNotification.contains(e.target)) {
                hideMessageDropdown();
            }
        });

        // 查看全部消息按钮
        const viewAllBtn = document.querySelector('.view-all-messages-btn');
        if (viewAllBtn) {
            viewAllBtn.addEventListener('click', function(e) {
                e.preventDefault();
                navigateToMessages();
            });
        }

        // 全部标记已读按钮
        const markAllReadBtn = document.querySelector('.mark-all-read-btn');
        if (markAllReadBtn) {
            markAllReadBtn.addEventListener('click', function(e) {
                e.preventDefault();
                markAllAsRead();
            });
        }

        // 消息项点击事件
        document.addEventListener('click', function(e) {
            const messageItem = e.target.closest('.message-item');
            if (messageItem) {
                const messageId = messageItem.getAttribute('data-id');
                if (messageId) {
                    viewMessage(messageId);
                }
            }
        });
    }

    /**
     * 切换消息下拉菜单显示状态
     */
    function toggleMessageDropdown() {
        if (isDropdownOpen) {
            hideMessageDropdown();
        } else {
            showMessageDropdown();
        }
    }

    /**
     * 显示消息下拉菜单
     */
    function showMessageDropdown() {
        isDropdownOpen = true;
        const dropdown = document.getElementById('message-dropdown');
        if (dropdown) {
            dropdown.classList.add('show');
        }
        loadRecentMessages();
    }

    /**
     * 隐藏消息下拉菜单
     */
    function hideMessageDropdown() {
        isDropdownOpen = false;
        const dropdown = document.getElementById('message-dropdown');
        if (dropdown) {
            dropdown.classList.remove('show');
        }
    }

    /**
     * 开始轮询未读消息数量
     */
    function startPolling() {
        // 立即检查一次
        loadUnreadCount();

        // 每2分钟检查一次
        refreshInterval = setInterval(loadUnreadCount, 120000);
    }

    /**
     * 停止轮询
     */
    function stopPolling() {
        if (refreshInterval) {
            clearInterval(refreshInterval);
            refreshInterval = null;
        }
    }

    /**
     * 加载未读消息数量
     */
    async function loadUnreadCount() {
        try {
            const token = window.Utils.storage.get(window.AppConfig.TOKEN_KEY);
            if (!token) {
                console.warn('未找到认证token，跳过加载未读消息');
                return;
            }

            const response = await fetch(`${window.AppConfig.API_BASE_URL}/messages/unread-count`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const result = await response.json();
                updateUnreadCount(result.data.unread_count);
            }
        } catch (error) {
            console.error('加载未读消息数量失败:', error);
        }
    }

    /**
     * 更新未读消息数量显示
     */
    function updateUnreadCount(count) {
        unreadCount = count;
        const badge = document.getElementById('message-badge');

        if (badge) {
            if (count > 0) {
                badge.textContent = count > 99 ? '99+' : count;
                badge.classList.add('show');
            } else {
                badge.classList.remove('show');
            }
        }
    }

    /**
     * 加载最近消息
     */
    async function loadRecentMessages() {
        try {
            const token = window.Utils.storage.get(window.AppConfig.TOKEN_KEY);
            if (!token) {
                console.warn('未找到认证token，跳过加载最近消息');
                return;
            }

            // 显示加载状态
            const loadingElement = document.getElementById('message-loading');
            const listElement = document.getElementById('message-list');
            if (loadingElement) loadingElement.style.display = 'block';
            if (listElement) listElement.style.display = 'none';

            const response = await fetch(`${window.AppConfig.API_BASE_URL}/messages?limit=5&unread_only=true`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const result = await response.json();
                renderMessageList(result.data.messages);
            } else {
                throw new Error('加载消息失败');
            }
        } catch (error) {
            console.error('加载最近消息失败:', error);
            showErrorState();
        } finally {
            const loadingElement = document.getElementById('message-loading');
            if (loadingElement) loadingElement.style.display = 'none';
        }
    }

    /**
     * 渲染消息列表
     */
    function renderMessageList(messages) {
        const messageList = document.getElementById('message-list');

        if (!messageList) return;

        if (messages.length === 0) {
            showEmptyState();
            return;
        }

        const messagesHtml = messages.map(message => createMessageHtml(message)).join('');
        messageList.innerHTML = messagesHtml;
        messageList.style.display = 'block';
    }

    /**
     * 创建消息HTML
     */
    function createMessageHtml(message) {
        const typeClass = `message-type ${message.type}`;
        const priorityClass = `message-priority ${message.priority}`;
        // 使用新的用户消息状态来判断是否未读
        const isRead = message.user_message_state ? message.user_message_state.is_read : message.is_read;
        const unreadClass = isRead ? '' : 'unread';
        const timeAgo = formatTimeAgo(message.created_at);

        return `
            <div class="message-item ${unreadClass}" data-id="${message.id}">
                <div class="message-header">
                    <h6 class="message-title ${unreadClass}">${escapeHtml(message.title)}</h6>
                    <div class="message-meta">
                        <span class="${typeClass}">${getTypeText(message.type)}</span>
                        <span class="${priorityClass}">${getPriorityText(message.priority)}</span>
                    </div>
                </div>
                <p class="message-content">${escapeHtml(message.content)}</p>
                <div class="message-time">${timeAgo}</div>
            </div>
        `;
    }

    /**
     * 显示空状态
     */
    function showEmptyState() {
        const emptyHtml = `
            <div class="no-messages">
                <i class="fas fa-inbox"></i>
                <p>暂无未读消息</p>
            </div>
        `;
        const messageList = document.getElementById('message-list');
        if (messageList) {
            messageList.innerHTML = emptyHtml;
            messageList.style.display = 'block';
        }
    }

    /**
     * 显示错误状态
     */
    function showErrorState() {
        const errorHtml = `
            <div class="no-messages">
                <i class="fas fa-exclamation-triangle"></i>
                <p>加载失败，请重试</p>
            </div>
        `;
        const messageList = document.getElementById('message-list');
        if (messageList) {
            messageList.innerHTML = errorHtml;
            messageList.style.display = 'block';
        }
    }

    /**
     * 查看消息详情
     */
    async function viewMessage(messageId) {
        try {
            const token = window.Utils.storage.get(window.AppConfig.TOKEN_KEY);
            if (!token) {
                console.warn('未找到认证token，无法查看消息');
                return;
            }

            // 标记消息为已读
            await fetch(`${window.AppConfig.API_BASE_URL}/messages/${messageId}/read`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            // 关闭下拉菜单
            hideMessageDropdown();

            // 导航到消息管理页面
            navigateToMessages();

            // 更新未读计数
            loadUnreadCount();
        } catch (error) {
            console.error('查看消息失败:', error);
            if (window.App && window.App.showAlert) {
                window.App.showAlert('查看消息失败', 'error');
            }
        }
    }

    /**
     * 全部标记已读
     */
    async function markAllAsRead() {
        try {
            const token = window.Utils.storage.get(window.AppConfig.TOKEN_KEY);
            if (!token) {
                console.warn('未找到认证token，无法标记消息');
                return;
            }

            const response = await fetch(`${window.AppConfig.API_BASE_URL}/messages/read-all`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                // 更新显示
                updateUnreadCount(0);
                loadRecentMessages();
                if (window.App && window.App.showAlert) {
                    window.App.showAlert('全部消息已标记为已读', 'success');
                }
            } else {
                throw new Error('标记失败');
            }
        } catch (error) {
            console.error('全部标记已读失败:', error);
            if (window.App && window.App.showAlert) {
                window.App.showAlert('标记失败', 'error');
            }
        }
    }

    /**
     * 导航到消息管理页面
     */
    function navigateToMessages() {
        hideMessageDropdown();

        // 使用路由导航或直接跳转
        if (window.Router && typeof window.Router.navigate === 'function') {
            window.Router.navigate('/messages/inbox');
        } else {
            window.location.href = '/messages/inbox';
        }
    }

    /**
     * 格式化时间
     */
    function formatTimeAgo(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) {
            return '刚刚';
        } else if (diffMins < 60) {
            return `${diffMins}分钟前`;
        } else if (diffHours < 24) {
            return `${diffHours}小时前`;
        } else if (diffDays < 7) {
            return `${diffDays}天前`;
        } else {
            return date.toLocaleDateString('zh-CN');
        }
    }

    /**
     * 获取消息类型文本
     */
    function getTypeText(type) {
        const types = {
            'system': '系统',
            'personal': '个人',
            'activity': '活动',
            'team': '团队',
            'announcement': '公告'
        };
        return types[type] || '其他';
    }

    /**
     * 获取优先级文本
     */
    function getPriorityText(priority) {
        const priorities = {
            'urgent': '紧急',
            'high': '高',
            'normal': '普通',
            'low': '低'
        };
        return priorities[priority] || '普通';
    }

    /**
     * HTML转义
     */
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * 手动刷新
     */
    function refresh() {
        loadUnreadCount();
        if (isDropdownOpen) {
            loadRecentMessages();
        }
    }

    /**
     * 获取未读数量
     */
    function getUnreadCount() {
        return unreadCount;
    }

    // 公共API
    return {
        init: init,
        refresh: refresh,
        getUnreadCount: getUnreadCount,
        hideMessageDropdown: hideMessageDropdown,
        stopPolling: stopPolling
    };
})();

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    // 多次尝试初始化，确保在正确的时机加载
    let attempts = 0;
    const maxAttempts = 5;

    function tryInit() {
        attempts++;
        console.log(`尝试初始化消息导航栏 (${attempts}/${maxAttempts})...`);

        // 检查依赖模块是否存在
        if (!window.Auth) {
            console.warn('Auth模块未找到，稍后重试...');
            if (attempts < maxAttempts) {
                setTimeout(tryInit, 1000);
            } else {
                console.error('Auth模块加载失败，消息导航栏无法初始化');
            }
            return;
        }

        if (!window.Auth.isLoggedIn()) {
            console.log('用户未登录，跳过消息导航栏初始化');
            return;
        }

        // 检查DOM元素是否存在
        if (!document.getElementById('message-icon')) {
            console.warn('消息图标DOM元素未找到，稍后重试...');
            if (attempts < maxAttempts) {
                setTimeout(tryInit, 1000);
            } else {
                console.error('消息图标DOM元素未找到，消息导航栏无法初始化');
            }
            return;
        }

        // 所有条件满足，初始化组件
        console.log('所有条件满足，开始初始化消息导航栏...');
        try {
            window.MessageNavbar.init();
            console.log('✅ 消息导航栏初始化成功');
        } catch (error) {
            console.error('❌ 消息导航栏初始化失败:', error);
        }
    }

    // 首次尝试
    setTimeout(tryInit, 500);
});

// 也暴露给全局，以便手动调用
if (typeof window !== 'undefined') {
    window.MessageNavbarInit = function() {
        if (window.Auth && window.Auth.isLoggedIn()) {
            window.MessageNavbar.init();
        }
    };
}