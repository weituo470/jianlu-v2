<template>
	<view class="team-container">
		<!-- 页面头部 -->
		<view class="header">
			<view class="title-section">
				<text class="page-title">团队管理</text>
				<text class="page-subtitle">与团队成员一起协作</text>
			</view>
			<button class="add-btn" @tap="showCreateModal">
				<text class="add-icon">+</text>
			</button>
		</view>
		
		<!-- 群组列表 -->
		<view class="group-list" v-if="groups.length > 0">
			<view 
				class="group-item card" 
				v-for="group in groups" 
				:key="group.id"
				@tap="viewGroup(group)"
			>
				<view class="group-header">
					<view class="group-avatar">
						{{ group.name.charAt(0) }}
					</view>
					<view class="group-info">
						<text class="group-name">{{ group.name }}</text>
						<view class="group-meta">
							<text class="member-count">👥 {{ group.member_count }} 成员</text>
							<text class="role-badge" :class="group.role">
								{{ group.role === 'admin' ? '管理员' : '成员' }}
							</text>
						</view>
					</view>
					<view class="group-actions" v-if="group.role === 'admin'">
						<text class="action-btn">⚙️</text>
					</view>
				</view>
				
				<view class="group-description" v-if="group.description">
					{{ group.description }}
				</view>
				
				<view class="group-footer">
					<text class="join-date">
						加入时间: {{ formatDate(group.joined_at, 'YYYY-MM-DD') }}
					</text>
					<button class="btn btn-outline small" @tap.stop="viewActivities(group)">
						📅 查看活动
					</button>
				</view>
			</view>
		</view>
		
		<!-- 空状态 -->
		<view class="empty-state" v-else-if="!loading">
			<text class="empty-icon">👥</text>
			<text class="empty-title">还没有群组</text>
			<text class="empty-subtitle">创建或加入一个群组，开始组织活动吧！</text>
			<button class="btn btn-primary" @tap="showCreateModal">创建第一个群组</button>
		</view>
		
		<!-- 加载状态 -->
		<view class="loading-state" v-if="loading">
			<text>加载中...</text>
		</view>
		
		<!-- 创建群组弹窗 -->
		<view class="modal-overlay" v-if="showModal" @tap="hideModal">
			<view class="modal-content" @tap.stop>
				<view class="modal-header">
					<text class="modal-title">创建群组</text>
					<text class="modal-close" @tap="hideModal">×</text>
				</view>
				
				<view class="modal-body">
					<view class="form-item">
						<text class="label">群组名称</text>
						<input 
							class="input" 
							type="text" 
							placeholder="输入群组名称..."
							v-model="groupForm.name"
							:maxlength="50"
						/>
					</view>
					
					<view class="form-item">
						<text class="label">群组描述</text>
						<textarea 
							class="textarea" 
							placeholder="描述一下这个群组的用途..."
							v-model="groupForm.description"
							:maxlength="500"
						/>
					</view>
				</view>
				
				<view class="modal-footer">
					<button class="btn btn-secondary" @tap="hideModal">取消</button>
					<button class="btn btn-primary" @tap="createGroup" :disabled="saving">
						{{ saving ? '创建中...' : '创建' }}
					</button>
				</view>
			</view>
		</view>
		
		<!-- 群组详情弹窗 -->
		<view class="modal-overlay" v-if="showDetailModal" @tap="hideDetailModal">
			<view class="modal-content" @tap.stop>
				<view class="modal-header">
					<text class="modal-title">{{ selectedGroup?.name }}</text>
					<text class="modal-close" @tap="hideDetailModal">×</text>
				</view>
				
				<view class="modal-body" v-if="selectedGroup">
					<view class="detail-section">
						<text class="detail-label">群组描述</text>
						<text class="detail-value">{{ selectedGroup.description || '暂无描述' }}</text>
					</view>
					
					<view class="detail-section">
						<text class="detail-label">成员数量</text>
						<text class="detail-value">{{ selectedGroup.member_count }} 人</text>
					</view>
					
					<view class="detail-section">
						<text class="detail-label">我的角色</text>
						<text class="detail-value">{{ selectedGroup.role === 'admin' ? '管理员' : '成员' }}</text>
					</view>
					
					<view class="detail-section">
						<text class="detail-label">加入时间</text>
						<text class="detail-value">{{ formatDate(selectedGroup.joined_at, 'YYYY年MM月DD日') }}</text>
					</view>
				</view>
				
				<view class="modal-footer">
					<button class="btn btn-outline" @tap="viewActivities(selectedGroup)">查看活动</button>
					<button 
						class="btn btn-danger" 
						@tap="leaveGroup(selectedGroup)"
						v-if="selectedGroup.role !== 'admin'"
					>
						离开群组
					</button>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
	import { groupApi } from '../../api/index.js'
	import { formatDate, showSuccess, showError, showConfirm } from '../../utils/index.js'
	
	export default {
		data() {
			return {
				groups: [],
				loading: false,
				showModal: false,
				showDetailModal: false,
				saving: false,
				selectedGroup: null,
				groupForm: {
					name: '',
					description: ''
				}
			}
		},
		onLoad() {
			this.fetchGroups()
		},
		onShow() {
			this.fetchGroups()
		},
		onPullDownRefresh() {
			this.fetchGroups().finally(() => {
				uni.stopPullDownRefresh()
			})
		},
		methods: {
			formatDate,
			
			// 获取群组列表
			async fetchGroups() {
				this.loading = true
				try {
					const response = await groupApi.getList()
					if (response.success) {
						this.groups = response.data
					}
				} catch (error) {
					showError('获取群组列表失败')
				} finally {
					this.loading = false
				}
			},
			
			// 显示创建弹窗
			showCreateModal() {
				this.resetForm()
				this.showModal = true
			},
			
			// 隐藏创建弹窗
			hideModal() {
				this.showModal = false
				this.resetForm()
			},
			
			// 重置表单
			resetForm() {
				this.groupForm = {
					name: '',
					description: ''
				}
			},
			
			// 创建群组
			async createGroup() {
				if (!this.groupForm.name.trim()) {
					showError('请输入群组名称')
					return
				}
				
				this.saving = true
				try {
					const data = {
						name: this.groupForm.name,
						description: this.groupForm.description || undefined
					}
					
					await groupApi.create(data)
					showSuccess('群组创建成功')
					this.hideModal()
					this.fetchGroups()
				} catch (error) {
					showError('创建失败')
				} finally {
					this.saving = false
				}
			},
			
			// 查看群组详情
			viewGroup(group) {
				this.selectedGroup = group
				this.showDetailModal = true
			},
			
			// 隐藏详情弹窗
			hideDetailModal() {
				this.showDetailModal = false
				this.selectedGroup = null
			},
			
			// 查看群组活动
			viewActivities(group) {
				this.hideDetailModal()
				uni.switchTab({
					url: `/pages/activity/activity?groupId=${group.id}`
				})
			},
			
			// 离开群组
			async leaveGroup(group) {
				const confirmed = await showConfirm(`确定要离开群组"${group.name}"吗？`)
				if (!confirmed) return
				
				try {
					await groupApi.leave(group.id)
					showSuccess('已离开群组')
					this.hideDetailModal()
					this.fetchGroups()
				} catch (error) {
					showError('离开群组失败')
				}
			}
		}
	}
