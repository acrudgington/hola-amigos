// Spanish stories: a bookshelf with one story per unit (content/stories.json).
// A story unlocks once its world is finished (or placed past). The reader reads
// it aloud in the Castilian voice, highlighting each sentence, with an English
// switch for support, then asks a few questions.
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { voice } from "../audio/player.ts";
import { useGuide } from "../audio/guide.ts";
import { BOOKS, WORLDS, type Book } from "../content/index.ts";
import { learnedUpTo, type Progress } from "../domain/progress.ts";
import { shuffle } from "../lib/utils.ts";
import { useLater } from "../games/hooks.ts";
import { Button, Card, Choices, Feedback, SpeakButton } from "../components/ui.tsx";
import { Art } from "../components/Art.tsx";
import { Icon } from "../components/Icon.tsx";

const worldOfBook = (b: Book) => WORLDS.find(w => w.id === b.world)!;
export const isBookUnlocked = (p: Progress, b: Book) => learnedUpTo(p) >= worldOfBook(b).range[1];

export function StoriesScreen({ progress, onFinish }: { progress: Progress; onFinish: (b: Book, right: number, total: number) => void }) {
  const [open, setOpen] = useState<Book | null>(null);
  if (open) return <BookReader book={open} onClose={() => setOpen(null)} onFinish={(s, t) => onFinish(open, s, t)} />;
  const unlocked = BOOKS.filter(b => isBookUnlocked(progress, b));
  const next = BOOKS.find(b => !isBookUnlocked(progress, b));
  return <div style={{ paddingTop: 4 }}>
    <div className="dash-head" style={{ marginBottom: 14 }}>
      <div>
        <div className="eyebrow">Spanish stories · {unlocked.length} of {BOOKS.length} unlocked</div>
        <h1 className="h1" style={{ marginTop: 4 }}>Story shelf</h1>
        <p className="small muted" style={{ marginTop: 4 }}>Real stories in Spanish, read aloud. Each one unlocks when you finish its world.</p>
      </div>
    </div>
    <div className="shelf">
      {BOOKS.map((b, i) => {
        const w = worldOfBook(b);
        const ok = isBookUnlocked(progress, b);
        const best = progress.storyBest?.[b.id];
        return <motion.button key={b.id} type="button" className={`book ${ok ? "" : "is-locked"}`} style={{ "--wc": w.color }} disabled={!ok}
          onClick={() => setOpen(b)} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
          aria-label={ok ? `${b.title}: ${b.en}` : `${b.title}, locked until you finish ${w.name}`}>
          <div className="book__cover">
            {ok ? <Art e={b.emoji} size={58} /> : <Icon name="lock" size={26} />}
            {best != null && <span className="book__badge">{best}/{b.questions.length} ★</span>}
          </div>
          <div className="book__title" lang="es">{b.title}</div>
          <div className="book__sub">{ok ? b.en : `Finish ${w.name}`}</div>
        </motion.button>;
      })}
    </div>
    {next && <p className="tiny muted" style={{ marginTop: 14 }}>Next story: “{next.title}”, when you finish {worldOfBook(next).name}.</p>}
  </div>;
}

interface Opt { text: string; correct: boolean }

// Spanish dialogue dashes stay attached to the next word (no line break after "—").
const keepDashes = (t: string) => t.replace(/—(?=\S)/g, "—\u2060");

