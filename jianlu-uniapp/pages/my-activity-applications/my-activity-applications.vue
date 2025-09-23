<template>
	<view class="container">
		<!-- 头部 -->
		<view class="header">
			<text class="title">我的活动申请</text>
			<text class="subtitle">查看您提交的活动报名申请</text>
		</view>

		<!-- 统计信息 -->
		<view class="stats-section">
			<view class="stats-grid">
				<view class="stat-item">
					<text class="stat-number">{{ stats.pending }}</text>
					<text class="stat-label">待处理</text>
				</view>
				<view class="stat-item">
					<text class="stat-number">{{ stats.approved }}</text>
					<text class="stat-label">已通过</text>
				</view>
				<view class="stat-item">
					<text class="stat-number">{{ stats.rejected }}</text>
					<text class="stat-label">已拒绝</text>
				</view>
				<view class="stat-item">
					<text class="stat-number">{{ stats.total }}</text>
					<text class="stat-label">总计</text>
				</view>
			</view>
		</view>

		<!-- 筛选器 -->
		<view class="filter-section">
			<view class="filter-tabs">
				<view
					class="filter-tab"
					:class="{ active: currentStatus === 'all' }"
					@tap="switchStatus('all')"
				>
					全部
				</view>
				<view
					class="filter-tab"
					:class="{ active: currentStatus === 'pending' }"
					@tap="switchStatus('pending')"
				>
					待处理
				</view>
				<view
					class="filter-tab"
					:class="{ active: currentStatus === 'approved' }"
					@tap="switchStatus('approved')"
				>
					已通过
				</view>
				<view
					class="filter-tab"
					:class="{ active: currentStatus === 'rejected' }"
					@tap="switchStatus('rejected')"
				>
					已拒绝
				</view>
				<view
					class="filter-tab"
					:class="{ active: currentStatus === 'cancelled' }"
					@tap="switchStatus('cancelled')"
				>
					已取消
				</view>
			</view>
		</view>

		<!-- 申请列表 -->
		<view class="applications-section">
			<view v-if="loading" class="loading">
				<text>加载中...</text>
			</view>

			<view v-else-if="applications.length === 0" class="empty">
				<text class="empty-icon">📝</text>
				<text class="empty-text">暂无活动申请记录</text>
				<text class="empty-desc">您可以浏览活动并报名参加</text>
				<button class="browse-btn" @tap="browseActivities">浏览活动</button>
			</view>

			<view v-else class="applications-list">
				<view
					class="application-item"
					v-for="application in applications"
					:key="application.id"
					@tap="viewActivity(application.activity)"
				>
					<view class="application-header">
						<view class="activity-info">
							<view class="activity-type">
								{{ getActivityTypeInfo(application.activity.activity_type).icon }}
							</view>
							<view class="activity-details">
								<text class="activity-title">{{ application.activity.title }}</text>
								<text class="apply-time">{{ formatDate(application.registration_time, 'MM月DD日 HH:mm') }}</text>
							</view>
						</view>
						<view class="status-badge" :style="{ backgroundColor: getStatusColor(application.status) }">
							<text class="status-icon">{{ getStatusIcon(application.status) }}</text>
							{{ getStatusText(application.status) }}
						</view>
					</view>

					<view class="application-content">
						<view class="detail-row">
							<text class="detail-label">活动时间：</text>
							<text class="detail-value">{{ formatActivityTime(application.activity.start_time, application.activity.end_time) }}</text>
						</view>
						<view v-if="application.activity.location" class="detail-row">
							<text class="detail-label">活动地点：</text>
							<text class="detail-value">{{ application.activity.location }}</text>
						</view>
						<view v-if="application.approval_note" class="detail-row">
							<text class="detail-label">审批备注：</text>
							<text class="detail-value">{{ application.approval_note }}</text>
						</view>
					</view>

					<view class="application-footer">
						<view v-if="application.approver_name" class="approver-info">
							<text class="approver-label">审批人：{{ application.approver_name }}</text>
							<text v-if="application.approval_time" class="approval-time">
								{{ formatDate(application.approval_time, 'MM月DD日 HH:mm') }}
							</text>
						</view>
						<view class="actions">
							<button
								v-if="application.status === 'pending'"
								class="action-btn cancel-btn"
								@tap.stop="cancelApplication(application)"
							>
								取消申请
							</button>
							<button
								v-if="application.status === 'rejected'"
								class="action-btn reapply-btn"
								@tap.stop="reapply(application)"
							>
								重新申请
							</button>
						</view>
					</view>
				</view>
			</view>

			<!-- 加载更多 -->
			<view v-if="hasMore && !loading" class="load-more">
				<text class="load-more-text" @tap="loadMore">加载更多</text>
			</view>
			<view v-if="!hasMore && applications.length > 0" class="no-more">
				<text class="no-more-text">没有更多了</text>
			</view>
		</view>
	</view>
