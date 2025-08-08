"use strict";
const common_vendor = require("../../common/vendor.js");
const api_index = require("../../api/index.js");
const utils_index = require("../../utils/index.js");
const _sfc_main = {
  data() {
    return {
      userInfo: {},
      unreadCount: 0,
      recentActivities: [],
      myTeams: [],
      loading: false
    };
  },
  onLoad() {
    this.userInfo = common_vendor.index.getStorageSync("userInfo") || {};
    this.loadData();
  },
  onShow() {
    this.loadData();
  },
  onPullDownRefresh() {
    this.loadData().finally(() => {
      common_vendor.index.stopPullDownRefresh();
    });
  },
  methods: {
    formatDate: utils_index.formatDate,
    getActivityStatus: utils_index.getActivityStatus,
    getActivityStatusText: utils_index.getActivityStatusText,
    // 加载数据
    async loadData() {
      this.loading = true;
      try {
        await Promise.all([
          this.loadRecentActivities(),
          this.loadMyTeams(),
          this.loadUnreadCount()
        ]);
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/home/home.vue:160", "加载数据失败:", error);
      } finally {
        this.loading = false;
      }
    },
    // 加载最近活动
    async loadRecentActivities() {
      try {
        const response = await api_index.activityApi.getList();
        if (response.success) {
          this.recentActivities = response.data.slice(0, 3);
        }
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/home/home.vue:174", "加载活动失败:", error);
      }
    },
    // 加载我的团队
    async loadMyTeams() {
      try {
        const response = await api_index.groupApi.getList();
        if (response.success) {
          this.myTeams = response.data.slice(0, 3);
        }
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/home/home.vue:186", "加载团队失败:", error);
      }
    },
    // 加载未读消息数量
    async loadUnreadCount() {
      this.unreadCount = 0;
    },
    // 跳转到消息页面
    goToMessages() {
      common_vendor.index.switchTab({
        url: "/pages/message/message"
      });
    },
    // 跳转到活动页面
    goToActivities() {
      common_vendor.index.switchTab({
        url: "/pages/activity/activity"
      });
    },
    // 跳转到团队页面
    goToTeams() {
      common_vendor.index.switchTab({
        url: "/pages/team/team"
      });
    },
    // 创建团队
    createTeam() {
      common_vendor.index.switchTab({
        url: "/pages/team/team"
      });
    },
    // 发起活动
    createActivity() {
      common_vendor.index.switchTab({
        url: "/pages/activity/activity"
      });
    },
    // 加入团队
    joinTeam() {
      common_vendor.index.showModal({
        title: "加入团队",
        content: "请输入团队邀请码",
        editable: true,
        success: (res) => {
          if (res.confirm && res.content) {
            utils_index.showSuccess("加入团队成功");
            this.loadMyTeams();
          }
        }
      });
    },
    // 查看日程
    viewCalendar() {
      common_vendor.index.showToast({
        title: "功能开发中",
        icon: "none"
      });
    },
    // 查看活动详情
    viewActivity(activity) {
      common_vendor.index.showModal({
        title: activity.title,
        content: `时间: ${utils_index.formatDate(activity.start_time, "YYYY年MM月DD日 HH:mm")}
团队: ${activity.team_name}`,
        showCancel: false
      });
    },
    // 查看团队详情
    viewTeam(team) {
      common_vendor.index.showModal({
        title: team.name,
        content: `成员数量: ${team.member_count}
我的角色: ${team.role === "admin" ? "管理员" : "成员"}`,
        showCancel: false
      });
    }
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: $data.userInfo.avatar
  }, $data.userInfo.avatar ? {
    b: $data.userInfo.avatar
  } : {
    c: common_vendor.t(($data.userInfo.nickname || $data.userInfo.username || "").charAt(0))
  }, {
    d: common_vendor.t($data.userInfo.nickname || $data.userInfo.username),
    e: $data.unreadCount > 0
  }, $data.unreadCount > 0 ? {
    f: common_vendor.t($data.unreadCount > 99 ? "99+" : $data.unreadCount)
  } : {}, {
    g: common_vendor.o((...args) => $options.goToMessages && $options.goToMessages(...args)),
    h: common_vendor.o((...args) => $options.createTeam && $options.createTeam(...args)),
    i: common_vendor.o((...args) => $options.createActivity && $options.createActivity(...args)),
    j: common_vendor.o((...args) => $options.joinTeam && $options.joinTeam(...args)),
    k: common_vendor.o((...args) => $options.viewCalendar && $options.viewCalendar(...args)),
    l: common_vendor.o((...args) => $options.goToActivities && $options.goToActivities(...args)),
    m: $data.recentActivities.length > 0
  }, $data.recentActivities.length > 0 ? {
    n: common_vendor.f($data.recentActivities, (activity, k0, i0) => {
      return {
        a: common_vendor.t(activity.title),
        b: common_vendor.t(activity.team_name),
        c: common_vendor.t($options.formatDate(activity.start_time, "MM月DD日 HH:mm")),
        d: common_vendor.t($options.getActivityStatusText(activity.start_time, activity.end_time)),
        e: common_vendor.n($options.getActivityStatus(activity.start_time, activity.end_time)),
        f: activity.id,
        g: common_vendor.o(($event) => $options.viewActivity(activity), activity.id)
      };
    })
  } : {}, {
    o: common_vendor.o((...args) => $options.goToTeams && $options.goToTeams(...args)),
    p: $data.myTeams.length > 0
  }, $data.myTeams.length > 0 ? {
    q: common_vendor.f($data.myTeams, (team, k0, i0) => {
      return {
        a: common_vendor.t(team.name.charAt(0)),
        b: common_vendor.t(team.name),
        c: common_vendor.t(team.member_count),
        d: common_vendor.t(team.role === "admin" ? "管理员" : "成员"),
        e: common_vendor.n(team.role),
        f: team.id,
        g: common_vendor.o(($event) => $options.viewTeam(team), team.id)
      };
    })
  } : {});
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-07e72d3c"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/home/home.js.map
