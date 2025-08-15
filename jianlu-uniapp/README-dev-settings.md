# 小程序开发设置说明

## 解决图片加载失败问题

### 步骤1：在微信开发者工具中设置
1. 打开微信开发者工具
2. 点击右上角"详情"按钮
3. 在"本地设置"中勾选：
   - ✅ 不校验合法域名、web-view（业务域名）、TLS 版本以及 HTTPS 证书
   - ✅ 开启调试模式

### 步骤2：添加域名白名单（生产环境）
在 `project.config.json` 中添加：
```json
{
  "setting": {
    "urlCheck": false,
    "es6": true,
    "enhance": true
  }
}
```