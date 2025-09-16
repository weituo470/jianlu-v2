"use strict";
const common_vendor = require("../../common/vendor.js");
const api_index = require("../../api/index.js");
const utils_index = require("../../utils/index.js");
const _sfc_main = {
  __name: "login",
  setup(__props) {
    const statusBarHeight = common_vendor.ref(0);
    const isLogin = common_vendor.ref(true);
    const showPassword = common_vendor.ref(false);
    const loading = common_vendor.ref(false);
    const loginForm = common_vendor.reactive({
      username: "",
      password: ""
    });
    const registerForm = common_vendor.reactive({
      username: "",
      email: "",
      nickname: "",
      password: "",
      confirmPassword: ""
    });
    common_vendor.onMounted(() => {
      const systemInfo = common_vendor.index.getSystemInfoSync();
      statusBarHeight.value = systemInfo.statusBarHeight;
    });
    const toggleMode = () => {
      isLogin.value = !isLogin.value;
      clearForms();
    };
    const togglePassword = () => {
      showPassword.value = !showPassword.value;
    };
    const clearForms = () => {
      Object.assign(loginForm, {
        username: "",
        password: ""
      });
      Object.assign(registerForm, {
        username: "",
        email: "",
        nickname: "",
        password: "",
        confirmPassword: ""
      });
    };
    const handleLogin = async () => {
      if (!loginForm.username || !loginForm.password) {
        utils_index.showError("请填写用户名和密码");
        return;
      }
      loading.value = true;
      console.log("开始登录，用户名:", loginForm.username);
      try {
        console.log("发送登录请求到:", "http://localhost:3458/api/auth/login");
        console.log("登录数据:", loginForm);
        const response = await api_index.authApi.login(loginForm);
        console.log("登录响应:", response);
        if (response.success) {
          common_vendor.index.setStorageSync("token", response.data.token);
          common_vendor.index.setStorageSync("userInfo", response.data.user);
          console.log("登录成功，token已保存");
          utils_index.showSuccess("登录成功");
          setTimeout(() => {
            common_vendor.index.switchTab({
              url: "/pages/home/home"
            });
          }, 1e3);
        } else {
          console.error("登录失败，响应:", response);
          utils_index.showError(response.message || "登录失败");
        }
      } catch (error) {
        console.error("登录异常:", error);
        utils_index.showError(`登录失败: ${error.message || "网络错误"}`);
      } finally {
        loading.value = false;
      }
    };
    const handleRegister = async () => {
      const { username, email, password, confirmPassword, nickname } = registerForm;
      if (!username || !email || !password) {
        utils_index.showError("请填写必要信息");
        return;
      }
      if (password !== confirmPassword) {
        utils_index.showError("两次输入的密码不一致");
        return;
      }
      loading.value = true;
      try {
        const response = await api_index.authApi.register({
          username,
          email,
          password,
          nickname
        });
        if (response.success) {
          common_vendor.index.setStorageSync("token", response.data.token);
          common_vendor.index.setStorageSync("userInfo", response.data.user);
          utils_index.showSuccess("注册成功");
          setTimeout(() => {
            common_vendor.index.switchTab({
              url: "/pages/home/home"
            });
          }, 1e3);
        } else {
          utils_index.showError(response.message || "注册失败");
        }
      } catch (error) {
        utils_index.showError(error.message || "注册失败");
      } finally {
        loading.value = false;
      }
    };
    const handleWechatLogin = async () => {
      loading.value = true;
      try {
        console.log("开始微信登录");
        const networkType = await common_vendor.index.getNetworkType();
        if (networkType.networkType === "none") {
          throw new Error("网络不可用，请检查网络连接");
        }
        const loginResult = await common_vendor.index.login({
          provider: "weixin",
          onlyAuthorize: true,
          timeout: 1e4
          // 10秒超时
        });
        if (loginResult.errMsg !== "login:ok") {
          throw new Error("微信登录授权失败");
        }
        const { code } = loginResult;
        console.log("获取微信登录code成功:", code);
        const response = await api_index.authApi.wechatLogin({ code });
        console.log("微信登录响应:", response);
        if (response.success) {
          common_vendor.index.setStorageSync("token", response.data.token);
          common_vendor.index.setStorageSync("userInfo", response.data.user);
          console.log("微信登录成功，token已保存");
          utils_index.showSuccess("登录成功");
          setTimeout(() => {
            common_vendor.index.switchTab({
              url: "/pages/home/home"
            });
          }, 1e3);
        } else {
          console.error("微信登录失败，响应:", response);
          utils_index.showError(response.message || "微信登录失败");
        }
      } catch (error) {
        console.error("微信登录异常:", error);
        if (error.errMsg) {
          if (error.errMsg.includes("auth deny")) {
            utils_index.showError("请授权微信登录以继续使用");
          } else if (error.errMsg.includes("timeout")) {
            utils_index.showError("微信登录超时，请重试");
          } else if (error.errMsg.includes("network")) {
            utils_index.showError("网络连接失败，请检查网络设置");
          } else {
            utils_index.showError(`微信登录失败: ${error.errMsg}`);
          }
        } else if (error.message) {
          if (error.message.includes("网络")) {
            utils_index.showError("网络连接失败，请检查网络设置");
          } else {
            utils_index.showError(error.message);
          }
        } else {
          utils_index.showError("微信登录失败，请重试");
        }
      } finally {
        loading.value = false;
      }
    };
    return (_ctx, _cache) => {
      return common_vendor.e({
        a: statusBarHeight.value + "px",
        b: common_vendor.t(isLogin.value ? "记录生活，分享美好" : "开始您的日记之旅"),
        c: isLogin.value
      }, isLogin.value ? {
        d: loading.value,
        e: loginForm.username,
        f: common_vendor.o(($event) => loginForm.username = $event.detail.value),
        g: showPassword.value ? "text" : "password",
        h: loading.value,
        i: loginForm.password,
        j: common_vendor.o(($event) => loginForm.password = $event.detail.value),
        k: common_vendor.t(showPassword.value ? "👁️" : "👁️‍🗨️"),
        l: common_vendor.o(togglePassword),
        m: common_vendor.t(loading.value ? "登录中..." : "登录"),
        n: common_vendor.o(handleLogin),
        o: loading.value,
        p: common_vendor.t(loading.value ? "登录中..." : "微信登录"),
        q: common_vendor.o(handleWechatLogin),
        r: loading.value
      } : {
        s: loading.value,
        t: registerForm.username,
        v: common_vendor.o(($event) => registerForm.username = $event.detail.value),
        w: loading.value,
        x: registerForm.email,
        y: common_vendor.o(($event) => registerForm.email = $event.detail.value),
        z: loading.value,
        A: registerForm.nickname,
        B: common_vendor.o(($event) => registerForm.nickname = $event.detail.value),
        C: loading.value,
        D: registerForm.password,
        E: common_vendor.o(($event) => registerForm.password = $event.detail.value),
        F: loading.value,
        G: registerForm.confirmPassword,
        H: common_vendor.o(($event) => registerForm.confirmPassword = $event.detail.value),
        I: common_vendor.t(loading.value ? "注册中..." : "注册"),
        J: common_vendor.o(handleRegister),
        K: loading.value
      }, {
        L: common_vendor.t(isLogin.value ? "没有账户？立即注册" : "已有账户？立即登录"),
        M: common_vendor.o(toggleMode)
      });
    };
  }
};
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["__scopeId", "data-v-e4e4508d"]]);
wx.createPage(MiniProgramPage);
