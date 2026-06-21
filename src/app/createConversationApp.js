import { streamCompletion } from "../api/deepseek.js";
import { MODE_LABELS } from "../config/constants.js";
import { createConversationStore } from "../features/conversations/conversationStore.js";
import { renderHistorySidebar } from "../features/conversations/historySidebar.js";
import { clearStoredApiKey, loadSettings, persistSettings, validateSettings } from "../state/settings.js";
import { renderShell } from "../ui/layout.js";
import { finalizeStreamingMessage, renderConversation, renderMessage, scrollToEnd, updateStreamingMessage } from "../ui/messages.js";

function compactModelName(model) {
  return model === "deepseek-v4-pro" ? "V4 Pro" : "V4";
}

export function createConversationApp(root) {
  const ui = renderShell(root);
  const conversations = createConversationStore();
  let settings = loadSettings();
  let controller = null;
  let requestId = 0;

  function cancelActiveRequest() {
    requestId += 1;
    controller?.abort();
    controller = null;
    setSending(false);
  }

  function updatePill() {
    ui.modelPillText.textContent = `${compactModelName(settings.model)} · ${MODE_LABELS[settings.thinkingMode]}`;
  }

  function syncEmpty() {
    ui.emptyState.classList.toggle("is-hidden", conversations.activeConversation.messages.length > 0);
  }

  function showError(message = "") {
    ui.error.textContent = message;
  }

  function setSending(active) {
    ui.sendButton.hidden = active;
    ui.sendButton.disabled = active;
    ui.stopButton.hidden = !active;
    ui.composer.classList.toggle("is-sending", active);
  }

  function openDrawer() {
    ui.shell.classList.add("drawer-open");
    ui.historyDrawer.setAttribute("aria-hidden", "false");
    ui.drawerBackdrop.hidden = false;
  }

  function closeDrawer() {
    ui.shell.classList.remove("drawer-open");
    ui.historyDrawer.setAttribute("aria-hidden", "true");
    ui.drawerBackdrop.hidden = true;
  }

  function openSheet() {
    closeDrawer();
    ui.sheet.setAttribute("aria-hidden", "false");
    ui.sheet.classList.add("is-open");
    ui.backdrop.hidden = false;
  }

  function closeSheet() {
    ui.sheet.setAttribute("aria-hidden", "true");
    ui.sheet.classList.remove("is-open");
    ui.backdrop.hidden = true;
  }

  function readForm() {
    return {
      apiKey: ui.apiKey.value,
      endpoint: ui.endpoint.value,
      model: ui.model.value,
      thinkingMode: ui.modes.find((mode) => mode.checked)?.value || "high",
      systemPrompt: ui.systemPrompt.value,
    };
  }

  function fillForm() {
    ui.apiKey.value = settings.apiKey;
    ui.endpoint.value = settings.endpoint;
    ui.model.value = settings.model;
    ui.systemPrompt.value = settings.systemPrompt;
    const selected = ui.modes.find((mode) => mode.value === settings.thinkingMode);
    if (selected) selected.checked = true;
  }

  function saveForm() {
    settings = readForm();
    persistSettings(settings);
    updatePill();
    showError();
  }

  function renderCurrentConversation() {
    const conversation = conversations.activeConversation;
    renderConversation(ui.messages, conversation.messages);
    syncEmpty();
    refreshHistory();
  }

  function refreshHistory() {
    renderHistorySidebar(ui.historyList, conversations.list(), conversations.activeId, {
      onSelect(id) {
        cancelActiveRequest();
        conversations.select(id);
        renderCurrentConversation();
        closeDrawer();
      },
      onDelete(id) {
        cancelActiveRequest();
        conversations.remove(id);
        renderCurrentConversation();
      },
    });
  }

  function startNewConversation() {
    cancelActiveRequest();
    conversations.create();
    renderCurrentConversation();
    closeDrawer();
    ui.prompt.focus();
  }

  function clearCurrentConversation() {
    cancelActiveRequest();
    conversations.remove(conversations.activeId);
    renderCurrentConversation();
    showError();
    ui.prompt.focus();
  }

  function autoGrow() {
    ui.prompt.style.height = "auto";
    ui.prompt.style.height = `${Math.min(ui.prompt.scrollHeight, 128)}px`;
  }

  async function send(event) {
    event.preventDefault();
    if (controller) return;

    const prompt = ui.prompt.value.trim();
    if (!prompt) return;

    saveForm();
    const problem = validateSettings(settings);
    if (problem) {
      showError(problem);
      openSheet();
      return;
    }

    const id = ++requestId;
    controller = new AbortController();
    conversations.append("user", prompt);
    refreshHistory();
    syncEmpty();
    renderMessage(ui.messages, { role: "user", content: prompt });
    ui.prompt.value = "";
    autoGrow();
    showError();
    setSending(true);

    const assistantView = renderMessage(ui.messages, {
      role: "assistant",
      mode: settings.thinkingMode,
      isStreaming: true,
    });
    let finalContent = "";
    let reasoningContent = "";

    try {
      await streamCompletion({
        settings,
        history: conversations.activeConversation.messages,
        signal: controller.signal,
        onDelta(delta) {
          if (id !== requestId) return;
          finalContent += delta.content;
          reasoningContent += delta.reasoningContent;
          updateStreamingMessage(assistantView, delta);
          scrollToEnd(ui.messages);
        },
      });

      if (id !== requestId) return;
      if (!finalContent.trim()) throw new Error("接口没有返回最终回答。请检查模型权限、内容限制或系统提示词。");

      const hasReasoning = reasoningContent.trim().length > 0;
      conversations.append("assistant", finalContent, {
        reasoningContent: hasReasoning ? reasoningContent : "",
        thinkingMode: settings.thinkingMode,
      });
      finalizeStreamingMessage(assistantView, { hasReasoning });
      refreshHistory();
    } catch (error) {
      if (id !== requestId) return;
      const stopped = error?.name === "AbortError";
      const hasReasoning = reasoningContent.trim().length > 0;
      conversations.removeLast();

      if (finalContent || hasReasoning) {
        finalizeStreamingMessage(assistantView, { hasReasoning });
        if (!finalContent) assistantView.answer.textContent = stopped ? "已停止生成。" : "生成中断。";
      } else {
        assistantView.article.remove();
      }

      syncEmpty();
      refreshHistory();
      ui.prompt.value = prompt;
      autoGrow();
      showError(stopped ? "已停止生成。上一条消息已放回输入框，可以修改后重试。" : error instanceof Error ? error.message : "请求失败，请稍后再试。");
    } finally {
      if (id === requestId) {
        controller = null;
        setSending(false);
        ui.prompt.focus();
      }
    }
  }

  fillForm();
  updatePill();
  renderCurrentConversation();
  setSending(false);
  autoGrow();

  ui.openHistory.addEventListener("click", openDrawer);
  ui.drawerBackdrop.addEventListener("click", closeDrawer);
  ui.newChat.addEventListener("click", startNewConversation);
  ui.openSettings.addEventListener("click", openSheet);
  ui.closeSettings.addEventListener("click", closeSheet);
  ui.backdrop.addEventListener("click", closeSheet);
  ui.modelPill.addEventListener("click", openSheet);
  ui.clearChat.addEventListener("click", clearCurrentConversation);
  ui.saveSettings.addEventListener("click", () => { saveForm(); closeSheet(); });
  ui.clearKey.addEventListener("click", () => {
    clearStoredApiKey();
    ui.apiKey.value = "";
    settings.apiKey = "";
  });
  ui.toggleKey.addEventListener("click", () => {
    const hidden = ui.apiKey.type === "password";
    ui.apiKey.type = hidden ? "text" : "password";
    ui.toggleKey.textContent = hidden ? "隐藏" : "显示";
  });
  ui.model.addEventListener("change", () => { settings = readForm(); updatePill(); });
  ui.modes.forEach((mode) => mode.addEventListener("change", () => { settings = readForm(); updatePill(); }));
  ui.stopButton.addEventListener("click", () => controller?.abort());
  ui.composer.addEventListener("submit", send);
  ui.prompt.addEventListener("input", autoGrow);
  ui.prompt.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      ui.composer.requestSubmit();
    }
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeDrawer();
      closeSheet();
    }
  });
}
