import { useState } from "react";
import { db, getDueWords, liveStreak } from "../lib/db.js";
import { countLessons, sumStars } from "../lib/utils.js";
import { LESSONS, WORLDS } from "../data/course.js";
import { Button, Card, Modal, ProgressBar } from "../components/ui.jsx";

function ChildReport({ child, onRemove }) {
  const p = db.getProgress(child.id);
  const stars = p.stars || {};
  const words = Object.values(p.wordMemory || {});
  const strong = words.filter(w => w.box >= 3).length;
  const due = getDueWords(p).length;
  const daysAgo = p.lastActive ? Math.floor((Date.now() - p.lastActive) / 86400000) : null;
  const active = daysAgo == null ? "Not started yet" : daysAgo === 0 ? "Active today" : daysAgo === 1 ? "Active yesterday" : `Last seen ${daysAgo} days ago`;
  const perfect = Object.values(stars).filter(s => s === 3).length;
  const started = WORLDS.filter(w => Object.keys(stars).some(id => id >= w.range[0] && id <= w.range[1]) || w.id === 1);

  return <Card style={{ marginBottom: 16 }}>
    <div className="row" style={{ marginBottom: 16 }}>
      <div className="profile-tile__avatar" style={{ width: 56, height: 56, fontSize: 34, margin: 0 }}>{child.avatar}</div>
      <div className="grow">
        <div className="h3">{child.name}</div>
        <div className="small muted">{active} · 🔥 {liveStreak(p)}-day streak</div>
      </div>
      <button type="button" className="icon-btn" onClick={() => onRemove(child)} aria-label={`Remove ${child.name}`} title="Remove">🗑️</button>
    </div>

    <div className="grid-4" style={{ marginBottom: 16 }}>
      <div className="stat" style={{ background: "var(--sel2-bg)" }}><div className="stat__value" style={{ color: "var(--sun)" }}>{sumStars(p)}</div><div className="stat__label">Stars</div></div>
      <div className="stat" style={{ background: "var(--good-bg)" }}><div className="stat__value" style={{ color: "var(--mint)" }}>{countLessons(p)}</div><div className="stat__label">Lessons</div></div>
      <div className="stat" style={{ background: "var(--sel-bg)" }}><div className="stat__value" style={{ color: "var(--sky)" }}>{words.length}</div><div className="stat__label">Words met</div></div>
      <div className="stat" style={{ background: "rgba(139,124,255,.14)" }}><div className="stat__value" style={{ color: "var(--luna)" }}>{strong}</div><div className="stat__label">Strong</div></div>
    </div>

    <div className="small" style={{ fontWeight: 700, marginBottom: 14, color: "var(--text-2)", lineHeight: 1.5 }}>
      {countLessons(p)} of {LESSONS.length} lessons done{perfect ? `, ${perfect} with 3 stars` : ""}.
      {" "}{due > 0 ? `${due} word${due === 1 ? " is" : "s are"} ready for review.` : "No words waiting for review."}
      {" "}{(p.badges || []).length} badges, {(p.stickers || []).length} stickers.
    </div>

    <div className="stack" style={{ "--gap": "10px" }}>
      {started.map(w => {
        let s = 0;
        for (let i = w.range[0]; i <= w.range[1]; i++) s += stars[i] || 0;
        const max = (w.range[1] - w.range[0] + 1) * 3;
        return <div key={w.id}>
          <div className="row row--between small" style={{ fontWeight: 800, marginBottom: 4 }}>
            <span>{w.emoji} {w.name}</span><span className="muted">{s}/{max} ⭐</span>
          </div>
          <ProgressBar thin value={s / max} color={w.color} label={`${w.name} progress`} />
        </div>;
      })}
      {started.length < WORLDS.length && <p className="tiny muted">{WORLDS.length - started.length} more worlds still to unlock.</p>}
    </div>
  </Card>;
}

export function ParentDashboard({ parent, onBack }) {
  const [toRemove, setToRemove] = useState(null);
  const [, force] = useState(0);
  const children = db.getChildrenOf(parent.email);
  const remove = () => { db.deleteChild(toRemove.id); setToRemove(null); force(x => x + 1); };

  return <div className="app-bg">
    <div className="page">
      <Button size="sm" onClick={onBack} style={{ marginBottom: 14 }}>← Back</Button>
      <div className="text-center" style={{ marginBottom: 22 }}>
        <div style={{ fontSize: 44 }}>📊</div>
        <h1 className="h2">Grown-up dashboard</h1>
        <p className="muted small" style={{ marginTop: 4 }}>{children.length} {children.length === 1 ? "learner" : "learners"} · {parent.name}</p>
      </div>
      {children.length === 0 && <Card className="text-center"><div style={{ fontSize: 44 }}>👶</div><p className="muted">No learners yet — add one to start tracking progress.</p></Card>}
      {children.map(c => <ChildReport key={c.id} child={c} onRemove={setToRemove} />)}
    </div>
    {toRemove && <Modal onClose={() => setToRemove(null)} labelledBy="rm-title">
      <div className="text-center">
        <div style={{ fontSize: 44, marginBottom: 6 }}>⚠️</div>
        <h3 id="rm-title" className="h2" style={{ marginBottom: 8 }}>Remove {toRemove.name}?</h3>
        <p className="muted small" style={{ marginBottom: 18 }}>All of {toRemove.name}’s stars and progress will be deleted. This can’t be undone.</p>
        <div className="row" style={{ gap: 10 }}>
          <Button block onClick={() => setToRemove(null)}>Cancel</Button>
          <Button block variant="coral" onClick={remove}>Remove</Button>
        </div>
      </div>
    </Modal>}
  </div>;
}
