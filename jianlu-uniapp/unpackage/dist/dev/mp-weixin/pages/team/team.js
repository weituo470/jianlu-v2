"use strict";
const common_vendor = require("../../common/vendor.js");
const api_index = require("../../api/index.js");
const utils_index = require("../../utils/index.js");
const _sfc_main = {
  data() {
    return {
      groups: [],
      teamTypes: [
        { value: "general", label: "通用团队" }
      ],
      // 团队类型列表，初始化默认值
      loading: false,
      showModal: false,
      showDetailModal: false,
      saving: false,
      selectedGroup: null,
      groupForm: {
        name: "",
        description: "",
        team_type: "general",
        avatar_url: ""
      }
    };
  },
  computed: {
    // 计算团队类型选择器的索引
    teamTypeIndex() {
      if (!this.teamTypes || this.teamTypes.length === 0) {
        return 0;
      }
      const index = this.teamTypes.findIndex((t) => t.value === this.groupForm.team_type);
      return index >= 0 ? index : 0;
    }
  },
  onLoad() {
    this.loadInitialData();
  },
  onShow() {
    this.loadInitialData();
  },
  onPullDownRefresh() {
    this.fetchGroups().finally(() => {
      common_vendor.index.stopPullDownRefresh();
    });
  },
  methods: {
    formatDate: utils_index.formatDate,
    // 加载初始数据
    async loadInitialData() {
      await Promise.all([
        this.fetchGroups(),
        this.loadTeamTypes()
      ]);
    },
    // 加载团队类型
    async loadTeamTypes() {
      try {
        const teamTypesTemp = [
          { value: "general", label: "通用团队" },
          { value: "development", label: "开发团队" },
          { value: "design", label: "设计团队" },
          { value: "marketing", label: "市场团队" },
          { value: "sales", label: "销售团队" },
          { value: "support", label: "客服团队" },
          { value: "hr", label: "人事团队" },
          { value: "finance", label: "财务团队" },
          { value: "other", label: "其他" }
        ];
        this.teamTypes = teamTypesTemp;
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/team/team.vue:306", "加载团队类型失败:", error);
        const defaultTeamTypesTemp = [
          { value: "general", label: "通用团队" }
        ];
        this.teamTypes = defaultTeamTypesTemp;
      }
    },
    // 获取团队列表
    async fetchGroups() {
      this.loading = true;
      try {
        const response = await api_index.groupApi.getMyTeams();
        if (response.success) {
          const teams = response.data.teams || response.data || [];
          this.groups = Array.isArray(teams) ? teams : [];
        }
      } catch (error) {
        utils_index.showError("获取团队列表失败");
        common_vendor.index.__f__("error", "at pages/team/team.vue:328", "获取团队列表失败:", error);
      } finally {
        this.loading = false;
      }
    },
    // 显示创建弹窗
    showCreateModal() {
      this.resetForm();
      this.showModal = true;
    },
    // 隐藏创建弹窗
    hideModal() {
      this.showModal = false;
      this.resetForm();
    },
    // 重置表单
    resetForm() {
      this.groupForm = {
        name: "",
        description: "",
        team_type: "general",
        avatar_url: ""
      };
    },
    // 创建团队
    async createGroup() {
      var _a, _b;
      if (!this.groupForm.name.trim()) {
        utils_index.showError("请输入团队名称");
        return;
      }
      if (this.groupForm.name.trim().length < 2) {
        utils_index.showError("团队名称至少2个字符");
        return;
      }
      if (this.groupForm.name.trim().length > 50) {
        utils_index.showError("团队名称不能超过50个字符");
        return;
      }
      if (this.groupForm.description && this.groupForm.description.length > 500) {
        utils_index.showError("团队描述不能超过500个字符");
        return;
      }
      this.saving = true;
      try {
        const data = {
          name: this.groupForm.name.trim(),
          description: ((_a = this.groupForm.description) == null ? void 0 : _a.trim()) || "",
          team_type: this.groupForm.team_type || "general",
          avatar_url: ((_b = this.groupForm.avatar_url) == null ? void 0 : _b.trim()) || null
        };
        const response = await api_index.groupApi.create(data);
        if (response.success) {
          utils_index.showSuccess("团队创建成功");
          this.hideModal();
          this.fetchGroups();
        } else {
          throw new Error(response.message || "创建失败");
        }
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/team/team.vue:397", "创建团队失败:", error);
        utils_index.showError(error.message || "创建失败，请稍后重试");
      } finally {
        this.saving = false;
      }
    },
    // 查看团队详情
    async viewGroup(group) {
      this.selectedGroup = group;
      await this.loadTeamMembersPreview(group.id);
      this.showDetailModal = true;
    },
    // 隐藏详情弹窗
    hideDetailModal() {
      this.showDetailModal = false;
      this.selectedGroup = null;
    },
    // 查看团队活动
    viewActivities(group) {
      this.hideDetailModal();
      common_vendor.index.switchTab({
        url: `/pages/activity/activity?groupId=${group.id}`
      });
    },
    // 离开群组
    async leaveGroup(group) {
      if (group.role === "admin" || group.role === "leader") {
        utils_index.showError("团队负责人不能退出团队，请先转让负责人权限");
        return;
      }
      const confirmed = await utils_index.showConfirm(`确定要离开群组"${group.name}"吗？`);
      if (!confirmed)
        return;
      try {
        await api_index.groupApi.leave(group.id);
        utils_index.showSuccess("已离开群组");
        this.hideDetailModal();
        this.fetchGroups();
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/team/team.vue:443", "离开群组失败:", error);
        if (error.message && error.message.includes("负责人")) {
          utils_index.showError("团队负责人不能退出团队，请先转让负责人权限");
        } else if (error.message && error.message.includes("不在该团队中")) {
          utils_index.showError("您不在该团队中，请刷新页面");
          this.fetchGroups();
        } else {
          utils_index.showError("离开群组失败，请稍后重试");
        }
      }
    },
    // 浏览团队
    browseTeams() {
      common_vendor.index.navigateTo({
        url: "/pages/team-browse/team-browse"
      });
    },
    // 查看申请管理
    viewApplications(group) {
      common_vendor.index.navigateTo({
        url: `/pages/team-applications/team-applications?teamId=${group.id}&teamName=${encodeURIComponent(group.name)}`
      });
    },
    // 查看团队详情和成员列表
    viewTeamDetail(group) {
      this.hideDetailModal();
      common_vendor.index.navigateTo({
        url: `/pages/team-detail/team-detail?id=${group.id}`
      });
    },
    // 加载团队成员预览（前4个成员）
    async loadTeamMembersPreview(teamId) {
      var _a;
      try {
        const response = await api_index.groupApi.getTeamMembers(teamId);
        if (response.success && response.data.members) {
          this.selectedGroup.membersPreview = response.data.members.slice(0, 4);
          this.selectedGroup.leader_name = ((_a = response.data.members.find((m) => m.is_leader)) == null ? void 0 : _a.nickname) || "负责人";
        }
      } catch (error) {
        common_vendor.index.__f__("log", "at pages/team/team.vue:491", "获取成员预览失败:", error);
      }
    },
    // 团队类型选择相关方法
    onTeamTypeChange(e) {
      const index = e.detail.value;
      this.groupForm.team_type = this.teamTypes[index].value;
    },
    getSelectedTeamTypeName() {
      if (!this.teamTypes || this.teamTypes.length === 0) {
        return "通用团队";
      }
      const type = this.teamTypes.find((t) => t.value === this.groupForm.team_type);
      return type ? type.label : "通用团队";
    }
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  var _a;
  return common_vendor.e({
    a: common_vendor.o((...args) => $options.browseTeams && $options.browseTeams(...args)),
    b: common_vendor.o((...args) => $options.showCreateModal && $options.showCreateModal(...args)),
    c: $data.groups.length > 0
  }, $data.groups.length > 0 ? {
    d: common_vendor.f($data.groups, (group, k0, i0) => {
      return common_vendor.e({
        a: common_vendor.t(group.name.charAt(0)),
        b: common_vendor.t(group.name),
        c: common_vendor.t(group.member_count),
        d: group.role === "admin"
      }, group.role === "admin" ? {} : {}, {
        e: common_vendor.t(group.role === "admin" ? "负责人" : "成员"),
        f: common_vendor.n(group.role),
        g: group.role === "admin"
      }, group.role === "admin" ? {} : {}, {
        h: group.description
      }, group.description ? {
        i: common_vendor.t(group.description)
      } : {}, {
        j: common_vendor.t($options.formatDate(group.joined_at, "YYYY-MM-DD")),
        k: common_vendor.o(($event) => $options.viewActivities(group), group.id),
        l: group.id,
        m: common_vendor.o(($event) => $options.viewGroup(group), group.id)
      });
    })
  } : !$data.loading ? {
    f: common_vendor.o((...args) => $options.showCreateModal && $options.showCreateModal(...args))
  } : {}, {
    e: !$data.loading,
    g: $data.loading
  }, $data.loading ? {} : {}, {
    h: $data.showModal
  }, $data.showModal ? {
    i: common_vendor.o((...args) => $options.hideModal && $options.hideModal(...args)),
    j: $data.groupForm.name,
    k: common_vendor.o(($event) => $data.groupForm.name = $event.detail.value),
    l: common_vendor.t($options.getSelectedTeamTypeName()),
    m: $data.teamTypes,
    n: $options.teamTypeIndex,
    o: common_vendor.o((...args) => $options.onTeamTypeChange && $options.onTeamTypeChange(...args)),
    p: $data.groupForm.description,
    q: common_vendor.o(($event) => $data.groupForm.description = $event.detail.value),
    r: $data.groupForm.avatar_url,
    s: common_vendor.o(($event) => $data.groupForm.avatar_url = $event.detail.value),
    t: common_vendor.o((...args) => $options.hideModal && $options.hideModal(...args)),
    v: common_vendor.t($data.saving ? "创建中..." : "创建"),
    w: common_vendor.o((...args) => $options.createGroup && $options.createGroup(...args)),
    x: $data.saving,
    y: common_vendor.o(() => {
    }),
    z: common_vendor.o((...args) => $options.hideModal && $options.hideModal(...args))
  } : {}, {
    A: $data.showDetailModal
  }, $data.showDetailModal ? common_vendor.e({
    B: common_vendor.t((_a = $data.selectedGroup) == null ? void 0 : _a.name),
    C: common_vendor.o((...args) => $options.hideDetailModal && $options.hideDetailModal(...args)),
    D: $data.selectedGroup
  }, $data.selectedGroup ? common_vendor.e({
    E: common_vendor.t($data.selectedGroup.description || "暂无描述"),
    F: common_vendor.t($data.selectedGroup.member_count),
    G: $data.selectedGroup.membersPreview && $data.selectedGroup.membersPreview.length > 0
  }, $data.selectedGroup.membersPreview && $data.selectedGroup.membersPreview.length > 0 ? {
    H: common_vendor.f($data.selectedGroup.membersPreview, (member, index, i0) => {
      return {
        a: common_vendor.t(member.is_leader ? "👑" : "👤"),
        b: common_vendor.t(member.nickname),
        c: member.id,
        d: member.is_leader ? 1 : ""
      };
    })
  } : common_vendor.e({
    I: $data.selectedGroup.role === "admin"
  }, $data.selectedGroup.role === "admin" ? {
    J: common_vendor.t($data.selectedGroup.leader_name || "我")
  } : {}, {
    K: $data.selectedGroup.member_count > 1
  }, $data.selectedGroup.member_count > 1 ? {} : {}), {
    L: $data.selectedGroup.member_count > 4
  }, $data.selectedGroup.member_count > 4 ? {} : {}, {
    M: common_vendor.o(($event) => $options.viewTeamDetail($data.selectedGroup)),
    N: $data.selectedGroup.role === "admin"
  }, $data.selectedGroup.role === "admin" ? {} : {}, {
    O: common_vendor.t($options.formatDate($data.selectedGroup.joined_at, "YYYY年MM月DD日"))
  }) : {}, {
    P: common_vendor.o(($event) => $options.viewTeamDetail($data.selectedGroup)),
    Q: common_vendor.o(($event) => $options.viewActivities($data.selectedGroup)),
    R: $data.selectedGroup.role === "admin" || $data.selectedGroup.role === "leader"
  }, $data.selectedGroup.role === "admin" || $data.selectedGroup.role === "leader" ? {
    S: common_vendor.o(($event) => $options.viewApplications($data.selectedGroup))
  } : {}, {
    T: $data.selectedGroup.role !== "admin" && $data.selectedGroup.role !== "leader"
  }, $data.selectedGroup.role !== "admin" && $data.selectedGroup.role !== "leader" ? {
    U: common_vendor.o(($event) => $options.leaveGroup($data.selectedGroup))
  } : {}, {
    V: common_vendor.o(() => {
    }),
    W: common_vendor.o((...args) => $options.hideDetailModal && $options.hideDetailModal(...args))
  }) : {});
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-dc51e287"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/team/team.js.map
