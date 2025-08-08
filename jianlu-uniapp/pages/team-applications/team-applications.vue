<template>
	<view class="container">
		<!-- 头部 -->
		<view class="header">
			<text class="title">申请管理</text>
			<text class="subtitle">{{ teamName }}</text>
		</view>
		
		<!-- 统计信息 -->
		<view class="stats-section" v-if="stats">
			<view class="stats-grid">
				<view class="stat-item">
					<text class="stat-number">{{ stats.pending }}</text>
					<text class="stat-label">待处理</text>
				</view>
				<view class="stat-item">
					<text class="stat-number">{{ stats.approved }}</text>
					<text class="stat-label">已批准</text>
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
					已批准
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
					:class="{ active: currentStatus === 'all' }"
					@tap="switchStatus('all')"
				>
					全部
				</view>
			</view>
		</view>
		
		<!-- 申请列表 -->
		<view class="applications-section">
			<view v-if="loading" class="loading">
				<text>加载中...</text>
			</view>
			
			<view v-else-if="applications.length === 0" class="empty">
				<text>暂无申请记录</text>
			</view>
			
			<view v-else class="applications-list">
				<view 
					class="application-item" 
					v-for="application in applications" 
					:key="application.id"
				>
					<view class="application-header">
						<view class="user-info">
							<image 
								class="avatar" 
								:src="application.avatar || '/static/default-avatar.png'"
								mode="aspectFill"
							/>
							<view class="user-details">
								<text class="username">{{ application.nickname || application.username }}</text>
								<text class="apply-time">{{ formatDate(application.applied_at, 'MM月DD日 HH:mm') }}</text>
							</view>
						</view>
						<view class="status-badge" :class="getStatusClass(application.status)">
							{{ getStatusText(application.status) }}
						</view>
					</view>
					
					<view class="application-content">
						<text class="reason-label">申请理由：</text>
						<text class="reason-text">{{ application.reason || '无' }}</text>
					</view>
					
					<view v-if="application.admin_note" class="admin-note">
						<text class="note-label">处理备注：</text>
						<text class="note-text">{{ application.admin_note }}</text>
					</view>
					
					<view v-if="application.status === 'pending'" class="application-actions">
						<button 
							class="btn btn-approve" 
							@tap="approveApplication(application)"
							:disabled="processing"
						>
							批准
						</button>
						<button 
							class="btn btn-reject" 
							@tap="rejectApplication(application)"
							:disabled="processing"
						>
							拒绝
						</button>
					</view>
					
					<view v-else-if="application.processed_at" class="processed-info">
						<text class="processed-text">
							由 {{ application.processor_nickname || application.processor_name }} 
							于 {{ formatDate(application.processed_at, 'MM月DD日 HH:mm') }} 处理
						</text>
					</view>
				</view>
			</view>
		</view>
		
		<!-- 加载更多 -->
		<view v-if="hasMore && !loading" class="load-more" @tap="loadMore">
			<text>加载更多</text>
		</view>
		
		<!-- 处理申请弹窗 -->
		<view class="modal-overlay" v-if="showProcessModal" @tap="hideProcessModal">
			<view class="modal-content" @tap.stop>
				<view class="modal-header">
					<text class="modal-title">{{ processAction === 'approved' ? '批准申请' : '拒绝申请' }}</text>
					<text class="modal-close" @tap="hideProcessModal">×</text>
				</view>
				
				<view class="modal-body">
					<view class="user-summary">
						<text class="user-name">{{ selectedApplication?.nickname || selectedApplication?.username }}</text>
						<text class="action-text">{{ processAction === 'approved' ? '加入团队' : '申请被拒绝' }}</text>
					</view>
					
					<view class="form-group">
						<text class="form-label">备注（可选）</text>
						<textarea 
							class="form-textarea"
							v-model="processNote"
							placeholder="请输入处理备注..."
							maxlength="200"
						/>
					</view>
				</view>
				
				<view class="modal-footer">
					<button class="btn btn-secondary" @tap="hideProcessModal">取消</button>
					<button 
						class="btn" 
						:class="processAction === 'approved' ? 'btn-primary' : 'btn-danger'"
						@tap="confirmProcess"
						:disabled="processing"
					>
						{{ processing ? '处理中...' : (processAction === 'approved' ? '确认批准' : '确认拒绝') }}
					</button>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
	import { groupApi } from '@/api'
	import { showSuccess, showError, showConfirm, formatDate } from '@/utils'
	
	export default {
		data() {
			return {
				teamId: '',
				teamName: '',
				currentStatus: 'pending',
				applications: [],
				stats: null,
				loading: false,
				processing: false,
				hasMore: true,
				page: 1,
				pageSize: 10,
				
				// 处理申请相关
				showProcessModal: false,
				selectedApplication: null,
				processAction: '',
				processNote: ''
			}
		},
		
		onLoad(options) {
			this.teamId = options.teamId
			this.teamName = decodeURIComponent(options.teamName || '团队')
			this.loadApplications()
			this.loadStats()
		},
		
		onPullDownRefresh() {
			this.onRefresh()
		},
		
		onReachBottom() {
			if (this.hasMore && !this.loading) {
				this.loadMore()
			}
		},
		
		methods: {
			formatDate,
			
			// 刷新数据
			async onRefresh() {
				this.page = 1
				this.hasMore = true
				this.applications = []
				await Promise.all([
					this.loadApplications(),
					this.loadStats()
				])
				uni.stopPullDownRefresh()
			},
			
			// 切换状态筛选
			switchStatus(status) {
				if (this.currentStatus === status) return
				this.currentStatus = status
				this.page = 1
				this.hasMore = true
				this.applications = []
				this.loadApplications()
			},
			
			// 加载申请列表
			async loadApplications() {
				if (this.loading) return
				
				this.loading = true
				try {
					const response = await groupApi.getTeamApplications(this.teamId, {
						page: this.page,
						pageSize: this.pageSize,
						status: this.currentStatus
					})
					
					if (response.success) {
						const newApplications = response.data.list
						if (this.page === 1) {
							this.applications = newApplications
						} else {
							this.applications.push(...newApplications)
						}
						
						this.hasMore = this.page < response.data.totalPages
					}
				} catch (error) {
					showError('加载申请列表失败')
					console.error('加载申请列表失败:', error)
				} finally {
					this.loading = false
				}
			},
			
			// 加载统计信息
			async loadStats() {
				try {
					const response = await groupApi.getApplicationStats(this.teamId)
					if (response.success) {
						this.stats = response.data
					}
				} catch (error) {
					console.error('加载统计信息失败:', error)
				}
			},
			
			// 加载更多
			loadMore() {
				this.page++
				this.loadApplications()
			},
			
			// 批准申请
			approveApplication(application) {
				this.selectedApplication = application
				this.processAction = 'approved'
				this.processNote = ''
				this.showProcessModal = true
			},
			
			// 拒绝申请
			rejectApplication(application) {
				this.selectedApplication = application
				this.processAction = 'rejected'
				this.processNote = ''
				this.showProcessModal = true
			},
			
			// 隐藏处理弹窗
			hideProcessModal() {
				this.showProcessModal = false
				this.selectedApplication = null
				this.processAction = ''
				this.processNote = ''
			},
			
			// 确认处理
			async confirmProcess() {
				if (this.processing) return
				
				this.processing = true
				try {
					await groupApi.processApplication(this.selectedApplication.id, {
						action: this.processAction,
						note: this.processNote
					})
					
					showSuccess(this.processAction === 'approved' ? '申请已批准' : '申请已拒绝')
					this.hideProcessModal()
					this.onRefresh()
				} catch (error) {
					showError('处理申请失败')
					console.error('处理申请失败:', error)
				} finally {
					this.processing = false
				}
			},
			
			// 获取状态样式类
			getStatusClass(status) {
				const classMap = {
					'pending': 'status-pending',
					'approved': 'status-approved',
					'rejected': 'status-rejected'
				}
				return classMap[status] || 'status-pending'
			},
			
			// 获取状态文本
			getStatusText(status) {
				const textMap = {
					'pending': '待处理',
					'approved': '已批准',
					'rejected': '已拒绝'
				}
				return textMap[status] || '未知'
			}
		}
	}
