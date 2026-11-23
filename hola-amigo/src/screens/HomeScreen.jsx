import { useEffect, useMemo, useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { LESSONS, WORLDS, isMilestone, lessonsInWorld } from "../data/course.js";
import { getDaily, getDueWords, levelInfo } from "../lib/db.js";
import { darken } from "../lib/utils.js";
import { pickGreeting } from "../lib/greeting.js";
import { Card, Stars } from "../components/ui.jsx";
import { Mascot, Luna, Sol } from "../components/Mascots.jsx";
import { WorldScene } from "../components/WorldScene.jsx";
import { LevelCard, QuestsCard } from "../components/Widgets.jsx";

// Highest lesson id with at least one star (0 if none).
export const maxCompleted = stars => Object.keys(stars).reduce((m, id) => Math.max(m, Number(id)), 0);

function DailyRing({ daily }) {
  const R = 24, C = 2 * Math.PI * R;
  const pct = Math.min(1, daily.count / daily.goal);
  return <svg width="60" height="60" viewBox="0 0 60 60" aria-hidden="true" style={{ flexShrink: 0 }}>
    <circle cx="30" cy="30" r={R} fill="none" stroke="var(--track)" strokeWidth="7" />
    <motion.circle cx="30" cy="30" r={R} fill="none" stroke={daily.met ? "var(--mint)" : "var(--sun)"} strokeWidth="7" strokeLinecap="round"
      strokeDasharray={C} initial={{ strokeDashoffset: C }} animate={{ strokeDashoffset: C * (1 - pct) }} transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
      transform="rotate(-90 30 30)" style={{ filter: `drop-shadow(0 0 5px ${daily.met ? "rgba(46,229,157,.8)" : "rgba(255,181,71,.8)"})` }} />
    <text x="30" y="31" textAnchor="middle" dominantBaseline="central" fontFamily="var(--font-display)" fontWeight="600" fontSize="15" fill="var(--text)">
      {daily.met ? "✓" : `${daily.count}/${daily.goal}`}
    </text>
  </svg>;
}

// The big "play next" card tilts gently toward the pointer.
function ContinueCard({ lesson, world, label, onClick }) {
  const mx = useMotionValue(0), my = useMotionValue(0);
  const rx = useSpring(useTransform(my, [-0.5, 0.5], [7, -7]), { stiffness: 200, damping: 18 });
  const ry = useSpring(useTransform(mx, [-0.5, 0.5], [-9, 9]), { stiffness: 200, damping: 18 });
  const c = world?.color || "#8B7CFF";
  const move = e => {
    const r = e.currentTarget.getBoundingClientRect();
    mx.set((e.clientX - r.left) / r.width - 0.5);
    my.set((e.clientY - r.top) / r.height - 0.5);
  };
  return <div style={{ perspective: 900, marginBottom: 16 }}>
    <motion.button type="button" className="continue-card" onClick={onClick} onPointerMove={move} onPointerLeave={() => { mx.set(0); my.set(0); }}
      style={{ rotateX: rx, rotateY: ry, "--c1": c, "--c2": darken(c, 0.62), "--edge-c": darken(c, 0.45) }}
      whileTap={{ scale: 0.98 }} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ type: "spring", stiffness: 260, damping: 22 }}>
      <span className="continue-card__orb" style={{ width: 180, height: 180, right: -50, top: -70 }} />
      <span className="continue-card__orb" style={{ width: 90, height: 90, right: 90, bottom: -50 }} />
      <span className="continue-card__shine" />
      <motion.div className="continue-card__icon" aria-hidden="true" animate={{ rotate: [0, -8, 8, 0] }} transition={{ duration: 2.4, repeat: Infinity, repeatDelay: 1.5 }}>
        {isMilestone(lesson.id) ? "🏆" : lesson.emoji}
      </motion.div>
      <div className="grow" style={{ position: "relative" }}>
        <div className="tiny" style={{ fontWeight: 900, letterSpacing: ".14em", opacity: 0.9 }}>{label}</div>
        <div className="display" style={{ fontSize: 26, marginTop: 3 }}>{lesson.title}</div>
        <div className="small" style={{ fontWeight: 700, opacity: 0.92 }}>{lesson.subtitle} · {world?.name}</div>
      </div>
      <div className="continue-card__play" aria-hidden="true">▶</div>
    </motion.button>
  </div>;
}

