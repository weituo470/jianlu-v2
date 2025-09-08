// 微信API服务
const axios = require('axios');
const logger = require('../utils/logger');

/**
 * 微信API服务类
 */
class WeChatService {
  constructor() {
    this.appId = process.env.WECHAT_APP_ID;
    this.appSecret = process.env.WECHAT_APP_SECRET;
    this.baseUrl = 'https://api.weixin.qq.com/sns';
  }

  /**
   * 使用code获取openid和session_key
   * @param {string} code - 微信登录code
   * @returns {Promise<Object>} {openid, session_key, unionid}
   */
  async code2Session(code) {
    try {
      // 开发环境模拟模式
      if (process.env.NODE_ENV === 'development' && process.env.WECHAT_MOCK_MODE === 'true') {
        logger.info('使用开发环境模拟微信登录', { code: code.substring(0, 10) + '...' });
        
        return {
          openid: `dev_openid_${code.substring(0, 8)}_${Date.now()}`,
          session_key: `dev_session_key_${code.substring(0, 12)}`,
          unionid: `dev_unionid_${code.substring(0, 8)}_${Date.now()}`
        };
      }

      const url = `${this.baseUrl}/jscode2session`;
      const params = {
        appid: this.appId,
        secret: this.appSecret,
        js_code: code,
        grant_type: 'authorization_code'
      };

      logger.info('请求微信code2session API', { params: { ...params, secret: '***' } });

      const response = await axios.get(url, { params, timeout: 10000 });
      const data = response.data;

      logger.info('微信code2session响应', { data });

      if (data.errcode) {
        throw new Error(`微信API错误: ${data.errmsg} (错误码: ${data.errcode})`);
      }

      if (!data.openid) {
        throw new Error('微信API返回数据无效：缺少openid');
      }

      return {
        openid: data.openid,
        session_key: data.session_key,
        unionid: data.unionid || null
      };
    } catch (error) {
      logger.error('微信code2session失败:', error);
      
      if (error.response) {
        // HTTP错误
        throw new Error(`微信API请求失败: ${error.response.status} ${error.response.statusText}`);
      } else if (error.code === 'ECONNABORTED') {
        // 超时错误
        throw new Error('微信API请求超时，请重试');
      } else {
        // 其他错误
        throw new Error(`微信API调用失败: ${error.message}`);
      }
    }
  }

  /**
   * 获取访问令牌（用于获取用户信息）
   * @returns {Promise<Object>} {access_token, expires_in}
   */
  async getAccessToken() {
    try {
      const url = 'https://api.weixin.qq.com/cgi-bin/token';
      const params = {
        appid: this.appId,
        secret: this.appSecret,
        grant_type: 'client_credential'
      };

      logger.info('请求微信access_token API', { params: { ...params, secret: '***' } });

      const response = await axios.get(url, { params, timeout: 10000 });
      const data = response.data;

      logger.info('微信access_token响应', { data });

      if (data.errcode) {
        throw new Error(`微信API错误: ${data.errmsg} (错误码: ${data.errcode})`);
      }

      return {
        access_token: data.access_token,
        expires_in: data.expires_in
      };
    } catch (error) {
      logger.error('获取微信access_token失败:', error);
      throw new Error(`获取微信access_token失败: ${error.message}`);
    }
  }

  /**
   * 解密微信用户数据
   * @param {string} encryptedData - 加密数据
   * @param {string} iv - 初始向量
   * @param {string} sessionKey - 会话密钥
   * @returns {Promise<Object>} 用户信息对象
   */
  async decryptUserData(encryptedData, iv, sessionKey) {
    try {
      // 这里需要实现微信数据解密逻辑
      // 由于涉及到复杂的解密算法，这里提供一个基本框架
      // 实际使用时需要安装和配置相应的解密库
      
      const crypto = require('crypto');
      
      // Base64解码
      const encryptedDataBuffer = Buffer.from(encryptedData, 'base64');
      const ivBuffer = Buffer.from(iv, 'base64');
      const sessionKeyBuffer = Buffer.from(sessionKey, 'base64');
      
      // 创建解密器
      const decipher = crypto.createDecipheriv('aes-128-cbc', sessionKeyBuffer, ivBuffer);
      
      // 设置自动填充
      decipher.setAutoPadding(true);
      
      // 解密数据
      let decrypted = decipher.update(encryptedDataBuffer, null, 'utf8');
      decrypted += decipher.final('utf8');
      
      // 解析JSON
      const userData = JSON.parse(decrypted);
      
      logger.info('微信用户数据解密成功', { 
        openid: userData.openId,
        nickname: userData.nickName 
      });
      
      return userData;
    } catch (error) {
      logger.error('微信用户数据解密失败:', error);
      throw new Error(`微信用户数据解密失败: ${error.message}`);
    }
  }

  /**
   * 验证配置是否有效
   * @returns {boolean} 配置是否有效
   */
  validateConfig() {
    if (!this.appId || this.appId === 'your_wechat_app_id_here') {
      throw new Error('微信小程序AppID未配置');
    }
    
    if (!this.appSecret || this.appSecret === 'your_wechat_app_secret_here') {
      throw new Error('微信小程序AppSecret未配置');
    }
    
    return true;
  }
}

// 创建单例实例
const weChatService = new WeChatService();

module.exports = weChatService;