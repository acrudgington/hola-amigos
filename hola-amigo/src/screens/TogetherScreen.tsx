// "Learn together": a child and a grown-up share one device and take turns.
// Whoever's turn it is sees a picture and the English, and says the Spanish
// out loud. Their partner taps "Check" to hear the right answer, then says
// whether they got it. It's a team game (one shared score), and each answer
// comes with a pronunciation tip written for English-speaking grown-ups.
// Only the child's answers count towards their word memory.
import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { voice } from "../audio/player.ts";
import { useSayOnShow } from "../audio/guide.ts";
import { TOGETHER_LINES } from "../audio/lines.ts";
import { CONVERSATIONS, wordsForLessonsUpTo, wordsForWorld, type Conversation, type Turn, type Word } from "../content/index.ts";
import { learnedUpTo, type Progress } from "../domain/progress.ts";
import { trickyWords } from "../domain/memory.ts";
import { tipsFor } from "../domain/pronunciation.ts";
import { shuffle, uniqueBy } from "../lib/utils.ts";
import { sfx } from "../lib/sound.ts";
import type { Child } from "../services/index.ts";
import type { OnWord } from "../games/types.ts";
import { Button, Card, SpeakButton } from "../components/ui.tsx";
import { Luna, Sol } from "../components/Mascots.tsx";
import { Avatar } from "../components/Avatar.tsx";
import { Art } from "../components/Art.tsx";
import { Icon } from "../components/Icon.tsx";

const ROUND = 8;                       // 4 turns each
const PARTNERS = ["Mum", "Dad", "Grown-up", "Grandma", "Grandad"];

// Words the child has met: tricky ones first, then the current world, then anything learned.
export function togetherWords(p: Progress, n = ROUND): Word[] {
  const upTo = Math.max(1, learnedUpTo(p));
  const pool = wordsForLessonsUpTo(upTo);
  const byEs = new Map(pool.map(w => [w.es, w]));
  const tricky = trickyWords(p, 3).map(t => byEs.get(t.es)).filter((w): w is Word => !!w);
  const recent = shuffle(wordsForWorld(upTo).filter(w => byEs.has(w.es)));
  return uniqueBy([...tricky, ...recent, ...shuffle(pool)], w => w.es).slice(0, n);
}

interface WordTurn { word: Word; who: "kid" | "grownUp"; ok: boolean | null }
interface ChatCard { c: Conversation; turn: Turn; ok: boolean | null }

// Conversation questions from the lessons the child has reached (most recent first).
export function chatCards(p: Progress, n = 6): ChatCard[] {
  const upTo = Math.max(1, learnedUpTo(p));
  const recent = CONVERSATIONS.filter(c => c.lesson <= upTo).slice(-4);
  const cards = recent.flatMap(c => c.turns.map(turn => ({ c, turn, ok: null })));
  return shuffle(cards).slice(0, n);
}

