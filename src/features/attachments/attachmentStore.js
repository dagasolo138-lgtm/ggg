const TEXT_EXTENSIONS = new Set([
  "txt", "md", "markdown", "csv", "json", "log", "js", "jsx", "ts", "tsx", "py", "html", "css", "xml", "yml", "yaml", "sql", "java", "c", "cpp", "h", "sh",
]);

const MAX_FILES = 4;
const MAX_FILE_BYTES = 2 * 1024 * 1024;
const MAX_TOTAL_TEXT_CHARS = 60_000;
const MAX_FILE_TEXT_CHARS = 24_000;

function extensionOf(name) {
  const segment = name.split(".").pop();
  return segment ? segment.toLowerCase() : "";
}

function isTextFile(file) {
  return file.type.startsWith("text/") || file.type === "application/json" || TEXT_EXTENSIONS.has(extensionOf(file.name));
}

function fileId(file) {
  return `${file.name}-${file.size}-${file.lastModified}`;
}

function truncateText(text, maxLength) {
  if (text.length <= maxLength) return { text, truncated: false };
  return { text: `${text.slice(0, maxLength)}\n\n[文件内容已截断]`, truncated: true };
}

export function createAttachmentStore() {
  let attachments = [];

  function snapshot() {
    return attachments.map(({ rawText, ...attachment }) => ({ ...attachment }));
  }

  return {
    list() {
      return snapshot();
    },

    async addFiles(fileList) {
      const incoming = [...fileList];
      const warnings = [];
      const accepted = [];
      let usedTextLength = attachments.reduce((sum, item) => sum + (item.rawText?.length || 0), 0);

      for (const file of incoming) {
        if (attachments.length + accepted.length >= MAX_FILES) {
          warnings.push(`最多一次附加 ${MAX_FILES} 个文件。`);
          break;
        }
        if (file.size > MAX_FILE_BYTES) {
          warnings.push(`${file.name} 超过 2 MB，未添加。`);
          continue;
        }
        if (attachments.some((item) => item.id === fileId(file)) || accepted.some((item) => item.id === fileId(file))) {
          warnings.push(`${file.name} 已在附件列表中。`);
          continue;
        }

        if (file.type.startsWith("image/")) {
          const objectUrl = URL.createObjectURL(file);
          accepted.push({
            id: fileId(file),
            name: file.name,
            size: file.size,
            type: file.type || "image/*",
            kind: "image",
            status: "待视觉模型",
            objectUrl,
            rawText: "",
          });
          warnings.push(`${file.name} 已预览，但当前 DeepSeek V4 API 不支持图片输入，因此不会发送给模型。`);
          continue;
        }

        if (!isTextFile(file)) {
          warnings.push(`${file.name} 不是当前可读取的文本文件。支持 txt、md、csv、json 和常见代码文件。`);
          continue;
        }

        const raw = await file.text();
        const remaining = Math.max(0, MAX_TOTAL_TEXT_CHARS - usedTextLength);
        if (!remaining) {
          warnings.push(`文本附件总长度上限为 ${MAX_TOTAL_TEXT_CHARS.toLocaleString()} 个字符。`);
          break;
        }
        const limited = truncateText(raw, Math.min(MAX_FILE_TEXT_CHARS, remaining));
        usedTextLength += limited.text.length;
        accepted.push({
          id: fileId(file),
          name: file.name,
          size: file.size,
          type: file.type || "text/plain",
          kind: "text",
          status: limited.truncated ? "已截断后发送" : "会随消息发送",
          rawText: limited.text,
        });
      }

      attachments = [...attachments, ...accepted];
      return { attachments: snapshot(), warnings };
    },

    remove(id) {
      const attachment = attachments.find((item) => item.id === id);
      if (attachment?.objectUrl) URL.revokeObjectURL(attachment.objectUrl);
      attachments = attachments.filter((item) => item.id !== id);
      return snapshot();
    },

    clear() {
      attachments.forEach((attachment) => {
        if (attachment.objectUrl) URL.revokeObjectURL(attachment.objectUrl);
      });
      attachments = [];
    },

    buildTextContext() {
      const textAttachments = attachments.filter((attachment) => attachment.kind === "text" && attachment.rawText);
      if (!textAttachments.length) return "";
      const blocks = textAttachments.map((attachment) => `【附件：${attachment.name}】\n${attachment.rawText}\n【附件结束】`);
      return `\n\n以下是用户附带的文本文件，请结合文件内容回答：\n\n${blocks.join("\n\n")}`;
    },

    hasUnsupportedImages() {
      return attachments.some((attachment) => attachment.kind === "image");
    },
  };
}
