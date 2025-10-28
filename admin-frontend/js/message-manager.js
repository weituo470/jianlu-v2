/**
 * 消息管理模块
 * 负责处理消息的收发、显示和管理功能
 */
window.MessageManager = (function() {
    'use strict';

    // 私有变量
    let currentPage = 1;
    let pageSize = 20;
    let currentFilter = {};
    let unreadCount = 0;
    let refreshInterval = null;

    // 消息类型映射
    const messageTypes = {
        'system': { text: '系统消息', class: 'badge-info' },
        'personal': { text: '个人消息', class: 'badge-primary' },
        'activity': { text: '活动消息', class: 'badge-success' },
        'team': { text: '团队消息', class: 'badge-warning' },
        'announcement': { text: '系统公告', class: 'badge-danger' }
    };

    // 优先级映射
    const priorities = {
        'low': { text: '低', class: 'text-secondary' },
        'normal': { text: '普通', class: 'text-primary' },
        'high': { text: '高', class: 'text-warning' },
        'urgent': { text: '紧急', class: 'text-danger' }
    };

    /**
     * 初始化消息管理器
     */
    function init() {
        console.log('初始化消息管理器...');
        bindEvents();
        loadUnreadCount();
        startAutoRefresh();
    }

    /**
     * 绑定事件
     */
    function bindEvents() {
        // 搜索事件
        $('#message-search').on('input', debounce(handleSearch, 300));

        // 筛选事件
        $('#message-type-filter, #message-priority-filter, #message-status-filter').on('change', handleFilter);

        // 分页事件
        $('#message-pagination').on('click', '.page-link', handlePagination);

        // 批量操作事件
        $('#mark-all-read-btn').on('click', markAllAsRead);
        $('#refresh-messages-btn').on('click', refreshMessages);

        // 发送消息事件
        $('#send-message-btn').on('click', showSendMessageModal);
        $('#message-form').on('submit', handleSendMessage);

        // 消息详情模态框事件
        $('#message-detail-modal').on('show.bs.modal', loadMessageDetail);
        $('#mark-read-btn').on('click', markAsRead);
        $('#mark-unread-btn').on('click', markAsUnread);
        $('#delete-message-btn').on('click', deleteMessage);
    }

    /**
     * 加载未读消息数量
     */
    async function loadUnreadCount() {
        try {
            const response = await fetch(`${window.AppConfig.API_BASE_URL}/messages/unread-count`, {
                headers: {
                    'Authorization': `Bearer ${window.Auth.getToken()}`
                }
            });

            if (response.ok) {
                const result = await response.json();
                unreadCount = result.data.unread_count;
                updateUnreadCountDisplay();
            }
        } catch (error) {
            console.error('加载未读消息数量失败:', error);
        }
    }

    /**
     * 更新未读消息数量显示
     */
    function updateUnreadCountDisplay() {
        // 更新导航栏消息图标
        $('#messages-menu-item .badge').text(unreadCount > 0 ? unreadCount : '');
        $('#messages-menu-item .badge').toggleClass('d-none', unreadCount === 0);

        // 更新页面标题
        if (unreadCount > 0) {
            document.title = `(${unreadCount}) ${window.AppConfig.APP_NAME}`;
        }
    }

    /**
     * 加载消息列表
     */
    async function loadMessages(page = 1, filter = {}) {
        try {
            showLoading();

            const params = new URLSearchParams({
                page: page,
                limit: pageSize,
                ...filter
            });

            const response = await fetch(`${window.AppConfig.API_BASE_URL}/messages?${params}`, {
                headers: {
                    'Authorization': `Bearer ${window.Auth.getToken()}`
                }
            });

            if (response.ok) {
                const result = await response.json();
                renderMessageList(result.data.messages);
                renderPagination(result.data.pagination);
                currentPage = page;
            } else {
                throw new Error('加载消息列表失败');
            }
        } catch (error) {
            console.error('加载消息列表失败:', error);
            window.App.showAlert('加载消息列表失败', 'error');
        } finally {
            hideLoading();
        }
    }

    /**
     * 渲染消息列表
     */
    function renderMessageList(messages) {
        const container = $('#message-list');
        container.empty();

        if (messages.length === 0) {
            container.html(`
                <div class="text-center py-5">
                    <i class="fas fa-inbox fa-3x text-muted mb-3"></i>
                    <p class="text-muted">暂无消息</p>
                </div>
            `);
            return;
        }

        messages.forEach(message => {
            const messageEl = createMessageElement(message);
            container.append(messageEl);
        });
    }

    /**
     * 创建消息元素
     */
    function createMessageElement(message) {
        const typeInfo = messageTypes[message.type] || { text: '未知类型', class: 'badge-secondary' };
        const priorityInfo = priorities[message.priority] || { text: '普通', class: 'text-primary' };
        const isUnread = !message.is_read;

        return `
            <div class="message-item ${isUnread ? 'unread' : ''}" data-id="${message.id}">
                <div class="card mb-2 ${isUnread ? 'border-left-primary border-left-3' : ''}">
                    <div class="card-body py-3">
                        <div class="row align-items-center">
                            <div class="col-md-8">
                                <div class="d-flex align-items-center mb-2">
                                    <h6 class="mb-0 me-2 ${isUnread ? 'font-weight-bold' : ''}">
                                        ${message.title}
                                    </h6>
                                    <span class="badge ${typeInfo.class}">${typeInfo.text}</span>
                                    <span class="badge ${priorityInfo.class}">${priorityInfo.text}</span>
                                    ${isUnread ? '<span class="badge badge-primary">未读</span>' : ''}
                                </div>
                                <p class="mb-1 text-truncate">${message.content}</p>
                                <small class="text-muted">
                                    <i class="far fa-clock"></i> ${formatDateTime(message.created_at)}
                                    ${message.sender ? `| 发送人: ${message.sender.username}` : ''}
                                </small>
                            </div>
                            <div class="col-md-4 text-end">
                                <div class="btn-group" role="group">
                                    <button class="btn btn-sm btn-outline-primary view-message-btn"
                                            data-id="${message.id}" data-bs-toggle="modal"
                                            data-bs-target="#message-detail-modal">
                                        <i class="fas fa-eye"></i> 查看
                                    </button>
                                    ${isUnread ? `
                                        <button class="btn btn-sm btn-outline-success mark-read-btn"
                                                data-id="${message.id}">
                                            <i class="fas fa-check"></i> 标记已读
                                        </button>
                                    ` : ''}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * 渲染分页
     */
    function renderPagination(pagination) {
        const container = $('#message-pagination');
        container.empty();

        if (pagination.total_pages <= 1) {
            return;
        }

        let paginationHtml = '<nav><ul class="pagination justify-content-center">';

        // 上一页
        if (pagination.current_page > 1) {
            paginationHtml += `
                <li class="page-item">
                    <a class="page-link" href="#" data-page="${pagination.current_page - 1}">上一页</a>
                </li>
            `;
        }

        // 页码
        const startPage = Math.max(1, pagination.current_page - 2);
        const endPage = Math.min(pagination.total_pages, pagination.current_page + 2);

        for (let i = startPage; i <= endPage; i++) {
            paginationHtml += `
                <li class="page-item ${i === pagination.current_page ? 'active' : ''}">
                    <a class="page-link" href="#" data-page="${i}">${i}</a>
                </li>
            `;
        }

        // 下一页
        if (pagination.current_page < pagination.total_pages) {
            paginationHtml += `
                <li class="page-item">
                    <a class="page-link" href="#" data-page="${pagination.current_page + 1}">下一页</a>
                </li>
            `;
        }

        paginationHtml += '</ul></nav>';
        container.html(paginationHtml);
    }

    /**
     * 搜索处理
     */
    function handleSearch(e) {
        const searchTerm = e.target.value.trim();
        currentFilter.search = searchTerm || undefined;
        loadMessages(1, currentFilter);
    }

    /**
     * 筛选处理
     */
    function handleFilter() {
        currentFilter = {
            ...currentFilter,
            type: $('#message-type-filter').val() || undefined,
            priority: $('#message-priority-filter').val() || undefined,
            is_read: $('#message-status-filter').val() || undefined
        };

        // 移除空值
        Object.keys(currentFilter).forEach(key => {
            if (!currentFilter[key]) delete currentFilter[key];
        });

        loadMessages(1, currentFilter);
    }

    /**
     * 分页处理
     */
    function handlePagination(e) {
        e.preventDefault();
        const page = parseInt(e.target.dataset.page);
        if (page && page !== currentPage) {
            loadMessages(page, currentFilter);
        }
    }

    /**
     * 标记全部已读
     */
    async function markAllAsRead() {
        try {
            const response = await fetch(`${window.AppConfig.API_BASE_URL}/messages/read-all`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${window.Auth.getToken()}`
                }
            });

            if (response.ok) {
                window.App.showAlert('全部消息已标记为已读', 'success');
                loadMessages(currentPage, currentFilter);
                loadUnreadCount();
            } else {
                throw new Error('标记失败');
            }
        } catch (error) {
            console.error('标记全部已读失败:', error);
            window.App.showAlert('标记失败', 'error');
        }
    }

    /**
     * 刷新消息
     */
    function refreshMessages() {
        loadMessages(currentPage, currentFilter);
        loadUnreadCount();
    }

    /**
     * 显示发送消息模态框
     */
    function showSendMessageModal() {
        $('#send-message-modal').modal('show');
    }

    /**
     * 处理发送消息
     */
    async function handleSendMessage(e) {
        e.preventDefault();

        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData);

        try {
            const response = await fetch(`${window.AppConfig.API_BASE_URL}/messages/personal`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${window.Auth.getToken()}`
                },
                body: JSON.stringify(data)
            });

            if (response.ok) {
                window.App.showAlert('消息发送成功', 'success');
                $('#send-message-modal').modal('hide');
                e.target.reset();
                loadMessages(currentPage, currentFilter);
            } else {
                const error = await response.json();
                throw new Error(error.message || '发送失败');
            }
        } catch (error) {
            console.error('发送消息失败:', error);
            window.App.showAlert(error.message || '发送失败', 'error');
        }
    }

    /**
     * 加载消息详情
     */
    async function loadMessageDetail(e) {
        const button = e.relatedTarget;
        const messageId = button.dataset.id;

        try {
            const response = await fetch(`${window.AppConfig.API_BASE_URL}/messages/${messageId}`, {
                headers: {
                    'Authorization': `Bearer ${window.Auth.getToken()}`
                }
            });

            if (response.ok) {
                const result = await response.json();
                renderMessageDetail(result.data.message);
                $('#mark-read-btn, #mark-unread-btn, #delete-message-btn')
                    .data('id', messageId);
            } else {
                throw new Error('加载消息详情失败');
            }
        } catch (error) {
            console.error('加载消息详情失败:', error);
            window.App.showAlert('加载消息详情失败', 'error');
        }
    }

    /**
     * 渲染消息详情
     */
    function renderMessageDetail(message) {
        const typeInfo = messageTypes[message.type] || { text: '未知类型', class: 'badge-secondary' };
        const priorityInfo = priorities[message.priority] || { text: '普通', class: 'text-primary' };

        $('#detail-title').text(message.title);
        $('#detail-content').html(message.content.replace(/\n/g, '<br>'));
        $('#detail-type').html(`<span class="badge ${typeInfo.class}">${typeInfo.text}</span>`);
        $('#detail-priority').html(`<span class="${priorityInfo.class}">${priorityInfo.text}</span>`);
        $('#detail-sender').text(message.sender ? message.sender.username : '系统');
        $('#detail-time').text(formatDateTime(message.created_at));
        $('#detail-read-status').text(message.is_read ? '已读' : '未读');

        // 根据消息状态显示/隐藏按钮
        $('#mark-read-btn').toggle(!message.is_read);
        $('#mark-unread-btn').toggle(message.is_read);
    }

    /**
     * 标记消息为已读
     */
    async function markAsRead() {
        const messageId = $('#mark-read-btn').data('id');

        try {
            const response = await fetch(`${window.AppConfig.API_BASE_URL}/messages/${messageId}/read`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${window.Auth.getToken()}`
                }
            });

            if (response.ok) {
                window.App.showAlert('标记成功', 'success');
                $('#message-detail-modal').modal('hide');
                loadMessages(currentPage, currentFilter);
                loadUnreadCount();
            } else {
                throw new Error('标记失败');
            }
        } catch (error) {
            console.error('标记已读失败:', error);
            window.App.showAlert('标记失败', 'error');
        }
    }

    /**
     * 标记消息为未读
     */
    async function markAsUnread() {
        const messageId = $('#mark-unread-btn').data('id');

        try {
            const response = await fetch(`${window.AppConfig.API_BASE_URL}/messages/${messageId}/unread`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${window.Auth.getToken()}`
                }
            });

            if (response.ok) {
                window.App.showAlert('标记成功', 'success');
                $('#message-detail-modal').modal('hide');
                loadMessages(currentPage, currentFilter);
                loadUnreadCount();
            } else {
                throw new Error('标记失败');
            }
        } catch (error) {
            console.error('标记未读失败:', error);
            window.App.showAlert('标记失败', 'error');
        }
    }

    /**
     * 删除消息
     */
    async function deleteMessage() {
        const messageId = $('#delete-message-btn').data('id');

        if (!confirm('确定要删除这条消息吗？')) {
            return;
        }

        try {
            const response = await fetch(`${window.AppConfig.API_BASE_URL}/messages/${messageId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${window.Auth.getToken()}`
                }
            });

            if (response.ok) {
                window.App.showAlert('删除成功', 'success');
                $('#message-detail-modal').modal('hide');
                loadMessages(currentPage, currentFilter);
                loadUnreadCount();
            } else {
                throw new Error('删除失败');
            }
        } catch (error) {
            console.error('删除消息失败:', error);
            window.App.showAlert('删除失败', 'error');
        }
    }

    /**
     * 开始自动刷新
     */
    function startAutoRefresh() {
        // 每5分钟刷新一次未读消息数量
        refreshInterval = setInterval(() => {
            loadUnreadCount();
        }, 5 * 60 * 1000);
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
     * 显示加载状态
     */
    function showLoading() {
        $('#message-loading').removeClass('d-none');
        $('#message-list').addClass('d-none');
    }

    /**
     * 隐藏加载状态
     */
    function hideLoading() {
        $('#message-loading').addClass('d-none');
        $('#message-list').removeClass('d-none');
    }

    /**
     * 格式化日期时间
     */
    function formatDateTime(dateString) {
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
     * 防抖函数
     */
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // 公共API
    return {
        init: init,
        loadMessages: loadMessages,
        refreshMessages: refreshMessages,
        loadUnreadCount: loadUnreadCount,
        stopAutoRefresh: stopAutoRefresh
    };
})();

// 页面加载完成后初始化
$(document).ready(function() {
    if (window.location.pathname.includes('/messages')) {
        window.MessageManager.init();
    }
});