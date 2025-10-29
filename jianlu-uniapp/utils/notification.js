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
    // 根据通知类型和优先级显示不同的提示
    let icon = 'none';
    let duration = 2000;

    if (notification.type === 'bill') {
      if (notification.priority === 'urgent') {
        icon = 'error';
        duration = 3000;
      } else if (notification.priority === 'high') {
        icon = 'warning';
        duration = 2500;
      } else {
        icon = 'success';
      }
    }

    // 显示Toast提示
    uni.showToast({
      title: notification.title,
      icon: icon,
      duration: duration
    });

    // 对于账单类型，额外显示震动
    if (notification.type === 'bill' && notification.priority !== 'normal') {
      uni.vibrateShort();
    }

    // 如果支持订阅消息，可以在这里添加订阅消息逻辑
    // uni.requestSubscribeMessage({
    //   tmplIds: ['your-bill-template-id'],
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

  // 账单相关通知方法
  notifyBillReceived(activityTitle, amount, paymentDeadline, billId) {
    return this.addNotification({
      type: 'bill',
      title: '【账单通知】',
      content: `您参与的"${activityTitle}"活动账单已生成，应付金额：¥${amount}`,
      data: {
        action: 'bill_received',
        bill_id: billId,
        activity_title: activityTitle,
        amount: amount,
        payment_deadline: paymentDeadline,
        payment_status: 'unpaid'
      }
    })
  }

  notifyBillUpdated(activityTitle, amount, paymentDeadline, billId) {
    return this.addNotification({
      type: 'bill',
      title: '【账单更新】',
      content: `"${activityTitle}"活动账单已更新，应付金额：¥${amount}`,
      data: {
        action: 'bill_updated',
        bill_id: billId,
        activity_title: activityTitle,
        amount: amount,
        payment_deadline: paymentDeadline,
        payment_status: 'unpaid'
      }
    })
  }

  notifyBillPaymentReminder(activityTitle, amount, paymentDeadline, billId) {
    const deadline = paymentDeadline
      ? new Date(paymentDeadline).toLocaleDateString('zh-CN')
      : '未设置截止日期';

    return this.addNotification({
      type: 'bill',
      title: '【支付提醒】',
      content: `"${activityTitle}"活动账单即将到期，应付金额：¥${amount}，截止日期：${deadline}`,
      priority: 'high',
      data: {
        action: 'bill_payment_reminder',
        bill_id: billId,
        activity_title: activityTitle,
        amount: amount,
        payment_deadline: paymentDeadline,
        payment_status: 'unpaid'
      }
    })
  }

  notifyBillOverdue(activityTitle, amount, billId) {
    return this.addNotification({
      type: 'bill',
      title: '【账单逾期】',
      content: `"${activityTitle}"活动账单已逾期，请尽快支付应付金额：¥${amount}`,
      priority: 'urgent',
      data: {
        action: 'bill_overdue',
        bill_id: billId,
        activity_title: activityTitle,
        amount: amount,
        payment_status: 'overdue'
      }
    })
  }

  // 从服务器消息同步账单通知
  syncBillFromServer(serverMessage) {
    const metadata = serverMessage.metadata || {};

    return this.addNotification({
      type: 'bill',
      title: serverMessage.title || '【账单通知】',
      content: serverMessage.content,
      priority: serverMessage.priority || 'normal',
      is_read: serverMessage.is_read || false,
      created_at: serverMessage.created_at,
      data: {
        action: 'bill_received',
        bill_id: serverMessage.id,
        activity_id: metadata.activity_id,
        activity_title: metadata.activity_title,
        amount: metadata.amount,
        payment_deadline: metadata.payment_deadline,
        payment_status: metadata.payment_status || 'unpaid',
        cost_sharing_ratio: metadata.cost_sharing_ratio,
        message_id: serverMessage.id
      }
    })
  }

  // 获取账单类型通知
  getBillNotifications() {
    const notifications = this.getNotifications();
    return notifications.filter(n => n.type === 'bill');
  }

  // 获取未支付账单
  getUnpaidBills() {
    const billNotifications = this.getBillNotifications();
    return billNotifications.filter(n =>
      n.data.payment_status === 'unpaid' || n.data.payment_status === 'overdue'
    );
  }

  // 标记账单为已支付
  markBillAsPaid(billId) {
    const notifications = this.getNotifications();
    const billNotification = notifications.find(n =>
      n.type === 'bill' && n.data.bill_id === billId
    );

    if (billNotification) {
      billNotification.data.payment_status = 'paid';
      billNotification.content = billNotification.content.replace('应付', '已支付');
      this.saveNotifications(notifications);
    }
  }
}

// 创建单例实例
const notificationService = new NotificationService()

export default notificationService