<template>
	<view class="activity-page">
		<view class="page-header">
			<text class="page-title">活动</text>
			<view class="search-btn" @tap="showSearch">🔍</view>
		</view>

		<view class="filter-tabs">
			<scroll-view scroll-x class="filter-scroll" :show-scrollbar="false">
				<view class="filter-item"
					v-for="tab in filterTabs"
					:key="tab.value"
					:class="{ active: currentFilter === tab.value }"
					@tap="changeFilter(tab.value)">
					<text class="filter-text">{{ tab.label }}</text>
				</view>
			</scroll-view>
		</view>

		<scroll-view class="activity-list" scroll-y
			:refresher-enabled="true"
			:refresher-triggered="isRefreshing"
			@refresherrefresh="onRefresh"
			@scrolltolower="onLoadMore">

			<view v-if="loading && page === 1" class="loading-state">加载中...</view>

			<template v-else-if="activities.length > 0">
				<view class="activity-card"
					v-for="activity in activities"
					:key="activity.id"
					@tap="viewActivity(activity)">

					<view class="activity-header">
						<view class="activity-sequence">#{{ activity.sequence_number }}</view>
						<view class="activity-type">{{ getTypeInfo(activity.activity_type).icon }}</view>
						<view class="activity-status" :style="{ color: getStatusInfo(activity).color }">
							{{ getStatusInfo(activity).text }}
						</view>
					</view>

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
							<!-- 申请按钮 -->
							<view class="activity-actions" @tap.stop>
								<!-- 已申请状态 -->
								<view v-if="activity.user_registered" class="btn-applied">
									<text class="applied-text">{{ getRegistrationStatusText(activity.user_registration_status) }}</text>
								</view>
								<!-- 可申请状态 -->
								<button
									v-else-if="canRegisterActivity(activity)"
									class="btn-apply"
									:class="{ 'btn-approval': activity.require_approval }"
									@tap="quickRegister(activity)">
									{{ activity.require_approval ? '申请加入' : '立即报名' }}
								</button>
								<!-- 不可申请状态 -->
								<view v-else class="register-disabled">
									{{ getRegisterDisabledReason(activity) }}
								</view>
							</view>
						</view>
					</view>
				</view>

				<view v-if="loadingMore" class="load-more">加载更多...</view>
				<view v-if="!hasMore && activities.length > 0" class="no-more">没有更多活动了</view>
			</template>

			<view v-else-if="!loading" class="empty-state">
				<text class="empty-icon">📅</text>
				<text class="empty-title">暂无活动</text>
				<text class="empty-subtitle">快来创建第一个活动吧！</text>
			</view>
		</scroll-view>

		<view class="create-btn" @tap="createActivity">+</view>
	</view>
</template>

