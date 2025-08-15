// 强制覆盖ActivityManager，确保AA制功能正常工作
console.log('🔧 强制加载AA制功能...');

if (typeof ActivityManager !== 'undefined' && ActivityManager.showCreateModal) {
    // 备份原始方法
    const originalShowCreateModal = ActivityManager.showCreateModal;
    
    // 重写showCreateModal方法，确保包含AA制功能
    ActivityManager.showCreateModal = async function() {
        try {
            console.log('🎯 调用增强版创建活动模态框');
            
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
                <form id="createActivityForm">
                    <div class="row">
                        <div class="col-md-6">
                            <div class="form-group mb-3">
                                <label for="activityTitle" class="form-label">活动标题 *</label>
                                <input type="text" class="form-control" id="activityTitle" name="title" required 
                                       placeholder="请输入活动标题">
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="form-group mb-3">
                                <label for="activityType" class="form-label">活动类型</label>
                                <select class="form-control" id="activityType" name="type">
                                    <option value="other">其他</option>
                                    <option value="meeting">会议</option>
                                    <option value="training">培训</option>
                                    <option value="workshop">工作坊</option>
                                    <option value="team_building">团建</option>
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
                                <label for="activityTeam" class="form-label">所属团队</label>
                                <select class="form-control" id="activityTeam" name="team_id">
                                    <option value="">请选择团队</option>
                                    ${teams.map(team => `
                                        <option value="${team.id}">${team.name}</option>
                                    `).join('')}
                                </select>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="form-group mb-3">
                                <label for="activityLocation" class="form-label">活动地点</label>
                                <input type="text" class="form-control" id="activityLocation" name="location" 
                                       placeholder="请输入活动地点">
                            </div>
                        </div>
                    </div>
                    
                    <div class="row">
                        <div class="col-md-6">
                            <div class="form-group mb-3">
                                <label for="activityStartTime" class="form-label">开始时间</label>
                                <input type="datetime-local" class="form-control" id="activityStartTime" name="start_time">
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="form-group mb-3">
                                <label for="activityEndTime" class="form-label">结束时间</label>
                                <input type="datetime-local" class="form-control" id="activityEndTime" name="end_time">
                            </div>
                        </div>
                    </div>
                    
                    <div class="row">
                        <div class="col-md-6">
                            <div class="form-group mb-3">
                                <label for="activityMaxParticipants" class="form-label">最大参与人数</label>
                                <input type="number" class="form-control" id="activityMaxParticipants" name="max_participants" 
                                       min="1" placeholder="不限制请留空">
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="form-group mb-3">
                                <label for="needApproval" class="form-label">是否需要审核</label>
                                <select class="form-control" id="needApproval" name="need_approval">
                                    <option value="false">无需审核</option>
                                    <option value="true">需要审核</option>
                                </select>
                            </div>
                        </div>
                    </div>
                    
                    <div class="form-group mb-3">
                        <label for="activityDescription" class="form-label">活动描述</label>
                        <textarea class="form-control" id="activityDescription" name="description" rows="3"
                                  placeholder="请输入活动描述"></textarea>
                    </div>
                    
                    <!-- 🎯 AA制费用设置区域 -->
                    <div class="card mt-4" style="border: 2px solid #007aff;">
                        <div class="card-header" style="background-color: #007aff; color: white;">
                            <h6 class="mb-0">
                                <i class="fas fa-money-bill-wave me-2"></i>
                                💰 AA制费用设置
                                <small>(可选，用于活动费用分摊)</small>
                            </h6>
                        </div>
                        <div class="card-body">
                            <div class="row">
                                <div class="col-md-6">
                                    <div class="form-group mb-3">
                                        <label for="activityTotalCost" class="form-label">活动总费用 (元)</label>
                                        <input type="number" class="form-control" id="activityTotalCost" name="total_cost" 
                                               step="0.01" min="0" placeholder="0.00" 
                                               onchange="window.forceCalculateCosts()" oninput="window.forceCalculateCosts()">
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="form-group mb-3">
                                        <label for="activityOrganizerCost" class="form-label">发起人承担费用 (元)</label>
                                        <input type="number" class="form-control" id="activityOrganizerCost" name="organizer_cost" 
                                               step="0.01" min="0" placeholder="0.00"
                                               onchange="window.forceCalculateCosts()" oninput="window.forceCalculateCosts()">
                                    </div>
                                </div>
                            </div>
                            
                            <div class="row">
                                <div class="col-md-6">
                                    <div class="form-group mb-3">
                                        <label for="activityPaymentDeadline" class="form-label">支付截止时间</label>
                                        <input type="datetime-local" class="form-control" id="activityPaymentDeadline" name="payment_deadline">
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="form-group mb-3">
                                        <label class="form-label">💡 费用预览</label>
                                        <div class="cost-preview p-3 bg-light rounded" style="border: 1px solid #28a745;">
                                            <div class="row text-center">
                                                <div class="col-4">
                                                    <div class="text-primary">
                                                        <strong id="organizerCostPreview">¥0.00</strong>
                                                    </div>
                                                    <small class="text-muted">发起人承担</small>
                                                </div>
                                                <div class="col-4">
                                                    <div class="text-success">
                                                        <strong id="participantCostTotal">¥0.00</strong>
                                                    </div>
                                                    <small class="text-muted">参与者总计</small>
                                                </div>
                                                <div class="col-4">
                                                    <div class="text-warning">
                                                        <strong id="costPerPersonPreview">¥0.00</strong>
                                                    </div>
                                                    <small class="text-muted">每人应付</small>
                                                </div>
                                            </div>
                                            <div class="text-center mt-2">
                                                <small class="text-muted">
                                                    <i class="fas fa-info-circle"></i>
                                                    每人费用将根据实际报名人数动态计算
                                                </small>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            
                            <div class="form-group mb-0">
                                <label for="activityCostDescription" class="form-label">费用说明</label>
                                <textarea class="form-control" id="activityCostDescription" name="cost_description" rows="2"
                                          placeholder="例如：包含餐费、场地费、交通费等"></textarea>
                            </div>
                        </div>
                    </div>
                </form>
            `;

            // 创建并显示模态框
            this.createModal({
                title: '创建活动',
                content: modalContent,
                size: 'lg',
                footer: `
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">取消</button>
                    <button type="button" class="btn btn-primary" onclick="ActivityManager.submitCreateActivity()">
                        <i class="fas fa-plus"></i>
                        创建活动
                    </button>
                `
            });

            // 设置默认时间
            const now = new Date();
            const startTime = new Date(now.getTime() + 60 * 60 * 1000);
            const endTime = new Date(now.getTime() + 2 * 60 * 60 * 1000);

            document.getElementById('activityStartTime').value = this.formatDateTimeLocal(startTime);
            document.getElementById('activityEndTime').value = this.formatDateTimeLocal(endTime);
            
            // 初始计算费用
            window.forceCalculateCosts();
            
            console.log('✅ AA制模态框显示成功！');
            
        } catch (error) {
            console.error('❌ 创建模态框失败:', error);
            // 回退到原始方法
            originalShowCreateModal.call(this);
        }
    };
    
    // 添加强制费用计算方法
    window.forceCalculateCosts = function() {
        const totalCostInput = document.getElementById('activityTotalCost');
        const organizerCostInput = document.getElementById('activityOrganizerCost');
        
        if (!totalCostInput || !organizerCostInput) return;
        
        const totalCost = parseFloat(totalCostInput.value) || 0;
        const organizerCost = parseFloat(organizerCostInput.value) || 0;
        
        // 计算各项费用
        const participantCostTotal = Math.max(0, totalCost - organizerCost);
        const estimatedParticipants = 10; // 预估参与人数
        const costPerPerson = estimatedParticipants > 0 ? participantCostTotal / estimatedParticipants : 0;
        
        // 更新预览显示
        const organizerCostPreview = document.getElementById('organizerCostPreview');
        const participantCostTotalElem = document.getElementById('participantCostTotal');
        const costPerPersonPreview = document.getElementById('costPerPersonPreview');
        
        if (organizerCostPreview) organizerCostPreview.textContent = `¥${organizerCost.toFixed(2)}`;
        if (participantCostTotalElem) participantCostTotalElem.textContent = `¥${participantCostTotal.toFixed(2)}`;
        if (costPerPersonPreview) costPerPersonPreview.textContent = `¥${costPerPerson.toFixed(2)}`;
        
        console.log('💰 费用计算:', { totalCost, organizerCost, participantCostTotal, costPerPerson });
    };
    
    console.log('✅ ActivityManager.showCreateModal 已增强为AA制版本');
} else {
    console.log('❌ ActivityManager或showCreateModal方法不存在');
}

console.log('🎯 AA制功能强制加载完成！');