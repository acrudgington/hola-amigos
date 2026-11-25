// Multiple-choice games: Quiz, Listen, Warm-up, Daily Review and Boss Battle.
// Each one builds its rounds ONCE when it mounts (useState initialiser), so a
// re-render of the app — a mascot reaction, a confetti burst — can never
// reshuffle or restart the game. (That was the root of the old "lesson loop" bugs.)
import { useEffect, useState, type ReactNode } from "react";
import { voice } from "../audio/player.ts";
import { buildOptions, shuffle, uniqueBy } from "../lib/utils.ts";
import { ALL_WORDS, type Gap, type Word, type World } from "../content/index.ts";
import type { GameProps } from "./types.ts";
import { Choices, Feedback, SpeakButton } from "../components/ui.tsx";
import { useLater, useRounds } from "./hooks.ts";
import { useGuide } from "../audio/guide.ts";
import { BOSS_HIT, PRAISE, REMEMBERED } from "../audio/lines.ts";

const praise = () => PRAISE[Math.floor(Math.random() * PRAISE.length)];
const emojiFor = (es: string) => ALL_WORDS.find(w => w.es === es)?.emoji || "";

// ------------------------------------------------------------
// The shared engine
// ------------------------------------------------------------
// An answer option. Gap-fill answers use only `en` (the text shown).
interface Opt { en: string; es?: string; emoji?: string }
interface Round {
  es?: string; en?: string; listen?: boolean;
  answerKey: string; reveal: string; options: Opt[];
  prompt?: ReactNode; render: (o: Opt) => ReactNode; list?: boolean;
  narrate?: string;   // read the question aloud (gap-fill questions)
}
const keyOf = (o: Opt) => o.en;

interface RoundGameProps extends GameProps {
  rounds: Round[]; counterLabel?: string; delay?: number;
  header?: () => ReactNode; goodText?: () => string;
}
function RoundGame({ rounds, onDone, onWord, counterLabel = "Question", header, goodText, delay = 1000 }: RoundGameProps) {
  const { idx, item, picked, answer, total } = useRounds(rounds, { onDone, delay });
  const [praiseText, setPraiseText] = useState(praise);

  // Read written questions aloud for pre-readers (after any instruction finishes).
  const guide = useGuide();
  useEffect(() => {
    if (!guide || !item?.narrate) return;
    const text = item.narrate;
    const t = setTimeout(() => voice.narrate(text, { mode: "queue" }), 350);
    return () => clearTimeout(t);
  }, [item, guide]);

  // Auto-play the word for listening rounds.
  useEffect(() => {
    if (!item?.listen || !item.es) return;
    const es = item.es;
    // Queued, so it waits for the spoken instruction to finish.
    const t = setTimeout(() => voice.spanish(es, { mode: "queue" }), 350);
    return () => clearTimeout(t);
  }, [item]);

  if (!item) return null;
  const pick = (o: Opt) => {
    const k = keyOf(o);
    const ok = k === item.answerKey;
    if (item.es) onWord?.(item.es, item.en ?? "", ok);
    const p = goodText ? goodText() : praise();
    setPraiseText(p);
    if (ok) voice.narrate(p, { speaker: "sol" });   // Sol cheers in Spanish
    answer(k, ok);
  };
  const good = picked === item.answerKey;

  return <div className="text-center">
    {header?.()}
    <div className="counter" style={{ marginBottom: 12 }}>{counterLabel} {idx + 1} / {total}</div>
    <div key={idx} style={{ animation: "pop-in .3s var(--ease-spring)" }}>
      {item.listen ? <>
        <p className="say-hint" style={{ marginBottom: 12 }}>Listen, then choose!</p>
        <div className="row row--center" style={{ marginBottom: 18 }}><SpeakButton text={item.es ?? ""} big label="Play again" /></div>
      </> : item.prompt}
    </div>
    <Choices options={item.options} getKey={keyOf} render={item.render} answerKey={item.answerKey} picked={picked} onPick={pick} list={item.list} />
    <Feedback show={picked != null} good={good}>
      {good ? `${goodText ? "" : "⭐ "}${praiseText}` : <>It’s <b>{item.reveal}</b></>}
    </Feedback>
  </div>;
}

const wordPrompt = (w: Word, sub?: string) => <>
  {sub && <p className="say-hint" style={{ marginBottom: 6 }}>{sub}</p>}
  <div className="row row--center" style={{ gap: 12, marginBottom: 18 }}>
    <div className="big-word">{w.es}</div>
    <SpeakButton text={w.es} size={44} />
  </div>
</>;

const withEmoji = (o: Opt) => <>{o.emoji && <span className="choice__emoji" style={{ fontSize: 30 }}>{o.emoji}</span>}<span>{o.en}</span></>;
const textOnly = (o: Opt) => <span>{o.en}</span>;

// Turn a word into a "what does it mean?" round.
function meaningRound(w: Word, pool: Word[], { listen = false, emoji = true, sub }: { listen?: boolean; emoji?: boolean; sub?: string } = {}): Round {
  return {
    es: w.es, en: w.en, listen, answerKey: w.en, reveal: `${w.emoji ? w.emoji + " " : ""}${w.en}`,
    options: buildOptions(w, pool),
    prompt: wordPrompt(w, sub),
    render: emoji ? withEmoji : textOnly,
  };
}

