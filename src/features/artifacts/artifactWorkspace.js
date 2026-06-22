import { copyText } from "../settings/dataExport.js";
import { getActiveArtifactVersion, getArtifactTypeConfig } from "./artifactStore.js";
import { renderArtifactWorkspace } from "./artifactView.js";

function downloadArtifact(artifact) {
  const version = getActiveArtifactVersion(artifact);
  if (!version) return;
  const config = getArtifactTypeConfig(artifact.type);
  const safeName = artifact.title.replace(/[\\/:*?"<>|]/g, "-").slice(0, 60) || "artifact";
  const blob = new Blob([version.content], { type: config.mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${safeName}.${config.extension}`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function createArtifactWorkspace({ ui, store, getConversationId, onError }) {
  let activeId = null;
  let editing = false;

  function currentArtifact() {
    return store.get(activeId);
  }

  function close() {
    editing = false;
    ui.artifactWorkspace.classList.remove("is-open");
    ui.artifactWorkspace.setAttribute("aria-hidden", "true");
    ui.artifactWorkspaceBackdrop.hidden = true;
    window.setTimeout(() => {
      if (ui.artifactWorkspace.getAttribute("aria-hidden") === "true") ui.artifactWorkspace.hidden = true;
    }, 220);
  }

  function open() {
    ui.artifactWorkspace.hidden = false;
    ui.artifactWorkspaceBackdrop.hidden = false;
    ui.artifactWorkspace.classList.add("is-open");
    ui.artifactWorkspace.setAttribute("aria-hidden", "false");
    render();
  }

  function openLibrary() {
    if (!activeId) activeId = store.list()[0]?.id || null;
    open();
  }

  function openCandidate(candidate) {
    try {
      const artifact = store.createFromCandidate(candidate, getConversationId());
      activeId = artifact.id;
      editing = false;
      open();
    } catch (error) {
      onError?.(error instanceof Error ? error.message : "无法创建 Artifact。");
    }
  }

  function render() {
    const artifacts = store.list();
    if (activeId && !artifacts.some((artifact) => artifact.id === activeId)) activeId = artifacts[0]?.id || null;
    const active = artifacts.find((artifact) => artifact.id === activeId) || artifacts[0] || null;
    if (active) activeId = active.id;
    ui.artifactWorkspaceTitle.textContent = active ? active.title : "Artifacts";

    renderArtifactWorkspace(ui.artifactWorkspaceContent, {
      artifacts,
      activeId,
      editing,
      onSelect(id) {
        activeId = id;
        editing = false;
        render();
      },
      onStartEditing() {
        editing = true;
        render();
      },
      onCancelEditing() {
        editing = false;
        render();
      },
      onSaveVersion(content) {
        try {
          store.addVersion(activeId, content, "手动修改");
          editing = false;
          render();
        } catch (error) {
          onError?.(error instanceof Error ? error.message : "无法保存 Artifact 版本。");
        }
      },
      onSelectVersion(versionId) {
        try {
          store.selectVersion(activeId, versionId);
          render();
        } catch (error) {
          onError?.(error instanceof Error ? error.message : "无法切换 Artifact 版本。");
        }
      },
      async onCopy() {
        const artifact = currentArtifact();
        const version = getActiveArtifactVersion(artifact);
        if (!version) return;
        try {
          await copyText(version.content);
          window.alert("Artifact 源码已复制。");
        } catch {
          onError?.("复制失败，请使用下载。");
        }
      },
      onDownload() {
        const artifact = currentArtifact();
        if (artifact) downloadArtifact(artifact);
      },
      onDelete() {
        const artifact = currentArtifact();
        if (!artifact) return;
        if (!window.confirm(`删除 Artifact「${artifact.title}」及其全部版本？`)) return;
        try {
          store.remove(artifact.id);
          activeId = store.list()[0]?.id || null;
          editing = false;
          render();
        } catch (error) {
          onError?.(error instanceof Error ? error.message : "无法删除 Artifact。");
        }
      },
    });
  }

  ui.openArtifactLibrary.addEventListener("click", openLibrary);
  ui.artifactWorkspaceClose.addEventListener("click", close);
  ui.artifactWorkspaceBackdrop.addEventListener("click", close);

  return {
    openLibrary,
    openCandidate,
    close,
  };
}
