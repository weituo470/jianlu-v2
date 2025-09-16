// 开发环境配置
const config = {
	// 开发环境：使用localhost，仅在微信开发者工具中可用
	development: {
		API_BASE_URL: 'http://localhost:3460/api',
		IMAGE_BASE_URL: 'http://localhost:3460',
		// 是否忽略HTTPS检查（仅开发环境）
	ignoreHttps: true
	},
	
	// 生产环境：必须使用 HTTPS
	production: {
		API_BASE_URL: 'https://your-domain.com/api',
		IMAGE_BASE_URL: 'https://your-domain.com',
		ignoreHttps: false
	}
}

// 获取当前环境配置
const getCurrentConfig = () => {
	// #ifdef MP-WEIXIN
	// 小程序环境，默认使用开发配置
	return config.development
	// #endif
	
	// #ifdef H5
	// H5环境，根据域名判断
	return window.location.protocol === 'https:' ? config.production : config.development
	// #endif
	
	// 默认开发环境
	return config.development
}

export default getCurrentConfig()