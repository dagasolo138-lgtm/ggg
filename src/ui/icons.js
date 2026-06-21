const paths = {
  menu: '<path d="M4 7h16M4 12h16M4 17h11" />',
  clear: '<path d="M7 7h10v10H7z" /><path d="M10 3h4M5 7h14" />',
  plus: '<path d="M12 5v14M5 12h14" />',
  mic: '<rect x="9" y="3" width="6" height="11" rx="3" /><path d="M6 11a6 6 0 0 0 12 0M12 17v4M8 21h8" />',
  send: '<path d="M5 12h13M13 6l6 6-6 6" />',
  stop: '<rect x="7" y="7" width="10" height="10" rx="1" />',
  close: '<path d="M6 6l12 12M18 6L6 18" />',
};

export function icon(name, label = "") {
  return `<svg class="icon" viewBox="0 0 24 24" role="img" aria-label="${label}">${paths[name] || ""}</svg>`;
}
