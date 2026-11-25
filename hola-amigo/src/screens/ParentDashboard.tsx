import { useState } from "react";
import { Icon } from "../components/Icon.tsx";
import { countLessons, getDueWords, liveStreak, sumStars, type Progress } from "../domain/progress.ts";
import { services, type Child, type Parent } from "../services/index.ts";
import { useFamily } from "../state/useFamily.ts";
import { AccountPanel } from "../components/AccountPanel.tsx";
import { LESSONS, WORLDS } from "../content/index.ts";
import { trickyWords } from "../domain/memory.ts";
import { LEVEL_INFO, allGoals, levelSummary, nextGoal, type GoalProgress, type Level, type UnitProgress } from "../domain/goals.ts";
import { Button, Card, Modal } from "../components/ui.tsx";
import { Art } from "../components/Art.tsx";
import { Avatar } from "../components/Avatar.tsx";
import { headline, homeIdeas, reportSubject, reportText, weeklyReport } from "../domain/weeklyReport.ts";

// This week at a glance, with ways to send it to yourself (no server needed:
// the email opens in the grown-up's own mail app).
function WeekCard({ name, progress, email }: { name: string; progress: Progress; email: string }) {
  const r = weeklyReport(name, progress);
  const [copied, setCopied] = useState(false);
  const text = reportText(r);
  const subject = reportSubject(r);
  const mailto = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`;
  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";
  const share = () => { void navigator.share({ title: subject, text }).catch(() => {}); };
  const copy = () => { void navigator.clipboard?.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2000); }); };
  const max = Math.max(30, ...r.days.map(d => d.xp));
  const chips = [
    [r.counts.lesson, "📘", "lessons"], [r.counts.review, "🔁", "practice mixes"], [r.counts.story, "📖", "stories"],
    [r.counts.chant, "🎵", "chants"], [r.counts.together, "🤝", "learn together"], [r.newWords.length, "🆕", "new words"],
  ] as const;
  return <section className="week-card" aria-label={`${name}’s week`}>
    <div className="row row--between" style={{ alignItems: "baseline", marginBottom: 6 }}>
      <div className="h3">This week</div>
      <span className="small muted mono">{r.xp} XP · {r.activeDays}/7 days</span>
    </div>
    <p className="small" style={{ fontWeight: 700, color: "var(--text-2)", marginBottom: 10 }}>{headline(r)}</p>
    <div className="week-bars" aria-hidden="true">
      {r.days.map((d, i) => <div key={d.key} className={`week-bars__day ${i === 6 ? "is-today" : ""}`}>
        <div className="week-bars__bar"><div style={{ height: `${d.active ? Math.max(8, (d.xp / max) * 100) : 0}%` }} /></div>
        <span>{d.date.toLocaleDateString("en-GB", { weekday: "narrow" })}</span>
      </div>)}
    </div>
    {!r.quiet && <div className="week-chips">{chips.filter(([n]) => n > 0).map(([n, e, label]) => <span key={label} className="week-chip">{e} <b>{n}</b> {label}</span>)}</div>}
    {r.goalsThisWeek.length > 0 && <div className="week-goals">
      <div className="eyebrow">New this week</div>
      {r.goalsThisWeek.map(g => <div key={g.id} className="week-goal">⭐ {g.can} <span lang="es" className="muted">{g.es}</span></div>)}
    </div>}
    {homeIdeas(r).length > 0 && <div className="week-ideas">
      <div className="eyebrow">Try this at home</div>
      <ul>{homeIdeas(r).map(i => <li key={i}>{i}</li>)}</ul>
    </div>}
    <div className="row row--wrap" style={{ gap: 8, marginTop: 12 }}>
      <a className="btn btn--sm btn--sun" href={mailto}>📧 Email me this report</a>
      {canShare && <Button size="sm" onClick={share}>Share…</Button>}
      <Button size="sm" variant="white" onClick={copy}>{copied ? "Copied ✓" : "Copy text"}</Button>
    </div>
    <p className="tiny muted" style={{ marginTop: 6 }}>Opens your email app with the report ready to send to {email || "yourself"}. Nothing is sent by us.</p>
  </section>;
}

const rangeLabel = (ids: number[]) => ids.length === 1 ? `Lesson ${ids[0]}` : `Lessons ${ids[0]}–${ids[ids.length - 1]}`;
const STATE_TEXT = { "achieved": "Can do", "practising": "Practising", "not-started": "Not started" } as const;

function GoalRow({ g }: { g: GoalProgress }) {
  return <li className={`goal goal--${g.state}`}>
    <span className="goal__icon" aria-hidden="true">{g.state === "achieved" && <Icon name="check" size={14} stroke={3.5} />}</span>
    <div className="grow">
      <div className="goal__can">{g.goal.can}{g.level === "a2-taster" && <span className="level-tag level-tag--a2">A2 taster</span>}</div>
      <div className="goal__es" lang="es">{g.goal.es}</div>
      <div className="goal__meta">{rangeLabel(g.goal.lessons)} · {g.lessonsDone}/{g.lessonsTotal} done · {g.wordsKnown}/{g.wordsTotal} words known</div>
    </div>
    <span className="goal__state">{STATE_TEXT[g.state]}</span>
  </li>;
}

function UnitBlock({ u, open }: { u: UnitProgress; open: boolean }) {
  const world = WORLDS.find(w => w.id === u.unit.world)!;
  const total = u.goals.length;
  return <details className="unit" open={open} style={{ "--wc": world.color }}>
    <summary className="unit__head">
      <Art e={world.emoji} size={30} />
      <div className="grow">
        <div className="unit__title">{u.unit.title}</div>
        <div className="unit__sub">{world.name} · {LEVEL_INFO[u.unit.level].label}</div>
      </div>
      <span className="unit__count">{u.achieved}/{total}</span>
      <Icon name="chevronRight" size={16} className="unit__chev" />
    </summary>
    <div className="unit__bar"><div style={{ width: `${(u.goals.reduce((a, g) => a + g.score, 0) / total) * 100}%` }} /></div>
    <ul className="goals">{u.goals.map(g => <GoalRow key={g.goal.id} g={g} />)}</ul>
  </details>;
}

// What the child can now do in Spanish, goal by goal, with honest CEFR levels.
function CanDo({ name, progress }: { name: string; progress: Progress }) {
  const units = allGoals(progress);
  const sum = levelSummary(units);
  const next = nextGoal(units);
  const openUnit = next?.unit.world ?? 1;
  const total = units.reduce((n, u) => n + u.goals.length, 0);
  const done = units.reduce((n, u) => n + u.achieved, 0);
  return <section aria-label={`What ${name} can do`}>
    <div className="row row--between" style={{ marginBottom: 10, alignItems: "baseline" }}>
      <div className="h3">What {name} can do</div>
      <span className="small muted mono">{done}/{total} goals</span>
    </div>
    <div className="level-chips">
      {(Object.keys(sum) as Level[]).map(l => <span key={l} className={`level-chip level-chip--${l}`} title={LEVEL_INFO[l].about}>
        <b>{LEVEL_INFO[l].short}</b> {sum[l].achieved}/{sum[l].total}
      </span>)}
    </div>
    {next && <div className="next-goal">
      <span className="eyebrow">Work on next</span>
      <div className="next-goal__can">{next.goal.can}</div>
      <div className="small muted">{rangeLabel(next.goal.lessons)}{next.state === "practising" ? ` · ${next.wordsKnown}/${next.wordsTotal} words known so far` : ""}</div>
    </div>}
    <div className="units">{units.filter(u => u.started || u.unit.world <= openUnit + 1).map(u => <UnitBlock key={u.unit.world} u={u} open={u.unit.world === openUnit} />)}</div>
    {units.some(u => !u.started && u.unit.world > openUnit + 1) && <p className="tiny muted" style={{ marginTop: 8 }}>{units.filter(u => !u.started && u.unit.world > openUnit + 1).length} more units ahead.</p>}
    <p className="tiny muted" style={{ marginTop: 10, lineHeight: 1.5 }}>
      A goal counts as <b>can do</b> when its lessons are finished and {name} reliably knows most of their words.
      Levels follow the Common European Framework (CEFR): this course covers Pre-A1 to A1 (lessons 1–100) and the A2 curriculum (lessons 101–200).
    </p>
  </section>;
}

function ChildReport({ child, progress: p, email, onRemove }: { child: Child; progress: Progress; email: string; onRemove: (c: Child) => void }) {
  const stars = p.stars || {};
  const words = Object.values(p.wordMemory || {});
  const strong = words.filter(w => w.box >= 3).length;
  const due = getDueWords(p).length;
  const daysAgo = p.lastActive ? Math.floor((Date.now() - p.lastActive) / 86400000) : null;
  const active = daysAgo == null ? "Not started yet" : daysAgo === 0 ? "Active today" : daysAgo === 1 ? "Active yesterday" : `Last seen ${daysAgo} days ago`;
  const perfect = Object.values(stars).filter(s => s === 3).length;

  return <Card style={{ marginBottom: 16 }}>
    <div className="row" style={{ marginBottom: 16 }}>
      <Avatar value={child.avatar} size={56} />
      <div className="grow">
        <div className="h3">{child.name}</div>
        <div className="small muted">{active} · 🔥 {liveStreak(p)}-day streak</div>
      </div>
      <button type="button" className="icon-btn" onClick={() => onRemove(child)} aria-label={`Remove ${child.name}`} title="Remove">🗑️</button>
    </div>

    <WeekCard name={child.name} progress={p} email={email} />

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
      {p.placement && <>{" "}Level check on {new Date(p.placement.at).toLocaleDateString()}: started in {WORLDS.find(w => w.id === Math.min(WORLDS.length, p.placement!.world + 1))?.name} ({p.placement.right} of {p.placement.asked} right).</>}
    </div>

    {(() => {
      const tricky = trickyWords(p, 6);
      return tricky.length > 0 && <div style={{ marginBottom: 16 }}>
        <div className="small" style={{ fontWeight: 900, marginBottom: 8 }}>Words {child.name} finds tricky</div>
        <div className="tricky-words">{tricky.map(w => <span key={w.es} className="tricky-word" lang="es"><Art e={w.emoji} size={20} />{w.es} <small>{w.en}</small></span>)}</div>
        <p className="tiny muted" style={{ marginTop: 6 }}>These come up more often in Sol’s mix until they stick.</p>
      </div>;
    })()}
    <CanDo name={child.name} progress={p} />
  </Card>;
}

export function ParentDashboard({ parent, onBack, onAccountDeleted }: { parent: Parent; onBack: () => void; onAccountDeleted: () => void }) {
  const [toRemove, setToRemove] = useState<Child | null>(null);
  const { family, reload } = useFamily(parent.id);
  const children = family ?? [];
  const remove = async () => { if (!toRemove) return; await services.family.removeChild(toRemove.id); setToRemove(null); await reload(); };

  return <div className="app-bg">
    <div className="page">
      <Button size="sm" onClick={onBack} style={{ marginBottom: 14 }}>← Back</Button>
      <div className="text-center" style={{ marginBottom: 22 }}>
        <Art e="📊" size={60} eager />
        <h1 className="h2">Grown-up dashboard</h1>
        <p className="muted small" style={{ marginTop: 4 }}>{children.length} {children.length === 1 ? "learner" : "learners"} · {parent.name}</p>
      </div>
      {children.length === 0 && <Card className="text-center"><Art e="👶" size={60} /><p className="muted">No learners yet — add one to start tracking progress.</p></Card>}
      {children.map(({ child, progress }) => <ChildReport key={child.id} child={child} progress={progress} email={parent.email} onRemove={setToRemove} />)}
      <AccountPanel parent={parent} onDeleted={onAccountDeleted} />
    </div>
    {toRemove && <Modal onClose={() => setToRemove(null)} labelledBy="rm-title">
      <div className="text-center">
        <div style={{ marginBottom: 6 }}><Art e="⚠️" size={56} /></div>
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
