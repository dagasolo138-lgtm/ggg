import { DEFAULT_SETTINGS, STORAGE_KEYS } from "../config/constants.js";

export function loadSettings() {
  return {
    apiKey: sessionStorage.getItem(STORAGE_KEYS.apiKey) || DEFAULT_SETTINGS.apiKey,
    endpoint: localStorage.getItem(STORAGE_KEYS.endpoint) || DEFAULT_SETTINGS.endpoint,
    model: localStorage.getItem(STORAGE_KEYS.model) || DEFAULT_SETTINGS.model,
    thinkingMode: localStorage.getItem(STORAGE_KEYS.thinkingMode) || DEFAULT_SETTINGS.thinkingMode,
    systemPrompt: localStorage.getItem(STORAGE_KEYS.systemPrompt) || DEFAULT_SETTINGS.systemPrompt,
  };
}

export function persistSettings(settings) {
  sessionStorage.setItem(STORAGE_KEYS.apiKey, settings.apiKey.trim());
  localStorage.setItem(STORAGE_KEYS.endpoint, settings.endpoint.trim());
  localStorage.setItem(STORAGE_KEYS.model, settings.model);
  localStorage.setItem(STORAGE_KEYS.thinkingMode, settings.thinkingMode);
  localStorage.setItem(STORAGE_KEYS.systemPrompt, settings.systemPrompt.trim());
}

export function clearStoredApiKey() {
  sessionStorage.removeItem(STORAGE_KEYS.apiKey);
}

export function validateSettings(settings) {
  if (!settings.apiKey.trim()) return "请先填写 API Key。";
  if (!settings.endpoint.trim()) return "请填写接口地址。";
  if (!settings.model) return "请选择模型。";
  return "";
}
