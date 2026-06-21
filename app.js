const STORAGE_KEYS = {
  apiKey: "deepseek-playground-api-key",
  endpoint: "deepseek-playground-endpoint",
  model: "deepseek-playground-model",
  thinkingMode: "deepseek-playground-thinking-mode",
  systemPrompt: "deepseek-playground-system-prompt",
};

const MODE_LABELS = { disabled: "快速", high: "深度", max: "极限" };

const elements = {
  apiKey: document.querySelector("#api-key"),
  endpoint: document.querySelector("#endpoint"),
  model: document.querySelector("#model"),
  thinkingModes: [...document.querySelectorAll('input[name="thinking-mode"]')],
  systemPrompt: document.querySelector("#system-prompt"),
  toggleKey: document.querySelector("#toggle-key"),
  saveSettings: document.querySelector("#save-settings"),
  clearKey: document.querySelector("#clear-key"),
  clearChat: document.querySelector("#clear-chat"),
  messages: document.querySelector("#messages"),
  composer: document.querySelector("#composer"),
  prompt: document.querySelector("#prompt"),
  sendButton: document.querySelector("#send-button"),
  stopButton: document.querySelector("#stop-button"),
  errorMessage: document.querySelector("#error-message"),
  connectionStatus: document.querySelector("#connection-status"),
};

let conversation = [];
let isSending = false;
let activeController = null;
let generationId = 0;

function getThinkingMode() {
  return elements.thinkingModes.find((input) => input.checked)?.value || "high";
}

function setThinkingMode(mode) {
  const selected = elements.thinkingModes.find((input) => input.value === mode)
    || elements.thinkingModes.find((input) => input.value === "high");
  if (selected) selected.checked = true;
}

function readSettings() {
  elements.apiKey.value = sessionStorage.getItem(STORAGE_KEYS.apiKey) || "";
  elements.endpoint.value = localStorage.getItem(STORAGE_KEYS.endpoint) || elements.endpoint.value;

  const savedModel = localStorage.getItem(STORAGE_KEYS.model);
  const modelExists = [...elements.model.options].some((option) => option.value === savedModel);
  elements.model.value = modelExists ? savedModel : "deepseek-v4-flash";

  setThinkingMode(localStorage.getItem(STORAGE_KEYS.thinkingMode) || "high");
  elements.systemPrompt.value = localStorage.getItem(STORAGE_KEYS.systemPrompt) || elements.systemPrompt.value;
  updateConnectionStatus();
}

function saveSettings() {
  sessionStorage.setItem(STORAGE_KEYS.apiKey, elements.apiKey.value.trim());
  localStorage.setItem(STORAGE_KEYS.endpoint, elements.endpoint.value.trim());
  localStorage.setItem(STORAGE_KEYS.model, elements.model.value);
  localStorage.setItem(STORAGE_KEYS.thinkingMode, getThinkingMode());
  localStorage.setItem(STORAGE_KEYS.systemPrompt, elements.systemPrompt.value.trim());
  showError("");
  updateConnectionStatus();
}

function updateConnectionStatus() {
  const hasKey = Boolean(elements.apiKey.value.trim());
  elements.connectionStatus.textContent = hasKey ? `已配置 Key · ${MODE_LABELS[getThinkingMode()]}` : "未连接";
  elements.connectionStatus.classList.toggle("is-active", hasKey);
}

function showError(message) {
  elements.errorMessage.textContent = message;
}

function scrollMessagesToBottom() {
  elements.messages.scrollTop = elements.messages.scrollHeight;
}

function createReasoningBlock(mode, isStreaming) {
  const details = document.createElement("details");
  details.className = "reasoning-details";
  details.open = isStreaming;

  const summary = document.createElement("summary");
  const label = document.createElement("span");
  label.className = "reasoning-label";
  label.textContent = `${MODE_LABELS[mode]}思考`;

  const status = document.createElement("span");
  status.className = "reasoning-status";
  status.textContent = isStreaming ? "思考中" : "思考过程";

  const text = document.createElement("pre");
  text.className = "reasoning-text";
  text.textContent = isStreaming ? "正在思考…" : "";

  summary.append(label, status);
  details.append(summary, text);
  return { details, status, text };
}

function formatUsage(usage) {
  if (!usage?.total_tokens) return "";
  const reasoningTokens = usage?.completion_tokens_details?.reasoning_tokens;
  return reasoningTokens
    ? `本次 ${usage.total_tokens} tokens · 思考 ${reasoningTokens} tokens`
    : `本次 ${usage.total_tokens} tokens`;
}

