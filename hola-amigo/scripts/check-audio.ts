// Run with: npm run audio:check   (add -- --strict to fail when clips are missing)
// Reports how much of the course has a recorded voice clip. Anything missing
// still works in the app — it falls back to the device's built-in voice.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { collectClips } from "../src/audio/catalog.ts";

const ROOT = join(import.meta.dirname, "..");
const manifestPath = join(ROOT, "content", "audio-manifest.json");
const manifest = existsSync(manifestPath) ? JSON.parse(readFileSync(manifestPath, "utf8")) : { voices: {}, clips: {} };
const clips = collectClips();
const missing = clips.filter(c => manifest.clips[c.id] !== c.role || !existsSync(join(ROOT, "public", "audio", `${c.id}.mp3`)));
const pct = ((clips.length - missing.length) / clips.length) * 100;

console.log(`Voices: ${JSON.stringify(manifest.voices)}`);
console.log(`${clips.length - missing.length}/${clips.length} clips recorded (${pct.toFixed(1)}%)`);
missing.slice(0, 10).forEach(c => console.log(`  missing [${c.role}] ${c.text}`));
if (missing.length > 10) console.log(`  …and ${missing.length - 10} more. Run: npm run audio:generate`);
process.exit(process.argv.includes("--strict") && missing.length ? 1 : 0);
