<template>
	<view class="profile-container">
		<!-- 用户信息卡片 -->
		<view class="user-card card">
			<view class="user-header">
				<view class="user-avatar">
					<image 
						v-if="userInfo.avatar" 
						:src="userInfo.avatar" 
						class="avatar-image"
						mode="aspectFill"
					/>
					<text v-else class="avatar-text">
						{{ (userInfo.nickname || userInfo.username || '').charAt(0) }}
					</text>
				</view>
				<view class="user-info">
					<text class="user-name">{{ userInfo.nickname || userInfo.username }}</text>
					<text class="user-email">{{ userInfo.email }}</text>
				</view>
				<button class="edit-btn" @tap="showEditModal">
					<text class="edit-icon">✏️</text>
				</button>
			</view>
			
			<view class="user-bio" v-if="userInfo.bio">
				{{ userInfo.bio }}
			</view>
		</view>
		
		<!-- 统计信息 -->
		<view class="stats-card card">
			<text class="card-title">使用统计</text>
			<view class="stats-grid">
				<view class="stat-item">
					<text class="stat-number">{{ stats.teamCount || 0 }}</text>
					<text class="stat-label">加入团队</text>
				</view>
				<view class="stat-item">
					<text class="stat-number">{{ stats.activityCount || 0 }}</text>
					<text class="stat-label">参与活动</text>
				</view>
				<view class="stat-item">
					<text class="stat-number">{{ stats.messageCount || 0 }}</text>
					<text class="stat-label">消息数量</text>
				</view>
			</view>
		</view>
		
		<!-- 功能菜单 -->
		<view class="menu-card card">
			<view class="menu-item" @tap="goToPage('/pages/home/home')">
				<text class="menu-icon">🏠</text>
				<text class="menu-text">首页</text>
				<text class="menu-arrow">></text>
			</view>

			<view class="menu-item" @tap="goToPage('/pages/team/team')">
				<text class="menu-icon">👥</text>
				<text class="menu-text">我的团队</text>
				<text class="menu-arrow">></text>
			</view>

			<view class="menu-item" @tap="goToPage('/pages/activity/activity')">
				<text class="menu-icon">📅</text>
				<text class="menu-text">我的活动</text>
				<text class="menu-arrow">></text>
			</view>

			<view class="menu-item" @tap="goToPage('/pages/message/message')">
				<text class="menu-icon">💬</text>
				<text class="menu-text">消息中心</text>
				<text class="menu-arrow">></text>
			</view>
		</view>
		
		<!-- 设置菜单 -->
		<view class="menu-card card">
			<view class="menu-item" @tap="showAbout">
				<text class="menu-icon">ℹ️</text>
				<text class="menu-text">关于简庐团队</text>
				<text class="menu-arrow">></text>
			</view>

			<view class="menu-item" @tap="logout">
				<text class="menu-icon">🚪</text>
				<text class="menu-text">退出登录</text>
				<text class="menu-arrow">></text>
			</view>
		</view>
		
		<!-- 编辑资料弹窗 -->
		<view class="modal-overlay" v-if="showModal" @tap="hideModal">
			<view class="modal-content" @tap.stop>
				<view class="modal-header">
					<text class="modal-title">编辑资料</text>
					<text class="modal-close" @tap="hideModal">×</text>
				</view>
				
				<view class="modal-body">
					<view class="form-item">
						<text class="label">昵称</text>
						<input 
							class="input" 
							type="text" 
							placeholder="输入您的昵称"
							v-model="editForm.nickname"
							:maxlength="50"
						/>
					</view>
					
					<view class="form-item">
						<text class="label">头像链接</text>
						<input 
							class="input" 
							type="text" 
							placeholder="输入头像图片链接"
							v-model="editForm.avatar"
						/>
					</view>
					
					<view class="form-item">
						<text class="label">个人简介</text>
						<textarea 
							class="textarea" 
							placeholder="介绍一下自己吧..."
							v-model="editForm.bio"
							:maxlength="500"
						/>
					</view>
				</view>
				
				<view class="modal-footer">
					<button class="btn btn-secondary" @tap="hideModal">取消</button>
					<button class="btn btn-primary" @tap="saveProfile" :disabled="saving">
						{{ saving ? '保存中...' : '保存' }}
					</button>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
	import { userApi } from '../../api/index.js'
	import { showSuccess, showError, showConfirm } from '../../utils/index.js'
	
	export default {
		data() {
			return {
				userInfo: {},
				stats: {},
				showModal: false,
				saving: false,
				editForm: {
					nickname: '',
					avatar: '',
					bio: ''
				}
			}
		},
		onLoad() {
			this.loadUserInfo()
			this.loadStats()
		},
		onShow() {
			this.loadUserInfo()
			this.loadStats()
		},
		methods: {
			// 加载用户信息
			loadUserInfo() {
				this.userInfo = uni.getStorageSync('userInfo') || {}
			},
			
			// 加载统计信息
			async loadStats() {
				try {
					const response = await userApi.getStats()
					if (response.success) {
						this.stats = response.data
					}
				} catch (error) {
					console.error('获取统计信息失败:', error)
				}
			},
			
			// 显示编辑弹窗
			showEditModal() {
				this.editForm = {
					nickname: this.userInfo.nickname || '',
					avatar: this.userInfo.avatar || '',
					bio: this.userInfo.bio || ''
				}
				this.showModal = true
			},
			
			// 隐藏编辑弹窗
			hideModal() {
				this.showModal = false
			},
			
			// 保存资料
			async saveProfile() {
				this.saving = true
				try {
					const response = await userApi.updateProfile(this.editForm)
					if (response.success) {
						// 更新本地存储的用户信息
						const updatedUserInfo = { ...this.userInfo, ...this.editForm }
						uni.setStorageSync('userInfo', updatedUserInfo)
						this.userInfo = updatedUserInfo
						
						showSuccess('资料更新成功')
						this.hideModal()
					}
				} catch (error) {
					showError('更新失败')
				} finally {
					this.saving = false
				}
			},
			
			// 跳转页面
			goToPage(url) {
				if (url.includes('/pages/home/home') || url.includes('/pages/team/team') || url.includes('/pages/activity/activity') || url.includes('/pages/message/message')) {
					uni.switchTab({ url })
				} else {
					uni.navigateTo({ url })
				}
			},
			
			// 显示关于信息
			showAbout() {
				uni.showModal({
					title: '关于简庐团队',
					content: '简庐团队 v1.0.0\n\n一个现代化的团队协作和活动管理平台。\n\n高效协作，共创未来！',
					showCancel: false
				})
			},
			
			// 退出登录
			async logout() {
				const confirmed = await showConfirm('确定要退出登录吗？')
				if (!confirmed) return
				
				// 清除本地存储
				uni.removeStorageSync('token')
				uni.removeStorageSync('userInfo')
				
				showSuccess('已退出登录')
				
				// 跳转到登录页
				setTimeout(() => {
					uni.reLaunch({
						url: '/pages/login/login'
					})
				}, 1000)
			}
		}
	}
