import { useState } from "react";
import { getDueWords } from "../domain/progress.ts";
import { shuffle } from "../lib/utils.ts";
import { wordsForLessonsUpTo } from "../content/index.ts";
import { Button, Card } from "../components/ui.tsx";
import { Luna, Sol } from "../components/Mascots.tsx";
import { ReviewGame } from "../games/ChoiceGames.tsx";
import { maxCompleted } from "./HomeScreen.tsx";

// Daily review — spaced repetition over words the child has met before.
export function ReviewScreen({ progress, onBack, onFinish, onWord }) {
  // Snapshot the list when the screen opens. (Previously it was recomputed on
  // every render, so answering a word changed the list and restarted the game.)
  const [run, setRun] = useState(0);
  const [list, setList] = useState(() => makeList(progress));
  const [result, setResult] = useState(null);

  const again = () => { setList(makeList(progress)); setResult(null); setRun(r => r + 1); };

  return <div>
    <div>
      <div className="text-center" style={{ margin: "10px 0 16px" }}>
        <div className="row row--center" style={{ gap: 4 }}><Sol size={48} outfit={progress.solOutfit} /><Luna size={46} mood="happy" outfit={progress.lunaOutfit} /></div>
        <h1 className="h2" style={{ marginTop: 6 }}>Daily review</h1>
        <p className="small muted" style={{ marginTop: 4 }}>Words you’ve met before — let’s keep them strong!</p>
      </div>
      <Card className="card--pad-lg" style={{ padding: "22px 16px" }}>
        {list.length === 0 ? <div className="text-center">
          <div style={{ fontSize: 50 }}>🌱</div>
          <div className="h3" style={{ margin: "6px 0" }}>Nothing to review yet!</div>
          <p className="small muted" style={{ marginBottom: 18 }}>Finish a lesson or two, then come back to keep your words strong.</p>
          <Button variant="sun" onClick={onBack}>Back to the map</Button>
        </div> : result ? <div className="text-center">
          <div style={{ fontSize: 56, animation: "bounce-in .5s var(--ease-spring)" }}>{result.s / result.t >= 0.8 ? "🧠" : "💪"}</div>
          <div className="display" style={{ fontSize: 40 }}>{result.s}<span className="muted" style={{ fontSize: 26 }}> / {result.t}</span></div>
          <p className="h3" style={{ margin: "6px 0 20px" }}>{result.s / result.t >= 0.8 ? "Super memory!" : "Every review makes words stick!"}</p>
          <div className="row row--center row--wrap" style={{ gap: 10 }}>
            <Button variant="luna" onClick={again}>↻ Review more</Button>
            <Button onClick={onBack}>Back to the map</Button>
          </div>
        </div> : <ReviewGame key={run} dueWords={list} onWord={onWord} onDone={(s, t) => { onFinish(s, t); setResult({ s, t }); }} />}
      </Card>
    </div>
  </div>;
}

function makeList(progress) {
  const due = getDueWords(progress);
  if (due.length) return due.slice(0, 10);
  // Nothing technically due → a mixed refresh of everything learned so far.
  const done = maxCompleted(progress.stars || {});
  if (!done) return [];
  return shuffle(wordsForLessonsUpTo(done)).slice(0, 10);
}
