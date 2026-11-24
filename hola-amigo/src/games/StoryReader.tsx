import { useEffect, useRef, useState } from "react";
import { shuffle } from "../lib/utils.ts";
import { speech } from "../lib/speech.ts";
import { Button, Choices, Feedback } from "../components/ui.tsx";
import { useLater } from "./hooks.ts";
import type { Story } from "../content/index.ts";
import type { OnDone } from "./types.ts";

interface Opt { text: string; correct: boolean }

// Split on sentence ends, but not inside quotes like "says '¡Hola!' to her".
const splitSentences = (para: string) => para.split(/(?<=[.!?…]['’"]?)\s+(?=[A-Z¡¿'"‘“ÁÉÍÓÚÑ])/).map(s => s.trim()).filter(Boolean);

// A short illustrated story, read page by page, followed by questions.
export function StoryReader({ story, onDone }: { story: Story; onDone: OnDone }) {
  // BUGFIX: in the course data the right answer is ALWAYS the first option
  // (ans: 0 in all 300 questions), and the old reader never shuffled — so
  // "always tap the top one" won every time. Options are now shuffled.
  const [questions] = useState(() => (story?.qs || []).map(q => {
    const opts = shuffle<Opt>(q.opts.map((text, i) => ({ text, correct: i === q.ans })));
    return { q: q.q, opts, answer: opts.find(o => o.correct)?.text ?? "" };
  }));
  const [page, setPage] = useState(0);
  const [qIdx, setQIdx] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [active, setActive] = useState(-1);
  const [reading, setReading] = useState(false);
  const score = useRef(0);
  const runId = useRef(0);
  const later = useLater();

  useEffect(() => () => { runId.current++; speech.stop(); }, []);
  if (!story) return <p className="text-center muted">No story for this lesson yet!</p>;

  const stop = () => { runId.current++; speech.stop(); setReading(false); setActive(-1); };

  if (page < story.paras.length) {
    const sentences = splitSentences(story.paras[page]);
    const readAll = () => {
      if (reading) { stop(); return; }
      const id = ++runId.current;
      setReading(true);
      const readFrom = (i: number) => {
        if (id !== runId.current) return;
        if (i >= sentences.length) { setReading(false); setActive(-1); return; }
        setActive(i);
        // Advance when the voice finishes; a timer backs it up in case the
        // browser never fires `end` (some mobile browsers don't).
        let advanced = false;
        const go = () => { if (!advanced) { advanced = true; readFrom(i + 1); } };
        speech.speak(sentences[i], { lang: "en", rate: 0.9, onEnd: () => setTimeout(go, 250) });
        setTimeout(go, Math.max(2500, sentences[i].length * 95));
      };
      readFrom(0);
    };
    const last = page === story.paras.length - 1;
    return <div className="text-center">
      <div style={{ fontSize: 40 }} aria-hidden="true">📖</div>
      <h3 className="h2" style={{ margin: "4px 0 6px" }}>{story.title}</h3>
      <div className="page-dots" aria-label={`Page ${page + 1} of ${story.paras.length}`}>
        {story.paras.map((_, i) => <span key={i} className={i === page ? "is-on" : ""} />)}
      </div>
      <div key={page} className="card card--pad story-page" style={{ marginBottom: 16, animation: "pop-in .35s var(--ease-spring)" }}>
        {sentences.map((s, i) => <span key={i} className={`story-sentence ${active === i ? "is-active" : ""}`}
          onClick={() => { stop(); setActive(i); speech.speak(s, { lang: "en", rate: 0.9 }); }}>{s} </span>)}
      </div>
      <div className="row row--center row--wrap" style={{ gap: 10 }}>
        <Button variant={reading ? "coral" : "luna"} onClick={readAll}>{reading ? "⏹ Stop" : "▶ Read to me"}</Button>
        <Button variant="sun" onClick={() => { stop(); setPage(page + 1); }}>{last ? "Questions →" : "Next page →"}</Button>
      </div>
      <p className="tiny muted" style={{ marginTop: 12 }}>💡 Tap any sentence to hear it.</p>
    </div>;
  }

  const q = questions[qIdx];
  if (!q) return null;
  const pick = (o: Opt) => {
    if (picked != null) return;
    if (o.correct) score.current += 1;
    setPicked(o.text);
    later(() => {
      setPicked(null);
      if (qIdx + 1 < questions.length) setQIdx(qIdx + 1);
      else onDone(score.current, questions.length);
    }, 1100);
  };
  return <div className="text-center">
    <div className="counter" style={{ marginBottom: 8 }}>Question {qIdx + 1} / {questions.length}</div>
    <p key={qIdx} className="prompt" style={{ animation: "pop-in .3s var(--ease-spring)" }}>{q.q}</p>
    <Choices list options={q.opts} getKey={o => o.text} render={o => <span>{o.text}</span>} answerKey={q.answer} picked={picked} onPick={pick} />
    <Feedback show={picked != null} good={picked === q.answer}>{picked === q.answer ? "⭐ ¡Muy bien!" : <>It was <b>{q.answer}</b></>}</Feedback>
  </div>;
}
