const TYPE_CONFIG = {
  html: { label: "HTML 网页", extension: "html", mime: "text/html;charset=utf-8" },
  svg: { label: "SVG 图形", extension: "svg", mime: "image/svg+xml;charset=utf-8" },
  markdown: { label: "Markdown 文档", extension: "md", mime: "text/markdown;charset=utf-8" },
  json: { label: "JSON 数据", extension: "json", mime: "application/json;charset=utf-8" },
};

function normalizeLanguage(language = "") {
  return language.trim().toLowerCase().replace(/^artifact-/, "");
}

function hash(value) {
  let result = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 16777619);
  }
  return (result >>> 0).toString(36);
}

function inferType(language, content) {
  const normalized = normalizeLanguage(language);
  if (["html", "htm"].includes(normalized)) return "html";
  if (normalized === "svg") return "svg";
  if (["md", "markdown"].includes(normalized)) return "markdown";
  if (normalized === "json") return "json";

  const trimmed = content.trim().toLowerCase();
  if (trimmed.startsWith("<svg")) return "svg";
  if (trimmed.startsWith("<!doctype html") || trimmed.startsWith("<html")) return "html";
  return null;
}

function cleanTitle(value, fallback) {
  const compact = value.replace(/\s+/g, " ").trim();
  return compact ? compact.slice(0, 56) : fallback;
}

function inferTitle(type, content) {
  if (type === "html") {
    const title = content.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || content.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1];
    return cleanTitle(title ? title.replace(/<[^>]+>/g, "") : "HTML 网页", "HTML 网页");
  }
  if (type === "svg") return "SVG 图形";
  if (type === "json") return "JSON 数据";

  const heading = content.match(/^#{1,3}\s+(.+)$/m)?.[1];
  return cleanTitle(heading || "Markdown 文档", "Markdown 文档");
}

export function getArtifactTypeConfig(type) {
  return TYPE_CONFIG[type] || TYPE_CONFIG.markdown;
}

export function extractArtifactCandidates(content) {
  if (typeof content !== "string" || !content.trim()) return [];

  const candidates = [];
  const seen = new Set();
  const fencePattern = /```([^\n`]*)\n([\s\S]*?)```/g;
  let match;

  while ((match = fencePattern.exec(content)) !== null) {
    const language = match[1] || "";
    const source = match[2].trim();
    const type = inferType(language, source);
    if (!type || source.length < 20) continue;

    const sourceKey = `${type}-${hash(source)}`;
    if (seen.has(sourceKey)) continue;
    seen.add(sourceKey);

    candidates.push({
      id: `candidate-${sourceKey}`,
      sourceKey,
      type,
      title: inferTitle(type, source),
      content: source,
    });

    if (candidates.length >= 4) break;
  }

  return candidates;
}
