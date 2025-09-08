<template>
	<view class="login-container">
		<!-- 顶部状态栏占位 -->
		<view class="status-bar" :style="{height: statusBarHeight + 'px'}"></view>
		
		<!-- 登录内容 -->
		<view class="login-content">
			<!-- Logo和标题 -->
			<view class="logo-section">
				<view class="logo">📖</view>
				<text class="title">简庐日记</text>
				<text class="subtitle">{{ isLogin ? '记录生活，分享美好' : '开始您的日记之旅' }}</text>
			</view>
			
			<!-- 登录表单 -->
			<view class="form-section" v-if="isLogin">
				<view class="form-item">
					<input 
						class="input" 
						type="text" 
						placeholder="请输入用户名"
						v-model="loginForm.username"
						:disabled="loading"
					/>
				</view>
				
				<view class="form-item">
					<input 
						class="input" 
						:type="showPassword ? 'text' : 'password'"
						placeholder="请输入密码"
						v-model="loginForm.password"
						:disabled="loading"
					/>
					<view class="password-toggle" @tap="togglePassword">
						{{ showPassword ? '👁️' : '👁️‍🗨️' }}
					</view>
				</view>
				
				<button 
					class="btn btn-primary login-btn" 
					@tap="handleLogin"
					:disabled="loading"
				>
					{{ loading ? '登录中...' : '登录' }}
				</button>
				
				<!-- 微信登录按钮 -->
				<view class="wechat-login-section">
					<view class="divider">
						<text class="divider-text">或</text>
					</view>
					<button 
						class="btn btn-wechat login-btn" 
						@tap="handleWechatLogin"
						:disabled="loading"
					>
						<text class="wechat-icon">📱</text>
						{{ loading ? '登录中...' : '微信登录' }}
					</button>
				</view>
			</view>
			
			<!-- 注册表单 -->
			<view class="form-section" v-else>
				<view class="form-item">
					<input 
						class="input" 
						type="text" 
						placeholder="请输入用户名"
						v-model="registerForm.username"
						:disabled="loading"
					/>
				</view>
				
				<view class="form-item">
					<input 
						class="input" 
						type="text" 
						placeholder="请输入邮箱"
						v-model="registerForm.email"
						:disabled="loading"
					/>
				</view>
				
				<view class="form-item">
					<input 
						class="input" 
						type="text" 
						placeholder="请输入昵称（可选）"
						v-model="registerForm.nickname"
						:disabled="loading"
					/>
				</view>
				
				<view class="form-item">
					<input 
						class="input" 
						type="password" 
						placeholder="请输入密码"
						v-model="registerForm.password"
						:disabled="loading"
					/>
				</view>
				
				<view class="form-item">
					<input 
						class="input" 
						type="password" 
						placeholder="请再次输入密码"
						v-model="registerForm.confirmPassword"
						:disabled="loading"
					/>
				</view>
				
				<button 
					class="btn btn-primary login-btn" 
					@tap="handleRegister"
					:disabled="loading"
				>
					{{ loading ? '注册中...' : '注册' }}
				</button>
			</view>
			
			<!-- 切换登录/注册 -->
			<view class="switch-section">
				<text class="switch-text" @tap="toggleMode">
					{{ isLogin ? '没有账户？立即注册' : '已有账户？立即登录' }}
				</text>
			</view>
			
			<!-- 测试账户提示 -->
			<view class="test-account">
				<text class="test-title">测试账户：</text>
				<text class="test-info">管理员: admin / admin123</text>
				<text class="test-info">测试用户: testuser / testpass123</text>
			</view>
		</view>
	</view>
</template>

