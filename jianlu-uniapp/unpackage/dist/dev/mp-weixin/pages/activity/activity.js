"use strict";
const common_vendor = require("../../common/vendor.js");
const api_activity = require("../../api/activity.js");
const utils_index = require("../../utils/index.js");
const _sfc_main = {
  data() {
    return {
      activities: [],
      loading: false,
      currentFilter: "all",
      currentType: "",
      showTypeFilter: false,
      activityTypes: api_activity.activityTypes
    };
  },
  onLoad() {
    this.loadActivities();
  },
  onShow() {
    this.loadActivities();
  },
  onPullDownRefresh() {
    this.loadActivities().finally(() => {
      common_vendor.index.stopPullDownRefresh();
    });
  },
  methods: {
    // 设置筛选条件
    setFilter(filter) {
      this.currentFilter = filter;
      this.showTypeFilter = filter !== "all";
      this.loadActivities();
    },
    // 设置类型筛选
    setType(type) {
      this.currentType = type;
      this.loadActivities();
    },
    // 加载活动列表
    async loadActivities() {
      this.loading = true;
      try {
        const params = this.buildParams();
        const response = await api_activity.activityApi.getList(params);
        if (response.success) {
          this.activities = response.data || [];
        }
      } catch (error) {
        common_vendor.index.__f__("error", "at pages/activity/activity.vue:169", "加载活动失败:", error);
        utils_index.showError("加载活动失败");
      } finally {
        this.loading = false;
      }
    },
    // 构建请求参数
    buildParams() {
      const params = {};
      if (this.currentFilter === "public") {
        params.visibility = "public";
      } else if (this.currentFilter === "team") {
        params.visibility = "team";
      } else if (this.currentFilter === "my") {
        params.my_registrations = true;
      }
      if (this.currentType) {
        params.activity_type = this.currentType;
      }
      return params;
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
      return this.activityTypes[type] || { icon: "📅", name: "未知" };
    }
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: $data.currentFilter === "all" ? 1 : "",
    b: common_vendor.o(($event) => $options.setFilter("all")),
    c: $data.currentFilter === "public" ? 1 : "",
    d: common_vendor.o(($event) => $options.setFilter("public")),
    e: $data.currentFilter === "team" ? 1 : "",
    f: common_vendor.o(($event) => $options.setFilter("team")),
    g: $data.currentFilter === "my" ? 1 : "",
    h: common_vendor.o(($event) => $options.setFilter("my")),
    i: $data.showTypeFilter
  }, $data.showTypeFilter ? {
    j: $data.currentType === "" ? 1 : "",
    k: common_vendor.o(($event) => $options.setType("")),
    l: common_vendor.f($data.activityTypes, (typeInfo, type, i0) => {
      return {
        a: common_vendor.t(typeInfo.icon),
        b: common_vendor.t(typeInfo.name),
        c: type,
        d: $data.currentType === type ? 1 : "",
        e: common_vendor.o(($event) => $options.setType(type), type)
      };
    })
  } : {}, {
    m: $data.loading
  }, $data.loading ? {} : $data.activities.length > 0 ? {
    o: common_vendor.f($data.activities, (activity, k0, i0) => {
      return common_vendor.e({
        a: common_vendor.t($options.getTypeInfo(activity.activity_type).icon),
        b: common_vendor.t($options.getStatusInfo(activity).text),
        c: $options.getStatusInfo(activity).color,
        d: common_vendor.t(activity.title),
        e: activity.description
      }, activity.description ? {
        f: common_vendor.t(activity.description)
      } : {}, {
        g: common_vendor.t($options.formatDate(activity.start_time)),
        h: activity.location
      }, activity.location ? {
        i: common_vendor.t(activity.location)
      } : {}, {
        j: common_vendor.t(activity.registration_count || 0),
        k: common_vendor.t(activity.max_participants ? `/${activity.max_participants}` : ""),
        l: common_vendor.t(activity.creator_name),
        m: activity.id,
        n: common_vendor.o(($event) => $options.viewActivity(activity), activity.id)
      });
    })
  } : {}, {
    n: $data.activities.length > 0,
    p: common_vendor.o((...args) => $options.createActivity && $options.createActivity(...args))
  });
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-da48f91d"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/activity/activity.js.map
