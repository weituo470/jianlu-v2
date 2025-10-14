// 源码定位检查器脚本 - 仅在开发模式下使用
(function() {
    'use strict';

    let inspectorEnabled = false;
    let overlay = null;
    let currentHighlight = null;

    // 创建高亮覆盖层
    function createOverlay() {
        overlay = document.createElement('div');
        overlay.style.position = 'fixed';
        overlay.style.border = '2px dashed #007bff';
        overlay.style.backgroundColor = 'rgba(0, 123, 255, 0.2)';
        overlay.style.zIndex = '99999';
        overlay.style.pointerEvents = 'none';
        overlay.style.display = 'none';
        overlay.style.transition = 'all 0.1s ease';
        document.body.appendChild(overlay);
    }

    // 高亮显示元素
    function highlightElement(element) {
        if (!element || !overlay) return;

        const rect = element.getBoundingClientRect();
        const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
        const scrollY = window.pageYOffset || document.documentElement.scrollTop;

        Object.assign(overlay.style, {
            width: `${rect.width}px`,
            height: `${rect.height}px`,
            top: `${rect.top + scrollY}px`,
            left: `${rect.left + scrollX}px`,
            display: 'block'
        });

        currentHighlight = element;

        // 显示元素信息
        showElementInfo(element, rect, scrollX, scrollY);
    }

    // 显示元素信息
    function showElementInfo(element, rect, scrollX, scrollY) {
        // 移除之前的信息框
        const existingInfo = document.getElementById('dev-inspector-info');
        if (existingInfo) {
            existingInfo.remove();
        }

        const info = document.createElement('div');
        info.id = 'dev-inspector-info';
        info.style.position = 'fixed';
        info.style.backgroundColor = '#1a1a1a';
        info.style.color = '#fff';
        info.style.padding = '8px 12px';
        info.style.borderRadius = '4px';
        info.style.fontSize = '12px';
        info.style.fontFamily = 'Monaco, Consolas, monospace';
        info.style.zIndex = '100000';
        info.style.maxWidth = '300px';
        info.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';

        const tagName = element.tagName.toLowerCase();
        const elementId = element.id ? `#${element.id}` : '';
        const elementClasses = element.className ? `.${element.className.split(' ').join('.')}` : '';
        const devPath = element.getAttribute('data-dev-path');

        let infoContent = `<div style="margin-bottom: 4px;"><strong>${tagName}</strong>${elementId}${elementClasses}</div>`;

        if (devPath) {
            infoContent += `<div style="color: #4fc3f7; margin-bottom: 4px; word-break: break-all;">📁 ${devPath}</div>`;
            infoContent += `<div style="color: #81c784; font-size: 11px;">💡 点击打开文件</div>`;
        } else {
            infoContent += `<div style="color: #ff9800; font-size: 11px;">⚠️ 无源码路径信息</div>`;
        }

        info.innerHTML = infoContent;

        // 计算信息框位置
        let infoTop = rect.top + scrollY + rect.height + 5;
        let infoLeft = rect.left + scrollX;

        // 确保信息框不超出视窗
        const infoRect = info.getBoundingClientRect();
        if (infoLeft + infoRect.width > window.innerWidth) {
            infoLeft = window.innerWidth - infoRect.width - 10;
        }
        if (infoTop + infoRect.height > window.innerHeight) {
            infoTop = rect.top + scrollY - infoRect.height - 5;
        }

        info.style.top = `${infoTop}px`;
        info.style.left = `${infoLeft}px`;

        document.body.appendChild(info);
    }

    // 隐藏高亮和信息
    function hideHighlight() {
        if (overlay) {
            overlay.style.display = 'none';
        }
        const info = document.getElementById('dev-inspector-info');
        if (info) {
            info.remove();
        }
        currentHighlight = null;
    }

    // 切换检查器模式
    function toggleInspector() {
        inspectorEnabled = !inspectorEnabled;

        if (!overlay) {
            createOverlay();
        }

        if (inspectorEnabled) {
            document.body.style.cursor = 'crosshair';
            console.log('[Dev Inspector] 模式已开启 - 按 Escape 或快捷键关闭');
            showNotification('源码检查器已开启', 'info');
        } else {
            document.body.style.cursor = '';
            hideHighlight();
            console.log('[Dev Inspector] 模式已关闭');
            showNotification('源码检查器已关闭', 'info');
        }
    }

    // 显示通知
    function showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.style.position = 'fixed';
        notification.style.top = '20px';
        notification.style.right = '20px';
        notification.style.backgroundColor = type === 'info' ? '#007bff' : '#28a745';
        notification.style.color = 'white';
        notification.style.padding = '12px 20px';
        notification.style.borderRadius = '4px';
        notification.style.fontSize = '14px';
        notification.style.zIndex = '100001';
        notification.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.1)';
        notification.style.opacity = '0';
        notification.style.transform = 'translateY(-20px)';
        notification.style.transition = 'all 0.3s ease';

        notification.textContent = message;
        document.body.appendChild(notification);

        // 动画显示
        setTimeout(() => {
            notification.style.opacity = '1';
            notification.style.transform = 'translateY(0)';
        }, 10);

        // 自动隐藏
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateY(-20px)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, 300);
        }, 3000);
    }

    // 在VS Code中打开文件
    function openInVSCode(filePath) {
        if (!filePath) {
            showNotification('文件路径为空', 'error');
            return;
        }

        fetch(`/__open-in-editor?file=${encodeURIComponent(filePath)}`)
            .then(response => {
                if (response.ok) {
                    showNotification(`正在VS Code中打开: ${filePath}`, 'success');
                    console.log(`[Dev Inspector]: 正在打开文件: ${filePath}`);
                } else {
                    showNotification('打开文件失败', 'error');
                    console.error('[Dev Inspector]: 打开文件失败:', response.statusText);
                }
            })
            .catch(error => {
                showNotification('请求失败', 'error');
                console.error('[Dev Inspector]: 请求错误:', error);
            });
    }

    // 键盘事件监听
    document.addEventListener('keydown', (e) => {
        // Alt+Shift+C 切换检查器模式（主要推荐 - 完全不冲突）
        if (e.altKey && e.shiftKey && e.key === 'C') {
            e.preventDefault();
            toggleInspector();
        }

        // Alt+Shift+X 切换检查器模式（备选方案）
        if (e.altKey && e.shiftKey && e.key === 'X') {
            e.preventDefault();
            toggleInspector();
        }

        // Ctrl+Shift+K 切换检查器模式（备选方案）
        if (e.ctrlKey && e.shiftKey && e.key === 'K') {
            e.preventDefault();
            toggleInspector();
        }

        // Escape 键关闭检查器模式
        if (e.key === 'Escape' && inspectorEnabled) {
            e.preventDefault();
            toggleInspector();
        }
    });

    // 鼠标移动事件监听
    document.addEventListener('mouseover', (e) => {
        if (!inspectorEnabled) return;

        const target = e.target.closest('[data-dev-path]');
        if (target) {
            highlightElement(target);
        } else {
            hideHighlight();
        }
    });

    // 点击事件监听
    document.addEventListener('click', (e) => {
        if (!inspectorEnabled) return;

        const target = e.target.closest('[data-dev-path]');
        if (target) {
            e.preventDefault();
            e.stopPropagation();

            const filePath = target.getAttribute('data-dev-path');
            if (filePath) {
                openInVSCode(filePath);
            }
        }
    }, true);

    // 防止检查器模式下的默认点击行为
    document.addEventListener('click', (e) => {
        if (inspectorEnabled) {
            const target = e.target.closest('[data-dev-path]');
            if (!target) {
                e.preventDefault();
                e.stopPropagation();
            }
        }
    }, true);

    // 页面可见性变化时处理
    document.addEventListener('visibilitychange', () => {
        if (document.hidden && inspectorEnabled) {
            hideHighlight();
        }
    });

    // 窗口大小改变时重新计算高亮位置
    window.addEventListener('resize', () => {
        if (inspectorEnabled && currentHighlight) {
            highlightElement(currentHighlight);
        }
    });

    console.log('[Dev Inspector]: 源码定位检查器已加载');
    console.log('[Dev Inspector]: 快捷键: Alt+Shift+C 或 Alt+Shift+X 或 Ctrl+Shift+K 激活/关闭检查器模式');
})();