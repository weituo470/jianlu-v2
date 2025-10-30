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
        console.log('🔍 MessageManager Debug - init called with type:', type);
        console.log('🔍 MessageManager Debug - pageType set to:', pageType);
        console.log('🔧 MessageManager Debug - 代码版本检查: 语法错误修复版本 v4.1 (修复模板字符串语法)');
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

        // 消息操作按钮 - 使用更精确的事件委托
        document.addEventListener('click', function(e) {
            // 处理标记已读按钮
            const markReadBtn = e.target.closest('.mark-read-btn');
            if (markReadBtn) {
                const messageId = markReadBtn.dataset.messageId;
                markAsRead(messageId);
                return;
            }

            // 处理标记未读按钮
            const markUnreadBtn = e.target.closest('.mark-unread-btn');
            if (markUnreadBtn) {
                const messageId = markUnreadBtn.dataset.messageId;
                markAsUnread(messageId);
                return;
            }

            // 处理删除按钮 - 支持点击按钮或图标
            const deleteBtn = e.target.closest('.delete-message-btn');
            if (deleteBtn) {
                const messageId = deleteBtn.dataset.messageId;
                console.log('🗑️ 删除按钮被点击 - 消息ID:', messageId, '来源元素:', e.target.tagName, e.target.className);
                deleteMessage(messageId);
                return;
            }

            // 处理刷新按钮
            if (e.target.classList.contains('refresh-messages-btn')) {
                loadMessages();
                return;
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
            console.log('🔍 MessageManager Debug - Token exists:', !!token);
            if (!token) {
                Utils.toast.error('请先登录');
                return;
            }

            // 构建查询参数
            const params = new URLSearchParams({
                page: currentPage,
                limit: pageSize
            });

            console.log('🔍 MessageManager Debug - Initial params:', params.toString());

            if (currentSearch) {
                params.append('search', currentSearch);
                console.log('🔍 MessageManager Debug - Added search:', currentSearch);
            }

            // 根据页面类型设置参数
            console.log('🔍 MessageManager Debug - pageType in loadMessages:', pageType);
            if (pageType === 'inbox' || pageType === 'messages') {
                params.append('filter', 'received');
                console.log('🔍 MessageManager Debug - Using received filter for type:', pageType);
            } else if (pageType === 'sent') {
                params.append('filter', 'sent');
                console.log('🔍 MessageManager Debug - Using sent filter for type:', pageType);
            } else {
                // 主页面使用过滤器
                if (currentFilter !== 'all') {
                    params.append('filter', currentFilter);
                    console.log('🔍 MessageManager Debug - Using currentFilter:', currentFilter);
                }
            }

            if (currentType) {
                params.append('type', currentType);
            }

            if (currentPriority) {
                params.append('priority', currentPriority);
            }

            const url = `${window.AppConfig.API_BASE_URL}/messages?${params}`;
            console.log('🔍 MessageManager Debug - Fetching URL:', url);

            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const result = await response.json();
                console.log('🔍 MessageManager Debug - API Response OK');
                console.log('🔍 MessageManager Debug - Result:', result);
                console.log('🔍 MessageManager Debug - Messages from API:', result.data?.messages);
            console.log('🔍 MessageManager Debug - Message ID types:', result.data?.messages?.map(m => ({
                id: m.id,
                idType: typeof m.id,
                globalId: m.global_message_id,
                globalIdType: typeof m.global_message_id,
                title: m.title?.substring(0, 30) + '...'
            })));
                console.log('🔍 MessageManager Debug - Messages count:', result.data?.messages?.length);
                console.log('🔍 MessageManager Debug - Statistics from API:', result.data?.statistics);

                messages = result.data.messages || [];
                totalCount = result.data.pagination?.total_count || 0;

                // 保存新的统计信息
                window.messageStatistics = result.data?.statistics || {
                    total_messages: 0,
                    filtered_messages: 0,
                    current_page_count: 0
                };

                console.log('🔍 MessageManager Debug - Message Statistics:', window.messageStatistics);
                console.log('🔍 MessageManager Debug - After assignment - messages:', messages);
                console.log('🔍 MessageManager Debug - After assignment - messages.length:', messages.length);

                console.log('🔍 MessageManager Debug - About to call renderMessages');
                renderMessages();
                console.log('🔍 MessageManager Debug - renderMessages called');
                updatePagination();
                updateStatistics();
            } else {
                console.error('🔍 MessageManager Debug - API Response failed:', response.status, response.statusText);
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
        // 根据页面类型选择不同的容器ID
        let containerId = 'messages-list';
        if (pageType === 'inbox') {
            containerId = 'inbox-messages-list';
        } else if (pageType === 'sent') {
            containerId = 'sent-messages-list';
        }

        const container = document.getElementById(containerId);
        console.log('🔍 MessageManager Debug - renderMessages called');
        console.log('🔍 MessageManager Debug - pageType:', pageType);
        console.log('🔍 MessageManager Debug - containerId:', containerId);
        console.log('🔍 MessageManager Debug - container exists:', !!container);
        console.log('🔍 MessageManager Debug - container:', container);
        console.log('🔍 MessageManager Debug - container.innerHTML:', container ? container.innerHTML.substring(0, 200) : 'N/A');
        console.log('🔍 MessageManager Debug - messages.length:', messages.length);
        console.log('🔍 MessageManager Debug - messages content:', messages);

        if (!container) {
            console.error('🔍 MessageManager Debug - ERROR: container not found for ID:', containerId);
            return;
        }

        if (messages.length === 0) {
            console.log('🔍 MessageManager Debug - Showing empty state');
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
            try {
            // 强化状态判断逻辑 - 添加类型检查和强制转换
            let isRead;

            // 获取原始值
            const userStateValue = message.user_message_state?.is_read;
            const messageValue = message.is_read;

            // 强制转换为布尔值并处理类型问题
            if (message.user_message_state && userStateValue !== undefined && userStateValue !== null) {
                // 使用user_message_state的值，但强制转换为正确的布尔值
                isRead = Boolean(userStateValue === true || userStateValue === 'true' || userStateValue === 1);
            } else {
                // 回退到message表的值
                isRead = Boolean(messageValue === true || messageValue === 'true' || messageValue === 1);
            }

            const unreadClass = isRead ? '' : 'unread';
            const statusBadge = isRead ?
                '<span class="badge bg-secondary">已读</span>' :
                '<span class="badge bg-primary">未读</span>';

            console.log('🎨 MessageManager Debug - 渲染消息状态 (强化版):', {
                id: message.id,
                globalId: message.global_message_id,
                title: message.title,
                raw_user_state: userStateValue,
                raw_message_value: messageValue,
                user_state_type: typeof userStateValue,
                message_value_type: typeof messageValue,
                final_isRead: isRead,
                unreadClass: unreadClass,
                statusBadge: statusBadge.replace(/<[^>]*>/g, ''), // 移除HTML标签用于日志
                expected_display: isRead ? '已读' : '未读',
                user_message_state: message.user_message_state,
                message_is_read: message.is_read,
                message_read_at: message.read_at,
                user_state_is_read: message.user_message_state?.is_read,
                user_state_read_at: message.user_message_state?.read_at,
                logic_check: {
                    userStateExists: !!message.user_message_state,
                    userStateDefined: userStateValue !== undefined && userStateValue !== null,
                    usingUserState: message.user_message_state && userStateValue !== undefined && userStateValue !== null,
                    booleanConversion: Boolean(userStateValue)
                }
            });

  
            return `
                <div class="message-item ${unreadClass}" data-id="${message.id}">
                    <div class="message-row">
                        <div class="message-content-col">
                            <div class="message-header">
                                <div class="d-flex justify-content-between align-items-start">
                                    <div class="d-flex align-items-center">
                                        <!-- 可点击的信封图标，用于标记消息状态 -->
                                        <span class="message-envelope-icon me-2 ${!isRead ? 'unread-envelope' : 'read-envelope'}"
                                              style="cursor: ${!isRead ? 'pointer' : 'default'}; ${!isRead ? 'transition: all 0.2s ease;' : ''}"
                                              onclick="MessageManager.toggleMessageRead('${message.id}')"
                                              title="${isRead ? '已读消息' : '点击标记为已读'}">
                                            <i class="fas fa-envelope${isRead ? '-open' : ''} ${!isRead ? 'text-primary unread-icon' : 'text-muted'}"
                                               style="font-size: 1.1em; ${!isRead ? 'animation: pulse-icon 2s infinite;' : ''}"></i>
                                        </span>
                                        <span class="badge bg-light text-dark me-2">${escapeHtml(String(message.global_message_id || '#' + (message.page_index || 'N/A')))}</span>
                  <span class="badge ${!isRead ? 'bg-primary' : 'bg-secondary'} me-2" style="cursor: ${!isRead ? 'pointer' : 'default'};"
                        onclick="MessageManager.toggleMessageRead('${message.id}')"
                        title="${isRead ? '点击标记为未读' : '点击标记为已读'}">
                    ${!isRead ? '未读' : '已读'}
                  </span>
                                        <h6 class="message-title ${unreadClass} mb-0">${escapeHtml(message.title)}</h6>
                                    </div>
                                    <div class="message-meta">
                                        ${statusBadge}
                                        <span class="message-type">${getTypeText(message.type)}</span>
                                        <span class="message-priority">${getPriorityText(message.priority)}</span>
                                        <button class="btn btn-sm btn-outline-danger delete-message-btn ms-2" data-message-id="${message.id}">
                                            <i class="fas fa-trash"></i> 删除
                                        </button>
                                    </div>
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
                      </div>
                </div>
            `;
            } catch (error) {
                console.error('❌ 渲染消息时发生错误:', error, '消息数据:', message);
                return `
                    <div class="message-item error" data-id="${message?.id || 'unknown'}">
                        <div class="alert alert-danger">
                            <i class="fas fa-exclamation-triangle"></i>
                            消息渲染失败: ${error.message}
                        </div>
                    </div>
                `;
            }
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

        // 获取消息总数（使用新的统计数据）
        const totalMessagesCount = window.messageStatistics?.total_messages || totalCount;

        console.log('📊 MessageManager Debug - Updating statistics:', {
            totalMessages: totalMessagesCount,
            filteredMessages: totalCount,
            currentPageMessages: messages.length,
            unreadMessages: unreadCount,
            statistics: window.messageStatistics
        });

        // 更新统计卡片
        const totalCountEl = document.getElementById('total-messages');
        const unreadCountEl = document.getElementById('unread-messages');

        if (totalCountEl) totalCountEl.textContent = totalMessagesCount;
        if (unreadCountEl) unreadCountEl.textContent = unreadCount;

        // 更新收件箱标题显示总数
        const inboxTitleEl = document.getElementById('inbox-title');
        if (inboxTitleEl) {
            inboxTitleEl.textContent = `收件箱 (共${totalMessagesCount}条消息)`;
        }

        // 更新页面标题
        const pageTitleEl = document.getElementById('page-title');
        if (pageTitleEl) {
            pageTitleEl.textContent = `消息管理 (共${totalMessagesCount}条消息)`;
        }
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
        if (!message) {
            console.warn('查看消息失败 - 消息不存在，ID:', messageId);
            return;
        }

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
     * 切换消息已读状态（通过点击信封图标）
     */
    async function toggleMessageRead(messageId) {
        console.log('📧 MessageManager Debug - 点击信封图标切换消息状态');
        console.log('  📄 消息ID:', messageId);

        try {
            const token = window.Auth?.getToken();
            if (!token) {
                Utils.toast.error('认证失败，请重新登录');
                return;
            }

            // 查找消息的当前状态 - UUID精确匹配
            console.log('  🔍 查找消息 - 当前消息列表:', messages.map(m => ({ id: m.id, type: typeof m.id, title: m.title })));
            console.log('  🔍 查找消息 - 目标ID:', messageId, '类型:', typeof messageId);

            const message = messages.find(msg => {
                const idMatch = msg.id === messageId;
                if (idMatch) {
                    console.log('  ✅ 找到匹配消息:', { id: msg.id, title: msg.title });
                }
                return idMatch;
            });

            if (!message) {
                console.error('  ❌ 消息查找失败 - 未找到匹配的消息');
                console.error('  🔍 可用的消息ID:', messages.map(m => ({ id: m.id, type: typeof m.id })));
                Utils.toast.error(`消息不存在 (ID: ${messageId})`);
                return;
            }

            const isCurrentlyRead = message.user_message_state ? message.user_message_state.is_read : message.is_read;

            // 如果已经是已读状态，无需操作
            if (isCurrentlyRead) {
                console.log('  ✅ 消息已经是已读状态');
                return;
            }

            // 标记为已读
            const markReadUrl = `${window.AppConfig.API_BASE_URL}/messages/${messageId}/read`;
            console.log('  🌐 标记已读URL:', markReadUrl);

            const response = await fetch(markReadUrl, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            console.log('  📡 响应状态:', response.status, response.statusText);

            if (response.ok) {
                const result = await response.json();
                console.log('  ✅ 标记已读成功:', result);

                // 更新本地消息状态
                if (message.user_message_state) {
                    message.user_message_state.is_read = true;
                    message.user_message_state.read_at = new Date().toISOString();
                } else {
                    message.is_read = true;
                    message.read_at = new Date().toISOString();
                }

                // 重新渲染消息列表
                renderMessages();

                Utils.toast.success('消息已标记为已读');

                // 更新消息计数
                if (typeof updateMessageCount === 'function') {
                    updateMessageCount();
                }

            } else {
                const errorData = await response.json();
                console.error('  ❌ 标记已读失败:', errorData);
                console.error('  📋 错误详情:', {
                    status: response.status,
                    statusText: response.statusText,
                    code: errorData.code,
                    message: errorData.message,
                    details: errorData.details
                });
                Utils.toast.error(errorData.message || '标记已读失败');
            }

        } catch (error) {
            console.error('  ❌ 标记已读异常:', error);
            Utils.toast.error('网络错误，请稍后重试');
        }
    }

    /**
     * 删除消息
     */
    async function deleteMessage(messageId) {
        console.log('🗑️ MessageManager Debug - 开始删除消息');
        console.log('  📄 消息ID:', messageId);
        console.log('  🔗 API Base URL:', window.AppConfig?.API_BASE_URL);

        if (!confirm('确定要删除这条消息吗？此操作不可恢复。')) {
            console.log('  ❌ 用户取消删除');
            return;
        }

        try {
            const token = window.Auth?.getToken();
            console.log('  🔑 Token存在:', !!token);
            console.log('  🔑 Token长度:', token ? token.length : 0);
            if (!token) {
                console.error('  ❌ 未找到认证token');
                Utils.toast.error('认证失败，请重新登录');
                return;
            }

            const deleteUrl = `${window.AppConfig.API_BASE_URL}/messages/${messageId}`;
            console.log('  🌐 删除URL:', deleteUrl);

            const response = await fetch(deleteUrl, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            console.log('  📡 响应状态:', response.status, response.statusText);
            console.log('  📡 响应OK:', response.ok);

            if (response.ok) {
                const result = await response.json();
                console.log('  ✅ 删除成功响应:', result);

                // 从本地列表中移除消息 - UUID精确匹配
                const beforeCount = messages.length;
                messages = messages.filter(m => m.id !== messageId);
                totalCount--;

                console.log(`  📊 消息数量变化: ${beforeCount} -> ${messages.length}`);
                console.log('  📊 总数更新:', totalCount);

                renderMessages();
                updatePagination();
                updateStatistics();
                Utils.toast.success('消息已删除');
            } else {
                const errorText = await response.text();
                console.error('  ❌ 删除失败响应:', {
                    status: response.status,
                    statusText: response.statusText,
                    body: errorText
                });

                // 尝试解析JSON错误信息
                try {
                    const errorJson = JSON.parse(errorText);
                    console.error('  ❌ 服务器错误详情:', errorJson);
                    Utils.toast.error(`删除失败: ${errorJson.message || errorText}`);
                } catch (e) {
                    Utils.toast.error(`删除失败: ${response.status} ${response.statusText}`);
                }
            }
        } catch (error) {
            console.error('  ❌ 删除消息异常:', error);
            console.error('  ❌ 错误堆栈:', error.stack);
            Utils.toast.error('删除失败: 网络错误');
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
        if (text === null || text === undefined) return '';
        if (typeof text !== 'string') text = String(text);

        // 额外检查可能导致模板字符串问题的字符
        text = text.replace(/`/g, '&#96;'); // 转义反引号

        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * 标记所有消息为已读
     */
    async function markAllAsRead() {
        console.log('📚 MessageManager Debug - 开始标记所有消息为已读');

        try {
            const token = window.Auth?.getToken();
            if (!token) {
                Utils.toast.error('认证失败，请重新登录');
                return;
            }

            const response = await fetch(`${window.AppConfig.API_BASE_URL}/messages/read-all`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const result = await response.json();
                console.log('  ✅ 全部标记已读成功:', result);

                // 更新本地消息状态
                console.log('  🔄 更新本地消息状态...');
                messages.forEach((message, index) => {
                    const wasRead = message.user_message_state ? message.user_message_state.is_read : message.is_read;
                    console.log(`    消息 ${index + 1}: ${message.global_message_id} - 之前: ${wasRead ? '已读' : '未读'} -> 之后: 已读`);

                    if (message.user_message_state) {
                        message.user_message_state.is_read = true;
                    }
                    message.is_read = true;
                });

                // 重新渲染界面
                console.log('  🎨 重新渲染界面...');
                renderMessages();
                updateStatistics();

                const markedCount = result.data?.marked_count || 0;
                Utils.toast.success(`已成功标记 ${markedCount} 条消息为已读`);
            } else {
                const errorText = await response.text();
                console.error('  ❌ 标记所有消息已读失败:', {
                    status: response.status,
                    statusText: response.statusText,
                    body: errorText
                });

                try {
                    const errorJson = JSON.parse(errorText);
                    Utils.toast.error(`标记失败: ${errorJson.message || errorText}`);
                } catch (e) {
                    Utils.toast.error(`标记失败: ${response.status} ${response.statusText}`);
                }
            }
        } catch (error) {
            console.error('  ❌ 标记所有消息已读异常:', error);
            Utils.toast.error('网络错误，请稍后重试');
        }
    }

      // 添加版本检查和强制更新标识
    console.log('🔧 MessageManager Debug - 代码版本检查:');
    console.log('  - 最后更新时间: 2025-10-30 01:25:00');
    console.log('  - 调试功能: 已启用全生命周期调试');
    console.log('  - 测试消息弹窗: 已启用');

    // 公共API
    return {
        init: init,
        goToPage: goToPage,
        viewMessage: viewMessage,
        markAsRead: markAsRead,
        markAsReadAndClose: markAsReadAndClose,
        markAllAsRead: markAllAsRead,
        toggleMessageRead: toggleMessageRead,  // 添加信封图标切换已读状态功能
        refresh: loadMessages,
        refreshMessages: loadMessages,  // 添加别名以兼容现有调用
        // 添加调试方法
        debug: function() {
            console.log('🔧 MessageManager Debug - 调试方法调用成功');
            console.log('  - messages数组长度:', messages.length);
            console.log('  - 页面类型:', pageType);
            console.log('  - 当前页:', currentPage);
            return {
                messages: messages,
                pageType: pageType,
                currentPage: currentPage
            };
        }
    };
})();

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    if (window.location.pathname.includes('/messages')) {
        window.MessageManager.init();
    }
});