// 快速测试活动列表API
const fetch = require('node-fetch');

const API_BASE = 'http://localhost:3458/api';
const TEST_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjBhYjY0MWNjLTZkMGItMTFmMC1iMTRkLTYwY2Y4NGNjMGNiOCIsInVzZXJuYW1lIjoiYWRtaW4iLCJyb2xlIjoic3VwZXJfYWRtaW4iLCJwZXJtaXNzaW9ucyI6WyJkYXNoYm9hcmQ6cmVhZCIsImRhc2hib2FyZDp3cml0ZSIsInVzZXI6cmVhZCIsInVzZXI6Y3JlYXRlIiwidXNlcjp1cGRhdGUiLCJ1c2VyOmRlbGV0ZSIsInRlYW06cmVhZCIsInRlYW06Y3JlYXRlIiwidGVhbTp1cGRhdGUiLCJ0ZWFtOmRlbGV0ZSIsImFjdGl2aXR5OnJlYWQiLCJhY3Rpdml0eTpjcmVhdGUiLCJhY3Rpdml0eTp1cGRhdGUiLCJhY3Rpdml0eTpkZWxldGUiLCJjb250ZW50OnJlYWQiLCJjb250ZW50OmNyZWF0ZSIsImNvbnRlbnQ6dXBkYXRlIiwiY29udGVudDpkZWxldGUiLCJzeXN0ZW06cmVhZCIsInN5c3RlbTp1cGRhdGUiLCJzeXN0ZW06ZGVsZXRlIl0sImlhdCI6MTc1NDYyMTczOSwiZXhwIjoxNzU0NzA4MTM5fQ.6AV_79ouGkMOw43pmx21A4Si1F2ynLAc44rjOsGaMDQ';

async function testAPI() {
    try {
        const response = await fetch(`${API_BASE}/activities`, {
            headers: { 'Authorization': `Bearer ${TEST_TOKEN}` }
        });
        
        const data = await response.json();
        console.log('状态:', response.status);
        console.log('成功:', data.success);
        console.log('活动数量:', data.data?.length || 0);
        
        if (data.data && data.data.length > 0) {
            console.log('第一个活动:', data.data[0].title);
        }
        
    } catch (error) {
        console.error('错误:', error.message);
    }
}

testAPI();