function World({ world, stars, unlockedUpTo, currentId, onStart, currentRef }) {
  const lessons = lessonsInWorld(world);
  const earned = lessons.reduce((a, l) => a + (stars[l.id] || 0), 0);
  const max = lessons.length * 3;
  const locked = world.range[0] > unlockedUpTo;

  const GAP = 124, TOP = 48, BOTTOM = 30;
  const height = lessons.length * GAP + TOP + BOTTOM;
  const xs = [50, 75, 50, 25]; // a gentle S-curve
  const stones = lessons.map((l, i) => ({ l, x: xs[i % 4], y: TOP + (i + 0.5) * GAP }));
  const pathTo = n => stones.slice(0, n).reduce((d, p, i) => {
    if (!i) return `M ${p.x} ${p.y}`;
    const prev = stones[i - 1], mid = (prev.y + p.y) / 2;
    return `${d} C ${prev.x} ${mid}, ${p.x} ${mid}, ${p.x} ${p.y}`;
  }, "");
  const d = pathTo(stones.length);
  const reached = lessons.filter(l => l.id <= unlockedUpTo).length;
  const dDone = reached > 1 ? pathTo(reached) : "";

  return <motion.section className={`world ${locked ? "is-locked" : ""}`} style={{ "--world-color": world.color, "--world-tint": world.tint }} aria-label={world.name}
    initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-60px" }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}>
    <div className="world__scene"><WorldScene world={world} height={60} /></div>
    <div className="world__banner">
      <div className="world__emoji" aria-hidden="true">{locked ? "🔒" : world.emoji}</div>
      <div className="grow" style={{ position: "relative", zIndex: 1 }}>
        <div className="world__name">{world.name}</div>
        <div className="world__desc">{world.desc}</div>
        <div className="world__meter"><motion.div initial={{ width: 0 }} whileInView={{ width: `${(earned / max) * 100}%` }} viewport={{ once: true }} transition={{ duration: 1, delay: 0.3 }} /></div>
      </div>
      <div className="world__count">{earned}/{max} ⭐</div>
    </div>
    <div className="world__path" style={{ height }}>
      {(world.deco || []).map((e, i) => <div key={i} className="world__deco" aria-hidden="true"
        style={{ left: `${[5, 85, 9, 81][i % 4]}%`, top: 34 + ((i * 151) % Math.max(1, height - 80)), animationDelay: `${-i * 1.1}s` }}>{e}</div>)}
      <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" width="100%" height={height} style={{ position: "absolute", inset: 0 }} aria-hidden="true">
        <path d={d} fill="none" stroke="var(--track)" strokeWidth="20" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        <path d={d} fill="none" stroke="var(--border-2)" strokeWidth="4" strokeLinecap="round" strokeDasharray="0.1 14" vectorEffect="non-scaling-stroke" />
        {dDone && <>
          <path d={dDone} fill="none" stroke={world.color} strokeOpacity="0.35" strokeWidth="20" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          <path className="path-flow" d={dDone} fill="none" stroke="#fff" strokeOpacity="0.85" strokeWidth="4" strokeLinecap="round" strokeDasharray="0.1 14" vectorEffect="non-scaling-stroke" />
        </>}
      </svg>
      {stones.map(({ l, x, y }, i) => {
        const s = stars[l.id] || 0;
        const ms = isMilestone(l.id);
        const unlocked = l.id <= unlockedUpTo;
        const current = l.id === currentId;
        const size = ms ? 88 : 76;
        const cls = !unlocked ? "stone--locked" : ms ? "stone--milestone" : s > 0 ? "stone--done" : "";
        return <div key={l.id} className="stone-wrap" style={{ left: `${x}%`, top: y - size / 2 }} ref={current ? currentRef : undefined}>
          {current && <div className="vamos">¡VAMOS!</div>}
          <motion.button type="button" className={`stone ${cls}`} style={{ "--size": `${size}px` }}
            initial={{ scale: 0.5, opacity: 0 }} whileInView={{ scale: 1, opacity: 1 }} viewport={{ once: true }}
            transition={{ type: "spring", stiffness: 380, damping: 16, delay: i * 0.05 }}
            disabled={!unlocked} onClick={() => onStart(l)}
            aria-label={unlocked ? `Lesson ${l.id}: ${l.subtitle}. ${s} of 3 stars` : `Lesson ${l.id}, locked`}>
            {current && <><span className="stone__halo" /><span className="stone__orbit" /></>}
            <span className="stone__emoji" aria-hidden="true">{!unlocked ? "🔒" : ms ? "🏆" : l.emoji}</span>
            {unlocked && s > 0 && <span className="stone__check" aria-hidden="true">✓</span>}
          </motion.button>
          {unlocked && <>
            <div className="stone__label">{l.id}. {l.subtitle}</div>
            <Stars count={s} />
          </>}
        </div>;
      })}
    </div>
  </motion.section>;
}

