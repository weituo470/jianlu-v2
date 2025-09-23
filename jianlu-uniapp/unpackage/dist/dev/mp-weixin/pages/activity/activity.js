"use strict";
const common_vendor = require("../../common/vendor.js");
const api_index = require("../../api/index.js");
const utils_index = require("../../utils/index.js");
const _sfc_main = {
  data() {
    return {
      activities: [],
      loading: false,
      loadingMore: false,
      isRefreshing: false,
      page: 1,
      pageSize: 10,
      hasMore: true,
      searchVisible: false,
      searchKeyword: "",
      currentFilter: "all",
      filterTabs: [
        { label: "全部", value: "all" },
        { label: "即将开始", value: "upcoming" },
        { label: "进行中", value: "ongoing" },
        { label: "已结束", value: "completed" }
      ]
    };
  },
  onLoad() {
    this.resetAndLoad();
  },
  onShow() {
    if (!this.loadedOnce) {
      this.resetAndLoad();
      this.loadedOnce = true;
    }
  },
  methods: {
    // 重置并加载
    resetAndLoad() {
      this.page = 1;
      this.activities = [];
      this.hasMore = true;
      this.loadActivities();
    },
    // 显示搜索
    showSearch() {
      common_vendor.index.__f__("log", "at pages/activity/activity.vue:134", "显示搜索");
    },
    // 切换筛选
    changeFilter(filter) {
      if (this.currentFilter === filter)
        return;
      this.currentFilter = filter;
      this.resetAndLoad();
    },
    // 获取筛选参数
    getFilterParams() {
      const params = {
        page: this.page,
        limit: this.pageSize
      };
      if (this.currentFilter === "upcoming") {
        params.status = "registration";
      } else if (this.currentFilter === "ongoing") {
        params.status = "ongoing";
      } else if (this.currentFilter === "completed") {
        params.status = "completed";
      }
      if (this.searchKeyword) {
        params.search = this.searchKeyword;
      }
      return params;
    },
    // 加载活动列表
    async loadActivities(isLoadMore = false) {
      if (isLoadMore) {
        if (!this.hasMore || this.loadingMore)
          return;
        this.loadingMore = true;
      } else {
        this.loading = true;
      }
      try {
        const params = this.getFilterParams();
        const response = await api_index.activityApi.getList(params);
        if (response.success) {
          const { activities, pagination } = response.data;
          const newActivities = Array.isArray(activities) ? activities : [];
          if (isLoadMore) {
            this.activities = [...this.activities, ...newActivities];
            this.page++;
          } else {
            this.activities = newActivities;
            this.page = (pagination == null ? void 0 : pagination.page) || 1;
          }
          if (pagination) {
            this.hasMore = pagination.page < pagination.pages;
          }
        }
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/activity/activity.vue:203", "加载活动失败:", error);
        utils_index.showError("加载活动失败");
      } finally {
        if (isLoadMore) {
          this.loadingMore = false;
        } else {
          this.loading = false;
        }
      }
    },
    // 下拉刷新
    async onRefresh() {
      this.isRefreshing = true;
      await this.resetAndLoad();
      this.isRefreshing = false;
    },
    // 上拉加载更多
    onLoadMore() {
      if (!this.loadingMore && this.hasMore && !this.loading) {
        this.loadActivities(true);
      }
    },
    // 查看活动详情
    viewActivity(activity) {
      common_vendor.index.navigateTo({
        url: `/pages/activity-detail/activity-detail?id=${activity.id}`
      });
    },
    // 创建活动
    createActivity() {
      common_vendor.index.navigateTo({
        url: "/pages/activity-create/activity-create"
      });
    },
    // 格式化日期
    formatDate(date) {
      return utils_index.formatDate(date, "MM月DD日 HH:mm");
    },
    // 获取活动状态信息
    getStatusInfo(activity) {
      const now = /* @__PURE__ */ new Date();
      const startTime = new Date(activity.start_time);
      const endTime = new Date(activity.end_time);
      if (now < startTime) {
        return { text: "即将开始", color: "#007aff" };
      } else if (now >= startTime && now <= endTime) {
        return { text: "进行中", color: "#ff9500" };
      } else {
        return { text: "已结束", color: "#8e8e93" };
      }
    },
    // 获取类型信息
    getTypeInfo(type) {
      const typeMap = {
        meeting: { icon: "💼", name: "会议" },
        event: { icon: "🎉", name: "活动" },
        training: { icon: "📚", name: "培训" },
        social: { icon: "🍽️", name: "社交" },
        sports: { icon: "⚽", name: "运动" },
        travel: { icon: "🏖️", name: "旅行" },
        workshop: { icon: "🔧", name: "工作坊" },
        conference: { icon: "🎤", name: "会议" },
        other: { icon: "📅", name: "其他" }
      };
      return typeMap[type] || { icon: "📅", name: "未知" };
    }
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: common_vendor.o((...args) => $options.showSearch && $options.showSearch(...args)),
    b: common_vendor.f($data.filterTabs, (tab, k0, i0) => {
      return {
        a: common_vendor.t(tab.label),
        b: tab.value,
        c: $data.currentFilter === tab.value ? 1 : "",
        d: common_vendor.o(($event) => $options.changeFilter(tab.value), tab.value)
      };
    }),
    c: $data.loading && $data.page === 1
  }, $data.loading && $data.page === 1 ? {} : $data.activities.length > 0 ? common_vendor.e({
    e: common_vendor.f($data.activities, (activity, k0, i0) => {
      return common_vendor.e({
        a: common_vendor.t(activity.sequence_number),
        b: common_vendor.t($options.getTypeInfo(activity.activity_type).icon),
        c: common_vendor.t($options.getStatusInfo(activity).text),
        d: $options.getStatusInfo(activity).color,
        e: common_vendor.t(activity.title),
        f: activity.description
      }, activity.description ? {
        g: common_vendor.t(activity.description)
      } : {}, {
        h: common_vendor.t($options.formatDate(activity.start_time)),
        i: activity.location
      }, activity.location ? {
        j: common_vendor.t(activity.location)
      } : {}, {
        k: common_vendor.t(activity.registration_count || 0),
        l: common_vendor.t(activity.max_participants ? `/${activity.max_participants}` : ""),
        m: common_vendor.t(activity.creator_name),
        n: activity.id,
        o: common_vendor.o(($event) => $options.viewActivity(activity), activity.id)
      });
    }),
    f: $data.loadingMore
  }, $data.loadingMore ? {} : {}, {
    g: !$data.hasMore && $data.activities.length > 0
  }, !$data.hasMore && $data.activities.length > 0 ? {} : {}) : !$data.loading ? {} : {}, {
    d: $data.activities.length > 0,
    h: !$data.loading,
    i: $data.isRefreshing,
    j: common_vendor.o((...args) => $options.onRefresh && $options.onRefresh(...args)),
    k: common_vendor.o((...args) => $options.onLoadMore && $options.onLoadMore(...args)),
    l: common_vendor.o((...args) => $options.createActivity && $options.createActivity(...args))
  });
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-da48f91d"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/activity/activity.js.map
