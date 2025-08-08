<template>
	<view class="home-container">
		<!-- 顶部欢迎区域 -->
		<view class="welcome-section">
			<view class="welcome-header">
				<view class="user-info">
					<view class="avatar">
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
					<view class="user-details">
						<text class="welcome-text">你好，{{ userInfo.nickname || userInfo.username }}！</text>
						<text class="welcome-subtitle">欢迎来到简庐团队协作平台</text>
					</view>
				</view>
				<view class="notification-icon" @tap="goToMessages">
					<text class="icon">🔔</text>
					<view class="badge" v-if="unreadCount > 0">{{ unreadCount > 99 ? '99+' : unreadCount }}</view>
				</view>
			</view>
		</view>
		
		<!-- 快捷功能区 -->
		<view class="quick-actions">
			<text class="section-title">快捷功能</text>
			<view class="action-grid">
				<view class="action-item" @tap="createTeam">
					<view class="action-icon">👥</view>
					<text class="action-text">创建团队</text>
				</view>
				<view class="action-item" @tap="createActivity">
					<view class="action-icon">📅</view>
					<text class="action-text">发起活动</text>
				</view>
				<view class="action-item" @tap="joinTeam">
					<view class="action-icon">🔗</view>
					<text class="action-text">加入团队</text>
				</view>
				<view class="action-item" @tap="viewCalendar">
					<view class="action-icon">📆</view>
					<text class="action-text">日程安排</text>
				</view>
			</view>
		</view>
		
		<!-- 最近活动 -->
		<view class="recent-activities">
			<view class="section-header">
				<text class="section-title">最近活动</text>
				<text class="more-link" @tap="goToActivities">查看更多</text>
			</view>
			
			<view class="activity-list" v-if="recentActivities.length > 0">
				<view 
					class="activity-item" 
					v-for="activity in recentActivities" 
					:key="activity.id"
					@tap="viewActivity(activity)"
				>
					<view class="activity-info">
						<text class="activity-title">{{ activity.title }}</text>
						<text class="activity-team">{{ activity.team_name }}</text>
						<text class="activity-time">{{ formatDate(activity.start_time, 'MM月DD日 HH:mm') }}</text>
					</view>
					<view class="activity-status" :class="getActivityStatus(activity.start_time, activity.end_time)">
						{{ getActivityStatusText(activity.start_time, activity.end_time) }}
					</view>
				</view>
			</view>
			
			<view class="empty-state" v-else>
				<text class="empty-icon">📅</text>
				<text class="empty-text">暂无最近活动</text>
			</view>
		</view>
		
		<!-- 我的团队 -->
		<view class="my-teams">
			<view class="section-header">
				<text class="section-title">我的团队</text>
				<text class="more-link" @tap="goToTeams">查看更多</text>
			</view>
			
			<view class="team-list" v-if="myTeams.length > 0">
				<view 
					class="team-item" 
					v-for="team in myTeams" 
					:key="team.id"
					@tap="viewTeam(team)"
				>
					<view class="team-avatar">
						{{ team.name.charAt(0) }}
					</view>
					<view class="team-info">
						<text class="team-name">{{ team.name }}</text>
						<text class="team-members">{{ team.member_count }} 成员</text>
					</view>
					<view class="team-role" :class="team.role">
						{{ team.role === 'admin' ? '管理员' : '成员' }}
					</view>
				</view>
			</view>
			
			<view class="empty-state" v-else>
				<text class="empty-icon">👥</text>
				<text class="empty-text">暂未加入任何团队</text>
			</view>
		</view>
	</view>
</template>

