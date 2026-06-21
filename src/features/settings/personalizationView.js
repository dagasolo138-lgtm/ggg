import { buildPersonalizedSystemPrompt } from "./preferencesStore.js";

const MEMORY_CATEGORIES = ["身份", "偏好", "项目", "学习", "工作", "投资", "其他"];

function element(tag, className = "", text = "") {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

function resolveBasePrompt(getBasePrompt) {
  if (typeof getBasePrompt === "function") return getBasePrompt() || "";
  return localStorage.getItem("bin-deepseek-system-prompt") || "";
}

function selectField(label, value, options) {
  const wrapper = element("label", "personalization-field", label);
  const input = document.createElement("select");
  options.forEach(([optionValue, optionLabel]) => {
    const option = document.createElement("option");
    option.value = optionValue;
    option.textContent = optionLabel;
    option.selected = optionValue === value;
    input.append(option);
  });
  wrapper.append(input);
  return { wrapper, input };
}

function textareaField(label, value, placeholder, rows = 5) {
  const wrapper = element("label", "personalization-field", label);
  const input = document.createElement("textarea");
  input.rows = rows;
  input.value = value || "";
  input.placeholder = placeholder;
  wrapper.append(input);
  return { wrapper, input };
}

function toggleField(label, description, checked) {
  const row = element("label", "personalization-toggle");
  const copy = element("span", "personalization-toggle-copy");
  copy.append(element("strong", "", label));
  if (description) copy.append(element("small", "", description));
  const visual = element("span", "settings-switch");
  const input = document.createElement("input");
  input.type = "checkbox";
  input.checked = Boolean(checked);
  visual.append(input, element("span", "settings-switch-track"));
  row.append(copy, visual);
  return { row, input };
}

function categorySelect(value) {
  const select = document.createElement("select");
  select.className = "memory-category-select";
  MEMORY_CATEGORIES.forEach((name) => {
    const option = document.createElement("option");
    option.value = name;
    option.textContent = name;
    option.selected = value === name;
    select.append(option);
  });
  return select;
}

function renderMemoryCard(memory, { onSave, onDelete, onToggle }) {
  const card = element("article", "memory-card");
  const header = element("div", "memory-card-header");
  const category = categorySelect(memory.category);
  const active = toggleField("注入上下文", "关闭后保留，但不会发送给模型。", memory.enabled);
  active.row.classList.add("memory-toggle");
  active.input.addEventListener("change", () => onToggle(memory.id, active.input.checked));
  header.append(category, active.row);

  const title = document.createElement("input");
  title.className = "memory-title-input";
  title.value = memory.title;
  title.maxLength = 60;
  title.placeholder = "记忆标题，例如：当前核心项目";

  const content = document.createElement("textarea");
  content.className = "memory-content-input";
  content.rows = 4;
  content.value = memory.content;
  content.maxLength = 700;
  content.placeholder = "写下稳定、长期、且值得在未来对话中参考的信息。";

  const actions = element("div", "memory-card-actions");
  const save = element("button", "memory-save-button", "保存");
  save.type = "button";
  save.addEventListener("click", () => onSave(memory.id, {
    category: category.value,
    title: title.value,
    content: content.value,
    enabled: active.input.checked,
  }));
  const remove = element("button", "memory-delete-button", "删除");
  remove.type = "button";
  remove.addEventListener("click", () => onDelete(memory.id));
  actions.append(save, remove);
  card.append(header, title, content, actions);
  return card;
}

function renderNewMemoryForm(onAdd) {
  const form = element("form", "new-memory-form");
  form.append(
    element("h3", "", "新增长期记忆"),
    element("p", "", "只记录稳定、长期、希望助手在未来相关对话中参考的信息。临时事项不要写入这里。"),
  );
  const category = categorySelect("身份");
  const title = document.createElement("input");
  title.maxLength = 60;
  title.placeholder = "标题，例如：回答风格偏好";
  const content = document.createElement("textarea");
  content.rows = 4;
  content.maxLength = 700;
  content.placeholder = "内容，例如：希望复杂问题先给结论，再解释判断依据和下一步。";
  const save = element("button", "settings-action-button primary", "保存为长期记忆");
  save.type = "submit";
  const status = element("p", "settings-inline-status");
  form.append(category, title, content, save, status);

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    try {
      onAdd({ category: category.value, title: title.value, content: content.value, enabled: true });
      title.value = "";
      content.value = "";
      status.textContent = "已保存为长期记忆。";
    } catch (error) {
      status.textContent = error instanceof Error ? error.message : "保存失败。";
    }
  });
  return form;
}

