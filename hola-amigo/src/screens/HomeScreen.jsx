import { useEffect, useMemo, useRef } from "react";
import { LESSONS, WORLDS, isMilestone, lessonsInWorld } from "../data/course.js";
import { getDaily, getDueWords, liveStreak } from "../lib/db.js";
import { darken, sumStars } from "../lib/utils.js";
import { pickGreeting } from "../lib/greeting.js";
import { Card, Clouds, Stars } from "../components/ui.jsx";
import { Mascot, Luna, Sol } from "../components/Mascots.jsx";
import { WorldScene } from "../components/WorldScene.jsx";

// Highest lesson id with at least one star (0 if none).
export const maxCompleted = stars => Object.keys(stars).reduce((m, id) => Math.max(m, Number(id)), 0);

function DailyRing({ daily }) {
  const R = 24, C = 2 * Math.PI * R;
  const pct = Math.min(1, daily.count / daily.goal);
  return <svg width="60" height="60" viewBox="0 0 60 60" aria-hidden="true" style={{ flexShrink: 0 }}>
    <circle cx="30" cy="30" r={R} fill="none" stroke="var(--line)" strokeWidth="7" />
    <circle cx="30" cy="30" r={R} fill="none" stroke={daily.met ? "var(--mint)" : "var(--sun)"} strokeWidth="7" strokeLinecap="round"
      strokeDasharray={C} strokeDashoffset={C * (1 - pct)} transform="rotate(-90 30 30)" style={{ transition: "stroke-dashoffset .6s" }} />
    <text x="30" y="31" textAnchor="middle" dominantBaseline="central" fontFamily="var(--font-display)" fontWeight="600" fontSize="15" fill="var(--ink)">
      {daily.met ? "✓" : `${daily.count}/${daily.goal}`}
    </text>
  </svg>;
}

function World({ world, stars, unlockedUpTo, currentId, onStart, currentRef }) {
  const lessons = lessonsInWorld(world);
  const earned = lessons.reduce((a, l) => a + (stars[l.id] || 0), 0);
  const max = lessons.length * 3;
  const locked = world.range[0] > unlockedUpTo;

  const GAP = 118, TOP = 40, BOTTOM = 30;
  const height = lessons.length * GAP + TOP + BOTTOM;
  const xs = [50, 74, 50, 26]; // a gentle S-curve
  const stones = lessons.map((l, i) => ({ l, x: xs[i % 4], y: TOP + (i + 0.5) * GAP }));
  let d = "";
  stones.forEach((p, i) => {
    if (!i) { d = `M ${p.x} ${p.y}`; return; }
    const prev = stones[i - 1], mid = (prev.y + p.y) / 2;
    d += ` C ${prev.x} ${mid}, ${p.x} ${mid}, ${p.x} ${p.y}`;
  });

  return <section className={`world ${locked ? "is-locked" : ""}`} style={{ "--world-color": world.color, "--world-tint": world.tint }} aria-label={world.name}>
    <WorldScene world={world} height={58} />
    <div className="world__banner">
      <div className="world__emoji" aria-hidden="true">{locked ? "🔒" : world.emoji}</div>
      <div className="grow">
        <div className="world__name">{world.name}</div>
        <div className="world__desc">{world.desc}</div>
        <div className="world__meter"><div style={{ width: `${(earned / max) * 100}%` }} /></div>
      </div>
      <div className="world__count">{earned}/{max} ⭐</div>
    </div>
    <div className="world__path" style={{ height }}>
      {(world.deco || []).map((e, i) => <div key={i} className="world__deco" aria-hidden="true"
        style={{ left: `${[6, 84, 10, 80][i % 4]}%`, top: 30 + ((i * 151) % Math.max(1, height - 70)) }}>{e}</div>)}
      <svg viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" width="100%" height={height} style={{ position: "absolute", inset: 0 }} aria-hidden="true">
        <path d={d} fill="none" stroke="#fff" strokeOpacity="0.9" strokeWidth="18" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
        <path d={d} fill="none" stroke={darken(world.color)} strokeOpacity="0.35" strokeWidth="5" strokeLinecap="round" strokeDasharray="0.1 14" vectorEffect="non-scaling-stroke" />
      </svg>
      {stones.map(({ l, x, y }, i) => {
        const s = stars[l.id] || 0;
        const ms = isMilestone(l.id);
        const unlocked = l.id <= unlockedUpTo;
        const current = l.id === currentId;
        const size = ms ? 86 : 74;
        const cls = !unlocked ? "stone--locked" : ms ? "stone--milestone" : s > 0 ? "stone--done" : "";
        return <div key={l.id} className="stone-wrap" style={{ left: `${x}%`, top: y - size / 2 }} ref={current ? currentRef : undefined}>
          {current && <div className="vamos">¡VAMOS!</div>}
          <button type="button" className={`stone ${cls}`} style={{ "--size": `${size}px`, animationDelay: `${i * 0.04}s` }}
            disabled={!unlocked} onClick={() => onStart(l)}
            aria-label={unlocked ? `Lesson ${l.id}: ${l.subtitle}. ${s} of 3 stars` : `Lesson ${l.id}, locked`}>
            {current && <span className="stone__ring" />}
            <span className="stone__emoji" aria-hidden="true">{!unlocked ? "🔒" : ms ? "🏆" : l.emoji}</span>
            {unlocked && s > 0 && <span className="stone__check" aria-hidden="true">✓</span>}
          </button>
          {unlocked && <>
            <div className="stone__label">{l.id}. {l.subtitle}</div>
            <Stars count={s} />
          </>}
        </div>;
      })}
    </div>
  </section>;
}

