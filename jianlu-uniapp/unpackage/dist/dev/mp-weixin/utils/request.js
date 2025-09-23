"use strict";
const common_vendor = require("../common/vendor.js");
const config_env = require("../config/env.js");
const BASE_URL = config_env.envConfig.API_BASE_URL;
const request = (options) => {
  return new Promise((resolve, reject) => {
    const token = common_vendor.index.getStorageSync("token");
    const header = {
      "Content-Type": "application/json",
      ...options.header
    };
    if (token) {
      header.Authorization = `Bearer ${token}`;
    }
    let fullUrl = BASE_URL + options.url;
    let requestData = options.data || {};
    if ((options.method || "GET") === "GET" && Object.keys(requestData).length > 0) {
      const queryString = Object.keys(requestData).map((key) => {
        const value = requestData[key];
        if (value === null || value === void 0)
          return "";
        return `${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
      }).filter(Boolean).join("&");
      if (queryString) {
        fullUrl += (fullUrl.includes("?") ? "&" : "?") + queryString;
      }
      requestData = {};
    }
    {
      common_vendor.index.__f__("log", "at utils/request.js:44", "发送请求:", {
        url: fullUrl,
        method: options.method || "GET",
        data: requestData,
        header
      });
    }
    common_vendor.index.request({
      url: fullUrl,
      method: options.method || "GET",
      data: requestData,
      header,
      success: (res) => {
        var _a;
        {
          common_vendor.index.__f__("log", "at utils/request.js:60", "请求响应:", {
            url: fullUrl,
            statusCode: res.statusCode,
            data: res.data
          });
        }
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data);
        } else if (res.statusCode === 401) {
          common_vendor.index.removeStorageSync("token");
          common_vendor.index.removeStorageSync("userInfo");
          common_vendor.index.reLaunch({
            url: "/pages/login/login"
          });
          reject(new Error("登录已过期"));
        } else {
          common_vendor.index.__f__("error", "at utils/request.js:80", "请求失败:", res);
          reject(new Error(((_a = res.data) == null ? void 0 : _a.message) || `请求失败 (${res.statusCode})`));
        }
      },
      fail: (err) => {
        common_vendor.index.__f__("error", "at utils/request.js:85", "网络请求失败:", {
          url: fullUrl,
          error: err
        });
        common_vendor.index.showToast({
          title: "网络请求失败",
          icon: "none"
        });
        reject(new Error(`网络请求失败: ${err.errMsg || "未知错误"}`));
      }
    });
  });
};
const get = (url, data = {}) => {
  return request({
    url,
    method: "GET",
    data
  });
};
const post = (url, data = {}) => {
  return request({
    url,
    method: "POST",
    data
  });
};
const put = (url, data = {}) => {
  return request({
    url,
    method: "PUT",
    data
  });
};
const del = (url, data = {}) => {
  return request({
    url,
    method: "DELETE",
    data
  });
};
exports.del = del;
exports.get = get;
exports.post = post;
exports.put = put;
//# sourceMappingURL=../../.sourcemap/mp-weixin/utils/request.js.map