function createMessageElement({ role, content = "", reasoningContent = "", mode = "disabled", isStreaming = false, usage = null }) {
  const article = document.createElement("article");
  article.className = `message ${role === "user" ? "user-message" : "assistant-message"}`;

  const avatar = document.createElement("div");
  avatar.className = "message-avatar";
  avatar.textContent = role === "user" ? "你" : "D";

  const box = document.createElement("div");
  box.className = "message-content";

  const label = document.createElement("span");
  label.className = "message-role";
  label.textContent = role === "user" ? "YOU" : "DEEPSEEK";
  box.append(label);

  const refs = {
    article,
    answerText: null,
    reasoningDetails: null,
    reasoningText: null,
    reasoningStatus: null,
    meta: null,
  };

  if (role === "assistant" && mode !== "disabled") {
    const reasoning = createReasoningBlock(mode, isStreaming);
    if (reasoningContent) reasoning.text.textContent = reasoningContent;
    box.append(reasoning.details);
    refs.reasoningDetails = reasoning.details;
    refs.reasoningText = reasoning.text;
    refs.reasoningStatus = reasoning.status;
  }

  const answerText = document.createElement("p");
  answerText.className = "answer-text";
  if (content) {
    answerText.textContent = content;
  } else if (isStreaming) {
    answerText.textContent = mode === "disabled" ? "正在生成…" : "等待最终回答…";
    answerText.classList.add("answer-pending");
  }
  box.append(answerText);
  refs.answerText = answerText;

  if (role === "assistant") {
    const meta = document.createElement("p");
    meta.className = "message-meta";
    meta.textContent = usage ? formatUsage(usage) : "";
    box.append(meta);
    refs.meta = meta;
  }

  article.append(avatar, box);
  return refs;
}

function appendMessage(message) {
  const refs = createMessageElement(message);
  elements.messages.append(refs.article);
  scrollMessagesToBottom();
  return refs;
}

function autoGrowPrompt() {
  elements.prompt.style.height = "auto";
  elements.prompt.style.height = `${Math.min(elements.prompt.scrollHeight, 180)}px`;
}

function setSendingState(sending) {
  isSending = sending;
  elements.sendButton.disabled = sending;
  elements.stopButton.hidden = !sending;
}

function clearConversation() {
  generationId += 1;
  activeController?.abort();
  activeController = null;
  setSendingState(false);
  conversation = [];
  elements.messages.replaceChildren();
  appendMessage({ role: "assistant", content: "对话已清空。你想让 DeepSeek 帮你做什么？" });
  showError("");
  elements.prompt.focus();
}

function getApiError(data, fallback) {
  if (typeof data?.error === "string") return data.error;
  if (typeof data?.error?.message === "string") return data.error.message;
  if (typeof data?.message === "string") return data.message;
  return fallback;
}

function buildApiMessages(systemPrompt) {
  const history = conversation.map((message) => ({ role: message.role, content: message.content }));
  return [
    ...(systemPrompt ? [{ role: "system", content: systemPrompt }] : []),
    ...history,
  ];
}

function processSseEvent(rawEvent, onChunk) {
  const payload = rawEvent.trim();
  if (!payload || payload === "[DONE]") return;

  let data;
  try {
    data = JSON.parse(payload);
  } catch {
    throw new Error("接口返回了无法解析的流式数据。");
  }

  const choice = data?.choices?.[0];
  const delta = choice?.delta || {};
  onChunk({
    reasoningContent: typeof delta.reasoning_content === "string" ? delta.reasoning_content : "",
    content: typeof delta.content === "string" ? delta.content : "",
    finishReason: choice?.finish_reason || null,
    usage: data?.usage || null,
  });
}

async function requestStream({ onChunk, signal }) {
  const apiKey = elements.apiKey.value.trim();
  const endpoint = elements.endpoint.value.trim();
  const model = elements.model.value;
  const thinkingMode = getThinkingMode();
  const systemPrompt = elements.systemPrompt.value.trim();

  if (!apiKey) throw new Error("请先填写 API Key。");
  if (!endpoint) throw new Error("请填写接口地址。");
  if (!model) throw new Error("请选择模型。");

  const body = {
    model,
    messages: buildApiMessages(systemPrompt),
    thinking: { type: thinkingMode === "disabled" ? "disabled" : "enabled" },
    stream: true,
    stream_options: { include_usage: true },
  };
  if (thinkingMode !== "disabled") body.reasoning_effort = thinkingMode;

  let response;
  try {
    response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal,
    });
  } catch (error) {
    if (error?.name === "AbortError") throw error;
    throw new Error("浏览器无法连接到接口。检查网络、接口地址，或确认服务商是否允许浏览器跨域请求（CORS）。");
  }

  if (!response.ok) {
    let data = null;
    try {
      data = await response.json();
    } catch {
      // The HTTP status still gives a useful failure signal.
    }
    throw new Error(getApiError(data, `接口请求失败（HTTP ${response.status}）。`));
  }

  if (!response.body) throw new Error("浏览器不支持读取流式响应。");

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let eventLines = [];

  const consumeLine = (line) => {
    if (line === "") {
      if (eventLines.length) {
        processSseEvent(eventLines.join("\n"), onChunk);
        eventLines = [];
      }
      return;
    }
    if (line.startsWith("data:")) eventLines.push(line.slice(5).trimStart());
  };

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() || "";
    lines.forEach(consumeLine);
  }

  buffer += decoder.decode();
  if (buffer) consumeLine(buffer);
  if (eventLines.length) processSseEvent(eventLines.join("\n"), onChunk);
}

