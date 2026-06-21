const STORAGE_KEYS = {
  apiKey: "deepseek-playground-api-key",
  endpoint: "deepseek-playground-endpoint",
  model: "deepseek-playground-model",
  systemPrompt: "deepseek-playground-system-prompt",
};

const elements = {
  apiKey: document.querySelector("#api-key"),
  endpoint: document.querySelector("#endpoint"),
  model: document.querySelector("#model"),
  systemPrompt: document.querySelector("#system-prompt"),
  toggleKey: document.querySelector("#toggle-key"),
  saveSettings: document.querySelector("#save-settings"),
  clearKey: document.querySelector("#clear-key"),
  clearChat: document.querySelector("#clear-chat"),
  messages: document.querySelector("#messages"),
  composer: document.querySelector("#composer"),
  prompt: document.querySelector("#prompt"),
  sendButton: document.querySelector("#send-button"),
  errorMessage: document.querySelector("#error-message"),
  connectionStatus: document.querySelector("#connection-status"),
};

let conversation = [];
let isSending = false;

function readSettings() {
  elements.apiKey.value = sessionStorage.getItem(STORAGE_KEYS.apiKey) || "";
  elements.endpoint.value = localStorage.getItem(STORAGE_KEYS.endpoint) || elements.endpoint.value;
  elements.model.value = localStorage.getItem(STORAGE_KEYS.model) || elements.model.value;
  elements.systemPrompt.value = localStorage.getItem(STORAGE_KEYS.systemPrompt) || elements.systemPrompt.value;
  updateConnectionStatus();
}

function saveSettings() {
  sessionStorage.setItem(STORAGE_KEYS.apiKey, elements.apiKey.value.trim());
  localStorage.setItem(STORAGE_KEYS.endpoint, elements.endpoint.value.trim());
  localStorage.setItem(STORAGE_KEYS.model, elements.model.value.trim());
  localStorage.setItem(STORAGE_KEYS.systemPrompt, elements.systemPrompt.value.trim());
  showError("");
  updateConnectionStatus();
}

function updateConnectionStatus() {
  const hasKey = Boolean(elements.apiKey.value.trim());
  elements.connectionStatus.textContent = hasKey ? "已配置 Key" : "未连接";
  elements.connectionStatus.classList.toggle("is-active", hasKey);
}

function showError(message) {
  elements.errorMessage.textContent = message;
}

function scrollMessagesToBottom() {
  elements.messages.scrollTop = elements.messages.scrollHeight;
}

function createMessageElement({ role, content, pending = false }) {
  const article = document.createElement("article");
  article.className = `message ${role === "user" ? "user-message" : "assistant-message"}${pending ? " is-pending" : ""}`;

  const avatar = document.createElement("div");
  avatar.className = "message-avatar";
  avatar.textContent = role === "user" ? "你" : "D";

  const box = document.createElement("div");
  box.className = "message-content";

  const label = document.createElement("span");
  label.className = "message-role";
  label.textContent = role === "user" ? "YOU" : "DEEPSEEK";

  const text = document.createElement("p");
  text.textContent = content;

  box.append(label, text);
  article.append(avatar, box);
  return article;
}

function appendMessage(message) {
  const element = createMessageElement(message);
  elements.messages.append(element);
  scrollMessagesToBottom();
  return element;
}

function autoGrowPrompt() {
  elements.prompt.style.height = "auto";
  elements.prompt.style.height = `${Math.min(elements.prompt.scrollHeight, 180)}px`;
}

function clearConversation() {
  conversation = [];
  elements.messages.replaceChildren();
  appendMessage({
    role: "assistant",
    content: "对话已清空。你想让 DeepSeek 帮你做什么？",
  });
  showError("");
}

function getApiError(data, fallback) {
  if (typeof data?.error === "string") return data.error;
  if (typeof data?.error?.message === "string") return data.error.message;
  if (typeof data?.message === "string") return data.message;
  return fallback;
}

async function requestCompletion() {
  const apiKey = elements.apiKey.value.trim();
  const endpoint = elements.endpoint.value.trim();
  const model = elements.model.value.trim();
  const systemPrompt = elements.systemPrompt.value.trim();

  if (!apiKey) throw new Error("请先填写 API Key。");
  if (!endpoint) throw new Error("请填写接口地址。");
  if (!model) throw new Error("请填写模型名称。");

  const messages = [
    ...(systemPrompt ? [{ role: "system", content: systemPrompt }] : []),
    ...conversation,
  ];

  let response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        stream: false,
      }),
    });
  } catch {
    throw new Error("浏览器无法连接到接口。检查网络、接口地址，或确认服务商是否允许浏览器跨域请求（CORS）。");
  }

  let data = null;
  try {
    data = await response.json();
  } catch {
    throw new Error(`接口返回了无法识别的内容（HTTP ${response.status}）。`);
  }

  if (!response.ok) {
    throw new Error(getApiError(data, `接口请求失败（HTTP ${response.status}）。`));
  }

  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) {
    throw new Error("接口没有返回可显示的回复。请确认模型名称与接口格式。");
  }

  return content.trim();
}

async function handleSubmit(event) {
  event.preventDefault();
  if (isSending) return;

  const userText = elements.prompt.value.trim();
  if (!userText) return;

  saveSettings();
  isSending = true;
  elements.sendButton.disabled = true;
  showError("");

  conversation.push({ role: "user", content: userText });
  appendMessage({ role: "user", content: userText });
  elements.prompt.value = "";
  autoGrowPrompt();

  const pendingElement = appendMessage({ role: "assistant", content: "正在生成", pending: true });

  try {
    const answer = await requestCompletion();
    conversation.push({ role: "assistant", content: answer });
    pendingElement.replaceWith(createMessageElement({ role: "assistant", content: answer }));
    scrollMessagesToBottom();
  } catch (error) {
    pendingElement.remove();
    showError(error instanceof Error ? error.message : "请求失败，请稍后再试。");
  } finally {
    isSending = false;
    elements.sendButton.disabled = false;
    elements.prompt.focus();
  }
}

elements.toggleKey.addEventListener("click", () => {
  const isHidden = elements.apiKey.type === "password";
  elements.apiKey.type = isHidden ? "text" : "password";
  elements.toggleKey.textContent = isHidden ? "隐藏" : "显示";
});

elements.apiKey.addEventListener("input", updateConnectionStatus);
elements.saveSettings.addEventListener("click", saveSettings);
elements.clearKey.addEventListener("click", () => {
  sessionStorage.removeItem(STORAGE_KEYS.apiKey);
  elements.apiKey.value = "";
  updateConnectionStatus();
});
elements.clearChat.addEventListener("click", clearConversation);
elements.composer.addEventListener("submit", handleSubmit);
elements.prompt.addEventListener("input", autoGrowPrompt);
elements.prompt.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    elements.composer.requestSubmit();
  }
});

readSettings();
autoGrowPrompt();
