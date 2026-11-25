// Finding emoji in the app's content and code (used by the art sync script and its test).
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

// One emoji "picture": flags, keycaps, or a pictograph with optional variation
// selector, skin tone and zero-width-joiner sequences.
const PICT = "[\\u2600-\\u27BF\\u2B00-\\u2BFF\\u2190-\\u21FF\\u2300-\\u23FF\\u3030\\u303D\\u3297\\u3299\\u00A9\\u00AE\\u203C\\u2049\\u2122\\u2139\\u24C2\\u25AA-\\u25FE\\u{1F000}-\\u{1FAFF}]";
const TONE = "[\\u{1F3FB}-\\u{1F3FF}]";
const EMOJI = new RegExp(`[\\u{1F1E6}-\\u{1F1FF}]{2}|[#*0-9]\\uFE0F?\\u20E3|${PICT}\\uFE0F?${TONE}?(?:\\u200D${PICT}\\uFE0F?${TONE}?)*`, "gu");

export const findEmoji = (text: string): string[] => text.match(EMOJI) ?? [];

// Plain symbols used as UI glyphs, not pictures.
const NOT_PICTURES = new Set(["▭", "⌘", "→", "←", "↑", "↓", "↵", "↻", "★", "✓"]);

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(json|tsx?)$/.test(name) && !/audio-manifest|art[\\/]manifest/.test(p)) out.push(p);
  }
  return out;
}

export function projectEmoji(): string[] {
  const found = new Set<string>();
  for (const f of [...walk("content"), ...walk("src")])
    for (const e of findEmoji(readFileSync(f, "utf8"))) if (!NOT_PICTURES.has(e)) found.add(e);
  return [...found].sort();
}

// File names in the Fluent set are lowercase hex code points joined by "-",
// sometimes with and sometimes without the FE0F variation selector.
export function artKeyCandidates(e: string): string[] {
  const key = (s: string) => [...s].map(c => c.codePointAt(0)!.toString(16)).join("-");
  const bare = e.replace(/️/g, "");
  return [...new Set([key(e), key(bare), `${key(bare)}-fe0f`])];
}
