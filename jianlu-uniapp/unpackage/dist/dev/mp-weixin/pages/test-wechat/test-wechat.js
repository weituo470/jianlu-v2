"use strict";
const common_vendor = require("../../common/vendor.js");
const api_index = require("../../api/index.js");
const _sfc_main = {
  __name: "test-wechat",
  setup(__props) {
    const loading = common_vendor.ref(false);
    const testResult = common_vendor.ref("暂无测试结果");
    const systemInfo = common_vendor.ref({});
    const networkStatus = common_vendor.ref({});
    common_vendor.onMounted(() => {
      systemInfo.value = common_vendor.index.getSystemInfoSync();
      common_vendor.index.getNetworkType({
        success: (res) => {
          networkStatus.value = res;
        }
      });
    });
    const testWechatLogin = async () => {
      loading.value = true;
      testResult.value = "开始测试微信登录...";
      try {
        const networkType = await common_vendor.index.getNetworkType();
        if (networkType.networkType === "none") {
          throw new Error("网络不可用");
        }
        testResult.value += "\n网络状态正常";
        const loginResult = await common_vendor.index.login({
          provider: "weixin",
          onlyAuthorize: true,
          timeout: 1e4
        });
        if (loginResult.errMsg !== "login:ok") {
          throw new Error(`微信登录失败: ${loginResult.errMsg}`);
        }
        testResult.value += "\n微信授权成功";
        testResult.value += `
获取到code: ${loginResult.code.substring(0, 10)}...`;
        const response = await api_index.authApi.wechatLogin({ code: loginResult.code });
        if (response.success) {
          testResult.value += "\n后端API调用成功";
          testResult.value += "\n微信登录功能正常！";
        } else {
          throw new Error(`API响应失败: ${response.message}`);
        }
      } catch (error) {
        console.error("测试失败:", error);
        testResult.value += `
测试失败: ${error.message || error.errMsg || "未知错误"}`;
      } finally {
        loading.value = false;
      }
    };
    const testNetwork = async () => {
      loading.value = true;
      testResult.value = "开始测试网络连接...";
      try {
        const networkType = await common_vendor.index.getNetworkType();
        testResult.value += `
网络类型: ${networkType.networkType}`;
        if (networkType.networkType === "none") {
          throw new Error("网络不可用");
        }
        const response = await common_vendor.index.request({
          url: "https://www.baidu.com",
          method: "GET",
          timeout: 5e3
        });
        testResult.value += "\n网络连接正常";
      } catch (error) {
        testResult.value += `
网络测试失败: ${error.message || error.errMsg}`;
      } finally {
        loading.value = false;
      }
    };
    const testApi = async () => {
      loading.value = true;
      testResult.value = "开始测试API接口...";
      try {
        testResult.value += "\n1. 测试健康检查接口...";
        const healthResponse = await common_vendor.index.request({
          url: "http://192.168.100.4:8081/health",
          method: "GET",
          timeout: 5e3
        });
        if (healthResponse.statusCode === 200) {
          testResult.value += "\n   健康检查成功";
        } else {
          throw new Error(`健康检查失败: ${healthResponse.statusCode}`);
        }
        testResult.value += "\n2. 测试微信登录API...";
        const response = await api_index.authApi.wechatLogin({ code: "test_code_123" });
        testResult.value += "\n   API调用成功";
        testResult.value += `
   响应数据: ${JSON.stringify(response.data || response, null, 2)}`;
      } catch (error) {
        testResult.value += `
API测试失败: ${error.message || error.errMsg || JSON.stringify(error)}`;
        console.error("API测试详细错误:", error);
      } finally {
        loading.value = false;
      }
    };
    return (_ctx, _cache) => {
      return {
        a: common_vendor.t(loading.value ? "测试中..." : "测试微信登录"),
        b: common_vendor.o(testWechatLogin),
        c: loading.value,
        d: common_vendor.t(loading.value ? "测试中..." : "测试网络连接"),
        e: common_vendor.o(testNetwork),
        f: loading.value,
        g: common_vendor.t(loading.value ? "测试中..." : "测试API接口"),
        h: common_vendor.o(testApi),
        i: loading.value,
        j: common_vendor.t(testResult.value),
        k: common_vendor.t(systemInfo.value.platform),
        l: common_vendor.t(systemInfo.value.system),
        m: common_vendor.t(networkStatus.value.networkType)
      };
    };
  }
};
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["__scopeId", "data-v-c430c098"]]);
wx.createPage(MiniProgramPage);
