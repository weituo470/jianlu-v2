const axios = require('axios');

async function testHealth() {
  try {
    console.log('测试健康检查接口...');
    const response = await axios.get('http://localhost:3458/health', {
      timeout: 5000
    });
    
    console.log('✅ 健康检查成功');
    console.log('响应:', response.data);
  } catch (error) {
    console.error('❌ 健康检查失败:', error.message);
    if (error.code === 'ECONNREFUSED') {
      console.error('   连接被拒绝，请确保后端服务正在运行');
    }
  }
}

testHealth();