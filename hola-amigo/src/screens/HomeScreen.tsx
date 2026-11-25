// Home: a kid-friendly "mission control" bento dashboard + the Journey map.
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { LESSONS, WORLDS, isMilestone, lessonsInWorld, worldOf, type Lesson, type World } from "../content/index.ts";
import { getDaily, levelInfo, liveStreak, maxCompleted, sumStars, weekXP, type Progress } from "../domain/progress.ts";
import type { MissionStep } from "../lib/mission.ts";
import type { Child } from "../services/index.ts";
import { darken } from "../lib/utils.ts";
import { Stars } from "../components/ui.tsx";
import { Icon } from "../components/Icon.tsx";
import { WorldScene } from "../components/WorldScene.tsx";
import { ActivityFeed, AgentPanel, KpiTile, MasteryCard, QuestsCard, WeeklyChart } from "../components/Widgets.tsx";

const EASE = [0.22, 1, 0.36, 1];


function greetingFor(name: string) {
  const h = new Date().getHours();
  return h < 12 ? `¡Buenos días, ${name}!` : h < 19 ? `¡Buenas tardes, ${name}!` : `¡Buenas noches, ${name}!`;
}

function NextCard({ lesson, label, onClick }: { lesson: Lesson; label: string; onClick: () => void }) {
  const world = worldOf(lesson.id);
  const c = world?.color || "#7C6CF2";
  return <motion.button type="button" className="next-card" onClick={onClick} style={{ "--c1": c, "--edge-c": darken(c, 0.68) }}
    initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: EASE, delay: 0.05 }} whileHover={{ y: -3 }}>
    <div className="next-card__scene">{world && <WorldScene world={world} height={110} />}</div>
    <div className="next-card__top"><span className="next-card__tag">{label}</span></div>
    <div className="row" style={{ position: "relative", gap: 14 }}>
      <motion.div className="next-card__emoji" aria-hidden="true" animate={{ rotate: [0, -6, 6, 0], y: [0, -3, 0] }} transition={{ duration: 2.6, repeat: Infinity, repeatDelay: 1.2 }}>
        {isMilestone(lesson.id) ? "🏆" : lesson.emoji}
      </motion.div>
      <div className="grow">
        <div className="display" style={{ fontSize: 28 }}>{lesson.title}</div>
        <div className="small" style={{ fontWeight: 800, opacity: 0.92 }}>{lesson.subtitle} · {world?.name}</div>
      </div>
    </div>
    <div className="next-card__words" aria-label="Words in this lesson">
      {lesson.words.slice(0, 4).map((w, i) => <motion.span key={w.es} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.08 }}>{w.emoji} {w.es}</motion.span>)}
      {lesson.words.length > 4 && <span>+{lesson.words.length - 4}</span>}
    </div>
    <span className="next-card__play"><Icon name="play" size={16} fill />Play lesson</span>
  </motion.button>;
}

