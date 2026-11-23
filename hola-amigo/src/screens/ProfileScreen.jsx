import { LESSONS } from "../data/course.js";
import { liveStreak } from "../lib/db.js";
import { countLessons, sumStars } from "../lib/utils.js";
import { Button, Card, ProgressBar } from "../components/ui.jsx";

export function ProfileScreen({ child, parent, progress, onBack, onTrophies, onSwitchChild }) {
  const lessons = countLessons(progress);
  const words = Object.keys(progress.wordMemory || {}).length;
  const pct = lessons / LESSONS.length;
  const stats = [
    { v: sumStars(progress), l: "Stars", c: "var(--sun-d)", bg: "var(--sun-l)" },
    { v: lessons, l: "Lessons", c: "var(--mint-d)", bg: "var(--mint-l)" },
    { v: words, l: "Words", c: "var(--sky-d)", bg: "var(--sky-l)" },
    { v: `🔥${liveStreak(progress)}`, l: "Streak", c: "var(--fire)", bg: "#fff0e3" },
  ];
  return <div className="app-bg">
    <div className="page page--narrow">
      <Button size="sm" onClick={onBack} style={{ marginBottom: 14 }}>← Map</Button>
      <Card className="card--pad-lg text-center">
        <div className="profile-tile__avatar" style={{ width: 104, height: 104, fontSize: 64, margin: "0 auto 10px" }}>{child.avatar}</div>
        <h1 className="h2">{child.name}</h1>
        <p className="small muted">Learning with {parent.name}</p>
        <div className="grid-4" style={{ margin: "20px 0" }}>
          {stats.map(s => <div key={s.l} className="stat" style={{ background: s.bg }}><div className="stat__value" style={{ color: s.c, fontSize: 22 }}>{s.v}</div><div className="stat__label">{s.l}</div></div>)}
        </div>
        <ProgressBar value={pct} color="var(--sun)" label="Course progress" />
        <p className="small muted" style={{ margin: "8px 0 20px" }}>{Math.round(pct * 100)}% of the course complete</p>
        <div className="stack">
          <Button variant="luna" block onClick={onTrophies}>🏆 Trophy shelf</Button>
          <Button block onClick={onSwitchChild}>👥 Switch learner</Button>
        </div>
      </Card>
    </div>
  </div>;
}
