<template>
	<view class="create-activity">
		<form @submit="submitForm">
			<!-- 基本信息 -->
			<view class="form-section">
				<text class="section-title">基本信息</text>

				<view class="form-item">
					<text class="form-label">活动标题 *</text>
					<input class="form-input" v-model="form.title" placeholder="输入活动名称..." maxlength="100" />
				</view>

				<view class="form-item">
					<text class="form-label">活动描述</text>
					<textarea class="form-textarea" v-model="form.description" placeholder="请描述活动内容、目的等" maxlength="500"></textarea>
				</view>

				<view class="form-item">
					<text class="form-label">活动类型 *</text>
					<view class="type-selector">
						<view class="type-item" 
							v-for="(typeInfo, type) in activityTypes" 
							:key="type"
							:class="{ active: form.activity_type === type }"
							@tap="selectType(type)">
							<text class="type-icon">{{ typeInfo.icon }}</text>
							<text class="type-name">{{ typeInfo.name }}</text>
						</view>
					</view>
				</view>

				<view class="form-item">
					<text class="form-label">活动可见性 *</text>
					<view class="visibility-selector">
						<view class="visibility-item" 
							:class="{ active: form.visibility === 'public' }"
							@tap="selectVisibility('public')">
							<text class="visibility-icon">🌍</text>
							<view class="visibility-info">
								<text class="visibility-name">公开活动</text>
								<text class="visibility-desc">所有用户可见和报名</text>
							</view>
						</view>
						<view class="visibility-item" 
							:class="{ active: form.visibility === 'team' }"
							@tap="selectVisibility('team')">
							<text class="visibility-icon">👥</text>
							<view class="visibility-info">
								<text class="visibility-name">团队活动</text>
								<text class="visibility-desc">仅团队成员可见和报名</text>
							</view>
						</view>
					</view>
				</view>

				<view class="form-item" v-if="form.visibility === 'team'">
					<text class="form-label">选择团队 *</text>
					<view class="team-selector" @tap="showTeamPicker">
						<text class="selector-text" :class="{ placeholder: !selectedTeam }">
							{{ selectedTeam ? selectedTeam.name : '请选择团队' }}
						</text>
						<text class="selector-arrow">></text>
					</view>
				</view>
			</view>

			<!-- 时间地点 -->
			<view class="form-section">
				<text class="section-title">时间地点</text>

				<view class="form-item">
					<text class="form-label">开始时间 *</text>
					<picker mode="date" :value="startDate" @change="onStartDateChange">
						<view class="datetime-picker">
							<text class="datetime-text" :class="{ placeholder: !startDate }">
								{{ startDate ? startDate : '请选择开始日期' }}
							</text>
							<text class="picker-arrow">></text>
						</view>
					</picker>
				</view>

				<view class="form-item" v-if="startDate">
					<text class="form-label">开始时间</text>
					<picker mode="time" :value="startTime" @change="onStartTimeChange">
						<view class="datetime-picker">
							<text class="datetime-text" :class="{ placeholder: !startTime }">
								{{ startTime ? startTime : '请选择开始时间' }}
							</text>
							<text class="picker-arrow">></text>
						</view>
					</picker>
				</view>

				<view class="form-item">
					<text class="form-label">结束时间 *</text>
					<picker mode="date" :value="endDate" @change="onEndDateChange">
						<view class="datetime-picker">
							<text class="datetime-text" :class="{ placeholder: !endDate }">
								{{ endDate ? endDate : '请选择结束日期' }}
							</text>
							<text class="picker-arrow">></text>
						</view>
					</picker>
				</view>

				<view class="form-item" v-if="endDate">
					<text class="form-label">结束时间</text>
					<picker mode="time" :value="endTime" @change="onEndTimeChange">
						<view class="datetime-picker">
							<text class="datetime-text" :class="{ placeholder: !endTime }">
								{{ endTime ? endTime : '请选择结束时间' }}
							</text>
							<text class="picker-arrow">></text>
						</view>
					</picker>
				</view>

				<view class="form-item">
					<text class="form-label">活动地点</text>
					<input class="form-input" v-model="form.location" placeholder="请输入活动地点" />
				</view>
			</view>

			<!-- 报名设置 -->
			<view class="form-section">
				<text class="section-title">报名设置</text>

				<view class="form-item">
					<text class="form-label">人数限制</text>
					<view class="number-input">
						<input class="form-input" v-model.number="form.max_participants" placeholder="0表示无限制" type="number" />
						<text class="input-unit">人</text>
					</view>
				</view>

				<view class="form-item">
					<text class="form-label">报名截止日期</text>
					<picker mode="date" :value="deadlineDate" @change="onDeadlineDateChange">
						<view class="datetime-picker">
							<text class="datetime-text" :class="{ placeholder: !deadlineDate }">
								{{ deadlineDate ? deadlineDate : '请选择截止日期（可选）' }}
							</text>
							<text class="picker-arrow">></text>
						</view>
					</picker>
				</view>

				<view class="form-item" v-if="deadlineDate">
					<text class="form-label">报名截止时间</text>
					<picker mode="time" :value="deadlineTime" @change="onDeadlineTimeChange">
						<view class="datetime-picker">
							<text class="datetime-text" :class="{ placeholder: !deadlineTime }">
								{{ deadlineTime ? deadlineTime : '请选择截止时间' }}
							</text>
							<text class="picker-arrow">></text>
						</view>
					</picker>
				</view>

				<view class="form-item">
					<view class="switch-item">
						<text class="switch-label">需要审核</text>
						<switch :checked="form.require_approval" @change="toggleApproval" />
					</view>
					<text class="switch-desc">开启后，用户报名需要您的审核通过</text>
				</view>
			</view>

			<!-- 费用设置 -->
			<view class="form-section">
				<text class="section-title">费用设置</text>

				<view class="form-item">
					<view class="switch-item">
						<text class="switch-label">免费活动</text>
						<switch :checked="form.is_free" @change="toggleFree" />
					</view>
				</view>

				<view class="form-item" v-if="!form.is_free">
					<text class="form-label">基础费用</text>
					<view class="number-input">
						<text class="input-prefix">¥</text>
						<input class="form-input" v-model.number="form.base_fee" placeholder="0.00" type="digit" />
					</view>
				</view>
			</view>

			<!-- 提交按钮 -->
			<view class="submit-section">
				<button class="btn btn-outline" @tap="saveDraft">保存草稿</button>
				<button class="btn btn-primary" @tap="publishActivity">发布活动</button>
			</view>
		</form>

		<!-- 团队选择弹窗 -->
		<view class="modal-overlay" v-if="showTeamModal" @tap="hideTeamModal">
			<view class="modal-content" @tap.stop>
				<view class="modal-header">
					<text class="modal-title">选择团队</text>
					<text class="modal-close" @tap="hideTeamModal">×</text>
				</view>
				<view class="modal-body">
					<view class="team-list">
						<view class="team-item" 
							v-for="team in myTeams" 
							:key="team.id"
							@tap="selectTeam(team)">
							<text class="team-name">{{ team.name }}</text>
							<text class="team-role">{{ team.role === 'admin' ? '负责人' : '成员' }}</text>
						</view>
					</view>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
	import { activityApi, activityTypes } from '../../api/activity.js'
	import { groupApi } from '../../api/index.js'
	import { showError, showSuccess, formatDate } from '../../utils/index.js'

	export default {
		data() {
			return {
				form: {
					title: '',
					description: '',
					activity_type: '',
					visibility: 'public',
					team_id: null,
					start_time: '',
					end_time: '',
					location: '',
					max_participants: 0,
					registration_deadline: '',
					require_approval: false,
					is_free: true,
					base_fee: 0
				},
				activityTypes,
				myTeams: [],
				selectedTeam: null,
				showTeamModal: false,
				submitting: false,

				// 日期时间选择器相关数据
				startDate: '',
				startTime: '',
				endDate: '',
				endTime: '',
				deadlineDate: '',
				deadlineTime: ''
			}
		},

		onLoad() {
			this.loadMyTeams()
			this.initDefaultDateTime()
		},

		methods: {
			// 加载我的团队列表
			async loadMyTeams() {
				try {
					// 临时解决方案：使用团队列表API，然后模拟用户所属团队
					const response = await groupApi.getList()
					if (response.success) {
						// 模拟用户属于所有团队的场景（临时解决方案）
						this.myTeams = response.data.teams.map(team => ({
							...team,
							role: 'admin', // 临时设置角色为admin
							joined_at: new Date().toISOString()
						}))
						console.log('加载到的团队列表:', this.myTeams)
					}
				} catch (error) {
					console.error('加载团队列表失败:', error)
				}
			},

			// 选择活动类型
			selectType(type) {
				this.form.activity_type = type
			},

			// 选择可见性
			selectVisibility(visibility) {
				this.form.visibility = visibility
				if (visibility === 'public') {
					this.form.team_id = null
					this.selectedTeam = null
				}
			},

			// 显示团队选择器
			showTeamPicker() {
				if (this.myTeams.length === 0) {
					showError('您还没有加入任何团队')
					return
				}
				this.showTeamModal = true
			},

			// 隐藏团队选择器
			hideTeamModal() {
				this.showTeamModal = false
			},

			// 选择团队
			selectTeam(team) {
				this.selectedTeam = team
				this.form.team_id = team.id
				this.hideTeamModal()
			},

			// 初始化默认日期时间
			initDefaultDateTime() {
				const now = new Date()
				const today = this.formatDate(now)
				const currentTime = this.formatTime(now)

				// 设置默认开始时间为当前时间
				this.startDate = today
				this.startTime = currentTime

				// 设置默认结束时间为2小时后
				const endDateTime = new Date(now.getTime() + 2 * 60 * 60 * 1000)
				this.endDate = this.formatDate(endDateTime)
				this.endTime = this.formatTime(endDateTime)

				// 更新表单数据
				this.updateFormDateTime()
			},

			// 开始日期选择变化
			onStartDateChange(e) {
				this.startDate = e.detail.value
				this.updateFormDateTime()
			},

			// 开始时间选择变化
			onStartTimeChange(e) {
				this.startTime = e.detail.value
				this.updateFormDateTime()
			},

			// 结束日期选择变化
			onEndDateChange(e) {
				this.endDate = e.detail.value
				this.updateFormDateTime()
			},

			// 结束时间选择变化
			onEndTimeChange(e) {
				this.endTime = e.detail.value
				this.updateFormDateTime()
			},

			// 截止日期选择变化
			onDeadlineDateChange(e) {
				this.deadlineDate = e.detail.value
				this.updateFormDateTime()
			},

			// 截止时间选择变化
			onDeadlineTimeChange(e) {
				this.deadlineTime = e.detail.value
				this.updateFormDateTime()
			},

			// 更新表单中的日期时间数据
			updateFormDateTime() {
				// 更新开始时间
				if (this.startDate && this.startTime) {
					this.form.start_time = `${this.startDate} ${this.startTime}:00`
				}

				// 更新结束时间
				if (this.endDate && this.endTime) {
					this.form.end_time = `${this.endDate} ${this.endTime}:00`
				}

				// 更新截止时间
				if (this.deadlineDate && this.deadlineTime) {
					this.form.registration_deadline = `${this.deadlineDate} ${this.deadlineTime}:00`
				} else if (this.deadlineDate) {
					this.form.registration_deadline = `${this.deadlineDate} 23:59:00`
				} else {
					this.form.registration_deadline = ''
				}
			},

			// 格式化日期
			formatDate(date) {
				const year = date.getFullYear()
				const month = String(date.getMonth() + 1).padStart(2, '0')
				const day = String(date.getDate()).padStart(2, '0')
				return `${year}-${month}-${day}`
			},

			// 格式化时间
			formatTime(date) {
				const hour = String(date.getHours()).padStart(2, '0')
				const minute = String(date.getMinutes()).padStart(2, '0')
				return `${hour}:${minute}`
			},

			// 切换审核开关
			toggleApproval(e) {
				this.form.require_approval = e.detail.value
			},

			// 切换免费开关
			toggleFree(e) {
				this.form.is_free = e.detail.value
				if (e.detail.value) {
					this.form.base_fee = 0
				}
			},

			// 验证表单
			validateForm() {
				if (!this.form.title.trim()) {
					showError('请输入活动标题')
					return false
				}
				if (!this.form.activity_type) {
					showError('请选择活动类型')
					return false
				}
				if (!this.form.start_time) {
					showError('请选择开始时间')
					return false
				}
				if (!this.form.end_time) {
					showError('请选择结束时间')
					return false
				}
				if (this.form.visibility === 'team' && !this.form.team_id) {
					showError('请选择团队')
					return false
				}
				return true
			},

			// 保存草稿
			async saveDraft() {
				if (!this.validateForm()) return

				this.submitting = true
				try {
					const formData = { ...this.form, status: 'draft' }
					const response = await activityApi.create(formData)
					if (response.success) {
						showSuccess('草稿保存成功')
						uni.navigateBack()
					}
				} catch (error) {
					console.error('保存草稿失败:', error)
					showError('保存草稿失败')
				} finally {
					this.submitting = false
				}
			},

			// 发布活动
			async publishActivity() {
				if (!this.validateForm()) return

				this.submitting = true
				try {
					const formData = { ...this.form, status: 'registration' }
					const response = await activityApi.create(formData)
					if (response.success) {
						showSuccess('活动发布成功')
						uni.navigateBack()
					}
				} catch (error) {
					console.error('发布活动失败:', error)
					showError('发布活动失败')
				} finally {
					this.submitting = false
				}
			},

			// 格式化日期时间
			formatDateTime(datetime) {
				return formatDate(datetime, 'YYYY年MM月DD日 HH:mm')
			}
		}
	}
