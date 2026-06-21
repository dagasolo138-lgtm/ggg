const shell = document.querySelector('.app-shell');
const workspace = document.querySelector('.workspace');
const settingsPanel = document.querySelector('.settings-panel');
const chatPanel = document.querySelector('.chat-panel');
const chatHeader = document.querySelector('.chat-header');
const messages = document.querySelector('#messages');
const composer = document.querySelector('#composer');
const error = document.querySelector('#error-message');
const clearChat = document.querySelector('#clear-chat');
const connectionStatus = document.querySelector('#connection-status');

if (shell && workspace && settingsPanel && chatPanel && messages && composer && clearChat && connectionStatus) {
  document.body.classList.add('mobile-claude-ui');

  const toggle = document.createElement('input');
  toggle.type = 'checkbox';
  toggle.id = 'mobile-settings-toggle';
  toggle.className = 'mobile-settings-toggle';

  const root = document.createElement('div');
  root.className = 'mobile-root';

  const topbar = document.createElement('header');
  topbar.className = 'mobile-topbar';
  topbar.innerHTML = `
    <label for="mobile-settings-toggle" class="mobile-icon-button" aria-label="打开设置">
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h11" /></svg>
    </label>
  `;

  clearChat.className = 'mobile-icon-button';
  clearChat.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 7h10v10H7zM10 3h4M5 7h14" /></svg>';
  clearChat.setAttribute('aria-label', '清空对话');
  topbar.append(clearChat);

  const stage = document.createElement('main');
  stage.className = 'mobile-stage';
  stage.innerHTML = `
    <div class="mobile-empty-state" aria-hidden="true">
      <div class="mobile-burst"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div>
      <h1>bin returns!</h1>
    </div>
  `;

  const chatOnly = document.createElement('section');
  chatOnly.className = 'mobile-chat';
  chatOnly.append(messages);
  stage.append(chatOnly);

  const composerWrap = document.createElement('div');
  composerWrap.className = 'mobile-composer-wrap';
  const toolbar = composer.querySelector('.composer-buttons');
  const stopButton = document.querySelector('#stop-button');
  const sendButton = document.querySelector('#send-button');

  const plusButton = document.createElement('button');
  plusButton.type = 'button';
  plusButton.className = 'mobile-round-control';
  plusButton.setAttribute('aria-label', '更多功能');
  plusButton.innerHTML = '<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" /></svg>';

  const micButton = document.createElement('button');
  micButton.type = 'button';
  micButton.className = 'mobile-round-control';
  micButton.setAttribute('aria-label', '语音输入');
  micButton.innerHTML = '<svg viewBox="0 0 24 24"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M6 11a6 6 0 0 0 12 0M12 17v4M8 21h8" /></svg>';

  const modelPill = document.createElement('label');
  modelPill.htmlFor = 'mobile-settings-toggle';
  modelPill.className = 'mobile-model-pill';
  modelPill.append(connectionStatus);

  const actions = document.createElement('div');
  actions.className = 'mobile-actions';
  if (stopButton) {
    stopButton.className = 'mobile-round-control mobile-stop-control';
    stopButton.innerHTML = '<svg viewBox="0 0 24 24"><rect x="7" y="7" width="10" height="10" rx="1"/></svg>';
    actions.append(stopButton);
  }
  if (sendButton) {
    sendButton.className = 'mobile-send-control';
    sendButton.innerHTML = '<svg viewBox="0 0 24 24"><path d="M5 12h13M13 6l6 6-6 6" /></svg>';
    actions.append(micButton, sendButton);
  }

  if (toolbar) toolbar.replaceWith(plusButton, modelPill, actions);
  composer.className = 'mobile-composer-card';
  composerWrap.append(composer, error);

  const sheetBackdrop = document.createElement('label');
  sheetBackdrop.htmlFor = 'mobile-settings-toggle';
  sheetBackdrop.className = 'mobile-sheet-backdrop';

  const sheet = document.createElement('aside');
  sheet.className = 'mobile-settings-sheet';
  const sheetHead = document.createElement('div');
  sheetHead.className = 'mobile-sheet-head';
  sheetHead.innerHTML = `
    <div><p class="eyebrow">SETTINGS</p><h2>连接设置</h2></div>
    <label for="mobile-settings-toggle" class="mobile-sheet-close" aria-label="关闭设置">
      <svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" /></svg>
    </label>
  `;
  const oldHeading = settingsPanel.querySelector('.panel-heading');
  oldHeading?.remove();
  settingsPanel.classList.add('mobile-settings-content');
  sheet.append(sheetHead, settingsPanel);

  if (chatHeader) chatHeader.remove();
  workspace.remove();
  shell.replaceChildren(toggle, root);
  root.append(topbar, stage, composerWrap, sheetBackdrop, sheet);

  const empty = root.querySelector('.mobile-empty-state');
  const syncEmpty = () => empty?.classList.toggle('is-hidden', messages.children.length > 1);
  syncEmpty();
  new MutationObserver(syncEmpty).observe(messages, { childList: true });
}
