// Sentence games: "Sentences" (build) and "Word Order" (unscramble).
// They share one engine; Word Order is the shorter, tap-to-remove variant.
import { useRef, useState } from "react";
import { shuffle } from "../lib/utils.ts";
import { speech } from "../lib/speech.ts";
import { Button, Feedback } from "../components/ui.tsx";
import { useLater } from "./hooks.ts";
import type { Sentence } from "../content/index.ts";
import type { OnDone } from "./types.ts";

interface Tile { id: number; w: string }

// Each tile gets an id so repeated words ("el … el") behave correctly.
const tilesFor = (s: Sentence): Tile[] => shuffle(s.shuffle.map((w, i) => ({ id: i, w })));

export function SentenceGame({ sentences, onDone, variant = "build" }: { sentences: Sentence[]; onDone: OnDone; variant?: "build" | "wordorder" }) {
  const [pool] = useState(() => (variant === "wordorder" ? shuffle(sentences).slice(0, 5) : sentences));
  const [idx, setIdx] = useState(0);
  const [placed, setPlaced] = useState<Tile[]>([]);
  const [avail, setAvail] = useState<Tile[]>(() => (pool[0] ? tilesFor(pool[0]) : []));
  const [fb, setFb] = useState<boolean | null>(null);
  const score = useRef(0);
  const later = useLater();

  if (!pool.length) return <p className="text-center muted">No sentences in this lesson yet!</p>;
  const s = pool[idx];
  if (!s) return null;

  const add = (t: Tile) => { if (fb !== null) return; setPlaced([...placed, t]); setAvail(avail.filter(x => x.id !== t.id)); };
  const remove = (t: Tile) => { if (fb !== null) return; setPlaced(placed.filter(x => x.id !== t.id)); setAvail([...avail, t]); };
  const undo = () => { if (placed.length) remove(placed[placed.length - 1]); };
  const check = () => {
    const ok = placed.map(t => t.w).join(" ") === s.correct.join(" ");
    setFb(ok);
    if (ok) { score.current += 1; speech.speak(s.correct.join(" ")); }
    later(() => {
      setFb(null);
      const ni = idx + 1;
      if (ni < pool.length) { setIdx(ni); setPlaced([]); setAvail(tilesFor(pool[ni])); }
      else onDone(score.current, pool.length);
    }, ok ? 1300 : 2200);
  };
  const ready = placed.length === s.correct.length && fb === null;

  return <div className="text-center">
    <div className="counter" style={{ marginBottom: 8 }}>Sentence {idx + 1} / {pool.length}</div>
    <p className="prompt" style={{ marginBottom: 14 }}><span aria-hidden="true">🇬🇧</span> {s.en}</p>
    <div className={`drop-zone ${fb === true ? "is-good" : fb === false ? "is-bad" : ""}`}>
      {placed.length
        ? placed.map(t => <button key={t.id} type="button" onClick={() => remove(t)}
            className={`chip chip--placed ${fb === true ? "chip--good" : fb === false ? "chip--bad" : ""}`}>{t.w}</button>)
        : <span className="muted small">Tap the words in order…</span>}
    </div>
    <div className="chips" style={{ minHeight: 48, marginBottom: 16 }}>
      {avail.map(t => <button key={t.id} type="button" className="chip" onClick={() => add(t)}>{t.w}</button>)}
    </div>
    <div className="row row--center" style={{ gap: 10 }}>
      <Button size="sm" onClick={undo} disabled={!placed.length || fb !== null}>↩ Undo</Button>
      <Button variant="mint" onClick={check} disabled={!ready}>Check ✓</Button>
    </div>
    <Feedback show={fb !== null} good={fb === true}>
      {fb ? "⭐ ¡Perfecto!" : <span>Answer: <b>{s.correct.join(" ")}</b></span>}
    </Feedback>
  </div>;
}
