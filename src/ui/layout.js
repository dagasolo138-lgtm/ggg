import { icon } from "./icons.js";

export function renderShell(root) {
  root.innerHTML = `
    <div class="app-shell">
      <aside id="history-drawer" class="history-drawer" aria-hidden="true">
        <div class="drawer-head">
          <strong class="drawer-brand">bin</strong>
          <button id="open-settings-hub" class="profile-button" type="button" aria-label="打开设置">BH</button>
        </div>
        <p class="history-title">对话历史</p>
        <div id="history-list" class="history-list" aria-label="对话历史列表"></div>
        <button id="new-chat" class="new-chat-button" type="button">${icon("plus")}<span>新对话</span></button>
      </aside>
      <div id="drawer-backdrop" class="drawer-backdrop" hidden></div>

      <div id="app-frame" class="app-frame">
        <header class="topbar">
          <button id="open-history" class="circle-button ghost-button" type="button" aria-label="打开对话历史">${icon("menu")}</button>
          <button id="clear-chat" class="circle-button ghost-button" type="button" aria-label="清空当前对话">${icon("clear")}</button>
        </header>

        <main class="stage">
          <section id="empty-state" class="empty-state">
            <div class="burst" aria-hidden="true">${"<i></i>".repeat(8)}</div>
            <h1>bin returns!</h1>
          </section>
          <section id="messages" class="messages" aria-live="polite"></section>
        </main>

        <div class="composer-wrap">
          <form id="composer" class="composer-card">
            <textarea id="prompt" rows="1" placeholder="Chat with DeepSeek" autocomplete="off"></textarea>
            <div class="composer-toolbar">
              <button class="circle-button dark-button" type="button" aria-label="更多功能">${icon("plus")}</button>
              <button id="model-pill" class="model-pill" type="button"><span id="model-pill-text"></span></button>
              <div class="composer-actions">
                <button id="stop-button" class="circle-button stop-button" type="button" hidden aria-label="停止生成">${icon("stop")}</button>
                <button class="circle-button dark-button" type="button" aria-label="语音输入">${icon("mic")}</button>
                <button id="send-button" class="circle-button send-button" type="submit" aria-label="发送消息">${icon("send")}</button>
              </div>
            </div>
          </form>
          <p id="error-message" class="error-message" role="alert"></p>
        </div>
      </div>

      <div id="sheet-backdrop" class="sheet-backdrop" hidden></div>
      <aside id="settings-sheet" class="settings-sheet" aria-hidden="true">
        <div class="sheet-head">
          <div><p class="eyebrow">CONNECTION</p><h2>模型与 API</h2></div>
          <button id="close-settings" class="circle-button sheet-close" type="button" aria-label="关闭设置">${icon("close")}</button>
        </div>
        <div class="sheet-body">
          <label class="field-label" for="api-key">API Key</label>
          <div class="secret-field"><input id="api-key" type="password" autocomplete="off" placeholder="sk-..." /><button id="toggle-key" class="icon-text-button" type="button">显示</button></div>
          <label class="remember-key"><input id="remember-api-key" type="checkbox" /><span>在此设备记住 API Key</span></label>
          <p class="field-help">默认保存在这台设备的浏览器内。关闭此开关后，Key 只在当前页面会话保留。</p>

          <label class="field-label" for="endpoint">接口地址</label>
          <input id="endpoint" type="url" spellcheck="false" />

          <label class="field-label" for="model">模型</label>
          <select id="model"><option value="deepseek-v4-flash">DeepSeek V4 Flash</option><option value="deepseek-v4-pro">DeepSeek V4 Pro</option></select>

          <fieldset class="thinking-control"><legend class="field-label">思考模式</legend><div class="thinking-options">
            <label class="thinking-option"><input type="radio" name="thinking-mode" value="disabled" /><span><strong>快速</strong><small>直接回答</small></span></label>
            <label class="thinking-option"><input type="radio" name="thinking-mode" value="high" /><span><strong>深度</strong><small>high</small></span></label>
            <label class="thinking-option"><input type="radio" name="thinking-mode" value="max" /><span><strong>极限</strong><small>max</small></span></label>
          </div></fieldset>

          <label class="field-label" for="system-prompt">系统提示词</label>
          <textarea id="system-prompt" rows="5"></textarea>

          <div class="settings-actions"><button id="save-settings" class="primary-button" type="button">保存并关闭</button><button id="clear-key" class="text-button" type="button">清除 Key</button></div>
          <p id="settings-save-status" class="settings-save-status" aria-live="polite">更改会自动保存到此设备</p>
          <div class="security-note"><strong>部署前要知道</strong><p>浏览器本地保存适合你自己的设备。设备共享、浏览器同步或不受信任脚本环境下，不要勾选“记住 API Key”。</p></div>
        </div>
      </aside>

      <div id="settings-hub-backdrop" class="settings-hub-backdrop" hidden></div>
      <aside id="settings-hub" class="settings-hub" aria-hidden="true" hidden>
        <header class="settings-hub-header">
          <button id="settings-hub-back" class="circle-button settings-hub-button" type="button" hidden aria-label="返回">${icon("back")}</button>
          <h2 id="settings-hub-title">设置</h2>
          <button id="settings-hub-close" class="circle-button settings-hub-button" type="button" aria-label="关闭设置">${icon("close")}</button>
        </header>
        <main id="settings-hub-content" class="settings-hub-content"></main>
      </aside>
    </div>
  `;

  return {
    shell: root.querySelector(".app-shell"),
    frame: root.querySelector("#app-frame"),
    openHistory: root.querySelector("#open-history"),
    historyDrawer: root.querySelector("#history-drawer"),
    historyList: root.querySelector("#history-list"),
    drawerBackdrop: root.querySelector("#drawer-backdrop"),
    newChat: root.querySelector("#new-chat"),
    openSettingsHub: root.querySelector("#open-settings-hub"),
    settingsHub: root.querySelector("#settings-hub"),
    settingsHubBackdrop: root.querySelector("#settings-hub-backdrop"),
    settingsHubTitle: root.querySelector("#settings-hub-title"),
    settingsHubBack: root.querySelector("#settings-hub-back"),
    settingsHubClose: root.querySelector("#settings-hub-close"),
    settingsHubContent: root.querySelector("#settings-hub-content"),
    closeSettings: root.querySelector("#close-settings"),
    sheet: root.querySelector("#settings-sheet"),
    backdrop: root.querySelector("#sheet-backdrop"),
    clearChat: root.querySelector("#clear-chat"),
    messages: root.querySelector("#messages"),
    emptyState: root.querySelector("#empty-state"),
    composer: root.querySelector("#composer"),
    prompt: root.querySelector("#prompt"),
    sendButton: root.querySelector("#send-button"),
    stopButton: root.querySelector("#stop-button"),
    modelPill: root.querySelector("#model-pill"),
    modelPillText: root.querySelector("#model-pill-text"),
    error: root.querySelector("#error-message"),
    apiKey: root.querySelector("#api-key"),
    rememberApiKey: root.querySelector("#remember-api-key"),
    endpoint: root.querySelector("#endpoint"),
    model: root.querySelector("#model"),
    modes: [...root.querySelectorAll('input[name="thinking-mode"]')],
    systemPrompt: root.querySelector("#system-prompt"),
    toggleKey: root.querySelector("#toggle-key"),
    saveSettings: root.querySelector("#save-settings"),
    clearKey: root.querySelector("#clear-key"),
    settingsSaveStatus: root.querySelector("#settings-save-status"),
  };
}
