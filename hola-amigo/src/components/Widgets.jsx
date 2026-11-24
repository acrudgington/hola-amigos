// Dashboard widgets: level, streak, weekly XP chart, word mastery, quests,
// KPI tiles with sparklines, Sol's mission plan and the activity feed.
import { useEffect, useState } from "react";
import { AnimatePresence, animate, motion, useMotionValue, useTransform } from "framer-motion";
import { dailyQuests, levelInfo, levelTitle, liveStreak, timeAgo, weekXP, XP } from "../lib/db.js";
import { planMission } from "../lib/mission.js";
import { Card } from "./ui.jsx";
import { Icon } from "./Icon.jsx";
import { Sol } from "./Mascots.jsx";

const EASE = [0.22, 1, 0.36, 1];

// Number that counts up/down smoothly when it changes.
export function AnimatedNumber({ value, duration = 0.9 }) {
  const mv = useMotionValue(value);
  const rounded = useTransform(mv, v => Math.round(v).toLocaleString());
  useEffect(() => {
    const c = animate(mv, value, { duration, ease: EASE });
    return c.stop;
  }, [value, duration, mv]);
  return <motion.span>{rounded}</motion.span>;
}

function Title({ icon, children, right }) {
  return <div className="widget__head">
    <div className="widget__title"><Icon name={icon} size={18} />{children}</div>
    {right}
  </div>;
}

export function LevelRing({ xp, size = 84 }) {
  const info = levelInfo(xp);
  const R = size / 2 - 7, C = 2 * Math.PI * R;
  return <div className="level-ring" style={{ width: size, height: size }}>
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
      <circle cx={size / 2} cy={size / 2} r={R} fill="none" stroke="var(--track)" strokeWidth="8" />
      <motion.circle cx={size / 2} cy={size / 2} r={R} fill="none" stroke="var(--sun)" strokeWidth="8" strokeLinecap="round"
        strokeDasharray={C} initial={{ strokeDashoffset: C }} animate={{ strokeDashoffset: C * (1 - info.pct) }}
        transition={{ duration: 1.2, ease: EASE }} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
    </svg>
    <div className="level-ring__num"><div><small>LEVEL</small><b>{info.level}</b></div></div>
  </div>;
}

export function LevelCard({ progress }) {
  const info = levelInfo(progress.xp);
  return <Card className="widget">
    <div className="row" style={{ gap: 16 }}>
      <LevelRing xp={progress.xp} />
      <div className="grow">
        <div className="eyebrow">{levelTitle(info.level)}</div>
        <div className="display" style={{ fontSize: 30, marginTop: 2 }}><AnimatedNumber value={progress.xp || 0} /> <span className="small muted">XP</span></div>
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
    <Title icon="flame" right={<div className="display" style={{ fontSize: 20, color: "var(--fire)" }}>{streak} {streak === 1 ? "day" : "days"}</div>}>Streak</Title>
    <div className="week">
      {week.map((d, i) => <div key={d.key}>
        <div className="week__day">{DAY_LETTERS[d.date.getDay()]}</div>
        <motion.div className={`week__dot ${d.xp > 0 ? "is-on" : ""} ${i === 6 ? "is-today" : ""}`}
          initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.04 * i, type: "spring", stiffness: 420, damping: 20 }}
          title={`${d.date.toLocaleDateString(undefined, { weekday: "long" })}: ${d.xp} XP`}>
          {d.xp > 0 ? <Icon name="flame" size={15} fill /> : null}
        </motion.div>
      </div>)}
    </div>
  </Card>;
}

