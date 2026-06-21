function createDownload(filename, content, type = "application/json;charset=utf-8") {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function downloadJson(filename, payload) {
  createDownload(filename, JSON.stringify(payload, null, 2));
}

export function conversationAsText(conversation) {
  const header = `# ${conversation.title}\n\n`;
  const body = conversation.messages.map((message) => {
    const role = message.role === "user" ? "你" : "DeepSeek";
    const reasoning = message.reasoningContent ? `\n\n[思考过程]\n${message.reasoningContent}` : "";
    return `## ${role}\n${message.content}${reasoning}`;
  }).join("\n\n");
  return `${header}${body}`.trim();
}

export async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.append(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}
