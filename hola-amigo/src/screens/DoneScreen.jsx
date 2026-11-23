import { LESSONS } from "../data/course.js";
import { Button, Card } from "../components/ui.jsx";
import { Luna, Sol } from "../components/Mascots.jsx";

// Celebration at the end of a guided lesson.
export function DoneScreen({ lesson, result, progress, onNext, onHome, onPractice }) {
  const { correct, total, earned, before, after } = result;
  const pct = total ? correct / total : 1;
  const mood = pct >= 0.85 ? "celebrate" : pct >= 0.6 ? "happy" : "encourage";
  const msg = pct >= 0.85 ? "¡Increíble! Perfect work!" : pct >= 0.6 ? "¡Muy bien! Great job!" : "¡Bien hecho! Keep practising!";
  const next = LESSONS.find(l => l.id === lesson.id + 1);
  const gained = after - before;

  return <div className="app-bg" style={{ overflow: "hidden" }}>
    <div className="sunburst" aria-hidden="true" />
    <div className="center-screen" style={{ position: "relative", zIndex: 1 }}>
      <div style={{ width: "100%", maxWidth: 420 }} className="text-center">
        <div className="row row--center" style={{ gap: 8, marginBottom: -8, position: "relative", zIndex: 2 }}>
          <div className="float"><Sol size={84} mood={mood === "happy" ? "wink" : mood} outfit={progress.solOutfit} /></div>
          <div className="float float--delay"><Luna size={78} mood={mood} outfit={progress.lunaOutfit} /></div>
        </div>
        <Card className="card--pad-lg" style={{ animation: "bounce-in .5s var(--ease-spring)" }}>
          <div className="eyebrow" style={{ color: "var(--mint-d)" }}>Lesson complete!</div>
          <h1 className="h1" style={{ margin: "6px 0 4px", fontSize: 32 }}>{lesson.title}</h1>
          <div className="big-stars" aria-label={`${after} of 3 stars`}>
            {[0, 1, 2].map(j => <span key={j} className={j < after ? "on" : ""} style={{ animationDelay: `${0.3 + j * 0.2}s` }}>⭐</span>)}
          </div>
          <p className="h3">{msg}</p>
          {total > 0 && <p className="muted small" style={{ marginTop: 4 }}>You got {correct} of {total} right ({Math.round(pct * 100)}%)</p>}
          <p className="small" style={{ fontWeight: 800, marginTop: 8, color: gained > 0 ? "var(--sun-d)" : "var(--muted)" }}>
            {gained > 0 ? `+${gained} new star${gained === 1 ? "" : "s"}! ⭐` : after >= 3 ? "All 3 stars — you’re a star! 🌟" : `You earned ${earned} star${earned === 1 ? "" : "s"} this time. Beat your best to win more!`}
          </p>
          <div className="stack" style={{ marginTop: 20 }}>
            {next && <Button variant="sun" size="lg" block onClick={() => onNext(next)}>Next lesson →</Button>}
            <Button block variant={next ? "white" : "sun"} onClick={onHome}>Back to the map</Button>
            <Button variant="ghost" size="sm" onClick={onPractice}>Practise this lesson</Button>
          </div>
        </Card>
      </div>
    </div>
  </div>;
}
