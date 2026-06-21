const STORAGE_KEY = "bin-artifacts-v1";
const MAX_ARTIFACTS = 36;
const MAX_VERSIONS_PER_ARTIFACT = 24;
const MAX_ARTIFACT_CHARS = 160_000;
const SUPPORTED_TYPES = new Set(["html", "svg", "markdown", "json"]);

function createId(prefix) {
  if (typeof crypto?.randomUUID === "function") return `${prefix}-${crypto.randomUUID()}`;
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function normalizeType(type) {
  return SUPPORTED_TYPES.has(type) ? type : "markdown";
}

function cleanTitle(value, fallback = "未命名作品") {
  const title = typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, 80) : "";
  return title || fallback;
}

function cleanContent(value) {
  if (typeof value !== "string") return "";
  return value.slice(0, MAX_ARTIFACT_CHARS);
}

function normalizeVersion(value) {
  const content = cleanContent(value?.content);
  if (!content) return null;
  return {
    id: typeof value?.id === "string" && value.id ? value.id : createId("version"),
    label: cleanTitle(value?.label, "版本"),
    content,
    createdAt: Number.isFinite(value?.createdAt) ? value.createdAt : Date.now(),
  };
}

function normalizeArtifact(value) {
  if (!value || typeof value !== "object") return null;
  const versions = Array.isArray(value.versions) ? value.versions.map(normalizeVersion).filter(Boolean) : [];
  if (!versions.length) return null;
  const activeVersionId = versions.some((version) => version.id === value.activeVersionId)
    ? value.activeVersionId
    : versions[versions.length - 1].id;

  return {
    id: typeof value.id === "string" && value.id ? value.id : createId("artifact"),
    title: cleanTitle(value.title),
    type: normalizeType(value.type),
    sourceKey: typeof value.sourceKey === "string" ? value.sourceKey : "",
    conversationId: typeof value.conversationId === "string" ? value.conversationId : "",
    createdAt: Number.isFinite(value.createdAt) ? value.createdAt : Date.now(),
    updatedAt: Number.isFinite(value.updatedAt) ? value.updatedAt : Date.now(),
    activeVersionId,
    versions: versions.slice(-MAX_VERSIONS_PER_ARTIFACT),
  };
}

function loadArtifacts() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(normalizeArtifact).filter(Boolean).slice(0, MAX_ARTIFACTS) : [];
  } catch {
    return [];
  }
}

export function getActiveArtifactVersion(artifact) {
  if (!artifact) return null;
  return artifact.versions.find((version) => version.id === artifact.activeVersionId) || artifact.versions.at(-1) || null;
}

export function createArtifactStore() {
  let artifacts = loadArtifacts();

  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(artifacts));
    } catch {
      throw new Error("作品库空间不足，无法保存。请删除不再需要的 Artifact 后重试。");
    }
  }

  function snapshot(artifact) {
    return clone(artifact);
  }

  function find(id) {
    return artifacts.find((artifact) => artifact.id === id) || null;
  }

  function touch(artifact) {
    artifact.updatedAt = Date.now();
  }

  return {
    list() {
      return artifacts
        .slice()
        .sort((left, right) => right.updatedAt - left.updatedAt)
        .map(snapshot);
    },

    get(id) {
      const artifact = find(id);
      return artifact ? snapshot(artifact) : null;
    },

    createFromCandidate(candidate, conversationId = "") {
      const existing = artifacts.find((artifact) => artifact.sourceKey === candidate.sourceKey && artifact.conversationId === conversationId);
      if (existing) return snapshot(existing);
      if (artifacts.length >= MAX_ARTIFACTS) {
        throw new Error(`作品库最多保存 ${MAX_ARTIFACTS} 个 Artifact。`);
      }

      const content = cleanContent(candidate.content);
      if (!content) throw new Error("Artifact 内容为空，无法创建。");
      const now = Date.now();
      const version = {
        id: createId("version"),
        label: "初始版本",
        content,
        createdAt: now,
      };
      const artifact = {
        id: createId("artifact"),
        title: cleanTitle(candidate.title),
        type: normalizeType(candidate.type),
        sourceKey: candidate.sourceKey || "",
        conversationId,
        createdAt: now,
        updatedAt: now,
        activeVersionId: version.id,
        versions: [version],
      };
      artifacts.unshift(artifact);
      persist();
      return snapshot(artifact);
    },

    rename(id, title) {
      const artifact = find(id);
      if (!artifact) return null;
      artifact.title = cleanTitle(title, artifact.title);
      touch(artifact);
      persist();
      return snapshot(artifact);
    },

    selectVersion(id, versionId) {
      const artifact = find(id);
      if (!artifact || !artifact.versions.some((version) => version.id === versionId)) return null;
      artifact.activeVersionId = versionId;
      touch(artifact);
      persist();
      return snapshot(artifact);
    },

    addVersion(id, content, label = "手动修改") {
      const artifact = find(id);
      const nextContent = cleanContent(content);
      if (!artifact || !nextContent) throw new Error("作品内容不能为空。");

      const current = getActiveArtifactVersion(artifact);
      if (current?.content === nextContent) return snapshot(artifact);

      const version = {
        id: createId("version"),
        label: cleanTitle(label, "手动修改"),
        content: nextContent,
        createdAt: Date.now(),
      };
      artifact.versions.push(version);
      artifact.versions = artifact.versions.slice(-MAX_VERSIONS_PER_ARTIFACT);
      artifact.activeVersionId = version.id;
      touch(artifact);
      persist();
      return snapshot(artifact);
    },

    remove(id) {
      artifacts = artifacts.filter((artifact) => artifact.id !== id);
      persist();
    },

    clear() {
      artifacts = [];
      localStorage.removeItem(STORAGE_KEY);
    },
  };
}
