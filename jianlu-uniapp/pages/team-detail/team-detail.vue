<template>
	<view class="team-detail-container">
		<!-- 页面头部 -->
		<view class="header">
			<view class="team-info">
				<view class="team-avatar">
					{{ teamInfo.name ? teamInfo.name.charAt(0) : 'T' }}
				</view>
				<view class="team-meta">
					<text class="team-name">{{ teamInfo.name || '团队详情' }}</text>
					<text class="member-count">👥 {{ teamInfo.member_count || 0 }} 成员</text>
				</view>
			</view>
		</view>

		<!-- 团队描述 -->
		<view class="description-section card" v-if="teamInfo.description">
			<view class="section-title">团队介绍</view>
			<text class="description-text">{{ teamInfo.description }}</text>
		</view>

		<!-- 团队成员列表 -->
		<view class="members-section card">
			<view class="section-header">
				<text class="section-title">团队成员</text>
				<text class="member-total">{{ members.length }}人</text>
			</view>

			<!-- 加载状态 -->
			<view v-if="loading" class="loading-state">
				<text>加载中...</text>
			</view>

			<!-- 成员列表 -->
			<view v-else-if="members.length > 0" class="member-list">
				<view 
					class="member-item" 
					v-for="member in members" 
					:key="member.id"
				>
					<view class="member-avatar">
						<image 
							v-if="member.avatar && member.avatar !== '/images/default-avatar.png'" 
							:src="member.avatar" 
							mode="aspectFill"
							class="avatar-image"
						/>
						<text v-else class="avatar-text">
							{{ member.nickname ? member.nickname.charAt(0) : '?' }}
						</text>
					</view>
					
					<view class="member-info">
						<view class="member-name-row">
							<text class="member-name">{{ member.nickname }}</text>
							<view class="role-badge" :class="member.is_leader ? 'leader' : 'member'">
								<text class="role-icon" v-if="member.is_leader">👑</text>
								<text class="role-text">{{ member.role_name }}</text>
							</view>
						</view>
						<text class="join-time">{{ formatJoinTime(member.joined_at) }}</text>
					</view>
				</view>
			</view>

			<!-- 空状态 -->
			<view v-else class="empty-state">
				<text>暂无成员信息</text>
			</view>
		</view>

		<!-- 团队操作 -->
		<view class="actions-section card" v-if="isLeader">
			<button class="action-btn primary" @tap="viewApplications">
				<text class="btn-icon">📋</text>
				<text class="btn-text">申请管理</text>
			</button>
		</view>
	</view>
</template>

<script>
import { groupApi } from '../../api/index.js'
import { showError, showSuccess, formatDate } from '../../utils/index.js'

export default {
	data() {
		return {
			teamId: null,
			teamInfo: {},
			members: [],
			loading: false,
			isLeader: false
		}
	},
	
	onLoad(options) {
		if (options.id) {
			this.teamId = parseInt(options.id)
			this.loadTeamDetail()
			this.loadTeamMembers()
		}
	},
	
	methods: {
		// 加载团队详情
		async loadTeamDetail() {
			try {
				const response = await groupApi.getTeamDetail(this.teamId)
				if (response.success) {
					this.teamInfo = response.data
					// 设置页面标题
					uni.setNavigationBarTitle({
						title: this.teamInfo.name || '团队详情'
					})
				}
			} catch (error) {
				console.error('加载团队详情失败:', error)
				showError('加载团队详情失败')
			}
		},

		// 加载团队成员列表
		async loadTeamMembers() {
			this.loading = true
			try {
				const response = await groupApi.getTeamMembers(this.teamId)
				if (response.success) {
					this.members = response.data.members || []
					this.teamInfo.member_count = response.data.total_members || this.members.length
					
					// 检查当前用户是否是负责人
					const currentUser = uni.getStorageSync('userInfo')
					if (currentUser) {
						this.isLeader = this.members.some(member => 
							member.id === currentUser.id && member.is_leader
						)
					}
				}
			} catch (error) {
				console.error('加载团队成员失败:', error)
				showError('加载成员列表失败')
			} finally {
				this.loading = false
			}
		},

		// 格式化加入时间
		formatJoinTime(dateStr) {
			if (!dateStr) return '未知'
			try {
				const date = new Date(dateStr)
				const now = new Date()
				const diffTime = now - date
				const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
				
				if (diffDays === 0) {
					return '今天加入'
				} else if (diffDays === 1) {
					return '昨天加入'
				} else if (diffDays < 30) {
					return `${diffDays}天前加入`
				} else {
					return formatDate(dateStr, 'YYYY年MM月DD日')
				}
			} catch (error) {
				return '未知'
			}
		},

		// 查看申请管理
		viewApplications() {
			uni.navigateTo({
				url: `/pages/team-applications/team-applications?teamId=${this.teamId}&teamName=${encodeURIComponent(this.teamInfo.name)}`
			})
		}
	}
}
</script>

