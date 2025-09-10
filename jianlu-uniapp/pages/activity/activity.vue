<template>
	<view class="activity-page">
		<!-- 页面标题 -->
		<view class="page-header">
			<text class="page-title">活动</text>
			<view class="header-actions">
				<view class="search-btn" @tap="showSearch">
					<text class="search-icon">🔍</text>
				</view>
			</view>
		</view>

		<!-- 活动列表 -->
		<view class="activity-list">
			<view v-if="loading" class="loading-state">
				<text>加载中...</text>
			</view>
			
			<view v-else-if="activities.length > 0">
				<view class="activity-card" 
					v-for="activity in activities" 
					:key="activity.id"
					@tap="viewActivity(activity)">
					
					<!-- 活动头部 -->
					<view class="activity-header">
						<view class="activity-type">
							{{ getTypeInfo(activity.activity_type).icon }}
						</view>
						<view class="activity-status" :style="{ color: getStatusInfo(activity).color }">
							{{ getStatusInfo(activity).text }}
						</view>
					</view>
					
					<!-- 活动内容 -->
					<view class="activity-content">
						<text class="activity-title">{{ activity.title }}</text>
						<text class="activity-desc" v-if="activity.description">{{ activity.description }}</text>
						
						<view class="activity-details">
							<view class="detail-item">
								<text class="detail-icon">📅</text>
								<text class="detail-text">{{ formatDate(activity.start_time) }}</text>
							</view>
							
							<view class="detail-item" v-if="activity.location">
								<text class="detail-icon">📍</text>
								<text class="detail-text">{{ activity.location }}</text>
							</view>
							
							<view class="detail-item">
								<text class="detail-icon">👥</text>
								<text class="detail-text">
									{{ activity.registration_count || 0 }}{{ activity.max_participants ? `/${activity.max_participants}` : '' }} 人参与
								</text>
							</view>
						</view>
						
						<view class="activity-footer">
							<text class="creator">由 {{ activity.creator_name }} 创建</text>
						</view>
					</view>
				</view>
			</view>
			
			<!-- 空状态 -->
			<view class="empty-state" v-else>
				<text class="empty-icon">📅</text>
				<text class="empty-title">暂无活动</text>
				<text class="empty-subtitle">快来创建第一个活动吧！</text>
			</view>
		</view>

		<!-- 创建活动按钮 -->
		<view class="create-btn" @tap="createActivity">
			<text class="create-icon">+</text>
		</view>
	</view>
</template>

<script>
	import { activityApi } from '../../api/index.js'
	import { showSuccess, showError, formatDate } from '../../utils/index.js'

	export default {
		data() {
			return {
				activities: [],
				loading: false,
				searchVisible: false,
				searchKeyword: ''
			}
		},

		onLoad() {
			this.loadActivities()
		},

		onShow() {
			this.loadActivities()
		},

		onPullDownRefresh() {
			this.loadActivities().finally(() => {
				uni.stopPullDownRefresh()
			})
		},

		methods: {
			// 显示搜索
			showSearch() {
				// TODO: 实现搜索功能
				console.log('显示搜索')
			},

			// 加载活动列表
			async loadActivities() {
				this.loading = true
				try {
					const params = {}
					if (this.searchKeyword) {
						params.search = this.searchKeyword
					}
					
					const response = await activityApi.getList(params)
					if (response.success) {
						// 修复：活动数据在 response.data.activities 中
						const activities = response.data.activities || response.data || []
						this.activities = Array.isArray(activities) ? activities : []
					}
				} catch (error) {
					console.error('加载活动失败:', error)
					showError('加载活动失败')
				} finally {
					this.loading = false
				}
			},

			// 查看活动详情
			viewActivity(activity) {
				uni.navigateTo({
					url: `/pages/activity-detail/activity-detail?id=${activity.id}`
				})
			},

			// 创建活动
			createActivity() {
				uni.navigateTo({
					url: '/pages/activity-create/activity-create'
				})
			},

			// 格式化日期
			formatDate(date) {
				return formatDate(date, 'MM月DD日 HH:mm')
			},

			// 获取活动状态信息
			getStatusInfo(activity) {
				const now = new Date()
				const startTime = new Date(activity.start_time)
				const endTime = new Date(activity.end_time)

				if (now < startTime) {
					return { text: '即将开始', color: '#007aff' }
				} else if (now >= startTime && now <= endTime) {
					return { text: '进行中', color: '#ff9500' }
				} else {
					return { text: '已结束', color: '#8e8e93' }
				}
			},

			// 获取类型信息
			getTypeInfo(type) {
				const typeMap = {
					meeting: { icon: '💼', name: '会议' },
					event: { icon: '🎉', name: '活动' },
					training: { icon: '📚', name: '培训' },
					social: { icon: '🍽️', name: '社交' },
					sports: { icon: '⚽', name: '运动' },
					travel: { icon: '🏖️', name: '旅行' },
					workshop: { icon: '🔧', name: '工作坊' },
					conference: { icon: '🎤', name: '会议' },
					other: { icon: '📅', name: '其他' }
				}
				return typeMap[type] || { icon: '📅', name: '未知' }
			}
		}
	}
