<template>
	<view class="activity-detail">
		<view v-if="loading" class="loading-state">
			<text>加载中...</text>
		</view>

		<view v-else-if="activity" class="detail-content">
			<!-- 活动封面 -->
			<view class="activity-cover">
				<image 
					:src="activity.cover_image || '/static/images/default-activity.png'" 
					class="cover-image"
					mode="aspectFill">
				</image>
				<view class="cover-overlay">
					<view class="activity-type">
						{{ getTypeInfo(activity.activity_type).icon }} {{ getTypeInfo(activity.activity_type).name }}
					</view>
					<view class="activity-status" :style="{ backgroundColor: getStatusInfo(activity.status).color }">
						{{ getStatusInfo(activity.status).name }}
					</view>
				</view>
			</view>

			<!-- 活动基本信息 -->
			<view class="activity-info">
				<view class="info-header">
					<text class="activity-title">{{ activity.title }}</text>
					<view class="visibility-info" v-if="activity.visibility === 'team'">
						<text class="visibility-badge">👥 {{ activity.team_name }}</text>
					</view>
				</view>

				<text class="activity-description">{{ activity.description || '暂无描述' }}</text>

				<!-- 活动详情 -->
				<view class="detail-section">
					<view class="detail-item">
						<text class="detail-icon">📅</text>
						<view class="detail-content">
							<text class="detail-label">活动时间</text>
							<text class="detail-value">{{ formatActivityTime(activity.start_time, activity.end_time) }}</text>
						</view>
					</view>

					<view class="detail-item" v-if="activity.location">
						<text class="detail-icon">📍</text>
						<view class="detail-content">
							<text class="detail-label">活动地点</text>
							<text class="detail-value">{{ activity.location }}</text>
						</view>
					</view>

					<view class="detail-item">
						<text class="detail-icon">👥</text>
						<view class="detail-content">
							<text class="detail-label">参与人数</text>
							<text class="detail-value">
								{{ activity.registration_count }}{{ activity.max_participants > 0 ? `/${activity.max_participants}` : '' }}人
							</text>
						</view>
					</view>

					<view class="detail-item" v-if="activity.registration_deadline">
						<text class="detail-icon">⏰</text>
						<view class="detail-content">
							<text class="detail-label">报名截止</text>
							<text class="detail-value">{{ formatDate(activity.registration_deadline) }}</text>
						</view>
					</view>

					<view class="detail-item" v-if="!activity.is_free">
						<text class="detail-icon">💰</text>
						<view class="detail-content">
							<text class="detail-label">活动费用</text>
							<text class="detail-value">¥{{ activity.base_fee }}</text>
						</view>
					</view>

					<view class="detail-item">
						<text class="detail-icon">👤</text>
						<view class="detail-content">
							<text class="detail-label">组织者</text>
							<text class="detail-value">{{ activity.creator_name }}</text>
						</view>
					</view>
				</view>

				<!-- 报名进度 -->
				<view class="progress-section" v-if="activity.max_participants > 0">
					<view class="progress-header">
						<text class="progress-label">报名进度</text>
						<text class="progress-text">{{ getProgressPercentage(activity) }}%</text>
					</view>
					<view class="progress-bar">
						<view class="progress-fill" :style="{ width: getProgressPercentage(activity) + '%' }"></view>
					</view>
				</view>

				<!-- 用户报名状态 -->
				<view class="registration-info" v-if="activity.user_registered">
					<view class="status-card" :style="{ borderColor: getRegistrationStatusInfo(activity.user_registration_status).color }">
						<text class="status-title">您的报名状态</text>
						<view class="status-badge" :style="{ backgroundColor: getRegistrationStatusInfo(activity.user_registration_status).color }">
							{{ getRegistrationStatusInfo(activity.user_registration_status).name }}
						</view>
						<text class="status-desc">{{ getRegistrationStatusInfo(activity.user_registration_status).description }}</text>
					</view>
				</view>
			</view>

			<!-- 活动图片 -->
			<view class="images-section" v-if="activity.images && activity.images.length > 0">
				<text class="section-title">活动图片</text>
				<scroll-view class="images-scroll" scroll-x="true" show-scrollbar="false">
					<view class="image-item" v-for="(image, index) in activity.images" :key="index" @tap="previewImage(image, activity.images)">
						<image :src="image" class="activity-image" mode="aspectFill"></image>
					</view>
				</scroll-view>
			</view>
		</view>

		<!-- 底部操作栏 -->
		<view class="action-bar" v-if="activity">
			<view class="action-buttons">
				<!-- 报名按钮 -->
				<button 
					v-if="!activity.user_registered && canRegisterResult.canRegister"
					class="btn btn-primary"
					@tap="showRegistrationModal">
					立即报名
				</button>

				<!-- 取消报名按钮 -->
				<button 
					v-else-if="activity.user_registered && activity.user_registration_status !== 'cancelled'"
					class="btn btn-outline"
					@tap="cancelRegistration">
					取消报名
				</button>

				<!-- 不可报名提示 -->
				<view v-else-if="!canRegisterResult.canRegister" class="disabled-info">
					<text class="disabled-text">{{ canRegisterResult.reason }}</text>
				</view>

				<!-- 管理按钮 -->
				<button 
					v-if="activity.user_can_manage"
					class="btn btn-secondary"
					@tap="manageActivity">
					管理活动
				</button>
			</view>
		</view>

		<!-- 报名弹窗 -->
		<view class="modal-overlay" v-if="showModal" @tap="hideModal">
			<view class="modal-content" @tap.stop>
				<view class="modal-header">
					<text class="modal-title">报名活动</text>
					<text class="modal-close" @tap="hideModal">×</text>
				</view>

				<view class="modal-body">
					<view class="form-item">
						<text class="form-label">真实姓名 *</text>
						<input class="form-input" v-model="registrationForm.real_name" placeholder="请输入真实姓名" />
					</view>

					<view class="form-item">
						<text class="form-label">联系电话 *</text>
						<input class="form-input" v-model="registrationForm.phone" placeholder="请输入联系电话" type="number" />
					</view>

					<view class="form-item">
						<text class="form-label">备注信息</text>
						<textarea class="form-textarea" v-model="registrationForm.notes" placeholder="请输入备注信息（可选）"></textarea>
					</view>
				</view>

				<view class="modal-footer">
					<button class="btn btn-outline" @tap="hideModal">取消</button>
					<button class="btn btn-primary" @tap="submitRegistration" :disabled="submitting">
						{{ submitting ? '提交中...' : '确认报名' }}
					</button>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
	import { activityApi, activityUtils } from '../../api/activity.js'
	import { showError, showSuccess, showConfirm, formatDate } from '../../utils/index.js'

	export default {
		data() {
			return {
				activityId: null,
				activity: null,
				loading: false,
				showModal: false,
				submitting: false,
				registrationForm: {
					real_name: '',
					phone: '',
					notes: ''
				}
			}
		},

		computed: {
			canRegisterResult() {
				if (!this.activity) return { canRegister: false, reason: '活动不存在' }
				return activityUtils.canRegister(this.activity)
			}
		},

		onLoad(options) {
			if (options.id) {
				this.activityId = parseInt(options.id)
				this.loadActivityDetail()
			}
		},

		methods: {
			// 加载活动详情
			async loadActivityDetail() {
				this.loading = true
				try {
					const response = await activityApi.getDetail(this.activityId)
					if (response.success) {
						this.activity = response.data
						// 设置页面标题
						uni.setNavigationBarTitle({
							title: this.activity.title || '活动详情'
						})
					}
				} catch (error) {
					console.error('加载活动详情失败:', error)
					showError('加载活动详情失败')
				} finally {
					this.loading = false
				}
			},

			// 显示报名弹窗
			showRegistrationModal() {
				// 预填用户信息
				const userInfo = uni.getStorageSync('userInfo')
				if (userInfo) {
					this.registrationForm.real_name = userInfo.nickname || ''
				}
				this.showModal = true
			},

			// 隐藏报名弹窗
			hideModal() {
				this.showModal = false
				this.registrationForm = {
					real_name: '',
					phone: '',
					notes: ''
				}
			},

			// 提交报名
			async submitRegistration() {
				// 验证表单
				if (!this.registrationForm.real_name.trim()) {
					showError('请输入真实姓名')
					return
				}
				if (!this.registrationForm.phone.trim()) {
					showError('请输入联系电话')
					return
				}

				this.submitting = true
				try {
					const response = await activityApi.register(this.activityId, this.registrationForm)
					if (response.success) {
						showSuccess(response.message || '报名成功')
						this.hideModal()
						this.loadActivityDetail() // 刷新活动详情
					}
				} catch (error) {
					console.error('报名失败:', error)
					showError(error.response?.data?.message || '报名失败')
				} finally {
					this.submitting = false
				}
			},

			// 取消报名
			async cancelRegistration() {
				const confirmed = await showConfirm('确定要取消报名吗？')
				if (!confirmed) return

				try {
					const response = await activityApi.cancelRegistration(this.activityId)
					if (response.success) {
						showSuccess('取消报名成功')
						this.loadActivityDetail() // 刷新活动详情
					}
				} catch (error) {
					console.error('取消报名失败:', error)
					showError('取消报名失败')
				}
			},

			// 管理活动
			manageActivity() {
				uni.navigateTo({
					url: `/pages/activity-manage/activity-manage?id=${this.activityId}`
				})
			},

			// 预览图片
			previewImage(current, urls) {
				uni.previewImage({
					current,
					urls
				})
			},

			// 获取类型信息
			getTypeInfo(type) {
				return activityUtils.getTypeInfo(type)
			},

			// 获取状态信息
			getStatusInfo(status) {
				return activityUtils.getStatusInfo(status)
			},

			// 获取报名状态信息
			getRegistrationStatusInfo(status) {
				return activityUtils.getRegistrationStatusInfo(status)
			},

			// 格式化活动时间
			formatActivityTime(startTime, endTime) {
				return activityUtils.formatActivityTime(startTime, endTime)
			},

			// 格式化日期
			formatDate(date) {
				return formatDate(date, 'YYYY年MM月DD日 HH:mm')
			},

			// 获取进度百分比
			getProgressPercentage(activity) {
				return activityUtils.getProgressPercentage(activity)
			}
		}
	}
