// ============================================================
// ¡Hola, Amigo! — app shell: session, navigation and progress
// ============================================================
import { useCallback, useEffect, useRef, useState } from "react";
import { LESSONS } from "./data/course.js";
import { BADGES, applyRewards } from "./data/rewards.js";
import {
  addStat, awardStars, bumpDaily, db, recordWord, repairProgress, starsForScore, touchStreak,
} from "./lib/db.js";
import { buildJourney } from "./lib/journey.js";
import { pickReaction } from "./lib/greeting.js";
import { Confetti, RewardToast } from "./components/ui.jsx";
import { MascotReaction } from "./components/Mascots.jsx";
import { AuthScreen } from "./screens/AuthScreen.jsx";
import { FamilyScreen } from "./screens/FamilyScreen.jsx";
import { ParentDashboard } from "./screens/ParentDashboard.jsx";
import { HomeScreen } from "./screens/HomeScreen.jsx";
import { LessonScreen } from "./screens/LessonScreen.jsx";
import { ActivityScreen } from "./screens/ActivityScreen.jsx";
import { DoneScreen } from "./screens/DoneScreen.jsx";
import { ReviewScreen } from "./screens/ReviewScreen.jsx";
import { ProfileScreen } from "./screens/ProfileScreen.jsx";
import { TrophyScreen } from "./screens/TrophyScreen.jsx";

const badgeEarned = (id, p) => !!BADGES.find(b => b.id === id)?.check(p);

// Restore the saved session synchronously, so there's no loading flash.
function restore() {
  const sess = db.getSession();
  const parent = sess?.parentEmail ? db.findParent(sess.parentEmail) : null;
  const child = parent && sess.activeChildId ? db.getChild(sess.activeChildId) : null;
  return { parent, child };
}