export function HomeScreen({ child, progress, previousVisit, onStartLesson, onOpenLesson, onReview, onClaim }) {
  const stars = progress.stars || {};
  const done = maxCompleted(stars);
  const unlockedUpTo = Math.min(LESSONS.length, done + 1);
  const current = LESSONS.find(l => l.id === unlockedUpTo) || LESSONS[LESSONS.length - 1];
  const daily = getDaily(progress);
  const due = getDueWords(progress).length;
  const greeting = useMemo(() => pickGreeting(progress, child.name, previousVisit), [child.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const currentRef = useRef(null);
  const level = levelInfo(progress.xp).level;

  // Bring the child's next stone into view (new learners see the welcome first).
  useEffect(() => {
    if (done > 2) currentRef.current?.scrollIntoView({ block: "center", behavior: "instant" });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const allDone = done >= LESSONS.length && stars[current.id] > 0;
  const currentWorld = WORLDS.find(w => current.id >= w.range[0] && current.id <= w.range[1]);
  const label = allDone ? "ALL 100 DONE! PLAY AGAIN" : done === 0 ? "START YOUR ADVENTURE" : `UP NEXT · LESSON ${current.id}`;

  return <div style={{ paddingTop: 6 }}>
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <h1 className="h1" style={{ marginBottom: 4 }}>¡Hola, <span className="gradient-text">{child.name}!</span></h1>
      <p className="muted" style={{ marginBottom: 18 }}>Level {level} explorer · {Object.keys(stars).length} of {LESSONS.length} lessons done</p>
    </motion.div>

    <Card pad={false} className="hero">
      <div className="float"><Mascot who={greeting.who} mood={greeting.mood} size={70}
        outfit={greeting.who === "sol" ? progress.solOutfit : progress.lunaOutfit} /></div>
      <motion.div className="speech-bubble" initial={{ opacity: 0, x: -10, scale: 0.9 }} animate={{ opacity: 1, x: 0, scale: 1 }} transition={{ delay: 0.25, type: "spring", stiffness: 300, damping: 20 }}>
        {greeting.text}
      </motion.div>
    </Card>

    <ContinueCard lesson={current} world={currentWorld} label={label} onClick={() => onStartLesson(current)} />

    <div className="grid-2" style={{ marginBottom: 12 }}>
      <Card pad={false} className="quick-card">
        <DailyRing daily={daily} />
        <div>
          <div className="quick-card__title">{daily.met ? "Goal done! 🎉" : "Daily goal"}</div>
          <div className="quick-card__sub muted">{daily.met ? "Amazing work today" : `${daily.goal - daily.count} more to go`}</div>
        </div>
      </Card>
      <Card as="button" type="button" pad={false} className={`quick-card ${due ? "quick-card--luna" : ""}`} onClick={onReview}>
        <motion.div style={{ fontSize: 34 }} aria-hidden="true" animate={{ rotate: 360 }} transition={{ duration: 6, repeat: Infinity, ease: "linear" }}>🔁</motion.div>
        <div>
          <div className="quick-card__title">Daily review</div>
          <div className="quick-card__sub">{due ? `${due} word${due === 1 ? "" : "s"} to refresh` : "Keep words fresh"}</div>
        </div>
      </Card>
    </div>

    {/* On narrower screens the stats rail isn't visible, so show the key widgets inline. */}
    <div className="rail-inline stack" style={{ marginBottom: 4 }}>
      <LevelCard progress={progress} />
      <QuestsCard progress={progress} onClaim={onClaim} />
    </div>

    {WORLDS.map(w => <World key={w.id} world={w} stars={stars} unlockedUpTo={unlockedUpTo} currentId={allDone ? null : current.id}
      onStart={l => (stars[l.id] ? onOpenLesson(l) : onStartLesson(l))} currentRef={currentRef} />)}

    <footer className="night-footer">
      {[8, 22, 38, 55, 70, 86, 94].map((x, i) => <span key={i} className="twinkle-dot" style={{ left: `${x}%`, top: `${12 + (i * 23) % 70}%`, animationDelay: `${i * 0.4}s` }} />)}
      <div className="row row--center" style={{ gap: 10, marginBottom: 10 }}>
        <div className="float"><Sol size={50} outfit={progress.solOutfit} /></div><div className="float float--delay"><Luna size={50} outfit={progress.lunaOutfit} /></div>
      </div>
      <p className="display" style={{ fontSize: 19 }}>Keep going, {child.name}!</p>
      <p className="small" style={{ opacity: 0.7, fontWeight: 700, marginTop: 4 }}>Sol y Luna are so proud of you ✨</p>
    </footer>
  </div>;
}