</template>

<script>
import { activityApi, activityUtils } from '../../api/activity.js'
import { showError, showSuccess, showConfirm, formatDate } from '../../utils/index.js'

export default {
	data() {
		return {
			applications: [],
			loading: false,
			currentStatus: 'all',
			page: 1,
			pageSize: 10,
			hasMore: true,
			stats: {
				pending: 0,
				approved: 0,
				rejected: 0,
				cancelled: 0,
				total: 0
			}
		}
	},

	onLoad() {
		this.loadApplications()
	},

	onPullDownRefresh() {
		this.refresh()
	},

	onReachBottom() {
		if (this.hasMore && !this.loading) {
			this.loadMore()
		}
	},

	methods: {
		// 加载申请列表
		async loadApplications(isLoadMore = false) {
			if (isLoadMore) {
				if (!this.hasMore || this.loading) return
				this.page++
			} else {
				this.page = 1
				this.applications = []
				this.hasMore = true
			}

			this.loading = true
			try {
				const response = await activityApi.getMyApplications({
					page: this.page,
					limit: this.pageSize,
					status: this.currentStatus === 'all' ? undefined : this.currentStatus
				})

				if (response.success) {
					const { applications, pagination, stats } = response.data

					if (isLoadMore) {
						this.applications = [...this.applications, ...applications]
					} else {
						this.applications = applications
						// 更新统计信息
						if (stats) {
							this.stats = stats
						}
					}

					this.hasMore = pagination.page < pagination.pages
				}
			} catch (error) {
				console.error('加载申请列表失败:', error)
				showError('加载失败')
			} finally {
				this.loading = false
				if (!isLoadMore) {
					uni.stopPullDownRefresh()
				}
			}
		},

		// 切换状态
		switchStatus(status) {
			if (this.currentStatus === status) return
			this.currentStatus = status
			this.loadApplications()
		},

		// 刷新
		refresh() {
			this.loadApplications()
		},

		// 加载更多
		loadMore() {
			this.loadApplications(true)
		},

		// 取消申请
		async cancelApplication(application) {
			const confirmed = await showConfirm('确定要取消这个申请吗？')
			if (!confirmed) return

			try {
				const response = await activityApi.cancelRegistration(application.id)
				if (response.success) {
					showSuccess('取消成功')
					this.refresh()
				}
			} catch (error) {
				console.error('取消申请失败:', error)
				showError(error.response?.data?.message || '取消失败')
			}
		},

		// 重新申请
		reapply(application) {
			uni.navigateTo({
				url: `/pages/activity-detail/activity-detail?id=${application.activity.id}`
			})
		},

		// 查看活动
		viewActivity(activity) {
			uni.navigateTo({
				url: `/pages/activity-detail/activity-detail?id=${activity.id}`
			})
		},

		// 浏览活动
		browseActivities() {
			uni.switchTab({
				url: '/pages/activity/activity'
			})
		},

		// 获取状态文本
		getStatusText(status) {
			const statusMap = {
				pending: '审核中',
				approved: '已通过',
				rejected: '已拒绝',
				cancelled: '已取消',
				completed: '已完成'
			}
			return statusMap[status] || status
		},

		// 获取状态颜色
		getStatusColor(status) {
			const colorMap = {
				pending: '#ff9500',
				approved: '#34c759',
				rejected: '#ff3b30',
				cancelled: '#8e8e93',
				completed: '#007aff'
			}
			return colorMap[status] || '#8e8e93'
		},

		// 获取状态图标
		getStatusIcon(status) {
			const iconMap = {
				pending: '⏳',
				approved: '✅',
				rejected: '❌',
				cancelled: '🚫',
				completed: '🎉'
			}
			return iconMap[status] || '📝'
		},

		// 获取活动类型信息
		getActivityTypeInfo(type) {
			return activityUtils.getTypeInfo(type)
		},

		// 格式化活动时间
		formatActivityTime(startTime, endTime) {
			return activityUtils.formatActivityTime(startTime, endTime)
		},

		// 格式化日期
		formatDate(date, format) {
			return formatDate(date, format)
		}
	}
}
</script>

<style scoped>
.container {
	background-color: #f5f5f5;
	min-height: 100vh;
}

.header {
	background-color: white;
	padding: 40rpx 30rpx;
	text-align: center;
	border-bottom: 1rpx solid #f0f0f0;
}

.title {
	font-size: 36rpx;
	font-weight: bold;
	color: #333;
	display: block;
	margin-bottom: 12rpx;
}

