const STORAGE_KEY = "bin-conversations-v1";
const MAX_TITLE_LENGTH = 22;

function createId() {
  if (typeof crypto?.randomUUID === "function") return crypto.randomUUID();
  return `conversation-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function createConversation() {
  const now = Date.now();
  return {
    id: createId(),
    title: "新对话",
    createdAt: now,
    updatedAt: now,
    messages: [],
  };
}

function normalizeConversation(value) {
  if (!value || typeof value !== "object" || !Array.isArray(value.messages)) return null;
  return {
    id: typeof value.id === "string" ? value.id : createId(),
    title: typeof value.title === "string" && value.title.trim() ? value.title : "新对话",
    createdAt: Number.isFinite(value.createdAt) ? value.createdAt : Date.now(),
    updatedAt: Number.isFinite(value.updatedAt) ? value.updatedAt : Date.now(),
    messages: value.messages
      .filter((message) => message && typeof message.role === "string" && typeof message.content === "string")
      .map((message) => ({
        role: message.role,
        content: message.content,
        reasoningContent: typeof message.reasoningContent === "string" ? message.reasoningContent : "",
        thinkingMode: typeof message.thinkingMode === "string" ? message.thinkingMode : "disabled",
      })),
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const first = createConversation();
      return { activeId: first.id, conversations: [first] };
    }

    const parsed = JSON.parse(raw);
    const conversations = Array.isArray(parsed?.conversations)
      ? parsed.conversations.map(normalizeConversation).filter(Boolean)
      : [];

    if (!conversations.length) {
      const first = createConversation();
      return { activeId: first.id, conversations: [first] };
    }

    const activeId = conversations.some((conversation) => conversation.id === parsed.activeId)
      ? parsed.activeId
      : conversations[0].id;
    return { activeId, conversations };
  } catch {
    const first = createConversation();
    return { activeId: first.id, conversations: [first] };
  }
}

function buildTitle(content) {
  const compact = content.replace(/\s+/g, " ").trim();
  if (!compact) return "新对话";
  return compact.length > MAX_TITLE_LENGTH ? `${compact.slice(0, MAX_TITLE_LENGTH)}…` : compact;
}

export function createConversationStore() {
  let state = loadState();

  function persist() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function active() {
    return state.conversations.find((conversation) => conversation.id === state.activeId) || state.conversations[0];
  }

  function touch(conversation) {
    conversation.updatedAt = Date.now();
  }

  function ordered() {
    return [...state.conversations].sort((a, b) => b.updatedAt - a.updatedAt);
  }

  function snapshot(conversation) {
    return {
      ...conversation,
      messages: conversation.messages.map((message) => ({ ...message })),
    };
  }

  return {
    get activeId() {
      return state.activeId;
    },

    get activeConversation() {
      return snapshot(active());
    },

    list() {
      return ordered().map(snapshot);
    },

    select(id) {
      if (!state.conversations.some((conversation) => conversation.id === id)) return this.activeConversation;
      state.activeId = id;
      persist();
      return this.activeConversation;
    },

    create() {
      const conversation = createConversation();
      state.conversations.push(conversation);
      state.activeId = conversation.id;
      persist();
      return snapshot(conversation);
    },

    remove(id) {
      const index = state.conversations.findIndex((conversation) => conversation.id === id);
      if (index === -1) return this.activeConversation;

      state.conversations.splice(index, 1);
      if (!state.conversations.length) {
        const conversation = createConversation();
        state.conversations.push(conversation);
        state.activeId = conversation.id;
      } else if (state.activeId === id) {
        state.activeId = ordered()[0].id;
      }

      persist();
      return this.activeConversation;
    },

    clearAll() {
      const first = createConversation();
      state = { activeId: first.id, conversations: [first] };
      persist();
      return this.activeConversation;
    },

    append(role, content, extras = {}) {
      const conversation = active();
      conversation.messages.push({
        role,
        content,
        reasoningContent: extras.reasoningContent || "",
        thinkingMode: extras.thinkingMode || "disabled",
      });
      if (role === "user" && conversation.messages.filter((message) => message.role === "user").length === 1) {
        conversation.title = buildTitle(content);
      }
      touch(conversation);
      persist();
      return snapshot(conversation);
    },

    removeLast() {
      const conversation = active();
      conversation.messages.pop();
      touch(conversation);
      persist();
      return snapshot(conversation);
    },
  };
}
