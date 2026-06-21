const STORAGE_KEY = "bin-app-preferences-v1";

const DEFAULT_PREFERENCES = {
  profile: {
    displayName: "Bin Huang",
    nickname: "bin",
    customInstructions: "",
  },
  notifications: {
    chatComplete: false,
  },
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function normalize(value) {
  return {
    profile: {
      displayName: typeof value?.profile?.displayName === "string" ? value.profile.displayName : DEFAULT_PREFERENCES.profile.displayName,
      nickname: typeof value?.profile?.nickname === "string" ? value.profile.nickname : DEFAULT_PREFERENCES.profile.nickname,
      customInstructions: typeof value?.profile?.customInstructions === "string" ? value.profile.customInstructions : "",
    },
    notifications: {
      chatComplete: Boolean(value?.notifications?.chatComplete),
    },
  };
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

  return {
    get snapshot() {
      return clone(preferences);
    },

    updateProfile(profile) {
      preferences.profile = {
        displayName: profile.displayName.trim() || DEFAULT_PREFERENCES.profile.displayName,
        nickname: profile.nickname.trim() || DEFAULT_PREFERENCES.profile.nickname,
        customInstructions: profile.customInstructions.trim(),
      };
      persist();
      return this.snapshot;
    },

    updateNotifications(notifications) {
      preferences.notifications = {
        chatComplete: Boolean(notifications.chatComplete),
      };
      persist();
      return this.snapshot;
    },

    clear() {
      preferences = clone(DEFAULT_PREFERENCES);
      localStorage.removeItem(STORAGE_KEY);
      return this.snapshot;
    },
  };
}

export function buildPersonalizedSystemPrompt(basePrompt, profile) {
  const sections = [basePrompt.trim()];
  const displayName = profile.displayName.trim();
  const nickname = profile.nickname.trim();
  const customInstructions = profile.customInstructions.trim();

  if (displayName) sections.push(`用户的显示名称：${displayName}。`);
  if (nickname) sections.push(`用户希望被称呼为：${nickname}。`);
  if (customInstructions) sections.push(`用户的额外回复偏好：${customInstructions}`);

  return sections.filter(Boolean).join("\n\n");
}
