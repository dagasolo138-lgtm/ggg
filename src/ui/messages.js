import { MODE_LABELS } from "../config/constants.js";

function formatUsage(usage) {
  if (!usage?.total_tokens) return "";
  const reasoning = usage?.completion_tokens_details?.reasoning_tokens;
  return reasoning ? `本次 ${usage.total_tokens} tokens · 思考 ${reasoning} tokens` : `本次 ${usage.total_tokens} tokens`;
}

function createReasoningBlock(mode, reasoningContent, isStreaming) {
  const details = document.createElement("details");
  details.className = "reasoning-details";
  details.open = isStreaming;

  const summary = document.createElement("summary");
  const label = document.createElement("span");
  label.textContent = `${MODE_LABELS[mode] || "深度"}思考`;
  const status = document.createElement("small");
  status.textContent = isStreaming ? "思考中" : "思考过程";
  summary.append(label, status);

  const pre = document.createElement("pre");
  pre.textContent = reasoningContent || (isStreaming ? "正在思考…" : "");
  details.append(summary, pre);
  return { details, pre, status };
}

export function scrollToEnd(container) {
  container.scrollTop = container.scrollHeight;
}

export function renderMessage(container, {
  role,
  content = "",
  mode = "disabled",
  reasoningContent = "",
  isStreaming = false,
}) {
  const article = document.createElement("article");
  article.className = `message ${role === "user" ? "user-message" : "assistant-message"}`;

  const avatar = document.createElement("div");
  avatar.className = "message-avatar";
  avatar.textContent = role === "user" ? "你" : "D";

  const box = document.createElement("div");
  box.className = "message-content";

  const roleLabel = document.createElement("span");
  roleLabel.className = "message-role";
  roleLabel.textContent = role === "user" ? "YOU" : "DEEPSEEK";
  box.append(roleLabel);

  const view = { article, answer: null, reasoning: null, reasoningStatus: null, reasoningDetails: null, meta: null };

  if (role === "assistant" && (mode !== "disabled" || reasoningContent)) {
    const reasoning = createReasoningBlock(mode === "disabled" ? "high" : mode, reasoningContent, isStreaming);
    box.append(reasoning.details);
    view.reasoning = reasoning.pre;
    view.reasoningStatus = reasoning.status;
    view.reasoningDetails = reasoning.details;
  }

  const answer = document.createElement("p");
  answer.className = "answer-text";
  answer.textContent = content || (isStreaming ? (mode === "disabled" ? "正在生成…" : "等待最终回答…") : "");
  if (isStreaming && !content) answer.classList.add("answer-pending");
  box.append(answer);
  view.answer = answer;

  if (role === "assistant") {
    const meta = document.createElement("p");
    meta.className = "message-meta";
    box.append(meta);
    view.meta = meta;
  }

  article.append(avatar, box);
  container.append(article);
  scrollToEnd(container);
  return view;
}

export function renderConversation(container, messages) {
  container.replaceChildren();
  messages.forEach((message) => {
    renderMessage(container, {
      role: message.role,
      content: message.content,
      mode: message.thinkingMode || "disabled",
      reasoningContent: message.reasoningContent || "",
    });
  });
  scrollToEnd(container);
}

export function updateStreamingMessage(view, { content, reasoningContent, usage, finishReason }) {
  if (reasoningContent && view.reasoning) {
    const wasPlaceholder = view.reasoning.textContent === "正在思考…";
    view.reasoning.textContent = `${wasPlaceholder ? "" : view.reasoning.textContent}${reasoningContent}`;
    view.reasoningStatus.textContent = "思考中";
  }
  if (content) {
    view.answer.textContent += content;
    view.answer.classList.remove("answer-pending");
    if (view.reasoningStatus) view.reasoningStatus.textContent = "已完成";
  }
  if (usage && view.meta) view.meta.textContent = formatUsage(usage);
  if (finishReason && finishReason !== "stop" && view.meta) {
    view.meta.textContent = `${view.meta.textContent}${view.meta.textContent ? " · " : ""}${finishReason}`;
  }
}

export function finalizeStreamingMessage(view, { hasReasoning }) {
  view.answer.classList.remove("answer-pending");
  if (view.reasoningDetails) {
    if (hasReasoning) {
      view.reasoningStatus.textContent = "思考完成";
      view.reasoningDetails.open = false;
    } else {
      view.reasoningDetails.remove();
    }
  }
}
