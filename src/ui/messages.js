import { MODE_LABELS } from "../config/constants.js";

function formatUsage(usage) {
  if (!usage?.total_tokens) return "";
  const reasoning = usage?.completion_tokens_details?.reasoning_tokens;
  return reasoning ? `本次 ${usage.total_tokens} tokens · 思考 ${reasoning} tokens` : `本次 ${usage.total_tokens} tokens`;
}

export function scrollToEnd(container) {
  container.scrollTop = container.scrollHeight;
}

export function renderMessage(container, { role, content = "", mode = "disabled", isStreaming = false }) {
  const article = document.createElement("article");
  article.className = `message ${role === "user" ? "user-message" : "assistant-message"}`;

  const avatar = document.createElement("div");
  avatar.className = "message-avatar";
  avatar.textContent = role === "user" ? "你" : "D";

  const box = document.createElement("div");
  box.className = "message-content";
  box.innerHTML = `<span class="message-role">${role === "user" ? "YOU" : "DEEPSEEK"}</span>`;

  const view = { article, answer: null, reasoning: null, reasoningStatus: null, meta: null };

  if (role === "assistant" && mode !== "disabled") {
    const details = document.createElement("details");
    details.className = "reasoning-details";
    details.open = isStreaming;
    details.innerHTML = `<summary><span>${MODE_LABELS[mode]}思考</span><small>思考中</small></summary><pre>正在思考…</pre>`;
    box.append(details);
    view.reasoning = details.querySelector("pre");
    view.reasoningStatus = details.querySelector("small");
    view.reasoningDetails = details;
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

export function updateStreamingMessage(view, { content, reasoningContent, usage, finishReason }) {
  if (reasoningContent && view.reasoning) {
    view.reasoning.textContent += reasoningContent;
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