// Single-series bar chart: one hue, today emphasised and labelled, tooltips on hover/focus.
export function WeeklyChart({ progress }) {
  const week = weekXP(progress);
  const max = Math.max(50, ...week.map(d => d.xp));
  const total = week.reduce((a, d) => a + d.xp, 0);
  return <Card className="widget">
    <Title icon="chart" right={<div className="small muted">{total.toLocaleString()} XP</div>}>XP this week</Title>
    <div className="bars" role="img" aria-label={`XP per day this week: ${week.map(d => `${d.date.toLocaleDateString(undefined, { weekday: "short" })} ${d.xp}`).join(", ")}`}>
      {week.map((d, i) => {
        const h = (d.xp / max) * 100;
        const today = i === 6;
        return <div key={d.key} className={`bar ${today ? "is-today" : ""}`} tabIndex={0}>
          <span className="bar__tip">{d.date.toLocaleDateString(undefined, { weekday: "short", day: "numeric" })} · {d.xp} XP</span>
          {today && d.xp > 0 && <span className="bar__val" style={{ bottom: `calc(${h}% + 4px)` }}>{d.xp}</span>}
          <motion.div className="bar__fill" initial={{ height: 0 }} animate={{ height: `${Math.max(h, d.xp ? 3 : 1.5)}%` }}
            transition={{ delay: 0.05 * i, duration: 0.6, ease: EASE }} />
        </div>;
      })}
    </div>
    <div className="bars__axis" aria-hidden="true">{week.map((d, i) => <span key={d.key} style={i === 6 ? { color: "var(--text)" } : undefined}>{i === 6 ? "Today" : DAY_LETTERS[d.date.getDay()]}</span>)}</div>
  </Card>;
}

// Words by memory box: ordinal, so one hue from new → mastered.
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
    <Title icon="brain" right={<div className="small muted">{words.length} words</div>}>Word power</Title>
    {words.length ? <>
      <div className="mastery" role="img" aria-label={BOXES.map((b, i) => `${b.label}: ${counts[i]}`).join(", ")}>
        {BOXES.map((b, i) => counts[i] > 0 && <motion.div key={b.box} className="mastery__seg" title={`${b.label}: ${counts[i]} words`}
          style={{ background: b.c }} initial={{ flexGrow: 0 }} animate={{ flexGrow: counts[i] }} transition={{ duration: 0.8, delay: 0.08 * i }} />)}
      </div>
      <div className="legend">{BOXES.map((b, i) => <span key={b.box}><i style={{ background: b.c }} />{b.label} {counts[i]}</span>)}</div>
    </> : <p className="small muted">Play a lesson to start growing your word power!</p>}
  </Card>;
}

export function QuestsCard({ progress, onClaim }) {
  const { quests, allDone, claimed } = dailyQuests(progress);
  return <Card className="widget">
    <Title icon="target" right={<button type="button" className={`chest ${allDone && !claimed ? "is-ready" : ""}`} style={{ opacity: claimed ? 0.45 : 1 }}
        onClick={() => allDone && !claimed && onClaim?.()} disabled={!allDone || claimed}
        aria-label={claimed ? "Chest opened today" : allDone ? `Open chest for ${XP.chest} XP` : "Finish all quests to open the chest"}
        title={claimed ? "Opened! Come back tomorrow" : allDone ? `Tap to open: +${XP.chest} XP!` : "Finish all 3 quests to open"}>{claimed ? "📭" : "🎁"}</button>}>Daily quests</Title>
    {quests.map(q => {
      const done = q.value >= q.goal;
      return <div key={q.id} className={`quest ${done ? "is-done" : ""}`}>
        <div className="quest__icon">{done ? <Icon name="check" size={18} stroke={3} /> : q.emoji}</div>
        <div className="grow">
          <div className="small" style={{ fontWeight: 800, marginBottom: 6 }}>{q.label}</div>
          <div className="progress progress--thin"><div className="progress__fill" style={{ width: `${(q.value / q.goal) * 100}%`, "--fill": done ? "var(--mint)" : "var(--sun)" }} /></div>
        </div>
        <div className="tiny muted" style={{ minWidth: 44, textAlign: "right" }}>{q.value}/{q.goal}</div>
      </div>;
    })}
    {allDone && !claimed && <p className="small" style={{ fontWeight: 900, color: "var(--sun)", marginTop: 8 }}>All done! Tap the 🎁 for +{XP.chest} XP</p>}
  </Card>;
}

// Tiny trend line for KPI tiles.
export function Sparkline({ values, color = "var(--luna)", height = 34 }) {
  const w = 120, max = Math.max(1, ...values);
  const pts = values.map((v, i) => [(i / (values.length - 1)) * w, height - 3 - (v / max) * (height - 8)]);
  const d = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");
  const last = pts[pts.length - 1];
  return <svg className="kpi__spark" width="100%" height={height} viewBox={`0 0 ${w} ${height}`} preserveAspectRatio="none" aria-hidden="true">
    <path d={`${d} L${w} ${height} L0 ${height} Z`} fill={color} opacity="0.12" />
    <motion.path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke"
      initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1, ease: EASE }} />
    <circle cx={last[0]} cy={last[1]} r="3" fill={color} vectorEffect="non-scaling-stroke" />
  </svg>;
}

