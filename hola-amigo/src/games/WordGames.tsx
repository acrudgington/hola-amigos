import type React from "react";
// Vocabulary games: Learn intro, Flashcards, Matching, Drag & Match, Odd One Out.
import { useRef, useState } from "react";
import { buildOptions, shuffle, uniqueBy } from "../lib/utils.ts";
import { speech } from "../lib/speech.ts";
import { ALL_WORDS, type Word } from "../content/index.ts";
import type { GameProps } from "./types.ts";

type LearnStep = { kind: "show"; w: Word; i: number; n: number } | { kind: "check"; w: Word; i: number; n: number; label: string; options: Word[] };
import { Button, Choices, Feedback, SpeakButton } from "../components/ui.tsx";
import { useLater } from "./hooks.ts";

// ------------------------------------------------------------
// LEARN — meet words in batches of 4, check each batch, then a mixed round
// ------------------------------------------------------------
export function LearnIntro({ words, onDone, onWord }: { words: Word[]; onDone: () => void; onWord?: GameProps["onWord"] }) {
  // Build the whole plan up front, so short lessons can't hit an empty batch
  // (the old version got stuck on a blank screen if a lesson had ≤ 4 words).
  const [steps] = useState(() => {
    const pool = words.slice(0, 8);
    const batches: Word[][] = [];
    for (let i = 0; i < pool.length; i += 4) batches.push(pool.slice(i, i + 4));
    const out: LearnStep[] = [];
    batches.forEach((b, bi) => {
      b.forEach((w, i) => out.push({ kind: "show", w, i, n: b.length }));
      shuffle(b).forEach((w, i) => out.push({ kind: "check", w, i, n: b.length, label: `Practise batch ${bi + 1}`, options: buildOptions(w, pool) }));
    });
    if (batches.length > 1) {
      shuffle(pool).forEach((w, i) => out.push({ kind: "check", w, i, n: pool.length, label: "Mix them all up! 🎯", options: buildOptions(w, pool) }));
    }
    return out;
  });
  const [at, setAt] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const later = useLater();
  const step = steps[at];
  const next = () => (at + 1 < steps.length ? setAt(at + 1) : onDone());

  if (!step) return null;
  const { w } = step;

  if (step.kind === "show") {
    return <div className="text-center" key={at}>
      <div className="counter" style={{ marginBottom: 12 }}>New word {step.i + 1} / {step.n}</div>
      <div className="card card--pad-lg" style={{ marginBottom: 18, animation: "bounce-in .4s var(--ease-spring)" }}>
        <div className="big-emoji float">{w.emoji}</div>
        <div className="big-word" style={{ marginTop: 6 }}>{w.es}</div>
        <div className="h3 muted" style={{ marginTop: 4 }}>{w.en}</div>
        <div className="say-hint" style={{ marginTop: 6 }}>🗣️ say: <b>{w.say}</b></div>
        <div className="row row--center" style={{ marginTop: 14 }}><SpeakButton text={w.es} size={52} /></div>
      </div>
      <Button variant="sun" size="lg" block onClick={() => { speech.speak(w.es); next(); }}>
        {steps[at + 1]?.kind === "show" ? "Next word →" : "Let’s practise! →"}
      </Button>
    </div>;
  }

  const pick = (o: Word) => {
    if (picked != null) return;
    const ok = o.en === w.en;
    setPicked(o.en);
    onWord?.(w.es, w.en, ok);
    later(() => { setPicked(null); next(); }, 950);
  };
  return <div className="text-center" key={at}>
    <div className="counter">{step.label}</div>
    <div className="tiny muted" style={{ margin: "4px 0 12px" }}>{step.i + 1} / {step.n}</div>
    <div className="big-emoji" style={{ fontSize: 52 }}>{w.emoji}</div>
    <div className="row row--center" style={{ gap: 10, margin: "6px 0 16px" }}>
      <div className="big-word">{w.es}</div><SpeakButton text={w.es} />
    </div>
    <p className="say-hint" style={{ marginBottom: 12 }}>What does it mean?</p>
    <Choices options={step.options} getKey={o => o.en} render={o => <span>{o.en}</span>} answerKey={w.en} picked={picked} onPick={pick} />
    <Feedback show={picked != null} good={picked === w.en}>{picked === w.en ? "⭐ ¡Muy bien!" : <>It’s <b>{w.en}</b></>}</Feedback>
  </div>;
}

// ------------------------------------------------------------
// FLASHCARDS
// ------------------------------------------------------------
function FlashCard({ word, index }: { word: Word; index: number }) {
  const [flipped, setFlipped] = useState(false);
  return <div className={`flash ${flipped ? "is-flipped" : ""}`} style={{ animationDelay: `${index * 0.05}s` }}>
    <button type="button" className="flash__inner" onClick={() => { if (!flipped) speech.speak(word.es); setFlipped(f => !f); }}
      aria-label={flipped ? `${word.es} means ${word.en}` : `${word.es}. Tap to see the meaning`}>
      <div className="flash__face flash__front">
        <div style={{ fontSize: 40 }}>{word.emoji}</div>
        <div className="display" style={{ fontSize: 19, textAlign: "center" }}>{word.es}</div>
        <div className="tiny muted">tap to flip</div>
      </div>
      <div className="flash__face flash__back">
        <div className="display" style={{ fontSize: 19, textAlign: "center" }}>{word.en}</div>
        <div className="small" style={{ opacity: 0.9, fontWeight: 700 }}>🗣️ {word.say}</div>
      </div>
    </button>
    <div className="flash__speak"><SpeakButton text={word.es} size={34} /></div>
  </div>;
}

