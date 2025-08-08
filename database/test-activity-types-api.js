// 测试活动类型API
const fetch = require('node-fetch');

const API_BASE = 'http://localhost:3458/api';

async function testActivityTypesAPI() {
    console.log('🧪 开始测试活动类型API...');
    
    try {
        // 测试获取活动类型列表
        console.log('\n📋 测试获取活动类型列表...');
        const response = await fetch(`${API_BASE}/activities/types`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                // 注意：这里需要有效的token，实际使用时需要先登录获取
                'Authorization': 'Bearer your-token-here'
            }
        });
        
        console.log('状态码:', response.status);
        console.log('状态文本:', response.statusText);
        
        const data = await response.text();
        console.log('响应内容:', data);
        
        if (response.ok) {
            console.log('✅ API响应成功');
            const jsonData = JSON.parse(data);
            if (jsonData.success && jsonData.data) {
                console.log(`📊 获取到 ${jsonData.data.length} 个活动类型`);
                jsonData.data.forEach(type => {
                    console.log(`  - ${type.value}: ${type.label} (${type.description})`);
                });
            }
        } else {
            console.log('❌ API响应失败');
        }
        
    } catch (error) {
        console.error('💥 测试失败:', error.message);
    }
}

// 如果直接运行此脚本
if (require.main === module) {
    testActivityTypesAPI();
}

module.exports = { testActivityTypesAPI };