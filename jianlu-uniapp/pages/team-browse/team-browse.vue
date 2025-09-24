<template>
	<view class="browse-container">
		<!-- 页面头部 -->
		<view class="header">
			<view class="title-section">
				<text class="page-title">发现团队</text>
				<text class="page-subtitle">找到志同道合的团队</text>
			</view>
		</view>
		
		<!-- 搜索框 -->
		<view class="search-section">
			<view class="search-box">
				<input 
					class="search-input" 
					type="text" 
					placeholder="搜索团队名称..."
					v-model="searchKeyword"
					@input="onSearchInput"
				/>
				<button class="search-btn" @tap="searchTeams">搜索</button>
			</view>
		</view>
		
		<!-- 团队列表 -->
		<scroll-view 
			class="teams-list" 
			scroll-y 
			refresher-enabled 
			:refresher-triggered="refreshing"
			@refresherrefresh="onRefresh"
			@scrolltolower="loadMore"
		>
			<view 
				class="team-item card" 
				v-for="team in teams" 
				:key="team.id"
				@tap="viewTeamDetail(team)"
			>
				<view class="team-header">
					<view class="team-avatar">
						{{ team.name.charAt(0) }}
					</view>
					<view class="team-info">
						<text class="team-name">{{ team.name }}</text>
						<view class="team-meta">
							<text class="member-count">👥 {{ team.member_count }} 成员</text>
							<text class="leader-name">👤 {{ team.leader_name }}</text>
						</view>
					</view>
					<view class="team-status">
						<text 
							class="status-badge" 
							:class="getStatusClass(team.application_status)"
						>
							{{ getStatusText(team.application_status) }}
						</text>
					</view>
				</view>
				
				<view class="team-description" v-if="team.description">
					{{ team.description }}
				</view>
				
				<view class="team-footer">
					<text class="create-date">
						创建时间: {{ formatDate(team.created_at, 'YYYY-MM-DD') }}
					</text>
					<button 
						class="btn btn-primary small" 
						v-if="team.can_apply"
						@tap.stop="applyToJoin(team)"
					>
						申请加入
					</button>
					<button 
						class="btn btn-outline small" 
						v-else-if="team.application_status === 'pending'"
						disabled
					>
						申请中
					</button>
				</view>
			</view>
			
			<!-- 加载状态 -->
			<view class="loading-state" v-if="loading">
				<text>加载中...</text>
			</view>
			
			<!-- 空状态 -->
			<view class="empty-state" v-if="teams.length === 0 && !loading">
				<text class="empty-icon">🔍</text>
				<text class="empty-title">没有找到团队</text>
				<text class="empty-subtitle">试试其他搜索关键词</text>
			</view>
		</scroll-view>
		

	</view>
</template>

<script>
	import { groupApi } from '../../api/index.js'
	import { get } from '../../utils/request.js'
	import { formatDate, showSuccess, showError } from '../../utils/index.js'
	
	export default {
		data() {
			return {
				teams: [],
				loading: false,
				refreshing: false,
				searchKeyword: '',
				page: 1,
				pageSize: 15,
				hasMore: true
			}
		},
		onLoad() {
			this.loadTeams()
		},
		onPullDownRefresh() {
			this.onRefresh()
		},
		methods: {
			formatDate,
			
			// 加载团队列表
			async loadTeams(refresh = false) {
				if (this.loading) return
				
				this.loading = true
				try {
					const page = refresh ? 1 : this.page
					// 使用微信小程序专用的团队列表API
					const params = {
						page: page,
						pageSize: this.pageSize,
						search: this.searchKeyword || undefined
					}
					const response = await get('/miniapp/teams', { params })

					if (response.success) {
						const newTeams = refresh ? response.data : [...this.teams, ...response.data]
						this.teams = newTeams
						this.page = refresh ? 2 : this.page + 1
						this.hasMore = response.data.length >= this.pageSize
						this.refreshing = false
					}
				} catch (error) {
					showError('加载团队列表失败')
				} finally {
					this.loading = false
					if (refresh) {
						uni.stopPullDownRefresh()
					}
				}
			},
			
			// 下拉刷新
			onRefresh() {
				this.refreshing = true
				this.page = 1
				this.hasMore = true
				this.loadTeams(true)
			},
			
			// 上拉加载更多
			loadMore() {
				if (this.hasMore && !this.loading) {
					this.loadTeams()
				}
			},
			
			// 搜索输入
			onSearchInput() {
				// 可以添加防抖逻辑
			},
			
			// 搜索团队
			searchTeams() {
				this.page = 1
				this.hasMore = true
				this.teams = []
				this.loadTeams(true)
			},
			
			// 查看团队详情
			viewTeamDetail(team) {
				// 可以跳转到团队详情页
				console.log('查看团队详情:', team)
			},
			
			// 申请加入团队
			async applyToJoin(team) {
				try {
					await groupApi.apply(team.id, { reason: '希望能够加入这个团队，参与团队活动和项目，与大家一起学习和成长。' })
					showSuccess('申请提交成功，请等待审核')
					this.onRefresh() // 刷新列表
				} catch (error) {
					console.error('申请提交失败:', error)
					if (error.message && error.message.includes('已经提交过申请')) {
						showError('您已经提交过申请，请等待审核')
					} else if (error.message && error.message.includes('已经是该团队的成员')) {
						showError('您已经是该团队的成员')
					} else {
						showError('申请提交失败，请稍后重试')
					}
				}
			},
			

			
			// 获取状态样式类
			getStatusClass(status) {
				const classMap = {
					'none': 'status-none',
					'pending': 'status-pending',
					'approved': 'status-approved',
					'rejected': 'status-rejected',
					'member': 'status-member'
				}
				return classMap[status] || 'status-none'
			},
			
			// 获取状态文本
			getStatusText(status) {
				const textMap = {
					'none': '可申请',
					'pending': '申请中',
					'approved': '已通过',
					'rejected': '已拒绝',
					'member': '已加入'
				}
				return textMap[status] || '可申请'
			}
		}
	}
