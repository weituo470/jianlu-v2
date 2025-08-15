// 独立的AA活动创建功能
window.showAAActivityModal = async function() {
    console.log('🎯 显示AA活动创建模态框');
    
    try {
        // 确保所需的API和组件存在
        if (typeof API === 'undefined') {
            throw new Error('API未加载，请刷新页面重试');
        }
        
        if (typeof bootstrap === 'undefined') {
            console.warn('Bootstrap未加载，将使用基础模态框显示');
        }
        
        // 获取团队列表和活动类型
        const [teamsResponse, typesResponse] = await Promise.all([
            API.teams.getList(),
            API.activities.getTypes()
        ]);

        const teams = teamsResponse.success ? (teamsResponse.data?.teams || teamsResponse.data || []) : [];
        const activityTypes = typesResponse.success ? typesResponse.data : [];

        console.log('加载团队数据:', teams.length);
        console.log('加载活动类型:', activityTypes.length);

        const modalContent = `
            <form id="aaActivityForm">
                <div class="alert alert-info mb-4">
                    <i class="fas fa-info-circle me-2"></i>
                    <strong>AA制活动</strong> - 支持费用分摊的团队活动
                </div>
                
                <div class="row">
                    <div class="col-md-6">
                        <div class="form-group mb-3">
                            <label for="aaActivityTitle" class="form-label">活动标题 *</label>
                            <input type="text" class="form-control" id="aaActivityTitle" name="title" required 
                                   placeholder="例如：公司团建聚餐">
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="form-group mb-3">
                            <label for="aaActivityType" class="form-label">活动类型</label>
                            <select class="form-control" id="aaActivityType" name="type">
                                <option value="team_building">团建</option>
                                <option value="other">其他</option>
                                <option value="meeting">会议</option>
                                <option value="training">培训</option>
                                <option value="workshop">工作坊</option>
                                <option value="presentation">演示</option>
                                ${activityTypes.map(type => `
                                    <option value="${type.value}">${type.label}</option>
                                `).join('')}
                            </select>
                        </div>
                    </div>
                </div>
                
                <div class="row">
                    <div class="col-md-6">
                        <div class="form-group mb-3">
                            <label for="aaActivityTeam" class="form-label">所属团队</label>
                            <select class="form-control" id="aaActivityTeam" name="team_id">
                                <option value="">请选择团队</option>
                                ${teams.map(team => `
                                    <option value="${team.id}">${team.name}</option>
                                `).join('')}
                            </select>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="form-group mb-3">
                            <label for="aaActivityLocation" class="form-label">活动地点</label>
                            <input type="text" class="form-control" id="aaActivityLocation" name="location" 
                                   placeholder="例如：公司餐厅">
                        </div>
                    </div>
                </div>
                
                <div class="row">
                    <div class="col-md-6">
                        <div class="form-group mb-3">
                            <label for="aaActivityStartTime" class="form-label">开始时间</label>
                            <input type="datetime-local" class="form-control" id="aaActivityStartTime" name="start_time">
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="form-group mb-3">
                            <label for="aaActivityEndTime" class="form-label">结束时间</label>
                            <input type="datetime-local" class="form-control" id="aaActivityEndTime" name="end_time">
                        </div>
                    </div>
                </div>
                
                <div class="form-group mb-4">
                    <label for="aaActivityDescription" class="form-label">活动描述</label>
                    <textarea class="form-control" id="aaActivityDescription" name="description" rows="3"
                              placeholder="描述活动内容、注意事项等"></textarea>
                </div>
                
                <!-- 💰 AA制费用设置区域 -->
                <div class="card" style="border: 2px solid #28a745; background: #f8fff9;">
                    <div class="card-header" style="background: #28a745; color: white;">
                        <h5 class="mb-0">
                            <i class="fas fa-money-bill-wave me-2"></i>
                            💰 AA制费用设置
                        </h5>
                        <small>设置活动费用和分摊方式</small>
                    </div>
                    <div class="card-body">
                        <div class="row">
                            <div class="col-md-6">
                                <div class="form-group mb-3">
                                    <label for="aaTotalCost" class="form-label">活动总费用 (元) *</label>
                                    <input type="number" class="form-control" id="aaTotalCost" name="total_cost" 
                                           step="0.01" min="0" placeholder="1000.00" value="1000"
                                           onchange="window.calculateAACosts()" oninput="window.calculateAACosts()">
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="form-group mb-3">
                                    <label for="aaOrganizerCost" class="form-label">发起人承担费用 (元)</label>
                                    <input type="number" class="form-control" id="aaOrganizerCost" name="organizer_cost" 
                                           step="0.01" min="0" placeholder="500.00" value="500"
                                           onchange="window.calculateAACosts()" oninput="window.calculateAACosts()">
                                </div>
                            </div>
                        </div>
                        
                        <div class="row">
                            <div class="col-md-6">
                                <div class="form-group mb-3">
                                    <label for="aaPaymentDeadline" class="form-label">支付截止时间</label>
                                    <input type="datetime-local" class="form-control" id="aaPaymentDeadline" name="payment_deadline">
                                </div>
                            </div>
                            <div class="col-md-6">
                                <div class="form-group mb-3">
                                    <label for="aaMaxParticipants" class="form-label">最大参与人数</label>
                                    <input type="number" class="form-control" id="aaMaxParticipants" name="max_participants" 
                                           min="1" placeholder="10" value="10"
                                           onchange="window.calculateAACosts()" oninput="window.calculateAACosts()">
                                </div>
                            </div>
                        </div>
                        
                        <!-- 费用预览 -->
                        <div class="alert alert-success" id="aaeCostPreview">
                            <h6 class="mb-3">💡 费用分摊预览</h6>
                            <div class="row text-center">
                                <div class="col-4">
                                    <div class="border-end">
                                        <h4 class="text-primary mb-1" id="aaOrganizerCostPreview">¥500.00</h4>
                                        <small class="text-muted">发起人承担</small>
                                    </div>
                                </div>
                                <div class="col-4">
                                    <div class="border-end">
                                        <h4 class="text-success mb-1" id="aaParticipantCostTotal">¥500.00</h4>
                                        <small class="text-muted">参与者总计</small>
                                    </div>
                                </div>
                                <div class="col-4">
                                    <h4 class="text-warning mb-1" id="aaCostPerPerson">¥50.00</h4>
                                    <small class="text-muted">每人应付</small>
                                </div>
                            </div>
                            <div class="text-center mt-2">
                                <small class="text-muted">
                                    <i class="fas fa-info-circle"></i>
                                    费用将根据实际报名人数重新计算
                                </small>
                            </div>
                        </div>
                        
                        <div class="form-group mb-0">
                            <label for="aaCostDescription" class="form-label">费用说明</label>
                            <textarea class="form-control" id="aaCostDescription" name="cost_description" rows="2"
                                      placeholder="例如：包含餐费、场地费、交通费等">包含餐费、场地费等所有费用</textarea>
                        </div>
                    </div>
                </div>
            </form>
        `;

        // 创建模态框
        const modalId = 'aaActivityModal';
        
        // 移除已存在的模态框
        const existingModal = document.getElementById(modalId);
        if (existingModal) {
            existingModal.remove();
        }
        
        const modalHtml = `
            <div class="modal fade" id="${modalId}" tabindex="-1" aria-labelledby="${modalId}Label" aria-hidden="true">
                <div class="modal-dialog modal-xl">
                    <div class="modal-content">
                        <div class="modal-header" style="background: #28a745; color: white;">
                            <h5 class="modal-title" id="${modalId}Label">
                                <i class="fas fa-money-bill-wave me-2"></i>
                                创建AA制活动
                            </h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                        </div>
                        <div class="modal-body">
                            ${modalContent}
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">
                                <i class="fas fa-times"></i>
                                取消
                            </button>
                            <button type="button" class="btn btn-success" onclick="window.submitAAActivity()">
                                <i class="fas fa-money-bill-wave"></i>
                                创建AA活动
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // 添加到页面
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        
        // 显示模态框
        if (typeof bootstrap !== 'undefined' && bootstrap.Modal) {
            const modal = new bootstrap.Modal(document.getElementById(modalId));
            modal.show();
        } else {
            // 简单显示
            const modalElement = document.getElementById(modalId);
            modalElement.style.display = 'block';
            modalElement.classList.add('show');
        }

        // 设置默认时间
        const now = new Date();
        const startTime = new Date(now.getTime() + 60 * 60 * 1000); // +1小时
        const endTime = new Date(now.getTime() + 3 * 60 * 60 * 1000); // +3小时

        document.getElementById('aaActivityStartTime').value = formatDateTimeLocal(startTime);
        document.getElementById('aaActivityEndTime').value = formatDateTimeLocal(endTime);
        
        // 设置支付截止时间（活动开始前1天）
        const paymentDeadline = new Date(startTime.getTime() - 24 * 60 * 60 * 1000);
        document.getElementById('aaPaymentDeadline').value = formatDateTimeLocal(paymentDeadline);
        
        // 初始化费用计算
        setTimeout(() => {
            window.calculateAACosts();
        }, 100);
        
        console.log('✅ AA活动模态框显示成功！');
        
    } catch (error) {
        console.error('❌ 显示AA活动模态框失败:', error);
        alert('显示创建窗口失败: ' + error.message);
    }
};

// AA费用计算函数
window.calculateAACosts = function() {
    const totalCostInput = document.getElementById('aaTotalCost');
    const organizerCostInput = document.getElementById('aaOrganizerCost');
    const maxParticipantsInput = document.getElementById('aaMaxParticipants');
    
    if (!totalCostInput || !organizerCostInput) return;
    
    const totalCost = parseFloat(totalCostInput.value) || 0;
    const organizerCost = parseFloat(organizerCostInput.value) || 0;
    const maxParticipants = parseInt(maxParticipantsInput?.value) || 10;
    
    // 计算各项费用
    const participantCostTotal = Math.max(0, totalCost - organizerCost);
    const costPerPerson = maxParticipants > 0 ? participantCostTotal / maxParticipants : 0;
    
    // 更新预览显示
    const organizerCostPreview = document.getElementById('aaOrganizerCostPreview');
    const participantCostTotalElem = document.getElementById('aaParticipantCostTotal');
    const costPerPersonPreview = document.getElementById('aaCostPerPerson');
    
    if (organizerCostPreview) organizerCostPreview.textContent = `¥${organizerCost.toFixed(2)}`;
    if (participantCostTotalElem) participantCostTotalElem.textContent = `¥${participantCostTotal.toFixed(2)}`;
    if (costPerPersonPreview) costPerPersonPreview.textContent = `¥${costPerPerson.toFixed(2)}`;
    
    console.log('💰 AA费用计算:', { totalCost, organizerCost, participantCostTotal, costPerPerson, maxParticipants });
};

// 提交AA活动函数
window.submitAAActivity = async function() {
    console.log('🚀 提交AA活动');
    
    try {
        const form = document.getElementById('aaActivityForm');
        const formData = new FormData(form);
        
        const activityData = {
            title: formData.get('title').trim(),
            description: formData.get('description').trim(),
            type: formData.get('type'),
            team_id: formData.get('team_id'),
            start_time: formData.get('start_time'),
            end_time: formData.get('end_time'),
            location: formData.get('location').trim(),
            max_participants: formData.get('max_participants') ? parseInt(formData.get('max_participants')) : null,
            need_approval: false,
            // AA制费用相关字段
            total_cost: parseFloat(formData.get('total_cost')) || 0,
            organizer_cost: parseFloat(formData.get('organizer_cost')) || 0,
            payment_deadline: formData.get('payment_deadline') || null,
            cost_description: formData.get('cost_description') ? formData.get('cost_description').trim() : '',
            cost_sharing_type: 'equal',
            activity_status: 'published'
        };

        // 验证必填字段
        if (!activityData.title) {
            alert('请填写活动标题');
            return;
        }
        
        if (activityData.total_cost <= 0) {
            alert('请填写活动总费用');
            return;
        }

        // 验证费用
        if (activityData.organizer_cost > activityData.total_cost) {
            alert('发起人承担费用不能超过活动总费用');
            return;
        }

        console.log('🎯 发送AA活动数据:', activityData);

        // 使用AA制API创建活动
        const response = await API.activities.createWithCost(activityData);
        
        if (response.success) {
            alert('🎉 AA制活动创建成功！');
            
            // 关闭模态框
            const modal = document.getElementById('aaActivityModal');
            if (modal) {
                if (typeof bootstrap !== 'undefined' && bootstrap.Modal) {
                    const bsModal = bootstrap.Modal.getInstance(modal);
                    if (bsModal) {
                        bsModal.hide();
                    }
                } else {
                    modal.remove();
                }
            }
            
            // 刷新页面
            location.reload();
        } else {
            alert('创建失败: ' + response.message);
        }
        
    } catch (error) {
        console.error('❌ 提交AA活动失败:', error);
        alert('创建失败: ' + error.message);
    }
};

// 日期格式化辅助函数
function formatDateTimeLocal(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
}

console.log('✅ AA活动创建功能已加载');

// 设置全局标记
window.AA_ACTIVITY_MANAGER_LOADED = true;