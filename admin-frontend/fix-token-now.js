// 一键修复token问题 - 在浏览器控制台运行
// 复制以下代码到浏览器控制台（F12 -> Console）并按回车

(function () {
    console.log('🔧 开始修复token问题...');

    // 1. 检查当前token状态
    const currentToken = localStorage.getItem('token');
    const currentUser = localStorage.getItem('admin_user');
    const currentExpires = localStorage.getItem('admin_token_expires');

    console.log('当前状态:', {
        hasToken: !!currentToken,
        hasUser: !!currentUser,
        hasExpires: !!currentExpires,
        tokenLength: currentToken ? currentToken.length : 0
    });

    // 2. 修复token格式问题
    if (currentToken) {
        let fixedToken = currentToken;

        // 移除可能的JSON序列化引号
        if (fixedToken.startsWith('"') && fixedToken.endsWith('"')) {
            fixedToken = fixedToken.slice(1, -1);
            console.log('✅ 修复了token的JSON序列化问题');
        }

        // 检查JWT格式
        const parts = fixedToken.split('.');
        if (parts.length === 3) {
            console.log('✅ Token格式正确（JWT）');
            localStorage.setItem('token', fixedToken);
        } else {
            console.log('❌ Token格式不正确，需要重新登录');
            localStorage.removeItem('token');
            localStorage.removeItem('admin_user');
            localStorage.removeItem('admin_token_expires');
        }
    }

    // 3. 测试API调用
    const testToken = localStorage.getItem('token');
    if (testToken) {
        console.log('🧪 测试API调用...');

        fetch('/api/teams/types', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${testToken}`
            }
        })
            .then(response => {
                console.log('API响应状态:', response.status);
                if (response.status === 200) {
                    return response.json();
                } else if (response.status === 401) {
                    throw new Error('Token无效，需要重新登录');
                } else {
                    throw new Error(`API错误: ${response.status}`);
                }
            })
            .then(data => {
                if (data.success) {
                    console.log('🎉 修复成功！团队类型数量:', data.data?.length || 0);
                    console.log('现在可以正常创建团队了');

                    // 如果在团队页面，刷新页面
                    if (window.location.pathname.includes('teams')) {
                        console.log('正在刷新页面...');
                        setTimeout(() => window.location.reload(), 1000);
                    }
                } else {
                    console.log('❌ API调用失败:', data.message);
                }
            })
            .catch(error => {
                console.log('❌ API测试失败:', error.message);
                console.log('建议：清除认证信息并重新登录');

                // 清除认证信息
                localStorage.removeItem('token');
                localStorage.removeItem('admin_user');
                localStorage.removeItem('admin_token_expires');

                console.log('认证信息已清除，请刷新页面重新登录');
            });
    } else {
        console.log('❌ 没有找到token，请重新登录');
    }

    console.log('🔧 修复脚本执行完成');
})();