</script>

<style scoped>
	.browse-container {
		padding: 20rpx;
		min-height: 100vh;
		background-color: #f5f5f5;
	}
	
	.header {
		margin-bottom: 30rpx;
		padding: 20rpx;
		background: #ffffff;
		border-radius: 16rpx;
	}
	
	.page-title {
		font-size: 32rpx;
		font-weight: bold;
		color: #333;
		display: block;
	}
	
	.page-subtitle {
		font-size: 24rpx;
		color: #666;
		display: block;
		margin-top: 8rpx;
	}
	
	.search-section {
		margin-bottom: 30rpx;
	}
	
	.search-box {
		display: flex;
		align-items: center;
		background: #ffffff;
		border-radius: 16rpx;
		padding: 20rpx;
		gap: 20rpx;
	}
	
	.search-input {
		flex: 1;
		background: #f8f8f8;
		border-radius: 8rpx;
		padding: 15rpx;
		font-size: 28rpx;
	}
	
	.search-btn {
		background: #007aff;
		color: #ffffff;
		border: none;
		border-radius: 8rpx;
		padding: 15rpx 30rpx;
		font-size: 28rpx;
	}
	
	.teams-list {
		height: calc(100vh - 300rpx);
	}
	
	.team-item {
		margin-bottom: 20rpx;
		padding: 24rpx;
	}
	
	.team-header {
		display: flex;
		align-items: flex-start;
		margin-bottom: 16rpx;
	}
	
	.team-avatar {
		width: 80rpx;
		height: 80rpx;
		border-radius: 40rpx;
		background: #007aff;
		display: flex;
		align-items: center;
		justify-content: center;
		color: #ffffff;
		font-size: 32rpx;
		font-weight: bold;
		margin-right: 20rpx;
	}
	
	.team-info {
		flex: 1;
	}
	
	.team-name {
		font-size: 32rpx;
		font-weight: bold;
		color: #333;
		display: block;
		margin-bottom: 8rpx;
	}
	
	.team-meta {
		display: flex;
		flex-direction: column;
		gap: 4rpx;
	}
	
	.member-count, .leader-name {
		font-size: 24rpx;
		color: #666;
	}
	
	.team-status {
		margin-left: 20rpx;
	}
	
	.status-badge {
		font-size: 20rpx;
		padding: 6rpx 12rpx;
		border-radius: 16rpx;
		color: #ffffff;
	}
	
	.status-none {
		background: #34c759;
	}
	
	.status-pending {
		background: #ff9500;
	}
	
	.status-approved {
		background: #007aff;
	}
	
	.status-rejected {
		background: #ff3b30;
	}
	
	.status-member {
		background: #666;
	}
	
	.team-description {
		font-size: 28rpx;
		color: #666;
		line-height: 1.5;
		margin-bottom: 16rpx;
	}
	
	.team-footer {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding-top: 16rpx;
		border-top: 2rpx solid #f0f0f0;
	}
	
	.create-date {
		font-size: 24rpx;
		color: #999;
	}
	
	.btn.small {
		padding: 12rpx 24rpx;
		font-size: 24rpx;
		height: auto;
		line-height: 1.2;
	}
	
	.loading-state, .empty-state {
		text-align: center;
		padding: 60rpx;
		color: #666;
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
		display: block;
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