</script>

<style scoped>
	.activity-page {
		background-color: #f5f5f5;
		min-height: 100vh;
		padding-bottom: 120rpx;
	}

	.page-header {
		background-color: white;
		padding: 40rpx 30rpx 30rpx;
		display: flex;
		justify-content: space-between;
		align-items: center;
		border-bottom: 1rpx solid #f0f0f0;
	}

	.page-title {
		font-size: 36rpx;
		font-weight: bold;
		color: #333;
	}

	.header-actions {
		display: flex;
		align-items: center;
		gap: 20rpx;
	}

	.search-btn {
		width: 60rpx;
		height: 60rpx;
		border-radius: 30rpx;
		background-color: #f8f9fa;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.3s;
	}

	.search-btn:active {
		background-color: #e9ecef;
	}

	.search-icon {
		font-size: 28rpx;
		color: #666;
	}

	.activity-list {
		padding: 20rpx;
	}

	.activity-card {
		background-color: white;
		border-radius: 16rpx;
		margin-bottom: 20rpx;
		overflow: hidden;
		box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.1);
	}

	.activity-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 20rpx 30rpx;
		background-color: #f8f9fa;
	}

	.activity-type {
		font-size: 32rpx;
	}

	.activity-status {
		font-size: 26rpx;
		font-weight: bold;
	}

	.activity-content {
		padding: 30rpx;
	}

	.activity-title {
		font-size: 32rpx;
		font-weight: bold;
		color: #333;
		display: block;
		margin-bottom: 16rpx;
		line-height: 1.4;
		word-wrap: break-word;
		word-break: break-all;
		/* 限制最多显示2行 */
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.activity-desc {
		font-size: 28rpx;
		color: #666;
		line-height: 1.5;
		display: block;
		margin-bottom: 20rpx;
		word-wrap: break-word;
		word-break: break-all;
		/* 限制最多显示3行 */
		display: -webkit-box;
		-webkit-line-clamp: 3;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.activity-details {
		margin-bottom: 20rpx;
	}

	.detail-item {
		display: flex;
		align-items: center;
		margin-bottom: 12rpx;
	}

	.detail-icon {
		font-size: 28rpx;
		margin-right: 12rpx;
		width: 32rpx;
	}

	.detail-text {
		font-size: 26rpx;
		color: #666;
		flex: 1;
		word-wrap: break-word;
		word-break: break-all;
		line-height: 1.3;
	}

	.activity-footer {
		border-top: 1rpx solid #f0f0f0;
		padding-top: 20rpx;
	}

	.creator {
		font-size: 24rpx;
		color: #999;
	}

	.empty-state {
		text-align: center;
		padding: 100rpx 40rpx;
	}

	.empty-icon {
		font-size: 80rpx;
		display: block;
		margin-bottom: 20rpx;
	}

	.empty-title {
		font-size: 32rpx;
		color: #333;
		display: block;
		margin-bottom: 16rpx;
	}

	.empty-subtitle {
		font-size: 28rpx;
		color: #666;
		display: block;
	}

	.loading-state {
		text-align: center;
		padding: 60rpx;
		color: #666;
	}

	.create-btn {
		position: fixed;
		bottom: 40rpx;
		right: 40rpx;
		width: 120rpx;
		height: 120rpx;
		background-color: #007aff;
		border-radius: 60rpx;
		display: flex;
		align-items: center;
		justify-content: center;
		box-shadow: 0 4rpx 12rpx rgba(0, 122, 255, 0.3);
		z-index: 100;
	}

	.create-icon {
		font-size: 48rpx;
		color: white;
		font-weight: bold;
	}
</style>
