// 结算功能扩展方法

// 扩展ActivityDetailPage类，添加结算功能
if (typeof ActivityDetailPage !== 'undefined') {
    Object.assign(ActivityDetailPage.prototype, {
        // 创建模拟结算模态框DOM
        createSimulateSettlementModal() {
            if (document.getElementById('simulateSettlementModal')) return;

            const modalHTML = `
                <div class="modal fade" id="simulateSettlementModal" tabindex="-1">
                    <div class="modal-dialog modal-lg">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">
                                    <i class="fas fa-calculator me-2"></i>模拟AA费用分摊
                                </h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                            </div>
                            <div class="modal-body">
                                <div class="row">
                                    <div class="col-md-6">
                                        <div class="card bg-light mb-3">
                                            <div class="card-body">
                                                <h6 class="card-title">结算设置</h6>
                                                <div class="form-check">
                                                    <input class="form-check-input" type="checkbox" id="includeTeamFund" checked>
                                                    <label class="form-check-label" for="includeTeamFund">
                                                        扣除准备金
                                                    </label>
                                                </div>
                                                <div class="form-check mt-2">
                                                    <input class="form-check-input" type="checkbox" id="includeUnconfirmedRecords">
                                                    <label class="form-check-label" for="includeUnconfirmedRecords">
                                                        包含未确认的记账记录
                                                    </label>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div class="col-md-6">
                                        <div class="card bg-light mb-3">
                                            <div class="card-body">
                                                <h6 class="card-title">基础信息</h6>
                                                <div id="simulationSummary">
                                                    <p>总记账记录: <span class="badge bg-primary">-</span></p>
                                                    <p>确认记录: <span class="badge bg-success">-</span></p>
                                                    <p>总支出: <span class="badge bg-danger">-</span></p>
                                                    <p>准备金: <span class="badge bg-warning">-</span></p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div class="card">
                                    <div class="card-header">
                                        <h6 class="mb-0">
                                            <i class="fas fa-users me-2"></i>参与者权重设置
                                        </h6>
                                    </div>
                                    <div class="card-body">
                                        <div id="participantWeights">
                                            <div class="text-center py-3">
                                                <div class="spinner-border text-primary" role="status">
                                                    <span class="visually-hidden">加载中...</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div class="card mt-3">
                                    <div class="card-header">
                                        <h6 class="mb-0">
                                            <i class="fas fa-user-minus me-2"></i>费用豁免
                                        </h6>
                                    </div>
                                    <div class="card-body">
                                        <div id="exemptionSettings">
                                            <p class="text-muted">选择豁免费用的参与者</p>
                                        </div>
                                    </div>
                                </div>

                                <!-- 模拟结果 -->
                                <div class="card mt-3" id="simulationResult" style="display: none;">
                                    <div class="card-header bg-success text-white">
                                        <h6 class="mb-0">
                                            <i class="fas fa-chart-pie me-2"></i>模拟结算结果
                                        </h6>
                                    </div>
                                    <div class="card-body">
                                        <div class="row">
                                            <div class="col-md-3">
                                                <div class="text-center">
                                                    <h5 class="text-primary" id="simulatedTotalExpense">¥0</h5>
                                                    <small class="text-muted">总净费用</small>
                                                </div>
                                            </div>
                                            <div class="col-md-3">
                                                <div class="text-center">
                                                    <h5 class="text-success" id="simulatedReserveFund">¥0</h5>
                                                    <small class="text-muted">准备金</small>
                                                </div>
                                            </div>
                                            <div class="col-md-3">
                                                <div class="text-center">
                                                    <h5 class="text-warning" id="simulatedPerPersonCost">¥0</h5>
                                                    <small class="text-muted">人均费用</small>
                                                </div>
                                            </div>
                                            <div class="col-md-3">
                                                <div class="text-center">
                                                    <h5 class="text-info" id="simulatedParticipants">0</h5>
                                                    <small class="text-muted">参与分摊人数</small>
                                                </div>
                                            </div>
                                        </div>
                                        <div class="mt-3">
                                            <h6>分摊详情</h6>
                                            <div id="simulatedBreakdown" class="table-responsive">
                                                <!-- 分摊详情将在这里显示 -->
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">关闭</button>
                                <button type="button" class="btn btn-outline-primary" onclick="activityDetailPage.runSimulation()">
                                    <i class="fas fa-calculator me-1"></i>开始计算
                                </button>
                                <button type="button" class="btn btn-success" id="createFromSimulationBtn" onclick="activityDetailPage.createFromSimulation()" style="display: none;">
                                    <i class="fas fa-plus me-1"></i>基于此结果创建结算
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            document.body.insertAdjacentHTML('beforeend', modalHTML);
        },

        // 创建创建结算模态框DOM
        createCreateSettlementModal() {
            if (document.getElementById('createSettlementModal')) return;

            const modalHTML = `
                <div class="modal fade" id="createSettlementModal" tabindex="-1">
                    <div class="modal-dialog modal-lg">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">
                                    <i class="fas fa-handshake me-2"></i>创建AA费用分摊结算
                                </h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                            </div>
                            <div class="modal-body">
                                <form id="createSettlementForm">
                                    <div class="row">
                                        <div class="col-md-6">
                                            <div class="mb-3">
                                                <label class="form-label">结算名称</label>
                                                <input type="text" class="form-control" id="settlementName" placeholder="自动生成" readonly>
                                            </div>
                                        </div>
                                        <div class="col-md-6">
                                            <div class="mb-3">
                                                <label class="form-label">结算备注</label>
                                                <textarea class="form-control" id="settlementNotes" rows="2" placeholder="可选"></textarea>
                                            </div>
                                        </div>
                                    </div>

                                    <div class="row">
                                        <div class="col-md-6">
                                            <div class="form-check">
                                                <input class="form-check-input" type="checkbox" id="createIncludeTeamFund" checked>
                                                <label class="form-check-label" for="createIncludeTeamFund">
                                                    扣除准备金
                                                </label>
                                            </div>
                                        </div>
                                        <div class="col-md-6">
                                            <div class="form-check">
                                                <input class="form-check-input" type="checkbox" id="createIncludeUnconfirmedRecords">
                                                <label class="form-check-label" for="createIncludeUnconfirmedRecords">
                                                    包含未确认的记账记录
                                                </label>
                                            </div>
                                        </div>
                                    </div>

                                    <div class="card mt-3">
                                        <div class="card-header">
                                            <h6 class="mb-0">
                                                <i class="fas fa-users me-2"></i>参与者权重设置
                                            </h6>
                                        </div>
                                        <div class="card-body">
                                            <div id="createParticipantWeights">
                                                <div class="text-center py-3">
                                                    <div class="spinner-border text-primary" role="status">
                                                        <span class="visually-hidden">加载中...</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div class="card mt-3">
                                        <div class="card-header">
                                            <h6 class="mb-0">
                                                <i class="fas fa-user-minus me-2"></i>费用豁免
                                            </h6>
                                        </div>
                                        <div class="card-body">
                                            <div id="createExemptionSettings">
                                                <p class="text-muted">选择豁免费用的参与者</p>
                                            </div>
                                        </div>
                                    </div>

                                    <!-- 结算预览 -->
                                    <div class="card mt-3" id="settlementPreview">
                                        <div class="card-header bg-info text-white">
                                            <h6 class="mb-0">
                                                <i class="fas fa-eye me-2"></i>结算预览
                                            </h6>
                                        </div>
                                        <div class="card-body">
                                            <div class="row">
                                                <div class="col-md-3">
                                                    <div class="text-center">
                                                        <h5 class="text-primary" id="previewTotalExpense">¥0</h5>
                                                        <small class="text-muted">总净费用</small>
                                                    </div>
                                                </div>
                                                <div class="col-md-3">
                                                    <div class="text-center">
                                                        <h5 class="text-success" id="previewReserveFund">¥0</h5>
                                                        <small class="text-muted">准备金</small>
                                                    </div>
                                                </div>
                                                <div class="col-md-3">
                                                    <div class="text-center">
                                                        <h5 class="text-warning" id="previewPerPersonCost">¥0</h5>
                                                        <small class="text-muted">人均费用</small>
                                                    </div>
                                                </div>
                                                <div class="col-md-3">
                                                    <div class="text-center">
                                                        <h5 class="text-info" id="previewParticipants">0</h5>
                                                        <small class="text-muted">参与分摊人数</small>
                                                    </div>
                                                </div>
                                            </div>
                                            <div class="mt-3">
                                                <h6>分摊预览</h6>
                                                <div id="previewBreakdown" class="table-responsive">
                                                    <!-- 分摊预览将在这里显示 -->
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </form>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">取消</button>
                                <button type="button" class="btn btn-outline-primary" onclick="activityDetailPage.previewSettlement()">
                                    <i class="fas fa-eye me-1"></i>预览结算
                                </button>
                                <button type="button" class="btn btn-success" id="confirmCreateSettlementBtn" onclick="activityDetailPage.confirmCreateSettlement()" disabled>
                                    <i class="fas fa-check me-1"></i>确认创建结算
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            document.body.insertAdjacentHTML('beforeend', modalHTML);
        },

        // 初始化模拟数据
        initSimulationData() {
            // 更新基础信息
            this.updateSimulationSummary();

            // 加载参与者权重设置
            this.loadParticipantWeights('participantWeights');

            // 加载费用豁免设置
            this.loadExemptionSettings('exemptionSettings');
        },

        // 初始化创建结算数据
        initCreateSettlementData() {
            // 生成结算名称
            const settlementName = `结算-${this.activityId}-${new Date().getTime()}`;
            document.getElementById('settlementName').value = settlementName;

            // 加载参与者权重设置
            this.loadParticipantWeights('createParticipantWeights');

            // 加载费用豁免设置
            this.loadExemptionSettings('createExemptionSettings');
        },

        // 更新模拟结算摘要
        updateSimulationSummary() {
            const records = this.accountingData.records;
            const confirmedRecords = records.filter(r => r.status === 'confirmed');
            const totalExpense = records.filter(r => r.record_type === 'expense').reduce((sum, r) => sum + parseFloat(r.amount), 0);
            const totalReserve = records.filter(r => r.record_type === 'reserve').reduce((sum, r) => sum + parseFloat(r.amount), 0);

            document.getElementById('simulationSummary').innerHTML = `
                <p>总记账记录: <span class="badge bg-primary">${records.length}</span></p>
                <p>确认记录: <span class="badge bg-success">${confirmedRecords.length}</span></p>
                <p>总支出: <span class="badge bg-danger">¥${totalExpense.toFixed(2)}</span></p>
                <p>准备金: <span class="badge bg-warning">¥${totalReserve.toFixed(2)}</span></p>
            `;
        },

        // 加载参与者权重设置
        loadParticipantWeights(containerId) {
            const container = document.getElementById(containerId);
            const approvedParticipants = this.participantsData.filter(p => p.status === 'approved');

            if (approvedParticipants.length === 0) {
                container.innerHTML = '<p class="text-muted">暂无已批准的参与者</p>';
                return;
            }

            const weightsHTML = approvedParticipants.map(participant => `
                <div class="row align-items-center mb-2 participant-weight-row" data-participant-id="${participant.id}">
                    <div class="col-md-6">
                        <div class="d-flex align-items-center">
                            <div class="me-2">
                                ${Utils.avatar.createAvatarHtml(
                                    Utils.avatar.getUserAvatar(participant.user),
                                    "头像",
                                    32,
                                    "",
                                    "user"
                                )}
                            </div>
                            <div>
                                <div class="fw-bold">${participant.user?.username || '未知用户'}</div>
                                <small class="text-muted">${participant.user?.email || ''}</small>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-4">
                        <div class="input-group">
                            <input type="number" class="form-control participant-weight"
                                   value="1" min="0" max="10" step="0.1"
                                   data-participant-id="${participant.id}"
                                   onchange="activityDetailPage.updateParticipantWeight('${participant.id}', this.value)">
                            <span class="input-group-text">权重</span>
                        </div>
                    </div>
                    <div class="col-md-2">
                        <div class="form-check">
                            <input class="form-check-input participant-exempt" type="checkbox"
                                   id="exempt-${participant.id}"
                                   data-participant-id="${participant.id}"
                                   onchange="activityDetailPage.updateParticipantExempt('${participant.id}', this.checked)">
                            <label class="form-check-label" for="exempt-${participant.id}">
                                豁免
                            </label>
                        </div>
                    </div>
                </div>
            `).join('');

            container.innerHTML = weightsHTML;
        },

        // 加载费用豁免设置
        loadExemptionSettings(containerId) {
            const container = document.getElementById(containerId);
            const approvedParticipants = this.participantsData.filter(p => p.status === 'approved');

            if (approvedParticipants.length === 0) {
                container.innerHTML = '<p class="text-muted">暂无已批准的参与者</p>';
                return;
            }

            const exemptionsHTML = approvedParticipants.map(participant => `
                <div class="form-check">
                    <input class="form-check-input exemption-checkbox" type="checkbox"
                           value="${participant.id}" id="exemption-${participant.id}"
                           onchange="activityDetailPage.updateExemptionSettings()">
                    <label class="form-check-label" for="exemption-${participant.id}">
                        ${participant.user?.username || '未知用户'}
                    </label>
                </div>
            `).join('');

            container.innerHTML = exemptionsHTML;
        },

        // 运行模拟结算
        async runSimulation() {
            const includeTeamFund = document.getElementById('includeTeamFund').checked;
            const includeUnconfirmedRecords = document.getElementById('includeUnconfirmedRecords').checked;

            // 收集参与者权重和豁免状态
            const participantSettings = this.collectParticipantSettings();

            try {
                const response = await fetch(`${AppConfig.API_BASE_URL}/api/accounting/activities/${this.activityId}/settlements/simulate`, {
                    method: 'POST',
                    headers: API.getAuthHeaders(),
                    body: JSON.stringify({
                        include_team_fund: includeTeamFund,
                        include_unconfirmed_records: includeUnconfirmedRecords,
                        participant_settings: participantSettings
                    })
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data.success) {
                        this.displaySimulationResults(data.result);
                    } else {
                        Utils.toast.error('模拟计算失败: ' + data.message);
                    }
                } else {
                    Utils.toast.error('模拟计算失败，请检查权限');
                }
            } catch (error) {
                console.error('模拟计算失败:', error);
                Utils.toast.error('模拟计算失败: ' + error.message);
            }
        },

        // 收集参与者设置
        collectParticipantSettings() {
            const settings = [];

            document.querySelectorAll('.participant-weight-row').forEach(row => {
                const participantId = row.dataset.participantId;
                const weightInput = row.querySelector('.participant-weight');
                const exemptCheckbox = row.querySelector('.participant-exempt');

                settings.push({
                    participant_id: participantId,
                    weight: parseFloat(weightInput.value) || 1,
                    is_exempt: exemptCheckbox.checked
                });
            });

            return settings;
        },

        // 显示模拟结果
        displaySimulationResults(result) {
            document.getElementById('simulatedTotalExpense').textContent = `¥${result.total_expense.toFixed(2)}`;
            document.getElementById('simulatedReserveFund').textContent = `¥${result.total_reserve.toFixed(2)}`;
            document.getElementById('simulatedPerPersonCost').textContent = `¥${result.per_person_cost.toFixed(2)}`;
            document.getElementById('simulatedParticipants').textContent = result.participant_count;

            // 显示分摊详情
            const breakdownHTML = `
                <table class="table table-sm">
                    <thead>
                        <tr>
                            <th>参与者</th>
                            <th>权重</th>
                            <th>分摊金额</th>
                            <th>状态</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${result.breakdown.map(item => `
                            <tr>
                                <td>${item.participant_name}</td>
                                <td>${item.weight}</td>
                                <td class="fw-bold">¥${item.share_amount.toFixed(2)}</td>
                                <td>
                                    <span class="badge ${item.is_exempt ? 'bg-warning' : 'bg-success'}">
                                        ${item.is_exempt ? '已豁免' : '正常分摊'}
                                    </span>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;

            document.getElementById('simulatedBreakdown').innerHTML = breakdownHTML;
            document.getElementById('simulationResult').style.display = 'block';
            document.getElementById('createFromSimulationBtn').style.display = 'inline-block';

            // 保存模拟结果用于创建结算
            this.lastSimulationResult = result;
        },

        // 基于模拟结果创建结算
        async createFromSimulation() {
            if (!this.lastSimulationResult) {
                Utils.toast.error('请先运行模拟计算');
                return;
            }

            if (!confirm('确定要基于当前模拟结果创建结算吗？')) {
                return;
            }

            try {
                const response = await fetch(`${AppConfig.API_BASE_URL}/api/accounting/activities/${this.activityId}/settlements`, {
                    method: 'POST',
                    headers: API.getAuthHeaders(),
                    body: JSON.stringify({
                        simulation_result: this.lastSimulationResult,
                        notes: '基于模拟结果创建'
                    })
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data.success) {
                        Utils.toast.success('结算创建成功');
                        // 关闭模态框
                        bootstrap.Modal.getInstance(document.getElementById('simulateSettlementModal')).hide();
                        // 重新加载结算数据
                        await this.loadAccountingData();
                        this.renderSettlements();
                    } else {
                        Utils.toast.error('创建结算失败: ' + data.message);
                    }
                } else {
                    Utils.toast.error('创建结算失败，请检查权限');
                }
            } catch (error) {
                console.error('创建结算失败:', error);
                Utils.toast.error('创建结算失败: ' + error.message);
            }
        },

        // 预览结算
        async previewSettlement() {
            const includeTeamFund = document.getElementById('createIncludeTeamFund').checked;
            const includeUnconfirmedRecords = document.getElementById('createIncludeUnconfirmedRecords').checked;
            const notes = document.getElementById('settlementNotes').value;

            // 收集参与者权重和豁免状态
            const participantSettings = this.collectParticipantSettings();

            try {
                const response = await fetch(`${AppConfig.API_BASE_URL}/api/accounting/activities/${this.activityId}/settlements/simulate`, {
                    method: 'POST',
                    headers: API.getAuthHeaders(),
                    body: JSON.stringify({
                        include_team_fund: includeTeamFund,
                        include_unconfirmed_records: includeUnconfirmedRecords,
                        participant_settings: participantSettings
                    })
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data.success) {
                        this.displaySettlementPreview(data.result);
                        document.getElementById('confirmCreateSettlementBtn').disabled = false;
                        this.lastPreviewResult = data.result;
                    } else {
                        Utils.toast.error('预览结算失败: ' + data.message);
                    }
                } else {
                    Utils.toast.error('预览结算失败，请检查权限');
                }
            } catch (error) {
                console.error('预览结算失败:', error);
                Utils.toast.error('预览结算失败: ' + error.message);
            }
        },

        // 显示结算预览
        displaySettlementPreview(result) {
            document.getElementById('previewTotalExpense').textContent = `¥${result.total_expense.toFixed(2)}`;
            document.getElementById('previewReserveFund').textContent = `¥${result.total_reserve.toFixed(2)}`;
            document.getElementById('previewPerPersonCost').textContent = `¥${result.per_person_cost.toFixed(2)}`;
            document.getElementById('previewParticipants').textContent = result.participant_count;

            // 显示分摊预览
            const breakdownHTML = `
                <table class="table table-sm">
                    <thead>
                        <tr>
                            <th>参与者</th>
                            <th>权重</th>
                            <th>分摊金额</th>
                            <th>状态</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${result.breakdown.map(item => `
                            <tr>
                                <td>${item.participant_name}</td>
                                <td>${item.weight}</td>
                                <td class="fw-bold">¥${item.share_amount.toFixed(2)}</td>
                                <td>
                                    <span class="badge ${item.is_exempt ? 'bg-warning' : 'bg-success'}">
                                        ${item.is_exempt ? '已豁免' : '正常分摊'}
                                    </span>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;

            document.getElementById('previewBreakdown').innerHTML = breakdownHTML;
        },

        // 确认创建结算
        async confirmCreateSettlement() {
            if (!this.lastPreviewResult) {
                Utils.toast.error('请先预览结算');
                return;
            }

            const notes = document.getElementById('settlementNotes').value;

            if (!confirm('确定要创建这个结算吗？')) {
                return;
            }

            try {
                const response = await fetch(`${AppConfig.API_BASE_URL}/api/accounting/activities/${this.activityId}/settlements`, {
                    method: 'POST',
                    headers: API.getAuthHeaders(),
                    body: JSON.stringify({
                        simulation_result: this.lastPreviewResult,
                        notes: notes
                    })
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data.success) {
                        Utils.toast.success('结算创建成功');
                        // 关闭模态框
                        bootstrap.Modal.getInstance(document.getElementById('createSettlementModal')).hide();
                        // 重新加载结算数据
                        await this.loadAccountingData();
                        this.renderSettlements();
                    } else {
                        Utils.toast.error('创建结算失败: ' + data.message);
                    }
                } else {
                    Utils.toast.error('创建结算失败，请检查权限');
                }
            } catch (error) {
                console.error('创建结算失败:', error);
                Utils.toast.error('创建结算失败: ' + error.message);
            }
        },

        // 更新参与者权重
        updateParticipantWeight(participantId, weight) {
            // 权重更新逻辑
            console.log(`更新参与者 ${participantId} 权重为 ${weight}`);
        },

        // 更新参与者豁免状态
        updateParticipantExempt(participantId, isExempt) {
            // 豁免状态更新逻辑
            console.log(`更新参与者 ${participantId} 豁免状态为 ${isExempt}`);
        },

        // 更新豁免设置
        updateExemptionSettings() {
            // 豁免设置更新逻辑
            console.log('更新豁免设置');
        },

        // 替换现有的模拟结算和创建结算方法
        showSimulateSettlementModal() {
            this.createSimulateSettlementModal();
            const modal = new bootstrap.Modal(document.getElementById('simulateSettlementModal'));
            modal.show();
            this.initSimulationData();
        },

        showCreateSettlementModal() {
            this.createCreateSettlementModal();
            const modal = new bootstrap.Modal(document.getElementById('createSettlementModal'));
            modal.show();
            this.initCreateSettlementData();
        }
    });
}

console.log('结算功能扩展已加载');