/**
 * 消息通知模块
 * 负责实时显示消息通知和提醒
 */
window.MessageNotifier = (function() {
    'use strict';

    let notificationEnabled = false;
    let refreshInterval = null;
    let unreadCount = 0;
    let lastUnreadCount = 0;

    // 音效文件URL（可选）
    const notificationSound = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT';

    /**
     * 初始化消息通知器
     */
    function init() {
        console.log('初始化消息通知器...');

        // 检查浏览器通知权限
        if ('Notification' in window) {
            if (Notification.permission === 'default') {
                Notification.requestPermission().then(permission => {
                    if (permission === 'granted') {
                        notificationEnabled = true;
                        console.log('浏览器通知权限已授予');
                    }
                });
            } else if (Notification.permission === 'granted') {
                notificationEnabled = true;
            }
        }

        // 创建通知UI
        createNotificationUI();

        // 开始监听
        startListening();
    }

    /**
     * 创建通知UI元素
     */
    function createNotificationUI() {
        // 如果已经存在，则不再创建
        if ($('#message-notification-container').length > 0) {
            return;
        }

        const notificationHtml = `
            <div id="message-notification-container" class="position-fixed" style="top: 80px; right: 20px; z-index: 1050; max-width: 350px;">
                <!-- 通知将动态插入这里 -->
            </div>
        `;

        $('body').append(notificationHtml);
    }

    /**
     * 开始监听消息更新
     */
    function startListening() {
        // 立即检查一次
        checkMessages();

        // 每30秒检查一次
        refreshInterval = setInterval(checkMessages, 30000);
    }

    /**
     * 停止监听
     */
    function stopListening() {
        if (refreshInterval) {
            clearInterval(refreshInterval);
            refreshInterval = null;
        }
    }

    /**
     * 检查消息更新
     */
    async function checkMessages() {
        try {
            const response = await fetch(`${window.AppConfig.API_BASE_URL}/messages/unread-count`, {
                headers: {
                    'Authorization': `Bearer ${window.Auth.getToken()}`
                }
            });

            if (response.ok) {
                const result = await response.json();
                unreadCount = result.data.unread_count;

                // 更新UI
                updateUnreadCountDisplay();

                // 如果有新的未读消息，显示通知
                if (unreadCount > lastUnreadCount && lastUnreadCount >= 0) {
                    const newMessages = unreadCount - lastUnreadCount;
                    showNewMessageNotification(newMessages);
                }

                lastUnreadCount = unreadCount;
            }
        } catch (error) {
            console.error('检查消息更新失败:', error);
        }
    }

    /**
     * 更新未读消息数量显示
     */
    function updateUnreadCountDisplay() {
        // 更新导航栏徽章
        const badges = $('.unread-count-badge, .unread-count');
        badges.each(function() {
            const $badge = $(this);
            if (unreadCount > 0) {
                $badge.text(unreadCount).removeClass('d-none');
            } else {
                $badge.addClass('d-none');
            }
        });

        // 更新页面标题
        updatePageTitle();
    }

    /**
     * 更新页面标题
     */
    function updatePageTitle() {
        const originalTitle = window.AppConfig.APP_NAME;
        if (unreadCount > 0) {
            document.title = `(${unreadCount}) ${originalTitle}`;
        } else {
            document.title = originalTitle;
        }
    }

    /**
     * 显示新消息通知
     */
    function showNewMessageNotification(count) {
        // 显示浏览器通知
        if (notificationEnabled) {
            showBrowserNotification(count);
        }

        // 显示页面内通知
        showPageNotification(count);

        // 播放提示音
        playNotificationSound();
    }

    /**
     * 显示浏览器通知
     */
    function showBrowserNotification(count) {
        if (!notificationEnabled) return;

        const title = count === 1 ? '您有新消息' : `您有${count}条新消息`;
        const options = {
            body: '点击查看详情',
            icon: '/favicon.ico',
            badge: '/favicon.ico',
            tag: 'message-notification',
            requireInteraction: true
        };

        const notification = new Notification(title, options);

        notification.onclick = function() {
            window.focus();
            window.location.href = '/messages/inbox';
            notification.close();
        };

        // 自动关闭
        setTimeout(() => {
            notification.close();
        }, 5000);
    }

    /**
     * 显示页面内通知
     */
    function showPageNotification(count) {
        const message = count === 1 ? '您有一条新消息' : `您有${count}条新消息`;

        const notificationHtml = `
            <div class="alert alert-info alert-dismissible fade show notification-alert" role="alert">
                <div class="d-flex align-items-center">
                    <i class="fas fa-envelope me-2"></i>
                    <div class="flex-grow-1">
                        <strong>新消息提醒</strong>
                        <div class="small">${message}</div>
                    </div>
                    <button type="button" class="btn-close ms-2" data-bs-dismiss="alert"></button>
                </div>
                <div class="mt-2">
                    <button type="button" class="btn btn-sm btn-primary view-messages-btn">
                        <i class="fas fa-eye me-1"></i>查看消息
                    </button>
                    <button type="button" class="btn btn-sm btn-secondary mark-all-read-btn">
                        <i class="fas fa-check-double me-1"></i>全部已读
                    </button>
                </div>
            </div>
        `;

        const $notification = $(notificationHtml);

        // 绑定事件
        $notification.find('.view-messages-btn').on('click', function() {
            window.location.href = '/messages/inbox';
        });

        $notification.find('.mark-all-read-btn').on('click', async function() {
            await markAllAsRead();
            $notification.alert('close');
        });

        // 添加到容器
        $('#message-notification-container').append($notification);

        // 自动消失
        setTimeout(() => {
            $notification.fadeOut(500, function() {
                $(this).remove();
            });
        }, 8000);
    }

    /**
     * 播放提示音
     */
    function playNotificationSound() {
        try {
            const audio = new Audio(notificationSound);
            audio.volume = 0.3;
            audio.play().catch(e => {
                console.log('播放提示音失败:', e);
            });
        } catch (error) {
            console.log('创建音频对象失败:', error);
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
                unreadCount = 0;
                updateUnreadCountDisplay();
                lastUnreadCount = 0;
            }
        } catch (error) {
            console.error('标记全部已读失败:', error);
        }
    }

    /**
     * 手动刷新未读数量
     */
    function refresh() {
        checkMessages();
    }

    /**
     * 获取当前未读数量
     */
    function getUnreadCount() {
        return unreadCount;
    }

    /**
     * 显示消息预览
     */
    async function showMessagePreview() {
        try {
            const response = await fetch(`${window.AppConfig.API_BASE_URL}/messages?limit=5&unread_only=true`, {
                headers: {
                    'Authorization': `Bearer ${window.Auth.getToken()}`
                }
            });

            if (response.ok) {
                const result = await response.json();
                const messages = result.data.messages;

                if (messages.length > 0) {
                    showMessagePreviewModal(messages);
                } else {
                    window.App.showAlert('暂无未读消息', 'info');
                }
            }
        } catch (error) {
            console.error('获取消息预览失败:', error);
        }
    }

    /**
     * 显示消息预览模态框
     */
    function showMessagePreviewModal(messages) {
        // 移除现有的模态框
        $('#message-preview-modal').remove();

        const messagesHtml = messages.map(message => `
            <div class="message-preview-item p-3 border-bottom">
                <div class="d-flex justify-content-between align-items-start">
                    <div class="flex-grow-1">
                        <h6 class="mb-1">${message.title}</h6>
                        <p class="mb-1 text-muted small">${message.content.substring(0, 100)}${message.content.length > 100 ? '...' : ''}</p>
                        <small class="text-muted">
                            <i class="far fa-clock"></i> ${formatTime(message.created_at)}
                            ${message.sender ? `| ${message.sender.username}` : ''}
                        </small>
                    </div>
                    <span class="badge bg-primary">${getTypeText(message.type)}</span>
                </div>
            </div>
        `).join('');

        const modalHtml = `
            <div class="modal fade" id="message-preview-modal" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">未读消息预览 (${messages.length})</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body p-0" style="max-height: 400px; overflow-y: auto;">
                            ${messagesHtml}
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">关闭</button>
                            <button type="button" class="btn btn-primary view-all-messages-btn">
                                <i class="fas fa-envelope me-1"></i>查看全部消息
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        $('body').append(modalHtml);

        const $modal = $('#message-preview-modal');

        // 绑定查看全部消息按钮
        $modal.find('.view-all-messages-btn').on('click', function() {
            window.location.href = '/messages/inbox';
        });

        // 显示模态框
        $modal.modal('show');
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
     * 格式化时间
     */
    function formatTime(dateString) {
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

    // 公共API
    return {
        init: init,
        refresh: refresh,
        getUnreadCount: getUnreadCount,
        showMessagePreview: showMessagePreview,
        stopListening: stopListening
    };
})();

// 页面加载完成后初始化
$(document).ready(function() {
    // 如果用户已登录，初始化消息通知器
    if (window.Auth && window.Auth.isLoggedIn()) {
        window.MessageNotifier.init();
    }
});