// Packs: which ones a learner sees today, what's unlocked, how far they've got.
import { PACKS, type Pack } from "../content/index.ts";
import type { Progress } from "./progress.ts";

const mmdd = (d: Date) => `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

// Seasonal packs have a window (MM-DD to MM-DD, which may wrap the new year,
// e.g. Christmas 12-01 to 01-06). Packs without a window are always on.
// ?season=<pack id> in the address forces a seasonal pack on, for previews.
export function isPackActive(pack: Pack, now = new Date(), override = seasonOverride()): boolean {
  if (!pack.window) return true;
  if (override === pack.id) return true;
  const today = mmdd(now);
  const { from, to } = pack.window;
  return from <= to ? today >= from && today <= to : today >= from || today <= to;
}

export function seasonOverride(): string | null {
  if (typeof location === "undefined") return null;
  try { return new URLSearchParams(location.search).get("season"); } catch { return null; }
}

// The packs a learner can see right now (children see children's packs; grown-up
// learners see the parent course).
export const visiblePacks = (audience: "child" | "adult", now = new Date()) =>
  PACKS.filter(p => p.audience === audience && isPackActive(p, now));

// The seasonal pack running today, if any (for banners and decorations).
export const activeSeason = (now = new Date()) => PACKS.find(p => p.window && isPackActive(p, now));

export function packProgress(p: Pick<Progress, "packStars">, pack: Pack) {
  const stars = pack.lessons.map(l => p.packStars?.[l.id] || 0);
  return { done: stars.filter(s => s > 0).length, total: pack.lessons.length, stars: stars.reduce((a, b) => a + b, 0) };
}

export const packFinished = (p: Pick<Progress, "packStars">, pack: Pack) => packProgress(p, pack).done === pack.lessons.length;

// In a sequential pack, a lesson opens once the one before it is done.
export function isPackLessonOpen(p: Pick<Progress, "packStars">, pack: Pack, index: number) {
  if (!pack.sequential || index === 0) return true;
  return (p.packStars?.[pack.lessons[index - 1].id] || 0) > 0;
}
