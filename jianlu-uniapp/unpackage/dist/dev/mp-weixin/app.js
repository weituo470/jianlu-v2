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
  "./pages/dinner-party-create/dinner-party-create.js";
  "./pages/profile/profile.js";
  "./pages/test/test.js";
  "./pages/test-wechat/test-wechat.js";
}
const _sfc_main = {
  onLaunch: function() {
    {
      console.log("简庐日记小程序启动");
    }
    this.checkLoginStatus();
  },
  onShow: function() {
    {
      console.log("简庐日记小程序显示");
    }
  },
  onHide: function() {
    {
      console.log("简庐日记小程序隐藏");
    }
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
    console.error("Vue Error:", err, info);
  };
  return {
    app
  };
}
createApp().app.mount("#app");
exports.createApp = createApp;
