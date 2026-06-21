import { icon } from "../../ui/icons.js";

function createElement(tag, className = "", text = "") {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (text) element.textContent = text;
  return element;
}

function formatNumber(value) {
  return new Intl.NumberFormat("zh-CN").format(value || 0);
}

function formatDate(timestamp) {
  if (!timestamp) return "暂无调用记录";
  return new Intl.DateTimeFormat("zh-CN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(timestamp));
}

function createRouteRow({ title, description = "", iconName, detail = "", onClick }) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "settings-route-row";

  const iconWrap = createElement("span", "settings-route-icon");
  iconWrap.innerHTML = icon(iconName);

  const copy = createElement("span", "settings-route-copy");
  copy.append(createElement("strong", "", title));
  if (description) copy.append(createElement("small", "", description));

  const trailing = createElement("span", "settings-route-trailing");
  if (detail) trailing.append(createElement("em", "", detail));
  trailing.innerHTML += icon("chevron");

  button.append(iconWrap, copy, trailing);
  button.addEventListener("click", onClick);
  return button;
}

function createGroup(title) {
  const section = createElement("section", "settings-group");
  section.append(createElement("h3", "settings-group-title", title));
  const card = createElement("div", "settings-card");
  section.append(card);
  return { section, card };
}

function createToggle(label, description, checked, onChange) {
  const row = createElement("label", "settings-toggle-row");
  const copy = createElement("span", "settings-toggle-copy");
  copy.append(createElement("strong", "", label));
  if (description) copy.append(createElement("small", "", description));

  const input = document.createElement("input");
  input.type = "checkbox";
  input.checked = checked;
  input.addEventListener("change", () => onChange(input.checked));

  const visual = createElement("span", "settings-switch");
  visual.append(input, createElement("span", "settings-switch-track"));
  row.append(copy, visual);
  return row;
}

function createActionButton(label, variant = "default") {
  const button = createElement("button", `settings-action-button ${variant}`, label);
  button.type = "button";
  return button;
}

