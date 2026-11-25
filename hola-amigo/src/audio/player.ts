// ============================================================
// The voice player.
// Plays pre-recorded neural-voice clips (public/audio/*.mp3). A line made of
// several segments (English narration + Spanish words) plays as one smooth
// sequence. If a clip hasn't been recorded, or can't load offline, that
// segment falls back to the device's built-in voice, so nothing is ever silent.
// ============================================================
import manifestJson from "../../content/audio-manifest.json";
import { AUDIO } from "../config.ts";
import { narration, spanish } from "./catalog.ts";
import { clipId, type Segment, type Speaker } from "./text.ts";

const manifest = manifestJson as { voices: Record<string, string>; clips: Record<string, string> };
const hasWindow = typeof window !== "undefined";
const GAP_MS = 90;               // breath between segments of one line

export interface PlayOptions {
  // "interrupt" (default) stops whatever is playing; "queue" waits its turn
  // (used for words that auto-play after an instruction).
  mode?: "interrupt" | "queue";
  onEnd?: () => void;
}

interface Job { segments: Segment[]; onEnd?: () => void }

const urlFor = (s: Segment) => {
  const id = clipId(s.role, s.text);
  return manifest.clips[id] === s.role ? `${AUDIO.basePath}${id}.mp3` : null;
};

// ---------- built-in voice fallback ----------
let deviceVoices: SpeechSynthesisVoice[] = [];
if (hasWindow && window.speechSynthesis) {
  const load = () => { deviceVoices = window.speechSynthesis.getVoices(); };
  load();
  window.speechSynthesis.addEventListener?.("voiceschanged", load);
}
function speakWithDevice(s: Segment, done: () => void) {
  if (!hasWindow || !window.speechSynthesis) { done(); return; }
  const spanishLine = s.role.endsWith("es");
  const u = new SpeechSynthesisUtterance(s.text);
  u.lang = spanishLine ? "es-ES" : "en-GB";
  u.rate = spanishLine ? 0.85 : 0.95;
  const v = deviceVoices.find(x => x.lang === u.lang) || deviceVoices.find(x => x.lang.startsWith(spanishLine ? "es" : "en"));
  if (v) u.voice = v;
  u.onend = done;
  u.onerror = done;
  window.speechSynthesis.speak(u);
}

// ---------- who is speaking right now (so Sol and Luna can move their mouths) ----------
type Talker = Speaker | null;
let talker: Talker = null;
const talkerListeners = new Set<() => void>();
const speakerOf = (s: Segment): Speaker => (s.role.startsWith("sol") ? "sol" : s.role.startsWith("luna") ? "luna" : "teacher");
function setTalker(t: Talker) {
  if (t === talker) return;
  talker = t;
  talkerListeners.forEach(fn => fn());
}
export const speaking = {
  get: (): Talker => talker,
  subscribe: (fn: () => void) => { talkerListeners.add(fn); return () => { talkerListeners.delete(fn); }; },
};

// ---------- player ----------
class VoicePlayer {
  private el: HTMLAudioElement | null = null;
  private queue: Job[] = [];
  private current: Job | null = null;
  private token = 0;
  private unlocked = false;

  private element() {
    if (!this.el && hasWindow) { this.el = new Audio(); this.el.preload = "auto"; }
    return this.el;
  }

  // iOS only lets a page play audio it first started inside a tap. Priming the
  // shared element on the first tap lets later lines (like auto-read
  // instructions) play too.
  unlock() {
    if (this.unlocked || !hasWindow) return;
    this.unlocked = true;
    const el = this.element();
    if (!el) return;
    el.src = `${AUDIO.basePath}silence.mp3`;
    el.play().then(() => el.pause(), () => {});
  }

  play(segments: Segment[], { mode = "interrupt", onEnd }: PlayOptions = {}) {
    if (!segments.length) { onEnd?.(); return; }
    const job: Job = { segments, onEnd };
    if (mode === "queue" && this.current) { this.queue.push(job); return; }
    this.stop();
    this.run(job);
  }

  stop() {
    this.token++;
    this.queue = [];
    this.current = null;
    if (this.el) { this.el.onended = null; this.el.onerror = null; this.el.pause(); }
    if (hasWindow) window.speechSynthesis?.cancel();
    setTalker(null);
  }

  isBusy() { return !!this.current; }

  // Warm the offline cache for clips a lesson is about to use.
  prefetch(segments: Segment[]) {
    if (!hasWindow || !("caches" in window)) return;
    for (const s of segments) { const url = urlFor(s); if (url) void fetch(url).catch(() => {}); }
  }

  private run(job: Job) {
    const token = ++this.token;
    this.current = job;
    let i = 0;
    const next = () => {
      if (token !== this.token) return;
      if (i >= job.segments.length) { this.finish(job); return; }
      const seg = job.segments[i++];
      setTalker(speakerOf(seg));
      const advance = () => { if (token === this.token) setTimeout(next, i < job.segments.length ? GAP_MS : 0); };
      const url = urlFor(seg);
      const el = this.element();
      if (!url || !el) { speakWithDevice(seg, advance); return; }
      el.onended = advance;
      el.onerror = () => { el.onerror = null; speakWithDevice(seg, advance); };
      el.src = url;
      el.play().catch(() => { el.onended = null; el.onerror = null; speakWithDevice(seg, advance); });
    };
    next();
  }

  private finish(job: Job) {
    this.current = null;
    setTalker(null);
    job.onEnd?.();
    const following = this.queue.shift();
    if (following) this.run(following);
  }
}

const player = new VoicePlayer();

// ---------- the app-facing API ----------
export const voice = {
  // A Spanish word, phrase or sentence (Castilian teacher voice).
  spanish: (text: string, opts?: PlayOptions) => player.play(spanish(text), opts),
  // English narration that may contain Spanish: stories, questions, instructions.
  narrate: (text: string, opts?: PlayOptions & { speaker?: Speaker }) => player.play(narration(text, opts?.speaker), opts),
  stop: () => player.stop(),
  unlock: () => player.unlock(),
  busy: () => player.isBusy(),
  prefetch: (lines: { spanish?: string[]; narration?: string[] }) =>
    player.prefetch([...(lines.spanish || []).flatMap(spanish), ...(lines.narration || []).flatMap(t => narration(t))]),
  // Voices are always available: recorded clips, or the device as a fallback.
  available: () => hasWindow && (Object.keys(manifest.clips).length > 0 || !!window.speechSynthesis),
};
