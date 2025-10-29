<template>
	<view class="bill-detail-container">
		<!-- 账单头部信息 -->
		<view class="bill-header">
			<view class="bill-icon">
				<text class="icon">💰</text>
			</view>
			<view class="bill-title">
				<text class="title">{{ billInfo.activityTitle || '活动账单' }}</text>
				<text class="subtitle">{{ billInfo.description }}</text>
			</view>
			<view class="bill-status">
				<text class="status" :class="getStatusClass(billInfo.paymentStatus)">
					{{ getStatusText(billInfo.paymentStatus) }}
				</text>
			</view>
		</view>

		<!-- 金额信息 -->
		<view class="amount-section">
			<view class="amount-display">
				<text class="currency">¥</text>
				<text class="amount">{{ billInfo.amount || '0.00' }}</text>
			</view>
			<view class="amount-info">
				<text class="label">分摊系数</text>
				<text class="value">{{ billInfo.costSharingRatio || '1.00' }}</text>
			</view>
		</view>

		<!-- 详细信息 -->
		<view class="detail-section">
			<view class="section-title">账单详情</view>
			<view class="detail-list">
				<view class="detail-item">
					<text class="label">活动名称</text>
					<text class="value">{{ billInfo.activityTitle || '-' }}</text>
				</view>
				<view class="detail-item">
					<text class="label">账单日期</text>
					<text class="value">{{ formatDate(billInfo.billDate) }}</text>
				</view>
				<view class="detail-item">
					<text class="label">支付截止</text>
					<text class="value" :class="{ 'overdue': isOverdue(billInfo.paymentDeadline) }">
						{{ formatDate(billInfo.paymentDeadline) || '未设置' }}
					</text>
				</view>
				<view class="detail-item">
					<text class="label">分摊系数</text>
					<text class="value">{{ billInfo.costSharingRatio || '1.00' }}</text>
				</view>
				<view class="detail-item" v-if="billInfo.paymentTime">
					<text class="label">支付时间</text>
					<text class="value">{{ formatDate(billInfo.paymentTime) }}</text>
				</view>
				<view class="detail-item" v-if="billInfo.paymentMethod">
					<text class="label">支付方式</text>
					<text class="value">{{ getPaymentMethodText(billInfo.paymentMethod) }}</text>
				</view>
			</view>
		</view>

		<!-- 备注信息 -->
		<view class="note-section" v-if="billInfo.note">
			<view class="section-title">备注信息</view>
			<view class="note-content">{{ billInfo.note }}</view>
		</view>

		<!-- 操作按钮 -->
		<view class="action-section">
			<button
				class="action-btn primary"
				v-if="showPayButton"
				@tap="markAsPaid"
			>
				标记为已支付
			</button>
			<button
				class="action-btn secondary"
				@tap="contactAdmin"
			>
				联系管理员
			</button>
			<button
				class="action-btn secondary"
				@tap="viewActivity"
				v-if="billInfo.activityId"
			>
				查看活动详情
			</button>
		</view>

		<!-- 加载状态 -->
		<view class="loading-overlay" v-if="loading">
			<view class="loading-spinner"></view>
			<text class="loading-text">加载中...</text>
		</view>

		<!-- 支付确认弹窗 -->
		<view class="modal-overlay" v-if="showConfirmModal" @tap="closeConfirmModal">
			<view class="modal-content" @tap.stop>
				<view class="modal-header">
					<text class="modal-title">确认支付</text>
					<text class="close-btn" @tap="closeConfirmModal">×</text>
				</view>
				<view class="modal-body">
					<view class="confirm-amount">
						<text>支付金额：¥{{ billInfo.amount || '0.00' }}</text>
					</view>
					<view class="payment-methods">
						<view class="method-item"
							v-for="method in paymentMethods"
							:key="method.value"
							:class="{ active: selectedPaymentMethod === method.value }"
							@tap="selectPaymentMethod(method.value)"
						>
							<text class="method-icon">{{ method.icon }}</text>
							<text class="method-name">{{ method.name }}</text>
						</view>
					</view>
					<textarea
						class="payment-note"
						placeholder="请输入支付备注（可选）"
						v-model="paymentNote"
						maxlength="200"
					></textarea>
				</view>
				<view class="modal-actions">
					<button class="modal-btn cancel" @tap="closeConfirmModal">取消</button>
					<button class="modal-btn confirm" @tap="confirmPayment">确认支付</button>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
	import { formatDate, showSuccess, showError, showLoading, hideLoading } from '../../utils/index.js'
	import notificationService from '../../utils/notification.js'
	import billSyncService from '../../utils/billSync.js'

	export default {
		data() {
			return {
				billId: '',
				billInfo: {},
				loading: false,
				showConfirmModal: false,
				selectedPaymentMethod: 'cash',
				paymentNote: '',
				paymentMethods: [
					{ value: 'cash', name: '现金', icon: '💵' },
					{ value: 'wechat', name: '微信', icon: '💚' },
					{ value: 'alipay', name: '支付宝', icon: '💙' },
					{ value: 'bank', name: '银行转账', icon: '🏦' },
					{ value: 'other', name: '其他', icon: '💳' }
				]
			}
		},
		computed: {
			showPayButton() {
				return this.billInfo.paymentStatus === 'unpaid' || this.billInfo.paymentStatus === 'overdue'
			}
		},
		onLoad(options) {
			if (options.id) {
				this.billId = options.id
				this.loadBillDetail()
			} else {
				showError('账单ID不存在')
				uni.navigateBack()
			}
		},
		methods: {
			// 加载账单详情
			async loadBillDetail() {
				this.loading = true
				try {
					// TODO: 调用真实API获取账单详情
					// const response = await billApi.getDetail(this.billId)
					// if (response.success) {
					//     this.billInfo = response.data
					// }

					// 模拟数据
					await new Promise(resolve => setTimeout(resolve, 1000))
					this.billInfo = {
						id: this.billId,
						activityTitle: '审核5',
						activityId: 'fcb3117a-20e0-4f3a-be23-9266a5d05fd1',
						amount: '132.80',
						costSharingRatio: '4.00',
						billDate: '2025-10-28T15:00:00.000Z',
						paymentDeadline: '2025-11-05T23:59:59.000Z',
						paymentStatus: 'unpaid',
						paymentTime: null,
						paymentMethod: null,
						note: '这是一条测试账单，请忽略此消息',
						description: '活动费用AA分摊账单'
					}

				} catch (error) {
					console.error('加载账单详情失败:', error)
					showError('加载账单详情失败')
				} finally {
					this.loading = false
				}
			},

			// 标记为已支付
			markAsPaid() {
				this.showConfirmModal = true
			},

			// 关闭确认弹窗
			closeConfirmModal() {
				this.showConfirmModal = false
				this.selectedPaymentMethod = 'cash'
				this.paymentNote = ''
			},

			// 选择支付方式
			selectPaymentMethod(method) {
				this.selectedPaymentMethod = method
			},

			// 确认支付
			async confirmPayment() {
				showLoading('正在提交...')

				try {
					// 使用账单同步服务处理支付状态更新
					await billSyncService.markBillPaid(this.billId, {
						paymentMethod: this.selectedPaymentMethod,
						paymentNote: this.paymentNote
					})

					// 更新本地状态
					this.billInfo.paymentStatus = 'paid'
					this.billInfo.paymentTime = new Date().toISOString()
					this.billInfo.paymentMethod = this.selectedPaymentMethod

					showSuccess('支付状态更新成功')
					this.closeConfirmModal()

				} catch (error) {
					console.error('标记支付失败:', error)
					showError('操作失败，请重试')
				} finally {
					hideLoading()
				}
			},

			// 联系管理员
			contactAdmin() {
				uni.showActionSheet({
					itemList: ['拨打电话', '发送消息'],
					success: (res) => {
						if (res.tapIndex === 0) {
							uni.makePhoneCall({
								phoneNumber: '10086' // TODO: 使用真实管理员电话
							})
						} else if (res.tapIndex === 1) {
							// 跳转到消息页面
							uni.switchTab({
								url: '/pages/message/message'
							})
						}
					}
				})
			},

			// 查看活动详情
			viewActivity() {
				if (this.billInfo.activityId) {
					uni.navigateTo({
						url: `/pages/activity/activity-detail?id=${this.billInfo.activityId}`
					})
				}
			},

			// 格式化日期
			formatDate(dateString) {
				if (!dateString) return ''
				return formatDate(dateString, 'YYYY-MM-DD HH:mm')
			},

			// 获取状态文本
			getStatusText(status) {
				const statusMap = {
					'unpaid': '未支付',
					'paid': '已支付',
					'overdue': '已逾期',
					'cancelled': '已取消'
				}
				return statusMap[status] || '未知'
			},

			// 获取状态样式类
			getStatusClass(status) {
				const classMap = {
					'unpaid': 'status-unpaid',
					'paid': 'status-paid',
					'overdue': 'status-overdue',
					'cancelled': 'status-cancelled'
				}
				return classMap[status] || ''
			},

			// 获取支付方式文本
			getPaymentMethodText(method) {
				const methodMap = {
					'cash': '现金',
					'wechat': '微信支付',
					'alipay': '支付宝',
					'bank': '银行转账',
					'other': '其他'
				}
				return methodMap[method] || method
			},

			// 检查是否逾期
			isOverdue(deadline) {
				if (!deadline) return false
				return new Date(deadline) < new Date()
			}
		}
	}
