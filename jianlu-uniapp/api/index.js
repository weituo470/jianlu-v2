import { get, post, put, del } from '../utils/request.js'

// 认证相关API
export const authApi = {
	// 用户登录
	login: (data) => post('/auth/login', data),
	
	// 用户注册
	register: (data) => post('/auth/register', data)
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
	getList: () => get('/group'),

	// 获取我的团队列表
	getMyTeams: () => get('/wechat/my-teams'),

	// 获取群组详情
	getDetail: (id) => get(`/group/${id}`),

	// 创建群组
	create: (data) => post('/group', data),

	// 加入群组
	join: (id) => post(`/group/${id}/join`),

	// 离开群组
	leave: (id) => post(`/group/${id}/leave`),

	// 申请加入团队
	apply: (id, data) => post(`/wechat/teams/${id}/apply`, data),

	// 获取我的申请记录
	getMyApplications: (params) => get('/wechat/teams/my-applications', { params }),

	// 获取团队申请列表（团队负责人）
	getTeamApplications: (id, params) => get(`/wechat/teams/${id}/applications`, { params }),

	// 处理申请（批准/拒绝）
	processApplication: (applicationId, data) => put(`/wechat/teams/applications/${applicationId}`, data),

	// 获取申请统计
	getApplicationStats: (id) => get(`/wechat/teams/${id}/application-stats`),

	// 获取团队成员列表
	getTeamMembers: (id, params) => get(`/wechat/teams/${id}/members`, { params }),

	// 获取团队详情
	getTeamDetail: (id) => get(`/wechat/teams/${id}`)
}

// 活动相关API（保留旧版本兼容性）
export const activityApi = {
	// 获取活动列表
	getList: (params = {}) => {
		// 兼容旧版本的groupId参数
		if (typeof params === 'string' || typeof params === 'number') {
			return get(`/activity?group_id=${params}`)
		}
		// 新版本使用微信活动API
		return get('/wechat/activities', params)
	},

	// 获取活动详情
	getDetail: (id) => get(`/wechat/activities/${id}`),

	// 创建活动
	create: (data) => post('/wechat/activities', data),

	// 更新活动
	update: (id, data) => put(`/wechat/activities/${id}`, data),

	// 删除活动
	delete: (id) => del(`/wechat/activities/${id}`),

	// 报名活动
	register: (id, data) => post(`/wechat/activities/${id}/register`, data),

	// 取消报名
	cancelRegistration: (id) => del(`/wechat/activities/${id}/register`),

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
	
	// 获取用户统计
	getStats: () => get('/user/stats')
}
