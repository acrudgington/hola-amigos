import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Icon } from "../components/Icon.jsx";
import { surpriseFor, wordsForLessonsUpTo, wordsForWorld, worldOf } from "../data/course.js";
import { ACTIVITIES } from "../lib/journey.js";
import { Button, Card, ProgressBar } from "../components/ui.jsx";
import { Luna, Sol } from "../components/Mascots.jsx";
import { BossBattle, ListenGame, Quiz, WarmUp } from "../games/ChoiceGames.jsx";
import { DragMatch, FlashCards, LearnIntro, MatchGame, OddOneOut } from "../games/WordGames.jsx";
import { SentenceGame } from "../games/SentenceGame.jsx";
import { StoryReader } from "../games/StoryReader.jsx";
import { SayItGame } from "../games/SayItGame.jsx";

function SurpriseCard({ surprise, onDone }) {
  return <div className="text-center" style={{ animation: "bounce-in .4s var(--ease-spring)" }}>
    <div className="float" style={{ fontSize: 70 }}>{surprise.emoji}</div>
    <h3 className="h2" style={{ margin: "6px 0 14px" }}>{surprise.title}</h3>
    <div className="card card--sun card--pad" style={{ marginBottom: 20 }}>
      {surprise.lines.map((line, i) => <p key={i} style={{ fontSize: i ? 15 : 19, fontWeight: i ? 700 : 800, fontFamily: i ? undefined : "var(--font-display)", color: i ? "var(--text-2)" : "var(--text)", lineHeight: 1.45, marginTop: i ? 8 : 0 }}>{line}</p>)}
    </div>
    <Button variant="sun" size="lg" block onClick={onDone}>Continue →</Button>
  </div>;
}

function FreeResult({ score, total, onRetry, onBack }) {
  const pct = total ? score / total : 1;
  const tier = pct >= 0.8 ? { e: "🏆", t: "Amazing! Superstar!", m: "celebrate" } : pct >= 0.6 ? { e: "⭐", t: "Great job!", m: "happy" } : { e: "💪", t: "Keep practising!", m: "encourage" };
  return <div className="text-center" style={{ padding: "8px 0" }}>
    <div className="row row--center" style={{ gap: 6, marginBottom: 6 }}><Sol size={60} mood={tier.m === "happy" ? "wink" : tier.m} /><Luna size={56} mood={tier.m} /></div>
    <div style={{ fontSize: 54, animation: "bounce-in .5s var(--ease-spring)" }}>{tier.e}</div>
    {total > 0 && <div className="display" style={{ fontSize: 40 }}>{score}<span className="muted" style={{ fontSize: 26 }}> / {total}</span></div>}
    <p className="h3" style={{ margin: "6px 0 20px" }}>{tier.t}</p>
    <div className="row row--center row--wrap" style={{ gap: 10 }}>
      <Button variant="luna" onClick={onRetry}>↻ Play again</Button>
      <Button onClick={onBack}>Back to lesson</Button>
    </div>
  </div>;
}

