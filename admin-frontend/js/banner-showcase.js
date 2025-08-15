// 轮播图展示组件
class BannerShowcase {
    constructor(container, options = {}) {
        this.container = container;
        this.options = {
            autoplay: true,
            delay: 5000,
            effect: 'fade',
            showNavigation: true,
            showPagination: true,
            showOverlay: true,
            height: '400px',
            ...options
        };
        this.swiper = null;
        this.banners = [];
    }

    // 初始化轮播图
    async init() {
        try {
            console.log('BannerShowcase 初始化...');
            
            // 设置容器样式
            this.setupContainer();
            
            // 显示加载状态
            this.showLoading();
            
            // 加载数据
            await this.loadBanners();
            
            // 渲染轮播图
            this.render();
            
            // 初始化Swiper
            this.initSwiper();
            
        } catch (error) {
            console.error('BannerShowcase 初始化失败:', error);
            this.showError(error.message);
        }
    }

    // 设置容器
    setupContainer() {
        if (typeof this.container === 'string') {
            this.container = document.querySelector(this.container);
        }
        
        if (!this.container) {
            throw new Error('轮播图容器不存在');
        }

        // 添加必要的CSS
        this.injectCSS();
        
        this.container.className = 'banner-showcase-container';
        this.container.style.height = this.options.height;
    }

    // 注入必要的CSS
    injectCSS() {
        const cssId = 'banner-showcase-styles';
        if (document.getElementById(cssId)) return;

        const css = `
            <style id="${cssId}">
                .banner-showcase-container {
                    position: relative;
                    width: 100%;
                    border-radius: 12px;
                    overflow: hidden;
                    box-shadow: 0 8px 25px rgba(0,0,0,0.1);
                    background: #f8f9fa;
                }
                
                .banner-swiper {
                    width: 100%;
                    height: 100%;
                }
                
                .banner-swiper .swiper-slide {
                    position: relative;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    background: #f8f9fa;
                }
                
                .banner-swiper .swiper-slide img {
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
                    transform: translateY(-1px);
                    text-decoration: none;
                }
                
                .banner-swiper .swiper-pagination-bullet {
                    width: 10px;
                    height: 10px;
                    background: rgba(255,255,255,0.5);
                    opacity: 1;
                    margin: 0 4px;
                }
                
                .banner-swiper .swiper-pagination-bullet-active {
                    background: white;
                    transform: scale(1.2);
                }
                
                .banner-swiper .swiper-button-next,
                .banner-swiper .swiper-button-prev {
                    color: white;
                    background: rgba(0,0,0,0.3);
                    border-radius: 50%;
                    width: 40px;
                    height: 40px;
                    margin-top: -20px;
                    backdrop-filter: blur(10px);
                    transition: all 0.3s ease;
                }
                
                .banner-swiper .swiper-button-next:hover,
                .banner-swiper .swiper-button-prev:hover {
                    background: rgba(0,0,0,0.6);
                    transform: scale(1.1);
                }
                
                .banner-swiper .swiper-button-next:after,
                .banner-swiper .swiper-button-prev:after {
                    font-size: 16px;
                    font-weight: bold;
                }
                
                .banner-loading,
                .banner-error,
                .banner-empty {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    height: 100%;
                    flex-direction: column;
                    text-align: center;
                    color: #6c757d;
                }
                
                .banner-error {
                    color: #dc3545;
                }
                
                @media (max-width: 768px) {
                    .banner-slide-title {
                        font-size: 1.4rem;
                    }
                    
                    .banner-slide-description {
                        font-size: 0.9rem;
                    }
                    
                    .banner-swiper .swiper-button-next,
                    .banner-swiper .swiper-button-prev {
                        display: none;
                    }
                }
            </style>
        `;
        
        document.head.insertAdjacentHTML('beforeend', css);
    }

