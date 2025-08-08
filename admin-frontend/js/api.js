// API接口文件

window.API = {
    // 基础请求方法
    async request(url, options = {}) {
        const config = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
            ...options
        };

        // 添加认证头
        const token = Utils.storage.get(AppConfig.TOKEN_KEY);
        const rawToken = localStorage.getItem(AppConfig.TOKEN_KEY);
        
        // 详细的token调试
        console.log('🔑 Token调试详情:');
        console.log('  - tokenKey:', AppConfig.TOKEN_KEY);
        console.log('  - rawToken:', rawToken);
        console.log('  - utilsToken:', token);
        console.log('  - token相等:', rawToken === token);
        console.log('  - token类型:', typeof token);
        console.log('  - token长度:', token ? token.length : 0);
        console.log('  - 是否JWT:', token ? token.split('.').length === 3 : false);
        console.log('  - URL:', url);
        
        // 如果token不一致，详细分析原因
        if (token && rawToken !== token) {
            console.warn('⚠️ Utils.storage.get()返回的token与localStorage不一致！');
            console.log('  - rawToken类型:', typeof rawToken);
            console.log('  - utilsToken类型:', typeof token);
            console.log('  - rawToken是否有引号:', rawToken.startsWith('"') && rawToken.endsWith('"'));
            console.log('  - utilsToken是否有引号:', token.startsWith('"') && token.endsWith('"'));
        }
        
        // 直接使用localStorage获取token，避免Utils.storage的JSON处理问题
        const finalToken = rawToken || token;
        if (finalToken) {
            // 清理token格式（移除可能的引号）
            const cleanToken = finalToken.replace(/^"|"$/g, '');
            config.headers.Authorization = `Bearer ${cleanToken}`;
            console.log('✅ 已添加认证头，使用', rawToken ? 'rawToken' : 'utilsToken');
        } else {
            console.error('❌ 没有找到任何token，请求将失败');
        }

        try {
            const response = await fetch(`${AppConfig.API_BASE_URL}${url}`, config);
            const data = await response.json();

            // 处理认证失败
            if (response.status === 401) {
                // 避免在logout请求中再次调用logout导致无限循环
                if (!url.includes('/logout')) {
                    Auth.clearAuthData();
                    if (window.location.pathname !== '/login') {
                        Router.navigate('/login');
                        Utils.toast.error('登录已过期，请重新登录');
                    }
                }
                throw new Error('登录已过期，请重新登录');
            }

            // 处理其他错误
            if (!response.ok) {
                throw new Error(data.message || `请求失败 (${response.status})`);
            }

            return data;
        } catch (error) {
            console.error('API请求失败:', error);
            throw error;
        }
    },

    // GET请求
    get(url, params = {}) {
        const queryString = new URLSearchParams(params).toString();
        const fullUrl = queryString ? `${url}?${queryString}` : url;
        return this.request(fullUrl);
    },

    // POST请求
    post(url, data = {}) {
        return this.request(url, {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },

    // PUT请求
    put(url, data = {}) {
        return this.request(url, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    },

    // DELETE请求
    delete(url) {
        return this.request(url, {
            method: 'DELETE'
        });
    },

    // 认证相关API
    auth: {
        // 用户登录
        login(credentials) {
            return API.post('/auth/login', credentials);
        },

        // 获取用户信息
        getProfile() {
            return API.get('/auth/profile');
        },

        // 刷新Token
        refreshToken() {
            return API.post('/auth/refresh');
        },

        // 用户登出
        async logout() {
            try {
                return await API.post('/auth/logout');
            } catch (error) {
                // 登出API失败时不抛出错误，避免影响登出流程
                console.warn('登出API调用失败:', error);
                return { success: false, message: error.message };
            }
        }
    },

    // 用户管理API
    users: {
        // 获取用户列表
        getList(params = {}) {
            return API.get('/users', params);
        },

        // 获取用户详情
        getDetail(id) {
            return API.get(`/users/${id}`);
        },

        // 创建用户
        create(data) {
            return API.post('/users', data);
        },

        // 更新用户
        update(id, data) {
            return API.put(`/users/${id}`, data);
        },

        // 删除用户
        delete(id) {
            return API.delete(`/users/${id}`);
        },

        // 批量操作
        batchUpdate(ids, action) {
            return API.post('/users/batch', { ids, action });
        },

        // 重置密码
        resetPassword(id, newPassword) {
            return API.post(`/users/${id}/reset-password`, { newPassword });
        },

        // 获取用户活动记录
        getActivities(userId, params = {}) {
            return API.get(`/user-activities/user/${userId}`, params);
        },

        // 获取超级管理员数量
        getSuperAdminCount() {
            return API.get('/users/superadmin-count');
        }
    },

    // 团队管理API
    teams: {
        // 获取团队列表
        getList(params = {}) {
            return API.get('/teams', params);
        },

        // 获取团队详情
        getDetail(id, params = {}) {
            return API.get(`/teams/${id}`, params);
        },

        // 创建团队
        create(data) {
            return API.post('/teams', data);
        },

        // 更新团队
        update(id, data) {
            return API.put(`/teams/${id}`, data);
        },

        // 删除团队
        delete(id) {
            return API.delete(`/teams/${id}`);
        },

        // 获取团队成员列表
        getMembers(id, params = {}) {
            return API.get(`/teams/${id}/members`, params);
        },

        // 添加团队成员
        addMember(id, data) {
            return API.post(`/teams/${id}/members`, data);
        },

        // 移除团队成员
        removeMember(id, userId) {
            return API.delete(`/teams/${id}/members/${userId}`);
        },

        // 更新成员角色
        updateMemberRole(id, userId, data) {
            return API.put(`/teams/${id}/members/${userId}/role`, data);
        },

        // 获取团队类型列表
        getTypes() {
            return API.get('/teams/types');
        },

        // 创建团队类型
        createType(typeData) {
            return API.post('/teams/types', typeData);
        },

        // 更新团队类型
        updateType(typeId, typeData) {
            return API.put(`/teams/types/${typeId}`, typeData);
        },

        // 删除团队类型
        deleteType(typeId) {
            return API.delete(`/teams/types/${typeId}`);
        }
    },

    // 用户活动记录API
    userActivities: {
        // 获取活动记录列表
        getList(params = {}) {
            return API.get('/user-activities', params);
        },

        // 获取用户活动记录
        getUserActivities(userId, params = {}) {
            return API.get(`/user-activities/user/${userId}`, params);
        },

        // 记录用户活动
        create(data) {
            return API.post('/user-activities', data);
        },

        // 获取活动统计
        getStats(params = {}) {
            return API.get('/user-activities/stats', params);
        }
    },



    // 活动管理API
    activities: {
        // 获取活动列表
        getList(params = {}) {
            return API.get('/activities', params);
        },

        // 获取活动详情
        getDetail(id) {
            return API.get(`/activities/${id}`);
        },

        // 创建活动
        create(data) {
            return API.post('/activities', data);
        },

        // 更新活动
        update(id, data) {
            return API.put(`/activities/${id}`, data);
        },

        // 删除活动
        delete(id) {
            return API.delete(`/activities/${id}`);
        },

        // 获取活动参与者
        getParticipants(id, params = {}) {
            return API.get(`/activities/${id}/participants`, params);
        },

        // 审核活动
        approve(id, status, reason = '') {
            return API.put(`/activities/${id}/approve`, { status, reason });
        },

        // 获取活动类型列表
        getTypes() {
            return API.get('/activities/types');
        },

        // 创建活动类型
        createType(typeData) {
            return API.post('/activities/types', typeData);
        },

        // 更新活动类型
        updateType(typeId, typeData) {
            return API.put(`/activities/types/${typeId}`, typeData);
        },

        // 删除活动类型
        deleteType(typeId) {
            return API.delete(`/activities/types/${typeId}`);
        }
    },

    // 内容管理API
    content: {
        // 获取日记列表
        getDiaries(params = {}) {
            return API.get('/content/diaries', params);
        },

        // 获取日记详情
        getDiaryDetail(id) {
            return API.get(`/content/diaries/${id}`);
        },

        // 审核日记
        approveDiary(id, status, reason = '') {
            return API.put(`/content/diaries/${id}/approve`, { status, reason });
        },

        // 删除日记
        deleteDiary(id) {
            return API.delete(`/content/diaries/${id}`);
        },

        // 获取评论列表
        getComments(params = {}) {
            return API.get('/content/comments', params);
        },

        // 审核评论
        approveComment(id, status, reason = '') {
            return API.put(`/content/comments/${id}/approve`, { status, reason });
        },

        // 删除评论
        deleteComment(id) {
            return API.delete(`/content/comments/${id}`);
        }
    },

    // 系统设置API
    settings: {
        // 获取系统设置
        get() {
            return API.get('/settings');
        },

        // 更新系统设置
        update(data) {
            return API.put('/settings', data);
        },

        // 获取系统统计
        getStats() {
            return API.get('/settings/stats');
        },

        // 获取系统日志
        getLogs(params = {}) {
            return API.get('/settings/logs', params);
        }
    },

    // 仪表板API
    dashboard: {
        // 获取仪表板数据
        getData() {
            return API.get('/dashboard');
        },

        // 获取统计数据
        getStats(period = '7d') {
            return API.get('/dashboard/stats', { period });
        },

        // 获取图表数据
        getChartData(type, period = '7d') {
            return API.get(`/dashboard/charts/${type}`, { period });
        }
    },

    // 文件上传API
    upload: {
        // 上传单个文件
        async single(file, onProgress) {
            const formData = new FormData();
            formData.append('file', file);

            return new Promise((resolve, reject) => {
                const xhr = new XMLHttpRequest();

                // 上传进度
                if (onProgress) {
                    xhr.upload.addEventListener('progress', (e) => {
                        if (e.lengthComputable) {
                            const percentComplete = (e.loaded / e.total) * 100;
                            onProgress(percentComplete);
                        }
                    });
                }

                // 请求完成
                xhr.addEventListener('load', () => {
                    if (xhr.status === 200) {
                        try {
                            const response = JSON.parse(xhr.responseText);
                            resolve(response);
                        } catch (error) {
                            reject(new Error('响应解析失败'));
                        }
                    } else {
                        reject(new Error(`上传失败 (${xhr.status})`));
                    }
                });

                // 请求错误
                xhr.addEventListener('error', () => {
                    reject(new Error('上传失败'));
                });

                // 发送请求
                xhr.open('POST', `${AppConfig.API_BASE_URL}/upload`);

                // 添加认证头
                const token = Utils.storage.get(AppConfig.TOKEN_KEY);
                if (token) {
                    xhr.setRequestHeader('Authorization', `Bearer ${token}`);
                }

                xhr.send(formData);
            });
        },

        // 上传多个文件
        async multiple(files, onProgress) {
            const results = [];

            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                try {
                    const result = await this.single(file, (progress) => {
                        if (onProgress) {
                            const totalProgress = ((i + progress / 100) / files.length) * 100;
                            onProgress(totalProgress);
                        }
                    });
                    results.push(result);
                } catch (error) {
                    results.push({ error: error.message, file: file.name });
                }
            }

            return results;
        }
    }
};