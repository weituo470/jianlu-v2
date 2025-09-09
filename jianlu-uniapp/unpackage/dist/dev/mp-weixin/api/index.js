"use strict";
const utils_request = require("../utils/request.js");
const authApi = {
  // 用户登录
  login: (data) => utils_request.post("/auth/login", data),
  // 用户注册
  register: (data) => utils_request.post("/auth/register", data),
  // 微信登录
  wechatLogin: (data) => utils_request.post("/auth/wechat-login", data)
};
const bannerApi = {
  // 获取轮播图列表（只获取激活的）
  getList: () => utils_request.get("/banners/public/active")
};
const groupApi = {
  // 获取群组列表（所有可加入的团队）
  getList: () => utils_request.get("/miniapp/teams"),
  // 获取我的团队列表
  getMyTeams: () => utils_request.get("/miniapp/my-teams"),
  // 获取群组详情
  getDetail: (id) => utils_request.get(`/miniapp/teams/${id}`),
  // 创建群组
  create: (data) => utils_request.post("/miniapp/teams", data),
  // 加入群组
  join: (id) => utils_request.post(`/miniapp/teams/${id}/join`),
  // 离开群组
  leave: (id) => utils_request.post(`/miniapp/teams/${id}/leave`),
  // 申请加入团队
  apply: (id, data) => utils_request.post(`/miniapp/teams/${id}/apply`, data),
  // 获取我的申请记录
  getMyApplications: (params) => utils_request.get("/miniapp/teams/my-applications", { params }),
  // 获取团队申请列表（团队负责人）
  getTeamApplications: (id, params) => utils_request.get(`/miniapp/teams/${id}/applications`, { params }),
  // 处理申请（批准/拒绝）
  processApplication: (applicationId, data) => utils_request.put(`/miniapp/teams/applications/${applicationId}`, data),
  // 获取申请统计
  getApplicationStats: (id) => utils_request.get(`/miniapp/teams/${id}/application-stats`),
  // 获取团队成员列表
  getTeamMembers: (id, params) => utils_request.get(`/miniapp/teams/${id}/members`, { params }),
  // 获取团队详情
  getTeamDetail: (id) => utils_request.get(`/miniapp/teams/${id}`)
};
const activityApi = {
  // 获取活动列表
  getList: (params = {}) => {
    if (typeof params === "string" || typeof params === "number") {
      return utils_request.get(`/activity?group_id=${params}`);
    }
    return utils_request.get("/miniapp/activities", params);
  },
  // 获取活动详情
  getDetail: (id) => utils_request.get(`/miniapp/activities/${id}`),
  // 创建活动
  create: (data) => utils_request.post("/miniapp/activities", data),
  // 更新活动
  update: (id, data) => utils_request.put(`/miniapp/activities/${id}`, data),
  // 删除活动
  delete: (id) => utils_request.del(`/miniapp/activities/${id}`),
  // 报名活动
  register: (id, data) => utils_request.post(`/miniapp/activities/${id}/register`, data),
  // 取消报名
  cancelRegistration: (id) => utils_request.del(`/miniapp/activities/${id}/register`),
  // 获取活动类型列表
  getTypes: () => utils_request.get("/miniapp/activity-types"),
  // 参加活动（兼容旧版本）
  join: (id) => utils_request.post(`/activity/${id}/join`),
  // 取消参加活动（兼容旧版本）
  leave: (id) => utils_request.post(`/activity/${id}/leave`)
};
const userApi = {
  // 获取用户信息
  getProfile: () => utils_request.get("/user/profile"),
  // 更新用户信息
  updateProfile: (data) => utils_request.put("/user/profile", data),
  // 搜索用户
  search: (query) => utils_request.get(`/user/search?q=${encodeURIComponent(query)}`)
};
exports.activityApi = activityApi;
exports.authApi = authApi;
exports.bannerApi = bannerApi;
exports.groupApi = groupApi;
exports.userApi = userApi;
//# sourceMappingURL=../../.sourcemap/mp-weixin/api/index.js.map
