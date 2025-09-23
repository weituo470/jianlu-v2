"use strict";
const config = {
  // 开发环境：使用localhost，仅在微信开发者工具中可用
  development: {
    API_BASE_URL: "http://localhost:3460/api",
    IMAGE_BASE_URL: "http://localhost:3460",
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