export default function App() {
  const [{ parent, child }, setWho] = useState(restore);
  const [progress, setProgress] = useState(() => (child ? db.getProgress(child.id) : null));
  const [previousVisit, setPreviousVisit] = useState(null);
  const [view, setView] = useState(child ? "home" : "family");
  const [lessonId, setLessonId] = useState(1);
  const [activity, setActivity] = useState(null);   // { type, run }
  const [journey, setJourney] = useState(null);     // { steps, step, correct, total }
  const [doneResult, setDoneResult] = useState(null);
  const [rewards, setRewards] = useState([]);
  const [confetti, setConfetti] = useState(0);
  const [reaction, setReaction] = useState(null);
  const childRef = useRef(child);
  const streakRef = useRef({ run: 0, lastWrong: false });
  childRef.current = child;

  const lesson = LESSONS.find(l => l.id === lessonId) || LESSONS[0];

  // ---------- progress: the single write path ----------
  // Always read the latest saved copy, apply a pure change, award anything
  // newly earned, then save + render. The old app mixed stale React state with
  // direct storage writes, so finishing a lesson could wipe the words just
  // practised, the daily count, or even the star itself.
  const update = useCallback(fn => {
    const id = childRef.current?.id;
    if (!id) return null;
    const { progress: next, rewards: won } = applyRewards(fn(db.getProgress(id)));
    db.saveProgress(id, next);
    setProgress(next);
    if (won.length) setRewards(q => [...q, ...won]);
    return next;
  }, []);

  const celebrate = useCallback(() => setConfetti(c => c + 1), []);
  useEffect(() => {
    if (!confetti) return;
    const t = setTimeout(() => setConfetti(0), 3200);
    return () => clearTimeout(t);
  }, [confetti]);

  // Open a child's profile: record the visit, repair old saves.
  const entered = useRef(null);
  const enterChild = useCallback(c => {
    childRef.current = c;
    if (entered.current === c.id) return;
    entered.current = c.id;
    setPreviousVisit(db.getProgress(c.id).lastActive);
    update(p => touchStreak(repairProgress(p, badgeEarned)));
  }, [update]);

  useEffect(() => { if (child) enterChild(child); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Scroll to the top whenever the screen changes (the map handles its own scroll).
  useEffect(() => { if (view !== "home") window.scrollTo(0, 0); }, [view, activity, journey?.step]);

  // ---------- navigation ----------
  const login = p => { db.setSession({ parentEmail: p.email, activeChildId: null }); setWho({ parent: p, child: null }); setView("family"); };
  const logout = () => { entered.current = null; db.clearSession(); setWho({ parent: null, child: null }); setProgress(null); setView("family"); };
  const pickChild = c => {
    db.setSession({ parentEmail: parent.email, activeChildId: c.id });
    setWho({ parent, child: c });
    enterChild(c);
    setView("home");
  };
  const switchChild = () => {
    db.setSession({ parentEmail: parent.email, activeChildId: null });
    setWho({ parent, child: null });
    entered.current = null;
    setProgress(null); setJourney(null); setActivity(null);
    setView("family");
  };
  const goHome = () => { setJourney(null); setActivity(null); setView("home"); };
  const openLesson = l => { setLessonId(l.id); setJourney(null); setActivity(null); setView("lesson"); };

  const startLesson = l => {
    const steps = buildJourney(l);
    streakRef.current = { run: 0, lastWrong: false };
    setReaction(null);
    setLessonId(l.id);
    setJourney({ steps, step: 0, correct: 0, total: 0 });
    setActivity({ type: steps[0], run: Date.now() });
    setView("activity");
  };
  const practice = type => { setJourney(null); setActivity({ type, run: Date.now() }); setView("activity"); };

  // ---------- answers & activities ----------
  const onWord = useCallback((es, en, ok, { quiet } = {}) => {
    update(p => recordWord(p, es, en, ok));
    if (quiet) return;
    // Mascot reactions: occasional and earned, never on every answer.
    const s = streakRef.current;
    if (ok) {
      s.run += 1;
      if (s.run % 3 === 0) setReaction(pickReaction("streak"));
      else if (s.lastWrong && Math.random() < 0.5) setReaction(pickReaction("recover"));
      s.lastWrong = false;
    } else {
      s.run = 0;
      s.lastWrong = true;
      if (Math.random() < 0.34) setReaction(pickReaction("wrong"));
    }
  }, [update]);

  // An activity finished (in a journey or in free practice).
  const finishActivity = (correct = 0, total = 0, stats = {}) => {
    let goalMet = false;
    update(p => {
      let n = p;
      if (!stats.noCount) { const r = bumpDaily(n); n = r.progress; goalMet = r.justMet; }
      if (correct) n = addStat(n, "correctAnswers", correct);
      if (stats.micUses) n = addStat(n, "micUses", stats.micUses);
      if (stats.storiesRead) n = addStat(n, "storiesRead", stats.storiesRead);
      return n;
    });
    if (goalMet) celebrate();
    if (!journey) return;

    const j = { ...journey, correct: journey.correct + correct, total: journey.total + total };
    const next = j.step + 1;
    if (next < j.steps.length) {
      setJourney({ ...j, step: next });
      setActivity({ type: j.steps[next], run: Date.now() });
      return;
    }
    // Journey complete → stars from how well it went.
    const before = db.getProgress(child.id).stars?.[lesson.id] || 0;
    const earned = starsForScore(j.correct, j.total);
    const after = update(p => awardStars(p, lesson.id, earned))?.stars?.[lesson.id] || earned;
    setDoneResult({ correct: j.correct, total: j.total, earned, before, after });
    setJourney(null);
    setActivity(null);
    setReaction(null);
    setView("done");
    celebrate();
  };

  const finishReview = (s, t) => {
    let goalMet = false;
    update(p => {
      const r = bumpDaily(addStat(addStat(p, "correctAnswers", s), "reviewsDone", 1));
      goalMet = r.justMet;
      return r.progress;
    });
    if (goalMet || s === t) celebrate();
  };

  const equip = (who, id) => update(p => ({ ...p, [who === "sol" ? "solOutfit" : "lunaOutfit"]: id }));

  // ---------- render ----------
  const overlays = <>
    <Confetti burst={confetti} />
    {rewards[0] && <RewardToast key={`${rewards[0].type}-${rewards[0].id}`} reward={rewards[0]} onClose={() => setRewards(q => q.slice(1))} />}
    {(view === "activity" || view === "review") && <MascotReaction reaction={reaction} onDone={() => setReaction(null)} />}
  </>;

  if (!parent) return <AuthScreen onLogin={login} />;
  if (view === "dashboard") return <ParentDashboard parent={parent} onBack={() => setView("family")} />;
  if (!child || !progress || view === "family") {
    return <FamilyScreen parent={parent} onPickChild={pickChild} onDashboard={() => setView("dashboard")} onLogout={logout} />;
  }

  let screen = null;
  switch (view) {
    case "home":
      screen = <HomeScreen child={child} progress={progress} previousVisit={previousVisit}
        onStartLesson={startLesson} onOpenLesson={openLesson} onReview={() => setView("review")}
        onProfile={() => setView("profile")} onTrophies={() => setView("trophies")} onSwitchChild={switchChild} />;
      break;
    case "profile":
      screen = <ProfileScreen child={child} parent={parent} progress={progress} onBack={goHome} onTrophies={() => setView("trophies")} onSwitchChild={switchChild} />;
      break;
    case "trophies":
      screen = <TrophyScreen progress={progress} onBack={goHome} onEquip={equip} />;
      break;
    case "lesson":
      screen = <LessonScreen lesson={lesson} stars={progress.stars?.[lesson.id] || 0} onBack={goHome}
        onStart={() => startLesson(lesson)} onPractice={practice} />;
      break;
    case "activity":
      screen = activity && <ActivityScreen key={`${activity.type}-${activity.run}`} lesson={lesson} type={activity.type} journey={journey}
        onWord={onWord} onFinish={finishActivity}
        onExit={() => (journey ? goHome() : openLesson(lesson))}
        onRetry={() => practice(activity.type)} />;
      break;
    case "done":
      screen = <DoneScreen lesson={lesson} result={doneResult} progress={progress}
        onNext={startLesson} onHome={goHome} onPractice={() => openLesson(lesson)} />;
      break;
    case "review":
      screen = <ReviewScreen progress={progress} onBack={goHome} onFinish={finishReview} onWord={onWord} />;
      break;
    default:
      screen = null;
  }
  return <>{screen}{overlays}</>;
}
