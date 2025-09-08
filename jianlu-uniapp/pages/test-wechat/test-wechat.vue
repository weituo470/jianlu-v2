// 微信登录测试页面
<template>
	<view class="test-container">
		<view class="header">
			<text class="title">微信登录测试</text>
		</view>
		
		<view class="test-section">
			<button 
				class="test-btn wechat-btn" 
				@tap="testWechatLogin"
				:disabled="loading"
			>
				{{ loading ? '测试中...' : '测试微信登录' }}
			</button>
			
			<button 
				class="test-btn network-btn" 
				@tap="testNetwork"
				:disabled="loading"
			>
				{{ loading ? '测试中...' : '测试网络连接' }}
			</button>
			
			<button 
				class="test-btn api-btn" 
				@tap="testApi"
				:disabled="loading"
			>
				{{ loading ? '测试中...' : '测试API接口' }}
			</button>
		</view>
		
		<view class="result-section">
			<text class="result-title">测试结果：</text>
			<view class="result-content">
				<text class="result-text">{{ testResult }}</text>
			</view>
		</view>
		
		<view class="info-section">
			<text class="info-title">系统信息：</text>
			<view class="info-content">
				<text class="info-text">系统: {{ systemInfo.platform }}</text>
				<text class="info-text">版本: {{ systemInfo.system }}</text>
				<text class="info-text">网络: {{ networkStatus.networkType }}</text>
			</view>
		</view>
	</view>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { authApi } from '../../api/index.js'

const loading = ref(false)
const testResult = ref('暂无测试结果')
const systemInfo = ref({})
const networkStatus = ref({})

onMounted(() => {
	// 获取系统信息
	systemInfo.value = uni.getSystemInfoSync()
	
	// 获取网络状态
	uni.getNetworkType({
		success: (res) => {
			networkStatus.value = res
		}
	})
})

// 测试微信登录
const testWechatLogin = async () => {
	loading.value = true
	testResult.value = '开始测试微信登录...'
	
	try {
		// 检查网络
		const networkType = await uni.getNetworkType()
		if (networkType.networkType === 'none') {
			throw new Error('网络不可用')
		}
		
		testResult.value += '\n网络状态正常'
		
		// 测试微信登录
		const loginResult = await uni.login({
			provider: 'weixin',
			onlyAuthorize: true,
			timeout: 10000
		})
		
		if (loginResult.errMsg !== 'login:ok') {
			throw new Error(`微信登录失败: ${loginResult.errMsg}`)
		}
		
		testResult.value += '\n微信授权成功'
		testResult.value += `\n获取到code: ${loginResult.code.substring(0, 10)}...`
		
		// 测试后端API
		const response = await authApi.wechatLogin({ code: loginResult.code })
		
		if (response.success) {
			testResult.value += '\n后端API调用成功'
			testResult.value += '\n微信登录功能正常！'
		} else {
			throw new Error(`API响应失败: ${response.message}`)
		}
		
	} catch (error) {
		console.error('测试失败:', error)
		testResult.value += `\n测试失败: ${error.message || error.errMsg || '未知错误'}`
	} finally {
		loading.value = false
	}
}

// 测试网络连接
const testNetwork = async () => {
	loading.value = true
	testResult.value = '开始测试网络连接...'
	
	try {
		const networkType = await uni.getNetworkType()
		testResult.value += `\n网络类型: ${networkType.networkType}`
		
		if (networkType.networkType === 'none') {
			throw new Error('网络不可用')
		}
		
		// 测试HTTP请求
		const response = await uni.request({
			url: 'https://www.baidu.com',
			method: 'GET',
			timeout: 5000
		})
		
		testResult.value += '\n网络连接正常'
		
	} catch (error) {
		testResult.value += `\n网络测试失败: ${error.message || error.errMsg}`
	} finally {
		loading.value = false
	}
}

// 测试API接口
const testApi = async () => {
	loading.value = true
	testResult.value = '开始测试API接口...'
	
	try {
		// 直接测试HTTP请求
		testResult.value += '\n1. 测试健康检查接口...'
		const healthResponse = await uni.request({
			url: 'http://192.168.100.4:8081/health',
			method: 'GET',
			timeout: 5000
		})
		
		if (healthResponse.statusCode === 200) {
			testResult.value += '\n   健康检查成功'
		} else {
			throw new Error(`健康检查失败: ${healthResponse.statusCode}`)
		}
		
		// 测试微信登录API
		testResult.value += '\n2. 测试微信登录API...'
		const response = await authApi.wechatLogin({ code: 'test_code_123' })
		testResult.value += '\n   API调用成功'
		testResult.value += `\n   响应数据: ${JSON.stringify(response.data || response, null, 2)}`
	} catch (error) {
		testResult.value += `\nAPI测试失败: ${error.message || error.errMsg || JSON.stringify(error)}`
		console.error('API测试详细错误:', error)
	} finally {
		loading.value = false
	}
}
</script>

<style scoped>
.test-container {
	padding: 20px;
	background-color: #f5f5f5;
	min-height: 100vh;
}

.header {
	text-align: center;
	margin-bottom: 30px;
}

.title {
	font-size: 24px;
	font-weight: bold;
	color: #333;
}

.test-section {
	margin-bottom: 30px;
}

.test-btn {
	width: 100%;
	height: 50px;
	margin-bottom: 15px;
	border-radius: 8px;
	font-size: 16px;
	color: white;
	border: none;
}

.wechat-btn {
	background: linear-gradient(45deg, #07c160, #95ec69);
}

.network-btn {
	background: linear-gradient(45deg, #1890ff, #69c0ff);
}

.api-btn {
	background: linear-gradient(45deg, #722ed1, #b37feb);
}

.test-btn:disabled {
	opacity: 0.6;
}

.result-section, .info-section {
	background: white;
	border-radius: 8px;
	padding: 15px;
	margin-bottom: 20px;
}

.result-title, .info-title {
	font-size: 18px;
	font-weight: bold;
	color: #333;
	margin-bottom: 10px;
	display: block;
}

.result-content {
	min-height: 100px;
	background: #f8f9fa;
	padding: 10px;
	border-radius: 4px;
}

.result-text {
	font-size: 14px;
	color: #666;
	white-space: pre-wrap;
}

.info-content {
	display: flex;
	flex-direction: column;
	gap: 5px;
}

.info-text {
	font-size: 14px;
	color: #666;
}
</style>