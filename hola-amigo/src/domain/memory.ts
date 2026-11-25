// Adaptive practice: how well each word is known, and what to practise next.
//
// strength (0..1) blends how far the word has climbed the Leitner boxes with
// how much it has faded since it was last seen, minus a penalty for words the
// child keeps getting wrong. "Sol's mix" builds a short personal session from
// due words, tricky words and recall challenges.
import { ALL_WORDS, wordsForLessonsUpTo } from "../content/index.ts";
import { BOX_INTERVALS, learnedUpTo, type Progress, type WordMemory } from "./progress.ts";
import { shuffle } from "../lib/utils.ts";

const DAY = 86_400_000;

export function strength(w: WordMemory, now = Date.now()): number {
  const base = w.box / 5;
  const interval = Math.max(1, BOX_INTERVALS[w.box] || 1) * DAY;
  const age = Math.max(0, now - (w.last || 0));
  const fade = age <= interval ? 1 : Math.max(0.35, 1 - 0.25 * ((age - interval) / interval));   // fades once overdue
  const misses = w.wrong || 0;
  const missRate = w.seen ? misses / w.seen : 0;
  return Math.max(0, Math.min(1, base * fade - 0.3 * missRate));
}

// Often wrong, recently or repeatedly: worth extra practice.
export const isTricky = (w: WordMemory) => (w.wrong || 0) >= 2 && (w.wrong || 0) / Math.max(1, w.seen) >= 0.3;

export interface WordStat { es: string; en: string; emoji: string; strength: number; mem: WordMemory }
const emojiOf = (es: string) => ALL_WORDS.find(w => w.es === es)?.emoji || "";

export function wordStats(p: Pick<Progress, "wordMemory">, now = Date.now()): WordStat[] {
  return Object.entries(p.wordMemory || {}).map(([es, mem]) => ({ es, en: mem.en, emoji: emojiOf(es), strength: strength(mem, now), mem }));
}

// The child's weakest words that they have actually met (for parents and warm-ups).
export function trickyWords(p: Pick<Progress, "wordMemory">, n = 6, now = Date.now()): WordStat[] {
  return wordStats(p, now).filter(s => s.mem.seen >= 2).sort((a, b) => a.strength - b.strength).filter(s => s.strength < 0.6).slice(0, n);
}

// ---------- Sol's mix ----------
export type MixMode = "recognise" | "listen" | "recall";
export type MixReason = "due" | "tricky" | "challenge" | "refresh";
export interface MixItem { es: string; en: string; emoji: string; mode: MixMode; reason: MixReason; choices: number }

export function buildMix(p: Progress, { size = 10, now = Date.now(), canListen = true }: { size?: number; now?: number; canListen?: boolean } = {}): MixItem[] {
  const stats = wordStats(p, now);
  const out: MixItem[] = [];
  const used = new Set<string>();
  const take = (s: { es: string; en: string; emoji: string }, mode: MixMode, reason: MixReason, choices = 4) => {
    if (used.has(s.es) || out.length >= size) return;
    used.add(s.es);
    out.push({ es: s.es, en: s.en, emoji: s.emoji, mode, reason, choices });
  };
  const dueAt = (m: WordMemory) => (m.last || 0) + (BOX_INTERVALS[m.box] || 0) * DAY;

  // 1. Tricky words first (up to 3): fewer choices so they can win them back.
  stats.filter(s => isTricky(s.mem)).sort((a, b) => a.strength - b.strength).slice(0, 3).forEach(s => take(s, "recognise", "tricky", 3));
  // 2. Due words, most overdue first (up to half the session), alternating read and listen.
  stats.filter(s => now >= dueAt(s.mem) && !used.has(s.es)).sort((a, b) => dueAt(a.mem) - dueAt(b.mem)).slice(0, Math.ceil(size / 2))
    .forEach((s, i) => take(s, canListen && i % 2 ? "listen" : "recognise", "due"));
  // 3. Challenge: recall the Spanish for words they recognise well (up to 3).
  stats.filter(s => s.mem.box >= 3 && (s.mem.recall || 0) < 2 && !used.has(s.es)).sort((a, b) => (a.mem.recall || 0) - (b.mem.recall || 0) || b.mem.box - a.mem.box)
    .slice(0, 3).forEach(s => take(s, "recall", "challenge", 4));
  // 4. Top up with a refresh of earlier lessons, weakest first.
  const done = learnedUpTo(p);
  if (done) {
    const byStrength = new Map(stats.map(s => [s.es, s.strength]));
    const pool = shuffle(wordsForLessonsUpTo(done)).sort((a, b) => (byStrength.get(a.es) ?? 0) - (byStrength.get(b.es) ?? 0));
    pool.forEach((w, i) => take({ es: w.es, en: w.en, emoji: w.emoji }, canListen && i % 3 === 2 ? "listen" : "recognise", "refresh"));
  }
  // Mix the order so the same kind of question doesn't come in a block.
  return shuffle(out);
}

export function mixSummary(items: MixItem[]): Record<MixReason, number> {
  const r: Record<MixReason, number> = { due: 0, tricky: 0, challenge: 0, refresh: 0 };
  for (const i of items) r[i.reason]++;
  return r;
}

// Earlier words for a lesson's warm-up: the weakest ones the child has met, then the rest.
export function warmupWords<T extends { es: string }>(p: Pick<Progress, "wordMemory">, earlier: T[], n = 5, now = Date.now()): T[] {
  const s = (w: T) => { const m = p.wordMemory?.[w.es]; return m ? strength(m, now) : 0.5; };
  return shuffle(earlier).sort((a, b) => s(a) - s(b)).slice(0, n);
}

// ---------- in-game difficulty ----------
// After 2 misses in a row: easier (3 choices + a spoken hint). After 4 right: harder (6 choices).
export type Difficulty = "easier" | "normal" | "harder";
export function nextDifficulty(recent: boolean[]): Difficulty {
  const tail = (n: number) => recent.slice(-n);
  if (recent.length >= 2 && tail(2).every(x => !x)) return "easier";
  if (recent.length >= 4 && tail(4).every(x => x)) return "harder";
  return "normal";
}
export const CHOICES: Record<Difficulty, number> = { easier: 3, normal: 4, harder: 6 };