    // 加载轮播图数据
    async loadBanners() {
        const response = await window.API.banners.getList();
        
        if (!response.success) {
            throw new Error(response.message || '获取轮播图失败');
        }
        
        let banners = response.data;
        if (banners && banners.data) {
            banners = banners.data;
        }
        
        // 只显示激活状态的轮播图，按排序排列
        this.banners = banners
            .filter(banner => banner.status === 'active')
            .sort((a, b) => (a.sort_order || 999) - (b.sort_order || 999));
            
        console.log(`加载了 ${this.banners.length} 个激活的轮播图`);
    }

    // 显示加载状态
    showLoading() {
        this.container.innerHTML = `
            <div class="banner-loading">
                <div class="spinner-border text-primary mb-3"></div>
                <span>正在加载轮播图...</span>
            </div>
        `;
    }

    // 显示错误状态
    showError(message) {
        this.container.innerHTML = `
            <div class="banner-error">
                <i class="fas fa-exclamation-triangle fa-2x mb-3"></i>
                <h6>加载失败</h6>
                <p class="mb-3">${message}</p>
                <button class="btn btn-sm btn-outline-danger" onclick="this.init()">
                    <i class="fas fa-sync-alt"></i>
                    重新加载
                </button>
            </div>
        `;
    }

    // 显示空状态
    showEmpty() {
        this.container.innerHTML = `
            <div class="banner-empty">
                <i class="fas fa-images fa-2x text-muted mb-3"></i>
                <h6 class="text-muted">暂无轮播图</h6>
                <p class="text-muted mb-0">管理员还没有添加任何轮播图</p>
            </div>
        `;
    }

    // 渲染轮播图
    render() {
        if (this.banners.length === 0) {
            this.showEmpty();
            return;
        }

        const slides = this.banners.map(banner => {
            const hasLink = banner.link_url && banner.link_url.trim();
            const overlay = this.options.showOverlay ? `
                <div class="banner-slide-overlay">
                    <div class="banner-slide-title">${banner.title}</div>
                    ${banner.description ? `<div class="banner-slide-description">${banner.description}</div>` : ''}
                    ${hasLink ? `<a href="${banner.link_url}" class="banner-slide-link">了解更多</a>` : ''}
                </div>
            ` : '';
            
            return `
                <div class="swiper-slide">
                    <img src="${banner.image_url}" alt="${banner.title}" loading="lazy">
                    ${overlay}
                </div>
            `;
        }).join('');

        this.container.innerHTML = `
            <div class="swiper banner-swiper">
                <div class="swiper-wrapper">
                    ${slides}
                </div>
                ${this.options.showPagination ? '<div class="swiper-pagination"></div>' : ''}
                ${this.options.showNavigation ? `
                    <div class="swiper-button-next"></div>
                    <div class="swiper-button-prev"></div>
                ` : ''}
            </div>
        `;
    }

    // 初始化Swiper
    initSwiper() {
        const swiperConfig = {
            loop: this.banners.length > 1,
            speed: 800,
            effect: this.options.effect,
            grabCursor: true,
            
            // 自动播放
            autoplay: this.options.autoplay && this.banners.length > 1 ? {
                delay: this.options.delay,
                disableOnInteraction: false,
                pauseOnMouseEnter: true
            } : false,
            
            // 渐变效果配置
            fadeEffect: {
                crossFade: true
            },
            
            // 分页器
            pagination: this.options.showPagination ? {
                el: '.swiper-pagination',
                clickable: true,
                dynamicBullets: true
            } : false,
            
            // 导航按钮
            navigation: this.options.showNavigation && this.banners.length > 1 ? {
                nextEl: '.swiper-button-next',
                prevEl: '.swiper-button-prev'
            } : false,
            
            // 键盘控制
            keyboard: {
                enabled: true,
                onlyInViewport: true
            },
            
            // 事件回调
            on: {
                init: () => {
                    console.log('Banner Swiper 初始化完成');
                }
            }
        };

        this.swiper = new Swiper(this.container.querySelector('.banner-swiper'), swiperConfig);
    }

    // 销毁实例
    destroy() {
        if (this.swiper) {
            this.swiper.destroy(true, true);
            this.swiper = null;
        }
    }

    // 刷新数据
    async refresh() {
        this.destroy();
        await this.init();
    }
}

// 添加到全局
window.BannerShowcase = BannerShowcase;