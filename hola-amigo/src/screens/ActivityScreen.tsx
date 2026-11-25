import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Icon } from "../components/Icon.tsx";
import { voice } from "../audio/player.ts";
import { useGuide, useSayOnShow } from "../audio/guide.ts";
import { INSTRUCTIONS } from "../audio/lines.ts";
import { conversationFor, surpriseFor, wordsForLessonsUpTo, wordsForWorld, worldOf, type Lesson, type Surprise, type Word, type World } from "../content/index.ts";
import { ACTIVITIES, type ActivityType } from "../lib/journey.ts";
import type { Mood } from "../lib/reactions.ts";
import type { Journey } from "../state/nav.ts";
import type { OnWord } from "../games/types.ts";

export interface ActivityStats { micUses?: number; storiesRead?: number; noCount?: boolean }
import { Button, Card, ProgressBar } from "../components/ui.tsx";
import { Luna, Sol } from "../components/Mascots.tsx";
import { BossBattle, ListenGame, Quiz, WarmUp } from "../games/ChoiceGames.tsx";
import { DragMatch, FlashCards, LearnIntro, MatchGame, OddOneOut } from "../games/WordGames.tsx";
import { SentenceGame } from "../games/SentenceGame.tsx";
import { StoryReader } from "../games/StoryReader.tsx";
import { SayItGame } from "../games/SayItGame.tsx";
import { TalkGame } from "../games/TalkGame.tsx";
import { Art } from "../components/Art.tsx";
import { warmupWords } from "../domain/memory.ts";
import type { Progress } from "../domain/progress.ts";

function SurpriseCard({ surprise, onDone }: { surprise: Surprise; onDone: () => void }) {
  useSayOnShow(surprise.lines.join(" "), { delay: 450 });
  return <div className="text-center" style={{ animation: "bounce-in .4s var(--ease-spring)" }}>
    <div className="float"><Art e={surprise.emoji} size={96} eager /></div>
    <h3 className="h2" style={{ margin: "6px 0 14px" }}>{surprise.title}</h3>
    <div className="card card--sun card--pad" style={{ marginBottom: 20 }}>
      {surprise.lines.map((line, i) => <p key={i} style={{ fontSize: i ? 15 : 19, fontWeight: i ? 700 : 800, fontFamily: i ? undefined : "var(--font-display)", color: i ? "var(--text-2)" : "var(--text)", lineHeight: 1.45, marginTop: i ? 8 : 0 }}>{line}</p>)}
    </div>
    <Button variant="sun" size="lg" block onClick={onDone}>Continue →</Button>
  </div>;
}

function FreeResult({ score, total, onRetry, onBack }: { score: number; total: number; onRetry: () => void; onBack: () => void }) {
  const pct = total ? score / total : 1;
  const tier: { e: string; t: string; m: Mood } = pct >= 0.8 ? { e: "🏆", t: "Amazing! Superstar!", m: "celebrate" } : pct >= 0.6 ? { e: "⭐", t: "Great job!", m: "happy" } : { e: "💪", t: "Keep practising!", m: "encourage" };
  return <div className="text-center" style={{ padding: "8px 0" }}>
    <div className="row row--center" style={{ gap: 6, marginBottom: 6 }}><Sol size={60} mood={tier.m === "happy" ? "wink" : tier.m} /><Luna size={56} mood={tier.m} /></div>
    <Art e={tier.e} size={72} eager />
    {total > 0 && <div className="display" style={{ fontSize: 40 }}>{score}<span className="muted" style={{ fontSize: 26 }}> / {total}</span></div>}
    <p className="h3" style={{ margin: "6px 0 20px" }}>{tier.t}</p>
    <div className="row row--center row--wrap" style={{ gap: 10 }}>
      <Button variant="luna" onClick={onRetry}>↻ Play again</Button>
      <Button onClick={onBack}>Back to lesson</Button>
    </div>
  </div>;
}

// One activity screen. Keyed by the parent, so a fresh key = a fresh game.
interface ActivityScreenProps {
  lesson: Lesson; type: ActivityType; journey: Journey | null; combo?: number; sessionXp?: number; progress?: Progress;
  onExit: () => void; onFinish: (correct: number, total: number, stats?: ActivityStats) => void; onRetry: () => void; onWord: OnWord;
}
export function ActivityScreen({ lesson, type, journey, combo = 0, sessionXp = 0, progress, onExit, onFinish, onRetry, onWord }: ActivityScreenProps) {
  const [result, setResult] = useState<{ score: number; total: number } | null>(null);
  // Activity inputs are fixed for the life of this screen.
  const [inputs] = useState((): { words?: Word[]; world?: World } => {
    if (type === "warmup") {
      // The child's weakest earlier words first (see domain/memory.ts).
      const earlier = wordsForLessonsUpTo(Math.max(1, lesson.id - 1));
      return { words: earlier.length >= 4 ? (progress ? warmupWords(progress, earlier, 5) : earlier) : lesson.words };
    }
    if (type === "boss") {
      const w = wordsForWorld(lesson.id);
      return { words: w.length >= 4 ? w : lesson.words, world: worldOf(lesson.id) };
    }
    return {};
  });
  const meta = ACTIVITIES[type];
  const guide = useGuide();
  // Read the instructions aloud as the activity opens (pre-readers can play alone).
  useSayOnShow(type === "surprise" ? null : INSTRUCTIONS[type], { delay: 450, lead: true });

  const finish = (correct: number, total: number, stats?: ActivityStats) => {
    onFinish(correct, total, stats);
    if (!journey) {
      if (total > 0) setResult({ score: correct, total });
      else onExit();
    }
  };
  const common = { onWord };
  const games: Record<ActivityType, () => JSX.Element> = {
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
    talk: () => { const c = conversationFor(lesson.id); return c ? <TalkGame key={lesson.id} conversation={c} onDone={(s, t, m) => finish(s, t, { micUses: m })} /> : <SayItGame words={lesson.words} {...common} onDone={(s, t) => finish(s, t, { micUses: t })} />; },
    build: () => <SentenceGame sentences={lesson.sentences} variant="build" onDone={finish} />,
    wordorder: () => <SentenceGame sentences={lesson.sentences} variant="wordorder" onDone={finish} />,
    story: () => <StoryReader story={lesson.story} onDone={(s, t) => finish(s, t, { storiesRead: 1 })} />,
    surprise: () => <SurpriseCard surprise={surpriseFor(lesson.id)} onDone={() => finish(0, 0, { noCount: true })} />,
    warmup: () => <WarmUp words={inputs.words ?? lesson.words} pool={wordsForLessonsUpTo(lesson.id)} {...common} onDone={finish} />,
    boss: () => <BossBattle words={inputs.words ?? lesson.words} world={inputs.world} {...common} onDone={finish} />,
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
        <h2 className="h2"><Art e={meta.emoji} size={34} eager />{meta.title}
          {type !== "surprise" && <button type="button" className={`hear-btn ${guide ? "" : "hear-btn--quiet"}`} onClick={() => voice.narrate(INSTRUCTIONS[type])}
            aria-label="Hear the instructions" title="Hear the instructions"><Icon name="volume" size={16} /></button>}
        </h2>
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
