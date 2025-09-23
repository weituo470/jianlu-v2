"use strict";
const common_vendor = require("../../common/vendor.js");
const api_index = require("../../api/index.js");
const utils_index = require("../../utils/index.js");
const _sfc_main = {
  data() {
    return {
      teamId: null,
      teamInfo: {},
      members: [],
      loading: false,
      isLeader: false
    };
  },
  onLoad(options) {
    if (options.id) {
      this.teamId = parseInt(options.id);
      this.loadTeamDetail();
      this.loadTeamMembers();
    }
  },
  methods: {
    // 加载团队详情
    async loadTeamDetail() {
      try {
        const response = await api_index.groupApi.getTeamDetail(this.teamId);
        if (response.success) {
          this.teamInfo = response.data;
          common_vendor.index.setNavigationBarTitle({
            title: this.teamInfo.name || "团队详情"
          });
        }
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/team-detail/team-detail.vue:118", "加载团队详情失败:", error);
        utils_index.showError("加载团队详情失败");
      }
    },
    // 加载团队成员列表
    async loadTeamMembers() {
      this.loading = true;
      try {
        const response = await api_index.groupApi.getTeamMembers(this.teamId);
        if (response.success) {
          this.members = response.data.members || [];
          this.teamInfo.member_count = response.data.total_members || this.members.length;
          const currentUser = common_vendor.index.getStorageSync("userInfo");
          if (currentUser) {
            this.isLeader = this.members.some(
              (member) => member.id === currentUser.id && member.is_leader
            );
          }
        }
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/team-detail/team-detail.vue:141", "加载团队成员失败:", error);
        utils_index.showError("加载成员列表失败");
      } finally {
        this.loading = false;
      }
    },
    // 格式化加入时间
    formatJoinTime(dateStr) {
      if (!dateStr)
        return "未知";
      try {
        const date = new Date(dateStr);
        const now = /* @__PURE__ */ new Date();
        const diffTime = now - date;
        const diffDays = Math.floor(diffTime / (1e3 * 60 * 60 * 24));
        if (diffDays === 0) {
          return "今天加入";
        } else if (diffDays === 1) {
          return "昨天加入";
        } else if (diffDays < 30) {
          return `${diffDays}天前加入`;
        } else {
          return utils_index.formatDate(dateStr, "YYYY年MM月DD日");
        }
      } catch (error) {
        return "未知";
      }
    },
    // 查看申请管理
    viewApplications() {
      common_vendor.index.navigateTo({
        url: `/pages/team-applications/team-applications?teamId=${this.teamId}&teamName=${encodeURIComponent(this.teamInfo.name)}`
      });
    }
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: common_vendor.t($data.teamInfo.name ? $data.teamInfo.name.charAt(0) : "T"),
    b: common_vendor.t($data.teamInfo.name || "团队详情"),
    c: common_vendor.t($data.teamInfo.member_count || 0),
    d: $data.teamInfo.description
  }, $data.teamInfo.description ? {
    e: common_vendor.t($data.teamInfo.description)
  } : {}, {
    f: common_vendor.t($data.members.length),
    g: $data.loading
  }, $data.loading ? {} : $data.members.length > 0 ? {
    i: common_vendor.f($data.members, (member, k0, i0) => {
      return common_vendor.e({
        a: member.avatar && member.avatar !== "/images/default-avatar.png"
      }, member.avatar && member.avatar !== "/images/default-avatar.png" ? {
        b: member.avatar
      } : {
        c: common_vendor.t(member.nickname ? member.nickname.charAt(0) : "?")
      }, {
        d: common_vendor.t(member.nickname),
        e: member.is_leader
      }, member.is_leader ? {} : {}, {
        f: common_vendor.t(member.role_name),
        g: common_vendor.n(member.is_leader ? "leader" : "member"),
        h: common_vendor.t($options.formatJoinTime(member.joined_at)),
        i: member.id
      });
    })
  } : {}, {
    h: $data.members.length > 0,
    j: $data.isLeader
  }, $data.isLeader ? {
    k: common_vendor.o((...args) => $options.viewApplications && $options.viewApplications(...args))
  } : {});
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-baa2dd34"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/team-detail/team-detail.js.map
