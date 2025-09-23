<template>
	<view class="container">
		<!-- 头部 -->
		<view class="header">
			<text class="title">我的申请</text>
			<text class="subtitle">查看您提交的团队加入申请</text>
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
				<text class="empty-text">暂无申请记录</text>
				<text class="empty-desc">您可以浏览团队并申请加入</text>
				<button class="browse-btn" @tap="browseTeams">浏览团队</button>
			</view>

			<view v-else class="applications-list">
				<view
					class="application-item"
					v-for="application in applications"
					:key="application.id"
				>
					<view class="application-header">
						<view class="team-info">
							<view class="team-avatar">
								{{ application.team.name ? application.team.name.charAt(0) : 'T' }}
							</view>
							<view class="team-details">
								<text class="team-name">{{ application.team.name }}</text>
								<text class="apply-time">{{ formatDate(application.application_time, 'MM月DD日 HH:mm') }}</text>
							</view>
						</view>
						<view class="status-badge" :class="getStatusClass(application.status)">
							{{ getStatusText(application.status) }}
						</view>
					</view>

					<view class="application-content">
						<text class="reason-label" v-if="application.reason">申请理由：</text>
						<text class="reason-text" v-if="application.reason">{{ application.reason }}</text>

						<!-- 审核信息 -->
						<view v-if="application.status === 'approved'" class="review-info approved">
							<text class="review-label">✓ 审核通过</text>
							<text class="reviewer">审核人：{{ application.approver?.nickname || application.approver?.username }}</text>
							<text class="review-time">{{ formatDate(application.approved_at, 'MM月DD日 HH:mm') }}</text>
						</view>

						<view v-else-if="application.status === 'rejected'" class="review-info rejected">
							<text class="review-label">✗ 审核未通过</text>
							<text class="reviewer">审核人：{{ application.rejecter?.nickname || application.rejecter?.username }}</text>
							<text class="reason" v-if="application.rejection_reason">拒绝理由：{{ application.rejection_reason }}</text>
							<text class="review-time">{{ formatDate(application.rejected_at, 'MM月DD日 HH:mm') }}</text>
						</view>
					</view>

					<!-- 操作按钮 -->
					<view class="application-actions">
						<view v-if="application.status === 'pending'" class="action-buttons">
							<button class="action-btn cancel" @tap="cancelApplication(application.id)">
								取消申请
							</button>
						</view>
						<view v-else-if="application.status === 'rejected'" class="action-buttons">
							<button class="action-btn primary" @tap="reapply(application.team.id, application.team.name)">
								重新申请
							</button>
						</view>
					</view>
				</view>
			</view>

			<!-- 加载更多 -->
			<view v-if="hasMore && !loading" class="load-more">
				<button class="load-more-btn" @tap="loadMore">
					{{ loadingMore ? '加载中...' : '加载更多' }}
				</button>
			</view>
		</view>
	</view>
</template>

<script>
import { groupApi } from '../../api/index.js'
import { showError, showSuccess, formatDate } from '../../utils/index.js'
import notificationService from '../../utils/notification.js'

