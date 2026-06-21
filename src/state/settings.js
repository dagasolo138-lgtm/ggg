import { DEFAULT_SETTINGS, STORAGE_KEYS } from "../config/constants.js";

function readRememberPreference() {
  const raw = localStorage.getItem(STORAGE_KEYS.rememberApiKey);
  return raw === null ? DEFAULT_SETTINGS.rememberApiKey : raw === "true";
}

export function loadSettings() {
  const rememberApiKey = readRememberPreference();
  const rememberedKey = localStorage.getItem(STORAGE_KEYS.apiKey) || "";
  const sessionKey = sessionStorage.getItem(STORAGE_KEYS.apiKey) || "";

  if (rememberApiKey && !rememberedKey && sessionKey) {
    localStorage.setItem(STORAGE_KEYS.apiKey, sessionKey);
    sessionStorage.removeItem(STORAGE_KEYS.apiKey);
  }

  return {
    apiKey: rememberApiKey ? (rememberedKey || sessionKey) : sessionKey,
    rememberApiKey,
    endpoint: localStorage.getItem(STORAGE_KEYS.endpoint) || DEFAULT_SETTINGS.endpoint,
    model: localStorage.getItem(STORAGE_KEYS.model) || DEFAULT_SETTINGS.model,
    thinkingMode: localStorage.getItem(STORAGE_KEYS.thinkingMode) || DEFAULT_SETTINGS.thinkingMode,
    systemPrompt: localStorage.getItem(STORAGE_KEYS.systemPrompt) || DEFAULT_SETTINGS.systemPrompt,
  };
}

export function persistSettings(settings) {
  const apiKey = settings.apiKey.trim();
  const rememberApiKey = Boolean(settings.rememberApiKey);

  localStorage.setItem(STORAGE_KEYS.rememberApiKey, String(rememberApiKey));
  localStorage.setItem(STORAGE_KEYS.endpoint, settings.endpoint.trim());
  localStorage.setItem(STORAGE_KEYS.model, settings.model);
  localStorage.setItem(STORAGE_KEYS.thinkingMode, settings.thinkingMode);
  localStorage.setItem(STORAGE_KEYS.systemPrompt, settings.systemPrompt.trim());

  if (rememberApiKey) {
    if (apiKey) localStorage.setItem(STORAGE_KEYS.apiKey, apiKey);
    else localStorage.removeItem(STORAGE_KEYS.apiKey);
    sessionStorage.removeItem(STORAGE_KEYS.apiKey);
  } else {
    localStorage.removeItem(STORAGE_KEYS.apiKey);
    if (apiKey) sessionStorage.setItem(STORAGE_KEYS.apiKey, apiKey);
    else sessionStorage.removeItem(STORAGE_KEYS.apiKey);
  }
}

export function clearStoredApiKey() {
  localStorage.removeItem(STORAGE_KEYS.apiKey);
  sessionStorage.removeItem(STORAGE_KEYS.apiKey);
}

export function validateSettings(settings) {
  if (!settings.apiKey.trim()) return "请先填写 API Key。";
  if (!settings.endpoint.trim()) return "请填写接口地址。";
  if (!settings.model) return "请选择模型。";
  return "";
}
