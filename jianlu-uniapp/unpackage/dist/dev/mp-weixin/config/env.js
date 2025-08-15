"use strict";
const config = {
  // 开发环境：使用本机IP地址，小程序无法访问localhost
  development: {
    API_BASE_URL: "http://192.168.100.2:3458/api",
    IMAGE_BASE_URL: "http://192.168.100.2:3458",
    // 是否忽略HTTPS检查（仅开发环境）
    ignoreHttps: true
  },
  // 生产环境：必须使用 HTTPS
  production: {
    API_BASE_URL: "https://your-domain.com/api",
    IMAGE_BASE_URL: "https://your-domain.com",
    ignoreHttps: false
  }
};
const getCurrentConfig = () => {
  return config.development;
};
const envConfig = getCurrentConfig();
exports.envConfig = envConfig;
//# sourceMappingURL=../../.sourcemap/mp-weixin/config/env.js.map
