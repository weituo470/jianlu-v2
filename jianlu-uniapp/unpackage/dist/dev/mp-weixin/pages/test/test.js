"use strict";
const common_vendor = require("../../common/vendor.js");
const _sfc_main = {
  data() {
    return {
      result: "点击按钮开始测试"
    };
  },
  methods: {
    async testConnection() {
      this.result = "测试中...";
      try {
        const res = await common_vendor.index.request({
          url: "http://localhost:3001/health",
          method: "GET"
        });
        common_vendor.index.__f__("log", "at pages/test/test.vue:30", "连接测试结果:", res);
        this.result = `连接成功: ${JSON.stringify(res[1].data)}`;
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/test/test.vue:33", "连接测试失败:", error);
        this.result = `连接失败: ${error.message}`;
      }
    },
    async testLogin() {
      this.result = "登录测试中...";
      try {
        const res = await common_vendor.index.request({
          url: "http://localhost:3001/api/auth/login",
          method: "POST",
          header: {
            "Content-Type": "application/json"
          },
          data: {
            username: "admin",
            password: "password"
          }
        });
        common_vendor.index.__f__("log", "at pages/test/test.vue:52", "登录测试结果:", res);
        this.result = `登录成功: ${JSON.stringify(res[1].data)}`;
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/test/test.vue:55", "登录测试失败:", error);
        this.result = `登录失败: ${error.message}`;
      }
    }
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return {
    a: common_vendor.o((...args) => $options.testConnection && $options.testConnection(...args)),
    b: common_vendor.o((...args) => $options.testLogin && $options.testLogin(...args)),
    c: common_vendor.t($data.result)
  };
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-727d09f0"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/test/test.js.map
