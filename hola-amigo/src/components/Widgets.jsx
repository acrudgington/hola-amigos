// Dashboard widgets: level ring, streak week, weekly XP chart, word mastery, daily quests.
import { useEffect, useId } from "react";
import { animate, motion, useMotionValue, useTransform } from "framer-motion";
import { dailyQuests, levelInfo, levelTitle, liveStreak, weekXP, XP } from "../lib/db.js";
import { Card } from "./ui.jsx";

// Number that counts up/down smoothly when it changes.
export function AnimatedNumber({ value, duration = 0.9 }) {
  const mv = useMotionValue(value);
  const rounded = useTransform(mv, v => Math.round(v).toLocaleString());
  useEffect(() => {
    const c = animate(mv, value, { duration, ease: [0.22, 1, 0.36, 1] });
    return c.stop;
  }, [value, duration, mv]);
  return <motion.span>{rounded}</motion.span>;
}

export function LevelRing({ xp, size = 84 }) {
  const info = levelInfo(xp);
  const R = size / 2 - 7, C = 2 * Math.PI * R;
  const gid = `lvl-${useId().replace(/:/g, "")}`;
  return <div className="level-ring" style={{ width: size, height: size }}>
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ffb547" /><stop offset="50%" stopColor="#ff5e8a" /><stop offset="100%" stopColor="#8b7cff" />
        </linearGradient>
      </defs>
      <circle cx={size / 2} cy={size / 2} r={R} fill="none" stroke="var(--track)" strokeWidth="8" />
      <motion.circle cx={size / 2} cy={size / 2} r={R} fill="none" stroke={`url(#${gid})`} strokeWidth="8" strokeLinecap="round"
        strokeDasharray={C} initial={{ strokeDashoffset: C }} animate={{ strokeDashoffset: C * (1 - info.pct) }}
        transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }} transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ filter: "drop-shadow(0 0 6px rgba(255,94,138,0.7))" }} />
    </svg>
    <div className="level-ring__num"><div><small>LEVEL</small><b>{info.level}</b></div></div>
  </div>;
}

export function LevelCard({ progress }) {
  const info = levelInfo(progress.xp);
  return <Card className="widget card--glow">
    <div className="row" style={{ gap: 16 }}>
      <LevelRing xp={progress.xp} />
      <div className="grow">
        <div className="eyebrow">{levelTitle(info.level)}</div>
        <div className="display" style={{ fontSize: 30, marginTop: 2 }}><span className="gradient-text"><AnimatedNumber value={progress.xp || 0} /></span> <span className="small muted">XP</span></div>
        <div className="small muted" style={{ marginTop: 2 }}>{info.toNext} XP to level {info.level + 1}</div>
      </div>
    </div>
  </Card>;
}

const DAY_LETTERS = ["S", "M", "T", "W", "T", "F", "S"];

export function StreakCard({ progress }) {
  const week = weekXP(progress);
  const streak = liveStreak(progress);
  return <Card className="widget">
    <div className="widget__head">
      <div className="widget__title">🔥 Streak</div>
      <div className="display" style={{ fontSize: 22, color: "var(--fire)" }}>{streak} {streak === 1 ? "day" : "days"}</div>
    </div>
    <div className="week">
      {week.map((d, i) => <div key={d.key}>
        <div className="week__day">{DAY_LETTERS[d.date.getDay()]}</div>
        <motion.div className={`week__dot ${d.xp > 0 ? "is-on" : ""} ${i === 6 ? "is-today" : ""}`}
          initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.05 * i, type: "spring", stiffness: 400, damping: 18 }}
          title={`${d.date.toLocaleDateString(undefined, { weekday: "long" })}: ${d.xp} XP`}>{d.xp > 0 ? "🔥" : ""}</motion.div>
      </div>)}
    </div>
  </Card>;
}

