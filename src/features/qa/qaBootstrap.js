import { loadSettings } from "../../state/settings.js";
import { mountQaPanel } from "./qaView.js";

export function mountQaFromQuery() {
  const url = new URL(window.location.href);
  if (url.searchParams.get("qa") !== "1") return null;

  let panel = null;
  panel = mountQaPanel({
    getSettings: () => loadSettings(),
    onOpenConnection: () => {
      panel?.close();
      document.querySelector("#model-pill")?.click();
    },
  });
  return panel;
}
