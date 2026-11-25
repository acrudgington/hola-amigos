// ============================================================
// Generate every voice clip with Google Cloud Text-to-Speech.
//
//   GOOGLE_TTS_API_KEY=… npm run audio:generate            # only what's missing
//   GOOGLE_TTS_API_KEY=… npm run audio:generate -- --prune # also delete unused clips
//   npm run audio:generate -- --dry-run                    # list what would be made
//
// Clips are MP3s in public/audio/<id>.mp3; content/audio-manifest.json
// records which voice made each one. If ffmpeg is installed, silence is
// trimmed from both ends and loudness evened out so clips flow together.
// ============================================================
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { AUDIO, type VoiceSpec } from "../src/config.ts";
import { collectClips, type Clip } from "../src/audio/catalog.ts";
import type { VoiceRole } from "../src/audio/text.ts";

const ROOT = join(import.meta.dirname, "..");
const OUT = join(ROOT, "public", "audio");
const MANIFEST = join(ROOT, "content", "audio-manifest.json");
const API = "https://texttospeech.googleapis.com/v1";
// The key can come from the environment, or be injected by a proxy (in which case any placeholder works).
const KEY = process.env.GOOGLE_TTS_API_KEY || "proxy-injected";
const args = new Set(process.argv.slice(2));
const DRY = args.has("--dry-run");
const PRUNE = args.has("--prune");
const CONCURRENCY = 6;

export interface AudioManifest { voices: Partial<Record<VoiceRole, string>>; clips: Record<string, VoiceRole> }

interface GoogleVoice { name: string; ssmlGender: string; languageCodes: string[] }

async function api<T>(path: string, body?: unknown, attempt = 0): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: body ? "POST" : "GET",
    headers: { "Content-Type": "application/json", "X-Goog-Api-Key": KEY },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.ok) return (await res.json()) as T;
  const text = await res.text();
  // 429 = Google's per-minute quota: wait for the minute to roll over and carry on.
  if (res.status === 429 && attempt < 8) {
    await new Promise(r => setTimeout(r, 65_000));
    return api<T>(path, body, attempt + 1);
  }
  if (res.status >= 500 && attempt < 5) {
    await new Promise(r => setTimeout(r, 1000 * 2 ** attempt));
    return api<T>(path, body, attempt + 1);
  }
  throw new Error(`Google TTS ${res.status}: ${text.slice(0, 300)}`);
}

const TIERS = ["Chirp3-HD", "Studio", "Neural2", "Wavenet", "Standard"];
const tier = (name: string) => { const i = TIERS.findIndex(t => name.includes(`-${t}-`)); return i < 0 ? 99 : i; };

// Pick a voice for each role: first preferred voice that exists, else the best of that gender.
async function resolveVoices(): Promise<Record<VoiceRole, string>> {
  const roles = Object.entries(AUDIO.voices) as [VoiceRole, VoiceSpec][];
  const byLang = new Map<string, GoogleVoice[]>();
  for (const [, spec] of roles) {
    if (byLang.has(spec.languageCode)) continue;
    const { voices } = await api<{ voices: GoogleVoice[] }>(`/voices?languageCode=${spec.languageCode}`);
    byLang.set(spec.languageCode, voices.filter(v => v.languageCodes.includes(spec.languageCode)));
  }
  const used = new Set<string>();
  const out = {} as Record<VoiceRole, string>;
  for (const [role, spec] of roles) {
    const avail = byLang.get(spec.languageCode) || [];
    const names = new Set(avail.map(v => v.name));
    let pick = spec.prefer.find(n => names.has(n) && !used.has(n));
    if (!pick) {
      pick = avail.filter(v => v.ssmlGender === spec.gender && !used.has(v.name)).sort((a, b) => tier(a.name) - tier(b.name))[0]?.name;
    }
    if (!pick) throw new Error(`No ${spec.gender} ${spec.languageCode} voice available for "${role}"`);
    used.add(pick);
    out[role] = pick;
  }
  return out;
}

const hasFfmpeg = (() => { try { execFileSync("ffmpeg", ["-version"], { stdio: "ignore" }); return true; } catch { return false; } })();

// Trim leading/trailing silence (keeping a little air) and even out loudness.
function polish(file: string) {
  if (!hasFfmpeg) return;
  const tmp = `${file}.tmp.mp3`;
  const trim = "silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.06";
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", file,
    "-af", `${trim},areverse,${trim},areverse,loudnorm=I=-18:TP=-1.5:LRA=11`,
    "-ac", "1", "-ar", "24000", "-b:a", "48k", tmp]);
  rmSync(file);
  execFileSync("mv", [tmp, file]);
}

