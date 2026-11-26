import { nextLessonAfter, type Lesson } from "../content/index.ts";
import type { DoneResult } from "../state/nav.ts";
import { motion } from "framer-motion";
import { levelInfo, type Progress } from "../domain/progress.ts";
import { Button, Card, ProgressBar } from "../components/ui.tsx";
import { AnimatedNumber } from "../components/Widgets.tsx";
import { DONE_LINES } from "../audio/lines.ts";
import { useSayOnShow } from "../audio/guide.ts";
import { Luna, Sol } from "../components/Mascots.tsx";

// Celebration at the end of a guided lesson.
export function DoneScreen({ lesson, result, progress, onNext, onHome, onPractice }: { lesson: Lesson; result: DoneResult; progress: Progress; onNext: (l: Lesson) => void; onHome: () => void; onPractice: () => void }) {
  const { correct, total, earned, before, after } = result;
  const pct = total ? correct / total : 1;
  const mood = pct >= 0.85 ? "celebrate" : pct >= 0.6 ? "happy" : "encourage";
  const msg = pct >= 0.85 ? DONE_LINES.great : pct >= 0.6 ? DONE_LINES.good : DONE_LINES.keepGoing;
  useSayOnShow(msg, { delay: 700, speaker: "sol" });
  const next = nextLessonAfter(lesson);
  const gained = after - before;
  const xpGained = result.xp || 0;
  const lvl = levelInfo(progress.xp);

  return <div className="app-bg" style={{ overflow: "hidden", minHeight: "100vh" }}>
    <div className="sunburst" aria-hidden="true" />
    <div className="center-screen" style={{ position: "relative", zIndex: 1 }}>
      <div style={{ width: "100%", maxWidth: 420 }} className="text-center">
        <div className="row row--center" style={{ gap: 8, marginBottom: -8, position: "relative", zIndex: 2 }}>
          <div className="float"><Sol size={84} mood={mood === "happy" ? "wink" : mood} outfit={progress.solOutfit} /></div>
          <div className="float float--delay"><Luna size={78} mood={mood} outfit={progress.lunaOutfit} /></div>
        </div>
        <Card className="card--pad-lg" style={{ animation: "bounce-in .5s var(--ease-spring)" }}>
          <div className="eyebrow" style={{ color: "var(--mint)" }}>Lesson complete!</div>
          <h1 className="h1" style={{ margin: "6px 0 4px", fontSize: 32 }}>{lesson.title}</h1>
          <div className="big-stars" aria-label={`${after} of 3 stars`}>
            {[0, 1, 2].map(j => <span key={j} className={j < after ? "on" : ""} style={{ animationDelay: `${0.3 + j * 0.2}s` }}>⭐</span>)}
          </div>
          <p className="h3">{msg}</p>
          {total > 0 && <p className="muted small" style={{ marginTop: 4 }}>You got {correct} of {total} right ({Math.round(pct * 100)}%)</p>}
          <motion.div className="row row--center" style={{ gap: 10, margin: "14px 0 6px" }} initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.9, type: "spring", stiffness: 300, damping: 14 }}>
            <span className="xp-chip" style={{ fontSize: 22, padding: "8px 16px" }}>⚡ +<AnimatedNumber value={xpGained} duration={1.6} /> XP</span>
          </motion.div>
          <div style={{ margin: "10px 0 4px" }}>
            <div className="row row--between tiny muted" style={{ marginBottom: 5 }}><span>Level {lvl.level}</span><span>{lvl.toNext} XP to level {lvl.level + 1}</span></div>
            <ProgressBar value={lvl.pct} color="var(--luna)" label="Level progress" />
          </div>
          <p className="small" style={{ fontWeight: 800, marginTop: 8, color: gained > 0 ? "var(--gold)" : "var(--muted)" }}>
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
