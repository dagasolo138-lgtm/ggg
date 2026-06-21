import { icon } from "../../ui/icons.js";
import { renderPersonalizationView } from "./personalizationView.js";

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
  if (!timestamp) return "暂无记录";
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
  getSystemPrompt,
  getConversationSnapshot,
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

    const account = createGroup("个人");
    account.card.append(
      createRouteRow({ title: "个人资料", iconName: "user", onClick: () => navigate("profile") }),
      createRouteRow({ title: "个性化与记忆", iconName: "sliders", onClick: () => navigate("personalization") }),
      createRouteRow({ title: "用量", iconName: "chart", onClick: () => navigate("usage") }),
    );

    const data = createGroup("数据");
    data.card.append(
      createRouteRow({ title: "通知", iconName: "bell", onClick: () => navigate("notifications") }),
      createRouteRow({ title: "隐私与本地数据", iconName: "shield", onClick: () => navigate("privacy") }),
      createRouteRow({ title: "导出与分享", iconName: "share", onClick: () => navigate("sharing") }),
    );

    const app = createGroup("应用");
    app.card.append(createRouteRow({ title: "模型与 API", iconName: "key", onClick: onOpenConnection }));

    root.append(account.section, data.section, app.section);
  }

  function renderProfile() {
    renderHeader("个人资料");
    const current = preferences.snapshot.profile;
    const root = ui.settingsHubContent;
    root.replaceChildren();

    const form = createElement("form", "settings-detail-form");
    const displayLabel = createElement("label", "settings-field-label", "显示名称");
    const displayName = document.createElement("input");
    displayName.value = current.displayName;
    displayName.maxLength = 40;
    displayLabel.append(displayName);

    const nicknameLabel = createElement("label", "settings-field-label", "称呼");
    const nickname = document.createElement("input");
    nickname.value = current.nickname;
    nickname.maxLength = 30;
    nicknameLabel.append(nickname);

    const save = createActionButton("保存", "primary");
    save.type = "submit";
    const status = createElement("p", "settings-inline-status");
    form.append(displayLabel, nicknameLabel, save, status);

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      preferences.updateProfile({ displayName: displayName.value, nickname: nickname.value });
      status.textContent = "已保存。";
    });
    root.append(form);
  }

  function renderPersonalization() {
    renderHeader("个性化与记忆");
    renderPersonalizationView({
      root: ui.settingsHubContent,
      preferences,
      getBasePrompt: getSystemPrompt,
    });
  }

  function renderUsage() {
    renderHeader("用量");
    const current = usage.snapshot;
    const root = ui.settingsHubContent;
    root.replaceChildren();

    const card = createElement("section", "usage-card");
    [
      ["请求", `${formatNumber(current.requestCount)} 次`],
      ["Tokens", formatNumber(current.totalTokens)],
      ["思考 Tokens", formatNumber(current.reasoningTokens)],
      ["最近一次", formatDate(current.lastUpdatedAt)],
    ].forEach(([label, value]) => {
      const row = createElement("div", "usage-row");
      row.append(createElement("span", "", label), createElement("strong", "", value));
      card.append(row);
    });

    root.append(card);
  }

  function renderNotifications() {
    renderHeader("通知");
    const root = ui.settingsHubContent;
    root.replaceChildren();
    const current = preferences.snapshot.notifications;
    const supported = typeof Notification !== "undefined";
    const permission = supported ? Notification.permission : "unsupported";
    const state = permission === "granted" ? "已授权" : permission === "denied" ? "已拒绝" : permission === "default" ? "未授权" : "不支持";

    const card = createElement("section", "settings-card settings-card-plain");
    card.append(createToggle("回复完成提醒", `权限：${state}`, current.chatComplete, async (checked) => {
      if (checked && supported && Notification.permission === "default") await Notification.requestPermission();
      const canNotify = !checked || (supported && Notification.permission === "granted");
      preferences.updateNotifications({ chatComplete: canNotify && checked });
      onNotificationPreferenceChange?.(canNotify && checked);
      renderNotifications();
    }));
    root.append(card);
  }

  function renderPrivacy() {
    renderHeader("隐私与本地数据");
    const root = ui.settingsHubContent;
    root.replaceChildren();

    const card = createElement("section", "settings-card settings-card-plain");
    card.append(createRouteRow({ title: "导出全部本地数据", iconName: "download", onClick: onExportAllData }));

    const clear = createActionButton("删除全部本地数据", "danger");
    clear.addEventListener("click", () => {
      if (!window.confirm("删除当前浏览器中的聊天记录、设置、偏好与用量统计？无法恢复。")) return;
      onDeleteAllLocalData();
      close();
    });

    root.append(card, clear);
  }

  function renderSharing() {
    renderHeader("导出与分享");
    const root = ui.settingsHubContent;
    root.replaceChildren();
    const conversation = getConversationSnapshot();
    const card = createElement("section", "settings-card settings-card-plain");
    card.append(
      createRouteRow({ title: "复制当前对话", description: conversation.messages.length ? `${conversation.messages.length} 条消息` : "当前对话为空", iconName: "share", onClick: onCopyCurrentConversation }),
      createRouteRow({ title: "下载当前对话", iconName: "download", onClick: onExportCurrentConversation }),
    );
    root.append(card);
  }

  function render() {
    const routes = {
      home: renderHome,
      profile: renderProfile,
      personalization: renderPersonalization,
      usage: renderUsage,
      notifications: renderNotifications,
      privacy: renderPrivacy,
      sharing: renderSharing,
    };
    (routes[activeRoute] || renderHome)();
  }

  ui.settingsHubBack.addEventListener("click", () => navigate("home"));
  ui.settingsHubClose.addEventListener("click", close);
  ui.settingsHubBackdrop.addEventListener("click", close);

  return { open, close, render };
}
