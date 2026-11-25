// ============================================================
// SPEECH RECOGNITION (Web Speech API) for the "Say it!" game.
// Spoken output lives in src/audio/player.ts.
// ============================================================

// Minimal typings for the (still non-standard) speech recognition API.
interface RecognitionAlt { transcript: string }
interface RecognitionEvent { results: ArrayLike<ArrayLike<RecognitionAlt>> }
export interface Recognizer {
  lang: string; continuous: boolean; interimResults: boolean; maxAlternatives: number;
  onresult: ((e: RecognitionEvent) => void) | null;
  onerror: ((e: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start(): void; abort(): void;
}
type RecognizerCtor = new () => Recognizer;
const recognizerCtor = (): RecognizerCtor | undefined => {
  if (typeof window === "undefined") return undefined;
  const w = window as unknown as { SpeechRecognition?: RecognizerCtor; webkitSpeechRecognition?: RecognizerCtor };
  return w.SpeechRecognition || w.webkitSpeechRecognition;
};

export const speech = {
  recogSupported: () => !!recognizerCtor(),

  // Listen for one Spanish utterance. Returns the recogniser (call .abort() to cancel).
  listen({ onResult, onError, onEnd }: { onResult?: (alts: string[]) => void; onError?: (e: string) => void; onEnd?: () => void }): Recognizer | null {
    const SR = recognizerCtor();
    if (!SR) { onError?.("unsupported"); return null; }
    const r = new SR();
    r.lang = "es-ES";
    r.continuous = false;
    r.interimResults = false;
    r.maxAlternatives = 3;
    r.onresult = e => {
      const alts: string[] = [];
      for (let i = 0; i < e.results[0].length; i++) alts.push(e.results[0][i].transcript);
      onResult?.(alts);
    };
    r.onerror = e => onError?.(e.error || "error");
    r.onend = () => onEnd?.();
    try { r.start(); } catch (err) { onError?.(err instanceof Error ? err.message : "error"); }
    return r;
  },
};

// How close are two strings? 0–1 (1 = identical). Ignores case, punctuation
// and accents so children aren't penalised for the recogniser's spelling.
export function similarity(a: string, b: string): number {
  const clean = (s: string) => s.toLowerCase().trim()
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