<script>
	import { groupApi, activityApi } from '../../api/index.js'
	import { formatDate, getActivityStatus, getActivityStatusText, showSuccess, showError } from '../../utils/index.js'
	
	export default {
		data() {
			return {
				userInfo: {},
				unreadCount: 0,
				recentActivities: [],
				myTeams: [],
				loading: false
			}
		},
		onLoad() {
			this.userInfo = uni.getStorageSync('userInfo') || {}
			this.loadData()
		},
		onShow() {
			this.loadData()
		},
		onPullDownRefresh() {
			this.loadData().finally(() => {
				uni.stopPullDownRefresh()
			})
		},
		methods: {
			formatDate,
			getActivityStatus,
			getActivityStatusText,
			
			// 加载数据
			async loadData() {
				this.loading = true
				try {
					await Promise.all([
						this.loadRecentActivities(),
						this.loadMyTeams(),
						this.loadUnreadCount()
					])
				} catch (error) {
					console.error('加载数据失败:', error)
				} finally {
					this.loading = false
				}
			},
			
			// 加载最近活动
			async loadRecentActivities() {
				try {
					const response = await activityApi.getList()
					if (response.success) {
						this.recentActivities = response.data.slice(0, 3) // 只显示前3个
					}
				} catch (error) {
					console.error('加载活动失败:', error)
				}
			},
			
			// 加载我的团队
			async loadMyTeams() {
				try {
					const response = await groupApi.getList()
					if (response.success) {
						this.myTeams = response.data.slice(0, 3) // 只显示前3个
					}
				} catch (error) {
					console.error('加载团队失败:', error)
				}
			},
			
			// 加载未读消息数量
			async loadUnreadCount() {
				// TODO: 实现未读消息数量API
				this.unreadCount = 0
			},
			
			// 跳转到消息页面
			goToMessages() {
				uni.switchTab({
					url: '/pages/message/message'
				})
			},
			
			// 跳转到活动页面
			goToActivities() {
				uni.switchTab({
					url: '/pages/activity/activity'
				})
			},
			
			// 跳转到团队页面
			goToTeams() {
				uni.switchTab({
					url: '/pages/team/team'
				})
			},
			
			// 创建团队
			createTeam() {
				uni.switchTab({
					url: '/pages/team/team'
				})
				// 可以通过事件总线或其他方式通知团队页面显示创建弹窗
			},
			
			// 发起活动
			createActivity() {
				uni.switchTab({
					url: '/pages/activity/activity'
				})
			},
			
			// 加入团队
			joinTeam() {
				uni.showModal({
					title: '加入团队',
					content: '请输入团队邀请码',
					editable: true,
					success: (res) => {
						if (res.confirm && res.content) {
							// TODO: 实现加入团队逻辑
							showSuccess('加入团队成功')
							this.loadMyTeams()
						}
					}
				})
			},
			
			// 查看日程
			viewCalendar() {
				uni.showToast({
					title: '功能开发中',
					icon: 'none'
				})
			},
			
			// 查看活动详情
			viewActivity(activity) {
				// TODO: 跳转到活动详情页面
				uni.showModal({
					title: activity.title,
					content: `时间: ${formatDate(activity.start_time, 'YYYY年MM月DD日 HH:mm')}\n团队: ${activity.team_name}`,
					showCancel: false
				})
			},
			
			// 查看团队详情
			viewTeam(team) {
				// TODO: 跳转到团队详情页面
				uni.showModal({
					title: team.name,
					content: `成员数量: ${team.member_count}\n我的角色: ${team.role === 'admin' ? '管理员' : '成员'}`,
					showCancel: false
				})
			}
		}
	}
</script>