</script>

<style scoped>
	.profile-container {
		padding: 20rpx;
		min-height: 100vh;
		background-color: #f5f5f5;
	}
	
	.user-card {
		margin-bottom: 20rpx;
		padding: 30rpx;
	}
	
	.user-header {
		display: flex;
		align-items: center;
		margin-bottom: 20rpx;
	}
	
	.user-avatar {
		width: 120rpx;
		height: 120rpx;
		border-radius: 60rpx;
		background: #007aff;
		display: flex;
		align-items: center;
		justify-content: center;
		margin-right: 24rpx;
		overflow: hidden;
	}
	
	.avatar-image {
		width: 100%;
		height: 100%;
		border-radius: 60rpx;
	}
	
	.avatar-text {
		color: #ffffff;
		font-size: 48rpx;
		font-weight: bold;
	}
	
	.user-info {
		flex: 1;
	}
	
	.user-name {
		font-size: 36rpx;
		font-weight: bold;
		color: #333;
		display: block;
		margin-bottom: 8rpx;
	}
	
	.user-email {
		font-size: 28rpx;
		color: #666;
		display: block;
	}
	
	.edit-btn {
		width: 60rpx;
		height: 60rpx;
		border-radius: 30rpx;
		background: #f0f0f0;
		display: flex;
		align-items: center;
		justify-content: center;
		border: none;
	}
	
	.edit-icon {
		font-size: 28rpx;
	}
	
	.user-bio {
		font-size: 28rpx;
		color: #666;
		line-height: 1.5;
		padding: 20rpx;
		background: #f8f8f8;
		border-radius: 12rpx;
	}
	
	.stats-card {
		margin-bottom: 20rpx;
		padding: 30rpx;
	}
	
	.card-title {
		font-size: 32rpx;
		font-weight: bold;
		color: #333;
		display: block;
		margin-bottom: 24rpx;
	}
	
	.stats-grid {
		display: flex;
		justify-content: space-around;
	}
	
	.stat-item {
		text-align: center;
	}
	
	.stat-number {
		font-size: 48rpx;
		font-weight: bold;
		color: #007aff;
		display: block;
		margin-bottom: 8rpx;
	}
	
	.stat-label {
		font-size: 24rpx;
		color: #666;
		display: block;
	}
	
	.menu-card {
		margin-bottom: 20rpx;
		padding: 0;
		overflow: hidden;
	}
	
	.menu-item {
		display: flex;
		align-items: center;
		padding: 30rpx;
		border-bottom: 2rpx solid #f0f0f0;
	}
	
	.menu-item:last-child {
		border-bottom: none;
	}
	
	.menu-icon {
		font-size: 32rpx;
		margin-right: 20rpx;
		width: 40rpx;
	}
	
	.menu-text {
		font-size: 28rpx;
		color: #333;
		flex: 1;
	}
	
	.menu-arrow {
		font-size: 24rpx;
		color: #999;
	}
	
	.modal-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
	}
	
	.modal-content {
		width: 90%;
		max-height: 80%;
		background: #ffffff;
		border-radius: 16rpx;
		display: flex;
		flex-direction: column;
	}
	
	.modal-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 30rpx;
		border-bottom: 2rpx solid #f0f0f0;
	}
	
	.modal-title {
		font-size: 32rpx;
		font-weight: bold;
	}
	
	.modal-close {
		font-size: 40rpx;
		color: #999;
	}
	
	.modal-body {
		flex: 1;
		padding: 30rpx;
		overflow-y: auto;
	}
	
	.form-item {
		margin-bottom: 30rpx;
	}
	
	.label {
		display: block;
		font-size: 28rpx;
		color: #333;
		margin-bottom: 12rpx;
	}
	
	.textarea {
		width: 100%;
		height: 120rpx;
		padding: 20rpx;
		border: 2rpx solid #e0e0e0;
		border-radius: 8rpx;
		font-size: 28rpx;
		box-sizing: border-box;
		resize: none;
	}
	
	.modal-footer {
		display: flex;
		gap: 20rpx;
		padding: 30rpx;
		border-top: 2rpx solid #f0f0f0;
	}
	
	.modal-footer .btn {
		flex: 1;
		height: 80rpx;
		line-height: 80rpx;
		text-align: center;
		border-radius: 8rpx;
		font-size: 28rpx;
	}
</style>
