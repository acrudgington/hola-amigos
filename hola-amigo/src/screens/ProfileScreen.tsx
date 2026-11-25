import { motion } from "framer-motion";
import { LESSONS } from "../content/index.ts";
import { countLessons, levelInfo, levelTitle, liveStreak, sumStars, type Progress } from "../domain/progress.ts";
import type { Child, Parent } from "../services/index.ts";
import { Button, Card, ProgressBar } from "../components/ui.tsx";
import { AnimatedNumber, LevelRing, MasteryCard, StreakCard, WeeklyChart } from "../components/Widgets.tsx";
import { Art } from "../components/Art.tsx";

// "Me" — the child's personal stats dashboard.
export function ProfileScreen({ child, parent, progress, onTrophies, onSwitchChild }: { child: Child; parent: Parent; progress: Progress; onTrophies: () => void; onSwitchChild: () => void }) {
  const lessons = countLessons(progress);
  const words = Object.keys(progress.wordMemory || {}).length;
  const pct = lessons / LESSONS.length;
  const info = levelInfo(progress.xp);
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
        <div className="profile-tile__avatar" style={{ width: 96, height: 96, margin: 0 }}><Art e={child.avatar} size={72} eager /></div>
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
  </div>;
}
