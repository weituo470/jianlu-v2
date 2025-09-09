"use strict";
const common_vendor = require("../../common/vendor.js");
const api_index = require("../../api/index.js");
const utils_index = require("../../utils/index.js");
const _sfc_main = {
  data() {
    return {
      form: {
        title: "",
        description: "",
        team_id: "",
        start_time: "",
        end_time: "",
        location: "",
        min_participants: 5,
        max_participants: 10,
        company_budget: 1e3,
        total_cost: 1200,
        cost_description: "",
        auto_cancel_threshold: "both"
      },
      myTeams: [],
      selectedTeam: null,
      showTeamModal: false,
      submitting: false,
      // 日期时间选择器相关数据
      startDate: "",
      startTime: "",
      // 自动取消选项
      cancelOptions: [
        { value: "min_participants", label: "仅检查最低人数" },
        { value: "max_participants", label: "仅检查最高人数" },
        { value: "both", label: "两者都检查" }
      ]
    };
  },
  onLoad() {
    this.loadMyTeams();
    this.initDefaultDateTime();
  },
  methods: {
    // 加载我的团队列表
    async loadMyTeams() {
      try {
        const response = await api_index.groupApi.getMyTeams();
        if (response.success) {
          this.myTeams = response.data;
          if (this.myTeams.length === 1) {
            this.selectTeam(this.myTeams[0]);
          }
        }
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/dinner-party-create/dinner-party-create.vue:238", "加载团队列表失败:", error);
      }
    },
    // 显示团队选择器
    showTeamPicker() {
      if (this.myTeams.length === 0) {
        utils_index.showError("您还没有加入任何团队");
        return;
      }
      this.showTeamModal = true;
    },
    // 隐藏团队选择器
    hideTeamModal() {
      this.showTeamModal = false;
    },
    // 选择团队
    selectTeam(team) {
      this.selectedTeam = team;
      this.form.team_id = team.id;
      this.hideTeamModal();
    },
    // 初始化默认日期时间
    initDefaultDateTime() {
      const now = /* @__PURE__ */ new Date();
      const nextSaturday = new Date(now);
      const daysUntilSaturday = (6 - now.getDay() + 7) % 7;
      nextSaturday.setDate(now.getDate() + (daysUntilSaturday === 0 ? 7 : daysUntilSaturday));
      this.startDate = this.formatDate(nextSaturday);
      this.startTime = "18:00";
      this.updateFormDateTime();
    },
    // 开始日期选择变化
    onStartDateChange(e) {
      this.startDate = e.detail.value;
      this.updateFormDateTime();
    },
    // 开始时间选择变化
    onStartTimeChange(e) {
      this.startTime = e.detail.value;
      this.updateFormDateTime();
    },
    // 更新表单中的日期时间数据
    updateFormDateTime() {
      if (this.startDate && this.startTime) {
        this.form.start_time = `${this.startDate} ${this.startTime}:00`;
        const startDateTime = new Date(this.form.start_time);
        const endDateTime = new Date(startDateTime.getTime() + 3 * 60 * 60 * 1e3);
        this.form.end_time = this.formatDateTime(endDateTime);
      }
    },
    // 选择自动取消条件
    selectCancelOption(value) {
      this.form.auto_cancel_threshold = value;
    },
    // 格式化日期
    formatDate(date) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    },
    // 格式化日期时间
    formatDateTime(date) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      const hour = String(date.getHours()).padStart(2, "0");
      const minute = String(date.getMinutes()).padStart(2, "0");
      return `${year}-${month}-${day} ${hour}:${minute}:00`;
    },
    // 验证表单
    validateForm() {
      if (!this.form.title.trim()) {
        utils_index.showError("请输入聚餐标题");
        return false;
      }
      if (!this.form.team_id) {
        utils_index.showError("请选择团队");
        return false;
      }
      if (!this.form.start_time) {
        utils_index.showError("请选择聚餐时间");
        return false;
      }
      if (!this.form.location.trim()) {
        utils_index.showError("请输入聚餐地点");
        return false;
      }
      if (!this.form.min_participants || this.form.min_participants < 1) {
        utils_index.showError("最少参与人数至少为1人");
        return false;
      }
      if (!this.form.max_participants || this.form.max_participants < this.form.min_participants) {
        utils_index.showError("最多参与人数不能少于最少参与人数");
        return false;
      }
      if (!this.form.company_budget || this.form.company_budget < 0) {
        utils_index.showError("请输入有效的公司预算");
        return false;
      }
      return true;
    },
    // 保存草稿
    async saveDraft() {
      if (!this.validateForm())
        return;
      this.submitting = true;
      try {
        const formData = { ...this.form, status: "draft" };
        const response = await this.createDinnerParty(formData);
        if (response.success) {
          utils_index.showSuccess("草稿保存成功");
          common_vendor.index.navigateBack();
        }
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/dinner-party-create/dinner-party-create.vue:370", "保存草稿失败:", error);
        utils_index.showError("保存草稿失败");
      } finally {
        this.submitting = false;
      }
    },
    // 发布聚餐活动
    async publishDinnerParty() {
      if (!this.validateForm())
        return;
      this.submitting = true;
      try {
        const formData = { ...this.form, status: "published" };
        const response = await this.createDinnerParty(formData);
        if (response.success) {
          utils_index.showSuccess("聚餐活动发布成功！");
          common_vendor.index.navigateBack();
        }
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/dinner-party-create/dinner-party-create.vue:390", "发布聚餐活动失败:", error);
        utils_index.showError("发布失败: " + (error.message || "未知错误"));
      } finally {
        this.submitting = false;
      }
    },
    // 创建聚餐活动API调用
    async createDinnerParty(formData) {
      const config = require("../../config/env.js");
      const baseUrl = config.API_BASE_URL;
      const token = common_vendor.index.getStorageSync("token");
      if (!token) {
        throw new Error("请先登录");
      }
      const response = await common_vendor.index.request({
        url: `${baseUrl}/activities/dinner-party`,
        method: "POST",
        header: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        data: formData
      });
      if (response.statusCode === 201) {
        return response.data;
      } else {
        throw new Error(response.data.message || "创建失败");
      }
    }
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: $data.form.title,
    b: common_vendor.o(($event) => $data.form.title = $event.detail.value),
    c: $data.form.description,
    d: common_vendor.o(($event) => $data.form.description = $event.detail.value),
    e: common_vendor.t($data.selectedTeam ? $data.selectedTeam.name : "请选择团队"),
    f: !$data.selectedTeam ? 1 : "",
    g: common_vendor.o((...args) => $options.showTeamPicker && $options.showTeamPicker(...args)),
    h: common_vendor.t($data.startDate ? $data.startDate : "请选择日期"),
    i: !$data.startDate ? 1 : "",
    j: $data.startDate,
    k: common_vendor.o((...args) => $options.onStartDateChange && $options.onStartDateChange(...args)),
    l: $data.startDate
  }, $data.startDate ? {
    m: common_vendor.t($data.startTime ? $data.startTime : "请选择时间"),
    n: !$data.startTime ? 1 : "",
    o: $data.startTime,
    p: common_vendor.o((...args) => $options.onStartTimeChange && $options.onStartTimeChange(...args))
  } : {}, {
    q: $data.form.location,
    r: common_vendor.o(($event) => $data.form.location = $event.detail.value),
    s: $data.form.min_participants,
    t: common_vendor.o(common_vendor.m(($event) => $data.form.min_participants = $event.detail.value, {
      number: true
    })),
    v: $data.form.max_participants,
    w: common_vendor.o(common_vendor.m(($event) => $data.form.max_participants = $event.detail.value, {
      number: true
    })),
    x: common_vendor.f($data.cancelOptions, (option, k0, i0) => {
      return {
        a: common_vendor.t($data.form.auto_cancel_threshold === option.value ? "●" : "○"),
        b: common_vendor.t(option.label),
        c: option.value,
        d: $data.form.auto_cancel_threshold === option.value ? 1 : "",
        e: common_vendor.o(($event) => $options.selectCancelOption(option.value), option.value)
      };
    }),
    y: $data.form.company_budget,
    z: common_vendor.o(common_vendor.m(($event) => $data.form.company_budget = $event.detail.value, {
      number: true
    })),
    A: $data.form.total_cost,
    B: common_vendor.o(common_vendor.m(($event) => $data.form.total_cost = $event.detail.value, {
      number: true
    })),
    C: $data.form.cost_description,
    D: common_vendor.o(($event) => $data.form.cost_description = $event.detail.value),
    E: $data.form.company_budget && $data.form.min_participants
  }, $data.form.company_budget && $data.form.min_participants ? common_vendor.e({
    F: common_vendor.t($data.form.company_budget),
    G: common_vendor.t($data.form.total_cost || 0),
    H: $data.form.total_cost > $data.form.company_budget
  }, $data.form.total_cost > $data.form.company_budget ? {
    I: common_vendor.t(($data.form.total_cost - $data.form.company_budget).toFixed(2))
  } : {}, {
    J: $data.form.total_cost > $data.form.company_budget && $data.form.min_participants
  }, $data.form.total_cost > $data.form.company_budget && $data.form.min_participants ? {
    K: common_vendor.t((($data.form.total_cost - $data.form.company_budget) / $data.form.min_participants).toFixed(2))
  } : {}) : {}, {
    L: common_vendor.o((...args) => $options.saveDraft && $options.saveDraft(...args)),
    M: common_vendor.t($data.submitting ? "发布中..." : "发布聚餐活动"),
    N: common_vendor.o((...args) => $options.publishDinnerParty && $options.publishDinnerParty(...args)),
    O: $data.submitting,
    P: common_vendor.o((...args) => _ctx.submitForm && _ctx.submitForm(...args)),
    Q: $data.showTeamModal
  }, $data.showTeamModal ? {
    R: common_vendor.o((...args) => $options.hideTeamModal && $options.hideTeamModal(...args)),
    S: common_vendor.f($data.myTeams, (team, k0, i0) => {
      return {
        a: common_vendor.t(team.name),
        b: common_vendor.t(team.role === "admin" ? "负责人" : "成员"),
        c: team.id,
        d: common_vendor.o(($event) => $options.selectTeam(team), team.id)
      };
    }),
    T: common_vendor.o(() => {
    }),
    U: common_vendor.o((...args) => $options.hideTeamModal && $options.hideTeamModal(...args))
  } : {});
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-f67e48a0"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/dinner-party-create/dinner-party-create.js.map
