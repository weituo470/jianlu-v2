// 工具函数集合

// 格式化日期
export const formatDate = (date, format = 'YYYY-MM-DD') => {
	const d = new Date(date)
	const year = d.getFullYear()
	const month = String(d.getMonth() + 1).padStart(2, '0')
	const day = String(d.getDate()).padStart(2, '0')
	const hour = String(d.getHours()).padStart(2, '0')
	const minute = String(d.getMinutes()).padStart(2, '0')
	const second = String(d.getSeconds()).padStart(2, '0')
	
	return format
		.replace('YYYY', year)
		.replace('MM', month)
		.replace('DD', day)
		.replace('HH', hour)
		.replace('mm', minute)
		.replace('ss', second)
}

// 格式化相对时间
export const formatRelativeTime = (date) => {
	const now = new Date()
	const target = new Date(date)
	const diff = now - target
	
	const minute = 60 * 1000
	const hour = 60 * minute
	const day = 24 * hour
	const week = 7 * day
	const month = 30 * day
	
	if (diff < minute) {
		return '刚刚'
	} else if (diff < hour) {
		return `${Math.floor(diff / minute)}分钟前`
	} else if (diff < day) {
		return `${Math.floor(diff / hour)}小时前`
	} else if (diff < week) {
		return `${Math.floor(diff / day)}天前`
	} else if (diff < month) {
		return `${Math.floor(diff / week)}周前`
	} else {
		return formatDate(date, 'YYYY年MM月DD日')
	}
}

// 显示成功提示
export const showSuccess = (title, duration = 2000) => {
	uni.showToast({
		title,
		icon: 'success',
		duration
	})
}

// 显示错误提示
export const showError = (title, duration = 2000) => {
	uni.showToast({
		title,
		icon: 'none',
		duration
	})
}

// 显示加载中
export const showLoading = (title = '加载中...') => {
	uni.showLoading({
		title,
		mask: true
	})
}

// 隐藏加载
export const hideLoading = () => {
	uni.hideLoading()
}

// 确认对话框
export const showConfirm = (content, title = '提示') => {
	return new Promise((resolve) => {
		uni.showModal({
			title,
			content,
			success: (res) => {
				resolve(res.confirm)
			}
		})
	})
}

// 获取心情图标
export const getMoodIcon = (mood) => {
	const moodMap = {
		happy: '😊',
		sad: '😢',
		angry: '😠',
		excited: '🤩',
		calm: '😌',
		anxious: '😰'
	}
	return moodMap[mood] || ''
}

// 获取天气图标
export const getWeatherIcon = (weather) => {
	const weatherMap = {
		sunny: '☀️',
		cloudy: '☁️',
		rainy: '🌧️',
		snowy: '❄️',
		windy: '💨'
	}
	return weatherMap[weather] || ''
}

// 获取活动状态
export const getActivityStatus = (startTime, endTime) => {
	const now = new Date()
	const start = new Date(startTime)
	const end = new Date(endTime)
	
	if (now < start) return 'upcoming'
	if (now >= start && now <= end) return 'ongoing'
	return 'ended'
}

// 获取活动状态文本
export const getActivityStatusText = (startTime, endTime) => {
	const status = getActivityStatus(startTime, endTime)
	const statusMap = {
		upcoming: '即将开始',
		ongoing: '进行中',
		ended: '已结束'
	}
	return statusMap[status]
}

// 防抖函数
export const debounce = (func, wait) => {
	let timeout
	return function executedFunction(...args) {
		const later = () => {
			clearTimeout(timeout)
			func(...args)
		}
		clearTimeout(timeout)
		timeout = setTimeout(later, wait)
	}
}

// 节流函数
export const throttle = (func, limit) => {
	let inThrottle
	return function() {
		const args = arguments
		const context = this
		if (!inThrottle) {
			func.apply(context, args)
			inThrottle = true
			setTimeout(() => inThrottle = false, limit)
		}
	}
}
