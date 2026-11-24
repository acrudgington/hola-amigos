// Small, pure helpers shared across the app.

// Unbiased Fisher–Yates shuffle.
export function shuffle<T>(arr: readonly T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Keep the first item for each key.
export function uniqueBy<T, K>(arr: readonly T[], keyFn: (x: T) => K): T[] {
  const seen = new Set<K>();
  const out: T[] = [];
  for (const x of arr) {
    const k = keyFn(x);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(x);
  }
  return out;
}

// A shuffled multiple-choice set: the correct item plus up to n-1 distractors
// whose key differs from the correct one AND from each other.
export function buildOptions<T extends { en: string }>(correct: T, pool: readonly T[], n = 4, keyFn: (x: T) => string = w => w.en): T[] {
  const key = keyFn(correct);
  const distractors = uniqueBy(shuffle(pool.filter(w => keyFn(w) !== key)), keyFn).slice(0, n - 1);
  return shuffle([correct, ...distractors]);
}

const channels = (hex: string) => {
  const n = parseInt(hex.slice(1, 7), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255] as const;
};
const toHex = (r: number, g: number, b: number) => `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
const isHex = (hex: string | undefined): hex is string => !!hex && hex.startsWith("#") && hex.length >= 7;

// Darken a #rrggbb colour (the chunky 3D "edge" under buttons).
export function darken(hex: string | undefined, f = 0.78): string {
  if (!isHex(hex)) return "rgba(0,0,0,0.25)";
  const [r, g, b] = channels(hex).map(v => Math.max(0, Math.round(v * f)));
  return toHex(r, g, b);
}

// Mix a colour toward white (0 = original, 1 = white).
export function tint(hex: string | undefined, amt = 0.85): string {
  if (!isHex(hex)) return "#fff";
  const [r, g, b] = channels(hex).map(v => Math.round(v + (255 - v) * amt));
  return toHex(r, g, b);
}
