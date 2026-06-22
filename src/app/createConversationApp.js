import { streamCompletion } from "../api/deepseek.js";
import { MODE_LABELS } from "../config/constants.js";
import { extractArtifactCandidates } from "../features/artifacts/artifactParser.js";
import { createArtifactStore } from "../features/artifacts/artifactStore.js";
import { createArtifactWorkspace } from "../features/artifacts/artifactWorkspace.js";
import { createAttachmentStore } from "../features/attachments/attachmentStore.js";
import { renderAttachmentTray } from "../features/attachments/attachmentView.js";
import { createConversationActions } from "../features/conversations/conversationActions.js";
import { createConversationStore } from "../features/conversations/conversationStore.js";
import { renderHistorySidebar } from "../features/conversations/historySidebar.js";
import { searchRelevantFacts, buildKnowledgeContext } from "../features/knowledge/zhishiStore.js";
import { conversationAsText, copyText, downloadJson } from "../features/settings/dataExport.js";
import { buildPersonalizedSystemPrompt, createPreferencesStore } from "../features/settings/preferencesStore.js";
import { createSettingsNavigator } from "../features/settings/settingsNavigator.js";
import { createUsageStore } from "../features/usage/usageStore.js";
import { clearAllStoredSettings, clearStoredApiKey, loadSettings, persistSettings, validateSettings } from "../state/settings.js";
import { renderShell } from "../ui/layout.js";
import { attachArtifactCandidates, finalizeStreamingMessage, renderConversation, renderMessage, scrollToEnd, updateStreamingMessage } from "../ui/messages.js";

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
  const artifacts = createArtifactStore();
  const attachments = createAttachmentStore();
  const preferences = createPreferencesStore();
  const usage = createUsageStore();
  let settings = loadSettings();
  let abortController = null;
  let activeRequest = null;
  let isSending = false;
  let requestId = 0;
  let saveStatusTimer = null;
  let settingsNavigator;
  let conversationActions;
  let artifactWorkspace;

  function persistInterruptedRequest(request) {
    if (!request) return false;
    const content = String(request.finalContent || "").trim();
    const hasReasoning = String(request.reasoningContent || "").trim().length > 0;
    if (!content && !hasReasoning) return false;

    conversations.appendTo(request.conversationId, "assistant", content || "已停止生成。", {
      reasoningContent: hasReasoning ? request.reasoningContent : "",
      thinkingMode: request.thinkingMode,
    });
    return true;
  }

  function cancelActiveRequest() {
    const request = activeRequest;
    if (request) {
      try {
        persistInterruptedRequest(request);
      } catch (error) {
        showError(error instanceof Error ? error.message : "已停止生成，但未能保存已生成内容。");
      }
    }
    requestId += 1;
    abortController?.abort();
    abortController = null;
    activeRequest = null;
    isSending = false;
    setSending(false);
  }

  function updatePill() {
    ui.modelPillText.textContent = `${compactModelName(settings.model)} · ${MODE_LABELS[settings.thinkingMode]}`;
  }

  function syncEmpty() {
    const conversation = conversations.activeConversation;
    ui.emptyState.classList.toggle("is-hidden", conversation.messages.length > 0);
    conversationActions?.sync(conversation, Boolean(abortController));
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
    ui.attachButton.disabled = active;
    ui.openHistory.disabled = active;
    ui.composer.classList.toggle("is-sending", active);
    conversationActions?.sync(conversations.activeConversation, active);
    refreshHistory();
  }

  function renderAttachments() {
    renderAttachmentTray(ui.attachmentTray, attachments.list(), (id) => {
      attachments.remove(id);
      renderAttachments();
    });
  }

  function clearAttachments() {
    attachments.clear();
    renderAttachments();
    ui.attachmentInput.value = "";
  }

  async function addAttachments(fileList) {
    try {
      const result = await attachments.addFiles(fileList);
      renderAttachments();
      showError(result.warnings.at(-1) || "");
    } catch {
      showError("读取附件失败。请确认文件没有损坏后重试。");
    }
  }

  function openDrawer() {
    conversationActions?.closeMenu();
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
    conversationActions?.closeMenu();
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

  function openArtifactCandidate(candidate) {
    artifactWorkspace?.openCandidate(candidate);
  }

  function renderCurrentConversation() {
    const conversation = conversations.activeConversation;
    renderConversation(ui.messages, conversation.messages, { onOpenArtifact: openArtifactCandidate });
    syncEmpty();
    refreshHistory();
  }

  function refreshHistory() {
    renderHistorySidebar(ui.historyList, conversations.list(), conversations.activeId, {
      onSelect(id) {
        cancelActiveRequest();
        clearAttachments();
        conversations.select(id);
        renderCurrentConversation();
        closeDrawer();
      },
      onDelete(id) {
        const conversation = conversations.list().find((item) => item.id === id);
        if (!conversation || !window.confirm(`删除“${conversation.title}”？此操作无法恢复。`)) return;

        if (id === conversations.activeId) {
          cancelActiveRequest();
          clearAttachments();
          conversations.remove(id);
          renderCurrentConversation();
          return;
        }

        conversations.remove(id);
        refreshHistory();
      },
      isSending,
    });
  }

  function startNewConversation() {
    cancelActiveRequest();
    clearAttachments();
    conversations.create();
    renderCurrentConversation();
    closeDrawer();
    ui.prompt.focus();
  }

  function clearCurrentConversation() {
    cancelActiveRequest();
    clearAttachments();
    conversations.remove(conversations.activeId);
    renderCurrentConversation();
    showError();
    ui.prompt.focus();
  }

  function renameCurrentConversation(title) {
    conversations.rename(conversations.activeId, title);
    renderCurrentConversation();
  }

  function toggleCurrentConversationStar() {
    conversations.toggleStar(conversations.activeId);
    renderCurrentConversation();
  }

  async function shareCurrentConversation() {
    const conversation = conversations.activeConversation;
    if (!conversation.messages.length) return;
    const text = conversationAsText(conversation);

    if (navigator.share) {
      try {
        await navigator.share({ title: conversation.title, text });
        return;
      } catch (error) {
        if (error?.name === "AbortError") return;
      }
    }

    try {
      await copyText(text);
      window.alert("当前对话已复制，可直接粘贴分享。");
    } catch {
      window.alert("分享不可用。请使用设置中的“下载当前对话”。");
    }
  }

  function deleteCurrentConversation() {
    const conversation = conversations.activeConversation;
    if (!conversation.messages.length) return;
    if (!window.confirm(`删除“${conversation.title}”？此操作无法恢复。`)) return;
    clearCurrentConversation();
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
      artifacts: artifacts.list(),
      settings: sanitizeSettingsForExport(settings),
      preferences: preferences.snapshot,
      usage: usage.snapshot,
    });
  }

  function deleteAllLocalData() {
    cancelActiveRequest();
    clearAttachments();
    artifactWorkspace?.close();
    clearAllStoredSettings();
    conversations.clearAll();
    artifacts.clear();
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
    if (isSending) return;

    isSending = true;
    setSending(true);

    const selectedAttachments = attachments.list();
    const hasTextAttachment = selectedAttachments.some((attachment) => attachment.kind === "text");
    const typedPrompt = ui.prompt.value.trim();
    const prompt = typedPrompt || (hasTextAttachment ? "请分析我附带的文件。" : "");

    if (!prompt) {
      isSending = false;
      setSending(false);
      return;
    }
    if (attachments.hasUnsupportedImages()) {
      showError("当前 DeepSeek V4 API 不支持图片输入。请移除图片，或等待接入视觉模型后再发送。");
      isSending = false;
      setSending(false);
      return;
    }

    saveForm();
    const problem = validateSettings(settings);
    if (problem) {
      showError(problem);
      openConnectionSheet();
      isSending = false;
      setSending(false);
      return;
    }

    const controller = new AbortController();
    abortController = controller;
    activeRequest = controller;

    const attachmentContext = attachments.buildTextContext();
    const currentPreferences = preferences.snapshot;
    let knowledgeContext = "";
    try {
      if (currentPreferences.zhishi?.enabled) {
        const facts = await searchRelevantFacts(prompt, controller.signal);
        knowledgeContext = buildKnowledgeContext(facts);
      }
    } catch (error) {
      showError(error instanceof Error ? error.message : "知识库检索失败，请稍后再试。");
      isSending = false;
      setSending(false);
      return;
    }
    if (controller.signal.aborted) {
      isSending = false;
      setSending(false);
      return;
    }

    const requestController = controller;
    const requestSettings = {
      ...settings,
      systemPrompt: buildPersonalizedSystemPrompt(settings.systemPrompt, currentPreferences),
    };
    const apiPrompt = `${prompt}${attachmentContext}`;
    const id = ++requestId;
    const conversationId = conversations.activeId;

    try {
      conversations.appendTo(conversationId, "user", prompt, {
        apiContent: apiPrompt,
        attachments: selectedAttachments,
      });
    } catch (error) {
      showError(error instanceof Error ? error.message : "无法保存当前消息。");
      isSending = false;
      setSending(false);
      return;
    }

    const request = {
      id,
      conversationId,
      thinkingMode: settings.thinkingMode,
      finalContent: "",
      reasoningContent: "",
      requestUsage: null,
    };
    abortController = requestController;
    activeRequest = request;

    refreshHistory();
    syncEmpty();
    renderMessage(ui.messages, { role: "user", content: prompt, attachments: selectedAttachments });
    ui.prompt.value = "";
    autoGrow();
    showError();

    const assistantView = renderMessage(ui.messages, {
      role: "assistant",
      mode: settings.thinkingMode,
      isStreaming: true,
    });

    try {
      await streamCompletion({
        settings: requestSettings,
        history: conversations.activeConversation.messages,
        knowledgeContext,
        signal: requestController.signal,
        onDelta(delta) {
          if (id !== requestId || activeRequest !== request) return;
          request.finalContent += delta.content;
          request.reasoningContent += delta.reasoningContent;
          if (delta.usage) request.requestUsage = delta.usage;
          updateStreamingMessage(assistantView, delta);
          scrollToEnd(ui.messages);
        },
      });

      if (id !== requestId || activeRequest !== request) return;
      if (!request.finalContent.trim()) throw new Error("接口没有返回最终回答。请检查模型权限、内容限制或系统提示词。");

      const hasReasoning = request.reasoningContent.trim().length > 0;
      conversations.appendTo(conversationId, "assistant", request.finalContent, {
        reasoningContent: hasReasoning ? request.reasoningContent : "",
        thinkingMode: request.thinkingMode,
      });
      try {
        usage.record(request.requestUsage);
      } catch {
        showError("回答已完成，但本机用量统计未保存。");
      }
      finalizeStreamingMessage(assistantView, { hasReasoning });
      attachArtifactCandidates(assistantView, extractArtifactCandidates(request.finalContent), openArtifactCandidate);
      clearAttachments();
      refreshHistory();
      notifyCompletion(request.finalContent);
    } catch (error) {
      if (id !== requestId || activeRequest !== request) return;
      const stopped = error?.name === "AbortError";
      const hasReasoning = request.reasoningContent.trim().length > 0;
      const hasPartialOutput = Boolean(request.finalContent || hasReasoning);

      if (hasPartialOutput) {
        conversations.appendTo(conversationId, "assistant", request.finalContent || (stopped ? "已停止生成。" : "生成中断。"), {
          reasoningContent: hasReasoning ? request.reasoningContent : "",
          thinkingMode: request.thinkingMode,
        });
        finalizeStreamingMessage(assistantView, { hasReasoning });
        if (!request.finalContent) assistantView.answer.textContent = stopped ? "已停止生成。" : "生成中断。";
        if (request.finalContent) attachArtifactCandidates(assistantView, extractArtifactCandidates(request.finalContent), openArtifactCandidate);
        clearAttachments();
      } else {
        conversations.removeLastFrom(conversationId);
        assistantView.article.remove();
        ui.prompt.value = prompt;
        autoGrow();
      }

      syncEmpty();
      refreshHistory();
      showError(
        stopped
          ? (hasPartialOutput ? "已停止生成，已保留已生成内容。" : "已停止生成。上一条消息已放回输入框，可以修改后重试。")
          : error instanceof Error
            ? (hasPartialOutput ? `${error.message} 已保留已生成内容。` : error.message)
            : "请求失败，请稍后再试。",
      );
    } finally {
      if (id === requestId && activeRequest === request) {
        abortController = null;
        activeRequest = null;
        isSending = false;
        setSending(false);
        ui.prompt.focus();
      }
    }
  }

  artifactWorkspace = createArtifactWorkspace({
    ui,
    store: artifacts,
    getConversationId: () => conversations.activeId,
    onError: showError,
  });

  conversationActions = createConversationActions({
    ui,
    getConversation: () => conversations.activeConversation,
    onNewConversation: startNewConversation,
    onShare: shareCurrentConversation,
    onToggleStar: toggleCurrentConversationStar,
    onRename: renameCurrentConversation,
    onDelete: deleteCurrentConversation,
  });

  settingsNavigator = createSettingsNavigator({
    ui,
    preferences,
    usage,
    getSystemPrompt: () => settings.systemPrompt,
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
  renderAttachments();
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
  ui.attachButton.addEventListener("click", () => ui.attachmentInput.click());
  ui.attachmentInput.addEventListener("change", async (event) => {
    if (event.target.files?.length) await addAttachments(event.target.files);
    event.target.value = "";
  });
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
  ui.stopButton.addEventListener("click", () => abortController?.abort());
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
      artifactWorkspace.close();
      conversationActions.closeMenu();
      conversationActions.closeRenameDialog();
    }
  });
}
