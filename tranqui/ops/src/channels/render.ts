import sharp from "sharp";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "../config.js";

const here = path.dirname(fileURLToPath(import.meta.url));
export const MEDIA_DIR = path.join(here, "..", "..", "data", "media");
mkdirSync(MEDIA_DIR, { recursive: true });

export type Slide = { kicker?: string; headline: string; body?: string };
const THEMES = {
  sunset: { bg1: "#0B1026", bg2: "#2A1B5C", accent: "#FF7A59", accent2: "#FFC857", text: "#FFF8EE" },
  sea: { bg1: "#03203C", bg2: "#0E6E8C", accent: "#38E1C7", accent2: "#FFC857", text: "#F2FBFF" },
  sand: { bg1: "#FFF4E3", bg2: "#FFD9B0", accent: "#E8553D", accent2: "#1A3A6B", text: "#14213D" },
} as const;
export type Theme = keyof typeof THEMES;

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function wrap(text: string, maxChars: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    if ((line + " " + w).trim().length > maxChars) { if (line) lines.push(line); line = w; }
    else line = (line + " " + w).trim();
  }
  if (line) lines.push(line);
  return lines;
}

/** Render one 1080x1350 branded slide (IG portrait / TikTok photo mode) to PNG. Returns public URL. */
export async function renderSlide(slide: Slide, idx: number, total: number, theme: Theme, id: string) {
  const t = THEMES[theme];
  const head = wrap(slide.headline, 16).slice(0, 5);
  const body = slide.body ? wrap(slide.body, 34).slice(0, 7) : [];
  const headY = 430;
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1350" viewBox="0 0 1080 1350">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${t.bg1}"/><stop offset="1" stop-color="${t.bg2}"/></linearGradient>
    <radialGradient id="sun" cx="0.85" cy="0.12" r="0.5"><stop offset="0" stop-color="${t.accent2}" stop-opacity="0.9"/><stop offset="1" stop-color="${t.accent2}" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="1080" height="1350" fill="url(#g)"/>
  <circle cx="920" cy="160" r="420" fill="url(#sun)"/>
  <path d="M0 1180 C 240 1120, 420 1240, 640 1190 S 960 1120, 1080 1170 L1080 1350 L0 1350Z" fill="${t.accent}" opacity="0.18"/>
  <path d="M0 1240 C 260 1190, 460 1300, 700 1250 S 980 1200, 1080 1240 L1080 1350 L0 1350Z" fill="${t.accent}" opacity="0.3"/>
  <text x="90" y="150" font-family="Helvetica, Arial, sans-serif" font-size="44" font-weight="800" fill="${t.text}">tranqui<tspan fill="${t.accent}">.</tspan></text>
  ${slide.kicker ? `<text x="90" y="${headY - 90}" font-family="Helvetica, Arial, sans-serif" font-size="34" font-weight="700" letter-spacing="6" fill="${t.accent}">${esc(slide.kicker.toUpperCase())}</text>` : ""}
  ${head.map((l, i) => `<text x="90" y="${headY + i * 104}" font-family="Helvetica, Arial, sans-serif" font-size="92" font-weight="800" fill="${t.text}">${esc(l)}</text>`).join("")}
  ${body.map((l, i) => `<text x="90" y="${headY + head.length * 104 + 50 + i * 54}" font-family="Helvetica, Arial, sans-serif" font-size="40" fill="${t.text}" opacity="0.85">${esc(l)}</text>`).join("")}
  <text x="90" y="1290" font-family="Helvetica, Arial, sans-serif" font-size="30" fill="${t.text}" opacity="0.8">IT, sorted. Now relax. · tranqui.tech</text>
  ${total > 1 ? `<text x="990" y="1290" text-anchor="end" font-family="Helvetica, Arial, sans-serif" font-size="30" font-weight="700" fill="${t.text}">${idx + 1}/${total}</text>` : ""}
</svg>`;
  const file = `${id}-${idx + 1}.png`;
  await sharp(Buffer.from(svg)).png().toFile(path.join(MEDIA_DIR, file));
  return `${config.baseUrl}/media/${file}`;
}
