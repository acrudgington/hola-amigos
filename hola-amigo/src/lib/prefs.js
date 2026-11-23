// Per-device preferences (theme, sound). Not progress — just comfort settings.
const KEY = "hola_prefs";

export function loadPrefs() {
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch { /* ignore */ }
  return { theme: "galaxy", sound: true, ...saved };
}

export function savePrefs(p) {
  try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* ignore */ }
}

export function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", theme === "daylight" ? "#F4F1FF" : "#0D0B24");
}
