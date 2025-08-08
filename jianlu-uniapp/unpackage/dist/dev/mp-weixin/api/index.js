"use strict";
const utils_request = require("../utils/request.js");
const authApi = {
  // 用户登录
  login: (data) => utils_request.post("/auth/login", data),
  // 用户注册
  register: (data) => utils_request.post("/auth/register", data)
};
const groupApi = {
  // 获取群组列表（所有可加入的团队）
  getList: () => utils_request.get("/group"),
  // 获取我的团队列表
  getMyTeams: () => utils_request.get("/wechat/my-teams"),
  // 获取群组详情
  getDetail: (id) => utils_request.get(`/group/${id}`),
  // 创建群组
  create: (data) => utils_request.post("/group", data),
  // 加入群组
  join: (id) => utils_request.post(`/group/${id}/join`),
  // 离开群组
  leave: (id) => utils_request.post(`/group/${id}/leave`),
  // 申请加入团队
  apply: (id, data) => utils_request.post(`/wechat/teams/${id}/apply`, data),
  // 获取我的申请记录
  getMyApplications: (params) => utils_request.get("/wechat/teams/my-applications", { params }),
  // 获取团队申请列表（团队负责人）
  getTeamApplications: (id, params) => utils_request.get(`/wechat/teams/${id}/applications`, { params }),
  // 处理申请（批准/拒绝）
  processApplication: (applicationId, data) => utils_request.put(`/wechat/teams/applications/${applicationId}`, data),
  // 获取申请统计
  getApplicationStats: (id) => utils_request.get(`/wechat/teams/${id}/application-stats`),
  // 获取团队成员列表
  getTeamMembers: (id, params) => utils_request.get(`/wechat/teams/${id}/members`, { params }),
  // 获取团队详情
  getTeamDetail: (id) => utils_request.get(`/wechat/teams/${id}`)
};
const activityApi = {
  // 获取活动列表
  getList: (params = {}) => {
    if (typeof params === "string" || typeof params === "number") {
      return utils_request.get(`/activity?group_id=${params}`);
    }
    return utils_request.get("/wechat/activities", params);
  },
  // 获取活动详情
  getDetail: (id) => utils_request.get(`/wechat/activities/${id}`),
  // 创建活动
  create: (data) => utils_request.post("/wechat/activities", data),
  // 更新活动
  update: (id, data) => utils_request.put(`/wechat/activities/${id}`, data),
  // 删除活动
  delete: (id) => utils_request.del(`/wechat/activities/${id}`),
  // 报名活动
  register: (id, data) => utils_request.post(`/wechat/activities/${id}/register`, data),
  // 取消报名
  cancelRegistration: (id) => utils_request.del(`/wechat/activities/${id}/register`),
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
  search: (query) => utils_request.get(`/user/search?q=${encodeURIComponent(query)}`),
  // 获取用户统计
  getStats: () => utils_request.get("/user/stats")
};
exports.activityApi = activityApi;
exports.authApi = authApi;
exports.groupApi = groupApi;
exports.userApi = userApi;
//# sourceMappingURL=../../.sourcemap/mp-weixin/api/index.js.map
