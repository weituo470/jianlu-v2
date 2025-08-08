import { createSSRApp } from 'vue'
import App from './App.vue'

export function createApp() {
	const app = createSSRApp(App)

	// 全局配置
	app.config.globalProperties.$baseUrl = 'http://localhost:3458/api'

	// 全局错误处理
	app.config.errorHandler = (err, vm, info) => {
		console.error('Vue Error:', err, info)
	}

	return {
		app
	}
}