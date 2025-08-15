// 轮播图管理器
class BannersManager {
    constructor() {
        this.banners = [];
        this.isLoading = false;
        this.previewSwiper = null; // Swiper预览实例
    }

    // 初始化
    async init() {
        console.log('BannersManager 初始化...');
        await this.loadBanners();
    }

    // 加载轮播图数据
    async loadBanners() {
        if (this.isLoading) return;

        this.isLoading = true;
        try {
            console.log('正在加载轮播图数据...');

            // 使用现有系统的API调用方式
            if (typeof window.API !== 'undefined' && window.API.banners && window.API.banners.getList) {
                console.log('使用 window.API.banners.getList');
                const response = await window.API.banners.getList();
                console.log('API响应:', response);
                console.log('response.success:', response.success);
                console.log('response.data:', response.data);
                
                if (response.success) {
                    // 检查数据结构
                    let bannersData = response.data;
                    
                    // 如果 response.data 包含 data 属性，说明它是分页响应
                    if (bannersData && typeof bannersData === 'object' && bannersData.data) {
                        console.log('检测到分页响应格式');
                        bannersData = bannersData.data;
                    }
                    
                    // 确保最终的数据是数组
                    if (Array.isArray(bannersData)) {
                        this.banners = bannersData;
                        console.log(`成功加载 ${this.banners.length} 个轮播图`, this.banners);
                    } else {
                        console.warn('解析后的数据仍不是数组:', typeof bannersData, bannersData);
                        this.banners = [];
                    }
                } else {
                    throw new Error(response.message || '加载失败');
                }
            } else if (typeof API !== 'undefined' && API.banners && API.banners.getList) {
                console.log('使用 API.banners.getList');
                const response = await API.banners.getList();
                console.log('API响应:', response);
                if (response.success) {
                    let bannersData = response.data;
                    if (bannersData && typeof bannersData === 'object' && bannersData.data) {
                        bannersData = bannersData.data;
                    }
                    this.banners = Array.isArray(bannersData) ? bannersData : [];
                    console.log(`成功加载 ${this.banners.length} 个轮播图`, this.banners);
                } else {
                    throw new Error(response.message || '加载失败');
                }
            } else {
                console.log('使用降级fetch调用');
                // 降级到直接fetch调用
                const token = localStorage.getItem('token');
                const response = await fetch(`${AppConfig.API_BASE_URL}/banners`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                const result = await response.json();
                console.log('Fetch响应:', result);
                if (result.success) {
                    let bannersData = result.data;
                    if (bannersData && typeof bannersData === 'object' && bannersData.data) {
                        bannersData = bannersData.data;
                    }
                    this.banners = Array.isArray(bannersData) ? bannersData : [];
                    console.log(`成功加载 ${this.banners.length} 个轮播图`, this.banners);
                } else {
                    throw new Error(result.message || '加载失败');
                }
            }

            this.renderBanners();

        } catch (error) {
            console.error('加载轮播图失败:', error);
            this.showMessage('加载轮播图失败: ' + error.message, 'error');
            this.renderError(error.message);
        } finally {
            this.isLoading = false;
        }
    }

    // 渲染轮播图列表
    renderBanners() {
        const container = document.getElementById('banners-container');
        if (!container) return;

        // 确保 banners 是数组
        if (!Array.isArray(this.banners)) {
            console.warn('banners 不是数组，重置为空数组:', this.banners);
            this.banners = [];
        }

        if (this.banners.length === 0) {
            container.innerHTML = `
                <div class="text-center py-5">
                    <i class="fas fa-images fa-3x text-muted mb-3"></i>
                    <h5 class="text-muted">暂无轮播图</h5>
                    <p class="text-muted">点击"新增轮播图"按钮添加第一个轮播图</p>
                    <button class="btn btn-primary" onclick="bannersManager.showCreateModal()">
                        <i class="fas fa-plus"></i>
                        新增轮播图
                    </button>
                </div>
            `;
            return;
        }

        // 分离激活和非激活的轮播图
        const activeBanners = this.banners.filter(banner => banner.status === 'active');
        const inactiveBanners = this.banners.filter(banner => banner.status !== 'active');
        
        container.innerHTML = `
            <!-- 轮播图预览区域 -->
            ${activeBanners.length > 0 ? `
                <div class="preview-section mb-4">
                    <div class="d-flex justify-content-between align-items-center mb-3">
                        <h5 class="mb-0">
                            <i class="fas fa-eye text-success me-2"></i>
                            轮播图预览
                        </h5>
                        <div class="btn-group btn-group-sm">
                            <button class="btn btn-outline-secondary" onclick="bannersManager.refreshPreview()">
                                <i class="fas fa-sync-alt"></i>
                                刷新预览
                            </button>
                            <button class="btn btn-outline-primary" onclick="bannersManager.togglePreviewSize()">
                                <i class="fas fa-expand-arrows-alt"></i>
                                切换尺寸
                            </button>
                        </div>
                    </div>
                    <div class="preview-container" id="banner-preview">
                        <div class="swiper banner-preview-swiper">
                            <div class="swiper-wrapper">
                                ${activeBanners.map(banner => `
                                    <div class="swiper-slide">
                                        <img src="${banner.image_url}" alt="${banner.title}" loading="lazy">
                                        <div class="banner-slide-overlay">
                                            <div class="banner-slide-title">${banner.title}</div>
                                            ${banner.description ? `<div class="banner-slide-description">${banner.description}</div>` : ''}
                                            ${banner.link_url ? `<a href="${banner.link_url}" class="banner-slide-link" target="_blank">了解更多</a>` : ''}
                                        </div>
                                    </div>
                                `).join('')}
                            </div>
                            <div class="swiper-pagination"></div>
                            <div class="swiper-button-next"></div>
                            <div class="swiper-button-prev"></div>
                        </div>
                    </div>
                </div>
            ` : ''}
            
            <!-- 轮播图管理区域 -->
            <div class="management-section">
                <div class="d-flex justify-content-between align-items-center mb-3">
                    <h5 class="mb-0">
                        <i class="fas fa-cog text-primary me-2"></i>
                        轮播图管理 (${this.banners.length})
                    </h5>
                    <small class="text-muted">拖拽调整顺序</small>
                </div>
                
                <!-- 激活的轮播图 -->
                ${activeBanners.length > 0 ? `
                    <div class="banners-group mb-4">
                        <h6 class="text-success mb-3">
                            <i class="fas fa-eye me-1"></i>
                            激活中的轮播图 (${activeBanners.length})
                        </h6>
                        <div id="active-banners-list" class="sortable-list">
                            ${activeBanners.map((banner, index) => this.createBannerItem(banner, index, 'active')).join('')}
                        </div>
                    </div>
                ` : ''}
                
                <!-- 非激活的轮播图 -->
                ${inactiveBanners.length > 0 ? `
                    <div class="banners-group">
                        <h6 class="text-muted mb-3">
                            <i class="fas fa-eye-slash me-1"></i>
                            未激活的轮播图 (${inactiveBanners.length})
                        </h6>
                        <div id="inactive-banners-list" class="sortable-list">
                            ${inactiveBanners.map((banner, index) => this.createBannerItem(banner, index, 'inactive')).join('')}
                        </div>
                    </div>
                ` : ''}
            </div>
        `;

        // 初始化预览轮播图
        if (activeBanners.length > 0) {
            this.initPreviewSwiper();
        }
        
        // 初始化拖拽排序
        this.initSortable();
    }

    // 创建轮播图项目
    createBannerItem(banner, index, group = '') {
        const statusClass = banner.status === 'active' ? 'text-success' : 'text-muted';
        const statusIcon = banner.status === 'active' ? 'fa-eye' : 'fa-eye-slash';
        const statusText = banner.status === 'active' ? '显示中' : '已隐藏';

        return `
            <div class="banner-item ${banner.status !== 'active' ? 'disabled' : ''}" data-id="${banner.id}">
                <div class="row align-items-center">
                    <div class="col-auto">
                        <i class="fas fa-grip-vertical sort-handle"></i>
                        <span class="badge bg-secondary">${index + 1}</span>
                    </div>
                    <div class="col-auto">
                        <img src="${banner.image_url}" alt="${banner.title}" class="banner-preview">
                    </div>
                    <div class="col">
                        <div class="d-flex justify-content-between align-items-start">
                            <div>
                                <h6 class="mb-1">${banner.title}</h6>
                                <p class="text-muted mb-1 small">${banner.description || '无描述'}</p>
                                <div class="d-flex align-items-center gap-3">
                                    <span class="${statusClass}">
                                        <i class="fas ${statusIcon}"></i>
                                        ${statusText}
                                    </span>
                                    ${banner.link_url ? `<span class="text-info"><i class="fas fa-link"></i> 有链接</span>` : ''}
                                    <small class="text-muted">排序: ${banner.sort_order || index + 1}</small>
                                </div>
                            </div>
                            <div class="btn-group-actions">
                                <button class="btn btn-sm btn-outline-info" onclick="bannersManager.previewBanner(${banner.id})" title="预览">
                                    <i class="fas fa-eye"></i>
                                </button>
                                <button class="btn btn-sm btn-outline-primary" onclick="bannersManager.editBanner(${banner.id})" title="编辑">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="btn btn-sm btn-outline-${banner.status === 'active' ? 'warning' : 'success'}" 
                                        onclick="bannersManager.toggleStatus(${banner.id})" 
                                        title="${banner.status === 'active' ? '隐藏' : '显示'}">
                                    <i class="fas ${banner.status === 'active' ? 'fa-eye-slash' : 'fa-eye'}"></i>
                                </button>
                                <button class="btn btn-sm btn-outline-danger" onclick="bannersManager.deleteBanner(${banner.id})" title="删除">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // 显示创建轮播图模态框
    async showCreateModal() {
        const modalContent = `
            <form id="createBannerForm" enctype="multipart/form-data">
                <div class="row">
                    <div class="col-12">
                        <div class="form-group mb-3">
                            <label for="bannerTitle" class="form-label">轮播图标题 *</label>
                            <input type="text" class="form-control" id="bannerTitle" name="title" required 
                                   placeholder="请输入轮播图标题">
                        </div>
                    </div>
                </div>
                
                <div class="row">
                    <div class="col-12">
                        <div class="form-group mb-3">
                            <label for="bannerImage" class="form-label">轮播图图片 *</label>
                            <input type="file" class="form-control" id="bannerImage" name="image" 
                                   accept="image/*" required>
                            <div class="form-text">建议尺寸：750x300px，支持 JPG、PNG 格式，文件大小不超过 5MB</div>
                        </div>
                    </div>
                </div>
                
                <div class="row">
                    <div class="col-12">
                        <div class="form-group mb-3">
                            <label for="bannerDescription" class="form-label">描述</label>
                            <textarea class="form-control" id="bannerDescription" name="description" rows="2"
                                      placeholder="请输入轮播图描述（可选）"></textarea>
                        </div>
                    </div>
                </div>
                
                <div class="row">
                    <div class="col-md-6">
                        <div class="form-group mb-3">
                            <label for="bannerLinkUrl" class="form-label">跳转链接</label>
                            <input type="url" class="form-control" id="bannerLinkUrl" name="link_url" 
                                   placeholder="https://example.com（可选）">
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="form-group mb-3">
                            <label for="bannerSortOrder" class="form-label">排序</label>
                            <input type="number" class="form-control" id="bannerSortOrder" name="sort_order" 
                                   min="1" value="${this.banners.length + 1}" placeholder="数字越小越靠前">
                        </div>
                    </div>
                </div>
                
                <div class="row">
                    <div class="col-12">
                        <div class="form-check">
                            <input class="form-check-input" type="checkbox" id="bannerStatus" name="status" checked>
                            <label class="form-check-label" for="bannerStatus">
                                立即显示
                            </label>
                        </div>
                    </div>
                </div>
            </form>
        `;

        // 创建模态框
        const modal = Components.createModal({
            title: '新增轮播图',
            content: modalContent,
            size: 'lg',
            footer: `
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">取消</button>
                <button type="button" class="btn btn-primary" onclick="bannersManager.submitCreateBanner()">
                    <i class="fas fa-plus"></i>
                    创建轮播图
                </button>
            `
        });

        // 图片预览功能
        document.getElementById('bannerImage').addEventListener('change', function(e) {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    // 可以在这里添加图片预览功能
                    console.log('图片已选择:', file.name);
                };
                reader.readAsDataURL(file);
            }
        });
    }

    // 提交创建轮播图
    async submitCreateBanner() {
        const form = document.getElementById('createBannerForm');
        const formData = new FormData(form);
        
        // 验证必填字段
        const title = formData.get('title').trim();
        const imageFile = formData.get('image');
        
        if (!title) {
            this.showMessage('请填写轮播图标题', 'error');
            return;
        }
        
        if (!imageFile || imageFile.size === 0) {
            this.showMessage('请选择轮播图图片', 'error');
            return;
        }

        // 验证图片大小
        if (imageFile.size > 5 * 1024 * 1024) {
            this.showMessage('图片文件大小不能超过 5MB', 'error');
            return;
        }

        // 处理状态
        const status = document.getElementById('bannerStatus').checked ? 'active' : 'inactive';
        formData.set('status', status);

        try {
            let response;
            
            // 使用现有系统的API调用方式
            if (typeof window.API !== 'undefined' && window.API.banners && window.API.banners.create) {
                response = await window.API.banners.create(formData);
            } else if (typeof API !== 'undefined' && API.banners && API.banners.create) {
                response = await API.banners.create(formData);
            } else {
                // 降级到直接fetch调用
                const token = localStorage.getItem('token');
                const fetchResponse = await fetch(`${AppConfig.API_BASE_URL}/banners`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    },
                    body: formData
                });

                if (!fetchResponse.ok) {
                    throw new Error(`HTTP ${fetchResponse.status}: ${fetchResponse.statusText}`);
                }

                response = await fetchResponse.json();
            }
            
            if (response.success) {
                this.showMessage('轮播图创建成功', 'success');
                
                // 关闭模态框
                const modal = document.querySelector('.modal.show');
                if (modal) {
                    const bsModal = bootstrap.Modal.getInstance(modal);
                    if (bsModal) {
                        bsModal.hide();
                    } else {
                        // 如果bootstrap Modal不可用，直接移除
                        modal.remove();
                    }
                }
                
                // 重新加载数据
                await this.loadBanners();
            } else {
                throw new Error(response.message || '创建失败');
            }
        } catch (error) {
            console.error('创建轮播图失败:', error);
            this.showMessage('创建失败: ' + error.message, 'error');
        }
    }

    // 编辑轮播图
    editBanner(bannerId) {
        const banner = this.banners.find(b => b.id === bannerId);
        if (!banner) {
            this.showMessage('轮播图不存在', 'error');
            return;
        }
        this.showMessage(`编辑轮播图功能开发中: ${banner.title}`, 'info');
    }

    // 切换轮播图状态
    async toggleStatus(bannerId) {
        const banner = this.banners.find(b => b.id === bannerId);
        if (!banner) {
            this.showMessage('轮播图不存在', 'error');
            return;
        }

        const newStatus = banner.status === 'active' ? 'inactive' : 'active';
        const action = newStatus === 'active' ? '显示' : '隐藏';

        try {
            let response;
            
            if (typeof API !== 'undefined' && API.banners && API.banners.updateStatus) {
                response = await API.banners.updateStatus(bannerId, newStatus);
            } else {
                const token = localStorage.getItem('token');
                const fetchResponse = await fetch(`/api/banners/${bannerId}/status`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify({ status: newStatus })
                });

                if (!fetchResponse.ok) {
                    throw new Error(`HTTP ${fetchResponse.status}: ${fetchResponse.statusText}`);
                }

                response = await fetchResponse.json();
            }
            
            if (response.success) {
                this.showMessage(`轮播图已${action}`, 'success');
                await this.loadBanners();
            } else {
                throw new Error(response.message || `${action}失败`);
            }
        } catch (error) {
            console.error(`${action}轮播图失败:`, error);
            this.showMessage(`${action}失败: ` + error.message, 'error');
        }
    }

    // 删除轮播图
    async deleteBanner(bannerId) {
        const banner = this.banners.find(b => b.id === bannerId);
        if (!banner) {
            this.showMessage('轮播图不存在', 'error');
            return;
        }

        if (!confirm(`确定要删除轮播图"${banner.title}"吗？\n\n此操作不可恢复！`)) {
            return;
        }

        try {
            let response;
            
            if (typeof API !== 'undefined' && API.banners && API.banners.delete) {
                response = await API.banners.delete(bannerId);
            } else {
                const token = localStorage.getItem('token');
                const fetchResponse = await fetch(`/api/banners/${bannerId}`, {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (!fetchResponse.ok) {
                    throw new Error(`HTTP ${fetchResponse.status}: ${fetchResponse.statusText}`);
                }

                response = await fetchResponse.json();
            }
            
            if (response.success) {
                this.showMessage('轮播图删除成功', 'success');
                await this.loadBanners();
            } else {
                throw new Error(response.message || '删除失败');
            }
        } catch (error) {
            console.error('删除轮播图失败:', error);
            this.showMessage('删除失败: ' + error.message, 'error');
        }
    }

    // 刷新列表
    async refreshList() {
        await this.loadBanners();
    }

    // 初始化拖拽排序
    initSortable() {
        // 这里可以集成拖拽排序库，如 Sortable.js
        // 暂时先留空，后续可以扩展
        console.log('拖拽排序功能待实现');
    }

    // 渲染错误状态
    renderError(message) {
        const container = document.getElementById('banners-container');
        if (!container) return;

        container.innerHTML = `
            <div class="text-center py-5">
                <i class="fas fa-exclamation-triangle fa-3x text-warning mb-3"></i>
                <h5 class="text-muted">加载失败</h5>
                <p class="text-muted">${message}</p>
                <button class="btn btn-primary" onclick="bannersManager.loadBanners()">
                    <i class="fas fa-sync-alt"></i>
                    重新加载
                </button>
            </div>
        `;
    }

    // 显示消息
    showMessage(message, type = 'info') {
        if (typeof Utils !== 'undefined' && Utils.toast) {
            Utils.toast[type](message);
        } else {
            // 降级到alert
            alert(message);
        }
    }

    // 初始化预览轮播图
    initPreviewSwiper() {
        // 稍微延迟初始化，确保DOM已渲染
        setTimeout(() => {
            const swiperContainer = document.querySelector('.banner-preview-swiper');
            if (!swiperContainer) return;

            // 如果已存在实例，先销毁
            if (this.previewSwiper) {
                this.previewSwiper.destroy(true, true);
            }

            // 注入预览样式
            this.injectPreviewCSS();

            // 初始化Swiper
            this.previewSwiper = new Swiper('.banner-preview-swiper', {
                loop: true,
                autoplay: {
                    delay: 4000,
                    disableOnInteraction: false,
                    pauseOnMouseEnter: true
                },
                speed: 800,
                effect: 'fade',
                fadeEffect: {
                    crossFade: true
                },
                pagination: {
                    el: '.swiper-pagination',
                    clickable: true,
                    dynamicBullets: true
                },
                navigation: {
                    nextEl: '.swiper-button-next',
                    prevEl: '.swiper-button-prev'
                },
                keyboard: {
                    enabled: true,
                    onlyInViewport: true
                },
                on: {
                    init: () => {
                        console.log('Banner预览Swiper初始化完成');
                    }
                }
            });
        }, 100);
    }

    // 注入预览样式
    injectPreviewCSS() {
        const cssId = 'banner-preview-styles';
        if (document.getElementById(cssId)) return;

        const css = `
            <style id="${cssId}">
                .preview-container {
                    height: 350px;
                    border-radius: 12px;
                    overflow: hidden;
                    box-shadow: 0 8px 25px rgba(0,0,0,0.15);
                    transition: height 0.3s ease;
                }
                
                .preview-container.large {
                    height: 500px;
                }
                
                .banner-preview-swiper {
                    width: 100%;
                    height: 100%;
                }
                
                .banner-preview-swiper .swiper-slide {
                    position: relative;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: #f8f9fa;
                }
                
                .banner-preview-swiper .swiper-slide img {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                }
                
                .banner-slide-overlay {
                    position: absolute;
                    bottom: 0;
                    left: 0;
                    right: 0;
                    background: linear-gradient(transparent, rgba(0,0,0,0.8));
                    color: white;
                    padding: 30px 25px 20px;
                    z-index: 2;
                }
                
                .banner-slide-title {
                    font-size: 1.8rem;
                    font-weight: bold;
                    margin-bottom: 8px;
                    text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
                }
                
                .banner-slide-description {
                    font-size: 1rem;
                    opacity: 0.9;
                    margin-bottom: 15px;
                    text-shadow: 1px 1px 2px rgba(0,0,0,0.5);
                    display: -webkit-box;
                    -webkit-line-clamp: 2;
                    -webkit-box-orient: vertical;
                    overflow: hidden;
                }
                
                .banner-slide-link {
                    display: inline-block;
                    background: rgba(255,255,255,0.2);
                    border: 2px solid rgba(255,255,255,0.8);
                    color: white;
                    padding: 8px 16px;
                    border-radius: 25px;
                    text-decoration: none;
                    font-weight: 600;
                    font-size: 0.9rem;
                    backdrop-filter: blur(10px);
                    transition: all 0.3s ease;
                }
                
                .banner-slide-link:hover {
                    background: white;
                    color: #333;
                    text-decoration: none;
                    transform: translateY(-1px);
                }
                
                .banner-preview-swiper .swiper-pagination-bullet {
                    width: 12px;
                    height: 12px;
                    background: rgba(255,255,255,0.5);
                    opacity: 1;
                    margin: 0 4px;
                }
                
                .banner-preview-swiper .swiper-pagination-bullet-active {
                    background: white;
                    transform: scale(1.2);
                }
                
                .banner-preview-swiper .swiper-button-next,
                .banner-preview-swiper .swiper-button-prev {
                    color: white;
                    background: rgba(0,0,0,0.3);
                    border-radius: 50%;
                    width: 44px;
                    height: 44px;
                    margin-top: -22px;
                    backdrop-filter: blur(10px);
                    transition: all 0.3s ease;
                }
                
                .banner-preview-swiper .swiper-button-next:hover,
                .banner-preview-swiper .swiper-button-prev:hover {
                    background: rgba(0,0,0,0.6);
                    transform: scale(1.1);
                }
                
                .banner-preview-swiper .swiper-button-next:after,
                .banner-preview-swiper .swiper-button-prev:after {
                    font-size: 16px;
                    font-weight: bold;
                }
                
                .banners-group {
                    background: white;
                    border-radius: 8px;
                    padding: 20px;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                }
                
                @media (max-width: 768px) {
                    .preview-container {
                        height: 250px;
                    }
                    
                    .preview-container.large {
                        height: 350px;
                    }
                    
                    .banner-slide-title {
                        font-size: 1.4rem;
                    }
                    
                    .banner-slide-description {
                        font-size: 0.9rem;
                    }
                    
                    .banner-preview-swiper .swiper-button-next,
                    .banner-preview-swiper .swiper-button-prev {
                        display: none;
                    }
                }
            </style>
        `;
        
        document.head.insertAdjacentHTML('beforeend', css);
    }

    // 刷新预览
    refreshPreview() {
        if (this.previewSwiper) {
            this.previewSwiper.update();
            this.previewSwiper.autoplay.start();
        }
        this.showMessage('预览已刷新', 'success');
    }

    // 切换预览尺寸
    togglePreviewSize() {
        const container = document.querySelector('.preview-container');
        if (container) {
            container.classList.toggle('large');
            if (this.previewSwiper) {
                setTimeout(() => {
                    this.previewSwiper.update();
                }, 300);
            }
        }
    }

    // 预览单个轮播图
    previewBanner(bannerId) {
        const banner = this.banners.find(b => b.id === bannerId);
        if (!banner) {
            this.showMessage('轮播图不存在', 'error');
            return;
        }

        // 跳转到轮播图对应的幻灯片
        if (this.previewSwiper) {
            const activeBanners = this.banners.filter(b => b.status === 'active');
            const index = activeBanners.findIndex(b => b.id === bannerId);
            
            if (index !== -1) {
                this.previewSwiper.slideToLoop(index);
                // 滚动到预览区域
                document.getElementById('banner-preview')?.scrollIntoView({ 
                    behavior: 'smooth', 
                    block: 'start' 
                });
            } else {
                this.showMessage('该轮播图未激活，无法预览', 'warning');
            }
        }
    }
}

// 创建全局实例
const bannersManager = new BannersManager();

// 添加到全局
window.bannersManager = bannersManager;