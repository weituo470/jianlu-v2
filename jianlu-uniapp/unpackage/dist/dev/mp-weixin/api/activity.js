"use strict";
const utils_request = require("../utils/request.js");
const activityApi = {
  // 获取活动列表
  getList(params = {}) {
    return utils_request.get("/wechat/activities", params);
  },
  // 获取活动详情
  getDetail(id) {
    return utils_request.get(`/wechat/activities/${id}`);
  },
  // 创建活动
  create(data) {
    return utils_request.post("/wechat/activities", data);
  },
  // 更新活动
  update(id, data) {
    return utils_request.put(`/wechat/activities/${id}`, data);
  },
  // 删除活动
  delete(id) {
    return utils_request.del(`/wechat/activities/${id}`);
  },
  // 报名活动
  register(id, data) {
    return utils_request.post(`/wechat/activities/${id}/register`, data);
  },
  // 取消报名
  cancelRegistration(id) {
    return utils_request.del(`/wechat/activities/${id}/register`);
  },
  // 获取我的报名列表
  getMyRegistrations(params = {}) {
    return utils_request.get("/wechat/my-registrations", params);
  },
  // 获取活动报名列表（管理员）
  getRegistrations(id, params = {}) {
    return utils_request.get(`/wechat/activities/${id}/registrations`, params);
  },
  // 审核报名（管理员）
  approveRegistration(registrationId, approved = true) {
    return utils_request.post(`/wechat/registrations/${registrationId}/approve`, { approved });
  },
  // 批量审核报名（管理员）
  batchApproveRegistrations(registrationIds, approved = true) {
    return utils_request.post("/wechat/registrations/batch-approve", {
      registration_ids: registrationIds,
      approved
    });
  }
};
const activityTypes = {
  travel: {
    name: "旅游活动",
    icon: "🏖️",
    color: "#FF6B6B",
    description: "团建旅行、户外探险等"
  },
  meeting: {
    name: "会议活动",
    icon: "💼",
    color: "#4ECDC4",
    description: "技术分享、工作会议等"
  },
  social: {
    name: "社交活动",
    icon: "🎉",
    color: "#45B7D1",
    description: "聚餐、娱乐等"
  },
  learning: {
    name: "学习活动",
    icon: "📚",
    color: "#96CEB4",
    description: "培训、讲座等"
  },
  sports: {
    name: "运动活动",
    icon: "⚽",
    color: "#FFEAA7",
    description: "健身、比赛等"
  }
};
const activityStatus = {
  draft: {
    name: "草稿",
    color: "#BDC3C7",
    description: "活动尚未发布"
  },
  registration: {
    name: "报名中",
    color: "#3498DB",
    description: "正在接受报名"
  },
  ongoing: {
    name: "进行中",
    color: "#2ECC71",
    description: "活动正在进行"
  },
  completed: {
    name: "已结束",
    color: "#95A5A6",
    description: "活动已经结束"
  },
  cancelled: {
    name: "已取消",
    color: "#E74C3C",
    description: "活动已被取消"
  }
};
const registrationStatus = {
  pending: {
    name: "待审核",
    color: "#F39C12",
    description: "等待管理员审核"
  },
  approved: {
    name: "已通过",
    color: "#27AE60",
    description: "报名已通过"
  },
  rejected: {
    name: "已拒绝",
    color: "#E74C3C",
    description: "报名被拒绝"
  },
  cancelled: {
    name: "已取消",
    color: "#95A5A6",
    description: "用户取消报名"
  },
  waitlist: {
    name: "等待列表",
    color: "#8E44AD",
    description: "在等待列表中"
  }
};
const activityVisibility = {
  public: {
    name: "公开活动",
    icon: "🌍",
    description: "所有用户可见"
  },
  team: {
    name: "团队活动",
    icon: "👥",
    description: "仅团队成员可见"
  }
};
const activityUtils = {
  // 获取活动类型信息
  getTypeInfo(type) {
    return activityTypes[type] || { name: "未知类型", icon: "❓", color: "#BDC3C7" };
  },
  // 获取活动状态信息
  getStatusInfo(status) {
    return activityStatus[status] || { name: "未知状态", color: "#BDC3C7" };
  },
  // 获取报名状态信息
  getRegistrationStatusInfo(status) {
    return registrationStatus[status] || { name: "未知状态", color: "#BDC3C7" };
  },
  // 获取可见性信息
  getVisibilityInfo(visibility) {
    return activityVisibility[visibility] || { name: "未知", icon: "❓" };
  },
  // 格式化活动时间
  formatActivityTime(startTime, endTime) {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const formatDate = (date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      const hour = String(date.getHours()).padStart(2, "0");
      const minute = String(date.getMinutes()).padStart(2, "0");
      return `${year}-${month}-${day} ${hour}:${minute}`;
    };
    const isSameDay = start.toDateString() === end.toDateString();
    if (isSameDay) {
      return `${formatDate(start)} - ${end.getHours().toString().padStart(2, "0")}:${end.getMinutes().toString().padStart(2, "0")}`;
    } else {
      return `${formatDate(start)} - ${formatDate(end)}`;
    }
  },
  // 检查活动是否可以报名
  canRegister(activity) {
    const now = /* @__PURE__ */ new Date();
    const registrationDeadline = activity.registration_deadline ? new Date(activity.registration_deadline) : null;
    if (activity.status !== "registration") {
      return { canRegister: false, reason: "活动未开放报名" };
    }
    if (registrationDeadline && now > registrationDeadline) {
      return { canRegister: false, reason: "报名已截止" };
    }
    if (activity.max_participants > 0 && activity.registration_count >= activity.max_participants) {
      return { canRegister: false, reason: "报名人数已满" };
    }
    if (activity.user_registered) {
      return { canRegister: false, reason: "已经报名" };
    }
    return { canRegister: true };
  },
  // 获取活动进度百分比
  getProgressPercentage(activity) {
    if (!activity.max_participants || activity.max_participants <= 0) {
      return 0;
    }
    const percentage = activity.registration_count / activity.max_participants * 100;
    return Math.floor(Math.min(percentage, 100));
  }
};
exports.activityApi = activityApi;
exports.activityTypes = activityTypes;
exports.activityUtils = activityUtils;
//# sourceMappingURL=../../.sourcemap/mp-weixin/api/activity.js.map