function BookReader({ book, onClose, onFinish }: { book: Book; onClose: () => void; onFinish: (right: number, total: number) => void }) {
  const [stage, setStage] = useState<"read" | "questions" | "done">("read");
  const [english, setEnglish] = useState(false);
  const [active, setActive] = useState(-1);
  const [reading, setReading] = useState(false);
  const run = useRef(0);
  const [questions] = useState(() => book.questions.map(q => {
    const opts = shuffle<Opt>(q.opts.map((text, i) => ({ text, correct: i === q.ans })));
    return { q: q.q, opts, answer: opts.find(o => o.correct)!.text };
  }));
  const [qi, setQi] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const score = useRef(0);
  const later = useLater();
  const guide = useGuide();
  const w = worldOfBook(book);

  useEffect(() => () => { run.current++; voice.stop(); }, []);
  useEffect(() => {
    if (stage !== "questions" || !guide) return;
    const t = setTimeout(() => voice.narrate(questions[qi].q, { mode: "queue" }), 400);
    return () => clearTimeout(t);
  }, [stage, qi, guide, questions]);

  const stop = () => { run.current++; voice.stop(); setReading(false); setActive(-1); };
  const readFrom = (i: number, id: number) => {
    if (id !== run.current) return;
    if (i >= book.sentences.length) { setReading(false); setActive(-1); return; }
    setActive(i);
    let moved = false;
    const go = () => { if (!moved) { moved = true; readFrom(i + 1, id); } };
    voice.spanish(book.sentences[i].es, { onEnd: () => setTimeout(go, 350) });
    setTimeout(go, 5000 + book.sentences[i].es.length * 120);   // in case a device voice never reports finishing
  };
  const readAll = () => { if (reading) { stop(); return; } const id = ++run.current; setReading(true); readFrom(0, id); };

  const pick = (o: Opt) => {
    if (picked != null) return;
    if (o.correct) score.current += 1;
    setPicked(o.text);
    later(() => {
      setPicked(null);
      if (qi + 1 < questions.length) setQi(qi + 1);
      else { onFinish(score.current, questions.length); setStage("done"); }
    }, 1100);
  };

  return <div style={{ paddingTop: 4, maxWidth: 680, margin: "0 auto" }}>
    <Button size="sm" variant="ghost" onClick={() => { stop(); onClose(); }} style={{ marginBottom: 8 }}><Icon name="chevronLeft" size={16} />Story shelf</Button>
    <Card className="card--pad-lg reader" style={{ "--wc": w.color }}>
      <div className="reader__head">
        <Art e={book.emoji} size={56} />
        <div className="grow">
          <div className="eyebrow">{w.name}</div>
          <div className="row" style={{ gap: 8 }}><h1 className="h2" lang="es">{book.title}</h1><SpeakButton text={book.title} size={36} /></div>
          {english && <div className="small muted">{book.en}</div>}
        </div>
      </div>

      {stage === "read" && <>
        <div className="reader__text" lang="es">
          {book.sentences.map((s, i) => <p key={i} className={`reader__line ${active === i ? "is-active" : ""}`}>
            <span className="story-sentence" onClick={() => { stop(); setActive(i); voice.spanish(s.es); }}>{keepDashes(s.es)}</span>
            {english && <span className="reader__en" lang="en">{s.en}</span>}
          </p>)}
        </div>
        <div className="row row--center row--wrap" style={{ gap: 10, marginTop: 16 }}>
          <Button variant={reading ? "coral" : "luna"} onClick={readAll}>{reading ? "⏹ Stop" : "▶ Read to me"}</Button>
          <Button variant="white" onClick={() => setEnglish(e => !e)} aria-pressed={english}>{english ? "Hide English" : "Show English"}</Button>
          <Button variant="sun" onClick={() => { stop(); setStage("questions"); }}>Questions →</Button>
        </div>
        <p className="tiny muted text-center" style={{ marginTop: 10 }}>💡 Tap any sentence to hear it.</p>
      </>}

      {stage === "questions" && <div className="text-center">
        <div className="counter" style={{ marginBottom: 8 }}>Question {qi + 1} / {questions.length}</div>
        <p key={qi} className="prompt">{questions[qi].q}</p>
        <Choices list options={questions[qi].opts} getKey={o => o.text} render={o => <span>{o.text}</span>} answerKey={questions[qi].answer} picked={picked} onPick={pick} />
        <Feedback show={picked != null} good={picked === questions[qi].answer}>{picked === questions[qi].answer ? "⭐ ¡Muy bien!" : <>It was <b>{questions[qi].answer}</b></>}</Feedback>
      </div>}

      {stage === "done" && <div className="text-center">
        <Art e={score.current === questions.length ? "🏆" : "📖"} size={72} />
        <div className="display" style={{ fontSize: 40, marginTop: 6 }}>{score.current}<span className="muted" style={{ fontSize: 26 }}> / {questions.length}</span></div>
        <p className="h3" style={{ margin: "6px 0 18px" }}>{score.current === questions.length ? "¡Perfecto! You understood everything!" : "¡Muy bien! Read it again any time."}</p>
        <div className="row row--center row--wrap" style={{ gap: 10 }}>
          <Button variant="luna" onClick={() => { score.current = 0; setQi(0); setStage("read"); }}>↻ Read again</Button>
          <Button variant="sun" onClick={onClose}>Story shelf</Button>
        </div>
      </div>}
    </Card>
  </div>;
}