// One activity screen. Keyed by the parent, so a fresh key = a fresh game.
export function ActivityScreen({ lesson, type, journey, combo = 0, sessionXp = 0, onExit, onFinish, onRetry, onWord }) {
  const [result, setResult] = useState(null);
  // Activity inputs are fixed for the life of this screen.
  const [inputs] = useState(() => {
    if (type === "warmup") {
      const earlier = wordsForLessonsUpTo(Math.max(1, lesson.id - 1));
      return { words: earlier.length >= 4 ? earlier : lesson.words };
    }
    if (type === "boss") {
      const w = wordsForWorld(lesson.id);
      return { words: w.length >= 4 ? w : lesson.words, world: worldOf(lesson.id) };
    }
    return {};
  });
  const meta = ACTIVITIES[type] || { title: type, emoji: "✨" };

  const finish = (correct, total, stats) => {
    onFinish(correct, total, stats);
    if (!journey) {
      if (total > 0) setResult({ score: correct, total });
      else onExit();
    }
  };
  const common = { onWord };
  const games = {
    learn: () => <LearnIntro words={lesson.words} {...common} onDone={() => finish(0, 0)} />,
    flash: () => <FlashCards words={lesson.words} cta={journey ? "Next →" : "⭐ I’ve learnt these!"} onDone={() => {
      lesson.words.forEach(w => onWord(w.es, w.en, true, { quiet: true }));
      finish(0, 0);
    }} />,
    listen: () => <ListenGame words={lesson.words} {...common} onDone={finish} />,
    match: () => <MatchGame words={lesson.words} {...common} onDone={finish} />,
    dragmatch: () => <DragMatch words={lesson.words} {...common} onDone={finish} />,
    oddone: () => <OddOneOut words={lesson.words} {...common} onDone={finish} />,
    quiz: () => <Quiz words={lesson.words} gaps={lesson.gaps} {...common} onDone={finish} />,
    sayit: () => <SayItGame words={lesson.words} {...common} onDone={(s, t) => finish(s, t, { micUses: t })} />,
    build: () => <SentenceGame sentences={lesson.sentences} variant="build" onDone={finish} />,
    wordorder: () => <SentenceGame sentences={lesson.sentences} variant="wordorder" onDone={finish} />,
    story: () => <StoryReader story={lesson.story} onDone={(s, t) => finish(s, t, { storiesRead: 1 })} />,
    surprise: () => <SurpriseCard surprise={surpriseFor(lesson.id)} onDone={() => finish(0, 0, { noCount: true })} />,
    warmup: () => <WarmUp words={inputs.words} {...common} onDone={finish} />,
    boss: () => <BossBattle words={inputs.words} world={inputs.world} {...common} onDone={finish} />,
  };

  return <div className="app-bg">
    <div className="page">
      <div className="activity-head">
        <button type="button" className="icon-btn" onClick={onExit} aria-label={journey ? "Leave lesson" : "Back"} title={journey ? "Leave lesson" : "Back"}><Icon name={journey ? "x" : "arrowLeft"} size={20} stroke={2.5} /></button>
        <div className="grow">
          {journey
            ? <ProgressBar value={journey.step / journey.steps.length} label="Lesson progress" />
            : <div className="small muted">Practice · {lesson.title}</div>}
        </div>
        <AnimatePresence>
          {combo >= 2 && <motion.span key="combo" className="combo" initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 15 }}>
            <span className="combo__flame"><Icon name="flame" size={15} fill /></span><motion.span key={combo} initial={{ scale: 1.8 }} animate={{ scale: 1 }}>x{combo}</motion.span>
          </motion.span>}
        </AnimatePresence>
        <span className="xp-chip" aria-label={`${sessionXp} XP earned`}><Icon name="bolt" size={15} fill /><motion.span key={sessionXp} initial={{ y: -8, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>{sessionXp}</motion.span></span>
      </div>
      {journey && <div className="counter text-center" style={{ marginTop: -10, marginBottom: 12 }}>Step {journey.step + 1} of {journey.steps.length}</div>}

      <div className="activity-title">
        <h2 className="h2"><span aria-hidden="true">{meta.emoji}</span>{meta.title}</h2>
        <div className="small muted" style={{ marginTop: 2 }}>Lesson {lesson.id} · {lesson.subtitle}</div>
      </div>

      {type === "flash" && !result
        ? games.flash()
        : <motion.div initial={{ opacity: 0, y: 24, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ type: "spring", stiffness: 260, damping: 24 }}>
          <Card className="card--pad-lg" style={{ padding: "24px 16px" }}>
            {result ? <FreeResult {...result} onRetry={onRetry} onBack={onExit} /> : (games[type]?.() ?? <p className="muted text-center">Unknown activity.</p>)}
          </Card>
        </motion.div>}
    </div>
  </div>;
}
