"use strict";
const common_vendor = require("../../common/vendor.js");
const api_index = require("../../api/index.js");
const utils_index = require("../../utils/index.js");
const _sfc_main = {
  data() {
    return {
      groups: [],
      loading: false,
      showModal: false,
      showDetailModal: false,
      saving: false,
      selectedGroup: null,
      groupForm: {
        name: "",
        description: ""
      }
    };
  },
  onLoad() {
    this.fetchGroups();
  },
  onShow() {
    this.fetchGroups();
  },
  onPullDownRefresh() {
    this.fetchGroups().finally(() => {
      common_vendor.index.stopPullDownRefresh();
    });
  },
  methods: {
    formatDate: utils_index.formatDate,
    // 获取团队列表
    async fetchGroups() {
      this.loading = true;
      try {
        const response = await api_index.groupApi.getMyTeams();
        if (response.success) {
          this.groups = response.data;
        }
      } catch (error) {
        utils_index.showError("获取团队列表失败");
        common_vendor.index.__f__("error", "at pages/team/team.vue:249", "获取团队列表失败:", error);
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
        description: ""
      };
    },
    // 创建团队
    async createGroup() {
      if (!this.groupForm.name.trim()) {
        utils_index.showError("请输入团队名称");
        return;
      }
      this.saving = true;
      try {
        const data = {
          name: this.groupForm.name,
          description: this.groupForm.description || void 0
        };
        await api_index.groupApi.create(data);
        utils_index.showSuccess("团队创建成功");
        this.hideModal();
        this.fetchGroups();
      } catch (error) {
        utils_index.showError("创建失败");
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
        common_vendor.index.__f__("error", "at pages/team/team.vue:339", "离开群组失败:", error);
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
        common_vendor.index.__f__("log", "at pages/team/team.vue:387", "获取成员预览失败:", error);
      }
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
    l: $data.groupForm.description,
    m: common_vendor.o(($event) => $data.groupForm.description = $event.detail.value),
    n: common_vendor.o((...args) => $options.hideModal && $options.hideModal(...args)),
    o: common_vendor.t($data.saving ? "创建中..." : "创建"),
    p: common_vendor.o((...args) => $options.createGroup && $options.createGroup(...args)),
    q: $data.saving,
    r: common_vendor.o(() => {
    }),
    s: common_vendor.o((...args) => $options.hideModal && $options.hideModal(...args))
  } : {}, {
    t: $data.showDetailModal
  }, $data.showDetailModal ? common_vendor.e({
    v: common_vendor.t((_a = $data.selectedGroup) == null ? void 0 : _a.name),
    w: common_vendor.o((...args) => $options.hideDetailModal && $options.hideDetailModal(...args)),
    x: $data.selectedGroup
  }, $data.selectedGroup ? common_vendor.e({
    y: common_vendor.t($data.selectedGroup.description || "暂无描述"),
    z: common_vendor.t($data.selectedGroup.member_count),
    A: $data.selectedGroup.membersPreview && $data.selectedGroup.membersPreview.length > 0
  }, $data.selectedGroup.membersPreview && $data.selectedGroup.membersPreview.length > 0 ? {
    B: common_vendor.f($data.selectedGroup.membersPreview, (member, index, i0) => {
      return {
        a: common_vendor.t(member.is_leader ? "👑" : "👤"),
        b: common_vendor.t(member.nickname),
        c: member.id,
        d: member.is_leader ? 1 : ""
      };
    })
  } : common_vendor.e({
    C: $data.selectedGroup.role === "admin"
  }, $data.selectedGroup.role === "admin" ? {
    D: common_vendor.t($data.selectedGroup.leader_name || "我")
  } : {}, {
    E: $data.selectedGroup.member_count > 1
  }, $data.selectedGroup.member_count > 1 ? {} : {}), {
    F: $data.selectedGroup.member_count > 4
  }, $data.selectedGroup.member_count > 4 ? {} : {}, {
    G: common_vendor.o(($event) => $options.viewTeamDetail($data.selectedGroup)),
    H: $data.selectedGroup.role === "admin"
  }, $data.selectedGroup.role === "admin" ? {} : {}, {
    I: common_vendor.t($options.formatDate($data.selectedGroup.joined_at, "YYYY年MM月DD日"))
  }) : {}, {
    J: common_vendor.o(($event) => $options.viewTeamDetail($data.selectedGroup)),
    K: common_vendor.o(($event) => $options.viewActivities($data.selectedGroup)),
    L: $data.selectedGroup.role === "admin" || $data.selectedGroup.role === "leader"
  }, $data.selectedGroup.role === "admin" || $data.selectedGroup.role === "leader" ? {
    M: common_vendor.o(($event) => $options.viewApplications($data.selectedGroup))
  } : {}, {
    N: $data.selectedGroup.role !== "admin" && $data.selectedGroup.role !== "leader"
  }, $data.selectedGroup.role !== "admin" && $data.selectedGroup.role !== "leader" ? {
    O: common_vendor.o(($event) => $options.leaveGroup($data.selectedGroup))
  } : {}, {
    P: common_vendor.o(() => {
    }),
    Q: common_vendor.o((...args) => $options.hideDetailModal && $options.hideDetailModal(...args))
  }) : {});
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-dc51e287"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/team/team.js.map
