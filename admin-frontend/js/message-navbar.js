/**
 * 消息导航栏模块 - 完全重写版本
 * 简化的消息显示系统，确保内容完整显示
 */
window.MessageNavbar = (function() {
    'use strict';

    let unreadCount = 0;
    let messages = [];
    let refreshInterval = null;

    /**
     * 初始化
     */
    function init() {
        console.log('🎉 初始化全新消息系统...');
        bindEvents();
        startAutoRefresh();
        loadUnreadCount();
        loadRecentMessages();
    }

    /**
     * 绑定事件
     */
    function bindEvents() {
        // 消息图标点击
        document.getElementById('message-icon')?.addEventListener('click', toggleMessageDropdown);

        // 关闭按钮
        document.getElementById('close-message-dropdown')?.addEventListener('click', hideMessageDropdown);

        // 标记全部已读
        document.querySelector('.mark-all-read-btn')?.addEventListener('click', markAllAsRead);

        // 查看全部消息
        document.querySelector('.view-all-messages-btn')?.addEventListener('click', (e) => {
            e.preventDefault();
            window.location.href = '/messages/inbox';
        });

        // 点击外部关闭下拉框
        document.addEventListener('click', function(e) {
            const dropdown = document.getElementById('message-dropdown');
            const icon = document.getElementById('message-icon');

            if (dropdown && icon && !dropdown.contains(e.target) && !icon.contains(e.target)) {
                hideMessageDropdown();
            }
        });
    }

    /**
     * 加载未读数量
     */
    async function loadUnreadCount() {
        try {
            const token = window.Auth?.getToken();
            if (!token) return;

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
            console.error('加载未读数量失败:', error);
        }
    }

    /**
     * 加载最近消息
     */
    async function loadRecentMessages() {
        try {
            const token = window.Auth?.getToken();
            if (!token) return;

            const response = await fetch(`${window.AppConfig.API_BASE_URL}/messages?limit=5`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const result = await response.json();
                messages = result.data.messages || [];
                renderMessages();
            }
        } catch (error) {
            console.error('加载消息失败:', error);
        }
    }

    /**
     * 更新未读数量显示
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
     * 渲染消息列表 - 全新简化版本
     */
    function renderMessages() {
        const container = document.getElementById('message-list');
        if (!container) return;

        if (messages.length === 0) {
            container.innerHTML = `
                <div class="no-messages">
                    <i class="fas fa-inbox"></i>
                    <p>暂无消息</p>
                </div>
            `;
            return;
        }

        const messagesHtml = messages.map(message => {
            const isRead = message.user_message_state ? message.user_message_state.is_read : message.is_read;
            const unreadClass = isRead ? '' : 'unread';
            const timeAgo = formatTimeAgo(message.created_at);

            return `
                <div class="message-item ${unreadClass}" data-id="${message.id}">
                    <div class="message-header">
                        <h6 class="message-title ${unreadClass}">${escapeHtml(message.title)}</h6>
                        <div class="message-meta">
                            <span class="message-type">${getTypeText(message.type)}</span>
                            <span class="message-priority">${getPriorityText(message.priority)}</span>
                        </div>
                    </div>
                    <div class="message-content-full">
                        ${escapeHtml(message.content)}
                    </div>
                    <div class="message-time">${timeAgo}</div>
                </div>
            `;
        }).join('');

        container.innerHTML = messagesHtml;

        // 绑定消息点击事件
        container.querySelectorAll('.message-item').forEach(item => {
            item.addEventListener('click', function() {
                const messageId = this.dataset.id;
                showMessageDetail(messageId);
            });
        });
    }

    /**
     * 显示消息详情 - 新建模态框
     */
    function showMessageDetail(messageId) {
        const message = messages.find(m => m.id === messageId);
        if (!message) return;

        // 创建模态框
        const modalHtml = `
            <div class="modal fade message-detail-modal" id="messageDetailModal" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">${escapeHtml(message.title)}</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div class="message-detail-content">
                                <div class="mb-3">
                                    <strong>类型：</strong> ${getTypeText(message.type)}
                                    <span class="ms-3"><strong>优先级：</strong> ${getPriorityText(message.priority)}</span>
                                </div>
                                <div class="message-full-content">
                                    <pre style="white-space: pre-wrap; font-family: inherit; line-height: 1.5;">${escapeHtml(message.content)}</pre>
                                </div>
                                <div class="mt-3 text-muted small">
                                    <i class="far fa-clock"></i> ${new Date(message.created_at).toLocaleString('zh-CN')}
                                    ${message.sender ? `| 发送人：${message.sender.username}` : ''}
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">关闭</button>
                            ${!message.is_read ? '<button type="button" class="btn btn-primary mark-read-btn">标记已读</button>' : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;

        // 移除现有模态框
        document.getElementById('messageDetailModal')?.remove();

        // 添加新模态框
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        const modal = document.getElementById('messageDetailModal');
        let modalInstance = null;

        if (window.bootstrap) {
            modalInstance = new window.bootstrap.Modal(modal);
        }

        // 绑定标记已读按钮
        modal.querySelector('.mark-read-btn')?.addEventListener('click', function() {
            markAsRead(messageId);
            modalInstance.hide();
        });

        // 显示模态框
        if (modalInstance) {
            modalInstance.show();
        }
    }

    /**
     * 显示/隐藏消息下拉框
     */
    function toggleMessageDropdown(e) {
        e.stopPropagation();
        const dropdown = document.getElementById('message-dropdown');

        if (dropdown.classList.contains('show')) {
            hideMessageDropdown();
        } else {
            showMessageDropdown();
        }
    }

    /**
     * 显示消息下拉框
     */
    function showMessageDropdown() {
        const dropdown = document.getElementById('message-dropdown');
        if (dropdown) {
            dropdown.classList.add('show');
            loadRecentMessages(); // 刷新消息
        }
    }

    /**
     * 隐藏消息下拉框
     */
    function hideMessageDropdown() {
        const dropdown = document.getElementById('message-dropdown');
        if (dropdown) {
            dropdown.classList.remove('show');
        }
    }

    /**
     * 标记消息已读
     */
    async function markAsRead(messageId) {
        try {
            const token = window.Auth?.getToken();
            if (!token) return;

            const response = await fetch(`${window.AppConfig.API_BASE_URL}/messages/${messageId}/read`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                // 更新本地消息状态
                const message = messages.find(m => m.id === messageId);
                if (message) {
                    message.is_read = true;
                    if (message.user_message_state) {
                        message.user_message_state.is_read = true;
                    }
                }

                // 重新渲染
                renderMessages();
                loadUnreadCount();
            }
        } catch (error) {
            console.error('标记已读失败:', error);
        }
    }

    /**
     * 标记全部已读
     */
    async function markAllAsRead() {
        try {
            const token = window.Auth?.getToken();
            if (!token) return;

            const response = await fetch(`${window.AppConfig.API_BASE_URL}/messages/read-all`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                // 更新本地状态
                messages.forEach(message => {
                    message.is_read = true;
                    if (message.user_message_state) {
                        message.user_message_state.is_read = true;
                    }
                });

                updateUnreadCount(0);
                renderMessages();
                hideMessageDropdown();
            }
        } catch (error) {
            console.error('标记全部已读失败:', error);
        }
    }

    /**
     * 开始自动刷新
     */
    function startAutoRefresh() {
        // 清除现有定时器
        if (refreshInterval) {
            clearInterval(refreshInterval);
        }

        // 每30秒刷新一次
        refreshInterval = setInterval(() => {
            loadUnreadCount();
        }, 30000);
    }

    /**
     * 停止自动刷新
     */
    function stopAutoRefresh() {
        if (refreshInterval) {
            clearInterval(refreshInterval);
            refreshInterval = null;
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

        if (diffMins < 1) {
            return '刚刚';
        } else if (diffMins < 60) {
            return `${diffMins}分钟前`;
        } else if (diffMins < 1440) {
            return `${Math.floor(diffMins / 60)}小时前`;
        } else {
            return date.toLocaleDateString('zh-CN');
        }
    }

    /**
     * 获取消息类型文本
     */
    function getTypeText(type) {
        const types = {
            'system': '系统消息',
            'personal': '个人消息',
            'activity': '活动消息',
            'team': '团队消息',
            'announcement': '系统公告'
        };
        return types[type] || '其他';
    }

    /**
     * 获取优先级文本
     */
    function getPriorityText(priority) {
        const priorities = {
            'low': '低',
            'normal': '普通',
            'high': '高',
            'urgent': '紧急'
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
     * 刷新
     */
    function refresh() {
        loadUnreadCount();
        loadRecentMessages();
    }

    // 公共API
    return {
        init: init,
        refresh: refresh,
        hideMessageDropdown: hideMessageDropdown,
        stopAutoRefresh: stopAutoRefresh
    };
})();

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    if (window.Auth && window.Auth.isLoggedIn()) {
        window.MessageNavbar.init();
    }
});