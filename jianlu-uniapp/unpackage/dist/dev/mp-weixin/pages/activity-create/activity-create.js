"use strict";
const common_vendor = require("../../common/vendor.js");
const api_activity = require("../../api/activity.js");
const api_index = require("../../api/index.js");
const utils_index = require("../../utils/index.js");
const _sfc_main = {
  data() {
    return {
      form: {
        title: "",
        description: "",
        activity_type: "",
        visibility: "public",
        team_id: null,
        start_time: "",
        end_time: "",
        location: "",
        enable_participant_limit: true,
        min_participants: 3,
        max_participants: 30,
        registration_deadline: "",
        require_approval: false,
        is_free: true,
        base_fee: 0
      },
      activityTypes: api_activity.activityTypes,
      myTeams: [],
      selectedTeam: null,
      showTeamModal: false,
      submitting: false,
      // 日期时间选择器相关数据
      startDate: "",
      startTime: "",
      endDate: "",
      endTime: "",
      deadlineDate: "",
      deadlineTime: ""
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
          this.myTeams = response.data.teams || [];
          console.log("加载到的团队列表:", this.myTeams);
        }
      } catch (error) {
        console.error("加载团队列表失败:", error);
      }
    },
    // 选择活动类型
    selectType(type) {
      this.form.activity_type = type;
    },
    // 选择可见性
    selectVisibility(visibility) {
      this.form.visibility = visibility;
      if (visibility === "public") {
        this.form.team_id = null;
        this.selectedTeam = null;
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
      const today = this.formatDate(now);
      const currentTime = this.formatTime(now);
      this.startDate = today;
      this.startTime = currentTime;
      const endDateTime = new Date(now.getTime() + 2 * 60 * 60 * 1e3);
      this.endDate = this.formatDate(endDateTime);
      this.endTime = this.formatTime(endDateTime);
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
    // 结束日期选择变化
    onEndDateChange(e) {
      this.endDate = e.detail.value;
      this.updateFormDateTime();
    },
    // 结束时间选择变化
    onEndTimeChange(e) {
      this.endTime = e.detail.value;
      this.updateFormDateTime();
    },
    // 截止日期选择变化
    onDeadlineDateChange(e) {
      this.deadlineDate = e.detail.value;
      this.updateFormDateTime();
    },
    // 截止时间选择变化
    onDeadlineTimeChange(e) {
      this.deadlineTime = e.detail.value;
      this.updateFormDateTime();
    },
    // 更新表单中的日期时间数据
    updateFormDateTime() {
      if (this.startDate && this.startTime) {
        this.form.start_time = `${this.startDate} ${this.startTime}:00`;
      }
      if (this.endDate && this.endTime) {
        this.form.end_time = `${this.endDate} ${this.endTime}:00`;
      }
      if (this.deadlineDate && this.deadlineTime) {
        this.form.registration_deadline = `${this.deadlineDate} ${this.deadlineTime}:00`;
      } else if (this.deadlineDate) {
        this.form.registration_deadline = `${this.deadlineDate} 23:59:00`;
      } else {
        this.form.registration_deadline = "";
      }
    },
    // 格式化日期
    formatDate(date) {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return `${year}-${month}-${day}`;
    },
    // 格式化时间
    formatTime(date) {
      const hour = String(date.getHours()).padStart(2, "0");
      const minute = String(date.getMinutes()).padStart(2, "0");
      return `${hour}:${minute}`;
    },
    // 切换审核开关
    toggleApproval(e) {
      this.form.require_approval = e.detail.value;
    },
    // 切换人数限制开关
    toggleParticipantLimit(e) {
      this.form.enable_participant_limit = e.detail.value;
      if (!e.detail.value) {
        this.form.min_participants = 0;
        this.form.max_participants = 0;
      } else {
        this.form.min_participants = 3;
        this.form.max_participants = 30;
      }
    },
    // 切换免费开关
    toggleFree(e) {
      this.form.is_free = e.detail.value;
      if (e.detail.value) {
        this.form.base_fee = 0;
      }
    },
    // 验证表单
    validateForm() {
      if (!this.form.title.trim()) {
        utils_index.showError("请输入活动标题");
        return false;
      }
      if (!this.form.activity_type) {
        utils_index.showError("请选择活动类型");
        return false;
      }
      if (!this.form.start_time) {
        utils_index.showError("请选择开始时间");
        return false;
      }
      if (!this.form.end_time) {
        utils_index.showError("请选择结束时间");
        return false;
      }
      if (this.form.visibility === "team" && !this.form.team_id) {
        utils_index.showError("请选择团队");
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
        const response = await api_activity.activityApi.create(formData);
        if (response.success) {
          utils_index.showSuccess("草稿保存成功");
          common_vendor.index.navigateBack();
        }
      } catch (error) {
        console.error("保存草稿失败:", error);
        utils_index.showError("保存草稿失败");
      } finally {
        this.submitting = false;
      }
    },
    // 发布活动
    async publishActivity() {
      if (!this.validateForm())
        return;
      this.submitting = true;
      try {
        const formData = { ...this.form, status: "registration" };
        const response = await api_activity.activityApi.create(formData);
        if (response.success) {
          utils_index.showSuccess("活动发布成功");
          common_vendor.index.navigateBack();
        }
      } catch (error) {
        console.error("发布活动失败:", error);
        utils_index.showError("发布活动失败");
      } finally {
        this.submitting = false;
      }
    },
    // 格式化日期时间
    formatDateTime(datetime) {
      return utils_index.formatDate(datetime, "YYYY年MM月DD日 HH:mm");
    }
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: $data.form.title,
    b: common_vendor.o(($event) => $data.form.title = $event.detail.value),
    c: $data.form.description,
    d: common_vendor.o(($event) => $data.form.description = $event.detail.value),
    e: common_vendor.f($data.activityTypes, (typeInfo, type, i0) => {
      return {
        a: common_vendor.t(typeInfo.icon),
        b: common_vendor.t(typeInfo.name),
        c: type,
        d: $data.form.activity_type === type ? 1 : "",
        e: common_vendor.o(($event) => $options.selectType(type), type)
      };
    }),
    f: $data.form.visibility === "public" ? 1 : "",
    g: common_vendor.o(($event) => $options.selectVisibility("public")),
    h: $data.form.visibility === "team" ? 1 : "",
    i: common_vendor.o(($event) => $options.selectVisibility("team")),
    j: $data.form.visibility === "team"
  }, $data.form.visibility === "team" ? {
    k: common_vendor.t($data.selectedTeam ? $data.selectedTeam.name : "请选择团队"),
    l: !$data.selectedTeam ? 1 : "",
    m: common_vendor.o((...args) => $options.showTeamPicker && $options.showTeamPicker(...args))
  } : {}, {
    n: common_vendor.t($data.startDate ? $data.startDate : "请选择开始日期"),
    o: !$data.startDate ? 1 : "",
    p: $data.startDate,
    q: common_vendor.o((...args) => $options.onStartDateChange && $options.onStartDateChange(...args)),
    r: $data.startDate
  }, $data.startDate ? {
    s: common_vendor.t($data.startTime ? $data.startTime : "请选择开始时间"),
    t: !$data.startTime ? 1 : "",
    v: $data.startTime,
    w: common_vendor.o((...args) => $options.onStartTimeChange && $options.onStartTimeChange(...args))
  } : {}, {
    x: common_vendor.t($data.endDate ? $data.endDate : "请选择结束日期"),
    y: !$data.endDate ? 1 : "",
    z: $data.endDate,
    A: common_vendor.o((...args) => $options.onEndDateChange && $options.onEndDateChange(...args)),
    B: $data.endDate
  }, $data.endDate ? {
    C: common_vendor.t($data.endTime ? $data.endTime : "请选择结束时间"),
    D: !$data.endTime ? 1 : "",
    E: $data.endTime,
    F: common_vendor.o((...args) => $options.onEndTimeChange && $options.onEndTimeChange(...args))
  } : {}, {
    G: $data.form.location,
    H: common_vendor.o(($event) => $data.form.location = $event.detail.value),
    I: $data.form.enable_participant_limit,
    J: common_vendor.o((...args) => $options.toggleParticipantLimit && $options.toggleParticipantLimit(...args)),
    K: $data.form.enable_participant_limit
  }, $data.form.enable_participant_limit ? {
    L: $data.form.min_participants,
    M: common_vendor.o(common_vendor.m(($event) => $data.form.min_participants = $event.detail.value, {
      number: true
    })),
    N: $data.form.max_participants,
    O: common_vendor.o(common_vendor.m(($event) => $data.form.max_participants = $event.detail.value, {
      number: true
    }))
  } : {}, {
    P: common_vendor.t($data.deadlineDate ? $data.deadlineDate : "请选择截止日期（可选）"),
    Q: !$data.deadlineDate ? 1 : "",
    R: $data.deadlineDate,
    S: common_vendor.o((...args) => $options.onDeadlineDateChange && $options.onDeadlineDateChange(...args)),
    T: $data.deadlineDate
  }, $data.deadlineDate ? {
    U: common_vendor.t($data.deadlineTime ? $data.deadlineTime : "请选择截止时间"),
    V: !$data.deadlineTime ? 1 : "",
    W: $data.deadlineTime,
    X: common_vendor.o((...args) => $options.onDeadlineTimeChange && $options.onDeadlineTimeChange(...args))
  } : {}, {
    Y: $data.form.require_approval,
    Z: common_vendor.o((...args) => $options.toggleApproval && $options.toggleApproval(...args)),
    aa: $data.form.is_free,
    ab: common_vendor.o((...args) => $options.toggleFree && $options.toggleFree(...args)),
    ac: !$data.form.is_free
  }, !$data.form.is_free ? {
    ad: $data.form.base_fee,
    ae: common_vendor.o(common_vendor.m(($event) => $data.form.base_fee = $event.detail.value, {
      number: true
    }))
  } : {}, {
    af: common_vendor.o((...args) => $options.saveDraft && $options.saveDraft(...args)),
    ag: common_vendor.o((...args) => $options.publishActivity && $options.publishActivity(...args)),
    ah: common_vendor.o((...args) => _ctx.submitForm && _ctx.submitForm(...args)),
    ai: $data.showTeamModal
  }, $data.showTeamModal ? {
    aj: common_vendor.o((...args) => $options.hideTeamModal && $options.hideTeamModal(...args)),
    ak: common_vendor.f($data.myTeams, (team, k0, i0) => {
      return {
        a: common_vendor.t(team.name),
        b: common_vendor.t(team.role === "admin" ? "负责人" : "成员"),
        c: team.id,
        d: common_vendor.o(($event) => $options.selectTeam(team), team.id)
      };
    }),
    al: common_vendor.o(() => {
    }),
    am: common_vendor.o((...args) => $options.hideTeamModal && $options.hideTeamModal(...args))
  } : {});
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-095a2a8e"]]);
wx.createPage(MiniProgramPage);
