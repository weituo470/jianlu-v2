<template>
	<view class="message-container">
		<!-- 搜索栏 -->
		<view class="search-bar">
			<view class="search-input">
				<text class="search-icon">🔍</text>
				<input 
					type="text" 
					placeholder="搜索消息..." 
					v-model="searchKeyword"
					@input="onSearch"
				/>
			</view>
		</view>
		
		<!-- 消息分类 -->
		<view class="message-tabs">
			<view 
				class="tab-item" 
				:class="{ active: activeTab === 'all' }"
				@tap="switchTab('all')"
			>
				<text>全部</text>
				<view class="badge" v-if="allCount > 0">{{ allCount }}</view>
			</view>
			<view 
				class="tab-item" 
				:class="{ active: activeTab === 'team' }"
				@tap="switchTab('team')"
			>
				<text>团队</text>
				<view class="badge" v-if="teamCount > 0">{{ teamCount }}</view>
			</view>
			<view 
				class="tab-item" 
				:class="{ active: activeTab === 'activity' }"
				@tap="switchTab('activity')"
			>
				<text>活动</text>
				<view class="badge" v-if="activityCount > 0">{{ activityCount }}</view>
			</view>
			<view 
				class="tab-item" 
				:class="{ active: activeTab === 'system' }"
				@tap="switchTab('system')"
			>
				<text>系统</text>
				<view class="badge" v-if="systemCount > 0">{{ systemCount }}</view>
			</view>
		</view>
		
		<!-- 消息列表 -->
		<view class="message-list" v-if="filteredMessages.length > 0">
			<view 
				class="message-item" 
				v-for="message in filteredMessages" 
				:key="message.id"
				@tap="viewMessage(message)"
			>
				<view class="message-avatar">
					<image 
						v-if="message.avatar" 
						:src="message.avatar" 
						class="avatar-image"
						mode="aspectFill"
					/>
					<text v-else class="avatar-text">
						{{ getMessageIcon(message.type) }}
					</text>
				</view>
				
				<view class="message-content">
					<view class="message-header">
						<text class="sender-name">{{ message.sender_name || message.title }}</text>
						<text class="message-time">{{ formatTime(message.created_at) }}</text>
					</view>
					<text class="message-preview">{{ message.content || message.preview }}</text>
					<view class="message-meta" v-if="message.team_name">
						<text class="team-tag">{{ message.team_name }}</text>
					</view>
				</view>
				
				<view class="message-status">
					<view class="unread-dot" v-if="!message.is_read"></view>
					<text class="message-type">{{ getMessageTypeText(message.type) }}</text>
				</view>
			</view>
		</view>
		
		<!-- 空状态 -->
		<view class="empty-state" v-else-if="!loading">
			<text class="empty-icon">💬</text>
			<text class="empty-title">暂无消息</text>
			<text class="empty-subtitle">当有新的团队消息或活动通知时，会在这里显示</text>
		</view>
		
		<!-- 加载状态 -->
		<view class="loading-state" v-if="loading">
			<text>加载中...</text>
		</view>
	</view>
</template>

<script>
	import { formatDate, showSuccess, showError } from '../../utils/index.js'
	
	export default {
		data() {
			return {
				activeTab: 'all',
				searchKeyword: '',
				loading: false,
				messages: [
					// 模拟数据
					{
						id: 1,
						type: 'team',
						sender_name: '张三',
						title: '团队邀请',
						content: '邀请您加入"产品开发团队"',
						team_name: '产品开发团队',
						created_at: new Date().toISOString(),
						is_read: false
					},
					{
						id: 2,
						type: 'activity',
						title: '活动提醒',
						content: '您参与的"团队建设活动"将在明天下午2点开始',
						team_name: '产品开发团队',
						created_at: new Date(Date.now() - 3600000).toISOString(),
						is_read: false
					},
					{
						id: 3,
						type: 'system',
						title: '系统通知',
						content: '您的个人资料已更新成功',
						created_at: new Date(Date.now() - 7200000).toISOString(),
						is_read: true
					}
				]
			}
		},
		computed: {
			filteredMessages() {
				let filtered = this.messages
				
				// 按类型筛选
				if (this.activeTab !== 'all') {
					filtered = filtered.filter(msg => msg.type === this.activeTab)
				}
				
				// 按关键词搜索
				if (this.searchKeyword) {
					const keyword = this.searchKeyword.toLowerCase()
					filtered = filtered.filter(msg => 
						(msg.sender_name && msg.sender_name.toLowerCase().includes(keyword)) ||
						(msg.title && msg.title.toLowerCase().includes(keyword)) ||
						(msg.content && msg.content.toLowerCase().includes(keyword))
					)
				}
				
				return filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
			},
			
			allCount() {
				return this.messages.filter(msg => !msg.is_read).length
			},
			
			teamCount() {
				return this.messages.filter(msg => msg.type === 'team' && !msg.is_read).length
			},
			
			activityCount() {
				return this.messages.filter(msg => msg.type === 'activity' && !msg.is_read).length
			},
			
			systemCount() {
				return this.messages.filter(msg => msg.type === 'system' && !msg.is_read).length
			}
		},
		onLoad() {
			this.loadMessages()
		},
		onShow() {
			this.loadMessages()
		},
		onPullDownRefresh() {
			this.loadMessages().finally(() => {
				uni.stopPullDownRefresh()
			})
		},
		methods: {
			// 加载消息列表
			async loadMessages() {
				this.loading = true
				try {
					// TODO: 调用真实API
					// const response = await messageApi.getList()
					// if (response.success) {
					//     this.messages = response.data
					// }
					
					// 模拟加载延迟
					await new Promise(resolve => setTimeout(resolve, 500))
				} catch (error) {
					showError('加载消息失败')
				} finally {
					this.loading = false
				}
			},
			
			// 切换标签
			switchTab(tab) {
				this.activeTab = tab
			},
			
			// 搜索
			onSearch() {
				// 实时搜索，由computed属性处理
			},
			
			// 查看消息详情
			viewMessage(message) {
				// 标记为已读
				message.is_read = true
				
				// 显示消息详情
				uni.showModal({
					title: message.title || message.sender_name,
					content: message.content,
					showCancel: false,
					confirmText: '知道了'
				})
			},
			
			// 格式化时间
			formatTime(dateString) {
				const date = new Date(dateString)
				const now = new Date()
				const diff = now - date
				
				if (diff < 60000) { // 1分钟内
					return '刚刚'
				} else if (diff < 3600000) { // 1小时内
					return `${Math.floor(diff / 60000)}分钟前`
				} else if (diff < 86400000) { // 24小时内
					return `${Math.floor(diff / 3600000)}小时前`
				} else if (diff < 604800000) { // 7天内
					return `${Math.floor(diff / 86400000)}天前`
				} else {
					return formatDate(dateString, 'MM-DD')
				}
			},
			
			// 获取消息图标
			getMessageIcon(type) {
				const icons = {
					team: '👥',
					activity: '📅',
					system: '⚙️',
					default: '💬'
				}
				return icons[type] || icons.default
			},
			
			// 获取消息类型文本
			getMessageTypeText(type) {
				const types = {
					team: '团队',
					activity: '活动',
					system: '系统'
				}
				return types[type] || ''
			}
		}
	}
