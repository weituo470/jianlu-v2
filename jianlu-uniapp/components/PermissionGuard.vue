<template>
  <view v-if="hasAccess">
    <slot></slot>
  </view>
  <view v-else-if="showNoPermission" class="no-permission">
    <view class="no-permission-icon">🔒</view>
    <text class="no-permission-text">{{ noPermissionText }}</text>
  </view>
</template>

<script setup>
import { computed, defineProps } from 'vue'
import { hasPermission, hasRole, isLoggedIn } from '../utils/permission.js'

const props = defineProps({
  // 需要的权限
  permissions: {
    type: [String, Array],
    default: null
  },
  // 需要的角色
  roles: {
    type: [String, Array],
    default: null
  },
  // 是否显示无权限提示
  showNoPermission: {
    type: Boolean,
    default: false
  },
  // 无权限提示文本
  noPermissionText: {
    type: String,
    default: '权限不足，无法查看此内容'
  },
  // 权限检查模式：'and' 表示需要同时满足所有条件，'or' 表示满足任一条件即可
  mode: {
    type: String,
    default: 'or',
    validator: (value) => ['and', 'or'].includes(value)
  }
})

// 计算是否有访问权限
const hasAccess = computed(() => {
  // 如果没有设置权限和角色要求，则允许访问
  if (!props.permissions && !props.roles) {
    return isLoggedIn()
  }
  
  let permissionCheck = true
  let roleCheck = true
  
  // 检查权限
  if (props.permissions) {
    permissionCheck = hasPermission(props.permissions)
  }
  
  // 检查角色
  if (props.roles) {
    roleCheck = hasRole(props.roles)
  }
  
  // 根据模式返回结果
  if (props.mode === 'and') {
    // 需要同时满足权限和角色要求
    return permissionCheck && roleCheck
  } else {
    // 满足权限或角色要求之一即可
    if (props.permissions && props.roles) {
      return permissionCheck || roleCheck
    } else if (props.permissions) {
      return permissionCheck
    } else if (props.roles) {
      return roleCheck
    }
    return false
  }
})
</script>

<style scoped>
.no-permission {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40rpx;
  color: #999;
}

.no-permission-icon {
  font-size: 80rpx;
  margin-bottom: 20rpx;
}

.no-permission-text {
  font-size: 28rpx;
  text-align: center;
  line-height: 1.5;
}
</style>