</script>

<style scoped>
	.bill-detail-container {
		min-height: 100vh;
		background-color: #f5f5f5;
		padding-bottom: 40rpx;
	}

	.bill-header {
		background: white;
		padding: 40rpx 30rpx;
		display: flex;
		align-items: center;
		border-bottom: 1rpx solid #f0f0f0;
	}

	.bill-icon {
		width: 100rpx;
		height: 100rpx;
		background: linear-gradient(135deg, #ff9500, #ff3b30);
		border-radius: 50rpx;
		display: flex;
		align-items: center;
		justify-content: center;
		margin-right: 30rpx;
	}

	.bill-icon .icon {
		font-size: 48rpx;
		color: white;
	}

	.bill-title {
		flex: 1;
	}

	.bill-title .title {
		font-size: 36rpx;
		font-weight: bold;
		color: #333;
		display: block;
		margin-bottom: 8rpx;
	}

	.bill-title .subtitle {
		font-size: 28rpx;
		color: #666;
	}

	.bill-status .status {
		font-size: 24rpx;
		padding: 8rpx 16rpx;
		border-radius: 20rpx;
		font-weight: bold;
	}

	.status-unpaid {
		color: #ff9500;
		background: rgba(255, 149, 0, 0.1);
		border: 1rpx solid rgba(255, 149, 0, 0.3);
	}

	.status-paid {
		color: #34c759;
		background: rgba(52, 199, 89, 0.1);
		border: 1rpx solid rgba(52, 199, 89, 0.3);
	}

	.status-overdue {
		color: #ff3b30;
		background: rgba(255, 59, 48, 0.1);
		border: 1rpx solid rgba(255, 59, 48, 0.3);
	}

	.amount-section {
		background: white;
		margin: 20rpx;
		padding: 40rpx 30rpx;
		border-radius: 20rpx;
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.amount-display {
		display: flex;
		align-items: baseline;
	}

	.currency {
		font-size: 36rpx;
		color: #ff3b30;
		margin-right: 8rpx;
		font-weight: bold;
	}

	.amount {
		font-size: 72rpx;
		color: #ff3b30;
		font-weight: bold;
	}

	.amount-info {
		text-align: right;
	}

	.amount-info .label {
		font-size: 24rpx;
		color: #999;
		display: block;
		margin-bottom: 4rpx;
	}

	.amount-info .value {
		font-size: 32rpx;
		color: #333;
		font-weight: bold;
	}

	.detail-section, .note-section {
		background: white;
		margin: 20rpx;
		border-radius: 20rpx;
		overflow: hidden;
	}

	.section-title {
		padding: 30rpx;
		font-size: 32rpx;
		font-weight: bold;
		color: #333;
		border-bottom: 1rpx solid #f0f0f0;
	}

	.detail-list {
		padding: 0 30rpx;
	}

	.detail-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 30rpx 0;
		border-bottom: 1rpx solid #f8f8f8;
	}

	.detail-item:last-child {
		border-bottom: none;
	}

	.detail-item .label {
		font-size: 28rpx;
		color: #666;
	}

	.detail-item .value {
		font-size: 28rpx;
		color: #333;
		font-weight: 500;
	}

	.detail-item .value.overdue {
		color: #ff3b30;
	}

	.note-content {
		padding: 30rpx;
		font-size: 28rpx;
		color: #666;
		line-height: 1.6;
	}

	.action-section {
		padding: 40rpx 30rpx;
		display: flex;
		flex-direction: column;
		gap: 20rpx;
	}

	.action-btn {
		height: 88rpx;
		border-radius: 44rpx;
		font-size: 32rpx;
		font-weight: bold;
		border: none;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.action-btn.primary {
		background: linear-gradient(135deg, #007aff, #5856d6);
		color: white;
	}

	.action-btn.secondary {
		background: white;
		color: #007aff;
		border: 2rpx solid #007aff;
	}

	/* 支付确认弹窗 */
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
		width: 600rpx;
		border-radius: 20rpx;
		overflow: hidden;
		margin: 0 30rpx;
	}

	.modal-header {
		padding: 30rpx;
		display: flex;
		justify-content: space-between;
		align-items: center;
		border-bottom: 1rpx solid #f0f0f0;
	}

	.modal-title {
		font-size: 32rpx;
		font-weight: bold;
		color: #333;
	}

	.close-btn {
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

	.confirm-amount {
		text-align: center;
		padding: 20rpx 0;
		border-bottom: 1rpx solid #f0f0f0;
		margin-bottom: 30rpx;
	}

	.confirm-amount text {
		font-size: 36rpx;
		color: #ff3b30;
		font-weight: bold;
	}

	.payment-methods {
		margin-bottom: 30rpx;
	}

	.method-item {
		display: flex;
		align-items: center;
		padding: 20rpx;
		border: 2rpx solid #f0f0f0;
		border-radius: 12rpx;
		margin-bottom: 15rpx;
	}

	.method-item.active {
		border-color: #007aff;
		background: rgba(0, 122, 255, 0.05);
	}

	.method-icon {
		font-size: 32rpx;
		margin-right: 20rpx;
	}

	.method-name {
		font-size: 28rpx;
		color: #333;
	}

	.payment-note {
		width: 100%;
		min-height: 120rpx;
		padding: 20rpx;
		border: 1rpx solid #e0e0e0;
		border-radius: 12rpx;
		font-size: 28rpx;
		box-sizing: border-box;
	}

	.modal-actions {
		display: flex;
		border-top: 1rpx solid #f0f0f0;
	}

	.modal-btn {
		flex: 1;
		height: 88rpx;
		border: none;
		font-size: 32rpx;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.modal-btn.cancel {
		background: white;
		color: #666;
		border-right: 1rpx solid #f0f0f0;
	}

	.modal-btn.confirm {
		background: white;
		color: #007aff;
		font-weight: bold;
	}

	/* 加载状态 */
	.loading-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(255, 255, 255, 0.8);
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		z-index: 999;
	}

	.loading-spinner {
		width: 60rpx;
		height: 60rpx;
		border: 4rpx solid #f0f0f0;
		border-top: 4rpx solid #007aff;
		border-radius: 50%;
		animation: spin 1s linear infinite;
		margin-bottom: 20rpx;
	}

	.loading-text {
		font-size: 28rpx;
		color: #666;
	}

	@keyframes spin {
		0% { transform: rotate(0deg); }
		100% { transform: rotate(360deg); }
	}
</style>