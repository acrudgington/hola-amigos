import { useEffect, useRef, useState } from "react";
import { shuffle } from "../lib/utils.js";
import { similarity, speech } from "../lib/speech.js";
import { Button, SpeakButton } from "../components/ui.jsx";
import { Unsupported } from "./ChoiceGames.jsx";
import { useLater } from "./hooks.js";

const RESULTS = {
  pass: { emoji: "🤩", title: "¡Perfecto!", color: "var(--mint-d)" },
  close: { emoji: "😊", title: "Close enough!", color: "var(--sun-d)" },
  fail: { emoji: "🙉", title: "Let’s try again!", color: "var(--coral-d)" },
};

// Say the word aloud; the browser's speech recogniser checks it.
export function SayItGame({ words, onDone, onWord }) {
  const [pool] = useState(() => shuffle(words.slice(0, 8)).slice(0, 6));
  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState("idle"); // idle | prompting | listening | result
  const [heard, setHeard] = useState(null);
  const [result, setResult] = useState(null);
  const [err, setErr] = useState(null);
  const score = useRef(0);
  const scored = useRef(false);
  const recog = useRef(null);
  const later = useLater();

  // Stop the microphone if the child leaves mid-listen.
  useEffect(() => () => { try { recog.current?.abort(); } catch { /* ignore */ } }, []);

  if (!speech.recogSupported()) {
    return <Unsupported emoji="🎤" title="Microphone game not available"
      text="Speech recognition works best in Chrome, Edge or Safari. You can skip this one for now!" onSkip={() => onDone(0, 0)} />;
  }
  const word = pool[idx];
  if (!word) return null;

  const listen = () => {
    if (phase === "prompting" || phase === "listening") return;
    setHeard(null); setResult(null); setErr(null);
    setPhase("prompting");
    // Say the word first, then open the mic once the voice has finished
    // (so the recogniser doesn't just hear the app talking).
    let started = false;
    const start = () => {
      if (started) return;
      started = true;
      setPhase("listening");
      recog.current = speech.listen({
        onResult: alts => {
          const best = alts.reduce((b, t) => { const s = similarity(t, word.es); return s > b.s ? { t, s } : b; }, { t: "", s: 0 });
          const res = best.s >= 0.75 ? "pass" : best.s >= 0.55 ? "close" : "fail";
          setHeard(best.t);
          setResult(res);
          setPhase("result");
          const ok = res !== "fail";
          // Only the first scored attempt counts, but retries are encouraged.
          if (!scored.current) { scored.current = true; if (ok) score.current += 1; onWord?.(word.es, word.en, ok); }
        },
        onError: e => {
          setPhase("idle");
          if (e === "not-allowed" || e === "service-not-allowed") setErr("I need permission to use the microphone. Ask a grown-up to allow it!");
          else if (e === "no-speech") setErr("I didn’t hear anything — try a bit louder!");
          else if (e !== "aborted") setErr("Oops — let’s try that again!");
        },
        onEnd: () => setPhase(p => (p === "listening" ? "idle" : p)),
      });
    };
    speech.speak(word.es, { onEnd: () => later(start, 150) });
    later(start, 2500); // fallback if the voice never reports finishing
  };

  const next = () => {
    setHeard(null); setResult(null); setErr(null); setPhase("idle");
    scored.current = false;
    if (idx + 1 < pool.length) setIdx(idx + 1);
    else onDone(score.current, pool.length);
  };
  const r = result && RESULTS[result];

  return <div className="text-center">
    <div className="counter" style={{ marginBottom: 10 }}>Word {idx + 1} / {pool.length}</div>
    <div key={idx} style={{ animation: "bounce-in .4s var(--ease-spring)" }}>
      <div className="big-emoji">{word.emoji}</div>
      <div className="big-word" style={{ marginTop: 4 }}>{word.es}</div>
      <div className="say-hint" style={{ marginTop: 6 }}>🗣️ say: <b>{word.say}</b> · <i>{word.en}</i></div>
    </div>
    <div className="row row--center" style={{ margin: "14px 0 18px" }}>
      <SpeakButton text={word.es} size={46} label="Listen first" />
    </div>

    {!r && <>
      <button type="button" className={`mic-btn ${phase === "listening" ? "is-listening" : ""}`} onClick={listen}
        aria-label={phase === "listening" ? "Listening" : "Tap and say the word"}>🎤</button>
      <p className="say-hint" style={{ marginTop: 14, color: phase === "listening" ? "var(--coral-d)" : undefined }}>
        {phase === "prompting" ? "Listen…" : phase === "listening" ? <>Now you! Say “{word.es}”</> : "Tap the mic and say the word!"}
      </p>
    </>}

    {r && <div style={{ animation: "bounce-in .4s var(--ease-spring)" }}>
      <div style={{ fontSize: 68 }}>{r.emoji}</div>
      <div className="h2" style={{ color: r.color }}>{r.title}</div>
      {heard && <p className="small muted" style={{ marginTop: 4 }}>I heard: “{heard}”</p>}
    </div>}

    {err && <p className="form-error" style={{ marginTop: 12 }}>{err}</p>}

    <div className="row row--center row--wrap" style={{ gap: 10, marginTop: 18 }}>
      {(result === "fail" || result === "close") && <Button onClick={listen}>🎤 Try again</Button>}
      {(r || err)
        ? <Button variant="mint" onClick={next}>{idx + 1 < pool.length ? "Next word →" : "Finish 🏆"}</Button>
        : phase === "idle" && <Button variant="ghost" size="sm" onClick={next}>Skip this word</Button>}
    </div>
  </div>;
}
