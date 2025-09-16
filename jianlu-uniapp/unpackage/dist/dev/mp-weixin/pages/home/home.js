"use strict";
const common_vendor = require("../../common/vendor.js");
const api_index = require("../../api/index.js");
const utils_index = require("../../utils/index.js");
const config_env = require("../../config/env.js");
const _sfc_main = {
  data() {
    return {
      userInfo: {},
      unreadCount: 0,
      recentActivities: [],
      myTeams: [],
      bannerList: [],
      // 轮播图列表
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
          this.loadBanners(),
          this.loadRecentActivities(),
          this.loadMyTeams(),
          this.loadUnreadCount()
        ]);
      } catch (error) {
        console.error("加载数据失败:", error);
      } finally {
        this.loading = false;
      }
    },
    // 加载轮播图
    async loadBanners() {
      try {
        const response = await api_index.bannerApi.getList();
        if (response.success) {
          this.bannerList = Array.isArray(response.data) ? response.data : [];
          console.log("轮播图加载成功:", this.bannerList.length, "张");
        } else {
          console.error("轮播图加载失败:", response.message);
          this.bannerList = [];
        }
      } catch (error) {
        console.error("轮播图加载异常:", error);
        this.bannerList = [];
      }
    },
    // 加载最近活动
    async loadRecentActivities() {
      try {
        const response = await api_index.activityApi.getList();
        if (response.success) {
          const activities = response.data.activities || response.data || [];
          this.recentActivities = Array.isArray(activities) ? activities.slice(0, 3) : [];
        }
      } catch (error) {
        console.error("加载活动失败:", error);
      }
    },
    // 加载我的团队
    async loadMyTeams() {
      try {
        const response = await api_index.groupApi.getList();
        if (response.success) {
          const teams = response.data.teams || response.data || [];
          this.myTeams = Array.isArray(teams) ? teams.slice(0, 3) : [];
        }
      } catch (error) {
        console.error("加载团队失败:", error);
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
    // 处理图片URL
    getImageUrl(imageUrl) {
      if (!imageUrl)
        return "";
      if (imageUrl.startsWith("http://") || imageUrl.startsWith("https://")) {
        return imageUrl;
      }
      const baseUrl = config_env.envConfig.IMAGE_BASE_URL;
      return baseUrl + (imageUrl.startsWith("/") ? imageUrl : "/" + imageUrl);
    },
    // 图片加载错误处理
    onImageError(e) {
      console.error("图片加载失败:", e);
      common_vendor.index.showToast({
        title: "图片加载失败",
        icon: "none",
        duration: 2e3
      });
    },
    // Banner 点击事件
    onBannerTap(banner) {
      console.log("点击轮播图:", banner);
      if (banner.link_url) {
        if (banner.link_url.startsWith("http://") || banner.link_url.startsWith("https://")) {
          common_vendor.index.setClipboardData({
            data: banner.link_url,
            success: () => {
              common_vendor.index.showModal({
                title: "提示",
                content: "链接已复制到剪贴板，请在浏览器中打开",
                showCancel: false
              });
            }
          });
        } else {
          if (banner.link_url.startsWith("/")) {
            common_vendor.index.navigateTo({
              url: banner.link_url
            }).catch(() => {
              common_vendor.index.switchTab({
                url: banner.link_url
              }).catch(() => {
                common_vendor.index.showToast({
                  title: "页面跳转失败",
                  icon: "none"
                });
              });
            });
          }
        }
      } else {
        common_vendor.index.showModal({
          title: banner.title || "轮播图",
          content: banner.description || "暂无描述",
          showCancel: false
        });
      }
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
    a: $data.bannerList.length > 0
  }, $data.bannerList.length > 0 ? {
    b: common_vendor.f($data.bannerList, (banner, k0, i0) => {
      return common_vendor.e({
        a: $options.getImageUrl(banner.image_url),
        b: common_vendor.o((...args) => $options.onImageError && $options.onImageError(...args), banner.id),
        c: banner.title || banner.description
      }, banner.title || banner.description ? common_vendor.e({
        d: banner.title
      }, banner.title ? {
        e: common_vendor.t(banner.title)
      } : {}, {
        f: banner.description
      }, banner.description ? {
        g: common_vendor.t(banner.description)
      } : {}) : {}, {
        h: banner.id,
        i: common_vendor.o(($event) => $options.onBannerTap(banner), banner.id)
      });
    })
  } : {}, {
    c: $data.userInfo.avatar
  }, $data.userInfo.avatar ? {
    d: $data.userInfo.avatar
  } : {
    e: common_vendor.t(($data.userInfo.nickname || $data.userInfo.username || "").charAt(0))
  }, {
    f: common_vendor.t($data.userInfo.nickname || $data.userInfo.username),
    g: $data.unreadCount > 0
  }, $data.unreadCount > 0 ? {
    h: common_vendor.t($data.unreadCount > 99 ? "99+" : $data.unreadCount)
  } : {}, {
    i: common_vendor.o((...args) => $options.goToMessages && $options.goToMessages(...args)),
    j: common_vendor.o((...args) => $options.createTeam && $options.createTeam(...args)),
    k: common_vendor.o((...args) => $options.createActivity && $options.createActivity(...args)),
    l: common_vendor.o((...args) => $options.joinTeam && $options.joinTeam(...args)),
    m: common_vendor.o((...args) => $options.viewCalendar && $options.viewCalendar(...args)),
    n: common_vendor.o((...args) => $options.goToActivities && $options.goToActivities(...args)),
    o: $data.recentActivities.length > 0
  }, $data.recentActivities.length > 0 ? {
    p: common_vendor.f($data.recentActivities, (activity, k0, i0) => {
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
    q: common_vendor.o((...args) => $options.goToTeams && $options.goToTeams(...args)),
    r: $data.myTeams.length > 0
  }, $data.myTeams.length > 0 ? {
    s: common_vendor.f($data.myTeams, (team, k0, i0) => {
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