async function handleSubmit(event) {
  event.preventDefault();
  if (isSending) return;

  const userText = elements.prompt.value.trim();
  if (!userText) return;

  saveSettings();
  const thinkingMode = getThinkingMode();
  const requestId = ++generationId;
  const controller = new AbortController();
  activeController = controller;

  conversation.push({ role: "user", content: userText });
  appendMessage({ role: "user", content: userText });
  elements.prompt.value = "";
  autoGrowPrompt();
  showError("");
  setSendingState(true);

  const responseView = appendMessage({ role: "assistant", mode: thinkingMode, isStreaming: true });
  let finalContent = "";
  let reasoningContent = "";
  let usage = null;
  let finishReason = null;

  try {
    await requestStream({
      signal: controller.signal,
      onChunk(chunk) {
        if (requestId !== generationId) return;

        if (chunk.reasoningContent) {
          reasoningContent += chunk.reasoningContent;
          if (responseView.reasoningText) {
            responseView.reasoningText.textContent = reasoningContent;
            responseView.reasoningStatus.textContent = "思考中";
          }
        }

        if (chunk.content) {
          finalContent += chunk.content;
          responseView.answerText.textContent = finalContent;
          responseView.answerText.classList.remove("answer-pending");
          if (responseView.reasoningStatus && reasoningContent) responseView.reasoningStatus.textContent = "已完成";
        }

        if (chunk.usage) usage = chunk.usage;
        if (chunk.finishReason) finishReason = chunk.finishReason;
        scrollMessagesToBottom();
      },
    });

    if (requestId !== generationId) return;
    if (!finalContent.trim()) throw new Error("接口没有返回最终回答。请检查模型权限、内容限制或系统提示词。");

    conversation.push({
      role: "assistant",
      content: finalContent,
      reasoning_content: reasoningContent || undefined,
    });

    responseView.answerText.textContent = finalContent;
    responseView.answerText.classList.remove("answer-pending");
    if (responseView.reasoningDetails) {
      if (reasoningContent) {
        responseView.reasoningStatus.textContent = "思考完成";
        responseView.reasoningDetails.open = false;
      } else {
        responseView.reasoningDetails.remove();
      }
    }
    if (responseView.meta) {
      responseView.meta.textContent = `${formatUsage(usage)}${finishReason && finishReason !== "stop" ? ` · ${finishReason}` : ""}`;
    }
  } catch (error) {
    if (requestId !== generationId) return;

    const wasAborted = error?.name === "AbortError";
    const hasPartialOutput = Boolean(finalContent || reasoningContent);
    conversation.pop();

    if (hasPartialOutput) {
      if (responseView.reasoningStatus) responseView.reasoningStatus.textContent = wasAborted ? "已停止" : "中断";
      if (responseView.reasoningDetails && reasoningContent) responseView.reasoningDetails.open = false;
      if (!finalContent) {
        responseView.answerText.textContent = wasAborted ? "已停止生成。" : "生成中断。";
        responseView.answerText.classList.remove("answer-pending");
      }
    } else {
      responseView.article.remove();
    }

    showError(wasAborted ? "已停止生成。上一条消息已放回输入框，可以修改后重试。" : error instanceof Error ? error.message : "请求失败，请稍后再试。");
    elements.prompt.value = userText;
    autoGrowPrompt();
  } finally {
    if (requestId === generationId) {
      activeController = null;
      setSendingState(false);
      elements.prompt.focus();
    }
  }
}

elements.toggleKey.addEventListener("click", () => {
  const isHidden = elements.apiKey.type === "password";
  elements.apiKey.type = isHidden ? "text" : "password";
  elements.toggleKey.textContent = isHidden ? "隐藏" : "显示";
});

elements.apiKey.addEventListener("input", updateConnectionStatus);
elements.thinkingModes.forEach((input) => input.addEventListener("change", updateConnectionStatus));
elements.saveSettings.addEventListener("click", saveSettings);
elements.clearKey.addEventListener("click", () => {
  sessionStorage.removeItem(STORAGE_KEYS.apiKey);
  elements.apiKey.value = "";
  updateConnectionStatus();
});
elements.clearChat.addEventListener("click", clearConversation);
elements.stopButton.addEventListener("click", () => activeController?.abort());
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
