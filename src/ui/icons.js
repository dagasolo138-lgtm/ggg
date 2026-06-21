const paths = {
  menu: '<path d="M4 7h16M4 12h16M4 17h11" />',
  clear: '<path d="M7 7h10v10H7z" /><path d="M10 3h4M5 7h14" />',
  plus: '<path d="M12 5v14M5 12h14" />',
  mic: '<rect x="9" y="3" width="6" height="11" rx="3" /><path d="M6 11a6 6 0 0 0 12 0M12 17v4M8 21h8" />',
  send: '<path d="M5 12h13M13 6l6 6-6 6" />',
  stop: '<rect x="7" y="7" width="10" height="10" rx="1" />',
  close: '<path d="M6 6l12 12M18 6L6 18" />',
  back: '<path d="M15 5 8 12l7 7" />',
  chevron: '<path d="m9 5 7 7-7 7" />',
  user: '<circle cx="12" cy="8" r="3.5" /><path d="M4.5 20c.9-3.4 3.5-5.3 7.5-5.3s6.6 1.9 7.5 5.3" />',
  chart: '<path d="M4 19V5M4 19h16" /><path d="m7 15 4-4 3 2 4-5" />',
  bell: '<path d="M18 10a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" /><path d="M10 22h4" />',
  shield: '<path d="M12 3 5.5 6v5.5c0 4.2 2.5 7.6 6.5 9.5 4-1.9 6.5-5.3 6.5-9.5V6L12 3Z" /><path d="M9 12h6M12 9v6" />',
  share: '<circle cx="18" cy="5" r="2" /><circle cx="6" cy="12" r="2" /><circle cx="18" cy="19" r="2" /><path d="m8 11 8-5M8 13l8 5" />',
  sliders: '<path d="M4 6h6M14 6h6M4 12h10M18 12h2M4 18h3M15 18h5" /><circle cx="11" cy="6" r="2" /><circle cx="15" cy="12" r="2" /><circle cx="10" cy="18" r="2" />',
  grid: '<rect x="4" y="4" width="6" height="6" rx="1" /><rect x="14" y="4" width="6" height="6" rx="1" /><rect x="4" y="14" width="6" height="6" rx="1" /><rect x="14" y="14" width="6" height="6" rx="1" />',
  key: '<circle cx="8" cy="15" r="3" /><path d="m10 13 8-8M15 5l4 4M13 7l4 4" />',
  download: '<path d="M12 3v11" /><path d="m8 10 4 4 4-4" /><path d="M5 20h14" />',
  database: '<ellipse cx="12" cy="5" rx="7" ry="3" /><path d="M5 5v7c0 1.7 3.1 3 7 3s7-1.3 7-3V5M5 12v7c0 1.7 3.1 3 7 3s7-1.3 7-3v-7" />',
  plug: '<path d="M8 7V3M16 7V3M7 7h10v4a5 5 0 0 1-10 0V7ZM12 16v5" />',
  location: '<path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" />',
};

export function icon(name, label = "") {
  return `<svg class="icon" viewBox="0 0 24 24" role="img" aria-label="${label}">${paths[name] || ""}</svg>`;
}
