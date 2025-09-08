<template>
	<view class="dinner-party-create">
		<form @submit="submitForm">
			<!-- 基本信息 -->
			<view class="form-section">
				<text class="section-title">🍽️ 聚餐信息</text>

				<view class="form-item">
					<text class="form-label">聚餐标题 *</text>
					<input class="form-input" v-model="form.title" placeholder="例：周末团队聚餐" maxlength="100" />
				</view>

				<view class="form-item">
					<text class="form-label">聚餐描述</text>
					<textarea class="form-textarea" v-model="form.description" placeholder="请描述聚餐目的、安排等" maxlength="500"></textarea>
				</view>

				<view class="form-item">
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
				<text class="section-title">📅 时间地点</text>

				<view class="form-item">
					<text class="form-label">聚餐时间 *</text>
					<picker mode="date" :value="startDate" @change="onStartDateChange">
						<view class="datetime-picker">
							<text class="datetime-text" :class="{ placeholder: !startDate }">
								{{ startDate ? startDate : '请选择日期' }}
							</text>
							<text class="picker-arrow">></text>
						</view>
					</picker>
				</view>

				<view class="form-item" v-if="startDate">
					<text class="form-label">开始时间 *</text>
					<picker mode="time" :value="startTime" @change="onStartTimeChange">
						<view class="datetime-picker">
							<text class="datetime-text" :class="{ placeholder: !startTime }">
								{{ startTime ? startTime : '请选择时间' }}
							</text>
							<text class="picker-arrow">></text>
						</view>
					</picker>
				</view>

				<view class="form-item">
					<text class="form-label">聚餐地点 *</text>
					<input class="form-input" v-model="form.location" placeholder="请输入聚餐地点" />
				</view>
			</view>

			<!-- 人数设置 -->
			<view class="form-section">
				<text class="section-title">👥 人数设置</text>

				<view class="form-item">
					<text class="form-label">最少参与人数 *</text>
					<view class="number-input">
						<input class="form-input" v-model.number="form.min_participants" placeholder="5" type="number" />
						<text class="input-unit">人</text>
					</view>
					<text class="form-help">低于此人数活动自动取消</text>
				</view>

				<view class="form-item">
					<text class="form-label">最多参与人数 *</text>
					<view class="number-input">
						<input class="form-input" v-model.number="form.max_participants" placeholder="10" type="number" />
						<text class="input-unit">人</text>
					</view>
					<text class="form-help">超过此人数的报名无效</text>
				</view>

				<view class="form-item">
					<text class="form-label">自动取消条件</text>
					<view class="radio-group">
						<view class="radio-item" 
							v-for="option in cancelOptions" 
							:key="option.value"
							:class="{ active: form.auto_cancel_threshold === option.value }"
							@tap="selectCancelOption(option.value)">
							<text class="radio-icon">{{ form.auto_cancel_threshold === option.value ? '●' : '○' }}</text>
							<text class="radio-label">{{ option.label }}</text>
						</view>
					</view>
				</view>
			</view>

			<!-- 费用设置 -->
			<view class="form-section">
				<text class="section-title">💰 费用设置</text>

				<view class="form-item">
					<text class="form-label">公司预算 *</text>
					<view class="number-input">
						<text class="input-prefix">¥</text>
						<input class="form-input" v-model.number="form.company_budget" placeholder="1000" type="digit" />
					</view>
					<text class="form-help">公司承担的最高费用</text>
				</view>

				<view class="form-item">
					<text class="form-label">预计总费用</text>
					<view class="number-input">
						<text class="input-prefix">¥</text>
						<input class="form-input" v-model.number="form.total_cost" placeholder="1200" type="digit" />
					</view>
					<text class="form-help">超出预算部分由参与人员AA分摊</text>
				</view>

				<view class="form-item">
					<text class="form-label">费用说明</text>
					<textarea class="form-textarea" v-model="form.cost_description" placeholder="请说明费用包含的项目、计算方式等" maxlength="500"></textarea>
				</view>

				<!-- 费用预览 -->
				<view class="cost-preview" v-if="form.company_budget && form.min_participants">
					<text class="preview-title">费用分摊预览：</text>
					<view class="preview-item">
						<text class="preview-label">公司预算：</text>
						<text class="preview-value">¥{{ form.company_budget }}</text>
					</view>
					<view class="preview-item">
						<text class="preview-label">预计总费用：</text>
						<text class="preview-value">¥{{ form.total_cost || 0 }}</text>
					</view>
					<view class="preview-item" v-if="form.total_cost > form.company_budget">
						<text class="preview-label">超出部分：</text>
						<text class="preview-value warning">¥{{ (form.total_cost - form.company_budget).toFixed(2) }}</text>
					</view>
					<view class="preview-item" v-if="form.total_cost > form.company_budget && form.min_participants">
						<text class="preview-label">每人AA：</text>
						<text class="preview-value highlight">¥{{ ((form.total_cost - form.company_budget) / form.min_participants).toFixed(2) }}</text>
					</view>
				</view>
			</view>

			<!-- 提交按钮 -->
			<view class="submit-section">
				<button class="btn btn-outline" @tap="saveDraft">保存草稿</button>
				<button class="btn btn-primary" @tap="publishDinnerParty" :disabled="submitting">
					{{ submitting ? '发布中...' : '发布聚餐活动' }}
				</button>
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
	import { groupApi } from '../../api/index.js'
	import { showError, showSuccess, formatDate } from '../../utils/index.js'

	export default {
		data() {
			return {
				form: {
					title: '',
					description: '',
					team_id: '',
					start_time: '',
					end_time: '',
					location: '',
					min_participants: 5,
					max_participants: 10,
					company_budget: 1000,
					total_cost: 1200,
					cost_description: '',
					auto_cancel_threshold: 'both'
				},
				myTeams: [],
				selectedTeam: null,
				showTeamModal: false,
				submitting: false,

				// 日期时间选择器相关数据
				startDate: '',
				startTime: '',

				// 自动取消选项
				cancelOptions: [
					{ value: 'min_participants', label: '仅检查最低人数' },
					{ value: 'max_participants', label: '仅检查最高人数' },
					{ value: 'both', label: '两者都检查' }
				]
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
					const response = await groupApi.getMyTeams()
					if (response.success) {
						this.myTeams = response.data
						// 如果只有一个团队，自动选择
						if (this.myTeams.length === 1) {
							this.selectTeam(this.myTeams[0])
						}
					}
				} catch (error) {
					console.error('加载团队列表失败:', error)
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
				// 设置默认为下个周末
				const nextSaturday = new Date(now)
				const daysUntilSaturday = (6 - now.getDay() + 7) % 7
				nextSaturday.setDate(now.getDate() + (daysUntilSaturday === 0 ? 7 : daysUntilSaturday))
				
				this.startDate = this.formatDate(nextSaturday)
				this.startTime = '18:00'
				
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

			// 更新表单中的日期时间数据
			updateFormDateTime() {
				if (this.startDate && this.startTime) {
					this.form.start_time = `${this.startDate} ${this.startTime}:00`
					// 默认聚餐时长3小时
					const startDateTime = new Date(this.form.start_time)
					const endDateTime = new Date(startDateTime.getTime() + 3 * 60 * 60 * 1000)
					this.form.end_time = this.formatDateTime(endDateTime)
				}
			},

			// 选择自动取消条件
			selectCancelOption(value) {
				this.form.auto_cancel_threshold = value
			},

			// 格式化日期
			formatDate(date) {
				const year = date.getFullYear()
				const month = String(date.getMonth() + 1).padStart(2, '0')
				const day = String(date.getDate()).padStart(2, '0')
				return `${year}-${month}-${day}`
			},

			// 格式化日期时间
			formatDateTime(date) {
				const year = date.getFullYear()
				const month = String(date.getMonth() + 1).padStart(2, '0')
				const day = String(date.getDate()).padStart(2, '0')
				const hour = String(date.getHours()).padStart(2, '0')
				const minute = String(date.getMinutes()).padStart(2, '0')
				return `${year}-${month}-${day} ${hour}:${minute}:00`
			},

			// 验证表单
			validateForm() {
				if (!this.form.title.trim()) {
					showError('请输入聚餐标题')
					return false
				}
				if (!this.form.team_id) {
					showError('请选择团队')
					return false
				}
				if (!this.form.start_time) {
					showError('请选择聚餐时间')
					return false
				}
				if (!this.form.location.trim()) {
					showError('请输入聚餐地点')
					return false
				}
				if (!this.form.min_participants || this.form.min_participants < 1) {
					showError('最少参与人数至少为1人')
					return false
				}
				if (!this.form.max_participants || this.form.max_participants < this.form.min_participants) {
					showError('最多参与人数不能少于最少参与人数')
					return false
				}
				if (!this.form.company_budget || this.form.company_budget < 0) {
					showError('请输入有效的公司预算')
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
					const response = await this.createDinnerParty(formData)
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

			// 发布聚餐活动
			async publishDinnerParty() {
				if (!this.validateForm()) return

				this.submitting = true
				try {
					const formData = { ...this.form, status: 'published' }
					const response = await this.createDinnerParty(formData)
					if (response.success) {
						showSuccess('聚餐活动发布成功！')
						uni.navigateBack()
					}
				} catch (error) {
					console.error('发布聚餐活动失败:', error)
					showError('发布失败: ' + (error.message || '未知错误'))
				} finally {
					this.submitting = false
				}
			},

			// 创建聚餐活动API调用
			async createDinnerParty(formData) {
				// 这里调用聚餐活动专用API
				const config = require('../../config/env.js')
				const baseUrl = config.API_BASE_URL
				
				const token = uni.getStorageSync('token')
				if (!token) {
					throw new Error('请先登录')
				}

				const response = await uni.request({
					url: `${baseUrl}/activities/dinner-party`,
					method: 'POST',
					header: {
						'Authorization': `Bearer ${token}`,
						'Content-Type': 'application/json'
					},
					data: formData
				})

				if (response.statusCode === 201) {
					return response.data
				} else {
					throw new Error(response.data.message || '创建失败')
				}
			}
		}
	}
</script>

<style scoped>
	.dinner-party-create {
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
		font-weight: 500;
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

	.form-help {
		font-size: 24rpx;
		color: #666;
		margin-top: 12rpx;
		display: block;
		line-height: 1.4;
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

	.radio-group {
		display: flex;
		flex-direction: column;
		gap: 16rpx;
	}

	.radio-item {
		display: flex;
		align-items: center;
		padding: 20rpx;
		border: 2rpx solid #e9ecef;
		border-radius: 12rpx;
		transition: all 0.3s;
	}

	.radio-item.active {
		border-color: #007aff;
		background-color: #f0f8ff;
	}

	.radio-item:active {
		background-color: #f8f9fa;
	}

	.radio-icon {
		font-size: 32rpx;
		margin-right: 16rpx;
		color: #007aff;
	}

	.radio-label {
		font-size: 28rpx;
		color: #333;
		flex: 1;
	}

	.cost-preview {
		background-color: #f8f9fa;
		border-radius: 12rpx;
		padding: 30rpx;
		margin-top: 30rpx;
	}

	.preview-title {
		font-size: 28rpx;
		font-weight: bold;
		color: #333;
		display: block;
		margin-bottom: 20rpx;
	}

	.preview-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 12rpx;
	}

	.preview-item:last-child {
		margin-bottom: 0;
	}

	.preview-label {
		font-size: 26rpx;
		color: #666;
	}

	.preview-value {
		font-size: 26rpx;
		color: #333;
		font-weight: 500;
	}

	.preview-value.warning {
		color: #ff9500;
	}

	.preview-value.highlight {
		color: #ff3b30;
		font-weight: bold;
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

	.btn:disabled {
		opacity: 0.6;
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