export function renderPersonalizationView({ root, preferences, getBasePrompt }) {
  const state = preferences.snapshot;
  const basePrompt = resolveBasePrompt(getBasePrompt);
  const renderPreview = () => buildPersonalizedSystemPrompt(basePrompt, preferences.snapshot);
  root.replaceChildren();

  const intro = element("p", "settings-page-intro", "个性化分成三层：回答方式、长期资料、长期记忆。它们与基础系统提示词分开组织，并在每次发送时合并为可检查的上下文。");
  const preview = document.createElement("details");
  preview.className = "context-preview";
  preview.append(element("summary", "", "查看本轮会注入的上下文"));
  const previewContent = document.createElement("pre");
  previewContent.textContent = renderPreview();
  preview.append(previewContent);

  const styleForm = element("form", "personalization-form");
  styleForm.append(
    element("h3", "personalization-section-title", "回答方式"),
    element("p", "personalization-section-hint", "这些选项控制回应方式，不应该用来记录个人经历或项目资料。"),
  );
  const language = selectField("默认语言", state.responseStyle.language, [["zh-CN", "中文优先"], ["auto", "跟随你的提问语言"], ["en", "英文优先"]]);
  const length = selectField("默认回答长度", state.responseStyle.length, [["concise", "简洁：只保留关键结论"], ["balanced", "适中：结论 + 必要解释"], ["detailed", "详细：完整展开推理与步骤"]]);
  const directness = selectField("表达方式", state.responseStyle.directness, [["direct", "直接、克制、少套话"], ["neutral", "中性、平衡"], ["encouraging", "适度鼓励，但不空泛"]]);
  const conclusion = toggleField("复杂问题先给结论", "再给判断依据和下一步。", state.responseStyle.conclusionFirst);
  const examples = toggleField("优先给实际案例或步骤", "减少只讲抽象理论的回答。", state.responseStyle.useConcreteExamples);
  const contrast = toggleField("避免反驳式句法", "避免“不是……而是……”这一类表达。", state.responseStyle.avoidContrastPhrase);
  const uncertainty = toggleField("区分事实与不确定性", "信息不完整时明确写出假设和风险。", state.responseStyle.separateUncertainty);
  const custom = textareaField("额外回复偏好", state.responseStyle.customInstructions, "例如：投资问题先说明数据日期；代码改动后说明文件位置。", 5);
  const saveStyle = element("button", "settings-action-button primary", "保存回答方式");
  saveStyle.type = "submit";
  const styleStatus = element("p", "settings-inline-status");
  styleForm.append(language.wrapper, length.wrapper, directness.wrapper, conclusion.row, examples.row, contrast.row, uncertainty.row, custom.wrapper, saveStyle, styleStatus);
  styleForm.addEventListener("submit", (event) => {
    event.preventDefault();
    preferences.updateResponseStyle({
      language: language.input.value,
      length: length.input.value,
      directness: directness.input.value,
      conclusionFirst: conclusion.input.checked,
      useConcreteExamples: examples.input.checked,
      avoidContrastPhrase: contrast.input.checked,
      separateUncertainty: uncertainty.input.checked,
      customInstructions: custom.input.value,
    });
    previewContent.textContent = renderPreview();
    styleStatus.textContent = "回答方式已保存，会从下一次发送开始生效。";
  });

  const memorySection = element("section", "memory-section");
  memorySection.append(
    element("h3", "personalization-section-title", "长期记忆"),
    element("p", "personalization-section-hint", "记忆只在启用时注入上下文。你可以编辑、关闭或删除；当前版本不会自动从聊天里生成记忆。"),
  );
  const memoryList = element("div", "memory-list");
  if (!state.memories.length) {
    memoryList.append(element("p", "memory-empty", "还没有长期记忆。先添加 1–3 条真正长期有效的资料即可。"));
  } else {
    state.memories.forEach((memory) => {
      memoryList.append(renderMemoryCard(memory, {
        onSave(id, payload) {
          try {
            preferences.updateMemory(id, payload);
            renderPersonalizationView({ root, preferences, getBasePrompt });
          } catch (error) {
            window.alert(error instanceof Error ? error.message : "保存失败。");
          }
        },
        onDelete(id) {
          if (!window.confirm("删除这条长期记忆？")) return;
          preferences.removeMemory(id);
          renderPersonalizationView({ root, preferences, getBasePrompt });
        },
        onToggle(id, enabled) {
          preferences.toggleMemory(id, enabled);
          previewContent.textContent = renderPreview();
        },
      }));
    });
  }
  memorySection.append(memoryList, renderNewMemoryForm((payload) => {
    preferences.addMemory(payload);
    renderPersonalizationView({ root, preferences, getBasePrompt });
  }));

  root.append(intro, preview, styleForm, memorySection);
}
