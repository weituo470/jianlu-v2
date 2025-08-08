"use strict";
const common_vendor = require("../common/vendor.js");
const formatDate = (date, format = "YYYY-MM-DD") => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hour = String(d.getHours()).padStart(2, "0");
  const minute = String(d.getMinutes()).padStart(2, "0");
  const second = String(d.getSeconds()).padStart(2, "0");
  return format.replace("YYYY", year).replace("MM", month).replace("DD", day).replace("HH", hour).replace("mm", minute).replace("ss", second);
};
const showSuccess = (title, duration = 2e3) => {
  common_vendor.index.showToast({
    title,
    icon: "success",
    duration
  });
};
const showError = (title, duration = 2e3) => {
  common_vendor.index.showToast({
    title,
    icon: "none",
    duration
  });
};
const showConfirm = (content, title = "提示") => {
  return new Promise((resolve) => {
    common_vendor.index.showModal({
      title,
      content,
      success: (res) => {
        resolve(res.confirm);
      }
    });
  });
};
const getActivityStatus = (startTime, endTime) => {
  const now = /* @__PURE__ */ new Date();
  const start = new Date(startTime);
  const end = new Date(endTime);
  if (now < start)
    return "upcoming";
  if (now >= start && now <= end)
    return "ongoing";
  return "ended";
};
const getActivityStatusText = (startTime, endTime) => {
  const status = getActivityStatus(startTime, endTime);
  const statusMap = {
    upcoming: "即将开始",
    ongoing: "进行中",
    ended: "已结束"
  };
  return statusMap[status];
};
exports.formatDate = formatDate;
exports.getActivityStatus = getActivityStatus;
exports.getActivityStatusText = getActivityStatusText;
exports.showConfirm = showConfirm;
exports.showError = showError;
exports.showSuccess = showSuccess;
//# sourceMappingURL=../../.sourcemap/mp-weixin/utils/index.js.map
