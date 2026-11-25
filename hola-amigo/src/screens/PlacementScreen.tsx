// The placement check ("Find my level"): a short, friendly quiz that lets a
// child who already knows some Spanish skip ahead. No right/wrong feedback and
// an "I don't know" button on every question, so children don't guess their
// way past lessons they need. The logic lives in domain/placement.ts.
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { voice } from "../audio/player.ts";
import { useSayOnShow } from "../audio/guide.ts";
import { PLACEMENT_LINES } from "../audio/lines.ts";
import { WORLDS, siblingsOf, wordsForLessonsUpTo, type Word } from "../content/index.ts";
import { isFreshLearner, type Progress } from "../domain/progress.ts";
import { lastLessonOf, nextWorld, placedWorld, questionsFor, type PlacementQuestion, type WorldResult } from "../domain/placement.ts";
import { shuffle, uniqueBy } from "../lib/utils.ts";
import type { Child } from "../services/index.ts";
import { Button, Card, SpeakButton } from "../components/ui.tsx";
import { Luna, Sol } from "../components/Mascots.tsx";
import { Art } from "../components/Art.tsx";
import { Icon } from "../components/Icon.tsx";

export interface PlacementResult { world: number; asked: number; right: number }

interface Option { key: string; label: string; emoji?: string }

function optionsFor(q: PlacementQuestion): Option[] {
  const recall = q.kind === "recall";
  const key = (w: Word) => (recall ? w.es : w.en);
  const pool = wordsForLessonsUpTo(lastLessonOf(q.world));
  const near = shuffle(siblingsOf(q.word.es));
  const others = uniqueBy([...near.slice(0, 1), ...shuffle(pool)].filter(w => key(w) !== key(q.word)), key).slice(0, 3);
  return shuffle([q.word, ...others]).map(w => ({ key: key(w), label: key(w), emoji: recall ? undefined : w.emoji }));
}

