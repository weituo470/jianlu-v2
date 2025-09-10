import { get, post, put, del } from '../utils/request.js'

// 认证相关API
export const authApi = {
	// 用户登录
	login: (data) => post('/auth/login', data),
	
	// 用户注册
	register: (data) => post('/auth/register', data),
	
	// 微信登录
	wechatLogin: (data) => post('/auth/wechat-login', data)
}

// 轮播图相关API
export const bannerApi = {
	// 获取轮播图列表（只获取激活的）
	getList: () => get('/banners/public/active')
}

// 日记相关API
export const diaryApi = {
	// 获取日记列表
	getList: (page = 1, limit = 10) => get(`/diary?page=${page}&limit=${limit}`),
	
	// 获取日记详情
	getDetail: (id) => get(`/diary/${id}`),
	
	// 创建日记
	create: (data) => post('/diary', data),
	
	// 更新日记
	update: (id, data) => put(`/diary/${id}`, data),
	
	// 删除日记
	delete: (id) => del(`/diary/${id}`)
}

// 群组相关API
export const groupApi = {
	// 获取群组列表（所有可加入的团队）
	getList: () => get('/miniapp/teams'),

	// 获取我的团队列表
	getMyTeams: () => get('/miniapp/my-teams'),

	// 获取群组详情
	getDetail: (id) => get(`/miniapp/teams/${id}`),

	// 创建群组
	create: (data) => post('/miniapp/teams', data),

	// 加入群组
	join: (id) => post(`/miniapp/teams/${id}/join`),

	// 离开群组
	leave: (id) => post(`/miniapp/teams/${id}/leave`),

	// 申请加入团队
	apply: (id, data) => post(`/miniapp/teams/${id}/apply`, data),

	// 获取我的申请记录
	getMyApplications: (params) => get('/miniapp/teams/my-applications', { params }),

	// 获取团队申请列表（团队负责人）
	getTeamApplications: (id, params) => get(`/miniapp/teams/${id}/applications`, { params }),

	// 处理申请（批准/拒绝）
	processApplication: (applicationId, data) => put(`/miniapp/teams/applications/${applicationId}`, data),

	// 获取申请统计
	getApplicationStats: (id) => get(`/miniapp/teams/${id}/application-stats`),

	// 获取团队成员列表
	getTeamMembers: (id, params) => get(`/miniapp/teams/${id}/members`, { params }),

	// 获取团队详情
	getTeamDetail: (id) => get(`/miniapp/teams/${id}`),

	// 获取团队类型列表
	getTeamTypes: () => get('/miniapp/team-types')
}

// 活动相关API（使用小程序专用API）
export const activityApi = {
	// 获取活动列表
	getList: (params = {}) => {
		// 兼容旧版本的groupId参数
		if (typeof params === 'string' || typeof params === 'number') {
			return get(`/activity?group_id=${params}`)
		}
		// 使用小程序专用活动API
		return get('/miniapp/activities', params)
	},

	// 获取活动详情
	getDetail: (id) => get(`/miniapp/activities/${id}`),

	// 创建活动
	create: (data) => post('/miniapp/activities', data),

	// 更新活动
	update: (id, data) => put(`/miniapp/activities/${id}`, data),

	// 删除活动
	delete: (id) => del(`/miniapp/activities/${id}`),

	// 报名活动
	register: (id, data) => post(`/miniapp/activities/${id}/register`, data),

	// 取消报名
	cancelRegistration: (id) => del(`/miniapp/activities/${id}/register`),

	// 获取活动类型列表
	getTypes: () => get('/miniapp/activity-types'),

	// 参加活动（兼容旧版本）
	join: (id) => post(`/activity/${id}/join`),

	// 取消参加活动（兼容旧版本）
	leave: (id) => post(`/activity/${id}/leave`)
}

// 用户相关API
export const userApi = {
	// 获取用户信息
	getProfile: () => get('/user/profile'),
	
	// 更新用户信息
	updateProfile: (data) => put('/user/profile', data),
	
	// 搜索用户
	search: (query) => get(`/user/search?q=${encodeURIComponent(query)}`),
	
	}
