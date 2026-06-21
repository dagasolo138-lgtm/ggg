function formatSize(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function renderAttachmentTray(container, attachments, onRemove) {
  container.replaceChildren();
  container.hidden = attachments.length === 0;

  attachments.forEach((attachment) => {
    const item = document.createElement("div");
    item.className = `attachment-chip attachment-${attachment.kind}`;

    if (attachment.kind === "image" && attachment.objectUrl) {
      const image = document.createElement("img");
      image.src = attachment.objectUrl;
      image.alt = attachment.name;
      image.className = "attachment-preview";
      item.append(image);
    } else {
      const fileMark = document.createElement("span");
      fileMark.className = "attachment-file-mark";
      fileMark.textContent = "文";
      item.append(fileMark);
    }

    const copy = document.createElement("span");
    copy.className = "attachment-copy";
    const name = document.createElement("strong");
    name.textContent = attachment.name;
    const meta = document.createElement("small");
    meta.textContent = `${formatSize(attachment.size)} · ${attachment.status}`;
    copy.append(name, meta);

    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "attachment-remove";
    remove.textContent = "×";
    remove.setAttribute("aria-label", `移除 ${attachment.name}`);
    remove.addEventListener("click", () => onRemove(attachment.id));

    item.append(copy, remove);
    container.append(item);
  });
}

export function renderMessageAttachments(container, attachments = []) {
  if (!attachments.length) return;
  const wrap = document.createElement("div");
  wrap.className = "message-attachments";

  attachments.forEach((attachment) => {
    const item = document.createElement("span");
    item.className = "message-attachment";
    const state = attachment.kind === "image" ? "图片未发送" : "文本附件";
    item.textContent = `${state} · ${attachment.name}`;
    wrap.append(item);
  });

  container.append(wrap);
}
