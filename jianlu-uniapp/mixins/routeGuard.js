// 路由守卫混入
import { permissionGuard } from '../utils/permission.js'

export default {
  onLoad() {
    // 页面加载时检查权限
    this.checkPagePermission()
  },
  
  onShow() {
    // 页面显示时检查权限（处理从其他页面返回的情况）
    this.checkPagePermission()
  },
  
  methods: {
    /**
     * 检查页面权限
     */
    async checkPagePermission() {
      // 获取当前页面路径
      const pages = getCurrentPages()
      const currentPage = pages[pages.length - 1]
      const pagePath = '/' + currentPage.route
      
      console.log('检查页面权限:', pagePath)
      
      // 执行权限检查
      const hasAccess = await permissionGuard(pagePath)
      
      if (!hasAccess) {
        console.log('页面权限检查失败:', pagePath)
        // 权限检查失败，permissionGuard 已经处理了跳转
        return false
      }
      
      console.log('页面权限检查通过:', pagePath)
      return true
    }
  }
}