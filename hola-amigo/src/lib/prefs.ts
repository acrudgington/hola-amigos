// Per-device comfort settings (theme, sound). Not progress, so never synced.
export type Theme = "galaxy" | "daylight";
// guide: read instructions & questions aloud (for children who are still learning to read).
export interface Prefs { theme: Theme; sound: boolean; guide: boolean }
const KEY = "hola_prefs";

export function loadPrefs(): Prefs {
  let saved: Partial<Prefs> = {};
  try { saved = JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch { /* ignore */ }
  return { theme: "galaxy", sound: true, guide: true, ...saved };
}

export function savePrefs(p: Prefs) {
  try { localStorage.setItem(KEY, JSON.stringify(p)); } catch { /* ignore */ }
}

export function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme === "daylight" ? "#F2F3F8" : "#06070D");
}
