import { get, post, put, del } from '../utils/request.js'

// 活动API接口
export const activityApi = {
  // 获取活动列表
  getList(params = {}) {
    return get('/wechat/activities', params)
  },

  // 获取活动详情
  getDetail(id) {
    return get(`/wechat/activities/${id}`)
  },

  // 创建活动
  create(data) {
    return post('/wechat/activities', data)
  },

  // 更新活动
  update(id, data) {
    return put(`/wechat/activities/${id}`, data)
  },

  // 删除活动
  delete(id) {
    return del(`/wechat/activities/${id}`)
  },

  // 报名活动
  register(id, data) {
    return post(`/wechat/activities/${id}/register`, data)
  },

  // 取消报名
  cancelRegistration(id) {
    return del(`/wechat/activities/${id}/register`)
  },

  // 获取我的报名列表
  getMyRegistrations(params = {}) {
    return get('/wechat/my-registrations', params)
  },

  // 获取活动报名列表（管理员）
  getRegistrations(id, params = {}) {
    return get(`/wechat/activities/${id}/registrations`, params)
  },

  // 审核报名（管理员）
  approveRegistration(registrationId, approved = true) {
    return post(`/wechat/registrations/${registrationId}/approve`, { approved })
  },

  // 批量审核报名（管理员）
  batchApproveRegistrations(registrationIds, approved = true) {
    return post('/wechat/registrations/batch-approve', { 
      registration_ids: registrationIds, 
      approved 
    })
  }
}

// 活动类型配置
export const activityTypes = {
  travel: {
    name: '旅游活动',
    icon: '🏖️',
    color: '#FF6B6B',
    description: '团建旅行、户外探险等'
  },
  meeting: {
    name: '会议活动', 
    icon: '💼',
    color: '#4ECDC4',
    description: '技术分享、工作会议等'
  },
  social: {
    name: '社交活动',
    icon: '🎉',
    color: '#45B7D1',
    description: '聚餐、娱乐等'
  },
  learning: {
    name: '学习活动',
    icon: '📚',
    color: '#96CEB4',
    description: '培训、讲座等'
  },
  sports: {
    name: '运动活动',
    icon: '⚽',
    color: '#FFEAA7',
    description: '健身、比赛等'
  }
}

// 活动状态配置
export const activityStatus = {
  draft: {
    name: '草稿',
    color: '#BDC3C7',
    description: '活动尚未发布'
  },
  registration: {
    name: '报名中',
    color: '#3498DB',
    description: '正在接受报名'
  },
  ongoing: {
    name: '进行中',
    color: '#2ECC71',
    description: '活动正在进行'
  },
  completed: {
    name: '已结束',
    color: '#95A5A6',
    description: '活动已经结束'
  },
  cancelled: {
    name: '已取消',
    color: '#E74C3C',
    description: '活动已被取消'
  }
}

// 报名状态配置
export const registrationStatus = {
  pending: {
    name: '待审核',
    color: '#F39C12',
    description: '等待管理员审核'
  },
  approved: {
    name: '已通过',
    color: '#27AE60',
    description: '报名已通过'
  },
  rejected: {
    name: '已拒绝',
    color: '#E74C3C',
    description: '报名被拒绝'
  },
  cancelled: {
    name: '已取消',
    color: '#95A5A6',
    description: '用户取消报名'
  },
  waitlist: {
    name: '等待列表',
    color: '#8E44AD',
    description: '在等待列表中'
  }
}

// 活动可见性配置
export const activityVisibility = {
  public: {
    name: '公开活动',
    icon: '🌍',
    description: '所有用户可见'
  },
  team: {
    name: '团队活动',
    icon: '👥',
    description: '仅团队成员可见'
  }
}

// 工具函数
export const activityUtils = {
  // 获取活动类型信息
  getTypeInfo(type) {
    return activityTypes[type] || { name: '未知类型', icon: '❓', color: '#BDC3C7' }
  },

  // 获取活动状态信息
  getStatusInfo(status) {
    return activityStatus[status] || { name: '未知状态', color: '#BDC3C7' }
  },

  // 获取报名状态信息
  getRegistrationStatusInfo(status) {
    return registrationStatus[status] || { name: '未知状态', color: '#BDC3C7' }
  },

  // 获取可见性信息
  getVisibilityInfo(visibility) {
    return activityVisibility[visibility] || { name: '未知', icon: '❓' }
  },

  // 格式化活动时间
  formatActivityTime(startTime, endTime) {
    const start = new Date(startTime)
    const end = new Date(endTime)
    const now = new Date()

    const formatDate = (date) => {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, '0')
      const day = String(date.getDate()).padStart(2, '0')
      const hour = String(date.getHours()).padStart(2, '0')
      const minute = String(date.getMinutes()).padStart(2, '0')
      
      return `${year}-${month}-${day} ${hour}:${minute}`
    }

    const isSameDay = start.toDateString() === end.toDateString()
    
    if (isSameDay) {
      return `${formatDate(start)} - ${end.getHours().toString().padStart(2, '0')}:${end.getMinutes().toString().padStart(2, '0')}`
    } else {
      return `${formatDate(start)} - ${formatDate(end)}`
    }
  },

  // 检查活动是否可以报名
  canRegister(activity) {
    const now = new Date()
    const registrationDeadline = activity.registration_deadline ? new Date(activity.registration_deadline) : null
    
    // 检查活动状态
    if (activity.status !== 'registration') {
      return { canRegister: false, reason: '活动未开放报名' }
    }

    // 检查报名截止时间
    if (registrationDeadline && now > registrationDeadline) {
      return { canRegister: false, reason: '报名已截止' }
    }

    // 检查人数限制
    if (activity.max_participants > 0 && activity.registration_count >= activity.max_participants) {
      return { canRegister: false, reason: '报名人数已满' }
    }

    // 检查用户是否已报名
    if (activity.user_registered) {
      return { canRegister: false, reason: '已经报名' }
    }

    return { canRegister: true }
  },

  // 获取活动进度百分比
  getProgressPercentage(activity) {
    if (!activity.max_participants || activity.max_participants <= 0) {
      return 0 // 无限制时不显示进度
    }

    const percentage = (activity.registration_count / activity.max_participants) * 100
    // 使用 Math.floor 确保只返回整数部分
    return Math.floor(Math.min(percentage, 100))
  }
}
