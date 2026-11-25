import { motion } from "framer-motion";
import { LESSONS } from "../content/index.ts";
import { countLessons, levelInfo, levelTitle, liveStreak, sumStars, type Progress } from "../domain/progress.ts";
import type { Child, Parent } from "../services/index.ts";
import { Button, Card, ProgressBar } from "../components/ui.tsx";
import { AnimatedNumber, LevelRing, MasteryCard, StreakCard, WeeklyChart } from "../components/Widgets.tsx";
import { Art } from "../components/Art.tsx";
import { Icon } from "../components/Icon.tsx";
import { UNITS, WORLDS } from "../content/index.ts";
import { achievedGoals } from "../domain/goals.ts";
import { Modal } from "../components/ui.tsx";
import { useState } from "react";
import { AvatarMaker } from "../components/AvatarMaker.tsx";
import { Avatar } from "../components/Avatar.tsx";

// "Me" — the child's personal stats dashboard.
export function ProfileScreen({ child, parent, progress, onTrophies, onSwitchChild, onPlacement, onAvatar }: { child: Child; parent: Parent; progress: Progress; onTrophies: () => void; onSwitchChild: () => void; onPlacement: () => void; onAvatar: (code: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [look, setLook] = useState(child.avatar);
  const lessons = countLessons(progress);
  const words = Object.keys(progress.wordMemory || {}).length;
  const pct = lessons / LESSONS.length;
  const info = levelInfo(progress.xp);
  const achieved = achievedGoals(progress);
  const totalGoals = UNITS.reduce((n, u) => n + u.goals.length, 0);
  const stats = [
    { v: sumStars(progress), l: "Stars", e: "⭐", c: "var(--sun)" },
    { v: lessons, l: "Lessons", e: "📚", c: "var(--mint)" },
    { v: words, l: "Words", e: "💬", c: "var(--sky)" },
    { v: liveStreak(progress), l: "Day streak", e: "🔥", c: "var(--fire)" },
    { v: progress.bestCombo || 0, l: "Best combo", e: "⚡", c: "var(--gold)" },
    { v: (progress.badges || []).length, l: "Badges", e: "🏆", c: "var(--luna)" },
  ];
  return <div className="stack" style={{ "--gap": "16px", paddingTop: 6 }}>
    <Card className="card--pad-lg">
      <div className="row" style={{ gap: 18, flexWrap: "wrap" }}>
        <div style={{ position: "relative" }}>
          <Avatar value={child.avatar} size={96} />
          <button type="button" className="icon-btn avatar-edit" onClick={() => { setLook(child.avatar); setEditing(true); }} aria-label="Change my look" title="Change my look">✏️</button>
        </div>
        <div className="grow">
          <div className="eyebrow">{levelTitle(info.level)}</div>
          <h1 className="h1" style={{ fontSize: 34 }}>{child.name}</h1>
          <p className="small muted">Learning with {parent.name}</p>
        </div>
        <LevelRing xp={progress.xp} size={92} />
      </div>
      <div style={{ marginTop: 18 }}>
        <div className="row row--between small" style={{ fontWeight: 800, marginBottom: 6 }}>
          <span>Course progress</span><span className="muted">{Math.round(pct * 100)}%</span>
        </div>
        <ProgressBar value={pct} color="var(--sun)" label="Course progress" />
      </div>
    </Card>

    <div className="grid-3">
      {stats.map((s, i) => <motion.div key={s.l} className="stat" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
        <div style={{ fontSize: 22 }} aria-hidden="true">{s.e}</div>
        <div className="stat__value" style={{ color: s.c, marginTop: 4 }}><AnimatedNumber value={s.v} /></div>
        <div className="stat__label">{s.l}</div>
      </motion.div>)}
    </div>

    <div className="rail-inline stack" style={{ "--gap": "16px" }}>
      <WeeklyChart progress={progress} />
      <StreakCard progress={progress} />
      <MasteryCard progress={progress} />
    </div>

    <div className="grid-2">
      <Button variant="luna" block onClick={onTrophies}>🏆 Trophies</Button>
      <Button block onClick={onSwitchChild}>👥 Switch</Button>
    </div>
    <Card>
      <div className="row row--between" style={{ marginBottom: 12, alignItems: "baseline" }}>
        <div className="h3">Things I can do in Spanish</div>
        <span className="small muted mono">{achieved.length}/{totalGoals}</span>
      </div>
      {achieved.length
        ? <ul className="can-list">{achieved.slice(-6).reverse().map(g => <li key={g.goal.id}>
            <span className="goal__icon" aria-hidden="true"><Icon name="check" size={14} stroke={3.5} /></span>
            <div><div>{g.goal.can}</div><div className="goal__es" lang="es">{g.goal.es}</div></div>
          </li>)}</ul>
        : <p className="small muted">Finish a lesson and practise its words, and your first “I can…” will appear here!</p>}
    </Card>
    <Card className="row" style={{ gap: 14 }}>
      <Art e="🚀" size={44} />
      <div className="grow">
        <div className="h3">Already know some Spanish?</div>
        <div className="small muted">{progress.placement ? `Your level check put you in ${WORLDS.find(w => w.id === Math.min(WORLDS.length, progress.placement!.world + 1))?.name ?? "the first world"}. You can take it again.` : "Take the level check and skip ahead to the right place."}</div>
      </div>
      <Button size="sm" variant="luna" onClick={onPlacement}>Find my level</Button>
    </Card>
    {editing && <Modal onClose={() => setEditing(false)} labelledBy="look-title">
      <h3 id="look-title" className="h2 text-center" style={{ marginBottom: 6 }}>Change my look</h3>
      <AvatarMaker value={look} onChange={setLook} />
      <div className="row" style={{ gap: 10, marginTop: 16 }}>
        <Button block onClick={() => setEditing(false)}>Cancel</Button>
        <Button block variant="sun" onClick={() => { onAvatar(look); setEditing(false); }}>Save ✓</Button>
      </div>
    </Modal>}
  </div>;
}
