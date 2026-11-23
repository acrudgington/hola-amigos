// Dashboard shell: sidebar (desktop), stats rail (wide screens), top bar + tab bar (phones).
import { motion } from "framer-motion";
import { getDueWords, levelInfo, liveStreak } from "../lib/db.js";
import { sumStars } from "../lib/utils.js";
import { Sol } from "./Mascots.jsx";
import { LevelCard, MasteryCard, QuestsCard, StreakCard, WeeklyChart, AnimatedNumber } from "./Widgets.jsx";

const NAV = [
  { key: "home", icon: "🗺️", label: "Learn" },
  { key: "review", icon: "🔁", label: "Review" },
  { key: "trophies", icon: "🏆", label: "Trophies" },
  { key: "profile", icon: "📊", label: "Me" },
];

export function PrefToggles({ prefs, onToggle }) {
  return <div className="row" style={{ gap: 8 }}>
    <button type="button" className="toggle grow" onClick={() => onToggle("theme")} aria-label="Switch theme">
      {prefs.theme === "galaxy" ? "🌙 Galaxy" : "☀️ Daylight"}
    </button>
    <button type="button" className="toggle" onClick={() => onToggle("sound")} aria-label={prefs.sound ? "Mute sounds" : "Turn sounds on"} aria-pressed={prefs.sound}>
      {prefs.sound ? "🔊" : "🔇"}
    </button>
  </div>;
}

function Sidebar({ child, progress, active, onNav, prefs, onToggle, due }) {
  const info = levelInfo(progress.xp);
  return <aside className="sidebar" aria-label="Main navigation">
    <div className="brand">
      <Sol size={44} mood="happy" outfit={progress.solOutfit} />
      <div>
        <div className="brand__name">¡Hola, <span>Amigo!</span></div>
        <div className="brand__tag">Spanish adventures</div>
      </div>
    </div>
    {NAV.map(n => <button key={n.key} type="button" className="nav-item" aria-current={active === n.key ? "page" : undefined} onClick={() => onNav(n.key)}>
      {active === n.key && <motion.span layoutId="nav-bg" className="nav-item__bg" transition={{ type: "spring", stiffness: 500, damping: 38 }} />}
      <span className="nav-item__icon" aria-hidden="true">{n.icon}</span>{n.label}
      {n.key === "review" && due > 0 && <span className="nav-item__badge">{due}</span>}
    </button>)}
    <div className="sidebar__foot">
      <PrefToggles prefs={prefs} onToggle={onToggle} />
      <button type="button" className="card avatar-btn" style={{ padding: 12, width: "100%" }} onClick={() => onNav("family")} title="Switch learner">
        <span className="avatar-bubble">{child.avatar}</span>
        <span className="grow">
          <span className="avatar-name" style={{ display: "block" }}>{child.name}</span>
          <span className="tiny muted">Level {info.level} · switch learner</span>
        </span>
      </button>
    </div>
  </aside>;
}

function MobileTop({ child, progress, onNav }) {
  const streak = liveStreak(progress);
  return <div className="mobile-top">
    <div className="mobile-top__inner">
      <button type="button" className="avatar-btn grow" onClick={() => onNav("family")} aria-label="Switch learner">
        <span className="avatar-bubble">{child.avatar}</span>
        <span className="avatar-name">{child.name}</span>
      </button>
      <span className={`pill pill--fire ${streak ? "" : "pill--dim"}`} aria-label={`${streak}-day streak`}>🔥 {streak}</span>
      <span className="pill pill--sun" aria-label={`${sumStars(progress)} stars`}>⭐ {sumStars(progress)}</span>
      <span className="xp-chip" aria-label={`${progress.xp || 0} XP`}>⚡<AnimatedNumber value={progress.xp || 0} /></span>
    </div>
  </div>;
}

function TabBar({ active, onNav, due }) {
  return <nav className="tabbar" aria-label="Main navigation">
    {NAV.map(n => <button key={n.key} type="button" className="tab" aria-current={active === n.key ? "page" : undefined} onClick={() => onNav(n.key)}>
      {active === n.key && <motion.span layoutId="tab-bg" className="tab__bg" transition={{ type: "spring", stiffness: 500, damping: 38 }} />}
      <span className="tab__icon" aria-hidden="true">{n.icon}</span>{n.label}
      {n.key === "review" && due > 0 && <span className="tab__dot" />}
    </button>)}
  </nav>;
}

export function Rail({ progress, onClaim }) {
  return <>
    <LevelCard progress={progress} />
    <QuestsCard progress={progress} onClaim={onClaim} />
    <StreakCard progress={progress} />
    <WeeklyChart progress={progress} />
    <MasteryCard progress={progress} />
  </>;
}

export function Shell({ child, progress, active, onNav, prefs, onToggle, onClaim, children }) {
  const due = getDueWords(progress).length;
  return <div className="shell">
    <Sidebar child={child} progress={progress} active={active} onNav={onNav} prefs={prefs} onToggle={onToggle} due={due} />
    <main className="shell__main">
      <MobileTop child={child} progress={progress} onNav={onNav} />
      <div className="shell__inner">{children}</div>
    </main>
    <aside className="rail" aria-label="Your stats"><Rail progress={progress} onClaim={onClaim} /></aside>
    <TabBar active={active} onNav={onNav} due={due} />
  </div>;
}