export function KpiTile({ icon, color, label, value, sub, spark, footer, delay = 0 }) {
  return <motion.div className="card kpi" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, duration: 0.45, ease: EASE }}>
    <div className="kpi__head"><span className="kpi__icon" style={{ background: color }}><Icon name={icon} size={17} fill /></span>{label}</div>
    <div className="kpi__value"><AnimatedNumber value={value} /></div>
    <div className="kpi__sub">{sub}</div>
    <div style={{ marginTop: "auto" }}>{spark ? <Sparkline values={spark} color={color} /> : footer}</div>
  </motion.div>;
}

// Typewriter text, re-typed whenever the message changes.
function useTyped(text, speed = 22) {
  const [n, setN] = useState(0);
  useEffect(() => {
    setN(0);
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) { setN(text.length); return; }
    const id = setInterval(() => setN(x => (x >= text.length ? (clearInterval(id), x) : x + 1)), speed);
    return () => clearInterval(id);
  }, [text, speed]);
  return text.slice(0, n);
}

// Sol, the study buddy: plans today's mission like an agent laying out its task list.
export function AgentPanel({ progress, onAction }) {
  const plan = planMission(progress);
  const typed = useTyped(plan.message);
  const typing = typed.length < plan.message.length;
  return <Card className="agent" style={{ height: "100%" }}>
    <div className="agent__head">
      <div className="agent__avatar"><Sol size={46} mood={plan.completed === plan.total ? "celebrate" : "happy"} outfit={progress.solOutfit} /></div>
      <div className="grow">
        <div className="h3">Sol · study buddy</div>
        <div className="status"><span className="status__dot" />{typing ? "Planning your day…" : "Ready"}</div>
      </div>
      <div className="small muted" style={{ textAlign: "right" }}>
        <div className="display" style={{ fontSize: 22, color: "var(--text)" }}>{plan.completed}/{plan.total}</div>steps done
      </div>
    </div>
    <div className="agent__msg" aria-live="polite">{typed}{typing && <span className="caret" />}</div>
    <ol className="steps">
      {plan.steps.map((s, i) => <motion.li key={s.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.12, ease: EASE }}>
        <button type="button" className={`step ${s.done ? "is-done" : ""} ${s.active ? "is-active" : ""}`} onClick={() => onAction(s)}>
          <span className="step__rail" />
          <span className="step__marker">{s.done ? <Icon name="check" size={16} stroke={3} /> : <Icon name={s.icon} size={15} fill={s.icon === "play"} />}</span>
          <span className="grow">
            <span className="step__title" style={{ display: "block" }}>{s.title}</span>
            <span className="step__detail">{s.detail}</span>
          </span>
          <span className={`step__tag ${s.done ? "step__tag--done" : s.active || s.ready ? "step__tag--go" : "step__tag--queued"}`}>
            {s.done ? "Done" : s.ready ? "Open!" : s.active ? "Start" : "Next"}
          </span>
        </button>
      </motion.li>)}
    </ol>
  </Card>;
}

const FEED_ICONS = { lesson: "📘", review: "🔁", badge: "🏆", sticker: "✨", outfit: "🎩", level: "⬆️", chest: "🎁", combo: "🔥", start: "👋" };

export function ActivityFeed({ progress, limit = 6 }) {
  const events = (progress.events || []).slice(0, limit);
  return <Card className="widget">
    <Title icon="clock">Activity</Title>
    {events.length ? <ul className="feed">
      <AnimatePresence initial={false}>
        {events.map(e => <motion.li key={e.t + e.type} className="feed__item" layout initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}>
          <span className="feed__icon" aria-hidden="true">{e.emoji || FEED_ICONS[e.type] || "⭐"}</span>
          <div className="grow">
            <div className="feed__text">{e.text}</div>
            <div className="feed__time">{timeAgo(e.t)}</div>
          </div>
        </motion.li>)}
      </AnimatePresence>
    </ul> : <p className="small muted">Your adventures will show up here. Start a lesson!</p>}
  </Card>;
}