// One world's winding path of lesson stones.
interface MapProps { stars: Record<string, number>; unlockedUpTo: number; currentId: number | null; onStart: (l: Lesson) => void }
function WorldPath({ world, stars, unlockedUpTo, currentId, onStart }: MapProps & { world: World }) {
  const lessons = lessonsInWorld(world);
  const earned = lessons.reduce((a, l) => a + (stars[l.id] || 0), 0);
  const max = lessons.length * 3;
  const locked = world.range[0] > unlockedUpTo;
  const GAP = 118, TOP = 58, BOTTOM = 26;
  const height = lessons.length * GAP + TOP + BOTTOM;
  const xs = [50, 76, 50, 24];
  const stones = lessons.map((l, i) => ({ l, x: xs[i % 4], y: TOP + (i + 0.5) * GAP }));
  const pathTo = (n: number) => stones.slice(0, n).reduce((d, p, i) => {
    if (!i) return `M ${p.x} ${p.y}`;
    const prev = stones[i - 1], mid = (prev.y + p.y) / 2;
    return `${d} C ${prev.x} ${mid}, ${p.x} ${mid}, ${p.x} ${p.y}`;
  }, "");
  const reached = lessons.filter(l => l.id <= unlockedUpTo).length;

  return <div className={`world ${locked ? "is-locked" : ""}`} style={{ "--world-color": world.color }}>
    <div className="world__banner">
      <div className="world__banner-scene"><WorldScene world={world} height={150} /></div>
      <div className="world__banner-info">
        <div className="world__emoji" aria-hidden="true">{world.emoji}</div>
        <div className="grow">
          <div className="world__name">{world.name}</div>
          <div className="world__desc">{world.desc}</div>
          <div className="world__meter"><motion.div initial={{ width: 0 }} animate={{ width: `${(earned / max) * 100}%` }} transition={{ duration: 0.9, ease: EASE }} /></div>
        </div>
        <div className="world__count">{earned}/{max} ★</div>
      </div>
    </div>
    <div className="world__path" style={{ height }}>
      {(world.deco || []).map((e, i) => <div key={i} className="world__deco" aria-hidden="true"
        style={{ left: `${[4, 86, 8, 82][i % 4]}%`, top: 40 + ((i * 151) % Math.max(1, height - 90)), animationDelay: `${-i * 1.1}s` }}>{e}</div>)}
      <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" width="100%" height={height} style={{ position: "absolute", inset: 0 }} aria-hidden="true">
        <path d={pathTo(stones.length)} fill="none" stroke="var(--track)" strokeWidth="16" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        {reached > 1 && <>
          <path d={pathTo(reached)} fill="none" stroke={world.color} strokeOpacity="0.45" strokeWidth="16" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          <path className="path-flow" d={pathTo(reached)} fill="none" stroke="#fff" strokeOpacity="0.9" strokeWidth="3.5" strokeLinecap="round" strokeDasharray="0.1 14" vectorEffect="non-scaling-stroke" />
        </>}
      </svg>
      {stones.map(({ l, x, y }, i) => {
        const s = stars[l.id] || 0;
        const ms = isMilestone(l.id);
        const unlocked = l.id <= unlockedUpTo;
        const current = l.id === currentId;
        const size = ms ? 86 : 74;
        const cls = !unlocked ? "stone--locked" : ms ? "stone--milestone" : s > 0 ? "stone--done" : "";
        return <div key={l.id} className="stone-wrap" style={{ left: `${x}%`, top: y - size / 2 }} data-current={current || undefined}>
          {current && <div className="vamos">¡VAMOS!</div>}
          <motion.button type="button" className={`stone ${cls}`} style={{ "--size": `${size}px` }}
            initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: "spring", stiffness: 380, damping: 18, delay: i * 0.045 }}
            disabled={!unlocked} onClick={() => onStart(l)}
            aria-label={unlocked ? `Lesson ${l.id}: ${l.subtitle}. ${s} of 3 stars` : `Lesson ${l.id}, locked`}>
            {current && <span className="stone__orbit" />}
            {unlocked ? <span className="stone__emoji" aria-hidden="true">{ms ? "🏆" : l.emoji}</span> : <Icon name="lock" size={24} />}
            {unlocked && s > 0 && <span className="stone__check" aria-hidden="true"><Icon name="check" size={14} stroke={3.5} /></span>}
          </motion.button>
          <div className="stone__label">{l.id}. {l.subtitle}</div>
          {unlocked && <Stars count={s} />}
        </div>;
      })}
      {locked && <div className="locked-note">
        <div style={{ fontSize: 30 }}>🔒</div>
        <div style={{ fontWeight: 900 }}>Finish {worldOf(world.range[0] - 1)?.name || "the world before"} to unlock</div>
      </div>}
    </div>
  </div>;
}

function Journey({ stars, unlockedUpTo, currentId, onStart }: MapProps) {
  const currentWorld = worldOf(currentId || unlockedUpTo) || WORLDS[0];
  const [wid, setWid] = useState(currentWorld.id);
  const world = WORLDS.find(w => w.id === wid) ?? WORLDS[0];
  const tabs = useRef<HTMLDivElement>(null);
  useEffect(() => { tabs.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ inline: "center", block: "nearest" }); }, [wid]);
  const go = (d: number) => setWid(id => Math.min(WORLDS.length, Math.max(1, id + d)));

  return <section className="card journey" aria-label="Journey map">
    <div className="journey__head">
      <div className="widget__title" style={{ fontSize: 16 }}><Icon name="map" size={19} />Your journey</div>
      <span className="small muted" style={{ marginLeft: "auto" }}>World {wid} of {WORLDS.length}</span>
      <button type="button" className="icon-btn" style={{ width: 36, height: 36 }} onClick={() => go(-1)} disabled={wid === 1} aria-label="Previous world"><Icon name="chevronLeft" size={18} /></button>
      <button type="button" className="icon-btn" style={{ width: 36, height: 36 }} onClick={() => go(1)} disabled={wid === WORLDS.length} aria-label="Next world"><Icon name="chevronRight" size={18} /></button>
    </div>
    <div className="world-tabs" ref={tabs} role="tablist">
      {WORLDS.map(w => {
        const ls = lessonsInWorld(w);
        const pct = ls.reduce((a, l) => a + (stars[l.id] || 0), 0) / (ls.length * 3);
        const locked = w.range[0] > unlockedUpTo;
        const C = 2 * Math.PI * 13;
        return <button key={w.id} type="button" role="tab" aria-selected={w.id === wid} className={`world-tab ${locked ? "is-locked" : ""}`} style={{ "--wc": w.color }} onClick={() => setWid(w.id)}>
          {w.id === wid && <motion.span layoutId="world-tab-bg" className="world-tab__bg" transition={{ type: "spring", stiffness: 500, damping: 40 }} />}
          <span className="world-tab__ring">
            <svg width="30" height="30" viewBox="0 0 30 30" aria-hidden="true">
              <circle cx="15" cy="15" r="13" fill="none" stroke="var(--track)" strokeWidth="3" />
              <circle cx="15" cy="15" r="13" fill="none" stroke={w.color} strokeWidth="3" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - pct)} transform="rotate(-90 15 15)" />
            </svg>
            {locked ? "🔒" : w.emoji}
          </span>
          {w.name}
        </button>;
      })}
    </div>
    <AnimatePresence mode="wait">
      <motion.div key={wid} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.28, ease: EASE }}>
        <WorldPath world={world} stars={stars} unlockedUpTo={unlockedUpTo} currentId={currentId} onStart={onStart} />
      </motion.div>
    </AnimatePresence>
  </section>;
}

