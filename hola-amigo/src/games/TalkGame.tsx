// "Let's talk!": a short role-play. Sol or Luna asks a question in their own
// voice; the child answers out loud (checked for a sensible reply, not an exact
// match) or taps an answer. After two tries the model answer is shown and the
// chat carries on. One conversation per lesson (content/conversations).
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { voice } from "../audio/player.ts";
import type { Conversation } from "../content/index.ts";
import { judgeReply } from "../domain/conversation.ts";
import { speech, type Recognizer } from "../lib/speech.ts";
import { sfx } from "../lib/sound.ts";
import { shuffle } from "../lib/utils.ts";
import { Button, SpeakButton } from "../components/ui.tsx";
import { Luna, Sol } from "../components/Mascots.tsx";
import { Art } from "../components/Art.tsx";

interface Bubble { from: "them" | "me"; es: string; en?: string }
type Phase = "asking" | "answering" | "listening" | "answered";

export function TalkGame({ conversation: c, onDone }: { conversation: Conversation; onDone: (right: number, total: number, micUses: number) => void }) {
  const [i, setI] = useState(0);
  const [phase, setPhase] = useState<Phase>("asking");
  const [chat, setChat] = useState<Bubble[]>([]);
  const [tries, setTries] = useState(0);
  const [hint, setHint] = useState<string | null>(null);
  const [english, setEnglish] = useState(false);
  const [mood, setMood] = useState<"happy" | "encourage" | "celebrate" | "thinking">("happy");
  const right = useRef(0);
  const mic = useRef(0);
  const recog = useRef<Recognizer | null>(null);
  const box = useRef<HTMLDivElement>(null);
  // The character's reply (or the model answer) is spoken a moment after an
  // answer; moving on cancels it so it can't talk over the next question.
  const pending = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sayLater = (fn: () => void, ms: number) => { if (pending.current) clearTimeout(pending.current); pending.current = setTimeout(fn, ms); };
  useEffect(() => () => { if (pending.current) clearTimeout(pending.current); }, []);
  const turn = c.turns[i];
  const canListen = speech.recogSupported();
  const options = useMemo(() => shuffle([turn.answer, ...turn.wrong.slice(0, 2)]), [turn]);
  const Who = c.who === "sol" ? Sol : Luna;

  useEffect(() => () => { try { recog.current?.abort(); } catch { /* ignore */ } voice.stop(); }, []);
  // Keep the newest message in view by scrolling the chat box only, never the
  // page: moving the page would shift the answer buttons under a child's finger.
  useEffect(() => { const el = box.current; if (el) el.scrollTop = el.scrollHeight; }, [chat, phase]);

  // Each turn: the character asks, then it's the child's go.
  useEffect(() => {
    setChat(ch => [...ch, { from: "them", es: turn.ask, en: turn.askEn }]);
    setPhase("asking"); setTries(0); setHint(null); setMood("happy");
    let moved = false;
    const go = () => { if (!moved) { moved = true; setPhase("answering"); } };
    const t = setTimeout(() => voice.spanishBy(c.who, turn.ask, { onEnd: go }), 350);
    const fallback = setTimeout(go, 1800 + turn.ask.length * 70);
    return () => { clearTimeout(t); clearTimeout(fallback); };
  }, [i]); // eslint-disable-line react-hooks/exhaustive-deps

  const accept = (said: string) => {
    if (tries === 0) right.current += 1;
    sfx.correct();
    setMood("celebrate");
    setHint(null);
    setChat(ch => [...ch, { from: "me", es: said }, ...(turn.reply ? [{ from: "them" as const, es: turn.reply, en: turn.replyEn }] : [])]);
    setPhase("answered");
    // The reply waits for the child's answer to finish playing.
    if (turn.reply) sayLater(() => voice.spanishBy(c.who, turn.reply!, { mode: "queue" }), 250);
  };
  const miss = () => {
    const n = tries + 1;
    setTries(n);
    setMood("encourage");
    sfx.wrong();
    setHint(turn.answer);
    if (n >= 2) {
      // Show the answer and move on: hearing the model is learning too.
      setChat(ch => [...ch, { from: "me", es: turn.answer }]);
      setPhase("answered");
      sayLater(() => voice.spanish(turn.answer), 300);
    }
  };

  const listen = () => {
    if (phase !== "answering") return;
    mic.current += 1;
    setPhase("listening");
    recog.current = speech.listen({
      onResult: alts => {
        const v = judgeReply(alts, turn);
        setPhase("answering");
        if (v === "good" || v === "close") accept(alts[0] || turn.answer);
        else { setHint(turn.answer); miss(); }
      },
      onError: () => { setPhase("answering"); setHint(turn.answer); },
      onEnd: () => setPhase(p => (p === "listening" ? "answering" : p)),
    });
  };
  const tap = (o: string) => {
    if (phase !== "answering") return;
    try { voice.spanish(o); } catch { /* sound is a bonus; never block the chat */ }
    if (o === turn.answer) accept(o); else miss();
  };
  const next = () => {
    if (pending.current) { clearTimeout(pending.current); pending.current = null; }
    voice.stop();
    if (i + 1 < c.turns.length) setI(i + 1);
    else onDone(right.current, c.turns.length, mic.current);
  };

  return <div className="talk" data-phase={phase} data-turn={i} data-tries={tries}>
    <div className="talk__head">
      <div className="talk__who"><Who size={64} mood={mood} /></div>
      <div className="grow">
        <div className="eyebrow">Let’s talk · {i + 1} / {c.turns.length}</div>
        <div className="h3 row" style={{ gap: 6 }}><Art e={c.scene} size={24} />{c.title}</div>
        {c.role && <div className="small muted">{c.who === "sol" ? "Sol" : "Luna"} is {c.role}.</div>}
      </div>
      <Button size="sm" variant="white" onClick={() => setEnglish(e => !e)} aria-pressed={english}>{english ? "Hide English" : "English"}</Button>
    </div>

    <div className="talk__chat" lang="es" ref={box}>
      <AnimatePresence initial={false}>
        {chat.map((b, k) => <motion.div key={k} className={`talk__bubble talk__bubble--${b.from} talk__bubble--${c.who}`}
          initial={{ opacity: 0, y: 10, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }}>
          <span>{b.es}</span>
          {english && b.en && <span className="talk__en" lang="en">{b.en}</span>}
        </motion.div>)}
      </AnimatePresence>
    </div>

    {phase !== "answered" && <div className="talk__answer">
      {hint && <div className="talk__hint" role="status">
        <span>💡 You could say: <b lang="es">{hint}</b></span><SpeakButton text={hint} size={32} />
      </div>}
      {canListen && <div className="row row--center" style={{ marginBottom: 10 }}>
        <Button variant={phase === "listening" ? "coral" : "luna"} size="lg" onClick={listen} disabled={phase !== "answering"}>
          {phase === "listening" ? "👂 Listening…" : "🎤 Answer out loud"}
        </Button>
      </div>}
      <div className="small muted text-center" style={{ marginBottom: 8 }}>{canListen ? "or tap an answer:" : "Tap the best answer:"}</div>
      <div className="choices choices--list">
        {options.map(o => <button key={o} type="button" className="choice" lang="es" disabled={phase !== "answering"} onClick={() => tap(o)}>{o}</button>)}
      </div>
    </div>}
    {phase === "answered" && <div className="row row--center" style={{ marginTop: 14 }}>
      <Button variant="sun" size="lg" onClick={next}>{i + 1 < c.turns.length ? "Continue →" : "Finish ✓"}</Button>
    </div>}
  </div>;
}
