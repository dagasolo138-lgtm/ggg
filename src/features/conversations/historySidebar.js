function groupLabel(timestamp) {
  const date = new Date(timestamp);
  const today = new Date();
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const startOfTarget = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const daysAgo = Math.floor((startOfToday - startOfTarget) / 86_400_000);

  if (daysAgo <= 0) return "今天";
  if (daysAgo === 1) return "昨天";
  if (daysAgo < 7) return "最近七天";
  return "更早";
}

function createHistoryItem(conversation, activeId, handlers) {
  const row = document.createElement("div");
  row.className = `history-item${conversation.id === activeId ? " is-active" : ""}${conversation.starred ? " is-starred" : ""}`;

  const select = document.createElement("button");
  select.type = "button";
  select.className = "history-select";
  select.title = conversation.title;

  if (conversation.starred) {
    const marker = document.createElement("span");
    marker.className = "history-star";
    marker.textContent = "★";
    marker.setAttribute("aria-label", "已收藏");
    select.append(marker);
  }

  const title = document.createElement("span");
  title.textContent = conversation.title;
  select.append(title);
  select.addEventListener("click", () => handlers.onSelect(conversation.id));

  const remove = document.createElement("button");
  remove.type = "button";
  remove.className = "history-delete";
  remove.setAttribute("aria-label", `删除对话：${conversation.title}`);
  remove.textContent = "×";
  remove.addEventListener("click", (event) => {
    event.stopPropagation();
    handlers.onDelete(conversation.id);
  });

  row.append(select, remove);
  return row;
}

export function renderHistorySidebar(container, conversations, activeId, handlers) {
  container.replaceChildren();

  if (!conversations.length) {
    const empty = document.createElement("p");
    empty.className = "history-empty";
    empty.textContent = "还没有对话记录";
    container.append(empty);
    return;
  }

  const groups = new Map();
  conversations.forEach((conversation) => {
    const label = conversation.starred ? "已收藏" : groupLabel(conversation.updatedAt);
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label).push(conversation);
  });

  groups.forEach((items, label) => {
    const section = document.createElement("section");
    section.className = "history-group";
    const heading = document.createElement("h3");
    heading.textContent = label;
    section.append(heading);
    items.forEach((conversation) => section.append(createHistoryItem(conversation, activeId, handlers)));
    container.append(section);
  });
}