export function HomeScreen({ child, progress, onStartLesson, onOpenLesson, onClaim, onSearch, onMission }: {
  child: Child; progress: Progress; onStartLesson: (l: Lesson) => void; onOpenLesson: (l: Lesson) => void;
  onClaim: () => void; onSearch: () => void; onMission: (s: MissionStep) => void;
}) {
  const stars = progress.stars || {};
  const done = maxCompleted(stars);
  const unlockedUpTo = Math.min(LESSONS.length, done + 1);
  const current = LESSONS.find(l => l.id === unlockedUpTo) || LESSONS[LESSONS.length - 1];
  const allDone = done >= LESSONS.length && stars[current.id] > 0;
  const week = weekXP(progress);
  const today = week[6].xp;
  const words = Object.values(progress.wordMemory);
  const strong = words.filter(w => w.box >= 3).length;
  const daily = getDaily(progress);
  const streak = liveStreak(progress);
  const info = levelInfo(progress.xp);
  const label = allDone ? "ALL 100 DONE · PLAY AGAIN" : done === 0 ? "START YOUR ADVENTURE" : `UP NEXT · LESSON ${current.id}`;
  const dateStr = new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" });

  return <div style={{ paddingTop: 4 }}>
    <motion.div className="dash-head" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
      <div>
        <div className="eyebrow">{dateStr} · Level {info.level}</div>
        <h1 className="h1" style={{ marginTop: 4 }}>{greetingFor(child.name)}</h1>
      </div>
      <button type="button" className="searchbar dash-head__search" onClick={onSearch}>
        <Icon name="sparkles" size={18} style={{ color: "var(--sun)" }} />Ask Sol: how do you say…?
      </button>
    </motion.div>

    <div className="bento">
      <div className="l-7"><AgentPanel progress={progress} onAction={onMission} /></div>
      <div className="l-5"><NextCard lesson={current} label={label} onClick={() => onStartLesson(current)} /></div>

      <div className="xs-6 l-3"><KpiTile icon="bolt" color="var(--gold)" label="XP today" value={today} sub={`${week.reduce((a, d) => a + d.xp, 0)} XP this week`} spark={week.map(d => d.xp)} delay={0.05} /></div>
      <div className="xs-6 l-3"><KpiTile icon="flame" color="var(--fire)" label="Day streak" value={streak} sub={`Best combo: ${progress.bestCombo || 0} in a row`} delay={0.1}
        footer={<div className="kpi-week">{week.map((d, i) => <span key={d.key} className={`${d.xp ? "on" : ""} ${i === 6 ? "today" : ""}`} title={`${d.date.toLocaleDateString(undefined, { weekday: "long" })}: ${d.xp} XP`} />)}</div>} /></div>
      <div className="xs-6 l-3"><KpiTile icon="brain" color="var(--luna)" label="Words met" value={words.length} sub={`${strong} strong · ${daily.count}/${daily.goal} activities today`} delay={0.15}
        footer={<div className="kpi-meter"><div style={{ width: `${words.length ? (strong / words.length) * 100 : 0}%`, background: "var(--luna)" }} /></div>} /></div>
      <div className="xs-6 l-3"><KpiTile icon="star" color="var(--sun)" label="Stars" value={sumStars(progress)} sub={`of ${LESSONS.length * 3} · ${Object.keys(stars).length} lessons done`} delay={0.2}
        footer={<div className="kpi-meter"><div style={{ width: `${(sumStars(progress) / (LESSONS.length * 3)) * 100}%`, background: "var(--sun)" }} /></div>} /></div>

      <div className="l-8"><Journey stars={stars} unlockedUpTo={unlockedUpTo} currentId={allDone ? null : current.id} onStart={l => (stars[l.id] ? onOpenLesson(l) : onStartLesson(l))} /></div>
      <div className="l-4 bento-col bento-col--split">
        <QuestsCard progress={progress} onClaim={onClaim} />
        <ActivityFeed progress={progress} />
        <WeeklyChart progress={progress} />
        <MasteryCard progress={progress} />
      </div>
    </div>
  </div>;
}

