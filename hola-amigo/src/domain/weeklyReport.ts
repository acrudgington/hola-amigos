// The weekly progress report for grown-ups: what a child did over the last
// 7 days, what they can now do, and what to practise together next.
// Pure (progress in, report out) so the same code can later run on a server
// to send it as an automatic weekly email (see WEEKLY_EMAIL.md).
import type { Goal } from "../content/index.ts";
import { allGoals, nextGoal } from "./goals.ts";
import { trickyWords } from "./memory.ts";
import { COUNTED_EVENTS, dayKey, liveStreak, type CountedEvent, type Progress } from "./progress.ts";

const DAY = 86400000;

export interface WeeklyReport {
  name: string;
  from: Date;                 // first day covered (local midnight)
  to: Date;                   // today
  days: { key: string; date: Date; xp: number; active: boolean }[];
  activeDays: number;
  xp: number;
  counts: Record<CountedEvent, number>;
  newWords: { es: string; en: string }[];
  wordsKnown: number;         // in memory box 2+ (answered right on more than one occasion)
  goalsThisWeek: Goal[];
  goalsTotal: { achieved: number; total: number };
  next: Goal | null;
  tricky: { es: string; en: string }[];
  streak: number;
  quiet: boolean;             // nothing at all happened this week
}

export function weeklyReport(name: string, p: Progress, now = Date.now()): WeeklyReport {
  const days = Array.from({ length: 7 }, (_, i) => {
    const t = now - (6 - i) * DAY;
    const key = dayKey(t);
    const xp = p.xpByDay?.[key] || 0;
    const done = p.doneByDay?.[key] || {};
    return { key, date: new Date(t), xp, active: xp > 0 || Object.values(done).some(n => (n || 0) > 0) };
  });
  const keys = new Set(days.map(d => d.key));
  const counts = Object.fromEntries(COUNTED_EVENTS.map(e => [e, 0])) as Record<CountedEvent, number>;
  for (const [k, done] of Object.entries(p.doneByDay || {})) {
    if (!keys.has(k)) continue;
    for (const e of COUNTED_EVENTS) counts[e] += done[e] || 0;
  }
  const from = new Date(days[0].date); from.setHours(0, 0, 0, 0);
  const start = from.getTime();
  const newWords = Object.entries(p.wordMemory || {})
    .filter(([, w]) => (w.first ?? 0) >= start)
    .sort((a, b) => (a[1].first ?? 0) - (b[1].first ?? 0))
    .map(([es, w]) => ({ es, en: w.en }));
  const units = allGoals(p);
  const goals = units.flatMap(u => u.goals);
  const goalsThisWeek = goals.filter(g => g.state === "achieved" && (p.goalsAt?.[g.goal.id] ?? 0) >= start).map(g => g.goal);
  const xp = days.reduce((a, d) => a + d.xp, 0);
  const activeDays = days.filter(d => d.active).length;
  return {
    name, from, to: new Date(now), days, activeDays, xp, counts, newWords,
    wordsKnown: Object.values(p.wordMemory || {}).filter(w => w.box >= 2).length,
    goalsThisWeek,
    goalsTotal: { achieved: goals.filter(g => g.state === "achieved").length, total: goals.length },
    next: nextGoal(units)?.goal ?? null,
    tricky: trickyWords(p, 5).map(w => ({ es: w.es, en: w.en })),
    streak: liveStreak(p, now),
    quiet: activeDays === 0,
  };
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
const fmt = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });

// One headline sentence for the top of the report.
export function headline(r: WeeklyReport): string {
  if (r.quiet) return `${r.name} didn’t play this week. A few minutes together is a great way to restart.`;
  const did = [r.counts.lesson ? `finished ${plural(r.counts.lesson, "lesson")}` : null, r.newWords.length ? `met ${plural(r.newWords.length, "new word")}` : null].filter(Boolean);
  const days = r.activeDays === 7 ? "every day this week" : `on ${plural(r.activeDays, "day")} this week`;
  return `${r.name} practised Spanish ${days}${did.length ? ` and ${did.join(" and ")}` : ""}.`;
}

// Activities to try at home, built from the report (in English, for grown-ups).
export function homeIdeas(r: WeeklyReport): string[] {
  const ideas: string[] = [];
  const w = r.tricky[0] ?? r.newWords[r.newWords.length - 1];
  if (w) ideas.push(`At dinner, ask “¿Cómo se dice ‘${w.en.toLowerCase()}’?” (Answer: ${w.es})`);
  if (r.next) ideas.push(`Next goal: “${r.next.can}” Try saying “${r.next.es}” together.`);
  if (!r.counts.together) ideas.push("Try “Learn together” in the app: you take turns saying words and check each other.");
  if (r.counts.story === 0) ideas.push("Read one of the Spanish stories aloud together (Stories tab).");
  return ideas.slice(0, 3);
}

// The report as plain text, for email and sharing.
export function reportText(r: WeeklyReport): string {
  const L: string[] = [];
  L.push(`¡Hola! Here is ${r.name}’s Spanish week (${fmt(r.from)} to ${fmt(r.to)}).`, "");
  L.push(headline(r), "");
  if (!r.quiet) {
    L.push("THIS WEEK");
    L.push(`• ${r.xp} XP, ${plural(r.activeDays, "active day")}${r.streak > 1 ? `, ${r.streak}-day streak` : ""}`);
    const acts = [
      [r.counts.lesson, "lesson"], [r.counts.review, "practice mix", "practice mixes"], [r.counts.story, "story", "stories"],
      [r.counts.chant, "chant"], [r.counts.together, "Learn together session"],
    ] as [number, string, string?][];
    const done = acts.filter(([n]) => n > 0).map(([n, one, many]) => plural(n, one, many));
    if (done.length) L.push(`• ${done.join(", ")}`);
    if (r.newWords.length) L.push(`• New words: ${r.newWords.slice(0, 12).map(w => `${w.es} (${w.en})`).join(", ")}${r.newWords.length > 12 ? `, and ${r.newWords.length - 12} more` : ""}`);
    L.push("");
  }
  if (r.goalsThisWeek.length) {
    L.push(`NEW THINGS ${r.name.toUpperCase()} CAN DO`);
    for (const g of r.goalsThisWeek) L.push(`★ ${g.can} (${g.es})`);
    L.push("");
  }
  L.push(`Overall: ${r.goalsTotal.achieved} of ${r.goalsTotal.total} “I can…” goals, ${r.wordsKnown} words known well.`, "");
  if (r.tricky.length) L.push(`Words to practise: ${r.tricky.map(w => `${w.es} (${w.en})`).join(", ")}`, "");
  const ideas = homeIdeas(r);
  if (ideas.length) { L.push("TRY THIS AT HOME"); ideas.forEach(i => L.push(`• ${i}`)); L.push(""); }
  L.push("¡Hasta la semana que viene!", "Sol & Luna, ¡Hola, Amigo!");
  return L.join("\n");
}

export const reportSubject = (r: WeeklyReport) => `${r.name}’s Spanish week: ${fmt(r.from)} to ${fmt(r.to)}`;

