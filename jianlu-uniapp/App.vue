<script>
	export default {
		onLaunch: function() {
			console.log('简庐日记小程序启动')

			// 检查登录状态
			this.checkLoginStatus()
		},
		onShow: function() {
			console.log('简庐日记小程序显示')
		},
		onHide: function() {
			console.log('简庐日记小程序隐藏')
		},
		methods: {
			checkLoginStatus() {
				const token = uni.getStorageSync('token')
				if (!token) {
					// 如果没有token，跳转到登录页
					uni.reLaunch({
						url: '/pages/login/login'
					})
				} else {
					// 如果有token，跳转到首页
					uni.switchTab({
						url: '/pages/home/home'
					})
				}
			}
		}
	}
</script>

<style>
	/* 全局样式 */
	page {
		background-color: #f5f5f5;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
	}

	/* 通用样式类 */
	.container {
		padding: 20rpx;
	}

	.card {
		background-color: #ffffff;
		border-radius: 16rpx;
		padding: 24rpx;
		margin-bottom: 20rpx;
		box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.1);
	}

	.btn {
		padding: 20rpx 40rpx;
		border-radius: 8rpx;
		font-size: 28rpx;
		text-align: center;
		border: none;
		outline: none;
	}

	.btn-primary {
		background-color: #007aff;
		color: #ffffff;
	}

	.btn-secondary {
		background-color: #f0f0f0;
		color: #333333;
	}

	.btn-outline {
		background-color: transparent;
		border: 2rpx solid #007aff;
		color: #007aff;
	}

	.input {
		width: 100%;
		padding: 20rpx;
		border: 2rpx solid #e0e0e0;
		border-radius: 8rpx;
		font-size: 28rpx;
		box-sizing: border-box;
	}

	.input:focus {
		border-color: #007aff;
	}

	.text-center {
		text-align: center;
	}

	.text-primary {
		color: #007aff;
	}

	.text-secondary {
		color: #666666;
	}

	.text-success {
		color: #28a745;
	}

	.text-danger {
		color: #dc3545;
	}

	.mb-20 {
		margin-bottom: 20rpx;
	}

	.mb-40 {
		margin-bottom: 40rpx;
	}

	.mt-20 {
		margin-top: 20rpx;
	}

	.mt-40 {
		margin-top: 40rpx;
	}

	.flex {
		display: flex;
	}

	.flex-column {
		flex-direction: column;
	}

	.flex-row {
		flex-direction: row;
	}

	.justify-center {
		justify-content: center;
	}

	.justify-between {
		justify-content: space-between;
	}

	.align-center {
		align-items: center;
	}

	.flex-1 {
		flex: 1;
	}
</style>
