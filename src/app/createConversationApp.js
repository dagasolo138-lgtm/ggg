import { streamCompletion } from "../api/deepseek.js";
import { MODE_LABELS } from "../config/constants.js";
import { createConversationStore } from "../features/conversations/conversationStore.js";
import { renderHistorySidebar } from "../features/conversations/historySidebar.js";
import { conversationAsText, copyText, downloadJson } from "../features/settings/dataExport.js";
import { buildPersonalizedSystemPrompt, createPreferencesStore } from "../features/settings/preferencesStore.js";
import { createSettingsNavigator } from "../features/settings/settingsNavigator.js";
import { createUsageStore } from "../features/usage/usageStore.js";
import { clearAllStoredSettings, clearStoredApiKey, loadSettings, persistSettings, validateSettings } from "../state/settings.js";
import { renderShell } from "../ui/layout.js";
import { finalizeStreamingMessage, renderConversation, renderMessage, scrollToEnd, updateStreamingMessage } from "../ui/messages.js";

function compactModelName(model) {
  return model === "deepseek-v4-pro" ? "V4 Pro" : "V4";
}

function sanitizeSettingsForExport(settings) {
  return {
    ...settings,
    apiKey: settings.apiKey ? "[已省略]" : "",
  };
}

export function createConversationApp(root) {
  const ui = renderShell(root);
  const conversations = createConversationStore();
  const preferences = createPreferencesStore();
  const usage = createUsageStore();
  let settings = loadSettings();
  let controller = null;
  let requestId = 0;
  let saveStatusTimer = null;
  let settingsNavigator;

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

  function showSaveStatus(message = "已自动保存") {
    ui.settingsSaveStatus.textContent = message;
    window.clearTimeout(saveStatusTimer);
    saveStatusTimer = window.setTimeout(() => {
      ui.settingsSaveStatus.textContent = "更改会自动保存到此设备";
    }, 1800);
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

  function openConnectionSheet() {
    closeDrawer();
    ui.sheet.setAttribute("aria-hidden", "false");
    ui.sheet.classList.add("is-open");
    ui.backdrop.hidden = false;
  }

  function closeConnectionSheet() {
    ui.sheet.setAttribute("aria-hidden", "true");
    ui.sheet.classList.remove("is-open");
    ui.backdrop.hidden = true;
  }

  function readForm() {
    return {
      apiKey: ui.apiKey.value,
      rememberApiKey: ui.rememberApiKey.checked,
      endpoint: ui.endpoint.value,
      model: ui.model.value,
      thinkingMode: ui.modes.find((mode) => mode.checked)?.value || "high",
      systemPrompt: ui.systemPrompt.value,
    };
  }

  function fillForm() {
    ui.apiKey.value = settings.apiKey;
    ui.rememberApiKey.checked = settings.rememberApiKey;
    ui.endpoint.value = settings.endpoint;
    ui.model.value = settings.model;
    ui.systemPrompt.value = settings.systemPrompt;
    const selected = ui.modes.find((mode) => mode.value === settings.thinkingMode);
    if (selected) selected.checked = true;
  }

  function saveForm({ announce = false } = {}) {
    settings = readForm();
    persistSettings(settings);
    updatePill();
    if (announce) showSaveStatus();
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

  function notifyCompletion(content) {
    const enabled = preferences.snapshot.notifications.chatComplete;
    if (!enabled || !document.hidden || typeof Notification === "undefined" || Notification.permission !== "granted") return;
    new Notification("bin returns!", { body: content.slice(0, 110) || "回复已完成" });
  }

  function exportCurrentConversation() {
    const conversation = conversations.activeConversation;
    const date = new Date().toISOString().slice(0, 10);
    downloadJson(`bin-对话-${date}.json`, conversation);
  }

  async function copyCurrentConversation() {
    const conversation = conversations.activeConversation;
    if (!conversation.messages.length) {
      window.alert("当前对话还没有消息。");
      return;
    }
    try {
      await copyText(conversationAsText(conversation));
      window.alert("当前对话已复制。");
    } catch {
      window.alert("复制失败，请使用“下载当前对话”。");
    }
  }

  function exportAllLocalData() {
    const date = new Date().toISOString().slice(0, 10);
    downloadJson(`bin-本地数据-${date}.json`, {
      exportedAt: new Date().toISOString(),
      conversations: conversations.list(),
      settings: sanitizeSettingsForExport(settings),
      preferences: preferences.snapshot,
      usage: usage.snapshot,
    });
  }

  function deleteAllLocalData() {
    cancelActiveRequest();
    clearAllStoredSettings();
    conversations.clearAll();
    preferences.clear();
    usage.clear();
    settings = loadSettings();
    fillForm();
    renderCurrentConversation();
    updatePill();
    showError();
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
      openConnectionSheet();
      return;
    }

    const requestSettings = {
      ...settings,
      systemPrompt: buildPersonalizedSystemPrompt(settings.systemPrompt, preferences.snapshot.profile),
    };

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
    let requestUsage = null;

    try {
      await streamCompletion({
        settings: requestSettings,
        history: conversations.activeConversation.messages,
        signal: controller.signal,
        onDelta(delta) {
          if (id !== requestId) return;
          finalContent += delta.content;
          reasoningContent += delta.reasoningContent;
          if (delta.usage) requestUsage = delta.usage;
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
      usage.record(requestUsage);
      finalizeStreamingMessage(assistantView, { hasReasoning });
      refreshHistory();
      notifyCompletion(finalContent);
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

  settingsNavigator = createSettingsNavigator({
    ui,
    preferences,
    usage,
    getConversationSnapshot: () => conversations.activeConversation,
    getConversationCount: () => conversations.list().length,
    onOpenConnection: () => {
      settingsNavigator.close();
      openConnectionSheet();
    },
    onDeleteAllLocalData: deleteAllLocalData,
    onExportAllData: exportAllLocalData,
    onExportCurrentConversation: exportCurrentConversation,
    onCopyCurrentConversation: copyCurrentConversation,
    onNotificationPreferenceChange: () => {},
  });

  fillForm();
  updatePill();
  renderCurrentConversation();
  setSending(false);
  autoGrow();

  const autoSave = () => saveForm({ announce: true });
  ui.apiKey.addEventListener("input", autoSave);
  ui.rememberApiKey.addEventListener("change", autoSave);
  ui.endpoint.addEventListener("input", autoSave);
  ui.systemPrompt.addEventListener("input", autoSave);
  ui.model.addEventListener("change", autoSave);
  ui.modes.forEach((mode) => mode.addEventListener("change", autoSave));

  ui.openHistory.addEventListener("click", openDrawer);
  ui.drawerBackdrop.addEventListener("click", closeDrawer);
  ui.newChat.addEventListener("click", startNewConversation);
  ui.openSettingsHub.addEventListener("click", () => settingsNavigator.open());
  ui.closeSettings.addEventListener("click", closeConnectionSheet);
  ui.backdrop.addEventListener("click", closeConnectionSheet);
  ui.modelPill.addEventListener("click", openConnectionSheet);
  ui.clearChat.addEventListener("click", clearCurrentConversation);
  ui.saveSettings.addEventListener("click", () => {
    saveForm();
    showSaveStatus("已保存");
    closeConnectionSheet();
  });
  ui.clearKey.addEventListener("click", () => {
    clearStoredApiKey();
    ui.apiKey.value = "";
    settings.apiKey = "";
    showSaveStatus("已清除 API Key");
  });
  ui.toggleKey.addEventListener("click", () => {
    const hidden = ui.apiKey.type === "password";
    ui.apiKey.type = hidden ? "text" : "password";
    ui.toggleKey.textContent = hidden ? "隐藏" : "显示";
  });
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
      closeConnectionSheet();
      settingsNavigator.close();
    }
  });
}
