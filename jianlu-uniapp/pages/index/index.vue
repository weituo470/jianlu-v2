<template>
	<view class="diary-container">
		<!-- 页面头部 -->
		<view class="header">
			<view class="welcome">
				<text class="welcome-text">欢迎回来，{{ userInfo.nickname || userInfo.username }}！</text>
				<text class="welcome-subtitle">记录您的美好时光</text>
			</view>
			<button class="add-btn" @tap="showCreateModal">
				<text class="add-icon">+</text>
			</button>
		</view>

		<!-- 日记列表 -->
		<view class="diary-list" v-if="diaries.length > 0">
			<view
				class="diary-item card"
				v-for="diary in diaries"
				:key="diary.id"
				@tap="viewDiary(diary)"
			>
				<view class="diary-header">
					<view class="diary-title">{{ diary.title }}</view>
					<view class="diary-actions">
						<text class="action-btn" @tap.stop="editDiary(diary)">✏️</text>
						<text class="action-btn" @tap.stop="deleteDiary(diary)">🗑️</text>
					</view>
				</view>

				<view class="diary-meta">
					<text class="mood" v-if="diary.mood">{{ getMoodIcon(diary.mood) }}</text>
					<text class="weather" v-if="diary.weather">{{ getWeatherIcon(diary.weather) }}</text>
					<text class="date">{{ formatDate(diary.created_at, 'YYYY年MM月DD日') }}</text>
				</view>

				<view class="diary-content">
					{{ diary.content.substring(0, 100) }}{{ diary.content.length > 100 ? '...' : '' }}
				</view>
			</view>
		</view>

		<!-- 空状态 -->
		<view class="empty-state" v-else-if="!loading">
			<text class="empty-icon">📖</text>
			<text class="empty-title">还没有日记</text>
			<text class="empty-subtitle">开始记录您的第一篇日记吧！</text>
			<button class="btn btn-primary" @tap="showCreateModal">写第一篇日记</button>
		</view>

		<!-- 加载状态 -->
		<view class="loading-state" v-if="loading">
			<text>加载中...</text>
		</view>

		<!-- 创建/编辑日记弹窗 -->
		<view class="modal-overlay" v-if="showModal" @tap="hideModal">
			<view class="modal-content" @tap.stop>
				<view class="modal-header">
					<text class="modal-title">{{ editingDiary ? '编辑日记' : '写日记' }}</text>
					<text class="modal-close" @tap="hideModal">×</text>
				</view>

				<view class="modal-body">
					<view class="form-item">
						<text class="label">标题</text>
						<input
							class="input"
							type="text"
							placeholder="给您的日记起个标题..."
							v-model="diaryForm.title"
						/>
					</view>

					<view class="form-row">
						<view class="form-item half">
							<text class="label">心情</text>
							<picker
								:value="moodIndex"
								:range="moodOptions"
								range-key="label"
								@change="onMoodChange"
							>
								<view class="picker">
									{{ moodOptions[moodIndex].label }}
								</view>
							</picker>
						</view>

						<view class="form-item half">
							<text class="label">天气</text>
							<picker
								:value="weatherIndex"
								:range="weatherOptions"
								range-key="label"
								@change="onWeatherChange"
							>
								<view class="picker">
									{{ weatherOptions[weatherIndex].label }}
								</view>
							</picker>
						</view>
					</view>

					<view class="form-item">
						<text class="label">内容</text>
						<textarea
							class="textarea"
							placeholder="记录您今天的故事..."
							v-model="diaryForm.content"
							:maxlength="1000"
						/>
					</view>
				</view>

				<view class="modal-footer">
					<button class="btn btn-secondary" @tap="hideModal">取消</button>
					<button class="btn btn-primary" @tap="saveDiary" :disabled="saving">
						{{ saving ? '保存中...' : '保存' }}
					</button>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
	import { diaryApi } from '../../api/index.js'
	import { formatDate, getMoodIcon, getWeatherIcon, showSuccess, showError, showConfirm } from '../../utils/index.js'

	export default {
		data() {
			return {
				userInfo: {},
				diaries: [],
				loading: false,
				showModal: false,
				saving: false,
				editingDiary: null,
				diaryForm: {
					title: '',
					content: '',
					mood: '',
					weather: ''
				},
				moodOptions: [
					{ label: '选择心情', value: '' },
					{ label: '😊 开心', value: 'happy' },
					{ label: '😢 难过', value: 'sad' },
					{ label: '😠 愤怒', value: 'angry' },
					{ label: '🤩 兴奋', value: 'excited' },
					{ label: '😌 平静', value: 'calm' },
					{ label: '😰 焦虑', value: 'anxious' }
				],
				weatherOptions: [
					{ label: '选择天气', value: '' },
					{ label: '☀️ 晴天', value: 'sunny' },
					{ label: '☁️ 多云', value: 'cloudy' },
					{ label: '🌧️ 雨天', value: 'rainy' },
					{ label: '❄️ 雪天', value: 'snowy' },
					{ label: '💨 大风', value: 'windy' }
				],
				moodIndex: 0,
				weatherIndex: 0
			}
		},
		onLoad() {
			this.userInfo = uni.getStorageSync('userInfo') || {}
			this.fetchDiaries()
		},
		onShow() {
			// 页面显示时刷新数据
			this.fetchDiaries()
		},
		onPullDownRefresh() {
			this.fetchDiaries().finally(() => {
				uni.stopPullDownRefresh()
			})
		},
		methods: {
			formatDate,
			getMoodIcon,
			getWeatherIcon,

			// 获取日记列表
			async fetchDiaries() {
				this.loading = true
				try {
					const response = await diaryApi.getList()
					if (response.success) {
						this.diaries = response.data.diaries
					}
				} catch (error) {
					showError('获取日记列表失败')
				} finally {
					this.loading = false
				}
			},

			// 显示创建弹窗
			showCreateModal() {
				this.editingDiary = null
				this.resetForm()
				this.showModal = true
			},

			// 编辑日记
			editDiary(diary) {
				this.editingDiary = diary
				this.diaryForm = {
					title: diary.title,
					content: diary.content,
					mood: diary.mood || '',
					weather: diary.weather || ''
				}

				// 设置选择器索引
				this.moodIndex = this.moodOptions.findIndex(item => item.value === diary.mood) || 0
				this.weatherIndex = this.weatherOptions.findIndex(item => item.value === diary.weather) || 0

				this.showModal = true
			},

			// 查看日记详情
			viewDiary(diary) {
				// 可以跳转到详情页或显示详情弹窗
				uni.showModal({
					title: diary.title,
					content: diary.content,
					showCancel: false
				})
			},

			// 删除日记
			async deleteDiary(diary) {
				const confirmed = await showConfirm('确定要删除这篇日记吗？')
				if (!confirmed) return

				try {
					await diaryApi.delete(diary.id)
					showSuccess('日记删除成功')
					this.fetchDiaries()
				} catch (error) {
					showError('删除失败')
				}
			},

			// 隐藏弹窗
			hideModal() {
				this.showModal = false
				this.resetForm()
			},

			// 重置表单
			resetForm() {
				this.diaryForm = {
					title: '',
					content: '',
					mood: '',
					weather: ''
				}
				this.moodIndex = 0
				this.weatherIndex = 0
			},

			// 心情选择变化
			onMoodChange(e) {
				this.moodIndex = e.detail.value
				this.diaryForm.mood = this.moodOptions[this.moodIndex].value
			},

			// 天气选择变化
			onWeatherChange(e) {
				this.weatherIndex = e.detail.value
				this.diaryForm.weather = this.weatherOptions[this.weatherIndex].value
			},

			// 保存日记
			async saveDiary() {
				if (!this.diaryForm.title.trim() || !this.diaryForm.content.trim()) {
					showError('请填写标题和内容')
					return
				}

				this.saving = true
				try {
					const data = {
						title: this.diaryForm.title,
						content: this.diaryForm.content,
						mood: this.diaryForm.mood || undefined,
						weather: this.diaryForm.weather || undefined
					}

					if (this.editingDiary) {
						await diaryApi.update(this.editingDiary.id, data)
						showSuccess('日记更新成功')
					} else {
						await diaryApi.create(data)
						showSuccess('日记创建成功')
					}

					this.hideModal()
					this.fetchDiaries()
				} catch (error) {
					showError(this.editingDiary ? '更新失败' : '创建失败')
				} finally {
					this.saving = false
				}
			}
		}
	}