export function FlashCards({ words, onDone, cta = "Next →" }: { words: Word[]; onDone: () => void; cta?: string }) {
  return <>
    <p className="say-hint" style={{ marginBottom: 14 }}>Tap a card to flip it. Tap 🔊 to hear it!</p>
    <div className="grid-2">{words.map((w, i) => <FlashCard key={w.es} word={w} index={i} />)}</div>
    <div style={{ marginTop: 20 }}><Button variant="sun" size="lg" block onClick={onDone}>{cta}</Button></div>
  </>;
}

// ------------------------------------------------------------
// MATCHING — tap a Spanish word, then its English meaning
// ------------------------------------------------------------
type Side = "es" | "en";
export function MatchGame({ words, onDone, onWord }: GameProps & { words: Word[] }) {
  const [{ left, right }] = useState(() => {
    const pool = shuffle(uniqueBy(words, w => w.en)).slice(0, 6);
    return { left: pool, right: shuffle(pool) };
  });
  const [sel, setSel] = useState<{ side: Side; w: Word } | null>(null);
  const [matched, setMatched] = useState<string[]>([]);
  const [wrong, setWrong] = useState<{ es: string; en: string } | null>(null);
  const missed = useRef(new Set<string>());
  const later = useLater();

  const click = (side: Side, w: Word) => {
    if (matched.includes(w.es) || wrong) return;
    if (side === "es") speech.speak(w.es);
    if (!sel || sel.side === side) { setSel({ side, w }); return; }
    const es = side === "es" ? w : sel.w;
    const en = side === "en" ? w : sel.w;
    if (es.es === en.es) {
      const m = [...matched, es.es];
      setMatched(m); setSel(null);
      onWord?.(es.es, es.en, !missed.current.has(es.es));
      if (m.length === left.length) later(() => onDone(left.length - missed.current.size, left.length), 600);
    } else {
      missed.current.add(es.es);
      setWrong({ es: es.es, en: en.en });
      later(() => { setWrong(null); setSel(null); }, 550);
    }
  };
  const cls = (side: Side, w: Word) => {
    if (matched.includes(w.es)) return "is-matched";
    if (wrong && (side === "es" ? wrong.es === w.es : wrong.en === w.en)) return "is-wrong";
    if (sel && sel.side === side && sel.w.es === w.es) return side === "es" ? "is-selected" : "is-selected-alt";
    return "";
  };
  return <div>
    <p className="say-hint" style={{ marginBottom: 14 }}>Tap a Spanish word, then its English partner! 🎯</p>
    <div className="grid-2" style={{ gap: 10 }}>
      {([["es", left], ["en", right]] as [Side, Word[]][]).map(([side, list]) => <div key={side} className="stack" style={{ "--gap": "10px" }}>
        {list.map(w => <button key={w.es} type="button" className={`choice ${cls(side, w)}`} style={{ minHeight: 56, fontSize: 15 }}
          disabled={matched.includes(w.es)} onClick={() => click(side, w)}>
          {side === "es" ? <span><span aria-hidden="true">{w.emoji}</span> {w.es}</span> : <span>{w.en}</span>}
        </button>)}
      </div>)}
    </div>
    <div className="text-center tiny muted" style={{ marginTop: 14 }}>{matched.length} / {left.length} pairs</div>
  </div>;
}

