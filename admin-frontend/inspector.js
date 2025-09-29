// 婧愮爜瀹氫綅妫€鏌ュ櫒鑴氭湰 - 浠呭湪寮€鍙戞ā寮忎笅浣跨敤
(function() {
    'use strict';

    let inspectorEnabled = false;
    let overlay = null;
    let currentHighlight = null;

    // 鍒涘缓楂樹寒瑕嗙洊灞?
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

    // 楂樹寒鏄剧ず鍏冪礌
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

        // 鏄剧ず鍏冪礌淇℃伅
        showElementInfo(element, rect, scrollX, scrollY);
    }

    // 鏄剧ず鍏冪礌淇℃伅
    function showElementInfo(element, rect, scrollX, scrollY) {
        // 绉婚櫎涔嬪墠鐨勪俊鎭
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
            infoContent += `<div style="color: #4fc3f7; margin-bottom: 4px; word-break: break-all;">馃搧 ${devPath}</div>`;
            infoContent += `<div style="color: #81c784; font-size: 11px;">馃挕 鐐瑰嚮鎵撳紑鏂囦欢</div>`;
        } else {
            infoContent += `<div style="color: #ff9800; font-size: 11px;">鈿狅笍 鏃犳簮鐮佽矾寰勪俊鎭?/div>`;
        }

        info.innerHTML = infoContent;

        // 璁＄畻淇℃伅妗嗕綅缃?
        let infoTop = rect.top + scrollY + rect.height + 5;
        let infoLeft = rect.left + scrollX;

        // 纭繚淇℃伅妗嗕笉瓒呭嚭瑙嗙獥
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

    // 闅愯棌楂樹寒鍜屼俊鎭?
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

    // 鍒囨崲妫€鏌ュ櫒妯″紡
    function toggleInspector() {
        inspectorEnabled = !inspectorEnabled;

        if (!overlay) {
            createOverlay();
        }

        if (inspectorEnabled) {
            document.body.style.cursor = 'crosshair';
            console.log('[Dev Inspector] 妯″紡宸插紑鍚?- 鎸?Escape 鎴栧揩鎹烽敭鍏抽棴');
            showNotification('婧愮爜妫€鏌ュ櫒宸插紑鍚?, 'info');
        } else {
            document.body.style.cursor = '';
            hideHighlight();
            console.log('[Dev Inspector] 妯″紡宸插叧闂?);
            showNotification('婧愮爜妫€鏌ュ櫒宸插叧闂?, 'info');
        }
    }

    // 鏄剧ず閫氱煡
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

        // 鍔ㄧ敾鏄剧ず
        setTimeout(() => {
            notification.style.opacity = '1';
            notification.style.transform = 'translateY(0)';
        }, 10);

        // 鑷姩闅愯棌
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

    // 鍦╒S Code涓墦寮€鏂囦欢
    function openInVSCode(filePath) {
        if (!filePath) {
            showNotification('鏂囦欢璺緞涓虹┖', 'error');
            return;
        }

        fetch(`/__open-in-editor?file=${encodeURIComponent(filePath)}`)
            .then(response => {
                if (response.ok) {
                    showNotification(`姝ｅ湪VS Code涓墦寮€: ${filePath}`, 'success');
                    console.log(`[Dev Inspector]: 姝ｅ湪鎵撳紑鏂囦欢: ${filePath}`);
                } else {
                    showNotification('鎵撳紑鏂囦欢澶辫触', 'error');
                    console.error('[Dev Inspector]: 鎵撳紑鏂囦欢澶辫触:', response.statusText);
                }
            })
            .catch(error => {
                showNotification('璇锋眰澶辫触', 'error');
                console.error('[Dev Inspector]: 璇锋眰閿欒:', error);
            });
    }

    // 閿洏浜嬩欢鐩戝惉
    document.addEventListener('keydown', (e) => {
        // Alt+Shift+C 鍒囨崲妫€鏌ュ櫒妯″紡锛堜富瑕佹帹鑽?- 瀹屽叏涓嶅啿绐侊級
        if (e.altKey && e.shiftKey && e.key === 'C') {
            e.preventDefault();
            toggleInspector();
        }

        // Alt+Shift+X 鍒囨崲妫€鏌ュ櫒妯″紡锛堝閫夋柟妗堬級
        if (e.altKey && e.shiftKey && e.key === 'X') {
            e.preventDefault();
            toggleInspector();
        }

        // Ctrl+Shift+K 鍒囨崲妫€鏌ュ櫒妯″紡锛堝閫夋柟妗堬級
        if (e.ctrlKey && e.shiftKey && e.key === 'K') {
            e.preventDefault();
            toggleInspector();
        }

        // Escape 閿叧闂鏌ュ櫒妯″紡
        if (e.key === 'Escape' && inspectorEnabled) {
            e.preventDefault();
            toggleInspector();
        }
    });

    // 榧犳爣绉诲姩浜嬩欢鐩戝惉
    document.addEventListener('mouseover', (e) => {
        if (!inspectorEnabled) return;

        const target = e.target.closest('[data-dev-path]');
        if (target) {
            highlightElement(target);
        } else {
            hideHighlight();
        }
    });

    // 鐐瑰嚮浜嬩欢鐩戝惉
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

    // 闃叉妫€鏌ュ櫒妯″紡涓嬬殑榛樿鐐瑰嚮琛屼负
    document.addEventListener('click', (e) => {
        if (inspectorEnabled) {
            const target = e.target.closest('[data-dev-path]');
            if (!target) {
                e.preventDefault();
                e.stopPropagation();
            }
        }
    }, true);

    // 椤甸潰鍙鎬у彉鍖栨椂澶勭悊
    document.addEventListener('visibilitychange', () => {
        if (document.hidden && inspectorEnabled) {
            hideHighlight();
        }
    });

    // 绐楀彛澶у皬鏀瑰彉鏃堕噸鏂拌绠楅珮浜綅缃?
    window.addEventListener('resize', () => {
        if (inspectorEnabled && currentHighlight) {
            highlightElement(currentHighlight);
        }
    });

    console.log('[Dev Inspector]: 婧愮爜瀹氫綅妫€鏌ュ櫒宸插姞杞?);
    console.log('[Dev Inspector]: 蹇嵎閿? Alt+Shift+C 鎴?Alt+Shift+X 鎴?Ctrl+Shift+K 婵€娲?鍏抽棴妫€鏌ュ櫒妯″紡');
})();
