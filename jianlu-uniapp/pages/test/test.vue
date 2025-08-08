<template>
	<view class="test-container">
		<text class="title">网络测试页面</text>
		
		<button class="btn" @tap="testConnection">测试网络连接</button>
		<button class="btn" @tap="testLogin">测试登录接口</button>
		
		<view class="result">
			<text class="result-title">测试结果：</text>
			<text class="result-text">{{ result }}</text>
		</view>
	</view>
</template>

<script>
export default {
	data() {
		return {
			result: '点击按钮开始测试'
		}
	},
	methods: {
		async testConnection() {
			this.result = '测试中...'
			try {
				const res = await uni.request({
					url: 'http://localhost:3001/health',
					method: 'GET'
				})
				console.log('连接测试结果:', res)
				this.result = `连接成功: ${JSON.stringify(res[1].data)}`
			} catch (error) {
				console.error('连接测试失败:', error)
				this.result = `连接失败: ${error.message}`
			}
		},
		
		async testLogin() {
			this.result = '登录测试中...'
			try {
				const res = await uni.request({
					url: 'http://localhost:3001/api/auth/login',
					method: 'POST',
					header: {
						'Content-Type': 'application/json'
					},
					data: {
						username: 'admin',
						password: 'password'
					}
				})
				console.log('登录测试结果:', res)
				this.result = `登录成功: ${JSON.stringify(res[1].data)}`
			} catch (error) {
				console.error('登录测试失败:', error)
				this.result = `登录失败: ${error.message}`
			}
		}
	}
}
</script>

<style scoped>
.test-container {
	padding: 40rpx;
}

.title {
	font-size: 36rpx;
	font-weight: bold;
	margin-bottom: 40rpx;
	display: block;
	text-align: center;
}

.btn {
	width: 100%;
	padding: 20rpx;
	margin-bottom: 20rpx;
	background: #007aff;
	color: white;
	border-radius: 8rpx;
	text-align: center;
}

.result {
	margin-top: 40rpx;
	padding: 20rpx;
	background: #f5f5f5;
	border-radius: 8rpx;
}

.result-title {
	font-weight: bold;
	display: block;
	margin-bottom: 10rpx;
}

.result-text {
	word-break: break-all;
}
</style>
