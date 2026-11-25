// Copies the 3D illustrations the app uses (Microsoft Fluent Emoji 3D, MIT)
// into public/art/, and writes src/art/manifest.json (emoji → file).
// Run after adding new emoji to lessons or screens: npm run art:sync
// (a unit test fails if any emoji in the app has no illustration).
import { copyFileSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { artKeyCandidates, projectEmoji } from "../src/art/scan.ts";

const SRC = "node_modules/@lobehub/fluent-emoji-3d/assets";
const OUT = "public/art";
const available = new Set(readdirSync(SRC).map(f => f.replace(/\.webp$/, "")));

const manifest: Record<string, string> = {};
const missing: string[] = [];
for (const e of projectEmoji()) {
  const key = artKeyCandidates(e).find(k => available.has(k));
  if (key) manifest[e] = key; else missing.push(e);
}

if (existsSync(OUT)) rmSync(OUT, { recursive: true });
mkdirSync(OUT, { recursive: true });
for (const key of new Set(Object.values(manifest))) copyFileSync(join(SRC, `${key}.webp`), join(OUT, `${key}.webp`));
writeFileSync(join(OUT, "LICENSE.txt"),
  "Illustrations: Microsoft Fluent Emoji (3D style), https://github.com/microsoft/fluentui-emoji\n" +
  "Copyright (c) Microsoft Corporation. Licensed under the MIT License.\n");
const sorted = Object.fromEntries(Object.entries(manifest).sort(([a], [b]) => a.localeCompare(b)));
writeFileSync("src/art/manifest.json", JSON.stringify(sorted, null, 0) + "\n");
console.log(`${Object.keys(manifest).length} illustrations · ${new Set(Object.values(manifest)).size} files`);
if (missing.length) console.log(`no illustration (shown as text): ${missing.join(" ")}`);