export default {
	data() {
		return {
			applications: [],
			loading: false,
			loadingMore: false,
			currentStatus: 'all',
			page: 1,
			limit: 10,
			hasMore: true,
			stats: {
				pending: 0,
				approved: 0,
				rejected: 0,
				cancelled: 0,
				total: 0
			},
			pollingTimer: null,
			previousApplicationsStatus: new Map() // 记录之前的申请状态
		}
	},

	onLoad() {
		this.loadApplications()
		this.loadStats()
		// 启动轮询，检查申请状态变化
		this.startPolling()
	},

	onHide() {
		// 页面隐藏时停止轮询
		this.stopPolling()
	},

	onUnload() {
		// 页面卸载时停止轮询
		this.stopPolling()
	},

	onPullDownRefresh() {
		this.refresh()
	},

	methods: {
		// 加载申请列表
		async loadApplications(loadMore = false) {
			if (loadMore) {
				this.loadingMore = true
			} else {
				this.loading = true
				this.page = 1
				this.applications = []
			}

			try {
				const params = {
					page: this.page,
					limit: this.limit
				}

				if (this.currentStatus !== 'all') {
					params.status = this.currentStatus
				}

				const response = await groupApi.getMyApplications(params)

				if (response.success) {
					const { applications, total } = response.data

					if (loadMore) {
						this.applications = [...this.applications, ...applications]
					} else {
						this.applications = applications
					}

					this.hasMore = this.applications.length < total
					this.page++
				} else {
					showError(response.message || '加载失败')
				}
			} catch (error) {
				console.error('加载申请列表失败:', error)
				showError('加载失败')
			} finally {
				this.loading = false
				this.loadingMore = false
				if (loadMore) {
					uni.stopPullDownRefresh()
				}
			}
		},

		// 加载统计信息
		async loadStats() {
			try {
				// 获取所有状态的申请来统计
				const response = await groupApi.getMyApplications({
					limit: 1000 // 获取足够多的数据来统计
				})

				if (response.success) {
					const applications = response.data.applications
					this.stats = {
						pending: applications.filter(a => a.status === 'pending').length,
						approved: applications.filter(a => a.status === 'approved').length,
						rejected: applications.filter(a => a.status === 'rejected').length,
						cancelled: applications.filter(a => a.status === 'cancelled').length,
						total: applications.length
					}
				}
			} catch (error) {
				console.error('加载统计信息失败:', error)
			}
		},

		// 切换状态
		switchStatus(status) {
			this.currentStatus = status
			this.loadApplications()
		},

		// 刷新
		refresh() {
			this.loadApplications()
			this.loadStats()
		},

		// 加载更多
		loadMore() {
			if (this.hasMore && !this.loadingMore) {
				this.loadApplications(true)
			}
		},

		// 取消申请
		async cancelApplication(applicationId) {
			if (!confirm('确定要取消这个申请吗？')) return

			try {
				const response = await groupApi.cancelApplication(applicationId)

				if (response.success) {
					showSuccess('申请已取消')
					this.refresh()
				} else {
					showError(response.message || '操作失败')
				}
			} catch (error) {
				console.error('取消申请失败:', error)
				showError('操作失败')
			}
		},

		// 重新申请
		reapply(teamId, teamName) {
			uni.navigateTo({
				url: `/pages/team-detail/team-detail?id=${teamId}`
			})
		},

		// 浏览团队
		browseTeams() {
			uni.switchTab({
				url: '/pages/team/team'
			})
		},

		// 获取状态样式
		getStatusClass(status) {
			const classes = {
				'pending': 'pending',
				'approved': 'approved',
				'rejected': 'rejected',
				'cancelled': 'cancelled'
			}
			return classes[status] || ''
		},

		// 获取状态文本
		getStatusText(status) {
			const texts = {
				'pending': '待处理',
				'approved': '已批准',
				'rejected': '已拒绝',
				'cancelled': '已取消'
			}
			return texts[status] || status
		},

		// 格式化日期
		formatDate(dateStr, format) {
			return formatDate(dateStr, format)
		},

		// 取消申请
		async cancelApplication(applicationId) {
			const confirmed = await showConfirm('确定要取消这个申请吗？')
			if (!confirmed) return

			try {
				const response = await groupApi.cancelApplication(applicationId)
				if (response.success) {
					// 获取申请信息用于通知
					const application = this.applications.find(app => app.id === applicationId)
					if (application) {
						notificationService.notifyApplicationCancelled(application.team.name)
					}
					showSuccess('申请已取消')
					// 重新加载数据
					this.loadApplications()
					this.loadStats()
				} else {
					throw new Error(response.message || '取消失败')
				}
			} catch (error) {
				console.error('取消申请失败:', error)
				showError(error.message || '取消失败，请稍后重试')
			}
		},

		// 重新申请
		reapply(teamId, teamName) {
			uni.navigateTo({
				url: `/pages/team-detail/team-detail?id=${teamId}`
			})
		},

		// 启动轮询
		startPolling() {
			// 每30秒检查一次申请状态
			this.pollingTimer = setInterval(() => {
				this.checkApplicationStatusChanges()
			}, 30000)
		},

		// 停止轮询
		stopPolling() {
			if (this.pollingTimer) {
				clearInterval(this.pollingTimer)
				this.pollingTimer = null
			}
		},

		// 检查申请状态变化
		async checkApplicationStatusChanges() {
			try {
				// 只检查pending状态的申请
				const pendingApplications = this.applications.filter(app => app.status === 'pending')
				if (pendingApplications.length === 0) return

				const response = await groupApi.getMyApplications({
					status: 'pending',
					limit: 1000
				})

				if (response.success) {
					const updatedApplications = response.data.applications

					// 检查每个申请的状态变化
					pendingApplications.forEach(oldApp => {
						const updatedApp = updatedApplications.find(app => app.id === oldApp.id)
						if (updatedApp && updatedApp.status !== oldApp.status) {
							// 状态发生变化，发送通知
							this.handleStatusChange(oldApp, updatedApp)
						}
					})

					// 如果有状态变化，刷新列表
					if (updatedApplications.some(app => {
						const oldApp = pendingApplications.find(old => old.id === app.id)
						return oldApp && app.status !== oldApp.status
					})) {
						this.refresh()
					}
				}
			} catch (error) {
				console.error('检查申请状态变化失败:', error)
			}
		},

		// 处理状态变化
		handleStatusChange(oldApplication, newApplication) {
			switch (newApplication.status) {
				case 'approved':
					notificationService.notifyApplicationApproved(newApplication.team.name)
					break
				case 'rejected':
					notificationService.notifyApplicationRejected(
						newApplication.team.name,
						newApplication.rejectionReason || ''
					)
					break
			}
		}
	}
}
</script>

