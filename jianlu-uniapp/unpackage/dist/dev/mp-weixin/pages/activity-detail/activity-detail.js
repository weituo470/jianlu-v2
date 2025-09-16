"use strict";
const common_vendor = require("../../common/vendor.js");
const api_activity = require("../../api/activity.js");
const utils_index = require("../../utils/index.js");
const _sfc_main = {
  data() {
    return {
      activityId: null,
      activity: null,
      loading: false,
      showModal: false,
      submitting: false,
      registrationForm: {
        real_name: "",
        phone: "",
        notes: ""
      }
    };
  },
  computed: {
    canRegisterResult() {
      if (!this.activity)
        return { canRegister: false, reason: "活动不存在" };
      return api_activity.activityUtils.canRegister(this.activity);
    }
  },
  onLoad(options) {
    if (options.id) {
      this.activityId = parseInt(options.id);
      this.loadActivityDetail();
    }
  },
  methods: {
    // 加载活动详情
    async loadActivityDetail() {
      this.loading = true;
      try {
        const response = await api_activity.activityApi.getDetail(this.activityId);
        if (response.success) {
          this.activity = response.data;
          common_vendor.index.setNavigationBarTitle({
            title: this.activity.title || "活动详情"
          });
        }
      } catch (error) {
        console.error("加载活动详情失败:", error);
        utils_index.showError("加载活动详情失败");
      } finally {
        this.loading = false;
      }
    },
    // 显示报名弹窗
    showRegistrationModal() {
      const userInfo = common_vendor.index.getStorageSync("userInfo");
      if (userInfo) {
        this.registrationForm.real_name = userInfo.nickname || "";
      }
      this.showModal = true;
    },
    // 隐藏报名弹窗
    hideModal() {
      this.showModal = false;
      this.registrationForm = {
        real_name: "",
        phone: "",
        notes: ""
      };
    },
    // 提交报名
    async submitRegistration() {
      var _a, _b;
      if (!this.registrationForm.real_name.trim()) {
        utils_index.showError("请输入真实姓名");
        return;
      }
      if (!this.registrationForm.phone.trim()) {
        utils_index.showError("请输入联系电话");
        return;
      }
      this.submitting = true;
      try {
        const response = await api_activity.activityApi.register(this.activityId, this.registrationForm);
        if (response.success) {
          utils_index.showSuccess(response.message || "报名成功");
          this.hideModal();
          this.loadActivityDetail();
        }
      } catch (error) {
        console.error("报名失败:", error);
        utils_index.showError(((_b = (_a = error.response) == null ? void 0 : _a.data) == null ? void 0 : _b.message) || "报名失败");
      } finally {
        this.submitting = false;
      }
    },
    // 取消报名
    async cancelRegistration() {
      const confirmed = await utils_index.showConfirm("确定要取消报名吗？");
      if (!confirmed)
        return;
      try {
        const response = await api_activity.activityApi.cancelRegistration(this.activityId);
        if (response.success) {
          utils_index.showSuccess("取消报名成功");
          this.loadActivityDetail();
        }
      } catch (error) {
        console.error("取消报名失败:", error);
        utils_index.showError("取消报名失败");
      }
    },
    // 管理活动
    manageActivity() {
      common_vendor.index.navigateTo({
        url: `/pages/activity-manage/activity-manage?id=${this.activityId}`
      });
    },
    // 预览图片
    previewImage(current, urls) {
      common_vendor.index.previewImage({
        current,
        urls
      });
    },
    // 获取类型信息
    getTypeInfo(type) {
      return api_activity.activityUtils.getTypeInfo(type);
    },
    // 获取状态信息
    getStatusInfo(status) {
      return api_activity.activityUtils.getStatusInfo(status);
    },
    // 获取报名状态信息
    getRegistrationStatusInfo(status) {
      return api_activity.activityUtils.getRegistrationStatusInfo(status);
    },
    // 格式化活动时间
    formatActivityTime(startTime, endTime) {
      return api_activity.activityUtils.formatActivityTime(startTime, endTime);
    },
    // 格式化日期
    formatDate(date) {
      return utils_index.formatDate(date, "YYYY年MM月DD日 HH:mm");
    },
    // 获取进度百分比
    getProgressPercentage(activity) {
      return api_activity.activityUtils.getProgressPercentage(activity);
    }
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: $data.loading
  }, $data.loading ? {} : $data.activity ? common_vendor.e({
    c: $data.activity.cover_image || "/static/images/default-activity.png",
    d: common_vendor.t($options.getTypeInfo($data.activity.activity_type).icon),
    e: common_vendor.t($options.getTypeInfo($data.activity.activity_type).name),
    f: common_vendor.t($options.getStatusInfo($data.activity.status).name),
    g: $options.getStatusInfo($data.activity.status).color,
    h: common_vendor.t($data.activity.title),
    i: $data.activity.visibility === "team"
  }, $data.activity.visibility === "team" ? {
    j: common_vendor.t($data.activity.team_name)
  } : {}, {
    k: common_vendor.t($data.activity.description || "暂无描述"),
    l: common_vendor.t($options.formatActivityTime($data.activity.start_time, $data.activity.end_time)),
    m: $data.activity.location
  }, $data.activity.location ? {
    n: common_vendor.t($data.activity.location)
  } : {}, {
    o: common_vendor.t($data.activity.registration_count),
    p: common_vendor.t($data.activity.max_participants > 0 ? `/${$data.activity.max_participants}` : ""),
    q: $data.activity.registration_deadline
  }, $data.activity.registration_deadline ? {
    r: common_vendor.t($options.formatDate($data.activity.registration_deadline))
  } : {}, {
    s: !$data.activity.is_free
  }, !$data.activity.is_free ? {
    t: common_vendor.t($data.activity.base_fee)
  } : {}, {
    v: common_vendor.t($data.activity.creator_name),
    w: $data.activity.max_participants > 0
  }, $data.activity.max_participants > 0 ? {
    x: common_vendor.t($options.getProgressPercentage($data.activity)),
    y: $options.getProgressPercentage($data.activity) + "%"
  } : {}, {
    z: $data.activity.user_registered
  }, $data.activity.user_registered ? {
    A: common_vendor.t($options.getRegistrationStatusInfo($data.activity.user_registration_status).name),
    B: $options.getRegistrationStatusInfo($data.activity.user_registration_status).color,
    C: common_vendor.t($options.getRegistrationStatusInfo($data.activity.user_registration_status).description),
    D: $options.getRegistrationStatusInfo($data.activity.user_registration_status).color
  } : {}, {
    E: $data.activity.images && $data.activity.images.length > 0
  }, $data.activity.images && $data.activity.images.length > 0 ? {
    F: common_vendor.f($data.activity.images, (image, index, i0) => {
      return {
        a: image,
        b: index,
        c: common_vendor.o(($event) => $options.previewImage(image, $data.activity.images), index)
      };
    })
  } : {}) : {}, {
    b: $data.activity,
    G: $data.activity
  }, $data.activity ? common_vendor.e({
    H: !$data.activity.user_registered && $options.canRegisterResult.canRegister
  }, !$data.activity.user_registered && $options.canRegisterResult.canRegister ? {
    I: common_vendor.o((...args) => $options.showRegistrationModal && $options.showRegistrationModal(...args))
  } : $data.activity.user_registered && $data.activity.user_registration_status !== "cancelled" ? {
    K: common_vendor.o((...args) => $options.cancelRegistration && $options.cancelRegistration(...args))
  } : !$options.canRegisterResult.canRegister ? {
    M: common_vendor.t($options.canRegisterResult.reason)
  } : {}, {
    J: $data.activity.user_registered && $data.activity.user_registration_status !== "cancelled",
    L: !$options.canRegisterResult.canRegister,
    N: $data.activity.user_can_manage
  }, $data.activity.user_can_manage ? {
    O: common_vendor.o((...args) => $options.manageActivity && $options.manageActivity(...args))
  } : {}) : {}, {
    P: $data.showModal
  }, $data.showModal ? {
    Q: common_vendor.o((...args) => $options.hideModal && $options.hideModal(...args)),
    R: $data.registrationForm.real_name,
    S: common_vendor.o(($event) => $data.registrationForm.real_name = $event.detail.value),
    T: $data.registrationForm.phone,
    U: common_vendor.o(($event) => $data.registrationForm.phone = $event.detail.value),
    V: $data.registrationForm.notes,
    W: common_vendor.o(($event) => $data.registrationForm.notes = $event.detail.value),
    X: common_vendor.o((...args) => $options.hideModal && $options.hideModal(...args)),
    Y: common_vendor.t($data.submitting ? "提交中..." : "确认报名"),
    Z: common_vendor.o((...args) => $options.submitRegistration && $options.submitRegistration(...args)),
    aa: $data.submitting,
    ab: common_vendor.o(() => {
    }),
    ac: common_vendor.o((...args) => $options.hideModal && $options.hideModal(...args))
  } : {});
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-f886daa9"]]);
wx.createPage(MiniProgramPage);