<script>
	import { activityApi } from '../../api/index.js'
	import { activityUtils } from '../../api/activity.js'
	import { showSuccess, showError, formatDate, showConfirm } from '../../utils/index.js'

	export default {
		data() {
			return {
				activities: [],
				loading: false,
				loadingMore: false,
				isRefreshing: false,
				page: 1,
				pageSize: 10,
				hasMore: true,
				searchVisible: false,
				searchKeyword: '',
				currentFilter: 'all',
				filterTabs: [
					{ label: '全部', value: 'all' },
					{ label: '即将开始', value: 'upcoming' },
					{ label: '进行中', value: 'ongoing' },
					{ label: '已结束', value: 'completed' }
				]
			}
		},

		onLoad() {
			this.resetAndLoad()
		},

		onShow() {
			// 如果是第一次加载或从其他页面返回，刷新数据
			if (!this.loadedOnce) {
				this.resetAndLoad()
				this.loadedOnce = true
			}
		},

		methods: {
			// 重置并加载
			resetAndLoad() {
				this.page = 1
				this.activities = []
				this.hasMore = true
				this.loadActivities()
			},

			// 显示搜索
			showSearch() {
				// TODO: 实现搜索功能
				console.log('显示搜索')
			},

			// 切换筛选
			changeFilter(filter) {
				if (this.currentFilter === filter) return
				this.currentFilter = filter
				this.resetAndLoad()
			},

			// 获取筛选参数
			getFilterParams() {
				const params = {
					page: this.page,
					limit: this.pageSize
				}

				// 添加状态筛选
				if (this.currentFilter === 'upcoming') {
					params.status = 'registration'
				} else if (this.currentFilter === 'ongoing') {
					params.status = 'ongoing'
				} else if (this.currentFilter === 'completed') {
					params.status = 'completed'
				}

				// 添加搜索关键词
				if (this.searchKeyword) {
					params.search = this.searchKeyword
				}

				return params
			},

			// 加载活动列表
			async loadActivities(isLoadMore = false) {
				if (isLoadMore) {
					if (!this.hasMore || this.loadingMore) return
					this.loadingMore = true
				} else {
					this.loading = true
				}

				try {
					const params = this.getFilterParams()
					const response = await activityApi.getList(params)

					if (response.success) {
						const { activities, pagination } = response.data
						const newActivities = Array.isArray(activities) ? activities : []

						if (isLoadMore) {
							// 加载更多，追加数据
							this.activities = [...this.activities, ...newActivities]
							// 增加页码，准备下次加载
							this.page++
						} else {
							// 刷新或首次加载，替换数据
							this.activities = newActivities
							// 重置页码为当前页
							this.page = pagination?.page || 1
						}

						// 更新分页状态
						if (pagination) {
							this.hasMore = pagination.page < pagination.pages
						}
					}
				} catch (error) {
					console.error('加载活动失败:', error)
					showError('加载活动失败')
				} finally {
					if (isLoadMore) {
						this.loadingMore = false
					} else {
						this.loading = false
					}
				}
			},

			// 下拉刷新
			async onRefresh() {
				this.isRefreshing = true
				await this.resetAndLoad()
				this.isRefreshing = false
			},

			// 上拉加载更多
			onLoadMore() {
				if (!this.loadingMore && this.hasMore && !this.loading) {
					this.loadActivities(true)
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
			},

			// 检查活动是否可以报名
			canRegisterActivity(activity) {
				return activityUtils.canRegister(activity).canRegister
			},

			// 获取不能报名的原因
			getRegisterDisabledReason(activity) {
				return activityUtils.canRegister(activity).reason
			},

			// 快速报名
			async quickRegister(activity) {
				const confirmed = await showConfirm(
					activity.require_approval
						? `确定要申请加入"${activity.title}"吗？\n提交后需要等待管理员审核`
						: `确定要报名"${activity.title}"吗？`
				)

				if (!confirmed) return

				try {
					const response = await activityApi.register(activity.id, {
						notes: activity.require_approval ? '通过列表快速申请' : '',
						phone: '',
					})

					if (response.success) {
						showSuccess(
							activity.require_approval
								? '申请提交成功，请等待管理员审核'
								: '报名成功'
						)
						// 刷新列表以更新报名状态
						this.resetAndLoad()
					}
				} catch (error) {
					console.error('报名失败:', error)
					showError(error.message || '报名失败')
				}
			},

			// 获取报名状态文本
			getRegistrationStatusText(status) {
				const statusMap = {
					pending: '已申请',
					approved: '已报名',
					rejected: '已拒绝',
					cancelled: '已取消',
					completed: '已完成'
				}
				return statusMap[status] || '已申请'
			}
		}
	}
</script>

<style scoped>
	.activity-page {
		background-color: #f5f5f5;
		min-height: 100vh;
		padding-bottom: 120rpx;
		display: flex;
		flex-direction: column;
	}

	.page-header {
		background-color: white;
		padding: 40rpx 30rpx 30rpx;
		display: flex;
		justify-content: space-between;
		align-items: center;
		border-bottom: 1rpx solid #f0f0f0;
		flex-shrink: 0;
	}

	.filter-tabs {
		background-color: white;
		padding: 20rpx 30rpx;
		border-bottom: 1rpx solid #f0f0f0;
		flex-shrink: 0;
	}

	.filter-scroll {
		white-space: nowrap;
	}

	.filter-item {
		display: inline-block;
		padding: 16rpx 32rpx;
		margin-right: 20rpx;
		background-color: #f8f9fa;
		border-radius: 30rpx;
		transition: all 0.3s;
	}

	.filter-item.active {
		background-color: #007aff;
	}

	.filter-text {
		font-size: 28rpx;
		color: #666;
	}

	.filter-item.active .filter-text {
		color: white;
	}

	.activity-list {
		flex: 1;
		overflow-y: auto;
		padding: 20rpx;
		height: calc(100vh - 240rpx);
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

	.activity-sequence {
		font-size: 24rpx;
		font-weight: bold;
		color: #007aff;
		background-color: #e7f0ff;
		padding: 4rpx 12rpx;
		border-radius: 12rpx;
		margin-right: 12rpx;
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
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.creator {
		font-size: 24rpx;
		color: #999;
		flex: 1;
	}

	.activity-actions {
		margin-left: 20rpx;
	}

	.btn-apply {
		padding: 12rpx 24rpx;
		font-size: 26rpx;
		border-radius: 30rpx;
		border: none;
		background: linear-gradient(135deg, #007aff, #5ac8fa);
		color: white;
		font-weight: 500;
		min-width: 120rpx;
		text-align: center;
		line-height: 1.2;
	}

	.btn-apply.btn-approval {
		background: linear-gradient(135deg, #ff9500, #ff6b35);
	}

	.btn-apply:active {
		opacity: 0.8;
		transform: scale(0.98);
	}

	.btn-applied {
		padding: 12rpx 24rpx;
		font-size: 26rpx;
		border-radius: 30rpx;
		background: linear-gradient(135deg, #28a745, #20c997);
		color: white;
		font-weight: 500;
		min-width: 120rpx;
		text-align: center;
		line-height: 1.2;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.applied-text {
		font-size: 26rpx;
		color: white;
	}

	.register-disabled {
		padding: 12rpx 24rpx;
		font-size: 24rpx;
		color: #999;
		background: #f5f5f5;
		border-radius: 30rpx;
		text-align: center;
		min-width: 120rpx;
		border: 1rpx solid #e0e0e0;
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

	.load-more {
		text-align: center;
		padding: 40rpx;
		color: #999;
	}

	.no-more {
		text-align: center;
		padding: 40rpx;
		color: #999;
		font-size: 24rpx;
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