// ------------------------------------------------------------
// QUIZ — the lesson's words plus any milestone gap-fill questions
// ------------------------------------------------------------
export function Quiz({ words, gaps = [], onDone, onWord }: GameProps & { words: Word[]; gaps?: Gap[] }) {
  const [rounds] = useState(() => {
    // No emoji next to the Spanish word — that gave the answer away.
    const r = words.slice(0, 8).map(w => meaningRound(w, words, { emoji: false, sub: "What does this mean?" }));
    gaps.forEach(g => {
      const answer = g.opts[g.ans];
      r.push({
        answerKey: answer, reveal: answer, render: textOnly, list: true,
        options: shuffle(uniqueBy(g.opts, x => x)).map(en => ({ en })),
        prompt: <p className="prompt">{g.q}</p>, narrate: g.q,
      });
    });
    return shuffle(r).slice(0, 8);
  });
  return <RoundGame rounds={rounds} onDone={onDone} onWord={onWord} />;
}

// ------------------------------------------------------------
// LISTEN — hear the word, tap the right picture
// ------------------------------------------------------------
export function ListenGame({ words, onDone, onWord }: GameProps & { words: Word[] }) {
  const [rounds] = useState(() => shuffle(words.slice(0, 8)).slice(0, 6).map(w => ({
    ...meaningRound(w, words, { listen: true }),
    render: (o: Opt) => <><span className="choice__emoji">{o.emoji}</span><span className="choice__sub" style={{ color: "var(--text)" }}>{o.en}</span></>,
  })));
  if (!voice.available()) return <Unsupported emoji="🔊" title="Audio not supported" text="The Listen game needs speech, which works best in Chrome, Edge or Safari." onSkip={() => onDone(0, 0)} />;
  return <RoundGame rounds={rounds} onDone={onDone} onWord={onWord} counterLabel="Sound" />;
}

// ------------------------------------------------------------
// WARM-UP — "Can you still remember?" over earlier words
// ------------------------------------------------------------
export function WarmUp({ words, onDone, onWord }: GameProps & { words: Word[] }) {
  const [rounds] = useState(() => shuffle(words).slice(0, 5).map(w => meaningRound(w, ALL_WORDS, { sub: "Can you still remember? 🤔" })));
  return <RoundGame rounds={rounds} onDone={onDone} onWord={onWord} goodText={() => REMEMBERED} delay={900} />;
}

// ------------------------------------------------------------
// DAILY REVIEW — spaced repetition, alternating reading & listening
// ------------------------------------------------------------
export function ReviewGame({ dueWords, onDone, onWord }: GameProps & { dueWords: { es: string; en: string; emoji?: string }[] }) {
  const [rounds] = useState(() => dueWords.slice(0, 10).map((d, i) => {
    const w: Word = { es: d.es, en: d.en, emoji: d.emoji ?? emojiFor(d.es), say: "" };
    return meaningRound(w, ALL_WORDS, { listen: i % 2 === 1 && voice.available() });
  }));
  return <RoundGame rounds={rounds} onDone={onDone} onWord={onWord} counterLabel="Review" />;
}

// ------------------------------------------------------------
// BOSS BATTLE — end-of-world challenge with a health bar
// ------------------------------------------------------------
export function BossBattle({ words, world, onDone, onWord }: GameProps & { words: Word[]; world?: World }) {
  const [rounds] = useState(() => shuffle(words).slice(0, 10).map(w =>
    meaningRound(w, words, { listen: voice.available() && Math.random() < 0.5 })));
  const [hits, setHits] = useState(0);
  const [hitFx, setHitFx] = useState(0);
  const later = useLater();
  const onWordHit = (es: string, en: string, ok: boolean) => {
    onWord?.(es, en, ok);
    if (ok) { setHits(h => h + 1); setHitFx(x => x + 1); later(() => setHitFx(0), 400); }
  };
  const hp = Math.max(0, 1 - hits / rounds.length);
  return <RoundGame rounds={rounds} onDone={onDone} onWord={onWordHit} goodText={() => BOSS_HIT} delay={900}
    header={() => <div style={{ marginBottom: 14 }}>
      <div key={hitFx} className={`boss-emoji ${hitFx ? "is-hit" : ""}`}>{world?.emoji || "🐉"}</div>
      <div className="h3" style={{ marginTop: 4 }}>{world?.name || "Boss"} Challenge!</div>
      <div className="boss-hp" aria-label="Boss health"><div className="boss-hp__fill" style={{ width: `${hp * 100}%` }} /></div>
      <p className="tiny muted">Every right answer is a hit!</p>
    </div>} />;
}

export function Unsupported({ emoji, title, text, onSkip }: { emoji: string; title: string; text: string; onSkip?: () => void }) {
  return <div className="text-center" style={{ padding: "10px 4px" }}>
    <div className="big-emoji" style={{ marginBottom: 8 }}>{emoji}</div>
    <div className="h3" style={{ marginBottom: 8 }}>{title}</div>
    <p className="muted small" style={{ lineHeight: 1.5, marginBottom: 16 }}>{text}</p>
    {onSkip && <button type="button" className="btn btn--sun" onClick={onSkip}>Skip this one →</button>}
  </div>;
}
