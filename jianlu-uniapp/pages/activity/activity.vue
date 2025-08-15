<template>
	<view class="activity-page">
		<!-- 顶部筛选栏 -->
		<view class="filter-bar">
			<scroll-view class="filter-scroll" scroll-x="true" show-scrollbar="false">
				<view class="filter-item"
					:class="{ active: currentFilter === 'all' }"
					@tap="setFilter('all')">
					全部
				</view>
				<view class="filter-item"
					:class="{ active: currentFilter === 'public' }"
					@tap="setFilter('public')">
					🌍 公开活动
				</view>
				<view class="filter-item"
					:class="{ active: currentFilter === 'team' }"
					@tap="setFilter('team')">
					👥 团队活动
				</view>
				<view class="filter-item"
					:class="{ active: currentFilter === 'my' }"
					@tap="setFilter('my')">
					📝 我的报名
				</view>
			</scroll-view>
		</view>

		<!-- 活动类型筛选 -->
		<view class="type-filter" v-if="showTypeFilter">
			<scroll-view class="type-scroll" scroll-x="true" show-scrollbar="false">
				<view class="type-item"
					:class="{ active: currentType === '' }"
					@tap="setType('')">
					全部类型
				</view>
				<view class="type-item"
					v-for="(typeInfo, type) in activityTypes"
					:key="type"
					:class="{ active: currentType === type }"
					@tap="setType(type)">
					{{ typeInfo.icon }} {{ typeInfo.name }}
				</view>
			</scroll-view>
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
				activityTypes: {}, // 活动类型数据，从API加载
				loading: false,
				currentFilter: 'all',
				currentType: '',
				showTypeFilter: false
			}
		},

		onLoad() {
			this.loadInitialData()
		},

		onShow() {
			this.loadInitialData()
		},

		onPullDownRefresh() {
			this.loadInitialData().finally(() => {
				uni.stopPullDownRefresh()
			})
		},

		methods: {
			// 加载初始数据
			async loadInitialData() {
				await Promise.all([
					this.loadActivities(),
					this.loadActivityTypes()
				])
			},

			// 加载活动类型
			async loadActivityTypes() {
				try {
					// 从后端API获取真实活动类型数据
					const response = await activityApi.getTypes()
					if (response.success) {
						// 转换后端数据格式为前端需要的格式
						const typesData = {}
						const types = response.data || []
						
						types.forEach(type => {
							// 为每个类型添加图标
							const icon = this.getTypeIcon(type.id)
							typesData[type.id] = {
								icon: icon,
								name: type.name
							}
						})
						
						this.activityTypes = typesData
						console.log(`成功加载 ${types.length} 个活动类型`)
					} else {
						throw new Error(response.message || '获取活动类型失败')
					}
				} catch (error) {
					console.error('加载活动类型失败:', error)
					// 降级到默认类型
					this.activityTypes = {
						other: { icon: '📅', name: '其他' }
					}
				}
			},

			// 根据类型ID获取对应图标
			getTypeIcon(typeId) {
				const iconMap = {
					meeting: '💼',
					event: '🎉', 
					training: '📚',
					social: '🍽️',
					sports: '⚽',
					travel: '🏖️',
					workshop: '🔧',
					conference: '🎤',
					other: '📅'
				}
				return iconMap[typeId] || '📅'
			},

			// 设置筛选条件
			setFilter(filter) {
				this.currentFilter = filter
				this.showTypeFilter = filter !== 'all'
				this.loadActivities()
			},

			// 设置类型筛选
			setType(type) {
				this.currentType = type
				this.loadActivities()
			},

			// 加载活动列表
			async loadActivities() {
				this.loading = true
				try {
					const params = this.buildParams()
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

			// 构建请求参数
			buildParams() {
				const params = {}
				
				if (this.currentFilter === 'public') {
					params.visibility = 'public'
				} else if (this.currentFilter === 'team') {
					params.visibility = 'team'
				} else if (this.currentFilter === 'my') {
					params.my_registrations = true
				}
				
				if (this.currentType) {
					params.activity_type = this.currentType
				}
				
				return params
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
				return this.activityTypes[type] || { icon: '📅', name: '未知' }
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

	.filter-bar {
		background-color: white;
		padding: 20rpx;
		border-bottom: 1rpx solid #f0f0f0;
	}

	.filter-scroll {
		white-space: nowrap;
	}

	.filter-item {
		display: inline-block;
		padding: 16rpx 32rpx;
		margin-right: 20rpx;
		background-color: #f8f9fa;
		border-radius: 25rpx;
		font-size: 28rpx;
		color: #666;
		transition: all 0.3s;
	}

	.filter-item.active {
		background-color: #007aff;
		color: white;
	}

	.type-filter {
		background-color: white;
		padding: 20rpx;
		border-bottom: 1rpx solid #f0f0f0;
	}

	.type-scroll {
		white-space: nowrap;
	}

	.type-item {
		display: inline-block;
		padding: 12rpx 24rpx;
		margin-right: 16rpx;
		background-color: #f8f9fa;
		border-radius: 20rpx;
		font-size: 26rpx;
		color: #666;
		transition: all 0.3s;
	}

	.type-item.active {
		background-color: #e3f2fd;
		color: #1976d2;
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