</script>

<style scoped>
	.diary-container {
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

	.welcome-text {
		font-size: 32rpx;
		font-weight: bold;
		color: #333;
		display: block;
	}

	.welcome-subtitle {
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

	.diary-item {
		margin-bottom: 20rpx;
		padding: 24rpx;
	}

	.diary-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 16rpx;
	}

	.diary-title {
		font-size: 32rpx;
		font-weight: bold;
		color: #333;
		flex: 1;
	}

	.diary-actions {
		display: flex;
		gap: 16rpx;
	}

	.action-btn {
		font-size: 28rpx;
		padding: 8rpx;
	}

	.diary-meta {
		display: flex;
		align-items: center;
		gap: 16rpx;
		margin-bottom: 16rpx;
	}

	.mood, .weather {
		font-size: 28rpx;
	}

	.date {
		font-size: 24rpx;
		color: #666;
	}

	.diary-content {
		font-size: 28rpx;
		color: #666;
		line-height: 1.6;
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

	.form-row {
		display: flex;
		gap: 20rpx;
	}

	.half {
		flex: 1;
	}

	.label {
		display: block;
		font-size: 28rpx;
		color: #333;
		margin-bottom: 12rpx;
	}

	.picker {
		height: 80rpx;
		line-height: 80rpx;
		padding: 0 20rpx;
		border: 2rpx solid #e0e0e0;
		border-radius: 8rpx;
		background: #ffffff;
	}

	.textarea {
		width: 100%;
		height: 200rpx;
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