// Single-series bar chart: one hue, today emphasised, a label on today only, tooltips on hover.
export function WeeklyChart({ progress }) {
  const week = weekXP(progress);
  const max = Math.max(50, ...week.map(d => d.xp));
  const total = week.reduce((a, d) => a + d.xp, 0);
  return <Card className="widget">
    <div className="widget__head">
      <div className="widget__title">⚡ XP this week</div>
      <div className="small muted">{total.toLocaleString()} XP</div>
    </div>
    <div className="bars" role="img" aria-label={`XP per day this week: ${week.map(d => `${d.date.toLocaleDateString(undefined, { weekday: "short" })} ${d.xp}`).join(", ")}`}>
      {week.map((d, i) => {
        const h = (d.xp / max) * 100;
        const today = i === 6;
        return <div key={d.key} className={`bar ${today ? "is-today" : ""}`} tabIndex={0}>
          <span className="bar__tip">{d.date.toLocaleDateString(undefined, { weekday: "short", day: "numeric" })} · {d.xp} XP</span>
          {today && d.xp > 0 && <span className="bar__val" style={{ bottom: `calc(${h}% + 4px)` }}>{d.xp}</span>}
          <motion.div className="bar__fill" initial={{ height: 0 }} animate={{ height: `${Math.max(h, d.xp ? 3 : 1.5)}%` }}
            transition={{ delay: 0.06 * i, duration: 0.7, ease: [0.22, 1, 0.36, 1] }} />
        </div>;
      })}
    </div>
    <div className="bars__axis" aria-hidden="true">{week.map((d, i) => <span key={d.key} style={i === 6 ? { color: "var(--text)" } : undefined}>{i === 6 ? "Today" : DAY_LETTERS[d.date.getDay()]}</span>)}</div>
  </Card>;
}

// Words by memory box: ordinal, so one hue from light (new) to dark (mastered).
const BOXES = [
  { box: 1, label: "New", c: "var(--seq-1)" },
  { box: 2, label: "Learning", c: "var(--seq-2)" },
  { box: 3, label: "Growing", c: "var(--seq-3)" },
  { box: 4, label: "Strong", c: "var(--seq-4)" },
  { box: 5, label: "Mastered", c: "var(--seq-5)" },
];
export function MasteryCard({ progress }) {
  const words = Object.values(progress.wordMemory || {});
  const counts = BOXES.map(b => words.filter(w => Math.max(1, w.box || 1) === b.box).length);
  return <Card className="widget">
    <div className="widget__head">
      <div className="widget__title">🧠 Word power</div>
      <div className="small muted">{words.length} words</div>
    </div>
    {words.length ? <>
      <div className="mastery" role="img" aria-label={BOXES.map((b, i) => `${b.label}: ${counts[i]}`).join(", ")}>
        {BOXES.map((b, i) => counts[i] > 0 && <motion.div key={b.box} className="mastery__seg" title={`${b.label}: ${counts[i]} words`}
          style={{ background: b.c }} initial={{ flexGrow: 0 }} animate={{ flexGrow: counts[i] }} transition={{ duration: 0.9, delay: 0.1 * i }} />)}
      </div>
      <div className="legend">{BOXES.map((b, i) => <span key={b.box}><i style={{ background: b.c }} />{b.label} {counts[i]}</span>)}</div>
    </> : <p className="small muted">Play a lesson to start growing your word power!</p>}
  </Card>;
}

export function QuestsCard({ progress, onClaim }) {
  const { quests, allDone, claimed } = dailyQuests(progress);
  return <Card className="widget">
    <div className="widget__head">
      <div className="widget__title">📜 Daily quests</div>
      <button type="button" className={`chest ${allDone && !claimed ? "is-ready" : ""}`} style={{ background: "none", border: "none", fontSize: 30, opacity: claimed ? 0.4 : 1 }}
        onClick={() => allDone && !claimed && onClaim?.()} disabled={!allDone || claimed}
        aria-label={claimed ? "Chest opened today" : allDone ? `Open chest for ${XP.chest} XP` : "Finish all quests to open the chest"}
        title={claimed ? "Opened! Come back tomorrow" : allDone ? `Tap to open: +${XP.chest} XP!` : "Finish all 3 quests to open"}>{claimed ? "📭" : "🎁"}</button>
    </div>
    {quests.map(q => {
      const done = q.value >= q.goal;
      return <div key={q.id} className={`quest ${done ? "is-done" : ""}`}>
        <div className="quest__icon">{done ? "✓" : q.emoji}</div>
        <div className="grow">
          <div className="small" style={{ fontWeight: 800, marginBottom: 6 }}>{q.label}</div>
          <div className="progress progress--thin"><div className="progress__fill" style={{ width: `${(q.value / q.goal) * 100}%`, "--fill": done ? "var(--g-mint)" : "var(--g-sun)", "--fill-glow": done ? "rgba(46,229,157,.7)" : "rgba(255,181,71,.7)" }} /></div>
        </div>
        <div className="tiny muted" style={{ minWidth: 44, textAlign: "right" }}>{q.value}/{q.goal}</div>
      </div>;
    })}
    {allDone && !claimed && <p className="small" style={{ fontWeight: 900, color: "var(--gold)", marginTop: 8 }}>All done! Tap the 🎁 for +{XP.chest} XP</p>}
  </Card>;
}
