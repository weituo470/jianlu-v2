"use strict";
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const common_vendor = require("./common/vendor.js");
if (!Math) {
  "./pages/login/login.js";
  "./pages/home/home.js";
  "./pages/message/message.js";
  "./pages/team/team.js";
  "./pages/team-browse/team-browse.js";
  "./pages/team-applications/team-applications.js";
  "./pages/team-detail/team-detail.js";
  "./pages/activity/activity.js";
  "./pages/activity-detail/activity-detail.js";
  "./pages/activity-create/activity-create.js";
  "./pages/profile/profile.js";
  "./pages/test/test.js";
}
const _sfc_main = {
  onLaunch: function() {
    common_vendor.index.__f__("log", "at App.vue:4", "简庐日记小程序启动");
    this.checkLoginStatus();
  },
  onShow: function() {
    common_vendor.index.__f__("log", "at App.vue:10", "简庐日记小程序显示");
  },
  onHide: function() {
    common_vendor.index.__f__("log", "at App.vue:13", "简庐日记小程序隐藏");
  },
  methods: {
    checkLoginStatus() {
      const token = common_vendor.index.getStorageSync("token");
      if (!token) {
        common_vendor.index.reLaunch({
          url: "/pages/login/login"
        });
      } else {
        common_vendor.index.switchTab({
          url: "/pages/home/home"
        });
      }
    }
  }
};
function createApp() {
  const app = common_vendor.createSSRApp(_sfc_main);
  app.config.globalProperties.$baseUrl = "http://localhost:3458/api";
  app.config.errorHandler = (err, vm, info) => {
    common_vendor.index.__f__("error", "at main.js:12", "Vue Error:", err, info);
  };
  return {
    app
  };
}
createApp().app.mount("#app");
exports.createApp = createApp;
//# sourceMappingURL=../.sourcemap/mp-weixin/app.js.map
