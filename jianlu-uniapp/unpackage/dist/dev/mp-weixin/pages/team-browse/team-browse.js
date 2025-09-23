"use strict";
const common_vendor = require("../../common/vendor.js");
const api_index = require("../../api/index.js");
const utils_request = require("../../utils/request.js");
const utils_index = require("../../utils/index.js");
const _sfc_main = {
  data() {
    return {
      teams: [],
      loading: false,
      refreshing: false,
      searchKeyword: "",
      page: 1,
      pageSize: 15,
      hasMore: true
    };
  },
  onLoad() {
    this.loadTeams();
  },
  onPullDownRefresh() {
    this.onRefresh();
  },
  methods: {
    formatDate: utils_index.formatDate,
    // 加载团队列表
    async loadTeams(refresh = false) {
      if (this.loading)
        return;
      this.loading = true;
      try {
        const page = refresh ? 1 : this.page;
        const params = {
          page,
          pageSize: this.pageSize,
          search: this.searchKeyword || void 0
        };
        const response = await utils_request.get("/wechat/teams", { params });
        if (response.success) {
          const newTeams = refresh ? response.data : [...this.teams, ...response.data];
          this.teams = newTeams;
          this.page = refresh ? 2 : this.page + 1;
          this.hasMore = response.data.length >= this.pageSize;
          this.refreshing = false;
        }
      } catch (error) {
        utils_index.showError("加载团队列表失败");
      } finally {
        this.loading = false;
        if (refresh) {
          common_vendor.index.stopPullDownRefresh();
        }
      }
    },
    // 下拉刷新
    onRefresh() {
      this.refreshing = true;
      this.page = 1;
      this.hasMore = true;
      this.loadTeams(true);
    },
    // 上拉加载更多
    loadMore() {
      if (this.hasMore && !this.loading) {
        this.loadTeams();
      }
    },
    // 搜索输入
    onSearchInput() {
    },
    // 搜索团队
    searchTeams() {
      this.page = 1;
      this.hasMore = true;
      this.teams = [];
      this.loadTeams(true);
    },
    // 查看团队详情
    viewTeamDetail(team) {
      common_vendor.index.__f__("log", "at pages/team-browse/team-browse.vue:192", "查看团队详情:", team);
    },
    // 申请加入团队
    async applyToJoin(team) {
      try {
        await api_index.groupApi.apply(team.id, { reason: "希望能够加入这个团队，参与团队活动和项目，与大家一起学习和成长。" });
        utils_index.showSuccess("申请提交成功，请等待审核");
        this.onRefresh();
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/team-browse/team-browse.vue:202", "申请提交失败:", error);
        if (error.message && error.message.includes("已经提交过申请")) {
          utils_index.showError("您已经提交过申请，请等待审核");
        } else if (error.message && error.message.includes("已经是该团队的成员")) {
          utils_index.showError("您已经是该团队的成员");
        } else {
          utils_index.showError("申请提交失败，请稍后重试");
        }
      }
    },
    // 获取状态样式类
    getStatusClass(status) {
      const classMap = {
        "none": "status-none",
        "pending": "status-pending",
        "approved": "status-approved",
        "rejected": "status-rejected",
        "member": "status-member"
      };
      return classMap[status] || "status-none";
    },
    // 获取状态文本
    getStatusText(status) {
      const textMap = {
        "none": "可申请",
        "pending": "申请中",
        "approved": "已通过",
        "rejected": "已拒绝",
        "member": "已加入"
      };
      return textMap[status] || "可申请";
    }
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: common_vendor.o([($event) => $data.searchKeyword = $event.detail.value, (...args) => $options.onSearchInput && $options.onSearchInput(...args)]),
    b: $data.searchKeyword,
    c: common_vendor.o((...args) => $options.searchTeams && $options.searchTeams(...args)),
    d: common_vendor.f($data.teams, (team, k0, i0) => {
      return common_vendor.e({
        a: common_vendor.t(team.name.charAt(0)),
        b: common_vendor.t(team.name),
        c: common_vendor.t(team.member_count),
        d: common_vendor.t(team.leader_name),
        e: common_vendor.t($options.getStatusText(team.application_status)),
        f: common_vendor.n($options.getStatusClass(team.application_status)),
        g: team.description
      }, team.description ? {
        h: common_vendor.t(team.description)
      } : {}, {
        i: common_vendor.t($options.formatDate(team.created_at, "YYYY-MM-DD")),
        j: team.can_apply
      }, team.can_apply ? {
        k: common_vendor.o(($event) => $options.applyToJoin(team), team.id)
      } : team.application_status === "pending" ? {} : {}, {
        l: team.application_status === "pending",
        m: team.id,
        n: common_vendor.o(($event) => $options.viewTeamDetail(team), team.id)
      });
    }),
    e: $data.loading
  }, $data.loading ? {} : {}, {
    f: $data.teams.length === 0 && !$data.loading
  }, $data.teams.length === 0 && !$data.loading ? {} : {}, {
    g: $data.refreshing,
    h: common_vendor.o((...args) => $options.onRefresh && $options.onRefresh(...args)),
    i: common_vendor.o((...args) => $options.loadMore && $options.loadMore(...args))
  });
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-ca2390ce"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/team-browse/team-browse.js.map
