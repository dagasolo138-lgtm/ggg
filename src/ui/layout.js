import { icon } from "./icons.js";

export function renderShell(root) {
  root.innerHTML = `
    <div class="app-shell">
      <aside id="history-drawer" class="history-drawer" aria-hidden="true">
        <div class="drawer-head">
          <strong class="drawer-brand">bin</strong>
          <div class="drawer-head-actions">
            <button id="open-artifact-library" class="profile-button drawer-icon-button" type="button" aria-label="打开 Artifact 作品库">${icon("artifact")}</button>
            <button id="open-settings-hub" class="profile-button" type="button" aria-label="打开设置">BH</button>
          </div>
        </div>
        <div id="history-list" class="history-list" aria-label="对话历史列表"></div>
        <button id="new-chat" class="new-chat-button" type="button">${icon("plus")}<span>新对话</span></button>
      </aside>
      <div id="drawer-backdrop" class="drawer-backdrop" hidden></div>

      <div id="app-frame" class="app-frame">
        <header class="topbar">
          <button id="open-history" class="circle-button ghost-button" type="button" aria-label="打开对话历史">${icon("menu")}</button>

          <div id="conversation-actions" class="conversation-actions" hidden>
            <button id="conversation-new-button" class="conversation-action-button conversation-new-button" type="button" aria-label="新建对话">${icon("plus")}</button>
            <span class="conversation-action-divider" aria-hidden="true"></span>
            <button id="conversation-menu-trigger" class="conversation-action-button" type="button" aria-label="当前对话更多操作" aria-expanded="false">${icon("more")}</button>

            <div id="conversation-menu" class="conversation-menu" hidden role="menu" aria-label="当前对话操作">
              <button id="conversation-share" class="conversation-menu-item" type="button" role="menuitem">${icon("share")}<span>分享</span></button>
              <button id="conversation-star" class="conversation-menu-item" type="button" role="menuitem">${icon("star")}<span id="conversation-star-label">收藏</span></button>
              <button id="conversation-rename" class="conversation-menu-item" type="button" role="menuitem">${icon("edit")}<span>重命名</span></button>
              <button id="conversation-delete" class="conversation-menu-item danger" type="button" role="menuitem">${icon("trash")}<span>删除</span></button>
            </div>
          </div>
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
            <input id="attachment-input" type="file" multiple hidden accept="image/*,.txt,.md,.markdown,.csv,.json,.log,.js,.jsx,.ts,.tsx,.py,.html,.css,.xml,.yml,.yaml,.sql,.java,.c,.cpp,.h,.sh" />
            <div id="attachment-tray" class="attachment-tray" hidden aria-live="polite"></div>
            <textarea id="prompt" rows="1" placeholder="输入消息" autocomplete="off"></textarea>
            <div class="composer-toolbar">
              <button id="attach-button" class="circle-button dark-button" type="button" aria-label="添加附件">${icon("plus")}</button>
              <button id="model-pill" class="model-pill" type="button"><span id="model-pill-text"></span></button>
              <div class="composer-actions">
                <button id="stop-button" class="circle-button stop-button" type="button" hidden aria-label="停止生成">${icon("stop")}</button>
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
          <div><h2>模型与 API</h2></div>
          <button id="close-settings" class="circle-button sheet-close" type="button" aria-label="关闭设置">${icon("close")}</button>
        </div>
        <div class="sheet-body">
          <label class="field-label" for="api-key">API Key</label>
          <div class="secret-field"><input id="api-key" type="password" autocomplete="off" placeholder="sk-..." /><button id="toggle-key" class="icon-text-button" type="button">显示</button></div>
          <label class="remember-key"><input id="remember-api-key" type="checkbox" /><span>在此设备记住 API Key</span></label>

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
          <p id="settings-save-status" class="settings-save-status" aria-live="polite"></p>
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

      <div id="artifact-workspace-backdrop" class="artifact-workspace-backdrop" hidden></div>
      <aside id="artifact-workspace" class="artifact-workspace" aria-hidden="true" hidden>
        <header class="artifact-workspace-header">
          <button id="artifact-workspace-close" class="circle-button artifact-workspace-close" type="button" aria-label="关闭 Artifact">${icon("close")}</button>
          <div><h2 id="artifact-workspace-title">Artifacts</h2></div>
          <span class="artifact-workspace-spacer" aria-hidden="true"></span>
        </header>
        <main id="artifact-workspace-content" class="artifact-workspace-content"></main>
      </aside>

      <div id="rename-dialog" class="rename-dialog" hidden aria-hidden="true" role="dialog" aria-modal="true" aria-labelledby="rename-dialog-title">
        <form id="rename-dialog-form" class="rename-dialog-card">
          <h2 id="rename-dialog-title">重命名对话</h2>
          <input id="rename-title-input" type="text" maxlength="80" autocomplete="off" placeholder="输入对话名称" />
          <p id="rename-dialog-error" class="rename-dialog-error" role="alert"></p>
          <div class="rename-dialog-actions">
            <button id="rename-dialog-cancel" type="button" class="rename-cancel-button">取消</button>
            <button type="submit" class="rename-confirm-button">保存</button>
          </div>
        </form>
      </div>
    </div>
  `;

  return {
    shell: root.querySelector(".app-shell"),
    frame: root.querySelector("#app-frame"),
    openHistory: root.querySelector("#open-history"),
    openArtifactLibrary: root.querySelector("#open-artifact-library"),
    artifactWorkspace: root.querySelector("#artifact-workspace"),
    artifactWorkspaceBackdrop: root.querySelector("#artifact-workspace-backdrop"),
    artifactWorkspaceClose: root.querySelector("#artifact-workspace-close"),
    artifactWorkspaceTitle: root.querySelector("#artifact-workspace-title"),
    artifactWorkspaceContent: root.querySelector("#artifact-workspace-content"),
    conversationActions: root.querySelector("#conversation-actions"),
    conversationNewButton: root.querySelector("#conversation-new-button"),
    conversationMenuTrigger: root.querySelector("#conversation-menu-trigger"),
    conversationMenu: root.querySelector("#conversation-menu"),
    conversationShare: root.querySelector("#conversation-share"),
    conversationStar: root.querySelector("#conversation-star"),
    conversationStarLabel: root.querySelector("#conversation-star-label"),
    conversationStarIcon: root.querySelector("#conversation-star .icon"),
    conversationRename: root.querySelector("#conversation-rename"),
    conversationDelete: root.querySelector("#conversation-delete"),
    renameDialog: root.querySelector("#rename-dialog"),
    renameDialogForm: root.querySelector("#rename-dialog-form"),
    renameTitleInput: root.querySelector("#rename-title-input"),
    renameDialogError: root.querySelector("#rename-dialog-error"),
    renameDialogCancel: root.querySelector("#rename-dialog-cancel"),
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
    messages: root.querySelector("#messages"),
    emptyState: root.querySelector("#empty-state"),
    composer: root.querySelector("#composer"),
    prompt: root.querySelector("#prompt"),
    attachmentInput: root.querySelector("#attachment-input"),
    attachmentTray: root.querySelector("#attachment-tray"),
    attachButton: root.querySelector("#attach-button"),
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