export function HomeScreen({ child, progress, previousVisit, onStartLesson, onOpenLesson, onReview, onProfile, onTrophies, onSwitchChild }) {
  const stars = progress.stars || {};
  const done = maxCompleted(stars);
  const unlockedUpTo = Math.min(LESSONS.length, done + 1);
  const current = LESSONS.find(l => l.id === unlockedUpTo) || LESSONS[LESSONS.length - 1];
  const daily = getDaily(progress);
  const due = getDueWords(progress).length;
  const streak = liveStreak(progress);
  const greeting = useMemo(() => pickGreeting(progress, child.name, previousVisit), [child.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const currentRef = useRef(null);

  // Bring the child's next stone into view (but not for brand-new learners — they see the welcome first).
  useEffect(() => {
    if (done > 0) currentRef.current?.scrollIntoView({ block: "center", behavior: "instant" });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const allDone = done >= LESSONS.length && stars[current.id] > 0;
  const currentWorld = WORLDS.find(w => current.id >= w.range[0] && current.id <= w.range[1]);

  return <div className="app-bg">
    <Clouds />
    <header className="topbar">
      <div className="topbar__inner">
        <button type="button" className="avatar-btn grow" onClick={onProfile} aria-label="My profile">
          <span className="avatar-bubble">{child.avatar}</span>
          <span className="avatar-name">{child.name}</span>
        </button>
        <span className={`pill pill--fire ${streak ? "" : "pill--dim"}`} title="Day streak" aria-label={`${streak}-day streak`}>🔥 {streak}</span>
        <span className="pill pill--sun" title="Stars" aria-label={`${sumStars(progress)} stars`}>⭐ {sumStars(progress)}</span>
        <button type="button" className="pill pill--luna" onClick={onTrophies} title="Trophy shelf" aria-label="Trophy shelf">🏆 {(progress.badges || []).length}</button>
        <button type="button" className="icon-btn" onClick={onSwitchChild} title="Switch learner" aria-label="Switch learner">👥</button>
      </div>
    </header>

    <main className="page" style={{ paddingTop: 18 }}>
      <Card pad={false} className="hero card--glass">
        <div className="float"><Mascot who={greeting.who} mood={greeting.mood} size={64}
          outfit={greeting.who === "sol" ? progress.solOutfit : progress.lunaOutfit} /></div>
        <div className="speech-bubble">{greeting.text}</div>
      </Card>

      <button type="button" className="continue-card" onClick={() => onStartLesson(current)}
        style={{ "--c1": currentWorld?.color || "#FFB020", "--c2": darken(currentWorld?.color || "#FFB020", 0.85), "--edge": darken(currentWorld?.color || "#FFB020", 0.62), marginBottom: 14 }}>
        <div className="continue-card__icon" aria-hidden="true">{isMilestone(current.id) ? "🏆" : current.emoji}</div>
        <div className="grow" style={{ position: "relative", zIndex: 1 }}>
          <div className="tiny" style={{ fontWeight: 900, letterSpacing: ".12em", opacity: 0.9 }}>
            {allDone ? "ALL 100 DONE! PLAY AGAIN" : done === 0 ? "START YOUR ADVENTURE" : `UP NEXT · LESSON ${current.id}`}
          </div>
          <div className="display" style={{ fontSize: 22, marginTop: 2 }}>{current.title}</div>
          <div className="small" style={{ fontWeight: 700, opacity: 0.92 }}>{current.subtitle}</div>
        </div>
        <div className="continue-card__play" aria-hidden="true">▶</div>
      </button>

      <div className="grid-2" style={{ marginBottom: 6 }}>
        <Card pad={false} className="quick-card">
          <DailyRing daily={daily} />
          <div>
            <div className="quick-card__title">{daily.met ? "Goal done! 🎉" : "Daily goal"}</div>
            <div className="quick-card__sub muted">{daily.met ? "Amazing work today" : `${daily.goal - daily.count} more activit${daily.goal - daily.count === 1 ? "y" : "ies"}`}</div>
          </div>
        </Card>
        <Card as="button" type="button" pad={false} className={`quick-card ${due ? "quick-card--luna" : ""}`} onClick={onReview}>
          <div style={{ fontSize: 34 }} aria-hidden="true">🔁</div>
          <div>
            <div className="quick-card__title">Daily review</div>
            <div className="quick-card__sub">{due ? `${due} word${due === 1 ? "" : "s"} to refresh` : "Keep words fresh"}</div>
          </div>
        </Card>
      </div>

      {WORLDS.map(w => <World key={w.id} world={w} stars={stars} unlockedUpTo={unlockedUpTo} currentId={allDone ? null : current.id}
        onStart={l => (stars[l.id] ? onOpenLesson(l) : onStartLesson(l))} currentRef={currentRef} />)}
    </main>

    <footer className="night-footer">
      {[8, 22, 38, 55, 70, 86, 94].map((x, i) => <span key={i} className="twinkle-dot" style={{ left: `${x}%`, top: `${12 + (i * 23) % 70}%`, animationDelay: `${i * 0.4}s` }} />)}
      <div className="row row--center" style={{ gap: 10, marginBottom: 10 }}>
        <Sol size={44} outfit={progress.solOutfit} /><Luna size={44} outfit={progress.lunaOutfit} />
      </div>
      <p className="display" style={{ fontSize: 18 }}>Keep going, {child.name}!</p>
      <p className="small" style={{ opacity: 0.65, fontWeight: 700, marginTop: 4 }}>Sol y Luna are so proud of you ✨</p>
    </footer>
  </div>;
}
