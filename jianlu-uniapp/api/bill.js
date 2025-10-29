// 账单相关API接口
const BASE_URL = 'http://localhost:3460'

/**
 * 获取我的账单列表
 */
export function getMyBills(params = {}) {
  return uni.request({
    url: `${BASE_URL}/api/bills/my-bills`,
    method: 'GET',
    data: {
      page: params.page || 1,
      limit: params.limit || 20,
      status: params.status || '',
      ...params
    }
  }).then(response => {
    if (response.statusCode === 200) {
      return response.data
    } else {
      throw new Error(response.data?.message || '获取账单列表失败')
    }
  })
}

/**
 * 获取账单详情
 */
export function getBillDetail(billId) {
  return uni.request({
    url: `${BASE_URL}/api/bills/${billId}`,
    method: 'GET'
  }).then(response => {
    if (response.statusCode === 200) {
      return response.data
    } else {
      throw new Error(response.data?.message || '获取账单详情失败')
    }
  })
}

/**
 * 标记账单为已支付
 */
export function markBillAsPaid(billId, paymentData = {}) {
  return uni.request({
    url: `${BASE_URL}/api/bills/${billId}/mark-paid`,
    method: 'PUT',
    data: {
      payment_method: paymentData.paymentMethod || 'cash',
      payment_note: paymentData.paymentNote || '',
      ...paymentData
    }
  }).then(response => {
    if (response.statusCode === 200) {
      return response.data
    } else {
      throw new Error(response.data?.message || '更新支付状态失败')
    }
  })
}

/**
 * 获取活动账单历史
 */
export function getActivityBillHistory(activityId, params = {}) {
  return uni.request({
    url: `${BASE_URL}/api/bills/activities/${activityId}/bill-history`,
    method: 'GET',
    data: {
      page: params.page || 1,
      limit: params.limit || 20,
      ...params
    }
  }).then(response => {
    if (response.statusCode === 200) {
      return response.data
    } else {
      throw new Error(response.data?.message || '获取账单历史失败')
    }
  })
}

/**
 * 获取账单统计信息
 */
export function getBillStatistics() {
  return uni.request({
    url: `${BASE_URL}/api/bills/statistics`,
    method: 'GET'
  }).then(response => {
    if (response.statusCode === 200) {
      return response.data
    } else {
      throw new Error(response.data?.message || '获取账单统计失败')
    }
  })
}

/**
 * 从服务器消息中同步账单通知
 */
export function syncBillNotifications() {
  // 首先获取服务器消息
  return getServerMessages().then(messages => {
    const notificationService = require('../utils/notification.js').default
    let syncedCount = 0

    // 过滤出账单类型的消息并同步到本地通知
    messages.forEach(message => {
      if (message.type === 'bill' && !message.is_read) {
        try {
          notificationService.syncBillFromServer(message)
          syncedCount++
        } catch (error) {
          console.error('同步账单通知失败:', error)
        }
      }
    })

    return { syncedCount, totalMessages: messages.length }
  })
}

/**
 * 获取服务器消息列表
 */
function getServerMessages(params = {}) {
  return uni.request({
    url: `${BASE_URL}/api/messages`,
    method: 'GET',
    data: {
      page: params.page || 1,
      limit: params.limit || 50,
      type: 'bill',
      ...params
    }
  }).then(response => {
    if (response.statusCode === 200) {
      return response.data?.list || []
    } else {
      throw new Error(response.data?.message || '获取消息列表失败')
    }
  })
}

/**
 * 批量标记消息为已读
 */
export function markMessagesAsRead(messageIds) {
  return uni.request({
    url: `${BASE_URL}/api/messages/mark-read`,
    method: 'PUT',
    data: {
      message_ids: Array.isArray(messageIds) ? messageIds : [messageIds]
    }
  }).then(response => {
    if (response.statusCode === 200) {
      return response.data
    } else {
      throw new Error(response.data?.message || '标记消息已读失败')
    }
  })
}

/**
 * 获取账单支付方式列表
 */
export function getPaymentMethods() {
  return Promise.resolve([
    { value: 'cash', name: '现金', icon: '💵' },
    { value: 'wechat', name: '微信支付', icon: '💚' },
    { value: 'alipay', name: '支付宝', icon: '💙' },
    { value: 'bank', name: '银行转账', icon: '🏦' },
    { value: 'other', name: '其他', icon: '💳' }
  ])
}

/**
 * 创建账单支付记录
 */
export function createPaymentRecord(billId, paymentData) {
  return uni.request({
    url: `${BASE_URL}/api/payments`,
    method: 'POST',
    data: {
      bill_id: billId,
      payment_method: paymentData.paymentMethod,
      payment_amount: paymentData.amount,
      payment_note: paymentData.note,
      ...paymentData
    }
  }).then(response => {
    if (response.statusCode === 201) {
      return response.data
    } else {
      throw new Error(response.data?.message || '创建支付记录失败')
    }
  })
}

/**
 * 获取账单相关的活动信息
 */
export function getBillActivityInfo(activityId) {
  return uni.request({
    url: `${BASE_URL}/api/activities/${activityId}`,
    method: 'GET'
  }).then(response => {
    if (response.statusCode === 200) {
      return response.data
    } else {
      throw new Error(response.data?.message || '获取活动信息失败')
    }
  })
}

/**
 * 账单相关的错误处理和重试机制
 */
export class BillAPIError extends Error {
  constructor(message, code, details) {
    super(message)
    this.name = 'BillAPIError'
    this.code = code
    this.details = details
  }
}

/**
 * 带重试机制的API调用
 */
export function callAPIWithRetry(apiCall, maxRetries = 3) {
  return new Promise((resolve, reject) => {
    let retryCount = 0

    const attemptCall = () => {
      apiCall()
        .then(resolve)
        .catch(error => {
          retryCount++
          if (retryCount <= maxRetries) {
            console.log(`API调用失败，第${retryCount}次重试...`)
            // 指数退避策略
            const delay = Math.pow(2, retryCount) * 1000
            setTimeout(attemptCall, delay)
          } else {
            reject(new BillAPIError(
              error.message || 'API调用失败',
              error.statusCode || 500,
              { retryCount, originalError: error }
            ))
          }
        })
    }

    attemptCall()
  })
}