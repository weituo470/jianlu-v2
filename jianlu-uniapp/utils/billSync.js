// 账单同步服务 - 处理消息与账单详情页面的联动
import notificationService from './notification.js'
import { getMyBills, syncBillNotifications, markMessagesAsRead } from '../api/bill.js'

class BillSyncService {
  constructor() {
    this.syncQueue = []
    this.isSyncing = false
    this.lastSyncTime = 0
    this.syncInterval = 5 * 60 * 1000 // 5分钟同步一次
  }

  /**
   * 初始化同步服务
   */
  async init() {
    // 页面显示时检查是否需要同步
    uni.onAppShow(() => {
      this.checkAndSync()
    })

    // 定期同步
    setInterval(() => {
      this.checkAndSync()
    }, this.syncInterval)

    // 初始同步
    await this.checkAndSync()
  }

  /**
   * 检查并执行同步
   */
  async checkAndSync() {
    const now = Date.now()
    if (now - this.lastSyncTime > this.syncInterval) {
      await this.syncBillData()
      this.lastSyncTime = now
    }
  }

  /**
   * 同步账单数据
   */
  async syncBillData() {
    if (this.isSyncing) {
      return
    }

    this.isSyncing = true

    try {
      console.log('开始同步账单数据...')

      // 1. 同步服务器账单消息到本地通知
      const { syncedCount } = await syncBillNotifications()
      console.log(`同步了 ${syncedCount} 条账单通知`)

      // 2. 获取最新账单数据
      const billsResponse = await getMyBills({ limit: 50 })
      if (billsResponse.success) {
        const serverBills = billsResponse.data.list || []

        // 3. 更新本地账单通知的状态
        this.updateLocalBillNotifications(serverBills)

        // 4. 清理过期的本地通知
        this.cleanupExpiredNotifications()
      }

    } catch (error) {
      console.error('同步账单数据失败:', error)
    } finally {
      this.isSyncing = false
    }
  }

  /**
   * 更新本地账单通知状态
   */
  updateLocalBillNotifications(serverBills) {
    const localBillNotifications = notificationService.getBillNotifications()

    serverBills.forEach(serverBill => {
      const localNotification = localBillNotifications.find(
        local => local.data.bill_id === serverBill.id || local.id === serverBill.id
      )

      if (localNotification) {
        // 检查状态是否需要更新
        if (serverBill.payment_status !== localNotification.data.payment_status) {
          // 更新本地通知状态
          localNotification.data.payment_status = serverBill.payment_status
          localNotification.is_read = serverBill.payment_status === 'paid'

          // 更新通知内容
          if (serverBill.payment_status === 'paid') {
            localNotification.title = '【账单已支付】'
            localNotification.content = localNotification.content.replace('应付', '已支付')
          }

          // 保存更新
          const allNotifications = notificationService.getNotifications()
          const index = allNotifications.findIndex(n => n.id === localNotification.id)
          if (index > -1) {
            allNotifications[index] = localNotification
            notificationService.saveNotifications(allNotifications)
          }
        }
      }
    })
  }

  /**
   * 清理过期通知
   */
  cleanupExpiredNotifications() {
    const notifications = notificationService.getNotifications()
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000)

    const validNotifications = notifications.filter(notification => {
      const notificationTime = new Date(notification.created_at).getTime()
      return notificationTime > thirtyDaysAgo
    })

    if (validNotifications.length !== notifications.length) {
      notificationService.saveNotifications(validNotifications)
      console.log(`清理了 ${notifications.length - validNotifications.length} 条过期通知`)
    }
  }

  /**
   * 标记账单已支付并同步状态
   */
  async markBillPaid(billId, paymentData = {}) {
    try {
      // 1. 调用API标记支付状态
      const { markBillAsPaid } = require('../api/bill.js')
      const response = await markBillAsPaid(billId, paymentData)

      if (response.success) {
        // 2. 更新本地通知状态
        notificationService.markBillAsPaid(billId)

        // 3. 标记相关消息为已读
        const billNotifications = notificationService.getBillNotifications()
        const billNotification = billNotifications.find(
          n => n.data.bill_id === billId || n.id === billId
        )

        if (billNotification && billNotification.data.message_id) {
          await markMessagesAsRead([billNotification.data.message_id])
        }

        // 4. 触发同步
        await this.syncBillData()

        return response
      } else {
        throw new Error(response.message || '标记支付失败')
      }
    } catch (error) {
      console.error('标记账单支付失败:', error)
      throw error
    }
  }

  /**
   * 处理账单消息点击事件
   */
  handleBillMessageClick(message) {
    try {
      // 1. 标记消息为已读
      if (!message.is_read) {
        message.is_read = true

        // 如果有消息ID，同步到服务器
        if (message.data?.message_id) {
          markMessagesAsRead([message.data.message_id]).catch(error => {
            console.warn('标记服务器消息已读失败:', error)
          })
        }
      }

      // 2. 跳转到账单详情页面
      const billId = message.data?.bill_id || message.id
      if (billId) {
        uni.navigateTo({
          url: `/pages/bill/bill-detail?id=${billId}`
        })
      } else {
        uni.showToast({
          title: '账单ID不存在',
          icon: 'error'
        })
      }

    } catch (error) {
      console.error('处理账单消息点击失败:', error)
      uni.showToast({
        title: '操作失败',
        icon: 'error'
      })
    }
  }

  /**
   * 获取账单未读数量
   */
  getUnpaidBillCount() {
    const unpaidBills = notificationService.getUnpaidBills()
    return unpaidBills.filter(bill => !bill.is_read).length
  }

  /**
   * 获取账单统计信息
   */
  getBillStatistics() {
    const billNotifications = notificationService.getBillNotifications()
    const statistics = {
      total: billNotifications.length,
      unpaid: 0,
      paid: 0,
      overdue: 0,
      unread: 0
    }

    billNotifications.forEach(bill => {
      const status = bill.data.payment_status

      if (status === 'unpaid') statistics.unpaid++
      else if (status === 'paid') statistics.paid++
      else if (status === 'overdue') statistics.overdue++

      if (!bill.is_read) statistics.unread++
    })

    return statistics
  }

  /**
   * 强制同步账单数据
   */
  async forceSync() {
    this.lastSyncTime = 0 // 重置同步时间，强制执行同步
    return await this.syncBillData()
  }

  /**
   * 检查是否有新的账单通知
   */
  async checkNewBills() {
    const currentUnpaidCount = this.getUnpaidBillCount()

    try {
      // 获取服务器最新账单数据
      const billsResponse = await getMyBills({ limit: 10 })
      if (billsResponse.success) {
        const serverUnpaidBills = billsResponse.data.list?.filter(bill =>
          bill.payment_status === 'unpaid' || bill.payment_status === 'overdue'
        ) || []

        // 如果服务器未支付账单数量大于本地未读数量，说明有新账单
        if (serverUnpaidBills.length > currentUnpaidCount) {
          await this.syncBillData()
          return true
        }
      }
    } catch (error) {
      console.error('检查新账单失败:', error)
    }

    return false
  }
}

// 创建单例实例
const billSyncService = new BillSyncService()

export default billSyncService