<style scoped>
	.home-container {
		min-height: 100vh;
		background-color: #f5f5f5;
	}
	
	.welcome-section {
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		padding: 40rpx 30rpx 30rpx;
		color: white;
	}
	
	.welcome-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}
	
	.user-info {
		display: flex;
		align-items: center;
	}
	
	.avatar {
		width: 100rpx;
		height: 100rpx;
		border-radius: 50rpx;
		background: rgba(255, 255, 255, 0.2);
		display: flex;
		align-items: center;
		justify-content: center;
		margin-right: 20rpx;
		overflow: hidden;
	}
	
	.avatar-image {
		width: 100%;
		height: 100%;
		border-radius: 50rpx;
	}
	
	.avatar-text {
		color: white;
		font-size: 40rpx;
		font-weight: bold;
	}
	
	.welcome-text {
		font-size: 32rpx;
		font-weight: bold;
		display: block;
		margin-bottom: 8rpx;
		line-height: 1.3;
		word-wrap: break-word;
		word-break: break-all;
	}
	
	.welcome-subtitle {
		font-size: 24rpx;
		opacity: 0.8;
		display: block;
	}
	
	.notification-icon {
		position: relative;
		width: 60rpx;
		height: 60rpx;
		display: flex;
		align-items: center;
		justify-content: center;
	}
	
	.icon {
		font-size: 32rpx;
	}
	
	.badge {
		position: absolute;
		top: -5rpx;
		right: -5rpx;
		background: #ff3b30;
		color: white;
		font-size: 20rpx;
		padding: 4rpx 8rpx;
		border-radius: 12rpx;
		min-width: 24rpx;
		text-align: center;
	}
	
	.quick-actions {
		padding: 30rpx;
		background: white;
		margin: 20rpx;
		border-radius: 16rpx;
	}
	
	.section-title {
		font-size: 32rpx;
		font-weight: bold;
		color: #333;
		display: block;
		margin-bottom: 20rpx;
	}
	
	.action-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 20rpx;
	}
	
	.action-item {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 20rpx;
		border-radius: 12rpx;
		background: #f8f9fa;
	}
	
	.action-icon {
		font-size: 40rpx;
		margin-bottom: 12rpx;
	}
	
	.action-text {
		font-size: 24rpx;
		color: #666;
		text-align: center;
	}
	
	.recent-activities, .my-teams {
		margin: 20rpx;
		background: white;
		border-radius: 16rpx;
		padding: 30rpx;
	}
	
	.section-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 20rpx;
	}
	
	.more-link {
		font-size: 24rpx;
		color: #007aff;
	}
	
	.activity-item, .team-item {
		display: flex;
		align-items: center;
		padding: 20rpx 0;
		border-bottom: 1rpx solid #f0f0f0;
	}
	
	.activity-item:last-child, .team-item:last-child {
		border-bottom: none;
	}
	
	.activity-info, .team-info {
		flex: 1;
	}
	
	.activity-title, .team-name {
		font-size: 28rpx;
		font-weight: bold;
		color: #333;
		display: block;
		margin-bottom: 8rpx;
		line-height: 1.3;
		word-wrap: break-word;
		word-break: break-all;
		/* 限制最多显示1行 */
		display: -webkit-box;
		-webkit-line-clamp: 1;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
	
	.activity-team, .activity-time, .team-members {
		font-size: 24rpx;
		color: #666;
		display: block;
		margin-bottom: 4rpx;
	}
	
	.activity-status, .team-role {
		font-size: 20rpx;
		padding: 8rpx 16rpx;
		border-radius: 12rpx;
		color: white;
		font-weight: bold;
	}
	
	.activity-status.upcoming {
		background: #007aff;
	}
	
	.activity-status.ongoing {
		background: #28a745;
	}
	
	.activity-status.ended {
		background: #6c757d;
	}
	
	.team-role.admin {
		background: #ff3b30;
	}
	
	.team-role.member {
		background: #007aff;
	}
	
	.team-avatar {
		width: 60rpx;
		height: 60rpx;
		border-radius: 30rpx;
		background: #007aff;
		display: flex;
		align-items: center;
		justify-content: center;
		color: white;
		font-size: 24rpx;
		font-weight: bold;
		margin-right: 20rpx;
	}
	
	.empty-state {
		text-align: center;
		padding: 60rpx 20rpx;
	}
	
	.empty-icon {
		font-size: 80rpx;
		display: block;
		margin-bottom: 20rpx;
	}
	
	.empty-text {
		font-size: 28rpx;
		color: #999;
	}
</style>
