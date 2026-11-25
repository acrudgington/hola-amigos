import { useState } from "react";
import { learnedUpTo, type Progress } from "../domain/progress.ts";
import { wordsForLessonsUpTo } from "../content/index.ts";
import { buildMix, mixSummary, type MixItem } from "../domain/memory.ts";
import { voice } from "../audio/player.ts";
import { useSayOnShow } from "../audio/guide.ts";
import { REVIEW_INSTRUCTION } from "../audio/lines.ts";
import type { OnWord } from "../games/types.ts";
import { Button, Card } from "../components/ui.tsx";
import { Luna, Sol } from "../components/Mascots.tsx";
import { MixGame } from "../games/ChoiceGames.tsx";
import { Art } from "../components/Art.tsx";

// Sol's mix — daily personal practice: words that are fading, tricky words,
// and recall challenges for words they already recognise (domain/memory.ts).
export function ReviewScreen({ progress, onBack, onFinish, onWord }: { progress: Progress; onBack: () => void; onFinish: (s: number, t: number) => void; onWord: OnWord }) {
  // Snapshot the list when the screen opens. (Previously it was recomputed on
  // every render, so answering a word changed the list and restarted the game.)
  const [run, setRun] = useState(0);
  const [list, setList] = useState(() => makeList(progress));
  const [result, setResult] = useState<{ s: number; t: number } | null>(null);
  useSayOnShow(list.length ? REVIEW_INSTRUCTION : null, { delay: 450 });

  const again = () => { setList(makeList(progress)); setResult(null); setRun(r => r + 1); };

  return <div>
    <div>
      <div className="text-center" style={{ margin: "10px 0 16px" }}>
        <div className="row row--center" style={{ gap: 4 }}><Sol size={48} outfit={progress.solOutfit} /><Luna size={46} mood="happy" outfit={progress.lunaOutfit} /></div>
        <h1 className="h2" style={{ marginTop: 6 }}>Sol’s mix</h1>
        <p className="small muted" style={{ marginTop: 4 }}>Your own practice, picked from the words you’ve learned.</p>
        {list.length > 0 && !result && <MixChips items={list} />}
      </div>
      <Card className="card--pad-lg" style={{ padding: "22px 16px" }}>
        {list.length === 0 ? <div className="text-center">
          <Art e="🌱" size={64} />
          <div className="h3" style={{ margin: "6px 0" }}>Nothing to review yet!</div>
          <p className="small muted" style={{ marginBottom: 18 }}>Finish a lesson or two, then come back to keep your words strong.</p>
          <Button variant="sun" onClick={onBack}>Back to the map</Button>
        </div> : result ? <div className="text-center">
          <Art e={result.s / result.t >= 0.8 ? "🧠" : "💪"} size={72} eager />
          <div className="display" style={{ fontSize: 40 }}>{result.s}<span className="muted" style={{ fontSize: 26 }}> / {result.t}</span></div>
          <p className="h3" style={{ margin: "6px 0 20px" }}>{result.s / result.t >= 0.8 ? "Super memory!" : "Every review makes words stick!"}</p>
          <div className="row row--center row--wrap" style={{ gap: 10 }}>
            <Button variant="luna" onClick={again}>↻ Review more</Button>
            <Button onClick={onBack}>Back to the map</Button>
          </div>
        </div> : <MixGame key={run} items={list} pool={wordsForLessonsUpTo(Math.max(1, learnedUpTo(progress)))} onWord={onWord} onDone={(s: number, t: number) => { onFinish(s, t); setResult({ s, t }); }} />}
      </Card>
    </div>
  </div>;
}

function makeList(progress: Progress): MixItem[] {
  return buildMix(progress, { size: 10, canListen: voice.available() });
}

function MixChips({ items }: { items: MixItem[] }) {
  const n = mixSummary(items);
  const chips: [number, string, string][] = [
    [n.due, "due", "to refresh"], [n.tricky, "tricky", "tricky"], [n.challenge, "challenge", "challenges"], [n.refresh, "refresh", "from earlier"],
  ];
  return <div className="row row--center row--wrap" style={{ gap: 6, marginTop: 10 }}>
    {chips.filter(([c]) => c > 0).map(([c, k, label]) => <span key={k} className={`mix-chip mix-chip--${k}`}>{c} {label}</span>)}
  </div>;
}