// Clip length in seconds (null if ffprobe isn't available); 0 for files with no audio frames.
const MIN_SECONDS = 0.15;
function duration(file: string): number | null {
  if (!hasFfmpeg) return null;
  try {
    const out = execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
    return Number.parseFloat(out) || 0;
  } catch { return 0; }
}

async function synthesize(clip: Clip, voice: string, spec: VoiceSpec): Promise<Buffer> {
  const req = (withRate: boolean) => ({
    input: { text: clip.text },
    voice: { languageCode: spec.languageCode, name: voice },
    audioConfig: { audioEncoding: "MP3", ...(withRate && spec.rate !== 1 ? { speakingRate: spec.rate } : {}) },
  });
  try {
    const { audioContent } = await api<{ audioContent: string }>("/text:synthesize", req(true));
    return Buffer.from(audioContent, "base64");
  } catch (err) {
    // Some voice families don't accept a speaking rate; retry at normal speed.
    if (String(err).includes("400")) {
      const { audioContent } = await api<{ audioContent: string }>("/text:synthesize", req(false));
      return Buffer.from(audioContent, "base64");
    }
    throw err;
  }
}

const readManifest = (): AudioManifest => (existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, "utf8")) : { voices: {}, clips: {} });

async function main() {
  const clips = collectClips();
  const manifest = readManifest();
  const voices = DRY ? (manifest.voices as Record<VoiceRole, string>) : await resolveVoices();
  if (!DRY) console.log("Voices:", voices);

  // A clip needs (re)making if its file is missing or its role's voice changed.
  const todo = clips.filter(c => !existsSync(join(OUT, `${c.id}.mp3`)) || manifest.clips[c.id] !== c.role || manifest.voices[c.role] !== voices[c.role]);
  console.log(`${clips.length} clips in the course · ${todo.length} to generate · ${todo.reduce((a, c) => a + c.text.length, 0)} characters`);
  if (DRY) { todo.slice(0, 20).forEach(c => console.log(`  [${c.role}] ${c.text}`)); return; }

  mkdirSync(OUT, { recursive: true });
  let done = 0, failed = 0;
  const next = { i: 0 };
  const save = () => writeFileSync(MANIFEST, JSON.stringify({ voices, clips: Object.fromEntries(Object.entries(manifest.clips).sort()) }, null, 1) + "\n");
  manifest.voices = voices;

  async function worker() {
    while (next.i < todo.length) {
      const clip = todo[next.i++];
      const spec = AUDIO.voices[clip.role] as VoiceSpec;
      try {
        const file = join(OUT, `${clip.id}.mp3`);
        // Very short lines ("Sí", "É") sometimes come back near-silent, and the
        // silence trim then leaves an empty file: synthesise again until it's real.
        for (let attempt = 1; ; attempt++) {
          writeFileSync(file, await synthesize(clip, voices[clip.role], spec));
          polish(file);
          const secs = duration(file);
          if (secs === null || secs >= MIN_SECONDS) break;
          if (attempt >= 4) { rmSync(file); throw new Error(`clip came back empty (${secs.toFixed(2)} s) ${attempt} times`); }
        }
        manifest.clips[clip.id] = clip.role;
        done++;
        if (done % 100 === 0) { console.log(`  ${done}/${todo.length}`); save(); }
      } catch (err) {
        failed++;
        console.error(`  ✗ [${clip.role}] "${clip.text.slice(0, 60)}": ${String(err).slice(0, 200)}`);
      }
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  // Drop manifest entries (and with --prune, files) the course no longer uses.
  const wanted = new Set(clips.map(c => c.id));
  for (const id of Object.keys(manifest.clips)) if (!wanted.has(id)) delete manifest.clips[id];
  // silence.mp3 isn't a clip: the player uses it to unlock audio on iOS.
  if (PRUNE) for (const f of readdirSync(OUT)) if (f.endsWith(".mp3") && f !== "silence.mp3" && !wanted.has(f.slice(0, -4))) rmSync(join(OUT, f));
  save();
  console.log(`Done: ${done} generated, ${failed} failed. ${hasFfmpeg ? "" : "(ffmpeg not found: clips weren't trimmed)"}`);
  process.exit(failed ? 1 : 0);
}

void main();
