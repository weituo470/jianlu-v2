"use strict";
const common_vendor = require("../../common/vendor.js");
const utils_index = require("../../utils/index.js");
const _sfc_main = {
  data() {
    return {
      activeTab: "all",
      searchKeyword: "",
      loading: false,
      messages: [
        // 模拟数据
        {
          id: 1,
          type: "team",
          sender_name: "张三",
          title: "团队邀请",
          content: '邀请您加入"产品开发团队"',
          team_name: "产品开发团队",
          created_at: (/* @__PURE__ */ new Date()).toISOString(),
          is_read: false
        },
        {
          id: 2,
          type: "activity",
          title: "活动提醒",
          content: '您参与的"团队建设活动"将在明天下午2点开始',
          team_name: "产品开发团队",
          created_at: new Date(Date.now() - 36e5).toISOString(),
          is_read: false
        },
        {
          id: 3,
          type: "system",
          title: "系统通知",
          content: "您的个人资料已更新成功",
          created_at: new Date(Date.now() - 72e5).toISOString(),
          is_read: true
        }
      ]
    };
  },
  computed: {
    filteredMessages() {
      let filtered = this.messages;
      if (this.activeTab !== "all") {
        filtered = filtered.filter((msg) => msg.type === this.activeTab);
      }
      if (this.searchKeyword) {
        const keyword = this.searchKeyword.toLowerCase();
        filtered = filtered.filter(
          (msg) => msg.sender_name && msg.sender_name.toLowerCase().includes(keyword) || msg.title && msg.title.toLowerCase().includes(keyword) || msg.content && msg.content.toLowerCase().includes(keyword)
        );
      }
      return filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    },
    allCount() {
      return this.messages.filter((msg) => !msg.is_read).length;
    },
    teamCount() {
      return this.messages.filter((msg) => msg.type === "team" && !msg.is_read).length;
    },
    activityCount() {
      return this.messages.filter((msg) => msg.type === "activity" && !msg.is_read).length;
    },
    systemCount() {
      return this.messages.filter((msg) => msg.type === "system" && !msg.is_read).length;
    }
  },
  onLoad() {
    this.loadMessages();
  },
  onShow() {
    this.loadMessages();
  },
  onPullDownRefresh() {
    this.loadMessages().finally(() => {
      common_vendor.index.stopPullDownRefresh();
    });
  },
  methods: {
    // 加载消息列表
    async loadMessages() {
      this.loading = true;
      try {
        await new Promise((resolve) => setTimeout(resolve, 500));
      } catch (error) {
        utils_index.showError("加载消息失败");
      } finally {
        this.loading = false;
      }
    },
    // 切换标签
    switchTab(tab) {
      this.activeTab = tab;
    },
    // 搜索
    onSearch() {
    },
    // 查看消息详情
    viewMessage(message) {
      message.is_read = true;
      common_vendor.index.showModal({
        title: message.title || message.sender_name,
        content: message.content,
        showCancel: false,
        confirmText: "知道了"
      });
    },
    // 格式化时间
    formatTime(dateString) {
      const date = new Date(dateString);
      const now = /* @__PURE__ */ new Date();
      const diff = now - date;
      if (diff < 6e4) {
        return "刚刚";
      } else if (diff < 36e5) {
        return `${Math.floor(diff / 6e4)}分钟前`;
      } else if (diff < 864e5) {
        return `${Math.floor(diff / 36e5)}小时前`;
      } else if (diff < 6048e5) {
        return `${Math.floor(diff / 864e5)}天前`;
      } else {
        return utils_index.formatDate(dateString, "MM-DD");
      }
    },
    // 获取消息图标
    getMessageIcon(type) {
      const icons = {
        team: "👥",
        activity: "📅",
        system: "⚙️",
        default: "💬"
      };
      return icons[type] || icons.default;
    },
    // 获取消息类型文本
    getMessageTypeText(type) {
      const types = {
        team: "团队",
        activity: "活动",
        system: "系统"
      };
      return types[type] || "";
    }
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return common_vendor.e({
    a: common_vendor.o([($event) => $data.searchKeyword = $event.detail.value, (...args) => $options.onSearch && $options.onSearch(...args)]),
    b: $data.searchKeyword,
    c: $options.allCount > 0
  }, $options.allCount > 0 ? {
    d: common_vendor.t($options.allCount)
  } : {}, {
    e: $data.activeTab === "all" ? 1 : "",
    f: common_vendor.o(($event) => $options.switchTab("all")),
    g: $options.teamCount > 0
  }, $options.teamCount > 0 ? {
    h: common_vendor.t($options.teamCount)
  } : {}, {
    i: $data.activeTab === "team" ? 1 : "",
    j: common_vendor.o(($event) => $options.switchTab("team")),
    k: $options.activityCount > 0
  }, $options.activityCount > 0 ? {
    l: common_vendor.t($options.activityCount)
  } : {}, {
    m: $data.activeTab === "activity" ? 1 : "",
    n: common_vendor.o(($event) => $options.switchTab("activity")),
    o: $options.systemCount > 0
  }, $options.systemCount > 0 ? {
    p: common_vendor.t($options.systemCount)
  } : {}, {
    q: $data.activeTab === "system" ? 1 : "",
    r: common_vendor.o(($event) => $options.switchTab("system")),
    s: $options.filteredMessages.length > 0
  }, $options.filteredMessages.length > 0 ? {
    t: common_vendor.f($options.filteredMessages, (message, k0, i0) => {
      return common_vendor.e({
        a: message.avatar
      }, message.avatar ? {
        b: message.avatar
      } : {
        c: common_vendor.t($options.getMessageIcon(message.type))
      }, {
        d: common_vendor.t(message.sender_name || message.title),
        e: common_vendor.t($options.formatTime(message.created_at)),
        f: common_vendor.t(message.content || message.preview),
        g: message.team_name
      }, message.team_name ? {
        h: common_vendor.t(message.team_name)
      } : {}, {
        i: !message.is_read
      }, !message.is_read ? {} : {}, {
        j: common_vendor.t($options.getMessageTypeText(message.type)),
        k: message.id,
        l: common_vendor.o(($event) => $options.viewMessage(message), message.id)
      });
    })
  } : !$data.loading ? {} : {}, {
    v: !$data.loading,
    w: $data.loading
  }, $data.loading ? {} : {});
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-4c1b26cf"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/message/message.js.map