.subtitle {
	font-size: 28rpx;
	color: #666;
}

.stats-section {
	background-color: white;
	margin: 20rpx;
	padding: 30rpx;
	border-radius: 16rpx;
}

.stats-grid {
	display: grid;
	grid-template-columns: repeat(4, 1fr);
	gap: 20rpx;
}

.stat-item {
	text-align: center;
}

.stat-number {
	font-size: 40rpx;
	font-weight: bold;
	color: #007aff;
	display: block;
	margin-bottom: 8rpx;
}

.stat-label {
	font-size: 26rpx;
	color: #666;
}

.filter-section {
	background-color: white;
	margin: 20rpx;
	padding: 20rpx 30rpx;
	border-radius: 16rpx;
}

.filter-tabs {
	display: flex;
	white-space: nowrap;
	overflow-x: auto;
}

.filter-tab {
	flex-shrink: 0;
	padding: 16rpx 32rpx;
	margin-right: 20rpx;
	background-color: #f8f9fa;
	border-radius: 30rpx;
	font-size: 28rpx;
	color: #666;
	transition: all 0.3s;
}

.filter-tab:last-child {
	margin-right: 0;
}

.filter-tab.active {
	background-color: #007aff;
	color: white;
}

.applications-section {
	padding: 20rpx;
}

.loading {
	text-align: center;
	padding: 60rpx;
	font-size: 28rpx;
	color: #666;
}

.empty {
	text-align: center;
	padding: 100rpx 40rpx;
}

.empty-icon {
	font-size: 80rpx;
	display: block;
	margin-bottom: 20rpx;
}

.empty-text {
	font-size: 32rpx;
	color: #333;
	display: block;
	margin-bottom: 16rpx;
}

.empty-desc {
	font-size: 28rpx;
	color: #666;
	display: block;
	margin-bottom: 40rpx;
}

.browse-btn {
	background-color: #007aff;
	color: white;
	border: none;
	border-radius: 30rpx;
	padding: 20rpx 40rpx;
	font-size: 28rpx;
}

.applications-list {
}

.application-item {
	background-color: white;
	border-radius: 16rpx;
	margin-bottom: 20rpx;
	padding: 30rpx;
	overflow: hidden;
}

.application-header {
	display: flex;
	justify-content: space-between;
	align-items: flex-start;
	margin-bottom: 24rpx;
}

.activity-info {
	display: flex;
	align-items: center;
	flex: 1;
}

.activity-type {
	width: 80rpx;
	height: 80rpx;
	background-color: #f0f0f0;
	border-radius: 40rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 36rpx;
	margin-right: 20rpx;
}

.activity-details {
	flex: 1;
}

.activity-title {
	font-size: 32rpx;
	font-weight: bold;
	color: #333;
	display: block;
	margin-bottom: 8rpx;
	word-break: break-all;
}

.apply-time {
	font-size: 24rpx;
	color: #999;
}

.status-badge {
	display: flex;
	align-items: center;
	padding: 8rpx 16rpx;
	border-radius: 20rpx;
	font-size: 24rpx;
	color: white;
	margin-left: 20rpx;
}

.status-icon {
	font-size: 20rpx;
	margin-right: 6rpx;
}

.application-content {
	background-color: #f8f9fa;
	border-radius: 12rpx;
	padding: 24rpx;
	margin-bottom: 24rpx;
}

.detail-row {
	display: flex;
	margin-bottom: 16rpx;
	font-size: 28rpx;
	line-height: 1.5;
}

.detail-row:last-child {
	margin-bottom: 0;
}

.detail-label {
	color: #666;
	min-width: 160rpx;
}

.detail-value {
	color: #333;
	flex: 1;
	word-break: break-all;
}

.application-footer {
	display: flex;
	justify-content: space-between;
	align-items: center;
}

.approver-info {
	flex: 1;
}

.approver-label {
	font-size: 24rpx;
	color: #666;
}

.approval-time {
	font-size: 24rpx;
	color: #999;
	margin-left: 16rpx;
}

.actions {
	display: flex;
	gap: 20rpx;
}

.action-btn {
	padding: 12rpx 24rpx;
	border-radius: 20rpx;
	font-size: 24rpx;
	border: none;
}

.cancel-btn {
	background-color: #f0f0f0;
	color: #666;
}

.reapply-btn {
	background-color: #007aff;
	color: white;
}

.load-more {
	text-align: center;
	padding: 40rpx;
}

.load-more-text {
	color: #007aff;
	font-size: 28rpx;
}

.no-more {
	text-align: center;
	padding: 40rpx;
}

.no-more-text {
	color: #999;
	font-size: 24rpx;
}
</style>