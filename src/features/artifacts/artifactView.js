import { getActiveArtifactVersion, getArtifactTypeConfig } from "./artifactStore.js";
import { icon } from "../../ui/icons.js";

function element(tag, className = "", text = "") {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

function iconElement(name) {
  const wrap = document.createElement("span");
  wrap.className = "artifact-icon-wrap";
  wrap.innerHTML = icon(name);
  return wrap;
}

function formatDate(timestamp) {
  if (!timestamp) return "";
  return new Intl.DateTimeFormat("zh-CN", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(timestamp));
}

function formatVersionLabel(version, index) {
  return `${index + 1}. ${version.label} · ${formatDate(version.createdAt)}`;
}

function renderPreview(container, artifact) {
  container.replaceChildren();
  const version = getActiveArtifactVersion(artifact);
  if (!version) return;
  const content = version.content;

  if (artifact.type === "html") {
    const frame = document.createElement("iframe");
    frame.className = "artifact-preview-frame";
    frame.sandbox = "allow-scripts";
    frame.title = `${artifact.title} 预览`;
    frame.srcdoc = content;
    container.append(frame);
    return;
  }

  if (artifact.type === "svg") {
    const frame = document.createElement("iframe");
    frame.className = "artifact-preview-frame artifact-svg-frame";
    frame.sandbox = "";
    frame.title = `${artifact.title} 预览`;
    frame.srcdoc = `<!doctype html><html><body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#fff">${content}</body></html>`;
    container.append(frame);
    return;
  }

  const preview = document.createElement("pre");
  preview.className = "artifact-text-preview";
  if (artifact.type === "json") {
    try {
      preview.textContent = JSON.stringify(JSON.parse(content), null, 2);
    } catch {
      preview.textContent = content;
    }
  } else {
    preview.textContent = content;
  }
  container.append(preview);
}

export function renderArtifactLaunchers(container, candidates, onOpenCandidate) {
  container.querySelector(".artifact-launchers")?.remove();
  if (!candidates.length) return;

  const wrap = element("div", "artifact-launchers");
  wrap.append(element("p", "artifact-launchers-title", "可创建 Artifact"));

  candidates.forEach((candidate) => {
    const action = document.createElement("button");
    action.type = "button";
    action.className = "artifact-launcher";
    const copy = element("span", "artifact-launcher-copy");
    copy.append(
      element("strong", "", candidate.title),
      element("small", "", `${getArtifactTypeConfig(candidate.type).label} · 创建并预览`),
    );
    action.append(iconElement("artifact"), copy, iconElement("chevron"));
    action.addEventListener("click", () => onOpenCandidate(candidate));
    wrap.append(action);
  });

  container.append(wrap);
}

export function renderArtifactWorkspace(root, {
  artifacts,
  activeId,
  editing,
  onSelect,
  onStartEditing,
  onCancelEditing,
  onSaveVersion,
  onSelectVersion,
  onCopy,
  onDownload,
  onDelete,
}) {
  root.replaceChildren();

  if (!artifacts.length) {
    const empty = element("section", "artifact-empty");
    empty.append(
      iconElement("artifact"),
      element("h3", "", "还没有 Artifact"),
      element("p", "", "当 DeepSeek 回答里包含 HTML、SVG、Markdown 或 JSON 代码块时，消息下方会出现“创建并预览”。"),
    );
    root.append(empty);
    return;
  }

  const list = element("nav", "artifact-library-list");
  artifacts.forEach((artifact) => {
    const item = document.createElement("button");
    item.type = "button";
    item.className = `artifact-library-item${artifact.id === activeId ? " is-active" : ""}`;
    const copy = element("span", "artifact-library-copy");
    copy.append(
      element("strong", "", artifact.title),
      element("small", "", `${getArtifactTypeConfig(artifact.type).label} · ${artifact.versions.length} 个版本`),
    );
    item.append(iconElement("artifact"), copy);
    item.addEventListener("click", () => onSelect(artifact.id));
    list.append(item);
  });

  const artifact = artifacts.find((item) => item.id === activeId) || artifacts[0];
  const version = getActiveArtifactVersion(artifact);
  const workspace = element("section", "artifact-editor");

  const meta = element("div", "artifact-editor-meta");
  const title = element("div", "artifact-editor-title");
  title.append(element("strong", "", artifact.title), element("small", "", `${getArtifactTypeConfig(artifact.type).label} · 本地保存`));
  const controls = element("div", "artifact-editor-controls");

  const edit = element("button", "artifact-control-button", editing ? "编辑中" : "编辑");
  edit.type = "button";
  edit.disabled = editing;
  edit.addEventListener("click", onStartEditing);
  const copy = element("button", "artifact-control-button", "复制");
  copy.type = "button";
  copy.addEventListener("click", onCopy);
  const download = element("button", "artifact-control-button", "下载");
  download.type = "button";
  download.addEventListener("click", onDownload);
  const remove = element("button", "artifact-control-button danger", "删除");
  remove.type = "button";
  remove.addEventListener("click", onDelete);
  controls.append(edit, copy, download, remove);
  meta.append(title, controls);

  const versionBar = element("label", "artifact-version-bar");
  versionBar.append(element("span", "", "版本"));
  const versionSelect = document.createElement("select");
  artifact.versions.forEach((item, index) => {
    const option = document.createElement("option");
    option.value = item.id;
    option.textContent = formatVersionLabel(item, index);
    option.selected = item.id === artifact.activeVersionId;
    versionSelect.append(option);
  });
  versionSelect.disabled = editing;
  versionSelect.addEventListener("change", () => onSelectVersion(versionSelect.value));
  versionBar.append(versionSelect);

  workspace.append(meta, versionBar);

  if (editing) {
    const form = element("form", "artifact-edit-form");
    const textarea = document.createElement("textarea");
    textarea.value = version?.content || "";
    textarea.spellcheck = false;
    textarea.setAttribute("aria-label", "Artifact 源码编辑器");
    const actions = element("div", "artifact-edit-actions");
    const cancel = element("button", "artifact-control-button", "取消");
    cancel.type = "button";
    cancel.addEventListener("click", onCancelEditing);
    const save = element("button", "artifact-save-button", "保存为新版本");
    save.type = "submit";
    actions.append(cancel, save);
    form.append(textarea, actions);
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      onSaveVersion(textarea.value);
    });
    workspace.append(form);
  } else {
    const preview = element("div", "artifact-preview");
    renderPreview(preview, artifact);
    workspace.append(preview, element("p", "artifact-safety-note", artifact.type === "html"
      ? "HTML 在隔离 iframe 中运行，不能访问聊天页面或本地数据。"
      : "内容只保存在当前浏览器；可复制、下载或手动保存新版本。"));
  }

  root.append(list, workspace);
}
