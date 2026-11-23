// ============================================================
// SPEECH — text-to-speech and speech recognition (Web Speech API)
// ============================================================

const hasWindow = typeof window !== "undefined";
let esVoices = [];
let enVoices = [];

function loadVoices() {
  if (!hasWindow || !window.speechSynthesis) return;
  const all = window.speechSynthesis.getVoices();
  esVoices = all.filter(v => v.lang?.toLowerCase().startsWith("es"));
  enVoices = all.filter(v => v.lang?.toLowerCase().startsWith("en"));
}

if (hasWindow && window.speechSynthesis) {
  loadVoices();
  // addEventListener rather than assigning onvoiceschanged, so we don't clobber anyone else.
  window.speechSynthesis.addEventListener?.("voiceschanged", loadVoices);
}

function pickVoice(lang) {
  if (lang === "en") return enVoices.find(v => v.lang === "en-GB") || enVoices[0] || null;
  // Prefer Spain Spanish, then any Spanish. Never fall back to an English
  // voice for Spanish — the browser's default for lang="es-ES" is better.
  return esVoices.find(v => v.lang === "es-ES") || esVoices[0] || null;
}

export const speech = {
  supported: () => hasWindow && !!window.speechSynthesis,
  recogSupported: () => hasWindow && !!(window.SpeechRecognition || window.webkitSpeechRecognition),

  // speak(text, { lang: "es" | "en", rate, onEnd })
  speak(text, { lang = "es", rate, onEnd } = {}) {
    if (!speech.supported() || !text) { onEnd?.(); return; }
    if (!esVoices.length && !enVoices.length) loadVoices();
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang === "en" ? "en-GB" : "es-ES";
    u.rate = rate ?? (lang === "en" ? 0.95 : 0.85);
    u.pitch = 1.05;
    const v = pickVoice(lang);
    if (v) u.voice = v;
    if (onEnd) { u.onend = onEnd; u.onerror = onEnd; }
    window.speechSynthesis.speak(u);
  },

  stop() { if (speech.supported()) window.speechSynthesis.cancel(); },

  // Listen for one Spanish utterance. Returns the recogniser (call .abort() to cancel).
  listen({ onResult, onError, onEnd }) {
    const SR = hasWindow && (window.SpeechRecognition || window.webkitSpeechRecognition);
    if (!SR) { onError?.("unsupported"); return null; }
    const r = new SR();
    r.lang = "es-ES";
    r.continuous = false;
    r.interimResults = false;
    r.maxAlternatives = 3;
    r.onresult = e => {
      const alts = [];
      for (let i = 0; i < e.results[0].length; i++) alts.push(e.results[0][i].transcript);
      onResult?.(alts);
    };
    r.onerror = e => onError?.(e.error || "error");
    r.onend = () => onEnd?.();
    try { r.start(); } catch (err) { onError?.(err.message); }
    return r;
  },
};

// How close are two strings? 0–1 (1 = identical). Ignores case, punctuation
// and accents so children aren't penalised for the recogniser's spelling.
export function similarity(a, b) {
  const clean = s => s.toLowerCase().trim()
    .replace(/[¿?¡!.,;:…]/g, "")
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ");
  a = clean(a); b = clean(b);
  if (a === b) return 1;
  if (!a || !b) return 0;
  const m = a.length, n = b.length;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = a[i - 1] === b[j - 1] ? prev[j - 1] : 1 + Math.min(prev[j], cur[j - 1], prev[j - 1]);
    }
    prev = cur;
  }
  return 1 - prev[n] / Math.max(m, n);
}
