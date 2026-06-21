export const STORAGE_KEYS = {
  apiKey: "bin-deepseek-api-key",
  rememberApiKey: "bin-deepseek-remember-api-key",
  endpoint: "bin-deepseek-endpoint",
  model: "bin-deepseek-model",
  thinkingMode: "bin-deepseek-thinking-mode",
  systemPrompt: "bin-deepseek-system-prompt",
};

export const MODEL_LABELS = {
  "deepseek-v4-flash": "V4 Flash",
  "deepseek-v4-pro": "V4 Pro",
};

export const MODE_LABELS = {
  disabled: "快速",
  high: "深度",
  max: "极限",
};

export const DEFAULT_SETTINGS = {
  apiKey: "",
  rememberApiKey: true,
  endpoint: "https://api.deepseek.com/chat/completions",
  model: "deepseek-v4-flash",
  thinkingMode: "high",
  systemPrompt: "你是一个简洁、可靠的中文助手。",
};