</script>

<style scoped>
	.group-container {
		padding: 20rpx;
		min-height: 100vh;
		background-color: #f5f5f5;
	}
	
	.header {
		display: flex;
		justify-content: space-between;
		align-items: center;
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
	
	.add-btn {
		width: 80rpx;
		height: 80rpx;
		border-radius: 40rpx;
		background: #007aff;
		display: flex;
		align-items: center;
		justify-content: center;
		border: none;
	}
	
	.add-icon {
		color: #ffffff;
		font-size: 40rpx;
		font-weight: bold;
	}
	
	.group-item {
		margin-bottom: 20rpx;
		padding: 24rpx;
	}
	
	.group-header {
		display: flex;
		align-items: flex-start;
		margin-bottom: 16rpx;
	}
	
	.group-avatar {
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
	
	.group-info {
		flex: 1;
	}
	
	.group-name {
		font-size: 32rpx;
		font-weight: bold;
		color: #333;
		display: block;
		margin-bottom: 8rpx;
	}
	
	.group-meta {
		display: flex;
		align-items: center;
		gap: 16rpx;
	}
	
	.member-count {
		font-size: 24rpx;
		color: #666;
	}
	
	.role-badge {
		font-size: 20rpx;
		padding: 4rpx 12rpx;
		border-radius: 12rpx;
		color: #ffffff;
	}
	
	.role-badge.admin {
		background: #ff3b30;
	}
	
	.role-badge.member {
		background: #007aff;
	}
	
	.group-actions {
		font-size: 28rpx;
		color: #666;
	}
	
	.group-description {
		font-size: 28rpx;
		color: #666;
		line-height: 1.5;
		margin-bottom: 16rpx;
	}
	
	.group-footer {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding-top: 16rpx;
		border-top: 2rpx solid #f0f0f0;
	}
	
	.join-date {
		font-size: 24rpx;
		color: #999;
	}
	
	.btn.small {
		padding: 12rpx 24rpx;
		font-size: 24rpx;
		height: auto;
		line-height: 1.2;
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
		display: block;
		margin-bottom: 40rpx;
	}
	
	.loading-state {
		text-align: center;
		padding: 60rpx;
		color: #666;
	}
	
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
	
	.detail-section {
		margin-bottom: 30rpx;
	}
	
	.detail-label {
		display: block;
		font-size: 28rpx;
		color: #333;
		font-weight: bold;
		margin-bottom: 8rpx;
	}
	
	.detail-value {
		display: block;
		font-size: 28rpx;
		color: #666;
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
	
	.btn-danger {
		background: #ff3b30;
		color: #ffffff;
	}
</style>