<script setup>
	import { ref, reactive, onMounted } from 'vue'
	import { authApi } from '../../api/index.js'
	import { showSuccess, showError } from '../../utils/index.js'

	// 响应式数据
	const statusBarHeight = ref(0)
	const isLogin = ref(true)
	const showPassword = ref(false)
	const loading = ref(false)

	const loginForm = reactive({
		username: '',
		password: ''
	})

	const registerForm = reactive({
		username: '',
		email: '',
		nickname: '',
		password: '',
		confirmPassword: ''
	})

	// 页面加载时执行
	onMounted(() => {
		// 获取状态栏高度
		const systemInfo = uni.getSystemInfoSync()
		statusBarHeight.value = systemInfo.statusBarHeight
	})
	// 方法定义
	const toggleMode = () => {
		isLogin.value = !isLogin.value
		clearForms()
	}

	const togglePassword = () => {
		showPassword.value = !showPassword.value
	}

	const clearForms = () => {
		Object.assign(loginForm, {
			username: '',
			password: ''
		})
		Object.assign(registerForm, {
			username: '',
			email: '',
			nickname: '',
			password: '',
			confirmPassword: ''
		})
	}
			
	const handleLogin = async () => {
		if (!loginForm.username || !loginForm.password) {
			showError('请填写用户名和密码')
			return
		}

		loading.value = true
		console.log('开始登录，用户名:', loginForm.username)

		try {
			console.log('发送登录请求到:', 'http://localhost:3458/api/auth/login')
			console.log('登录数据:', loginForm)

			const response = await authApi.login(loginForm)
			console.log('登录响应:', response)

			if (response.success) {
				// 保存token和用户信息
				uni.setStorageSync('token', response.data.token)
				uni.setStorageSync('userInfo', response.data.user)

				console.log('登录成功，token已保存')
				showSuccess('登录成功')

				// 跳转到首页
				setTimeout(() => {
					uni.switchTab({
						url: '/pages/home/home'
					})
				}, 1000)
			} else {
				console.error('登录失败，响应:', response)
				showError(response.message || '登录失败')
			}
		} catch (error) {
			console.error('登录异常:', error)
			showError(`登录失败: ${error.message || '网络错误'}`)
		} finally {
			loading.value = false
		}
	}
			
	const handleRegister = async () => {
		const { username, email, password, confirmPassword, nickname } = registerForm

		if (!username || !email || !password) {
			showError('请填写必要信息')
			return
		}

		if (password !== confirmPassword) {
			showError('两次输入的密码不一致')
			return
		}

		loading.value = true
		try {
			const response = await authApi.register({
				username,
				email,
				password,
				nickname
			})

			if (response.success) {
				// 保存token和用户信息
				uni.setStorageSync('token', response.data.token)
				uni.setStorageSync('userInfo', response.data.user)

				showSuccess('注册成功')

				// 跳转到首页
				setTimeout(() => {
					uni.switchTab({
						url: '/pages/home/home'
					})
				}, 1000)
			} else {
				showError(response.message || '注册失败')
			}
		} catch (error) {
			showError(error.message || '注册失败')
		} finally {
			loading.value = false
		}
	}

	// 微信登录处理
	const handleWechatLogin = async () => {
		loading.value = true
		try {
			console.log('开始微信登录')

			// 检查网络状态
			const networkType = await uni.getNetworkType()
			if (networkType.networkType === 'none') {
				throw new Error('网络不可用，请检查网络连接')
			}
			
			// 1. 获取微信登录code
			const loginResult = await uni.login({
				provider: 'weixin',
				onlyAuthorize: true,
				timeout: 10000 // 10秒超时
			})

			if (loginResult.errMsg !== 'login:ok') {
				throw new Error('微信登录授权失败')
			}

			const { code } = loginResult
			console.log('获取微信登录code成功:', code)

			// 2. 发送code到后端进行微信登录
			const response = await authApi.wechatLogin({ code })
			console.log('微信登录响应:', response)

			if (response.success) {
				// 保存token和用户信息
				uni.setStorageSync('token', response.data.token)
				uni.setStorageSync('userInfo', response.data.user)

				console.log('微信登录成功，token已保存')
				showSuccess('登录成功')

				// 跳转到首页
				setTimeout(() => {
					uni.switchTab({
						url: '/pages/home/home'
					})
				}, 1000)
			} else {
				console.error('微信登录失败，响应:', response)
				showError(response.message || '微信登录失败')
			}
		} catch (error) {
			console.error('微信登录异常:', error)
			
			// 处理各种错误情况
			if (error.errMsg) {
				if (error.errMsg.includes('auth deny')) {
					showError('请授权微信登录以继续使用')
				} else if (error.errMsg.includes('timeout')) {
					showError('微信登录超时，请重试')
				} else if (error.errMsg.includes('network')) {
					showError('网络连接失败，请检查网络设置')
				} else {
					showError(`微信登录失败: ${error.errMsg}`)
				}
			} else if (error.message) {
				if (error.message.includes('网络')) {
					showError('网络连接失败，请检查网络设置')
				} else {
					showError(error.message)
				}
			} else {
				showError('微信登录失败，请重试')
			}
		} finally {
			loading.value = false
		}
	}
