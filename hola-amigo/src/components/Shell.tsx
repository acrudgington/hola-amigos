// Dashboard shell: sidebar (desktop) or top bar + tab bar (phones).
import type { ReactNode } from "react";
import { motion } from "framer-motion";
import type { Prefs } from "../lib/prefs.ts";
import type { Child } from "../services/index.ts";
import type { ShellView } from "../state/nav.ts";
import { getDueWords, levelInfo, liveStreak, type Progress } from "../domain/progress.ts";
import { sumStars } from "../domain/progress.ts";
import { Sol } from "./Mascots.tsx";
import { Icon } from "./Icon.tsx";
import { AnimatedNumber } from "./Widgets.tsx";
import { Art } from "./Art.tsx";

export type NavKey = ShellView | "family";
const NAV: { key: ShellView; icon: string; label: string }[] = [
  { key: "home", icon: "map", label: "Learn" },
  { key: "review", icon: "review", label: "Practise" },
  { key: "stories", icon: "book", label: "Stories" },
  { key: "trophies", icon: "trophy", label: "Trophies" },
  { key: "profile", icon: "chart", label: "Me" },
];
const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform || "");

export function PrefToggles({ prefs, onToggle }: { prefs: Prefs; onToggle: (key: keyof Prefs) => void }) {
  const night = prefs.theme === "galaxy";
  return <div className="row" style={{ gap: 8 }}>
    <button type="button" className="toggle grow" onClick={() => onToggle("theme")} aria-label={night ? "Switch to day theme" : "Switch to night theme"}>
      <Icon name={night ? "moon" : "sun"} size={16} />{night ? "Night" : "Day"}
    </button>
    <button type="button" className="toggle" onClick={() => onToggle("sound")} aria-label={prefs.sound ? "Mute sound effects" : "Turn sound effects on"} aria-pressed={prefs.sound} title="Sound effects">
      <Icon name={prefs.sound ? "volume" : "mute"} size={16} />
    </button>
    <button type="button" className={`toggle ${prefs.guide ? "toggle--on" : ""}`} onClick={() => onToggle("guide")} aria-label={prefs.guide ? "Stop reading instructions aloud" : "Read instructions aloud"} aria-pressed={prefs.guide} title="Read instructions aloud">
      <Icon name="chat" size={16} />
    </button>
  </div>;
}

interface ShellProps { child: Child; progress: Progress; active: ShellView; onNav: (k: NavKey) => void; prefs: Prefs; onToggle: (key: keyof Prefs) => void; onSearch: () => void }

function Sidebar({ child, progress, active, onNav, prefs, onToggle, due, onSearch }: ShellProps & { due: number }) {
  const info = levelInfo(progress.xp);
  return <aside className="sidebar" aria-label="Main navigation">
    <div className="brand">
      <Sol size={40} mood="happy" outfit={progress.solOutfit} />
      <div>
        <div className="brand__name">¡Hola, <span>Amigo!</span></div>
        <div className="brand__tag">Spanish mission control</div>
      </div>
    </div>
    <button type="button" className="searchbar" onClick={onSearch} style={{ marginBottom: 8 }}>
      <Icon name="search" size={17} />Ask Sol…<span className="kbd">{isMac ? "⌘K" : "Ctrl K"}</span>
    </button>
    <div className="nav-label">Menu</div>
    {NAV.map(n => <button key={n.key} type="button" className="nav-item" aria-current={active === n.key ? "page" : undefined} onClick={() => onNav(n.key)}>
      {active === n.key && <motion.span layoutId="nav-bg" className="nav-item__bg" transition={{ type: "spring", stiffness: 500, damping: 40 }}><span className="nav-item__bar" /></motion.span>}
      <Icon name={n.icon} size={19} />{n.label}
      {n.key === "review" && due > 0 && <span className="nav-item__badge">{due}</span>}
    </button>)}
    <div className="sidebar__foot">
      <PrefToggles prefs={prefs} onToggle={onToggle} />
      <button type="button" className="card avatar-btn" style={{ padding: 12, width: "100%" }} onClick={() => onNav("family")} title="Switch learner">
        <span className="avatar-bubble"><Art e={child.avatar} size={30} eager /></span>
        <span className="grow">
          <span className="avatar-name" style={{ display: "block" }}>{child.name}</span>
          <span className="tiny muted">Level {info.level}</span>
        </span>
        <Icon name="users" size={18} style={{ color: "var(--muted)" }} />
      </button>
    </div>
  </aside>;
}

function MobileTop({ child, progress, onNav, onSearch }: Pick<ShellProps, "child" | "progress" | "onNav" | "onSearch">) {
  const streak = liveStreak(progress);
  return <div className="mobile-top">
    <div className="mobile-top__inner">
      <button type="button" className="avatar-btn grow" onClick={() => onNav("family")} aria-label="Switch learner">
        <span className="avatar-bubble"><Art e={child.avatar} size={30} eager /></span>
        <span className="avatar-name">{child.name}</span>
      </button>
      <span className={`pill pill--fire ${streak ? "" : "pill--dim"}`} aria-label={`${streak}-day streak`}><Icon name="flame" size={15} fill />{streak}</span>
      <span className="pill pill--sun" aria-label={`${sumStars(progress)} stars`}><Icon name="star" size={15} fill />{sumStars(progress)}</span>
      <span className="xp-chip" aria-label={`${progress.xp || 0} XP`}><Icon name="bolt" size={15} fill /><AnimatedNumber value={progress.xp || 0} /></span>
      <button type="button" className="icon-btn" style={{ width: 36, height: 36 }} onClick={onSearch} aria-label="Ask Sol: search words"><Icon name="search" size={17} /></button>
    </div>
  </div>;
}

function TabBar({ active, onNav, due }: Pick<ShellProps, "active" | "onNav"> & { due: number }) {
  return <nav className="tabbar" aria-label="Main navigation">
    {NAV.map(n => <button key={n.key} type="button" className="tab" aria-current={active === n.key ? "page" : undefined} onClick={() => onNav(n.key)}>
      {active === n.key && <motion.span layoutId="tab-bg" className="tab__bg" transition={{ type: "spring", stiffness: 500, damping: 40 }} />}
      <Icon name={n.icon} size={22} />{n.label}
      {n.key === "review" && due > 0 && <span className="tab__dot" />}
    </button>)}
  </nav>;
}

export function Shell({ child, progress, active, onNav, prefs, onToggle, onSearch, children }: ShellProps & { children: ReactNode }) {
  const due = getDueWords(progress).length;
  return <div className="shell">
    <Sidebar child={child} progress={progress} active={active} onNav={onNav} prefs={prefs} onToggle={onToggle} due={due} onSearch={onSearch} />
    <main className="shell__main">
      <MobileTop child={child} progress={progress} onNav={onNav} onSearch={onSearch} />
      <div className="shell__inner">{children}</div>
    </main>
    <TabBar active={active} onNav={onNav} due={due} />
  </div>;
}
