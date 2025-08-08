// 认证状态管理
import { reactive, computed } from 'vue'
import { getUserInfo, getToken, getUserPermissions, getUserRole, clearUserInfo } from '../utils/permission.js'

// 创建响应式状态
const state = reactive({
  // 用户信息
  user: null,
  // 登录token
  token: null,
  // 是否已初始化
  initialized: false
})

// 计算属性
const getters = {
  // 是否已登录
  isLoggedIn: computed(() => !!(state.token && state.user)),
  
  // 用户角色
  userRole: computed(() => state.user?.role || null),
  
  // 用户权限
  userPermissions: computed(() => {
    if (!state.user) return []
    return state.user.permissions || getUserPermissions()
  }),
  
  // 用户显示名称
  userDisplayName: computed(() => {
    if (!state.user) return ''
    return state.user.profile?.nickname || state.user.username || ''
  })
}

// 操作方法
const actions = {
  /**
   * 初始化认证状态
   */
  init() {
    if (state.initialized) return
    
    const token = getToken()
    const user = getUserInfo()
    
    if (token && user) {
      state.token = token
      state.user = user
    }
    
    state.initialized = true
    console.log('认证状态初始化完成:', { token: !!token, user: !!user })
  },
  
  /**
   * 设置用户登录信息
   * @param {Object} loginData - 登录数据
   */
  setAuth(loginData) {
    const { token, user } = loginData
    
    // 更新状态
    state.token = token
    state.user = user
    
    // 保存到本地存储
    uni.setStorageSync('token', token)
    uni.setStorageSync('userInfo', JSON.stringify(user))
    
    console.log('用户登录成功:', user.username)
  },
  
  /**
   * 清除认证信息
   */
  clearAuth() {
    state.token = null
    state.user = null
    
    // 清除本地存储
    clearUserInfo()
    
    console.log('用户登录信息已清除')
  },
  
  /**
   * 更新用户信息
   * @param {Object} userInfo - 用户信息
   */
  updateUser(userInfo) {
    if (state.user) {
      Object.assign(state.user, userInfo)
      
      // 更新本地存储
      uni.setStorageSync('userInfo', JSON.stringify(state.user))
      
      console.log('用户信息已更新')
    }
  },
  
  /**
   * 登出
   */
  logout() {
    actions.clearAuth()
    
    // 跳转到登录页
    uni.reLaunch({
      url: '/pages/login/login'
    })
  },
  
  /**
   * 检查权限
   * @param {string|Array} permissions - 权限列表
   * @returns {boolean}
   */
  hasPermission(permissions) {
    if (!getters.isLoggedIn.value) return false
    
    // 超级管理员拥有所有权限
    if (getters.userRole.value === 'super_admin') return true
    
    const userPermissions = getters.userPermissions.value
    const requiredPermissions = Array.isArray(permissions) ? permissions : [permissions]
    
    return requiredPermissions.some(permission => userPermissions.includes(permission))
  },
  
  /**
   * 检查角色
   * @param {string|Array} roles - 角色列表
   * @returns {boolean}
   */
  hasRole(roles) {
    if (!getters.isLoggedIn.value) return false
    
    const userRole = getters.userRole.value
    
    // 超级管理员拥有所有角色权限
    if (userRole === 'super_admin') return true
    
    const requiredRoles = Array.isArray(roles) ? roles : [roles]
    return requiredRoles.includes(userRole)
  }
}

// 导出认证store
export const useAuthStore = () => {
  // 确保已初始化
  if (!state.initialized) {
    actions.init()
  }
  
  return {
    // 状态
    state,
    // 计算属性
    ...getters,
    // 操作方法
    ...actions
  }
}

// 导出默认实例（用于非组合式API）
export default {
  state,
  getters,
  actions
}