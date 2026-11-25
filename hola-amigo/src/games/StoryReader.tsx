import { useEffect, useRef, useState } from "react";
import { shuffle } from "../lib/utils.ts";
import { voice } from "../audio/player.ts";
import { splitSentences } from "../audio/text.ts";
import { useGuide } from "../audio/guide.ts";
import { Button, Choices, Feedback } from "../components/ui.tsx";
import { useLater } from "./hooks.ts";
import type { Story } from "../content/index.ts";
import type { OnDone } from "./types.ts";
import { Art } from "../components/Art.tsx";

interface Opt { text: string; correct: boolean }


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

  useEffect(() => () => { runId.current++; voice.stop(); }, []);
  // Read each question aloud when it appears (for pre-readers).
  const guide = useGuide();
  const onQuestions = page >= (story?.paras.length ?? 0);
  useEffect(() => {
    if (!guide || !onQuestions) return;
    const q = questions[qIdx];
    if (!q) return;
    const t = setTimeout(() => voice.narrate(q.q, { mode: "queue" }), 400);
    return () => clearTimeout(t);
  }, [guide, onQuestions, qIdx, questions]);
  if (!story) return <p className="text-center muted">No story for this lesson yet!</p>;

  const stop = () => { runId.current++; voice.stop(); setReading(false); setActive(-1); };

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
        // Advance when the voice finishes; a generous timer backs it up in case
        // a device voice never reports finishing (some mobile browsers don't).
        let advanced = false;
        const go = () => { if (!advanced) { advanced = true; readFrom(i + 1); } };
        voice.narrate(sentences[i], { onEnd: () => setTimeout(go, 250) });
        setTimeout(go, 4000 + sentences[i].length * 160);
      };
      readFrom(0);
    };
    const last = page === story.paras.length - 1;
    return <div className="text-center">
      <Art e="📖" size={56} eager />
      <h3 className="h2" style={{ margin: "4px 0 6px" }}>{story.title}</h3>
      <div className="page-dots" aria-label={`Page ${page + 1} of ${story.paras.length}`}>
        {story.paras.map((_, i) => <span key={i} className={i === page ? "is-on" : ""} />)}
      </div>
      <div key={page} className="card card--pad story-page" style={{ marginBottom: 16, animation: "pop-in .35s var(--ease-spring)" }}>
        {sentences.map((s, i) => <span key={i} className={`story-sentence ${active === i ? "is-active" : ""}`}
          onClick={() => { stop(); setActive(i); voice.narrate(s); }}>{s} </span>)}
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
