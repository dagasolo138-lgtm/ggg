const STORAGE_KEY = "bin-app-preferences-v1";
const MAX_MEMORY_ITEMS = 30;
const MAX_MEMORY_TITLE_LENGTH = 60;
const MAX_MEMORY_CONTENT_LENGTH = 700;
const MAX_MEMORY_CONTEXT_CHARS = 6_000;

const DEFAULT_PREFERENCES = {
  profile: {
    displayName: "Bin Huang",
    nickname: "bin",
  },
  responseStyle: {
    language: "zh-CN",
    length: "balanced",
    directness: "direct",
    conclusionFirst: true,
    useConcreteExamples: true,
    avoidContrastPhrase: true,
    separateUncertainty: true,
    customInstructions: "",
  },
  memories: [],
  notifications: {
    chatComplete: false,
  },
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function createId() {
  if (typeof crypto?.randomUUID === "function") return crypto.randomUUID();
  return `memory-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function cleanText(value, maxLength) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function normalizeMemory(value) {
  const content = cleanText(value?.content, MAX_MEMORY_CONTENT_LENGTH);
  if (!content) return null;

  const category = ["身份", "偏好", "项目", "学习", "工作", "投资", "其他"].includes(value?.category)
    ? value.category
    : "其他";

  return {
    id: typeof value?.id === "string" && value.id ? value.id : createId(),
    category,
    title: cleanText(value?.title, MAX_MEMORY_TITLE_LENGTH) || "未命名记忆",
    content,
    enabled: value?.enabled !== false,
    createdAt: Number.isFinite(value?.createdAt) ? value.createdAt : Date.now(),
    updatedAt: Number.isFinite(value?.updatedAt) ? value.updatedAt : Date.now(),
  };
}

function normalize(value) {
  const legacyInstructions = typeof value?.profile?.customInstructions === "string" ? value.profile.customInstructions : "";
  const rawMemories = Array.isArray(value?.memories) ? value.memories : [];

  return {
    profile: {
      displayName: typeof value?.profile?.displayName === "string" ? value.profile.displayName : DEFAULT_PREFERENCES.profile.displayName,
      nickname: typeof value?.profile?.nickname === "string" ? value.profile.nickname : DEFAULT_PREFERENCES.profile.nickname,
    },
    responseStyle: {
      language: ["zh-CN", "auto", "en"].includes(value?.responseStyle?.language) ? value.responseStyle.language : DEFAULT_PREFERENCES.responseStyle.language,
      length: ["concise", "balanced", "detailed"].includes(value?.responseStyle?.length) ? value.responseStyle.length : DEFAULT_PREFERENCES.responseStyle.length,
      directness: ["direct", "neutral", "encouraging"].includes(value?.responseStyle?.directness) ? value.responseStyle.directness : DEFAULT_PREFERENCES.responseStyle.directness,
      conclusionFirst: value?.responseStyle?.conclusionFirst !== false,
      useConcreteExamples: value?.responseStyle?.useConcreteExamples !== false,
      avoidContrastPhrase: value?.responseStyle?.avoidContrastPhrase !== false,
      separateUncertainty: value?.responseStyle?.separateUncertainty !== false,
      customInstructions: typeof value?.responseStyle?.customInstructions === "string"
        ? value.responseStyle.customInstructions
        : legacyInstructions,
    },
    memories: rawMemories.map(normalizeMemory).filter(Boolean).slice(0, MAX_MEMORY_ITEMS),
    notifications: {
      chatComplete: Boolean(value?.notifications?.chatComplete),
    },
  };
}

function languageLabel(value) {
  return { "zh-CN": "中文优先", auto: "跟随用户语言", en: "英文优先" }[value] || "中文优先";
}

function lengthLabel(value) {
  return { concise: "默认简洁", balanced: "默认适中", detailed: "默认详细" }[value] || "默认适中";
}

function directnessLabel(value) {
  return { direct: "表达直接，少套话", neutral: "表达中性、平衡", encouraging: "适度鼓励，但不空泛" }[value] || "表达直接，少套话";
}

export function createPreferencesStore() {
  let preferences = clone(DEFAULT_PREFERENCES);

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) preferences = normalize(JSON.parse(raw));
  } catch {
    preferences = clone(DEFAULT_PREFERENCES);
  }

  function persist() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
  }

  function snapshot() {
    return clone(preferences);
  }

  return {
    get snapshot() {
      return snapshot();
    },

    updateProfile(profile) {
      preferences.profile = {
        displayName: cleanText(profile.displayName, 40) || DEFAULT_PREFERENCES.profile.displayName,
        nickname: cleanText(profile.nickname, 30) || DEFAULT_PREFERENCES.profile.nickname,
      };
      persist();
      return snapshot();
    },

    updateResponseStyle(style) {
      preferences.responseStyle = {
        language: ["zh-CN", "auto", "en"].includes(style.language) ? style.language : DEFAULT_PREFERENCES.responseStyle.language,
        length: ["concise", "balanced", "detailed"].includes(style.length) ? style.length : DEFAULT_PREFERENCES.responseStyle.length,
        directness: ["direct", "neutral", "encouraging"].includes(style.directness) ? style.directness : DEFAULT_PREFERENCES.responseStyle.directness,
        conclusionFirst: Boolean(style.conclusionFirst),
        useConcreteExamples: Boolean(style.useConcreteExamples),
        avoidContrastPhrase: Boolean(style.avoidContrastPhrase),
        separateUncertainty: Boolean(style.separateUncertainty),
        customInstructions: cleanText(style.customInstructions, 2_000),
      };
      persist();
      return snapshot();
    },

    addMemory(memory) {
      if (preferences.memories.length >= MAX_MEMORY_ITEMS) {
        throw new Error(`最多保存 ${MAX_MEMORY_ITEMS} 条长期记忆。`);
      }
      const item = normalizeMemory({ ...memory, id: createId(), createdAt: Date.now(), updatedAt: Date.now() });
      if (!item) throw new Error("记忆内容不能为空。");
      preferences.memories.unshift(item);
      persist();
      return snapshot();
    },

    updateMemory(id, memory) {
      const index = preferences.memories.findIndex((item) => item.id === id);
      if (index < 0) return snapshot();
      const item = normalizeMemory({
        ...preferences.memories[index],
        ...memory,
        id,
        updatedAt: Date.now(),
      });
      if (!item) throw new Error("记忆内容不能为空。");
      preferences.memories[index] = item;
      persist();
      return snapshot();
    },

    toggleMemory(id, enabled) {
      const item = preferences.memories.find((memory) => memory.id === id);
      if (!item) return snapshot();
      item.enabled = Boolean(enabled);
      item.updatedAt = Date.now();
      persist();
      return snapshot();
    },

    removeMemory(id) {
      preferences.memories = preferences.memories.filter((memory) => memory.id !== id);
      persist();
      return snapshot();
    },

    updateNotifications(notifications) {
      preferences.notifications = {
        chatComplete: Boolean(notifications.chatComplete),
      };
      persist();
      return snapshot();
    },

    clear() {
      preferences = clone(DEFAULT_PREFERENCES);
      localStorage.removeItem(STORAGE_KEY);
      return snapshot();
    },
  };
}

export function buildPersonalizedSystemPrompt(basePrompt, preferences) {
  const profile = preferences?.profile || {};
  const style = preferences?.responseStyle || {};
  const memories = Array.isArray(preferences?.memories) ? preferences.memories : [];
  const sections = [];

  if (basePrompt?.trim()) {
    sections.push(`[基础助手规则]\n${basePrompt.trim()}`);
  }

  const profileLines = [];
  if (profile.displayName?.trim()) profileLines.push(`- 显示名称：${profile.displayName.trim()}`);
  if (profile.nickname?.trim()) profileLines.push(`- 希望称呼：${profile.nickname.trim()}`);
  if (profileLines.length) {
    profileLines.unshift("以下是用户主动保存的资料。仅在相关时使用，不要据此推断未提供的事实。");
    sections.push(`[用户资料]\n${profileLines.join("\n")}`);
  }

  const styleLines = [
    `- 语言：${languageLabel(style.language)}`,
    `- 回答长度：${lengthLabel(style.length)}`,
    `- 表达风格：${directnessLabel(style.directness)}`,
  ];
  if (style.conclusionFirst) styleLines.push("- 复杂问题优先给出结论或判断，再展开说明。");
  if (style.useConcreteExamples) styleLines.push("- 优先用具体案例、数据或可执行步骤解释。");
  if (style.avoidContrastPhrase) styleLines.push("- 避免使用“不是……而是……”式的反驳句法，直接表达结论。");
  if (style.separateUncertainty) styleLines.push("- 有不确定性时，明确写出已知事实、假设与不确定部分。");
  if (style.customInstructions?.trim()) styleLines.push(`- 额外偏好：${style.customInstructions.trim()}`);
  sections.push(`[回答方式]\n${styleLines.join("\n")}`);

  let usedChars = 0;
  const memoryLines = [];
  memories
    .filter((memory) => memory.enabled)
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .forEach((memory) => {
      const line = `- [${memory.category}] ${memory.title}：${memory.content}`;
      if (usedChars + line.length > MAX_MEMORY_CONTEXT_CHARS) return;
      usedChars += line.length;
      memoryLines.push(line);
    });

  if (memoryLines.length) {
    memoryLines.unshift("以下是用户手动管理的长期记忆。只在当前问题相关时引用；不要把它们当作不可质疑的事实。");
    sections.push(`[长期记忆]\n${memoryLines.join("\n")}`);
  }

  return sections.join("\n\n");
}
