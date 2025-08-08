// 权限管理工具函数

/**
 * 角色权限映射
 */
const ROLE_PERMISSIONS = {
  super_admin: [
    'user:read', 'user:create', 'user:update', 'user:delete',
    'team:read', 'team:create', 'team:update', 'team:delete',
    'activity:read', 'activity:create', 'activity:update', 'activity:delete',
    'content:read', 'content:create', 'content:update', 'content:delete',
    'system:read', 'system:update'
  ],
  system_admin: [
    'user:read', 'user:create', 'user:update', 'user:delete',
    'system:read', 'system:update'
  ],
  operation_admin: [
    'team:read', 'team:create', 'team:update', 'team:delete',
    'activity:read', 'activity:create', 'activity:update', 'activity:delete',
    'content:read', 'content:update', 'content:delete'
  ],
  team_admin: [
    'team:read', 'team:update'
  ]
}

/**
 * 页面权限映射
 */
const PAGE_PERMISSIONS = {
  '/pages/dashboard/dashboard': ['user:read'],
  '/pages/users/users': ['user:read'],
  '/pages/users/create': ['user:create'],
  '/pages/users/edit': ['user:update'],
  '/pages/teams/teams': ['team:read'],
  '/pages/teams/create': ['team:create'],
  '/pages/teams/edit': ['team:update'],
  '/pages/activities/activities': ['activity:read'],
  '/pages/activities/create': ['activity:create'],
  '/pages/activities/edit': ['activity:update'],
  '/pages/content/content': ['content:read'],
  '/pages/settings/settings': ['system:read']
}

/**
 * 获取用户信息
 */
export function getUserInfo() {
  try {
    const userInfo = uni.getStorageSync('userInfo')
    return userInfo ? JSON.parse(userInfo) : null
  } catch (error) {
    console.error('获取用户信息失败:', error)
    return null
  }
}

/**
 * 获取用户Token
 */
export function getToken() {
  return uni.getStorageSync('token') || null
}

/**
 * 检查用户是否已登录
 */
export function isLoggedIn() {
  const token = getToken()
  const userInfo = getUserInfo()
  return !!(token && userInfo)
}

/**
 * 获取用户角色
 */
export function getUserRole() {
  const userInfo = getUserInfo()
  return userInfo ? userInfo.role : null
}

/**
 * 获取用户权限列表
 */
export function getUserPermissions() {
  const userInfo = getUserInfo()
  if (!userInfo) return []
  
  // 优先使用服务器返回的权限列表
  if (userInfo.permissions && Array.isArray(userInfo.permissions)) {
    return userInfo.permissions
  }
  
  // 否则根据角色获取权限
  return ROLE_PERMISSIONS[userInfo.role] || []
}

/**
 * 检查用户是否拥有指定权限
 * @param {string|Array} requiredPermissions - 需要的权限
 * @returns {boolean}
 */
export function hasPermission(requiredPermissions) {
  if (!isLoggedIn()) return false
  
  const userRole = getUserRole()
  const userPermissions = getUserPermissions()
  
  // 超级管理员拥有所有权限
  if (userRole === 'super_admin') return true
  
  // 转换为数组
  const permissions = Array.isArray(requiredPermissions) 
    ? requiredPermissions 
    : [requiredPermissions]
  
  // 检查是否拥有任一权限
  return permissions.some(permission => userPermissions.includes(permission))
}

/**
 * 检查用户是否拥有指定角色
 * @param {string|Array} requiredRoles - 需要的角色
 * @returns {boolean}
 */
export function hasRole(requiredRoles) {
  if (!isLoggedIn()) return false
  
  const userRole = getUserRole()
  
  // 超级管理员拥有所有角色权限
  if (userRole === 'super_admin') return true
  
  // 转换为数组
  const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles]
  
  // 检查是否拥有指定角色
  return roles.includes(userRole)
}

/**
 * 检查用户是否可以访问指定页面
 * @param {string} pagePath - 页面路径
 * @returns {boolean}
 */
export function canAccessPage(pagePath) {
  if (!isLoggedIn()) return false
  
  // 如果页面没有权限要求，则允许访问
  const requiredPermissions = PAGE_PERMISSIONS[pagePath]
  if (!requiredPermissions) return true
  
  // 检查权限
  return hasPermission(requiredPermissions)
}

/**
 * 权限守卫 - 检查页面访问权限
 * @param {string} pagePath - 页面路径
 * @returns {Promise<boolean>}
 */
export async function permissionGuard(pagePath) {
  // 检查是否已登录
  if (!isLoggedIn()) {
    uni.showToast({
      title: '请先登录',
      icon: 'none'
    })
    
    // 跳转到登录页
    uni.reLaunch({
      url: '/pages/login/login'
    })
    return false
  }
  
  // 检查页面权限
  if (!canAccessPage(pagePath)) {
    uni.showToast({
      title: '权限不足，无法访问',
      icon: 'none'
    })
    
    // 跳转到首页或上一页
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
 * 清除用户登录信息
 */
export function clearUserInfo() {
  uni.removeStorageSync('token')
  uni.removeStorageSync('userInfo')
}

/**
 * 登出
 */
export function logout() {
  clearUserInfo()
  uni.reLaunch({
    url: '/pages/login/login'
  })
}

/**
 * 角色显示名称映射
 */
export const ROLE_NAMES = {
  super_admin: '超级管理员',
  system_admin: '系统管理员',
  operation_admin: '运营管理员',
  team_admin: '团队管理员'
}

/**
 * 获取角色显示名称
 * @param {string} role - 角色代码
 * @returns {string}
 */
export function getRoleName(role) {
  return ROLE_NAMES[role] || role
}

/**
 * 权限显示名称映射
 */
export const PERMISSION_NAMES = {
  'user:read': '查看用户',
  'user:create': '创建用户',
  'user:update': '编辑用户',
  'user:delete': '删除用户',
  'team:read': '查看团队',
  'team:create': '创建团队',
  'team:update': '编辑团队',
  'team:delete': '删除团队',
  'activity:read': '查看活动',
  'activity:create': '创建活动',
  'activity:update': '编辑活动',
  'activity:delete': '删除活动',
  'content:read': '查看内容',
  'content:create': '创建内容',
  'content:update': '编辑内容',
  'content:delete': '删除内容',
  'system:read': '查看系统设置',
  'system:update': '修改系统设置'
}

/**
 * 获取权限显示名称
 * @param {string} permission - 权限代码
 * @returns {string}
 */
export function getPermissionName(permission) {
  return PERMISSION_NAMES[permission] || permission
}