<style lang="scss" scoped>
.container {
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

	.title {
		font-size: 36rpx;
		font-weight: 600;
		display: block;
		margin-bottom: 8rpx;
	}

	.subtitle {
		font-size: 28rpx;
		opacity: 0.9;
	}
}

.stats-section {
	margin-bottom: 20rpx;

	.stats-grid {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 20rpx;
		background: white;
		border-radius: 16rpx;
		padding: 30rpx;
	}

	.stat-item {
		text-align: center;

		.stat-number {
			font-size: 40rpx;
			font-weight: 600;
			color: #667eea;
			display: block;
			margin-bottom: 8rpx;
		}

		.stat-label {
			font-size: 24rpx;
			color: #666;
		}
	}
}

.filter-section {
	margin-bottom: 20rpx;

	.filter-tabs {
		display: flex;
		background: white;
		border-radius: 16rpx;
		padding: 8rpx;
		gap: 8rpx;

		.filter-tab {
			flex: 1;
			text-align: center;
			padding: 20rpx 0;
			font-size: 28rpx;
			color: #666;
			border-radius: 12rpx;
			transition: all 0.3s;

			&.active {
				background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
				color: white;
			}
		}
	}
}

.applications-section {
	.loading, .empty {
		text-align: center;
		padding: 100rpx 0;
		color: #999;
		font-size: 28rpx;
	}

	.empty {
		.empty-icon {
			font-size: 80rpx;
			display: block;
			margin-bottom: 20rpx;
		}

		.empty-text {
			display: block;
			margin-bottom: 16rpx;
		}

		.empty-desc {
			display: block;
			font-size: 24rpx;
			margin-bottom: 40rpx;
		}

		.browse-btn {
			background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
			color: white;
			border: none;
			border-radius: 44rpx;
			padding: 20rpx 60rpx;
			font-size: 28rpx;
		}
	}

	.applications-list {
		.application-item {
			background: white;
			border-radius: 16rpx;
			margin-bottom: 20rpx;
			padding: 30rpx;
			box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.05);

			.application-header {
				display: flex;
				justify-content: space-between;
				align-items: flex-start;
				margin-bottom: 20rpx;

				.team-info {
					display: flex;
					align-items: center;
					flex: 1;

					.team-avatar {
						width: 80rpx;
						height: 80rpx;
						background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
						border-radius: 50%;
						display: flex;
						align-items: center;
						justify-content: center;
						color: white;
						font-size: 32rpx;
						font-weight: 600;
						margin-right: 20rpx;
					}

					.team-details {
						.team-name {
							font-size: 32rpx;
							font-weight: 600;
							color: #333;
							display: block;
							margin-bottom: 8rpx;
						}

						.apply-time {
							font-size: 24rpx;
							color: #999;
						}
					}
				}

				.status-badge {
					padding: 8rpx 20rpx;
					border-radius: 20rpx;
					font-size: 24rpx;
					font-weight: 500;

					&.pending {
						background: #fff3cd;
						color: #856404;
					}

					&.approved {
						background: #d4edda;
						color: #155724;
					}

					&.rejected {
						background: #f8d7da;
						color: #721c24;
					}

					&.cancelled {
						background: #e9ecef;
						color: #6c757d;
					}
				}
			}

			.application-content {
				margin-bottom: 20rpx;

				.reason-label {
					font-size: 26rpx;
					color: #666;
					margin-bottom: 8rpx;
					display: block;
				}

				.reason-text {
					font-size: 28rpx;
					color: #333;
					line-height: 1.5;
				}

				.review-info {
					margin-top: 20rpx;
					padding: 20rpx;
					border-radius: 12rpx;

					&.approved {
						background: #f8f9fa;
						border-left: 4rpx solid #28a745;
					}

					&.rejected {
						background: #f8f9fa;
						border-left: 4rpx solid #dc3545;
					}

					.review-label {
						font-size: 28rpx;
						font-weight: 600;
						display: block;
						margin-bottom: 8rpx;
					}

					.reviewer, .reason, .review-time {
						font-size: 24rpx;
						color: #666;
						display: block;
						margin-bottom: 4rpx;
					}
				}
			}

			.application-actions {
				.action-buttons {
					display: flex;
					justify-content: flex-end;
					gap: 20rpx;

					.action-btn {
						padding: 16rpx 40rpx;
						border-radius: 8rpx;
						font-size: 28rpx;
						border: none;

						&.cancel {
							background: #e9ecef;
							color: #6c757d;
						}

						&.primary {
							background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
							color: white;
						}
					}
				}
			}
		}
	}

	.load-more {
		text-align: center;
		padding: 40rpx 0;

		.load-more-btn {
			background: white;
			border: 1rpx solid #ddd;
			color: #666;
			border-radius: 8rpx;
			padding: 20rpx 60rpx;
			font-size: 28rpx;
		}
	}
}
</style>