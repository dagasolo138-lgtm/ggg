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
  const active = toggleField("启用", "", memory.enabled);
  active.row.classList.add("memory-toggle");
  active.input.addEventListener("change", () => onToggle(memory.id, active.input.checked));
  header.append(category, active.row);

  const title = document.createElement("input");
  title.className = "memory-title-input";
  title.value = memory.title;
  title.maxLength = 60;
  title.placeholder = "标题";

  const content = document.createElement("textarea");
  content.className = "memory-content-input";
  content.rows = 4;
  content.value = memory.content;
  content.maxLength = 700;
  content.placeholder = "长期有效的信息";

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
  form.append(element("h3", "", "新建记忆"));
  const category = categorySelect("身份");
  const title = document.createElement("input");
  title.maxLength = 60;
  title.placeholder = "标题";
  const content = document.createElement("textarea");
  content.rows = 4;
  content.maxLength = 700;
  content.placeholder = "长期有效的信息";
  const save = element("button", "settings-action-button primary", "保存");
  save.type = "submit";
  const status = element("p", "settings-inline-status");
  form.append(category, title, content, save, status);

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    try {
      onAdd({ category: category.value, title: title.value, content: content.value, enabled: true });
      title.value = "";
      content.value = "";
      status.textContent = "已保存。";
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

  const preview = document.createElement("details");
  preview.className = "context-preview";
  preview.append(element("summary", "", "查看上下文"));
  const previewContent = document.createElement("pre");
  previewContent.textContent = renderPreview();
  preview.append(previewContent);

  const styleForm = element("form", "personalization-form");
  styleForm.append(element("h3", "personalization-section-title", "回答方式"));
  const language = selectField("语言", state.responseStyle.language, [["zh-CN", "中文"], ["auto", "跟随提问"], ["en", "英文"]]);
  const length = selectField("长度", state.responseStyle.length, [["concise", "简洁"], ["balanced", "适中"], ["detailed", "详细"]]);
  const directness = selectField("表达", state.responseStyle.directness, [["direct", "直接"], ["neutral", "中性"], ["encouraging", "鼓励"]]);
  const conclusion = toggleField("先给结论", "", state.responseStyle.conclusionFirst);
  const examples = toggleField("优先案例或步骤", "", state.responseStyle.useConcreteExamples);
  const contrast = toggleField("避免“不是……而是……”", "", state.responseStyle.avoidContrastPhrase);
  const uncertainty = toggleField("区分事实与不确定性", "", state.responseStyle.separateUncertainty);
  const custom = textareaField("其他偏好", state.responseStyle.customInstructions, "例如：先给结论。", 5);
  const saveStyle = element("button", "settings-action-button primary", "保存");
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
    styleStatus.textContent = "已保存。";
  });

  const knowledgeSection = element("section", "memory-section");
  knowledgeSection.append(element("h3", "personalization-section-title", "知识库"));
  knowledgeSection.append(element("p", "memory-empty", "开启后每次对话前自动从 zhishi 知识库检索相关事实注入上下文"));
  knowledgeSection.append(element("p", "settings-inline-status", "开启后，匹配到的本地事实将随对话内容发送至 DeepSeek API，请确认你接受此行为。"));
  const zhishiToggle = toggleField("接入 zhishi 知识库", "", state.zhishi?.enabled);
  zhishiToggle.input.id = "zhishi-enabled";
  zhishiToggle.input.addEventListener("change", () => {
    preferences.updateZhishi({ enabled: zhishiToggle.input.checked });
    previewContent.textContent = renderPreview();
  });
  knowledgeSection.append(zhishiToggle.row);
  knowledgeSection.append(element("p", "settings-inline-status", "需要在同一浏览器中打开过 zhishi 页面并积累事实。知识库地址：dagasolo138-lgtm.github.io/zhishi/"));

  const memorySection = element("section", "memory-section");
  memorySection.append(element("h3", "personalization-section-title", "记忆"));
  const memoryList = element("div", "memory-list");
  if (!state.memories.length) {
    memoryList.append(element("p", "memory-empty", "暂无记忆。"));
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
          if (!window.confirm("删除这条记忆？")) return;
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

  root.append(preview, styleForm, knowledgeSection, memorySection);
}
