import { worldOf, type Lesson } from "../content/index.ts";
import { ACTIVITIES, practiceList, type ActivityType } from "../lib/journey.ts";
import { tint } from "../lib/utils.ts";
import { Button, Card, SpeakButton, Stars } from "../components/ui.tsx";
import { Art } from "../components/Art.tsx";

// Lesson page: today's phrase, a fun fact, the guided lesson, and free practice.
export function LessonScreen({ lesson, stars, onBack, onStart, onPractice }: { lesson: Lesson; stars: number; onBack: () => void; onStart: () => void; onPractice: (a: ActivityType) => void }) {
  const world = worldOf(lesson.id);
  return <div className="app-bg">
    <div className="page">
      <Button size="sm" onClick={onBack}>← {world?.name || "Map"}</Button>

      <div className="lesson-hero">
        <div className="lesson-hero__emoji" aria-hidden="true"><Art e={lesson.emoji} size={88} eager still /></div>
        <div className="eyebrow" style={{ color: world?.color }}>Lesson {lesson.id} · {world?.name}</div>
        <h1 className="h1" style={{ marginTop: 2 }}>{lesson.title}</h1>
        <p className="muted" style={{ marginTop: 4 }}>{lesson.subtitle}</p>
        <Stars count={stars} className="big-stars" />
      </div>

      <Card className="text-center" style={{ marginBottom: 12, position: "relative" }}>
        <div className="eyebrow" style={{ marginBottom: 6 }}>Today’s phrase</div>
        <div className="row row--center" style={{ gap: 10 }}>
          <div className="display gradient-text" style={{ fontSize: 26 }}>{lesson.phrase.es}</div>
          <SpeakButton text={lesson.phrase.es} size={38} />
        </div>
        <div style={{ fontWeight: 700, marginTop: 4 }}>{lesson.phrase.en}</div>
      </Card>

      <div className="card card--sun card--pad" style={{ marginBottom: 18 }}>
        <div className="row row--between" style={{ marginBottom: 2 }}>
          <div style={{ fontWeight: 900, color: "var(--sun-d)" }}>💡 Did you know?</div>
          <SpeakButton text={lesson.funFact} lang="en" size={34} label="Hear the fun fact" />
        </div>
        <div className="small" style={{ fontWeight: 700, lineHeight: 1.5 }}>{lesson.funFact}</div>
      </div>

      <Button variant="mint" size="lg" block onClick={onStart}>▶ {stars ? "Play the lesson again" : "Start the lesson"}</Button>
      {stars > 0 && stars < 3 && <p className="tiny muted text-center" style={{ marginTop: 8 }}>Score higher to win more stars!</p>}

      <div className="eyebrow text-center" style={{ margin: "24px 0 12px" }}>…or practise one game</div>
      <div className="stack" style={{ "--gap": "10px" }}>
        {practiceList(lesson).map(key => {
          const a = ACTIVITIES[key];
          return <button key={key} type="button" className="activity-row" style={{ "--row-c": a.color }} onClick={() => onPractice(key)}>
            <span className="activity-row__icon" style={{ background: `linear-gradient(135deg, ${a.color}, ${tint(a.color, 0.35)})`, boxShadow: `0 6px 18px -6px ${a.color}` }} aria-hidden="true">{a.emoji}</span>
            <span className="grow">
              <span style={{ display: "block", fontWeight: 900 }}>{a.title}</span>
              <span className="small muted">{a.desc}</span>
            </span>
            <span className="muted" aria-hidden="true" style={{ fontSize: 20 }}>›</span>
          </button>;
        })}
      </div>
    </div>
  </div>;
}
