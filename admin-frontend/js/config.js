// 应用配置文件

window.AppConfig = {
    // API配置
    API_BASE_URL: 'http://localhost:3460/api',
    
    // 应用信息
    APP_NAME: '简庐管理后台',
    APP_VERSION: '1.0.0',
    
    // 认证配置
    TOKEN_KEY: 'token',
    USER_KEY: 'admin_user',
    TOKEN_EXPIRES_KEY: 'admin_token_expires',
    
    // 分页配置
    DEFAULT_PAGE_SIZE: 20,
    PAGE_SIZE_OPTIONS: [10, 20, 50, 100],
    
    // 上传配置
    MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
    ALLOWED_FILE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'],
    
    // 界面配置
    SIDEBAR_COLLAPSED_KEY: 'sidebar_collapsed',
    THEME_KEY: 'theme',
    
    // 角色权限映射
    // TODO: 将硬编码权限配置迁移到后端API或配置文件
    ROLE_PERMISSIONS_TEMP: {
        // 超级管理员：拥有全部权限
        super_admin: [
            'dashboard:read', 'dashboard:write',
            'user:read', 'user:create', 'user:update', 'user:delete',
            'team:read', 'team:create', 'team:update', 'team:delete',
            'activity:read', 'activity:create', 'activity:update', 'activity:delete',
            'content:read', 'content:create', 'content:update', 'content:delete',
            'system:read', 'system:update', 'system:delete',
            'message:read', 'message:create', 'message:update', 'message:delete', 'message:send'
        ],
        // 系统管理员
        system_admin: [
            'dashboard:read',
            'user:read', 'user:create', 'user:update', 'user:delete',
            'team:read', 'team:create', 'team:update', 'team:delete',
            'activity:read', 'activity:create', 'activity:update', 'activity:delete',
            'content:read', 'content:create', 'content:update', 'content:delete',
            'system:read', 'system:update',
            'message:read', 'message:create', 'message:update', 'message:delete', 'message:send'
        ],
        // 运营管理员
        operation_admin: [
            'dashboard:read',
            'user:read', 'user:update',
            'team:read', 'team:create', 'team:update',
            'activity:read', 'activity:create', 'activity:update', 'activity:delete',
            'content:read', 'content:update', 'content:delete',
            'message:read', 'message:send'
        ],
        // 团队管理员
        team_admin: [
            'dashboard:read',
            'user:read',
            'team:read', 'team:create', 'team:update',
            'activity:read', 'activity:create', 'activity:update',
            'message:read', 'message:send'
        ],
        // 管理员（兼容旧配置）
        admin: [
            'dashboard:read',
            'user:read', 'user:create', 'user:update', 'user:delete',
            'team:read', 'team:create', 'team:update', 'team:delete',
            'activity:read', 'activity:create', 'activity:update', 'activity:delete',
            'content:read', 'content:create', 'content:update', 'content:delete',
            'system:read', 'system:update',
            'message:read', 'message:create', 'message:update', 'message:delete', 'message:send'
        ],
        // 普通用户：可以访问仪表板、管理自己的信息、创建和管理自己的团队和活动
        user: [
            'dashboard:read', 'profile:read', 'profile:update',
            'team:read', 'team:create', 'team:update',
            'activity:read', 'activity:create', 'activity:update',
            'message:read', 'message:send'
        ]
    },
    
    // 菜单配置
    // TODO: 将硬编码菜单配置迁移到后端API或配置文件
    MENU_ITEMS_TEMP: [
        {
            id: 'dashboard',
            title: '仪表板',
            icon: 'fas fa-tachometer-alt',
            path: '/dashboard',
            permissions: ['dashboard:read']
        },
        {
            id: 'users',
            title: '用户管理',
            icon: 'fas fa-users',
            path: '/users',
            permissions: ['user:read']
        },
        {
            id: 'profile',
            title: '个人资料',
            icon: 'fas fa-user',
            path: '/profile',
            permissions: ['profile:read']
        },
        {
            id: 'messages',
            title: '消息管理',
            icon: 'fas fa-envelope',
            path: '/messages',
            permissions: ['message:read'],
            children: [
                {
                    id: 'messages-inbox',
                    title: '收件箱',
                    path: '/messages/inbox',
                    permissions: ['message:read']
                },
                {
                    id: 'messages-sent',
                    title: '已发送',
                    path: '/messages/sent',
                    permissions: ['message:read']
                }
            ]
        },
        {
            id: 'teams',
            title: '团队管理',
            icon: 'fas fa-user-friends',
            path: '/teams',
            permissions: ['team:read'],
            children: [
                {
                    id: 'teams-list',
                    title: '团队列表',
                    path: '/teams/list',
                    permissions: ['team:read']
                },
                {
                    id: 'teams-types',
                    title: '团队类型',
                    path: '/teams/types',
                    permissions: ['team:read']
                }
            ]
        },
        {
            id: 'activities',
            title: '活动管理',
            icon: 'fas fa-calendar-alt',
            path: '/activities',
            permissions: ['activity:read'],
            children: [
                {
                    id: 'activities-list',
                    title: '活动列表',
                    path: '/activities/list',
                    permissions: ['activity:read']
                },
                {
                    id: 'activities-types',
                    title: '活动类型',
                    path: '/activities/types',
                    permissions: ['activity:read']
                }
            ]
        },
        {
            id: 'content',
            title: '内容管理',
            icon: 'fas fa-file-alt',
            path: '/content',
            permissions: ['content:read'],
            children: [
                {
                    id: 'content-banners',
                    title: '轮播图管理',
                    path: '/content/banners',
                    permissions: ['content:read']
                },
                {
                    id: 'content-diary',
                    title: '日记管理',
                    path: '/content/diary',
                    permissions: ['content:read']
                },
                {
                    id: 'content-comments',
                    title: '评论管理',
                    path: '/content/comments',
                    permissions: ['content:read']
                }
            ]
        },
        {
            id: 'settings',
            title: '系统设置',
            icon: 'fas fa-cog',
            path: '/settings',
            permissions: ['system:read'],
            children: [
                {
                    id: 'settings-basic',
                    title: '基础设置',
                    path: '/settings/basic',
                    permissions: ['system:read']
                },
                {
                    id: 'settings-security',
                    title: '安全设置',
                    path: '/settings/security',
                    permissions: ['system:update']
                }
            ]
        }
    ],
    
    // 角色显示名称
    // TODO: 将硬编码角色名称迁移到后端API或配置文件
    ROLE_NAMES_TEMP: {
        super_admin: '超级管理员',
        admin: '管理员',
        user: '普通用户'
    },
    
    // 状态显示名称
    STATUS_NAMES: {
        active: '正常',
        inactive: '禁用',
        deleted: '已删除',
        pending: '待审核',
        approved: '已通过',
        rejected: '已拒绝'
    },
    
    // 团队类型显示名称
    // TODO: 将硬编码团队类型迁移到后端API，预计2024年2月前完成
    TEAM_TYPE_NAMES_TEMP: {
        general: '通用团队',
        development: '开发团队',
        testing: '测试团队',
        design: '设计团队',
        marketing: '市场团队',
        operation: '运营团队',
        research: '研发团队',
        support: '支持团队'
    },
    
    // 弹窗行为配置
    // 禁用外部点击关闭功能，防止用户误触导致数据丢失
    MODAL_BEHAVIOR_TEMP: {
        // 点击外部是否关闭弹窗 - 已禁用以防止误触
        CLICK_OUTSIDE_TO_CLOSE: false,
        // 有数据时是否需要确认
        CONFIRM_ON_DATA_LOSS: false,
        // 特殊弹窗类型（永远不允许点击外部关闭）
        PROTECTED_MODALS: ['user-create', 'user-edit', 'activity-create', 'activity-edit']
    },
    
    // 测试账户
    TEST_ACCOUNTS: [
        {
            username: 'admin',
            password: 'admin123',
            role: 'super_admin',
            name: '超级管理员'
        },
        {
            username: 'sysadmin',
            password: 'sysadmin123',
            role: 'system_admin',
            name: '系统管理员'
        },
        {
            username: 'opadmin',
            password: 'opadmin123',
            role: 'operation_admin',
            name: '运营管理员'
        },
        {
            username: 'teamadmin',
            password: 'teamadmin123',
            role: 'team_admin',
            name: '团队管理员'
        }
    ]
};