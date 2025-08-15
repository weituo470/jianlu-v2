<template>
	<view class="team-container">
		<!-- 页面头部 -->
		<view class="header">
			<view class="title-section">
				<text class="page-title">我的团队</text>
				<text class="page-subtitle">与团队成员一起协作</text>
			</view>
			<view class="header-actions">
				<button class="browse-btn" @tap="browseTeams">
					<text class="browse-icon">🔍</text>
				</button>
				<button class="add-btn" @tap="showCreateModal">
					<text class="add-icon">+</text>
				</button>
			</view>
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
								<text class="role-icon" v-if="group.role === 'admin'">👑</text>
								{{ group.role === 'admin' ? '负责人' : '成员' }}
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
			<text class="empty-title">还没有团队</text>
			<text class="empty-subtitle">创建或加入一个团队，开始组织活动吧！</text>
			<button class="btn btn-primary" @tap="showCreateModal">创建第一个团队</button>
		</view>
		
		<!-- 加载状态 -->
		<view class="loading-state" v-if="loading">
			<text>加载中...</text>
		</view>
		
		<!-- 创建团队弹窗 -->
		<view class="modal-overlay" v-if="showModal" @tap="hideModal">
			<view class="modal-content" @tap.stop>
				<view class="modal-header">
					<text class="modal-title">创建团队</text>
					<text class="modal-close" @tap="hideModal">×</text>
				</view>

				<view class="modal-body">
					<view class="form-item">
						<text class="label">团队名称 <text class="required">*</text></text>
						<input
							class="input"
							type="text"
							placeholder="输入团队名称（2-50个字符）"
							v-model="groupForm.name"
							:maxlength="50"
						/>
					</view>

					<view class="form-item">
						<text class="label">团队类型</text>
						<picker 
							:range="teamTypes" 
							:range-key="'label'"
							:value="teamTypeIndex"
							@change="onTeamTypeChange"
							class="picker"
						>
							<view class="picker-display">
								{{ getSelectedTeamTypeName() }}
								<text class="picker-arrow">▼</text>
							</view>
						</picker>
					</view>

					<view class="form-item">
						<text class="label">团队描述</text>
						<textarea
							class="textarea"
							placeholder="描述一下这个团队的用途（可选，最多500字符）"
							v-model="groupForm.description"
							:maxlength="500"
						/>
					</view>

					<view class="form-item">
						<text class="label">团队头像</text>
						<input
							class="input"
							type="text"
							placeholder="输入头像URL（可选）"
							v-model="groupForm.avatar_url"
						/>
						<text class="form-hint">可以输入图片链接作为团队头像</text>
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
		
		<!-- 团队详情弹窗 -->
		<view class="modal-overlay" v-if="showDetailModal" @tap="hideDetailModal">
			<view class="modal-content" @tap.stop>
				<view class="modal-header">
					<text class="modal-title">{{ selectedGroup?.name }}</text>
					<text class="modal-close" @tap="hideDetailModal">×</text>
				</view>

				<view class="modal-body" v-if="selectedGroup">
					<view class="detail-section">
						<text class="detail-label">团队描述</text>
						<text class="detail-value">{{ selectedGroup.description || '暂无描述' }}</text>
					</view>

					<view class="detail-section">
						<text class="detail-label">成员（{{ selectedGroup.member_count }}）</text>
						<view class="members-preview">
							<view class="member-list-preview">
								<!-- 如果有成员预览数据，显示实际成员 -->
								<template v-if="selectedGroup.membersPreview && selectedGroup.membersPreview.length > 0">
									<text
										v-for="(member, index) in selectedGroup.membersPreview"
										:key="member.id"
										class="member-item"
										:class="{ 'leader': member.is_leader }"
									>
										{{ member.is_leader ? '👑' : '👤' }} {{ member.nickname }}
									</text>
								</template>
								<!-- 如果没有预览数据，显示默认信息 -->
								<template v-else>
									<text class="member-item leader" v-if="selectedGroup.role === 'admin'">
										👑 {{ selectedGroup.leader_name || '我' }}
									</text>
									<text class="member-item" v-if="selectedGroup.member_count > 1">
										👤 其他成员
									</text>
								</template>

								<!-- 如果成员超过4个，显示省略号 -->
								<text v-if="selectedGroup.member_count > 4" class="member-more">...</text>
							</view>
							<text class="view-all-members" @tap="viewTeamDetail(selectedGroup)">查看全部成员</text>
						</view>
					</view>

					<view class="detail-section">
						<text class="detail-label">我的角色</text>
						<text class="detail-value">
							<text v-if="selectedGroup.role === 'admin'">👑 负责人</text>
							<text v-else>👤 成员</text>
						</text>
					</view>

					<view class="detail-section">
						<text class="detail-label">加入时间</text>
						<text class="detail-value">{{ formatDate(selectedGroup.joined_at, 'YYYY年MM月DD日') }}</text>
					</view>
				</view>
				
				<view class="modal-footer">
					<view class="action-buttons">
						<button class="action-btn" @tap="viewTeamDetail(selectedGroup)">
							团队详情
						</button>
						<button class="action-btn" @tap="viewActivities(selectedGroup)">
							团队活动
						</button>
						<button
							class="action-btn"
							@tap="viewApplications(selectedGroup)"
							v-if="selectedGroup.role === 'admin' || selectedGroup.role === 'leader'"
						>
							处理申请
						</button>
					</view>

					<!-- 只有非负责人才显示退出按钮 -->
					<button
						class="btn btn-danger exit-btn"
						@tap="leaveGroup(selectedGroup)"
						v-if="selectedGroup.role !== 'admin' && selectedGroup.role !== 'leader'"
					>
						退出团队
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
				teamTypes: [
					{ value: 'general', label: '通用团队' }
				], // 团队类型列表，初始化默认值
				loading: false,
				showModal: false,
				showDetailModal: false,
				saving: false,
				selectedGroup: null,
				groupForm: {
					name: '',
					description: '',
					team_type: 'general',
					avatar_url: ''
				}
			}
		},
		computed: {
			// 计算团队类型选择器的索引
			teamTypeIndex() {
				if (!this.teamTypes || this.teamTypes.length === 0) {
					return 0
				}
				const index = this.teamTypes.findIndex(t => t.value === this.groupForm.team_type)
				return index >= 0 ? index : 0
			}
		},
		onLoad() {
			this.loadInitialData()
		},
		onShow() {
			this.loadInitialData()
		},
		onPullDownRefresh() {
			this.fetchGroups().finally(() => {
				uni.stopPullDownRefresh()
			})
		},
		methods: {
			formatDate,
			
			// 加载初始数据
			async loadInitialData() {
				await Promise.all([
					this.fetchGroups(),
					this.loadTeamTypes()
				])
			},

			// 加载团队类型
			async loadTeamTypes() {
				try {
					// ⚠️ 临时硬编码数据 - 生产环境需要替换为数据库查询
					// TODO: 后续改为从 API.teamTypes.getList() 获取
					const teamTypesTemp = [
						{ value: 'general', label: '通用团队' },
						{ value: 'development', label: '开发团队' },
						{ value: 'design', label: '设计团队' },
						{ value: 'marketing', label: '市场团队' },
						{ value: 'sales', label: '销售团队' },
						{ value: 'support', label: '客服团队' },
						{ value: 'hr', label: '人事团队' },
						{ value: 'finance', label: '财务团队' },
						{ value: 'other', label: '其他' }
					]
					this.teamTypes = teamTypesTemp
				} catch (error) {
					console.error('加载团队类型失败:', error)
					// 使用默认类型
					const defaultTeamTypesTemp = [
						{ value: 'general', label: '通用团队' }
					]
					this.teamTypes = defaultTeamTypesTemp
				}
			},
			
			// 获取团队列表
			async fetchGroups() {
				this.loading = true
				try {
					// 调用我的团队API，获取用户已加入的团队
					const response = await groupApi.getMyTeams()
					if (response.success) {
						// 修复：团队数据在 response.data.teams 中
						const teams = response.data.teams || response.data || []
						this.groups = Array.isArray(teams) ? teams : []
					}
				} catch (error) {
					showError('获取团队列表失败')
					console.error('获取团队列表失败:', error)
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
					description: '',
					team_type: 'general',
					avatar_url: ''
				}
			},
			
			// 创建团队
			async createGroup() {
				// 表单验证
				if (!this.groupForm.name.trim()) {
					showError('请输入团队名称')
					return
				}

				if (this.groupForm.name.trim().length < 2) {
					showError('团队名称至少2个字符')
					return
				}

				if (this.groupForm.name.trim().length > 50) {
					showError('团队名称不能超过50个字符')
					return
				}

				if (this.groupForm.description && this.groupForm.description.length > 500) {
					showError('团队描述不能超过500个字符')
					return
				}

				this.saving = true
				try {
					const data = {
						name: this.groupForm.name.trim(),
						description: this.groupForm.description?.trim() || '',
						team_type: this.groupForm.team_type || 'general',
						avatar_url: this.groupForm.avatar_url?.trim() || null
					}

					const response = await groupApi.create(data)
					if (response.success) {
						showSuccess('团队创建成功')
						this.hideModal()
						this.fetchGroups()
					} else {
						throw new Error(response.message || '创建失败')
					}
				} catch (error) {
					console.error('创建团队失败:', error)
					showError(error.message || '创建失败，请稍后重试')
				} finally {
					this.saving = false
				}
			},
			
			// 查看团队详情
			async viewGroup(group) {
				this.selectedGroup = group
				// 获取团队成员预览信息
				await this.loadTeamMembersPreview(group.id)
				this.showDetailModal = true
			},

			// 隐藏详情弹窗
			hideDetailModal() {
				this.showDetailModal = false
				this.selectedGroup = null
			},

			// 查看团队活动
			viewActivities(group) {
				this.hideDetailModal()
				uni.switchTab({
					url: `/pages/activity/activity?groupId=${group.id}`
				})
			},
			
			// 离开群组
			async leaveGroup(group) {
				// 检查用户角色
				if (group.role === 'admin' || group.role === 'leader') {
					showError('团队负责人不能退出团队，请先转让负责人权限')
					return
				}

				const confirmed = await showConfirm(`确定要离开群组"${group.name}"吗？`)
				if (!confirmed) return

				try {
					await groupApi.leave(group.id)
					showSuccess('已离开群组')
					this.hideDetailModal()
					this.fetchGroups()
				} catch (error) {
					console.error('离开群组失败:', error)

					// 根据错误类型提供不同的提示
					if (error.message && error.message.includes('负责人')) {
						showError('团队负责人不能退出团队，请先转让负责人权限')
					} else if (error.message && error.message.includes('不在该团队中')) {
						showError('您不在该团队中，请刷新页面')
						// 自动刷新团队列表
						this.fetchGroups()
					} else {
						showError('离开群组失败，请稍后重试')
					}
				}
			},

			// 浏览团队
			browseTeams() {
				uni.navigateTo({
					url: '/pages/team-browse/team-browse'
				})
			},

			// 查看申请管理
			viewApplications(group) {
				uni.navigateTo({
					url: `/pages/team-applications/team-applications?teamId=${group.id}&teamName=${encodeURIComponent(group.name)}`
				})
			},

			// 查看团队详情和成员列表
			viewTeamDetail(group) {
				this.hideDetailModal()
				uni.navigateTo({
					url: `/pages/team-detail/team-detail?id=${group.id}`
				})
			},

			// 加载团队成员预览（前4个成员）
			async loadTeamMembersPreview(teamId) {
				try {
					// 所有用户都可以获取成员列表
					const response = await groupApi.getTeamMembers(teamId)
					if (response.success && response.data.members) {
						// 取前4个成员用于预览
						this.selectedGroup.membersPreview = response.data.members.slice(0, 4)
						this.selectedGroup.leader_name = response.data.members.find(m => m.is_leader)?.nickname || '负责人'
					}
				} catch (error) {
					console.log('获取成员预览失败:', error)
					// 如果获取失败，使用默认显示
				}
			},

			// 团队类型选择相关方法
			onTeamTypeChange(e) {
				const index = e.detail.value
				this.groupForm.team_type = this.teamTypes[index].value
			},

			getSelectedTeamTypeName() {
				if (!this.teamTypes || this.teamTypes.length === 0) {
					return '通用团队'
				}
				const type = this.teamTypes.find(t => t.value === this.groupForm.team_type)
				return type ? type.label : '通用团队'
			},


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
	
	.header-actions {
		display: flex;
		gap: 16rpx;
	}

	.browse-btn, .add-btn {
		width: 80rpx;
		height: 80rpx;
		border-radius: 40rpx;
		display: flex;
		align-items: center;
		justify-content: center;
		border: none;
	}

	.browse-btn {
		background: #34c759;
	}

	.add-btn {
		background: #007aff;
	}
	
	.browse-icon, .add-icon {
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
		line-height: 1.4;
		word-wrap: break-word;
		word-break: break-all;
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
		display: flex;
		align-items: center;
	}

	.role-badge.admin {
		background: linear-gradient(135deg, #ff6b6b, #ffa500);
		font-weight: bold;
	}

	.role-badge.member {
		background: #007aff;
	}

	.role-icon {
		margin-right: 4rpx;
		font-size: 18rpx;
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
		word-wrap: break-word;
		word-break: break-all;
		/* 限制最多显示2行 */
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
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

	.required {
		color: #ff3b30;
		font-weight: bold;
	}

	.picker {
		width: 100%;
	}

	.picker-display {
		width: 100%;
		height: 80rpx;
		padding: 20rpx;
		border: 2rpx solid #e0e0e0;
		border-radius: 8rpx;
		font-size: 28rpx;
		box-sizing: border-box;
		line-height: 40rpx;
		display: flex;
		align-items: center;
		justify-content: space-between;
		background-color: #fff;
	}

	.picker-arrow {
		color: #999;
		font-size: 24rpx;
	}

	.form-hint {
		display: block;
		font-size: 24rpx;
		color: #999;
		margin-top: 8rpx;
		line-height: 1.4;
	}

	.input {
		width: 100%;
		height: 80rpx;
		padding: 20rpx;
		border: 2rpx solid #e0e0e0;
		border-radius: 8rpx;
		font-size: 28rpx;
		box-sizing: border-box;
		line-height: 1.4;
		text-align: left;
	}

	.input::placeholder {
		color: #999;
		text-align: left;
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
		line-height: 1.4;
	}

	.textarea::placeholder {
		color: #999;
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

	.members-preview {
		margin-top: 16rpx;
	}

	.member-list-preview {
		display: flex;
		flex-wrap: wrap;
		gap: 12rpx;
		margin-bottom: 16rpx;
		max-height: 80rpx; /* 限制为两行 */
		overflow: hidden;
	}

	.member-item {
		font-size: 24rpx;
		color: #666;
		background-color: #f5f5f5;
		padding: 6rpx 12rpx;
		border-radius: 12rpx;
	}

	.member-item.leader {
		background-color: #fff3cd;
		color: #856404;
		font-weight: 500;
	}

	.member-more {
		font-size: 24rpx;
		color: #999;
		padding: 6rpx 12rpx;
	}

	.view-all-members {
		font-size: 26rpx;
		color: #007aff;
		text-decoration: underline;
	}

	.action-buttons {
		display: flex;
		justify-content: space-between;
		gap: 20rpx;
		margin-bottom: 20rpx;
	}

	.action-btn {
		flex: 1;
		height: 80rpx;
		background-color: #f8f9fa;
		border: 2rpx solid #e9ecef;
		border-radius: 12rpx;
		font-size: 28rpx;
		color: #495057;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.action-btn:active {
		background-color: #e9ecef;
	}

	.exit-btn {
		width: 100%;
		margin-top: 10rpx;
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
		display: flex;
		align-items: center;
		justify-content: center;
		border: none;
	}

	.role-tip {
		flex: 1;
		text-align: center;
		color: #999;
		font-size: 24rpx;
		line-height: 80rpx;
	}
	
	.btn-danger {
		background: #ff3b30;
		color: #ffffff;
	}
</style>
