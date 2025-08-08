"use strict";
const common_vendor = require("../../common/vendor.js");
const api_index = require("../../api/index.js");
const utils_index = require("../../utils/index.js");
const _sfc_main = {
  data() {
    return {
      teamId: "",
      teamName: "",
      currentStatus: "pending",
      applications: [],
      stats: null,
      loading: false,
      processing: false,
      hasMore: true,
      page: 1,
      pageSize: 10,
      // 处理申请相关
      showProcessModal: false,
      selectedApplication: null,
      processAction: "",
      processNote: ""
    };
  },
  onLoad(options) {
    this.teamId = options.teamId;
    this.teamName = decodeURIComponent(options.teamName || "团队");
    this.loadApplications();
    this.loadStats();
  },
  onPullDownRefresh() {
    this.onRefresh();
  },
  onReachBottom() {
    if (this.hasMore && !this.loading) {
      this.loadMore();
    }
  },
  methods: {
    formatDate: utils_index.formatDate,
    // 刷新数据
    async onRefresh() {
      this.page = 1;
      this.hasMore = true;
      this.applications = [];
      await Promise.all([
        this.loadApplications(),
        this.loadStats()
      ]);
      common_vendor.index.stopPullDownRefresh();
    },
    // 切换状态筛选
    switchStatus(status) {
      if (this.currentStatus === status)
        return;
      this.currentStatus = status;
      this.page = 1;
      this.hasMore = true;
      this.applications = [];
      this.loadApplications();
    },
    // 加载申请列表
    async loadApplications() {
      if (this.loading)
        return;
      this.loading = true;
      try {
        const response = await api_index.groupApi.getTeamApplications(this.teamId, {
          page: this.page,
          pageSize: this.pageSize,
          status: this.currentStatus
        });
        if (response.success) {
          const newApplications = response.data.list;
          if (this.page === 1) {
            this.applications = newApplications;
          } else {
            this.applications.push(...newApplications);
          }
          this.hasMore = this.page < response.data.totalPages;
        }
      } catch (error) {
        utils_index.showError("加载申请列表失败");
        common_vendor.index.__f__("error", "at pages/team-applications/team-applications.vue:273", "加载申请列表失败:", error);
      } finally {
        this.loading = false;
      }
    },
    // 加载统计信息
    async loadStats() {
      try {
        const response = await api_index.groupApi.getApplicationStats(this.teamId);
        if (response.success) {
          this.stats = response.data;
        }
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/team-applications/team-applications.vue:287", "加载统计信息失败:", error);
      }
    },
    // 加载更多
    loadMore() {
      this.page++;
      this.loadApplications();
    },
    // 批准申请
    approveApplication(application) {
      this.selectedApplication = application;
      this.processAction = "approved";
      this.processNote = "";
      this.showProcessModal = true;
    },
    // 拒绝申请
    rejectApplication(application) {
      this.selectedApplication = application;
      this.processAction = "rejected";
      this.processNote = "";
      this.showProcessModal = true;
    },
    // 隐藏处理弹窗
    hideProcessModal() {
      this.showProcessModal = false;
      this.selectedApplication = null;
      this.processAction = "";
      this.processNote = "";
    },
    // 确认处理
    async confirmProcess() {
      if (this.processing)
        return;
      this.processing = true;
      try {
        await api_index.groupApi.processApplication(this.selectedApplication.id, {
          action: this.processAction,
          note: this.processNote
        });
        utils_index.showSuccess(this.processAction === "approved" ? "申请已批准" : "申请已拒绝");
        this.hideProcessModal();
        this.onRefresh();
      } catch (error) {
        utils_index.showError("处理申请失败");
        common_vendor.index.__f__("error", "at pages/team-applications/team-applications.vue:337", "处理申请失败:", error);
      } finally {
        this.processing = false;
      }
    },
    // 获取状态样式类
    getStatusClass(status) {
      const classMap = {
        "pending": "status-pending",
        "approved": "status-approved",
        "rejected": "status-rejected"
      };
      return classMap[status] || "status-pending";
    },
    // 获取状态文本
    getStatusText(status) {
      const textMap = {
        "pending": "待处理",
        "approved": "已批准",
        "rejected": "已拒绝"
      };
      return textMap[status] || "未知";
    }
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  var _a, _b;
  return common_vendor.e({
    a: common_vendor.t($data.teamName),
    b: $data.stats
  }, $data.stats ? {
    c: common_vendor.t($data.stats.pending),
    d: common_vendor.t($data.stats.approved),
    e: common_vendor.t($data.stats.rejected),
    f: common_vendor.t($data.stats.total)
  } : {}, {
    g: $data.currentStatus === "pending" ? 1 : "",
    h: common_vendor.o(($event) => $options.switchStatus("pending")),
    i: $data.currentStatus === "approved" ? 1 : "",
    j: common_vendor.o(($event) => $options.switchStatus("approved")),
    k: $data.currentStatus === "rejected" ? 1 : "",
    l: common_vendor.o(($event) => $options.switchStatus("rejected")),
    m: $data.currentStatus === "all" ? 1 : "",
    n: common_vendor.o(($event) => $options.switchStatus("all")),
    o: $data.loading
  }, $data.loading ? {} : $data.applications.length === 0 ? {} : {
    q: common_vendor.f($data.applications, (application, k0, i0) => {
      return common_vendor.e({
        a: application.avatar || "/static/default-avatar.png",
        b: common_vendor.t(application.nickname || application.username),
        c: common_vendor.t($options.formatDate(application.applied_at, "MM月DD日 HH:mm")),
        d: common_vendor.t($options.getStatusText(application.status)),
        e: common_vendor.n($options.getStatusClass(application.status)),
        f: common_vendor.t(application.reason || "无"),
        g: application.admin_note
      }, application.admin_note ? {
        h: common_vendor.t(application.admin_note)
      } : {}, {
        i: application.status === "pending"
      }, application.status === "pending" ? {
        j: common_vendor.o(($event) => $options.approveApplication(application), application.id),
        k: $data.processing,
        l: common_vendor.o(($event) => $options.rejectApplication(application), application.id),
        m: $data.processing
      } : application.processed_at ? {
        o: common_vendor.t(application.processor_nickname || application.processor_name),
        p: common_vendor.t($options.formatDate(application.processed_at, "MM月DD日 HH:mm"))
      } : {}, {
        n: application.processed_at,
        q: application.id
      });
    })
  }, {
    p: $data.applications.length === 0,
    r: $data.hasMore && !$data.loading
  }, $data.hasMore && !$data.loading ? {
    s: common_vendor.o((...args) => $options.loadMore && $options.loadMore(...args))
  } : {}, {
    t: $data.showProcessModal
  }, $data.showProcessModal ? {
    v: common_vendor.t($data.processAction === "approved" ? "批准申请" : "拒绝申请"),
    w: common_vendor.o((...args) => $options.hideProcessModal && $options.hideProcessModal(...args)),
    x: common_vendor.t(((_a = $data.selectedApplication) == null ? void 0 : _a.nickname) || ((_b = $data.selectedApplication) == null ? void 0 : _b.username)),
    y: common_vendor.t($data.processAction === "approved" ? "加入团队" : "申请被拒绝"),
    z: $data.processNote,
    A: common_vendor.o(($event) => $data.processNote = $event.detail.value),
    B: common_vendor.o((...args) => $options.hideProcessModal && $options.hideProcessModal(...args)),
    C: common_vendor.t($data.processing ? "处理中..." : $data.processAction === "approved" ? "确认批准" : "确认拒绝"),
    D: common_vendor.n($data.processAction === "approved" ? "btn-primary" : "btn-danger"),
    E: common_vendor.o((...args) => $options.confirmProcess && $options.confirmProcess(...args)),
    F: $data.processing,
    G: common_vendor.o(() => {
    }),
    H: common_vendor.o((...args) => $options.hideProcessModal && $options.hideProcessModal(...args))
  } : {});
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-e60624db"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/team-applications/team-applications.js.map
