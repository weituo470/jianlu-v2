"use strict";
const common_vendor = require("../../common/vendor.js");
const api_index = require("../../api/index.js");
const utils_index = require("../../utils/index.js");
const _sfc_main = {
  data() {
    return {
      userInfo: {},
      stats: {},
      showModal: false,
      saving: false,
      editForm: {
        nickname: "",
        avatar: "",
        bio: ""
      }
    };
  },
  onLoad() {
    this.loadUserInfo();
    this.loadStats();
  },
  onShow() {
    this.loadUserInfo();
    this.loadStats();
  },
  methods: {
    // 加载用户信息
    loadUserInfo() {
      this.userInfo = common_vendor.index.getStorageSync("userInfo") || {};
    },
    // 加载统计信息
    async loadStats() {
      try {
        const response = await api_index.userApi.getStats();
        if (response.success) {
          this.stats = response.data;
        }
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/profile/profile.vue:184", "获取统计信息失败:", error);
      }
    },
    // 显示编辑弹窗
    showEditModal() {
      this.editForm = {
        nickname: this.userInfo.nickname || "",
        avatar: this.userInfo.avatar || "",
        bio: this.userInfo.bio || ""
      };
      this.showModal = true;
    },
    // 隐藏编辑弹窗
    hideModal() {
      this.showModal = false;
    },
    // 保存资料
    async saveProfile() {
      this.saving = true;
      try {
        const response = await api_index.userApi.updateProfile(this.editForm);
        if (response.success) {
          const updatedUserInfo = { ...this.userInfo, ...this.editForm };
          common_vendor.index.setStorageSync("userInfo", updatedUserInfo);
          this.userInfo = updatedUserInfo;
          utils_index.showSuccess("资料更新成功");
          this.hideModal();
        }
      } catch (error) {
        utils_index.showError("更新失败");
      } finally {
        this.saving = false;
      }
    },
    // 跳转页面
    goToPage(url) {
      if (url.includes("/pages/home/home") || url.includes("/pages/team/team") || url.includes("/pages/activity/activity") || url.includes("/pages/message/message")) {
        common_vendor.index.switchTab({ url });
      } else {
        common_vendor.index.navigateTo({ url });
      }
    },
    // 显示关于信息
    showAbout() {
      common_vendor.index.showModal({
        title: "关于简庐团队",
        content: "简庐团队 v1.0.0\n\n一个现代化的团队协作和活动管理平台。\n\n高效协作，共创未来！",
        showCancel: false
      });
    },
    // 退出登录
    async logout() {
      const confirmed = await utils_index.showConfirm("确定要退出登录吗？");
      if (!confirmed)
        return;
      common_vendor.index.removeStorageSync("token");
      common_vendor.index.removeStorageSync("userInfo");
      utils_index.showSuccess("已退出登录");
      setTimeout(() => {
        common_vendor.index.reLaunch({
          url: "/pages/login/login"
        });
      }, 1e3);
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
    e: common_vendor.t($data.userInfo.email),
    f: common_vendor.o((...args) => $options.showEditModal && $options.showEditModal(...args)),
    g: $data.userInfo.bio
  }, $data.userInfo.bio ? {
    h: common_vendor.t($data.userInfo.bio)
  } : {}, {
    i: common_vendor.t($data.stats.teamCount || 0),
    j: common_vendor.t($data.stats.activityCount || 0),
    k: common_vendor.t($data.stats.messageCount || 0),
    l: common_vendor.o(($event) => $options.goToPage("/pages/home/home")),
    m: common_vendor.o(($event) => $options.goToPage("/pages/team/team")),
    n: common_vendor.o(($event) => $options.goToPage("/pages/activity/activity")),
    o: common_vendor.o(($event) => $options.goToPage("/pages/message/message")),
    p: common_vendor.o((...args) => $options.showAbout && $options.showAbout(...args)),
    q: common_vendor.o((...args) => $options.logout && $options.logout(...args)),
    r: $data.showModal
  }, $data.showModal ? {
    s: common_vendor.o((...args) => $options.hideModal && $options.hideModal(...args)),
    t: $data.editForm.nickname,
    v: common_vendor.o(($event) => $data.editForm.nickname = $event.detail.value),
    w: $data.editForm.avatar,
    x: common_vendor.o(($event) => $data.editForm.avatar = $event.detail.value),
    y: $data.editForm.bio,
    z: common_vendor.o(($event) => $data.editForm.bio = $event.detail.value),
    A: common_vendor.o((...args) => $options.hideModal && $options.hideModal(...args)),
    B: common_vendor.t($data.saving ? "保存中..." : "保存"),
    C: common_vendor.o((...args) => $options.saveProfile && $options.saveProfile(...args)),
    D: $data.saving,
    E: common_vendor.o(() => {
    }),
    F: common_vendor.o((...args) => $options.hideModal && $options.hideModal(...args))
  } : {});
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-dd383ca2"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/profile/profile.js.map
