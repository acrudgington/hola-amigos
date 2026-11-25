// ============================================================
// A child's progress, and every rule for changing it.
// All functions here are PURE: progress in, new progress out. The app keeps
// the current copy in memory, applies one of these, then saves it through
// the storage service (local today, Firebase later).
// ============================================================

// box: recognising the word (Spanish → English), Leitner 0–5.
// recall: producing it (English → Spanish), 0–5. wrong: wrong answers in total.
export interface WordMemory { box: number; seen: number; en: string; last: number; recall?: number; wrong?: number }
export type Direction = "recognise" | "recall";

export type EventType = "lesson" | "review" | "badge" | "sticker" | "outfit" | "level" | "chest" | "combo" | "start";
export interface ActivityEvent { t: number; type: EventType; text: string; emoji?: string; title?: string }

export interface Progress {
  stars: Record<string, number>;      // lessonId → best stars (1–3)
  lastLesson: number;
  streak: number;
  lastActive: number | null;
  timeSpent: number;
  badges: string[];
  stickers: string[];
  outfits: string[];
  solOutfit: string | null;
  lunaOutfit: string | null;
  lessonsDone: number;
  correctAnswers: number;
  micUses: number;
  storiesRead: number;
  reviewsDone: number;
  wordMemory: Record<string, WordMemory>;
  dailyGoal: number;
  dailyDate: string | null;
  dailyCount: number;
  xp: number;
  xpByDay: Record<string, number>;
  bestCombo: number;
  comboDay: string | null;
  comboToday: number;
  chestDay: string | null;
  events: ActivityEvent[];
  // Placement check: lessons unlocked by showing what they already know (no stars).
  placedUpTo: number;
  placement: { world: number; at: number; asked: number; right: number } | null;
  placementOffered: boolean;
}

export type NumericStat = "correctAnswers" | "micUses" | "storiesRead" | "reviewsDone" | "lessonsDone";

export const DEFAULT_PROGRESS: Readonly<Progress> = Object.freeze({
  stars: {}, lastLesson: 1, streak: 0, lastActive: null, timeSpent: 0,
  badges: [], stickers: [], outfits: [], solOutfit: null, lunaOutfit: null,
  lessonsDone: 0, correctAnswers: 0, micUses: 0, storiesRead: 0, reviewsDone: 0,
  wordMemory: {}, dailyGoal: 3, dailyDate: null, dailyCount: 0,
  xp: 0, xpByDay: {}, bestCombo: 0, comboDay: null, comboToday: 0, chestDay: null, events: [],
  placedUpTo: 0, placement: null, placementOffered: false,
});

export const XP = { correct: 10, activity: 15, lesson: 50, perStar: 20, review: 25, combo5: 15, chest: 50 } as const;
const DAY = 86400000;

export const sumStars = (p: Pick<Progress, "stars">) => Object.values(p.stars || {}).reduce((a, b) => a + b, 0);
export const countLessons = (p: Pick<Progress, "stars">) => Object.keys(p.stars || {}).length;
export const maxCompleted = (stars: Record<string, number>) => Object.keys(stars).reduce((m, id) => Math.max(m, Number(id)), 0);
// Lessons the child has finished OR been placed past by the placement check.
export const learnedUpTo = (p: Pick<Progress, "stars" | "placedUpTo">) => Math.max(maxCompleted(p.stars || {}), p.placedUpTo || 0);
// The furthest lesson they can open (one past what they've learned).
export const unlockedUpTo = (p: Pick<Progress, "stars" | "placedUpTo">, total = Number.MAX_SAFE_INTEGER) => Math.min(total, learnedUpTo(p) + 1);
// A brand-new learner: nothing played and not yet asked about placement.
export const isFreshLearner = (p: Progress) => !countLessons(p) && !Object.keys(p.wordMemory || {}).length && !p.placementOffered && !p.placement;