export function createSettingsNavigator({
  ui,
  preferences,
  usage,
  getConversationSnapshot,
  getConversationCount,
  onOpenConnection,
  onDeleteAllLocalData,
  onExportAllData,
  onExportCurrentConversation,
  onCopyCurrentConversation,
  onNotificationPreferenceChange,
}) {
  let activeRoute = "home";

  function open() {
    activeRoute = "home";
    ui.settingsHub.hidden = false;
    ui.settingsHubBackdrop.hidden = false;
    ui.settingsHub.classList.add("is-open");
    ui.settingsHub.setAttribute("aria-hidden", "false");
    render();
  }

  function close() {
    ui.settingsHub.classList.remove("is-open");
    ui.settingsHub.setAttribute("aria-hidden", "true");
    ui.settingsHubBackdrop.hidden = true;
    window.setTimeout(() => {
      if (ui.settingsHub.getAttribute("aria-hidden") === "true") ui.settingsHub.hidden = true;
    }, 220);
  }

  function navigate(route) {
    activeRoute = route;
    render();
  }

  function renderHeader(title, isHome = false) {
    ui.settingsHubTitle.textContent = title;
    ui.settingsHubBack.hidden = isHome;
    ui.settingsHubClose.hidden = !isHome;
  }

  function renderHome() {
    renderHeader("设置", true);
    const root = ui.settingsHubContent;
    root.replaceChildren();

    const profile = preferences.snapshot.profile;
    const account = createGroup("个人");
    account.card.append(
      createRouteRow({ title: "个人资料", description: profile.nickname ? `称呼：${profile.nickname}` : "设置称呼与回复偏好", iconName: "user", onClick: () => navigate("profile") }),
      createRouteRow({ title: "用量", description: "本应用的本地 API 用量记录", iconName: "chart", onClick: () => navigate("usage") }),
    );

    const data = createGroup("数据与隐私");
    data.card.append(
      createRouteRow({ title: "通知", description: "回复完成后的浏览器提醒", iconName: "bell", onClick: () => navigate("notifications") }),
      createRouteRow({ title: "隐私与本地数据", description: "导出或清除这台设备的数据", iconName: "shield", onClick: () => navigate("privacy") }),
      createRouteRow({ title: "导出与分享", description: "导出当前对话；公开链接待后端接入", iconName: "share", onClick: () => navigate("sharing") }),
    );

    const app = createGroup("应用");
    app.card.append(
      createRouteRow({ title: "模型与 API", description: "密钥、模型、思考模式和系统提示词", iconName: "key", onClick: onOpenConnection }),
      createRouteRow({ title: "能力", description: "当前已启用与待接入的能力", iconName: "sliders", onClick: () => navigate("capabilities") }),
      createRouteRow({ title: "连接器", description: "外部服务需要 OAuth 与后端", iconName: "plug", onClick: () => navigate("connectors") }),
      createRouteRow({ title: "浏览器权限", description: "通知、位置等实际权限状态", iconName: "location", onClick: () => navigate("permissions") }),
    );

    root.append(account.section, data.section, app.section);
  }

  function renderProfile() {
    renderHeader("个人资料");
    const current = preferences.snapshot.profile;
    const root = ui.settingsHubContent;
    root.replaceChildren();

    const form = createElement("form", "settings-detail-form");
    const intro = createElement("p", "settings-page-intro", "这些内容只保存在当前设备，并会作为你的个性化偏好加入新请求。");
    form.append(intro);

    const displayLabel = createElement("label", "settings-field-label", "显示名称");
    const displayName = document.createElement("input");
    displayName.value = current.displayName;
    displayName.maxLength = 40;
    displayLabel.append(displayName);

    const nicknameLabel = createElement("label", "settings-field-label", "希望如何称呼你");
    const nickname = document.createElement("input");
    nickname.value = current.nickname;
    nickname.maxLength = 30;
    nicknameLabel.append(nickname);

    const instructionsLabel = createElement("label", "settings-field-label", "回复偏好");
    const instructions = document.createElement("textarea");
    instructions.rows = 6;
    instructions.placeholder = "例如：回答直接、中文优先、用实际案例解释。";
    instructions.value = current.customInstructions;
    instructionsLabel.append(instructions);

    const save = createActionButton("保存个人资料", "primary");
    save.type = "submit";
    const status = createElement("p", "settings-inline-status");

    form.append(displayLabel, nicknameLabel, instructionsLabel, save, status);
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      preferences.updateProfile({
        displayName: displayName.value,
        nickname: nickname.value,
        customInstructions: instructions.value,
      });
      status.textContent = "已保存。新发送的消息会使用这些偏好。";
    });
    root.append(form);
  }

  function renderUsage() {
    renderHeader("用量");
    const current = usage.snapshot;
    const root = ui.settingsHubContent;
    root.replaceChildren();

    const intro = createElement("p", "settings-page-intro", "这是本应用在当前设备记录的 API 用量，不代表 DeepSeek 账户额度或账单。");
    const card = createElement("section", "usage-card");
    const values = [
      ["累计请求", `${formatNumber(current.requestCount)} 次`],
      ["累计 tokens", formatNumber(current.totalTokens)],
      ["其中思考 tokens", formatNumber(current.reasoningTokens)],
      ["最近一次", formatDate(current.lastUpdatedAt)],
    ];
    values.forEach(([label, value]) => {
      const row = createElement("div", "usage-row");
      row.append(createElement("span", "", label), createElement("strong", "", value));
      card.append(row);
    });

    const note = createElement("p", "settings-page-note", "完整 API 余额、限额、账单需要服务商账户接口或后端代理；当前纯前端页面无法安全读取。");
    root.append(intro, card, note);
  }

  function renderNotifications() {
    renderHeader("通知");
    const root = ui.settingsHubContent;
    root.replaceChildren();
    const current = preferences.snapshot.notifications;
    const supported = typeof Notification !== "undefined";
    const permission = supported ? Notification.permission : "unsupported";

    const intro = createElement("p", "settings-page-intro", "开启后，当页面不在前台且一轮回复完成时，应用会尝试发送浏览器通知。");
    const card = createElement("section", "settings-card settings-card-plain");
    const state = permission === "granted" ? "已授权" : permission === "denied" ? "已拒绝" : permission === "default" ? "尚未授权" : "当前浏览器不支持";

    card.append(createToggle("回复完成提醒", `浏览器权限：${state}`, current.chatComplete, async (checked) => {
      if (checked && supported && Notification.permission === "default") {
        await Notification.requestPermission();
      }
      const canNotify = !checked || (supported && Notification.permission === "granted");
      preferences.updateNotifications({ chatComplete: canNotify && checked });
      onNotificationPreferenceChange?.(canNotify && checked);
      renderNotifications();
    }));

    const note = createElement("p", "settings-page-note", "iPhone 上的网页通知依赖浏览器与系统授权；若当前环境不支持，开关会自动保持关闭。");
    root.append(intro, card, note);
  }

  function renderPrivacy() {
    renderHeader("隐私与本地数据");
    const root = ui.settingsHubContent;
    root.replaceChildren();

    const intro = createElement("p", "settings-page-intro", "你的聊天记录、设置、个人偏好和本地用量都存于当前浏览器。GitHub Pages 不会替你保存这些数据。");
    const card = createElement("section", "settings-card settings-card-plain");
    card.append(
      createRouteRow({ title: "本地对话记录", description: `当前保存 ${getConversationCount()} 个对话`, iconName: "database", detail: "本设备", onClick: () => {} }),
      createRouteRow({ title: "导出全部本地数据", description: "下载 JSON 备份，包含设置与聊天记录", iconName: "download", onClick: onExportAllData }),
    );

    const clear = createActionButton("删除这台设备上的全部应用数据", "danger");
    clear.addEventListener("click", () => {
      const confirmed = window.confirm("这会删除当前浏览器中的聊天记录、设置、偏好与用量统计，且无法恢复。继续吗？");
      if (!confirmed) return;
      onDeleteAllLocalData();
      close();
    });

    root.append(intro, card, clear);
  }

  function renderSharing() {
    renderHeader("导出与分享");
    const root = ui.settingsHubContent;
    root.replaceChildren();
    const conversation = getConversationSnapshot();

    const intro = createElement("p", "settings-page-intro", "当前版本可以导出或复制对话。公开链接需要账号、数据库和服务端权限校验，暂不在纯前端页面中伪造。");
    const card = createElement("section", "settings-card settings-card-plain");
    card.append(
      createRouteRow({ title: "复制当前对话", description: conversation.messages.length ? `${conversation.messages.length} 条消息` : "当前对话为空", iconName: "share", onClick: onCopyCurrentConversation }),
      createRouteRow({ title: "下载当前对话", description: "导出为 JSON 文件", iconName: "download", onClick: onExportCurrentConversation }),
    );
    root.append(intro, card);
  }

  function renderCapabilities() {
    renderHeader("能力");
    const root = ui.settingsHubContent;
    root.replaceChildren();
    const intro = createElement("p", "settings-page-intro", "这里展示当前应用确实已经具备的能力，以及需要后端或兼容模型后才会开放的能力。");
    const card = createElement("section", "settings-card settings-card-plain");

    const rows = [
      ["多轮对话与本地历史", "已启用：当前设备保存对话，并支持切换历史。", "已启用"],
      ["个性化回复偏好", "已启用：个人资料中的称呼与偏好会加入新请求。", "已启用"],
      ["文本文件附件", "已启用：txt、md、csv、json 和常见代码文件会在浏览器读取后随消息发送。", "已启用"],
      ["图片理解", "待接入：当前 DeepSeek V4 文本接口不接收图片内容，需要视觉模型或自建多模态服务。", "需视觉模型"],
      ["跨对话记忆", "待接入：需要独立记忆提取与可编辑的记忆库。", "待接入"],
      ["联网搜索", "待接入：需要搜索服务与后端代理，避免暴露密钥。", "待接入"],
    ];
    rows.forEach(([title, description, state]) => {
      card.append(createRouteRow({ title, description, iconName: "sliders", detail: state, onClick: () => {} }));
    });
    root.append(intro, card);
  }

  function renderConnectors() {
    renderHeader("连接器");
    const root = ui.settingsHubContent;
    root.replaceChildren();
    const intro = createElement("p", "settings-page-intro", "Gmail、Google Drive、Notion 这类连接器需要 OAuth 授权、回调地址和安全的服务端令牌存储。GitHub Pages 纯前端不能安全承载它们。");
    const card = createElement("section", "settings-card settings-card-plain");
    card.append(createRouteRow({ title: "连接器状态", description: "当前没有已接入的外部服务。", iconName: "plug", detail: "待后端", onClick: () => {} }));
    root.append(intro, card);
  }

  function renderPermissions() {
    renderHeader("浏览器权限");
    const root = ui.settingsHubContent;
    root.replaceChildren();
    const intro = createElement("p", "settings-page-intro", "这里只显示网页当前可实际使用的权限。日历、提醒事项、健康数据等 iPhone 原生权限无法由 GitHub Pages 网页直接获取。");
    const card = createElement("section", "settings-card settings-card-plain");
    const notificationState = typeof Notification === "undefined" ? "不支持" : Notification.permission === "granted" ? "已允许" : Notification.permission === "denied" ? "已拒绝" : "未请求";
    card.append(
      createRouteRow({ title: "通知", description: "用于回复完成提醒", iconName: "bell", detail: notificationState, onClick: () => navigate("notifications") }),
      createRouteRow({ title: "位置", description: "当前应用尚未使用位置功能", iconName: "location", detail: "未请求", onClick: () => {} }),
    );
    root.append(intro, card);
  }

  function render() {
    const routes = {
      home: renderHome,
      profile: renderProfile,
      usage: renderUsage,
      notifications: renderNotifications,
      privacy: renderPrivacy,
      sharing: renderSharing,
      capabilities: renderCapabilities,
      connectors: renderConnectors,
      permissions: renderPermissions,
    };
    (routes[activeRoute] || renderHome)();
  }

  ui.settingsHubBack.addEventListener("click", () => navigate("home"));
  ui.settingsHubClose.addEventListener("click", close);
  ui.settingsHubBackdrop.addEventListener("click", close);

  return { open, close, render };
}