</script>

<style scoped>
	.activity-detail {
		background-color: #f5f5f5;
		min-height: 100vh;
		padding-bottom: 120rpx;
	}

	.loading-state {
		text-align: center;
		padding: 100rpx 40rpx;
		font-size: 28rpx;
		color: #666;
	}

	.activity-cover {
		position: relative;
		height: 400rpx;
	}

	.cover-image {
		width: 100%;
		height: 100%;
	}

	.cover-overlay {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: linear-gradient(to bottom, rgba(0,0,0,0.3), transparent);
		padding: 30rpx;
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
	}

	.activity-type {
		background-color: rgba(0, 0, 0, 0.6);
		color: white;
		padding: 12rpx 20rpx;
		border-radius: 25rpx;
		font-size: 26rpx;
	}

	.activity-status {
		color: white;
		padding: 12rpx 20rpx;
		border-radius: 25rpx;
		font-size: 26rpx;
	}

	.activity-info {
		background-color: white;
		margin: 20rpx;
		border-radius: 16rpx;
		padding: 40rpx;
	}

	.info-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 20rpx;
	}

	.activity-title {
		font-size: 36rpx;
		font-weight: bold;
		color: #333;
		flex: 1;
		margin-right: 20rpx;
		line-height: 1.4;
		word-wrap: break-word;
		word-break: break-all;
	}

	.visibility-badge {
		background-color: #e3f2fd;
		color: #1976d2;
		padding: 8rpx 16rpx;
		border-radius: 16rpx;
		font-size: 24rpx;
	}

	.activity-description {
		font-size: 30rpx;
		color: #666;
		line-height: 1.6;
		margin-bottom: 40rpx;
		word-wrap: break-word;
		word-break: break-all;
	}

	.detail-section {
		border-top: 1rpx solid #f0f0f0;
		padding-top: 30rpx;
	}

	.detail-item {
		display: flex;
		align-items: flex-start;
		margin-bottom: 30rpx;
	}

	.detail-icon {
		font-size: 32rpx;
		margin-right: 20rpx;
		width: 40rpx;
		margin-top: 4rpx;
	}

	.detail-content {
		flex: 1;
	}

	.detail-label {
		font-size: 26rpx;
		color: #999;
		display: block;
		margin-bottom: 8rpx;
	}

	.detail-value {
		font-size: 30rpx;
		color: #333;
		display: block;
		line-height: 1.4;
		word-wrap: break-word;
		word-break: break-all;
	}

	.progress-section {
		margin-top: 40rpx;
		padding-top: 30rpx;
		border-top: 1rpx solid #f0f0f0;
	}

	.progress-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 16rpx;
	}

	.progress-label {
		font-size: 28rpx;
		color: #333;
	}

	.progress-text {
		font-size: 26rpx;
		color: #007aff;
		font-weight: bold;
	}

	.progress-bar {
		height: 12rpx;
		background-color: #f0f0f0;
		border-radius: 6rpx;
		overflow: hidden;
	}

	.progress-fill {
		height: 100%;
		background-color: #007aff;
		transition: width 0.3s;
	}

	.registration-info {
		margin-top: 40rpx;
	}

	.status-card {
		border: 2rpx solid;
		border-radius: 16rpx;
		padding: 30rpx;
		text-align: center;
	}

	.status-title {
		font-size: 28rpx;
		color: #666;
		display: block;
		margin-bottom: 16rpx;
	}

	.status-badge {
		display: inline-block;
		color: white;
		padding: 8rpx 20rpx;
		border-radius: 20rpx;
		font-size: 26rpx;
		margin-bottom: 16rpx;
	}

	.status-desc {
		font-size: 24rpx;
		color: #999;
		display: block;
	}

	.images-section {
		background-color: white;
		margin: 20rpx;
		border-radius: 16rpx;
		padding: 40rpx;
	}

	.section-title {
		font-size: 32rpx;
		font-weight: bold;
		color: #333;
		display: block;
		margin-bottom: 30rpx;
	}

	.images-scroll {
		white-space: nowrap;
	}

	.image-item {
		display: inline-block;
		margin-right: 20rpx;
		border-radius: 12rpx;
		overflow: hidden;
	}

	.activity-image {
		width: 200rpx;
		height: 200rpx;
	}

	.action-bar {
		position: fixed;
		bottom: 0;
		left: 0;
		right: 0;
		background-color: white;
		padding: 30rpx;
		border-top: 1rpx solid #f0f0f0;
		z-index: 100;
	}

	.action-buttons {
		display: flex;
		gap: 20rpx;
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

	.btn-secondary {
		background-color: #f8f9fa;
		color: #333;
		border: 2rpx solid #e9ecef;
	}

	.disabled-info {
		flex: 1;
		text-align: center;
		padding: 30rpx;
	}

	.disabled-text {
		font-size: 28rpx;
		color: #999;
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
	}

	.form-item {
		margin-bottom: 40rpx;
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
	}

	.form-textarea {
		height: 120rpx;
		resize: none;
	}

	.modal-footer {
		display: flex;
		gap: 20rpx;
		padding: 40rpx;
		border-top: 1rpx solid #f0f0f0;
	}
</style>