</script>

<style scoped>
	.login-container {
		min-height: 100vh;
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		display: flex;
		flex-direction: column;
	}
	
	.status-bar {
		background: transparent;
	}
	
	.login-content {
		flex: 1;
		padding: 60rpx 40rpx;
		display: flex;
		flex-direction: column;
		justify-content: center;
	}
	
	.logo-section {
		text-align: center;
		margin-bottom: 80rpx;
	}
	
	.logo {
		font-size: 120rpx;
		margin-bottom: 20rpx;
	}
	
	.title {
		display: block;
		font-size: 48rpx;
		font-weight: bold;
		color: #ffffff;
		margin-bottom: 16rpx;
	}
	
	.subtitle {
		display: block;
		font-size: 28rpx;
		color: rgba(255, 255, 255, 0.8);
	}
	
	.form-section {
		background: rgba(255, 255, 255, 0.95);
		border-radius: 20rpx;
		padding: 40rpx;
		margin-bottom: 40rpx;
	}
	
	.form-item {
		position: relative;
		margin-bottom: 30rpx;
	}
	
	.form-item:last-child {
		margin-bottom: 0;
	}
	
	.input {
		width: 100%;
		height: 88rpx;
		padding: 0 20rpx;
		border: 2rpx solid #e0e0e0;
		border-radius: 12rpx;
		font-size: 28rpx;
		box-sizing: border-box;
	}
	
	.input:focus {
		border-color: #667eea;
	}
	
	.password-toggle {
		position: absolute;
		right: 20rpx;
		top: 50%;
		transform: translateY(-50%);
		font-size: 32rpx;
		color: #999;
	}
	
	.login-btn {
		width: 100%;
		height: 88rpx;
		margin-top: 40rpx;
		font-size: 32rpx;
		font-weight: bold;
	}
	
	.wechat-login-section {
		margin-top: 40rpx;
	}
	
	.divider {
		position: relative;
		text-align: center;
		margin: 30rpx 0;
	}
	
	.divider::before {
		content: '';
		position: absolute;
		top: 50%;
		left: 0;
		right: 0;
		height: 1px;
		background: #e0e0e0;
	}
	
	.divider-text {
		position: relative;
		background: rgba(255, 255, 255, 0.95);
		padding: 0 20rpx;
		color: #999;
		font-size: 24rpx;
	}
	
	.btn-wechat {
		background: #07c160;
		color: white;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 10rpx;
	}
	
	.btn-wechat:active {
		background: #06ad56;
	}
	
	.wechat-icon {
		font-size: 32rpx;
	}
	
	.switch-section {
		text-align: center;
	}
	
	.switch-text {
		color: rgba(255, 255, 255, 0.9);
		font-size: 28rpx;
		text-decoration: underline;
	}
	
	.test-account {
		margin-top: 60rpx;
		padding: 30rpx;
		background: rgba(255, 255, 255, 0.1);
		border-radius: 16rpx;
		text-align: center;
	}
	
	.test-title {
		display: block;
		color: #ffffff;
		font-size: 28rpx;
		font-weight: bold;
		margin-bottom: 16rpx;
	}
	
	.test-info {
		display: block;
		color: rgba(255, 255, 255, 0.8);
		font-size: 24rpx;
		margin-bottom: 8rpx;
	}
</style>
