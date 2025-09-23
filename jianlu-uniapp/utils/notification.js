// 通知工具类
class NotificationService {
  constructor() {
    this.storageKey = 'team_notifications'
    this.maxCount = 100 // 最大保存通知数量
  }

  // 获取存储的通知
  getNotifications() {
    try {
      const notifications = uni.getStorageSync(this.storageKey) || []
      return notifications
    } catch (error) {
      console.error('获取通知失败:', error)
      return []
    }
  }

  // 保存通知
  saveNotifications(notifications) {
    try {
      // 只保留最新的maxCount条
      const trimmed = notifications.slice(-this.maxCount)
      uni.setStorageSync(this.storageKey, trimmed)
    } catch (error) {
      console.error('保存通知失败:', error)
    }
  }

  // 添加通知
  addNotification(notification) {
    const notifications = this.getNotifications()

    const newNotification = {
      id: Date.now().toString(),
      type: notification.type || 'system',
      title: notification.title,
      content: notification.content,
      data: notification.data || {},
      is_read: false,
      created_at: new Date().toISOString(),
      ...notification
    }

    notifications.unshift(newNotification)
    this.saveNotifications(notifications)

    // 显示本地通知
    this.showLocalNotification(newNotification)

    return newNotification
  }

  // 标记通知为已读
  markAsRead(notificationId) {
    const notifications = this.getNotifications()
    const notification = notifications.find(n => n.id === notificationId)
    if (notification) {
      notification.is_read = true
      this.saveNotifications(notifications)
    }
  }

  // 标记所有通知为已读
  markAllAsRead() {
    const notifications = this.getNotifications()
    notifications.forEach(n => n.is_read = true)
    this.saveNotifications(notifications)
  }

  // 删除通知
  deleteNotification(notificationId) {
    const notifications = this.getNotifications()
    const index = notifications.findIndex(n => n.id === notificationId)
    if (index > -1) {
      notifications.splice(index, 1)
      this.saveNotifications(notifications)
    }
  }

  // 获取未读数量
  getUnreadCount() {
    const notifications = this.getNotifications()
    return notifications.filter(n => !n.is_read).length
  }

  // 显示本地通知
  showLocalNotification(notification) {
    // 使用 uni.showToast 显示简单提示
    uni.showToast({
      title: notification.title,
      icon: 'none',
      duration: 2000
    })

    // 如果支持订阅消息，可以在这里添加订阅消息逻辑
    // uni.requestSubscribeMessage({
    //   tmplIds: ['your-template-id'],
    //   success: (res) => {
    //     // 发送订阅消息
    //   }
    // })
  }

  // 团队申请相关的通知方法
  notifyApplicationSubmitted(teamName) {
    return this.addNotification({
      type: 'team',
      title: '申请已提交',
      content: `您已成功申请加入团队「${teamName}」，请等待管理员审核`,
      data: { action: 'application_submitted' }
    })
  }

  notifyApplicationApproved(teamName) {
    return this.addNotification({
      type: 'team',
      title: '申请已通过',
      content: `恭喜！您加入团队「${teamName}」的申请已通过`,
      data: { action: 'application_approved' }
    })
  }

  notifyApplicationRejected(teamName, reason = '') {
    const content = reason
      ? `很遗憾，您加入团队「${teamName}」的申请未通过。原因：${reason}`
      : `很遗憾，您加入团队「${teamName}」的申请未通过`

    return this.addNotification({
      type: 'team',
      title: '申请未通过',
      content: content,
      data: { action: 'application_rejected' }
    })
  }

  notifyApplicationCancelled(teamName) {
    return this.addNotification({
      type: 'team',
      title: '申请已取消',
      content: `您已取消加入团队「${teamName}」的申请`,
      data: { action: 'application_cancelled' }
    })
  }

  // 管理员通知
  notifyAdminNewApplication(userName, teamName) {
    return this.addNotification({
      type: 'admin',
      title: '新的团队申请',
      content: `用户「${userName}」申请加入团队「${teamName}」，请及时处理`,
      data: { action: 'new_application' }
    })
  }
}

// 创建单例实例
const notificationService = new NotificationService()

export default notificationService