// HTTP请求工具
import envConfig from '../config/env.js'

const BASE_URL = envConfig.API_BASE_URL

// 请求拦截器
const request = (options) => {
	return new Promise((resolve, reject) => {
		// 添加token
		const token = uni.getStorageSync('token')
		const header = {
			'Content-Type': 'application/json',
			...options.header
		}
		
		if (token) {
			header.Authorization = `Bearer ${token}`
		}
		
		const fullUrl = BASE_URL + options.url
		// 开发环境才打印详细请求日志
		if (process.env.NODE_ENV === 'development') {
			console.log('发送请求:', {
				url: fullUrl,
				method: options.method || 'GET',
				data: options.data,
				header
			})
		}

		uni.request({
			url: fullUrl,
			method: options.method || 'GET',
			data: options.data || {},
			header,
			success: (res) => {
			// 开发环境才打印详细响应日志
			if (process.env.NODE_ENV === 'development') {
				console.log('请求响应:', {
					url: fullUrl,
					statusCode: res.statusCode,
					data: res.data
				})
			}

				// 处理响应
				if (res.statusCode >= 200 && res.statusCode < 300) {
					// 2xx状态码都认为是成功
					resolve(res.data)
				} else if (res.statusCode === 401) {
					// token过期，清除本地存储并跳转登录
					uni.removeStorageSync('token')
					uni.removeStorageSync('userInfo')
					uni.reLaunch({
						url: '/pages/login/login'
					})
					reject(new Error('登录已过期'))
				} else {
					console.error('请求失败:', res)
					reject(new Error(res.data?.message || `请求失败 (${res.statusCode})`))
				}
			},
			fail: (err) => {
				console.error('网络请求失败:', {
					url: fullUrl,
					error: err
				})
				uni.showToast({
					title: '网络请求失败',
					icon: 'none'
				})
				reject(new Error(`网络请求失败: ${err.errMsg || '未知错误'}`))
			}
		})
	})
}

// GET请求
export const get = (url, data = {}) => {
	return request({
		url,
		method: 'GET',
		data
	})
}

// POST请求
export const post = (url, data = {}) => {
	return request({
		url,
		method: 'POST',
		data
	})
}

// PUT请求
export const put = (url, data = {}) => {
	return request({
		url,
		method: 'PUT',
		data
	})
}

// DELETE请求
export const del = (url, data = {}) => {
	return request({
		url,
		method: 'DELETE',
		data
	})
}

export default request