</script>

<style scoped>
	.create-activity {
		background-color: #f5f5f5;
		min-height: 100vh;
		padding-bottom: 40rpx;
	}

	.form-section {
		background-color: white;
		margin: 20rpx;
		border-radius: 16rpx;
		padding: 40rpx;
		margin-bottom: 20rpx;
	}

	.section-title {
		font-size: 32rpx;
		font-weight: bold;
		color: #333;
		display: block;
		margin-bottom: 40rpx;
	}

	.form-item {
		margin-bottom: 40rpx;
	}

	.form-item:last-child {
		margin-bottom: 0;
	}

	.form-label {
		font-size: 28rpx;
		color: #333;
		display: block;
		margin-bottom: 16rpx;
	}

	.form-input,
	.form-textarea {
		width: 100%;
		padding: 20rpx;
		border: 2rpx solid #e9ecef;
		border-radius: 12rpx;
		font-size: 28rpx;
		color: #333;
		box-sizing: border-box;
		line-height: 1.4;
	}

	.form-input {
		height: 80rpx;
	}

	.form-input::placeholder,
	.form-textarea::placeholder {
		color: #999;
		font-size: 28rpx;
	}

	.form-textarea {
		height: 120rpx;
		resize: none;
	}

	.type-selector {
		display: flex;
		flex-wrap: wrap;
		gap: 20rpx;
	}

	.type-item {
		flex: 1;
		min-width: 200rpx;
		padding: 30rpx 20rpx;
		border: 2rpx solid #e9ecef;
		border-radius: 12rpx;
		text-align: center;
		transition: all 0.3s;
	}

	.type-item.active {
		border-color: #007aff;
		background-color: #f0f8ff;
	}

	.type-icon {
		font-size: 40rpx;
		display: block;
		margin-bottom: 12rpx;
	}

	.type-name {
		font-size: 26rpx;
		color: #333;
		display: block;
	}

	.visibility-selector {
		display: flex;
		flex-direction: column;
		gap: 20rpx;
	}

	.visibility-item {
		display: flex;
		align-items: center;
		padding: 30rpx;
		border: 2rpx solid #e9ecef;
		border-radius: 12rpx;
		transition: all 0.3s;
	}

	.visibility-item.active {
		border-color: #007aff;
		background-color: #f0f8ff;
	}

	.visibility-icon {
		font-size: 40rpx;
		margin-right: 20rpx;
	}

	.visibility-info {
		flex: 1;
	}

	.visibility-name {
		font-size: 28rpx;
		color: #333;
		font-weight: bold;
		display: block;
		margin-bottom: 8rpx;
		line-height: 1.3;
		word-wrap: break-word;
		word-break: break-all;
	}

	.visibility-desc {
		font-size: 24rpx;
		color: #666;
		display: block;
		line-height: 1.3;
		word-wrap: break-word;
		word-break: break-all;
	}

	.team-selector,
	.datetime-picker {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 20rpx;
		border: 2rpx solid #e9ecef;
		border-radius: 12rpx;
		background-color: white;
	}

	.selector-text,
	.datetime-text {
		font-size: 28rpx;
		color: #333;
		flex: 1;
	}

	.selector-text.placeholder,
	.datetime-text.placeholder {
		color: #999;
	}

	.selector-arrow,
	.picker-arrow {
		font-size: 24rpx;
		color: #999;
	}

	.number-input {
		display: flex;
		align-items: center;
		border: 2rpx solid #e9ecef;
		border-radius: 12rpx;
		overflow: hidden;
	}

	.input-prefix {
		padding: 20rpx;
		background-color: #f8f9fa;
		font-size: 28rpx;
		color: #666;
	}

	.input-unit {
		padding: 20rpx;
		background-color: #f8f9fa;
		font-size: 28rpx;
		color: #666;
	}

	.number-input .form-input {
		border: none;
		flex: 1;
	}

	.switch-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 16rpx;
	}

	.switch-label {
		font-size: 28rpx;
		color: #333;
	}

	.switch-desc {
		font-size: 24rpx;
		color: #666;
		line-height: 1.5;
	}

	.submit-section {
		display: flex;
		gap: 20rpx;
		padding: 0 20rpx;
	}

	.btn {
		flex: 1;
		height: 88rpx;
		border-radius: 44rpx;
		font-size: 32rpx;
		display: flex;
		align-items: center;
		justify-content: center;
		border: none;
	}

	.btn-primary {
		background-color: #007aff;
		color: white;
	}

	.btn-outline {
		background-color: transparent;
		color: #007aff;
		border: 2rpx solid #007aff;
	}

	/* 弹窗样式 */
	.modal-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background-color: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
	}

	.modal-content {
		background-color: white;
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
		padding: 40rpx;
		border-bottom: 1rpx solid #f0f0f0;
	}

	.modal-title {
		font-size: 32rpx;
		font-weight: bold;
		color: #333;
	}

	.modal-close {
		font-size: 48rpx;
		color: #999;
		width: 60rpx;
		height: 60rpx;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.modal-body {
		padding: 40rpx;
		max-height: 60vh;
		overflow-y: auto;
	}

	.team-list {
		display: flex;
		flex-direction: column;
		gap: 20rpx;
	}

	.team-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 30rpx;
		border: 2rpx solid #e9ecef;
		border-radius: 12rpx;
		transition: all 0.3s;
	}

	.team-item:active {
		background-color: #f8f9fa;
	}

	.team-name {
		font-size: 28rpx;
		color: #333;
		font-weight: bold;
	}

	.team-role {
		font-size: 24rpx;
		color: #666;
	}
</style>
