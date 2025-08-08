// 在浏览器控制台中运行此脚本来修复token问题
// 复制以下代码到浏览器控制台执行

console.log('=== Token问题修复 ===');

const token = localStorage.getItem('token');
const user = localStorage.getItem('user');
const tokenExpires = localStorage.getItem('token_expires');

console.log('1. Token存在:', !!token);
if (token) {
    console.log('   Token长度:', token.length);
    console.log('   Token前20位:', token.substring(0, 20) + '...');
    console.log('   是否为JWT格式:', token.split('.').length === 3);
}

console.log('2. 用户信息存在:', !!user);
if (user) {
    try {
        const userObj = JSON.parse(user);
        console.log('   用户名:', userObj.username);
        console.log('   角色:', userObj.role);
    } catch (e) {
        console.log('   用户信息解析失败:', e.message);
    }
}

console.log('3. 过期时间存在:', !!tokenExpires);
if (tokenExpires) {
    const expiresAt = parseInt(tokenExpires);
    const expiresDate = new Date(expiresAt);
    const now = new Date();
    console.log('   过期时间:', expiresDate.toLocaleString());
    console.log('   当前时间:', now.toLocaleString());
    console.log('   是否过期:', now > expiresDate);
}

// 测试API调用
console.log('4. 测试API调用...');
if (token) {
    fetch('/api/teams/types', {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => {
        console.log('   API响应状态:', response.status, response.statusText);
        return response.json();
    })
    .then(data => {
        console.log('   API响应数据:', data);
        if (data.success) {
            console.log('   ✅ API调用成功，获取到', data.data?.length || 0, '个团队类型');
        } else {
            console.log('   ❌ API调用失败:', data.message);
        }
    })
    .catch(error => {
        console.log('   💥 API调用异常:', error.message);
    });
} else {
    console.log('   ⚠️ 没有token，跳过API测试');
}

// 修复token存储问题
console.log('5. 修复token存储...');
const currentToken = localStorage.getItem('token');
if (currentToken) {
    try {
        // 如果token被错误地JSON序列化了，尝试解析
        const parsedToken = JSON.parse(currentToken);
        if (typeof parsedToken === 'string') {
            console.log('   发现token被错误序列化，正在修复...');
            localStorage.setItem('token', parsedToken);
            console.log('   ✅ Token修复完成');
        }
    } catch (e) {
        // token本身就是字符串，这是正确的
        console.log('   ✅ Token格式正确');
    }
}

console.log('6. 建议操作:');
console.log('   - 如果问题仍然存在，请刷新页面');
console.log('   - 或者清除所有认证信息重新登录');

console.log('=== 修复完成 ===');