</script>

<style scoped>
	.container {
		min-height: 100vh;
		background-color: #f5f5f5;
	}

	.header {
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		padding: 40rpx 30rpx 30rpx;
		color: white;
	}

	.title {
		font-size: 36rpx;
		font-weight: bold;
		display: block;
	}

	.subtitle {
		font-size: 28rpx;
		opacity: 0.9;
		margin-top: 10rpx;
		display: block;
	}

	.stats-section {
		background: white;
		margin: 20rpx;
		border-radius: 16rpx;
		padding: 30rpx;
		box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.1);
	}

	.stats-grid {
		display: flex;
		justify-content: space-between;
	}

	.stat-item {
		text-align: center;
		flex: 1;
	}

	.stat-number {
		font-size: 48rpx;
		font-weight: bold;
		color: #667eea;
		display: block;
	}

	.stat-label {
		font-size: 24rpx;
		color: #666;
		margin-top: 8rpx;
		display: block;
	}

	.filter-section {
		margin: 0 20rpx 20rpx;
	}

	.filter-tabs {
		display: flex;
		background: white;
		border-radius: 12rpx;
		padding: 8rpx;
		box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.1);
	}

	.filter-tab {
		flex: 1;
		text-align: center;
		padding: 16rpx 0;
		font-size: 28rpx;
		color: #666;
		border-radius: 8rpx;
		transition: all 0.3s;
	}

	.filter-tab.active {
		background: #667eea;
		color: white;
	}

	.applications-section {
		margin: 0 20rpx;
	}

	.loading, .empty {
		text-align: center;
		padding: 80rpx 0;
		color: #999;
		font-size: 28rpx;
	}

	.application-item {
		background: white;
		border-radius: 16rpx;
		margin-bottom: 20rpx;
		padding: 30rpx;
		box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.1);
	}

	.application-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 20rpx;
	}

	.user-info {
		display: flex;
		align-items: center;
		flex: 1;
	}

	.avatar {
		width: 80rpx;
		height: 80rpx;
		border-radius: 50%;
		margin-right: 20rpx;
	}

	.user-details {
		flex: 1;
	}

	.username {
		font-size: 32rpx;
		font-weight: bold;
		color: #333;
		display: block;
	}

	.apply-time {
		font-size: 24rpx;
		color: #999;
		margin-top: 4rpx;
		display: block;
	}

	.status-badge {
		padding: 8rpx 16rpx;
		border-radius: 20rpx;
		font-size: 24rpx;
		font-weight: bold;
	}

	.status-pending {
		background: #fff3cd;
		color: #856404;
	}

	.status-approved {
		background: #d4edda;
		color: #155724;
	}

	.status-rejected {
		background: #f8d7da;
		color: #721c24;
	}

	.application-content {
		margin-bottom: 20rpx;
	}

	.reason-label, .note-label {
		font-size: 26rpx;
		color: #666;
		margin-bottom: 8rpx;
		display: block;
	}

	.reason-text, .note-text {
		font-size: 28rpx;
		color: #333;
		line-height: 1.6;
		display: block;
	}

	.admin-note {
		background: #f8f9fa;
		padding: 20rpx;
		border-radius: 8rpx;
		margin-bottom: 20rpx;
	}

	.application-actions {
		display: flex;
		gap: 20rpx;
	}

	.btn {
		flex: 1;
		height: 80rpx;
		line-height: 80rpx;
		text-align: center;
		border-radius: 8rpx;
		font-size: 28rpx;
		border: none;
	}

	.btn-approve {
		background: #28a745;
		color: white;
	}

	.btn-reject {
		background: #dc3545;
		color: white;
	}

	.processed-info {
		text-align: center;
		padding: 20rpx 0;
	}

	.processed-text {
		font-size: 24rpx;
		color: #999;
	}

	.load-more {
		text-align: center;
		padding: 40rpx 0;
		color: #667eea;
		font-size: 28rpx;
	}

	/* 弹窗样式 */
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
		background: white;
		border-radius: 16rpx;
		width: 90%;
		max-width: 600rpx;
		max-height: 80vh;
		overflow: hidden;
	}

	.modal-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 30rpx;
		border-bottom: 1rpx solid #eee;
	}

	.modal-title {
		font-size: 32rpx;
		font-weight: bold;
		color: #333;
	}

	.modal-close {
		font-size: 40rpx;
		color: #999;
		width: 60rpx;
		height: 60rpx;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.modal-body {
		padding: 30rpx;
	}

	.user-summary {
		text-align: center;
		margin-bottom: 30rpx;
	}

	.user-name {
		font-size: 32rpx;
		font-weight: bold;
		color: #333;
		display: block;
	}

	.action-text {
		font-size: 28rpx;
		color: #666;
		margin-top: 8rpx;
		display: block;
	}

	.form-group {
		margin-bottom: 30rpx;
	}

	.form-label {
		font-size: 28rpx;
		color: #333;
		margin-bottom: 16rpx;
		display: block;
	}

	.form-textarea {
		width: 100%;
		min-height: 120rpx;
		padding: 20rpx;
		border: 1rpx solid #ddd;
		border-radius: 8rpx;
		font-size: 28rpx;
		line-height: 1.6;
		box-sizing: border-box;
	}

	.modal-footer {
		display: flex;
		gap: 20rpx;
		padding: 30rpx;
		border-top: 1rpx solid #eee;
	}

	.btn-secondary {
		background: #6c757d;
		color: white;
	}

	.btn-primary {
		background: #007bff;
		color: white;
	}

	.btn-danger {
		background: #dc3545;
		color: white;
	}
</style>