<style lang="scss" scoped>
.team-detail-container {
	min-height: 100vh;
	background-color: #f5f5f5;
	padding: 20rpx;
}

.header {
	background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	border-radius: 16rpx;
	padding: 40rpx;
	margin-bottom: 20rpx;
	color: white;
}

.team-info {
	display: flex;
	align-items: center;
}

.team-avatar {
	width: 120rpx;
	height: 120rpx;
	border-radius: 60rpx;
	background-color: rgba(255, 255, 255, 0.2);
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 48rpx;
	font-weight: bold;
	margin-right: 30rpx;
}

.team-meta {
	flex: 1;
}

.team-name {
	display: block;
	font-size: 36rpx;
	font-weight: bold;
	margin-bottom: 10rpx;
	line-height: 1.3;
	word-wrap: break-word;
	word-break: break-all;
}

.member-count {
	font-size: 28rpx;
	opacity: 0.9;
}

.card {
	background-color: white;
	border-radius: 16rpx;
	padding: 30rpx;
	margin-bottom: 20rpx;
	box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.1);
}

.section-header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 30rpx;
}

.section-title {
	font-size: 32rpx;
	font-weight: bold;
	color: #333;
}

.member-total {
	font-size: 28rpx;
	color: #666;
}

.description-text {
	font-size: 28rpx;
	color: #666;
	line-height: 1.6;
	word-wrap: break-word;
	word-break: break-all;
}

.member-list {
	.member-item {
		display: flex;
		align-items: center;
		padding: 20rpx 0;
		border-bottom: 1rpx solid #f0f0f0;
		
		&:last-child {
			border-bottom: none;
		}
	}
}

.member-avatar {
	width: 80rpx;
	height: 80rpx;
	border-radius: 50%;
	margin-right: 24rpx;
	position: relative;
	overflow: hidden;
	background-color: #f0f0f0;
	display: flex;
	align-items: center;
	justify-content: center;
}

.avatar-image {
	width: 100%;
	height: 100%;
}

.avatar-text {
	font-size: 32rpx;
	color: #666;
	font-weight: bold;
}

.member-info {
	flex: 1;
}

.member-name-row {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: 8rpx;
}

.member-name {
	font-size: 30rpx;
	color: #333;
	font-weight: 500;
}

.role-badge {
	display: flex;
	align-items: center;
	padding: 4rpx 12rpx;
	border-radius: 12rpx;
	font-size: 24rpx;
	
	&.leader {
		background-color: #fff3cd;
		color: #856404;
	}
	
	&.member {
		background-color: #e7f3ff;
		color: #0066cc;
	}
}

.role-icon {
	margin-right: 4rpx;
}

.join-time {
	font-size: 24rpx;
	color: #999;
}

.loading-state, .empty-state {
	text-align: center;
	padding: 60rpx 0;
	color: #999;
	font-size: 28rpx;
}

.actions-section {
	.action-btn {
		width: 100%;
		height: 88rpx;
		border-radius: 44rpx;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 32rpx;
		border: none;
		
		&.primary {
			background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
			color: white;
		}
	}
	
	.btn-icon {
		margin-right: 12rpx;
	}
}
</style>