export function PlacementScreen({ child, progress, onRecord, onDone, onCancel }: {
  child: Child; progress: Progress;
  onRecord: (es: string, en: string, ok: boolean, dir: "recognise" | "recall") => void;
  onDone: (r: PlacementResult | "new") => void; onCancel: () => void;
}) {
  const [stage, setStage] = useState<"offer" | "intro" | "quiz" | "result">(() => (isFreshLearner(progress) ? "offer" : "intro"));
  const [results, setResults] = useState<WorldResult[]>([]);
  const [queue, setQueue] = useState<PlacementQuestion[]>([]);
  const [right, setRight] = useState(0);
  const [asked, setAsked] = useState(0);
  const [tapped, setTapped] = useState<string | null>(null);
  const [inWorld, setInWorld] = useState(0);   // right answers in the world being checked
  const canListen = voice.available();

  useSayOnShow(stage === "offer" ? PLACEMENT_LINES.offer : stage === "intro" ? PLACEMENT_LINES.intro : stage === "result" ? PLACEMENT_LINES.result : null, { speaker: "sol", delay: 400 });

  const start = () => { setResults([]); setQueue(questionsFor(1, { canListen })); setRight(0); setAsked(0); setInWorld(0); setStage("quiz"); };
  const q = queue[0];
  const opts = useMemo(() => (q ? optionsFor(q) : []), [q]);

  useEffect(() => {
    if (stage !== "quiz" || !q || q.kind !== "listen") return;
    const t = setTimeout(() => voice.spanish(q.word.es, { mode: "queue" }), 350);
    return () => clearTimeout(t);
  }, [q, stage]);

  const answer = (key: string | null) => {
    if (!q || tapped) return;
    const ok = key != null && key === (q.kind === "recall" ? q.word.es : q.word.en);
    if (key != null) onRecord(q.word.es, q.word.en, ok, q.kind === "recall" ? "recall" : "recognise");
    setTapped(key ?? "?");
    setTimeout(() => {
      setTapped(null);
      setAsked(a => a + 1);
      if (ok) setRight(r => r + 1);
      const worldScore = inWorld + (ok ? 1 : 0);
      const rest = queue.slice(1);
      if (rest.length) { setInWorld(worldScore); setQueue(rest); return; }
      const done = [...results, { world: q.world, right: worldScore }];
      setResults(done);
      setInWorld(0);
      const next = nextWorld(done);
      if (next != null) setQueue(questionsFor(next, { canListen }));
      else { setQueue([]); setStage("result"); }
    }, 350);
  };

  const placed = placedWorld(results);
  const startWorld = WORLDS.find(w => w.id === Math.min(WORLDS.length, placed + 1)) ?? WORLDS[0];
  const tested = new Set(results.map(r => r.world));

  return <div className="page page--narrow">
    <div className="row" style={{ marginBottom: 10 }}>
      <Button size="sm" variant="ghost" onClick={onCancel}><Icon name="chevronLeft" size={16} />Back</Button>
    </div>

    {stage === "offer" && <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
      <div className="text-center" style={{ marginBottom: 18 }}>
        <div className="row row--center" style={{ gap: 6 }}><Sol size={76} mood="happy" /><Luna size={70} mood="happy" /></div>
        <h1 className="h2" style={{ marginTop: 8 }}>¡Hola, {child.name}!</h1>
        <p className="muted" style={{ marginTop: 4 }}>Is Spanish new for you?</p>
      </div>
      <div className="stack" style={{ "--gap": "12px" }}>
        <button type="button" className="card placement-choice" onClick={() => onDone("new")}>
          <Art e="🌱" size={52} />
          <div className="grow"><div className="h3">I’m new to Spanish</div><div className="small muted">Start at the very first lesson.</div></div>
          <Icon name="chevronRight" size={20} />
        </button>
        <button type="button" className="card placement-choice" onClick={() => setStage("intro")}>
          <Art e="🚀" size={52} />
          <div className="grow"><div className="h3">I know some Spanish</div><div className="small muted">Answer a few questions so we can find your level (about 3 minutes).</div></div>
          <Icon name="chevronRight" size={20} />
        </button>
      </div>
      <p className="tiny muted text-center" style={{ marginTop: 14 }}>Grown-ups: you can run this check again any time from {child.name}’s “Me” page.</p>
    </motion.div>}

    {stage === "intro" && <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="text-center">
      <div className="row row--center"><Sol size={90} mood="encourage" /></div>
      <h1 className="h2" style={{ margin: "8px 0 6px" }}>Let’s find your level!</h1>
      <p className="muted" style={{ marginBottom: 6 }}>I’ll ask you some questions. They get harder as you go.</p>
      <p className="muted" style={{ marginBottom: 20 }}>If you don’t know an answer, that’s fine. Just tap <b>“I don’t know”</b>.</p>
      <Button variant="sun" size="lg" onClick={start}>Let’s go! 🚀</Button>
    </motion.div>}

    {stage === "quiz" && q && <Card className="card--pad-lg text-center">
      <div className="placement-worlds" aria-label="Worlds checked">
        {WORLDS.map(w => <span key={w.id} className={`placement-dot ${w.id === q.world ? "is-now" : tested.has(w.id) ? "is-done" : ""}`} style={{ "--wc": w.color }} title={w.name} />)}
      </div>
      <div className="counter" style={{ margin: "10px 0 14px" }}>Question {asked + 1}</div>
      <motion.div key={`${q.world}-${q.word.es}-${asked}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        {q.kind === "listen" && <>
          <p className="say-hint" style={{ marginBottom: 12 }}>Listen, then choose!</p>
          <div className="row row--center" style={{ marginBottom: 18 }}><SpeakButton text={q.word.es} big label="Play again" /></div>
        </>}
        {q.kind === "recognise" && <>
          <p className="say-hint" style={{ marginBottom: 6 }}>What does this mean?</p>
          <div className="row row--center" style={{ gap: 12, marginBottom: 18 }}><div className="big-word">{q.word.es}</div><SpeakButton text={q.word.es} size={44} /></div>
        </>}
        {q.kind === "recall" && <>
          <p className="say-hint" style={{ marginBottom: 6 }}>How do you say this in Spanish?</p>
          <div className="row row--center" style={{ gap: 12, marginBottom: 18 }}>
            {q.word.emoji && <Art e={q.word.emoji} size={56} />}<div className="big-word" style={{ fontSize: "clamp(26px, 7vw, 36px)" }}>{q.word.en}</div>
          </div>
        </>}
        <div className="choices">
          {opts.map(o => <button key={o.key} type="button" className={`choice ${tapped === o.key ? "is-selected" : ""}`} disabled={!!tapped} onClick={() => answer(o.key)}>
            {o.emoji && <Art e={o.emoji} size={40} className="choice__emoji" />}<span>{o.label}</span>
          </button>)}
        </div>
        <Button variant="ghost" onClick={() => answer(null)} disabled={!!tapped} style={{ marginTop: 14 }}>🤷 I don’t know</Button>
      </motion.div>
    </Card>}

    {stage === "result" && <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
      <div className="row row--center"><Sol size={90} mood="celebrate" /></div>
      <h1 className="h2" style={{ margin: "8px 0 6px" }}>{placed ? "¡Fantástico!" : "¡Perfecto!"}</h1>
      <p className="muted" style={{ marginBottom: 16 }}>
        {placed ? <>You already know lots of Spanish. You’ll start in <b>{startWorld.name}</b>.</> : <>Let’s start your Spanish adventure from the very beginning.</>}
      </p>
      <Card className="placement-start" style={{ "--wc": startWorld.color, marginBottom: 16 }}>
        <Art e={startWorld.emoji} size={56} />
        <div className="grow" style={{ textAlign: "left" }}>
          <div className="eyebrow">Starting point</div>
          <div className="h3">{startWorld.name}</div>
          <div className="small muted">Lesson {lastLessonOf(placed) + 1}{placed ? ` · earlier lessons stay open to play any time` : ""}</div>
        </div>
      </Card>
      <p className="tiny muted" style={{ marginBottom: 16 }}>{right} of {asked} answered correctly. Skipped lessons don’t earn stars until you play them.</p>
      <Button variant="sun" size="lg" onClick={() => onDone({ world: placed, asked, right })}>Start learning! 🚀</Button>
    </motion.div>}
  </div>;
}
