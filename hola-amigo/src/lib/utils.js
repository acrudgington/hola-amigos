// Small, pure helpers shared across the app.

// Unbiased Fisher–Yates shuffle (the old `sort(() => Math.random() - 0.5)`
// trick is noticeably biased, so some words almost never moved).
export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Keep the first item for each key.
export function uniqueBy(arr, keyFn) {
  const seen = new Set();
  const out = [];
  for (const x of arr) {
    const k = keyFn(x);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(x);
  }
  return out;
}

// Build a shuffled multiple-choice set: the correct item plus up to `n - 1`
// distractors whose key differs from the correct one AND from each other,
// so a child never sees two identical answers.
export function buildOptions(correct, pool, n = 4, keyFn = w => w.en) {
  const key = keyFn(correct);
  const distractors = uniqueBy(
    shuffle(pool.filter(w => keyFn(w) !== key)),
    keyFn,
  ).slice(0, n - 1);
  return shuffle([correct, ...distractors]);
}

export const sumStars = p => Object.values(p?.stars || {}).reduce((a, b) => a + b, 0);
export const countLessons = p => Object.keys(p?.stars || {}).length;
export const todayKey = () => new Date().toDateString();

// Darken a #rrggbb colour (used for the chunky 3D "edge" under buttons).
export function darken(hex, f = 0.78) {
  if (!hex || !hex.startsWith("#") || hex.length < 7) return "rgba(0,0,0,0.25)";
  const n = parseInt(hex.slice(1, 7), 16);
  const c = v => Math.max(0, Math.round(v * f));
  return `#${((c((n >> 16) & 255) << 16) | (c((n >> 8) & 255) << 8) | c(n & 255)).toString(16).padStart(6, "0")}`;
}

// Mix a colour toward white (0 = original, 1 = white).
export function tint(hex, amt = 0.85) {
  if (!hex || !hex.startsWith("#") || hex.length < 7) return "#fff";
  const n = parseInt(hex.slice(1, 7), 16);
  const m = v => Math.round(v + (255 - v) * amt);
  return `#${((m((n >> 16) & 255) << 16) | (m((n >> 8) & 255) << 8) | m(n & 255)).toString(16).padStart(6, "0")}`;
}