</script>

<style scoped>
	.message-container {
		min-height: 100vh;
		background-color: #f5f5f5;
	}
	
	.search-bar {
		padding: 20rpx;
		background: white;
	}
	
	.search-input {
		display: flex;
		align-items: center;
		background: #f8f9fa;
		border-radius: 25rpx;
		padding: 0 20rpx;
		height: 70rpx;
	}
	
	.search-icon {
		font-size: 28rpx;
		color: #999;
		margin-right: 12rpx;
	}
	
	.search-input input {
		flex: 1;
		font-size: 28rpx;
		border: none;
		background: transparent;
	}
	
	.message-tabs {
		display: flex;
		background: white;
		border-bottom: 1rpx solid #f0f0f0;
	}
	
	.tab-item {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 24rpx 0;
		position: relative;
		font-size: 28rpx;
		color: #666;
	}
	
	.tab-item.active {
		color: #007aff;
		border-bottom: 4rpx solid #007aff;
	}
	
	.badge {
		position: absolute;
		top: 8rpx;
		right: 20rpx;
		background: #ff3b30;
		color: white;
		font-size: 20rpx;
		padding: 4rpx 8rpx;
		border-radius: 12rpx;
		min-width: 24rpx;
		text-align: center;
	}
	
	.message-list {
		background: white;
	}
	
	.message-item {
		display: flex;
		align-items: flex-start;
		padding: 24rpx 20rpx;
		border-bottom: 1rpx solid #f0f0f0;
	}
	
	.message-item:last-child {
		border-bottom: none;
	}
	
	.message-avatar {
		width: 80rpx;
		height: 80rpx;
		border-radius: 40rpx;
		background: #f0f0f0;
		display: flex;
		align-items: center;
		justify-content: center;
		margin-right: 20rpx;
		overflow: hidden;
	}
	
	.avatar-image {
		width: 100%;
		height: 100%;
		border-radius: 40rpx;
	}
	
	.avatar-text {
		font-size: 32rpx;
	}
	
	.message-content {
		flex: 1;
		min-width: 0;
	}
	
	.message-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 8rpx;
	}
	
	.sender-name {
		font-size: 28rpx;
		font-weight: bold;
		color: #333;
	}
	
	.message-time {
		font-size: 24rpx;
		color: #999;
	}
	
	.message-preview {
		font-size: 26rpx;
		color: #666;
		line-height: 1.4;
		display: -webkit-box;
		-webkit-box-orient: vertical;
		-webkit-line-clamp: 2;
		overflow: hidden;
		margin-bottom: 8rpx;
	}
	
	.message-meta {
		display: flex;
		align-items: center;
	}
	
	.team-tag {
		font-size: 20rpx;
		color: #007aff;
		background: rgba(0, 122, 255, 0.1);
		padding: 4rpx 12rpx;
		border-radius: 12rpx;
	}
	
	.message-status {
		display: flex;
		flex-direction: column;
		align-items: center;
		margin-left: 20rpx;
	}
	
	.unread-dot {
		width: 12rpx;
		height: 12rpx;
		background: #ff3b30;
		border-radius: 6rpx;
		margin-bottom: 8rpx;
	}
	
	.message-type {
		font-size: 20rpx;
		color: #999;
	}
	
	.empty-state {
		text-align: center;
		padding: 120rpx 40rpx;
	}
	
	.empty-icon {
		font-size: 120rpx;
		display: block;
		margin-bottom: 30rpx;
	}
	
	.empty-title {
		font-size: 36rpx;
		font-weight: bold;
		color: #333;
		display: block;
		margin-bottom: 16rpx;
	}
	
	.empty-subtitle {
		font-size: 28rpx;
		color: #666;
		line-height: 1.5;
	}
	
	.loading-state {
		text-align: center;
		padding: 60rpx;
		color: #666;
	}
</style>
