// 认证相关的组合式API
import { computed } from 'vue'
import { useAuthStore } from '../store/auth.js'
import { hasPermission, hasRole, isLoggedIn, getUserRole, getUserPermissions } from '../utils/permission.js'

/**
 * 使用认证功能
 */
export function useAuth() {
  const authStore = useAuthStore()
  
  return {
    // 状态
    user: computed(() => authStore.state.user),
    token: computed(() => authStore.state.token),
    isLoggedIn: authStore.isLoggedIn,
    userRole: authStore.userRole,
    userPermissions: authStore.userPermissions,
    userDisplayName: authStore.userDisplayName,
    
    // 方法
    setAuth: authStore.setAuth,
    clearAuth: authStore.clearAuth,
    updateUser: authStore.updateUser,
    logout: authStore.logout,
    hasPermission: authStore.hasPermission,
    hasRole: authStore.hasRole
  }
}

/**
 * 使用权限检查
 */
export function usePermission() {
  return {
    // 检查权限
    hasPermission,
    // 检查角色
    hasRole,
    // 是否已登录
    isLoggedIn,
    // 获取用户角色
    getUserRole,
    // 获取用户权限
    getUserPermissions,
    
    // 响应式权限检查
    checkPermission: (permissions) => computed(() => hasPermission(permissions)),
    checkRole: (roles) => computed(() => hasRole(roles)),
    checkLogin: computed(() => isLoggedIn())
  }
}

/**
 * 使用路由守卫
 */
export function useRouteGuard() {
  const { isLoggedIn } = useAuth()
  
  /**
   * 需要登录的页面守卫
   */
  const requireAuth = () => {
    if (!isLoggedIn.value) {
      uni.showToast({
        title: '请先登录',
        icon: 'none'
      })
      
      uni.reLaunch({
        url: '/pages/login/login'
      })
      return false
    }
    return true
  }
  
  /**
   * 需要权限的页面守卫
   */
  const requirePermission = (permissions) => {
    if (!requireAuth()) return false
    
    if (!hasPermission(permissions)) {
      uni.showToast({
        title: '权限不足，无法访问',
        icon: 'none'
      })
      
      uni.navigateBack({
        fail: () => {
          uni.switchTab({
            url: '/pages/dashboard/dashboard'
          })
        }
      })
      return false
    }
    return true
  }
  
  /**
   * 需要角色的页面守卫
   */
  const requireRole = (roles) => {
    if (!requireAuth()) return false
    
    if (!hasRole(roles)) {
      uni.showToast({
        title: '权限不足，无法访问',
        icon: 'none'
      })
      
      uni.navigateBack({
        fail: () => {
          uni.switchTab({
            url: '/pages/dashboard/dashboard'
          })
        }
      })
      return false
    }
    return true
  }
  
  return {
    requireAuth,
    requirePermission,
    requireRole
  }
}