// ------------------------------------------------------------
// DRAG & MATCH — drag each word onto its picture (touch + mouse)
// ------------------------------------------------------------
export function DragMatch({ words, onDone, onWord }: GameProps & { words: Word[] }) {
  // Only words with distinct pictures — two 👋 targets would be unfair.
  const [{ pool, targets }] = useState(() => {
    const p = shuffle(uniqueBy(words.slice(0, 8), w => w.emoji)).slice(0, 4);
    return { pool: p, targets: shuffle(p) };
  });
  const [placed, setPlaced] = useState<Record<string, true>>({});
  const [wrong, setWrong] = useState<string | null>(null);
  const [drag, setDrag] = useState<{ w: Word; x: number; y: number } | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const refs = useRef<Record<string, HTMLDivElement | null>>({});
  const missed = useRef(new Set<string>());
  const later = useLater();

  const targetAt = (x: number, y: number) => {
    for (const [es, el] of Object.entries(refs.current)) {
      if (!el || placed[es]) continue;
      const r = el.getBoundingClientRect();
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) return es;
    }
    return null;
  };
  const down = (e: React.PointerEvent<HTMLDivElement>, w: Word) => {
    if (placed[w.es]) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    setDrag({ w, x: e.clientX, y: e.clientY });
  };
  const move = (e: React.PointerEvent) => {
    if (!drag) return;
    setDrag(d => (d ? { ...d, x: e.clientX, y: e.clientY } : d));
    setHover(targetAt(e.clientX, e.clientY));
  };
  const up = (e: React.PointerEvent) => {
    if (!drag) return;
    const hit = targetAt(e.clientX, e.clientY);
    const { w } = drag;
    setDrag(null); setHover(null);
    if (!hit) return; // dropped on nothing — just let go, no penalty
    const ok = hit === w.es;
    if (ok) {
      const np: Record<string, true> = { ...placed, [w.es]: true };
      setPlaced(np);
      speech.speak(w.es);
      onWord?.(w.es, w.en, !missed.current.has(w.es));
      if (Object.keys(np).length === pool.length) later(() => onDone(pool.length - missed.current.size, pool.length), 700);
    } else {
      missed.current.add(w.es);
      onWord?.(w.es, w.en, false);
      setWrong(w.es);
      later(() => setWrong(null), 500);
    }
  };

  return <div className="text-center" style={{ touchAction: "none" }}>
    <p className="say-hint" style={{ marginBottom: 14 }}>Drag each word onto its picture! 👆</p>
    <div className="grid-2" style={{ maxWidth: 360, margin: "0 auto 20px" }}>
      {targets.map(w => <div key={w.es} ref={el => { refs.current[w.es] = el; }}
        className={`drop-target ${placed[w.es] ? "is-done" : ""} ${hover === w.es ? "is-hover" : ""}`}>
        <div style={{ fontSize: 46 }}>{w.emoji}</div>
        {placed[w.es] && <div style={{ fontWeight: 900, color: "var(--mint-d)", animation: "bounce-in .4s var(--ease-spring)" }}>{w.es} ✓</div>}
      </div>)}
    </div>
    <div className="chips" style={{ minHeight: 52 }}>
      {pool.map(w => placed[w.es] ? null :
        <div key={w.es} role="button" tabIndex={-1}
          className={`drag-chip ${drag?.w.es === w.es ? "is-ghost" : ""} ${wrong === w.es ? "is-wrong" : ""}`}
          onPointerDown={e => down(e, w)} onPointerMove={move} onPointerUp={up} onPointerCancel={() => { setDrag(null); setHover(null); }}>{w.es}</div>)}
    </div>
    {drag && <div className="drag-chip drag-float" style={{ left: drag.x, top: drag.y }}>{drag.w.es}</div>}
    <div className="tiny muted" style={{ marginTop: 14 }}>{Object.keys(placed).length} / {pool.length}</div>
  </div>;
}

// ------------------------------------------------------------
// ODD ONE OUT — three words from this lesson, one stranger
// ------------------------------------------------------------
type OddItem = Word & { isOdd?: boolean };
export function OddOneOut({ words, onDone, onWord }: GameProps & { words: Word[] }) {
  const [rounds] = useState(() => {
    const lesson = words.slice(0, 8);
    const lessonEs = new Set(lesson.map(w => w.es));
    const lessonEn = new Set(lesson.map(w => w.en));
    const outsiders = shuffle(ALL_WORDS.filter(w => !lessonEs.has(w.es) && !lessonEn.has(w.en)));
    return Array.from({ length: 4 }, (_, i) => {
      const three = shuffle(lesson).slice(0, 3);
      const emojis = new Set(three.map(w => w.emoji));
      const odd = outsiders.slice(i * 3).find(w => !emojis.has(w.emoji)) || outsiders[i];
      return odd && three.length === 3 ? { items: shuffle<OddItem>([...three, { ...odd, isOdd: true }]), odd } : null;
    }).filter((r): r is { items: OddItem[]; odd: Word } => r !== null);
  });
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const score = useRef(0);
  const later = useLater();
  const round = rounds[idx];
  if (!round) return <p className="text-center muted">Not enough words yet!</p>;

  const pick = (item: OddItem) => {
    if (picked != null) return;
    const ok = !!item.isOdd;
    if (ok) score.current += 1;
    setPicked(item.es);
    onWord?.(round.odd.es, round.odd.en, ok);
    later(() => {
      setPicked(null);
      if (idx + 1 < rounds.length) setIdx(idx + 1);
      else onDone(score.current, rounds.length);
    }, 1200);
  };
  const good = picked === round.odd.es;
  return <div className="text-center">
    <p className="say-hint" style={{ marginBottom: 4 }}>Which one doesn’t belong in this lesson? 🤔</p>
    <div className="counter" style={{ marginBottom: 14 }}>{idx + 1} / {rounds.length}</div>
    <Choices options={round.items} getKey={o => o.es} answerKey={round.odd.es} picked={picked} onPick={pick}
      render={o => <><span className="choice__emoji">{o.emoji}</span><span>{o.es}</span>{picked != null && <span className="choice__sub">{o.en}</span>}</>} />
    <Feedback show={picked != null} good={good}>{good ? "⭐ ¡Correcto!" : <>The stranger was <b>{round.odd.es}</b></>}</Feedback>
  </div>;
}
