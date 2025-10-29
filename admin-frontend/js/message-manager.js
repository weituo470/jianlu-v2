/**
 * 消息管理页面模块
 * 处理消息列表、过滤、搜索、分页等功能
 */
window.MessageManager = (function() {
    'use strict';

    let currentPage = 1;
    let pageSize = 20;
    let currentFilter = 'all';
    let currentType = '';
    let currentPriority = '';
    let currentSearch = '';
    let pageType = 'all'; // 'all', 'inbox', 'sent'
    let messages = [];
    let totalCount = 0;
    let isLoading = false;

    /**
     * 初始化消息管理页面
     */
    function init(type = 'all') {
        pageType = type;
        currentPage = 1; // 重置页码
        console.log(`🎨 初始化消息管理页面 (${type})...`);
        bindEvents();
        loadMessages();
    }

    /**
     * 绑定事件
     */
    function bindEvents() {
        // 搜索按钮
        document.getElementById('search-messages-btn')?.addEventListener('click', performSearch);

        // 搜索框回车
        document.getElementById('search-input')?.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                performSearch();
            }
        });

        // 过滤器
        document.getElementById('message-filter')?.addEventListener('change', function() {
            currentFilter = this.value;
            currentPage = 1;
            loadMessages();
        });

        document.getElementById('message-type-filter')?.addEventListener('change', function() {
            currentType = this.value;
            currentPage = 1;
            loadMessages();
        });

        document.getElementById('message-priority-filter')?.addEventListener('change', function() {
            currentPriority = this.value;
            currentPage = 1;
            loadMessages();
        });

        // 消息操作按钮
        document.addEventListener('click', function(e) {
            if (e.target.classList.contains('mark-read-btn')) {
                const messageId = e.target.dataset.messageId;
                markAsRead(messageId);
            } else if (e.target.classList.contains('mark-unread-btn')) {
                const messageId = e.target.dataset.messageId;
                markAsUnread(messageId);
            } else if (e.target.classList.contains('delete-message-btn')) {
                const messageId = e.target.dataset.messageId;
                deleteMessage(messageId);
            } else if (e.target.classList.contains('refresh-messages-btn')) {
                loadMessages();
            }
        });
    }

    /**
     * 加载消息列表
     */
    async function loadMessages() {
        if (isLoading) return;

        isLoading = true;
        showLoading();

        try {
            const token = window.Auth?.getToken();
            if (!token) {
                Utils.toast.error('请先登录');
                return;
            }

            // 构建查询参数
            const params = new URLSearchParams({
                page: currentPage,
                limit: pageSize
            });

            if (currentSearch) {
                params.append('search', currentSearch);
            }

            // 根据页面类型设置参数
            if (pageType === 'inbox' || pageType === 'messages') {
                params.append('filter', 'received');
            } else if (pageType === 'sent') {
                params.append('filter', 'sent');
            } else {
                // 主页面使用过滤器
                if (currentFilter !== 'all') {
                    params.append('filter', currentFilter);
                }
            }

            if (currentType) {
                params.append('type', currentType);
            }

            if (currentPriority) {
                params.append('priority', currentPriority);
            }

            const response = await fetch(`${window.AppConfig.API_BASE_URL}/messages?${params}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const result = await response.json();
                messages = result.data.messages || [];
                totalCount = result.data.pagination?.total_count || 0;

                renderMessages();
                updatePagination();
                updateStatistics();
            } else {
                Utils.toast.error('加载消息失败');
            }
        } catch (error) {
            console.error('加载消息失败:', error);
            Utils.toast.error('网络错误，请稍后重试');
        } finally {
            isLoading = false;
            hideLoading();
        }
    }

    /**
     * 渲染消息列表
     */
    function renderMessages() {
        const container = document.getElementById('message-list');
        if (!container) return;

        if (messages.length === 0) {
            container.innerHTML = `
                <div class="text-center py-5">
                    <i class="fas fa-inbox fa-3x text-muted mb-3"></i>
                    <h5 class="text-muted">暂无消息</h5>
                    <p class="text-muted">没有符合条件的消息</p>
                </div>
            `;
            return;
        }

        const messagesHtml = messages.map(message => {
            const isRead = message.user_message_state ? message.user_message_state.is_read : message.is_read;
            const unreadClass = isRead ? '' : 'unread';
            const statusBadge = isRead ?
                '<span class="badge bg-secondary">已读</span>' :
                '<span class="badge bg-primary">未读</span>';

            return `
                <div class="message-item ${unreadClass}" data-id="${message.id}">
                    <div class="message-row">
                        <div class="message-content-col">
                            <div class="message-header">
                                <h6 class="message-title ${unreadClass}">${escapeHtml(message.title)}</h6>
                                <div class="message-meta">
                                    ${statusBadge}
                                    <span class="message-type">${getTypeText(message.type)}</span>
                                    <span class="message-priority">${getPriorityText(message.priority)}</span>
                                </div>
                            </div>
                            <div class="message-content">
                                <p class="message-content-text">${escapeHtml(truncateText(message.content, 150))}</p>
                            </div>
                            <div class="message-footer">
                                <div class="message-time">
                                    <i class="far fa-clock"></i> ${formatDateTime(message.created_at)}
                                </div>
                                <div class="message-sender">
                                    ${message.sender ? `发送人: ${message.sender.username}` : ''}
                                </div>
                            </div>
                        </div>
                        <div class="message-actions-col">
                            <div class="message-actions">
                                <button class="btn btn-sm btn-outline-primary view-message-btn" onclick="MessageManager.viewMessage('${message.id}')">
                                    <i class="fas fa-eye"></i> 查看
                                </button>
                                ${!isRead ? `
                                    <button class="btn btn-sm btn-outline-success mark-read-btn" data-message-id="${message.id}">
                                        <i class="fas fa-check"></i> 已读
                                    </button>
                                ` : `
                                    <button class="btn btn-sm btn-outline-warning mark-unread-btn" data-message-id="${message.id}">
                                        <i class="fas fa-envelope"></i> 未读
                                    </button>
                                `}
                                <button class="btn btn-sm btn-outline-danger delete-message-btn" data-message-id="${message.id}">
                                    <i class="fas fa-trash"></i> 删除
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        container.innerHTML = messagesHtml;
    }

  /**
     * 更新分页
     */
    function updatePagination() {
        const container = document.getElementById('message-pagination');
        if (!container) return;

        const totalPages = Math.ceil(totalCount / pageSize);

        if (totalPages <= 1) {
            container.innerHTML = '';
            return;
        }

        let paginationHtml = '<nav><ul class="pagination justify-content-center">';

        // 上一页
        if (currentPage > 1) {
            paginationHtml += `
                <li class="page-item">
                    <a class="page-link" href="#" onclick="MessageManager.goToPage(${currentPage - 1}); return false;">
                        <i class="fas fa-chevron-left"></i>
                    </a>
                </li>
            `;
        }

        // 页码
        const startPage = Math.max(1, currentPage - 2);
        const endPage = Math.min(totalPages, currentPage + 2);

        if (startPage > 1) {
            paginationHtml += '<li class="page-item"><a class="page-link" href="#" onclick="MessageManager.goToPage(1); return false;">1</a></li>';
            if (startPage > 2) {
                paginationHtml += '<li class="page-item disabled"><span class="page-link">...</span></li>';
            }
        }

        for (let i = startPage; i <= endPage; i++) {
            const activeClass = i === currentPage ? 'active' : '';
            paginationHtml += `
                <li class="page-item ${activeClass}">
                    <a class="page-link" href="#" onclick="MessageManager.goToPage(${i}); return false;">${i}</a>
                </li>
            `;
        }

        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                paginationHtml += '<li class="page-item disabled"><span class="page-link">...</span></li>';
            }
            paginationHtml += `<li class="page-item"><a class="page-link" href="#" onclick="MessageManager.goToPage(${totalPages}); return false;">${totalPages}</a></li>`;
        }

        // 下一页
        if (currentPage < totalPages) {
            paginationHtml += `
                <li class="page-item">
                    <a class="page-link" href="#" onclick="MessageManager.goToPage(${currentPage + 1}); return false;">
                        <i class="fas fa-chevron-right"></i>
                    </a>
                </li>
            `;
        }

        paginationHtml += '</ul></nav>';
        container.innerHTML = paginationHtml;
    }

    /**
     * 更新统计信息
     */
    function updateStatistics() {
        const unreadCount = messages.filter(msg => {
            const isRead = msg.user_message_state ? msg.user_message_state.is_read : msg.is_read;
            return !isRead;
        }).length;

        // 更新统计卡片
        const totalCountEl = document.getElementById('total-messages');
        const unreadCountEl = document.getElementById('unread-messages');

        if (totalCountEl) totalCountEl.textContent = totalCount;
        if (unreadCountEl) unreadCountEl.textContent = unreadCount;
    }

    /**
     * 搜索消息
     */
    function performSearch() {
        const searchInput = document.getElementById('search-input');
        currentSearch = searchInput ? searchInput.value.trim() : '';
        currentPage = 1;
        loadMessages();
    }

    /**
     * 跳转到指定页面
     */
    function goToPage(page) {
        currentPage = page;
        loadMessages();
        // 滚动到顶部
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

      /**
     * 查看消息详情
     */
    function viewMessage(messageId) {
        const message = messages.find(m => m.id === messageId);
        if (!message) return;

        // 创建模态框显示消息详情
        const modalHtml = `
            <div class="modal fade" id="messageDetailModal" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">${escapeHtml(message.title)}</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div class="mb-3">
                                <span class="badge bg-info me-2">${getTypeText(message.type)}</span>
                                <span class="badge bg-warning me-2">${getPriorityText(message.priority)}</span>
                                ${!message.is_read ? '<span class="badge bg-primary">未读</span>' : '<span class="badge bg-secondary">已读</span>'}
                            </div>
                            <div class="message-full-content">
                                <pre style="white-space: pre-wrap; font-family: inherit; line-height: 1.6;">${escapeHtml(message.content)}</pre>
                            </div>
                            <div class="mt-3 text-muted small">
                                <i class="far fa-clock"></i> ${formatDateTime(message.created_at)}
                                ${message.sender ? `| 发送人: ${message.sender.username}` : ''}
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">关闭</button>
                            ${!message.is_read ? '<button type="button" class="btn btn-primary" onclick="MessageManager.markAsReadAndClose(\'' + messageId + '\')">标记已读并关闭</button>' : ''}
                        </div>
                    </div>
                </div>
            </div>
        `;

        // 移除现有模态框
        document.getElementById('messageDetailModal')?.remove();

        // 添加新模态框
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        // 显示模态框
        const modal = document.getElementById('messageDetailModal');
        if (window.bootstrap) {
            const modalInstance = new window.bootstrap.Modal(modal);
            modalInstance.show();
        } else {
            // 如果没有Bootstrap，简单显示
            modal.style.display = 'block';
        }
    }

    /**
     * 标记消息为已读
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

                renderMessages();
                updateStatistics();
                Utils.toast.success('已标记为已读');
            } else {
                Utils.toast.error('操作失败');
            }
        } catch (error) {
            console.error('标记已读失败:', error);
            Utils.toast.error('网络错误');
        }
    }

    /**
     * 标记消息为未读
     */
    async function markAsUnread(messageId) {
        try {
            const token = window.Auth?.getToken();
            if (!token) return;

            const response = await fetch(`${window.AppConfig.API_BASE_URL}/messages/${messageId}/unread`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                // 更新本地消息状态
                const message = messages.find(m => m.id === messageId);
                if (message) {
                    message.is_read = false;
                    if (message.user_message_state) {
                        message.user_message_state.is_read = false;
                    }
                }

                renderMessages();
                updateStatistics();
                Utils.toast.success('已标记为未读');
            } else {
                Utils.toast.error('操作失败');
            }
        } catch (error) {
            console.error('标记未读失败:', error);
            Utils.toast.error('网络错误');
        }
    }

    /**
     * 删除消息
     */
    async function deleteMessage(messageId) {
        if (!confirm('确定要删除这条消息吗？此操作不可恢复。')) {
            return;
        }

        try {
            const token = window.Auth?.getToken();
            if (!token) return;

            const response = await fetch(`${window.AppConfig.API_BASE_URL}/messages/${messageId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                // 从本地列表中移除消息
                messages = messages.filter(m => m.id !== messageId);
                totalCount--;

                renderMessages();
                updatePagination();
                updateStatistics();
                Utils.toast.success('消息已删除');
            } else {
                Utils.toast.error('删除失败');
            }
        } catch (error) {
            console.error('删除消息失败:', error);
            Utils.toast.error('网络错误');
        }
    }

    /**
     * 标记已读并关闭模态框
     */
    async function markAsReadAndClose(messageId) {
        await markAsRead(messageId);
        const modal = document.getElementById('messageDetailModal');
        if (modal) {
            modal.remove();
        }
    }

    /**
     * 显示加载状态
     */
    function showLoading() {
        const container = document.getElementById('message-list');
        if (container) {
            container.innerHTML = `
                <div class="text-center py-5">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">加载中...</span>
                    </div>
                    <p class="mt-3 text-muted">正在加载消息...</p>
                </div>
            `;
        }
    }

    /**
     * 隐藏加载状态
     */
    function hideLoading() {
        // 由 renderMessages 处理
    }

    
    /**
     * 格式化日期时间
     */
    function formatDateTime(dateString) {
        const date = new Date(dateString);
        return date.toLocaleString('zh-CN');
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
     * 截断文本
     */
    function truncateText(text, maxLength) {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }

    /**
     * HTML转义
     */
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // 公共API
    return {
        init: init,
        goToPage: goToPage,
        viewMessage: viewMessage,
        markAsRead: markAsRead,
        markAsReadAndClose: markAsReadAndClose,
        refresh: loadMessages,
        refreshMessages: loadMessages  // 添加别名以兼容现有调用
    };
})();

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    if (window.location.pathname.includes('/messages')) {
        window.MessageManager.init();
    }
});