// Fill in anything missing from older saves, and give pre-XP saves a fair XP total.
export function normalizeProgress(raw: Partial<Progress> | null | undefined): Progress {
  const p: Progress = { ...structuredClone(DEFAULT_PROGRESS), ...(raw || {}) } as Progress;
  if (p.xp === 0 && !Object.keys(p.xpByDay).length && (p.correctAnswers || countLessons(p))) {
    p.xp = p.correctAnswers * XP.correct + sumStars(p) * XP.perStar + countLessons(p) * XP.lesson;
  }
  return p;
}

// Local calendar date as YYYY-MM-DD (not UTC, so "today" matches the child's day).
export const dayKey = (t: number = Date.now()) => {
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const dateString = (t: number) => new Date(t).toDateString();

// ---------- streaks ----------
export function touchStreak(p: Progress, now = Date.now()): Progress {
  const last = p.lastActive ? dateString(p.lastActive) : null;
  if (last === dateString(now)) return p;
  return { ...p, streak: last === dateString(now - DAY) ? p.streak + 1 : 1, lastActive: now };
}

// The streak to show: if a whole day was skipped the stored value is stale.
export function liveStreak(p: Pick<Progress, "lastActive" | "streak"> | null | undefined, now = Date.now()) {
  if (!p?.lastActive) return 0;
  const last = dateString(p.lastActive);
  return last === dateString(now) || last === dateString(now - DAY) ? p.streak || 0 : 0;
}

// ---------- spaced repetition (Leitner boxes 1–5) ----------
// Interval per box, in days. Box 1 = due tomorrow, box 5 = due in 3 weeks.
export const BOX_INTERVALS = [0, 1, 2, 4, 9, 21];

export function recordWord(p: Progress, es: string, en: string, correct: boolean, now = Date.now(), dir: Direction = "recognise"): Progress {
  if (!es) return p;
  const prev: WordMemory = p.wordMemory[es] || { box: 0, seen: 0, en, last: 0 };
  const next: WordMemory = { ...prev, seen: prev.seen + 1, en: en || prev.en, last: now };
  if (dir === "recall") {
    // Recalling the Spanish is harder: success also proves recognition; a miss
    // only resets recall (they may still recognise it when they see it).
    next.recall = correct ? Math.min(5, (prev.recall || 0) + 1) : 0;
    if (correct) next.box = Math.max(prev.box, Math.min(5, prev.box + 1));
  } else {
    next.box = correct ? Math.min(5, prev.box + 1) : 1;
  }
  if (!correct) next.wrong = (prev.wrong || 0) + 1;
  return { ...p, wordMemory: { ...p.wordMemory, [es]: next } };
}

export interface DueWord { es: string; en: string; box: number; overdue: number }
export function getDueWords(p: Pick<Progress, "wordMemory">, now = Date.now()): DueWord[] {
  const due: DueWord[] = [];
  for (const [es, w] of Object.entries(p.wordMemory || {})) {
    const dueAt = (w.last || 0) + (BOX_INTERVALS[w.box] || 0) * DAY;
    if (now >= dueAt) due.push({ es, en: w.en, box: w.box, overdue: now - dueAt });
  }
  return due.sort((a, b) => b.overdue - a.overdue);
}

// ---------- daily goal ----------
export function getDaily(p: Progress, now = Date.now()) {
  const goal = p.dailyGoal || 3;
  const count = p.dailyDate === dateString(now) ? p.dailyCount : 0;
  return { count, goal, met: count >= goal };
}

export function bumpDaily(p: Progress, now = Date.now()) {
  const before = getDaily(p, now);
  const count = before.count + 1;
  return { progress: { ...p, dailyDate: dateString(now), dailyCount: count }, justMet: !before.met && count >= before.goal };
}

// ---------- stars ----------
export function starsForScore(correct: number, total: number) {
  if (!total) return 1;
  const pct = correct / total;
  return pct >= 0.9 ? 3 : pct >= 0.7 ? 2 : 1;
}

// Keep the child's best result for a lesson (max 3 stars).
export function awardStars(p: Progress, lessonId: number, earned: number): Progress {
  const best = Math.min(3, Math.max(p.stars[lessonId] || 0, earned));
  return { ...p, stars: { ...p.stars, [lessonId]: best }, lastLesson: Math.max(p.lastLesson, lessonId), lessonsDone: p.lessonsDone + 1 };
}

export const addStat = (p: Progress, key: NumericStat, amount = 1): Progress => ({ ...p, [key]: p[key] + amount });

// Undo a reward that an old bug handed out (World Conqueror on the first star).
export function repairProgress(p: Progress, isEarned: (badgeId: string, p: Progress) => boolean): Progress {
  return p.badges.includes("perfect_world") && !isEarned("perfect_world", p)
    ? { ...p, badges: p.badges.filter(b => b !== "perfect_world") }
    : p;
}

// ---------- XP & levels ----------
export function addXP(p: Progress, amount: number, now = Date.now()): Progress {
  if (!amount) return p;
  const k = dayKey(now);
  return { ...p, xp: p.xp + amount, xpByDay: { ...p.xpByDay, [k]: (p.xpByDay[k] || 0) + amount } };
}

// Level L starts at 60·(L−1)·L XP: 0, 120, 360, 720, 1200, …
export const xpForLevel = (L: number) => 60 * (L - 1) * L;
export function levelInfo(xp = 0) {
  let level = 1;
  while (xp >= xpForLevel(level + 1)) level++;
  const base = xpForLevel(level), next = xpForLevel(level + 1);
  return { level, into: xp - base, span: next - base, pct: (xp - base) / (next - base), toNext: next - xp };
}
export const LEVEL_TITLES = ["Explorador", "Aprendiz", "Amigo", "Viajero", "Estrella", "Campeón", "Héroe", "Leyenda", "Maestro", "Superestrella"];
export const levelTitle = (L: number) => LEVEL_TITLES[Math.min(LEVEL_TITLES.length - 1, Math.floor((L - 1) / 2))];

export interface DayXP { key: string; date: Date; xp: number }
export function weekXP(p: Pick<Progress, "xpByDay">, now = Date.now()): DayXP[] {
  return Array.from({ length: 7 }, (_, i) => {
    const t = now - (6 - i) * DAY;
    return { key: dayKey(t), date: new Date(t), xp: (p.xpByDay || {})[dayKey(t)] || 0 };
  });
}

// ---------- combos & daily quests ----------
export function recordCombo(p: Progress, combo: number, now = Date.now()): Progress {
  const k = dayKey(now);
  const today = p.comboDay === k ? p.comboToday : 0;
  return { ...p, bestCombo: Math.max(p.bestCombo, combo), comboDay: k, comboToday: Math.max(today, combo) };
}

export interface Quest { id: string; emoji: string; label: string; value: number; goal: number }
export function dailyQuests(p: Progress, now = Date.now()) {
  const k = dayKey(now);
  const daily = getDaily(p, now);
  const xpToday = p.xpByDay[k] || 0;
  const combo = p.comboDay === k ? p.comboToday : 0;
  const quests: Quest[] = [
    { id: "acts", emoji: "🎯", label: `Finish ${daily.goal} activities`, value: Math.min(daily.count, daily.goal), goal: daily.goal },
    { id: "xp", emoji: "⚡", label: "Earn 100 XP", value: Math.min(xpToday, 100), goal: 100 },
    { id: "combo", emoji: "🔥", label: "Get a 5-answer combo", value: Math.min(combo, 5), goal: 5 },
  ];
  return { quests, allDone: quests.every(q => q.value >= q.goal), claimed: p.chestDay === k };
}

export function claimChest(p: Progress, now = Date.now()): Progress {
  const q = dailyQuests(p, now);
  if (!q.allDone || q.claimed) return p;
  return { ...addXP(p, XP.chest, now), chestDay: dayKey(now) };
}

// ---------- activity feed ----------
export function logEvent(p: Progress, ev: Omit<ActivityEvent, "t">, now = Date.now()): Progress {
  return { ...p, events: [{ ...ev, t: now }, ...p.events].slice(0, 40) };
}

export function timeAgo(t: number, now = Date.now()) {
  const s = Math.max(0, Math.round((now - t) / 1000));
  if (s < 45) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  return d === 1 ? "yesterday" : `${d} days ago`;
}
