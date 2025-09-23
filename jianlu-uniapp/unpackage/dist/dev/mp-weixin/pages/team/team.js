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
      },
      // 添加用户团队关系数据
      userTeams: [],
      // 添加用户申请状态数据
      userApplications: []
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
        this.loadTeamTypes(),
        this.loadUserTeams(),
        this.loadUserApplications()
        // 加载用户申请记录
      ]);
    },
    // 加载用户申请记录
    async loadUserApplications() {
      try {
        const response = await api_index.groupApi.getMyApplications();
        if (response.success) {
          this.userApplications = response.data.applications || [];
        }
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/team/team.vue:327", "加载用户申请记录失败:", error);
        this.userApplications = [];
      }
    },
    // 加载用户已加入的团队
    async loadUserTeams() {
      try {
        const response = await api_index.groupApi.getMyTeams();
        if (response.success) {
          const teams = response.data.teams || response.data || [];
          this.userTeams = Array.isArray(teams) ? teams : [];
        }
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/team/team.vue:341", "加载用户团队失败:", error);
        this.userTeams = [];
      }
    },
    // 加载团队类型
    async loadTeamTypes() {
      try {
        const response = await api_index.groupApi.getTeamTypes();
        if (response.success) {
          this.teamTypes = response.data || [];
        }
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/team/team.vue:355", "加载团队类型失败:", error);
        this.teamTypes = [
          { value: "general", label: "通用团队" }
        ];
      }
    },
    // 获取团队列表（全部团队）
    async fetchGroups() {
      this.loading = true;
      try {
        const response = await api_index.groupApi.getList();
        if (response.success) {
          const teams = response.data.teams || response.data || [];
          this.groups = Array.isArray(teams) ? teams : [];
        }
      } catch (error) {
        utils_index.showError("获取团队列表失败");
        common_vendor.index.__f__("error", "at pages/team/team.vue:375", "获取团队列表失败:", error);
      } finally {
        this.loading = false;
      }
    },
    // 获取用户在团队中的角色
    getUserRole(group) {
      const userTeam = this.userTeams.find((t) => t.id === group.id);
      if (userTeam) {
        return userTeam.role || "member";
      }
      return "none";
    },
    // 检查用户是否已申请加入团队
    isGroupApplied(group) {
      return this.userApplications.some(
        (app) => app.teamId === group.id && app.status === "pending"
      );
    },
    // 检查用户是否可以申请加入团队
    canApplyToGroup(group) {
      const userRole = this.getUserRole(group);
      return userRole === "none" && !this.isGroupApplied(group);
    },
    // 获取团队卡片上的按钮文本
    getGroupActionButtonText(group) {
      const userRole = this.getUserRole(group);
      if (userRole === "admin" || userRole === "member") {
        return "查看详情";
      }
      if (this.isGroupApplied(group)) {
        return "已申请";
      }
      return "加入团队";
    },
    // 根据用户角色决定点击行为
    joinOrViewGroup(group) {
      const userRole = this.getUserRole(group);
      if (userRole === "none" && !this.isGroupApplied(group)) {
        this.applyToJoinGroup(group);
      } else {
        this.viewGroup(group);
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
          this.loadUserTeams();
        } else {
          throw new Error(response.message || "创建失败");
        }
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/team/team.vue:496", "创建团队失败:", error);
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
    // 申请加入团队
    async applyToJoinGroup(group) {
      try {
        const response = await api_index.groupApi.apply(group.id, {
          reason: "希望能够加入这个团队，参与团队活动和项目，与大家一起学习和成长。"
        });
        if (response.success) {
          utils_index.showSuccess("申请已提交，请等待审核");
          this.userApplications.push({
            id: response.data.id,
            teamId: group.id,
            status: "pending",
            applicationTime: response.data.applicationTime
          });
          this.loadInitialData();
        } else {
          throw new Error(response.message || "申请失败");
        }
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/team/team.vue:546", "申请加入团队失败:", error);
        utils_index.showError(error.message || "申请失败，请稍后重试");
      }
    },
    // 离开群组
    async leaveGroup(group) {
      const confirmed = await utils_index.showConfirm(`确定要离开团队"${group.name}"吗？`);
      if (!confirmed)
        return;
      try {
        await api_index.groupApi.leave(group.id);
        utils_index.showSuccess("已离开团队");
        this.hideDetailModal();
        this.loadInitialData();
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/team/team.vue:563", "离开团队失败:", error);
        utils_index.showError("离开团队失败，请稍后重试");
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
        common_vendor.index.__f__("log", "at pages/team/team.vue:601", "获取成员预览失败:", error);
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
        d: $options.getUserRole(group) === "admin"
      }, $options.getUserRole(group) === "admin" ? {} : {}, {
        e: common_vendor.t($options.getUserRole(group) === "admin" ? "负责人" : $options.getUserRole(group) === "member" ? "成员" : "未加入"),
        f: common_vendor.n($options.getUserRole(group)),
        g: $options.getUserRole(group) === "admin"
      }, $options.getUserRole(group) === "admin" ? {} : {}, {
        h: group.description
      }, group.description ? {
        i: common_vendor.t(group.description)
      } : {}, {
        j: common_vendor.t($options.formatDate(group.created_at, "YYYY-MM-DD")),
        k: common_vendor.t($options.getGroupActionButtonText(group)),
        l: common_vendor.o(($event) => $options.joinOrViewGroup(group), group.id),
        m: $options.getUserRole(group) === "none" ? 1 : "",
        n: $options.getUserRole(group) === "member" || $options.getUserRole(group) === "admin" ? 1 : "",
        o: group.id,
        p: common_vendor.o(($event) => $options.viewGroup(group), group.id)
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
    I: $options.getUserRole($data.selectedGroup) === "admin"
  }, $options.getUserRole($data.selectedGroup) === "admin" ? {
    J: common_vendor.t($data.selectedGroup.leader_name || "我")
  } : {}, {
    K: $data.selectedGroup.member_count > 1
  }, $data.selectedGroup.member_count > 1 ? {} : {}), {
    L: $data.selectedGroup.member_count > 4
  }, $data.selectedGroup.member_count > 4 ? {} : {}, {
    M: common_vendor.o(($event) => $options.viewTeamDetail($data.selectedGroup)),
    N: $options.getUserRole($data.selectedGroup) === "admin"
  }, $options.getUserRole($data.selectedGroup) === "admin" ? {} : $options.getUserRole($data.selectedGroup) === "member" ? {} : {}, {
    O: $options.getUserRole($data.selectedGroup) === "member",
    P: common_vendor.t($options.formatDate($data.selectedGroup.created_at, "YYYY年MM月DD日"))
  }) : {}, {
    Q: common_vendor.o(($event) => $options.viewTeamDetail($data.selectedGroup)),
    R: common_vendor.o(($event) => $options.viewActivities($data.selectedGroup)),
    S: $options.getUserRole($data.selectedGroup) === "admin"
  }, $options.getUserRole($data.selectedGroup) === "admin" ? {
    T: common_vendor.o(($event) => $options.viewApplications($data.selectedGroup))
  } : {}, {
    U: $options.canApplyToGroup($data.selectedGroup)
  }, $options.canApplyToGroup($data.selectedGroup) ? {
    V: common_vendor.o(($event) => $options.applyToJoinGroup($data.selectedGroup))
  } : {}, {
    W: $options.isGroupApplied($data.selectedGroup)
  }, $options.isGroupApplied($data.selectedGroup) ? {} : {}, {
    X: $options.getUserRole($data.selectedGroup) === "member"
  }, $options.getUserRole($data.selectedGroup) === "member" ? {
    Y: common_vendor.o(($event) => $options.leaveGroup($data.selectedGroup))
  } : {}, {
    Z: common_vendor.o(() => {
    }),
    aa: common_vendor.o((...args) => $options.hideDetailModal && $options.hideDetailModal(...args))
  }) : {});
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-dc51e287"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/team/team.js.map
