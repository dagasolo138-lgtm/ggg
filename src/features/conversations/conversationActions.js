export function createConversationActions({
  ui,
  getConversation,
  onNewConversation,
  onShare,
  onToggleStar,
  onRename,
  onDelete,
}) {
  let menuOpen = false;

  function closeMenu() {
    menuOpen = false;
    ui.conversationMenu.hidden = true;
    ui.conversationMenuTrigger.setAttribute("aria-expanded", "false");
  }

  function openMenu() {
    if (ui.conversationActions.hidden) return;
    menuOpen = true;
    ui.conversationMenu.hidden = false;
    ui.conversationMenuTrigger.setAttribute("aria-expanded", "true");
  }

  function toggleMenu() {
    if (menuOpen) closeMenu();
    else openMenu();
  }

  function closeRenameDialog() {
    ui.renameDialog.hidden = true;
    ui.renameDialog.setAttribute("aria-hidden", "true");
    ui.renameTitleInput.value = "";
  }

  function openRenameDialog() {
    const conversation = getConversation();
    if (!conversation?.messages?.length) return;
    closeMenu();
    ui.renameTitleInput.value = conversation.title;
    ui.renameDialog.hidden = false;
    ui.renameDialog.setAttribute("aria-hidden", "false");
    window.setTimeout(() => {
      ui.renameTitleInput.focus();
      ui.renameTitleInput.select();
    }, 40);
  }

  function sync(conversation, isSending = false) {
    const hasMessages = Boolean(conversation?.messages?.length);
    ui.conversationActions.hidden = !hasMessages;
    ui.conversationNewButton.disabled = isSending;
    ui.conversationMenuTrigger.disabled = isSending;
    if (!hasMessages) closeMenu();

    const starred = Boolean(conversation?.starred);
    ui.conversationStarLabel.textContent = starred ? "取消收藏" : "收藏";
    ui.conversationStarIcon.dataset.state = starred ? "active" : "inactive";
  }

  ui.conversationNewButton.addEventListener("click", () => {
    closeMenu();
    onNewConversation();
  });

  ui.conversationMenuTrigger.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleMenu();
  });

  ui.conversationMenu.addEventListener("click", (event) => event.stopPropagation());
  ui.conversationShare.addEventListener("click", async () => {
    closeMenu();
    await onShare();
  });
  ui.conversationStar.addEventListener("click", () => {
    closeMenu();
    onToggleStar();
  });
  ui.conversationRename.addEventListener("click", openRenameDialog);
  ui.conversationDelete.addEventListener("click", () => {
    closeMenu();
    onDelete();
  });

  ui.renameDialogCancel.addEventListener("click", closeRenameDialog);
  ui.renameDialog.addEventListener("click", (event) => {
    if (event.target === ui.renameDialog) closeRenameDialog();
  });
  ui.renameDialogForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const title = ui.renameTitleInput.value.trim();
    if (!title) {
      ui.renameDialogError.textContent = "请输入对话名称。";
      return;
    }
    onRename(title);
    closeRenameDialog();
  });

  document.addEventListener("click", () => closeMenu());

  return {
    sync,
    closeMenu,
    closeRenameDialog,
  };
}