export function TogetherScreen({ child, progress, onWord, onFinish, onBack }: {
  child: Child; progress: Progress; onWord: OnWord; onFinish: (score: number, total: number) => void; onBack: () => void;
}) {
  const [stage, setStage] = useState<"setup" | "play" | "chat" | "done">("setup");
  const [cards, setCards] = useState<ChatCard[]>([]);
  const [example, setExample] = useState(false);
  const [partner, setPartner] = useState("Grown-up");
  const [turns, setTurns] = useState<WordTurn[]>([]);
  const [i, setI] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const turn = turns[i];
  const chatMode = cards.length > 0 && stage !== "play";
  const score = chatMode ? cards.filter(x => x.ok).length : turns.filter(t => t.ok).length;
  const kidName = child.name;

  useSayOnShow(stage === "setup" ? TOGETHER_LINES.intro : stage === "done" ? TOGETHER_LINES.done
    : stage === "play" && turn && !revealed ? (turn.who === "kid" ? TOGETHER_LINES.kid : TOGETHER_LINES.grownUp) : null, { speaker: "sol", delay: 350 });

  const start = () => {
    const words = togetherWords(progress);
    setTurns(words.map((word, n) => ({ word, who: n % 2 === 0 ? "kid" : "grownUp", ok: null })));
    setI(0); setRevealed(false); setStage("play");
  };
  const startChat = () => { setCards(chatCards(progress)); setI(0); setExample(false); setStage("chat"); };
  const card = cards[i];
  const judgeCard = (ok: boolean) => {
    const next = cards.map((x, n) => (n === i ? { ...x, ok } : x));
    setCards(next);
    if (ok) sfx.correct(); else sfx.whoosh();
    if (i + 1 < next.length) { setI(i + 1); setExample(false); return; }
    setStage("done");
    onFinish(next.filter(x => x.ok).length, next.length);
  };
  const check = () => { setRevealed(true); voice.spanish(turn.word.es); };
  const judge = (ok: boolean) => {
    if (turn.who === "kid") onWord(turn.word.es, turn.word.en, ok, { quiet: true, dir: "recall" });
    if (ok) sfx.correct(); else sfx.whoosh();
    const next = turns.map((t, n) => (n === i ? { ...t, ok } : t));
    setTurns(next);
    if (i + 1 < next.length) { setI(i + 1); setRevealed(false); return; }
    setStage("done");
    onFinish(next.filter(t => t.ok).length, next.length);
  };
  const tips = useMemo(() => (turn ? tipsFor(turn.word.es) : []), [turn]);
  const whoName = turn?.who === "kid" ? kidName : partner;
  const checker = turn?.who === "kid" ? partner : kidName;

  return <div className="page page--narrow">
    <div className="row" style={{ marginBottom: 10 }}>
      <Button size="sm" variant="ghost" onClick={() => { voice.stop(); onBack(); }}><Icon name="chevronLeft" size={16} />Back</Button>
    </div>

    {stage === "setup" && <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="text-center">
      <div className="row row--center" style={{ gap: 8 }}><Avatar value={child.avatar} size={72} /><span className="together-plus">+</span><Art e="🧑" size={64} /></div>
      <h1 className="h2" style={{ margin: "10px 0 6px" }}>Learn together</h1>
      <p className="muted" style={{ marginBottom: 4 }}>Take turns with a grown-up. See the picture, say it in Spanish, then your partner checks.</p>
      <p className="small muted" style={{ marginBottom: 16 }}>Grown-ups: no Spanish needed. Tap “Check” to hear the answer, with a pronunciation tip.</p>
      <div className="eyebrow" style={{ marginBottom: 6 }}>Who is playing with {kidName}?</div>
      <div className="row row--center row--wrap" style={{ gap: 8, marginBottom: 20 }}>
        {PARTNERS.map(p => <Button key={p} size="sm" variant={partner === p ? "luna" : "white"} aria-pressed={partner === p} onClick={() => setPartner(p)}>{p}</Button>)}
      </div>
      <div className="row row--center row--wrap" style={{ gap: 10 }}>
        <Button variant="sun" size="lg" onClick={() => { setCards([]); start(); }}>🎯 Word game</Button>
        <Button variant="luna" size="lg" onClick={startChat}>💬 Chat cards</Button>
      </div>
      <p className="tiny muted" style={{ marginTop: 10 }}>Word game: take turns saying words. Chat cards: the grown-up asks questions from {kidName}’s lessons, and {kidName} answers in Spanish.</p>
    </motion.div>}

    {stage === "chat" && card && <Card className="card--pad-lg text-center together">
      <div className="together__score">{cards.map((x, n) => <span key={n} className={`together__pip together__pip--kid ${x.ok ? "is-ok" : x.ok === false ? "is-miss" : ""} ${n === i ? "is-now" : ""}`} />)}</div>
      <AnimatePresence mode="wait">
        <motion.div key={i} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.25 }}>
          <div className="eyebrow" style={{ marginBottom: 6 }}><Art e={card.c.scene} size={18} /> {card.c.title}</div>
          <p className="small muted" style={{ marginBottom: 6 }}>{partner}, ask {kidName}:</p>
          <div className="row row--center" style={{ gap: 10, marginBottom: 4 }}>
            <div className="big-word" lang="es" style={{ fontSize: "clamp(22px, 6vw, 30px)" }}>{card.turn.ask}</div>
            <SpeakButton text={card.turn.ask} size={40} />
          </div>
          <p className="small muted" style={{ marginBottom: 14 }}>“{card.turn.askEn}”</p>
          <p className="small" style={{ fontWeight: 800, marginBottom: 10 }}>🗣️ {kidName}, answer in Spanish!</p>
          {!example ? <Button variant="white" onClick={() => setExample(true)}>Show an example answer</Button> : <>
            <div className="together__answer">
              <div className="h3" lang="es">{card.turn.answer}</div>
              <SpeakButton text={card.turn.answer} size={36} label="Hear it" />
            </div>
            <p className="tiny muted" style={{ marginTop: 6 }}>“{card.turn.answerEn}”. Any sensible answer counts!</p>
          </>}
          <p className="small" style={{ fontWeight: 800, margin: "14px 0 8px" }}>{partner}: did {kidName} answer?</p>
          <div className="row row--center" style={{ gap: 10 }}>
            <Button variant="white" onClick={() => judgeCard(false)}>Not yet</Button>
            <Button variant="sun" onClick={() => judgeCard(true)}>¡Sí! ✓</Button>
          </div>
        </motion.div>
      </AnimatePresence>
    </Card>}

    {stage === "play" && turn && <Card className="card--pad-lg text-center together">
      <div className="together__score" aria-label={`Team score ${score}`}>
        {turns.map((t, n) => <span key={n} className={`together__pip together__pip--${t.who} ${t.ok ? "is-ok" : t.ok === false ? "is-miss" : ""} ${n === i ? "is-now" : ""}`} />)}
      </div>
      <AnimatePresence mode="wait">
        <motion.div key={i} initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ duration: 0.25 }}>
          <div className={`together__who together__who--${turn.who}`}>
            {turn.who === "kid" ? <Avatar value={child.avatar} size={44} /> : <Art e="🧑" size={40} />}
            <span><b>{whoName}</b>’s turn</span>
          </div>
          <p className="say-hint" style={{ margin: "10px 0 4px" }}>How do you say this in Spanish?</p>
          <div className="row row--center" style={{ gap: 12, margin: "6px 0 14px" }}>
            {turn.word.emoji && <Art e={turn.word.emoji} size={72} />}
            <div className="big-word" style={{ fontSize: "clamp(24px, 7vw, 34px)" }}>{turn.word.en}</div>
          </div>
          {!revealed ? <>
            <p className="small muted" style={{ marginBottom: 12 }}>🗣️ {whoName}, say it out loud. Then {checker} taps Check.</p>
            <Button variant="luna" size="lg" onClick={check}>Check 👂</Button>
          </> : <>
            <div className="together__answer">
              <div className="big-word" lang="es">{turn.word.es}</div>
              <SpeakButton text={turn.word.es} size={44} label="Hear it again" />
            </div>
            <ul className="together__tips">{tips.map(t => <li key={t.id}>💡 {t.text}</li>)}</ul>
            <p className="small" style={{ fontWeight: 800, margin: "12px 0 8px" }}>{checker}: did {whoName} say it?</p>
            <div className="row row--center" style={{ gap: 10 }}>
              <Button variant="white" onClick={() => judge(false)}>Not yet</Button>
              <Button variant="sun" onClick={() => judge(true)}>¡Sí! ✓</Button>
            </div>
          </>}
        </motion.div>
      </AnimatePresence>
    </Card>}

    {stage === "done" && <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
      <div className="row row--center" style={{ gap: 6 }}><Sol size={84} mood="celebrate" /><Luna size={78} mood="celebrate" /></div>
      <h1 className="h2" style={{ margin: "8px 0 4px" }}>¡Qué equipo!</h1>
      <div className="display" style={{ fontSize: 40 }}>{score}<span className="muted" style={{ fontSize: 26 }}> / {chatMode ? cards.length : turns.length}</span></div>
      {chatMode ? <p className="muted" style={{ margin: "4px 0 14px" }}>{kidName} answered {score} of {cards.length} questions in Spanish!</p> : <>
      <p className="muted" style={{ margin: "4px 0 14px" }}>
        {kidName}: {turns.filter(t => t.who === "kid" && t.ok).length} · {partner}: {turns.filter(t => t.who === "grownUp" && t.ok).length}
      </p>
      <Card style={{ textAlign: "left", marginBottom: 16 }}>
        <div className="eyebrow" style={{ marginBottom: 6 }}>Keep it going today</div>
        <p className="small" style={{ marginBottom: 8 }}>Pick one word and use it at home: point at it, ask “¿Qué es?”, and answer in Spanish.</p>
        <div className="tricky-words">{turns.map(t => <button key={t.word.es} type="button" className="tricky-word" lang="es" onClick={() => voice.spanish(t.word.es)}>
          <Art e={t.word.emoji} size={20} />{t.word.es} <small>{t.word.en}</small>
        </button>)}</div>
      </Card></>}
      <div className="row row--center row--wrap" style={{ gap: 10 }}>
        <Button variant="luna" onClick={chatMode ? startChat : start}>↻ Play again</Button>
        <Button variant="sun" onClick={onBack}>Done</Button>
      </div>
    </motion.div>}
  </div>;
}
