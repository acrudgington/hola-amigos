// ============================================================
// ¡Hola, Amigo! — app shell: session, navigation, progress & game feel
// ============================================================
import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { LESSONS } from "./content/index.ts";
import { BADGES, applyRewards, findReward } from "./domain/rewards.ts";
import {
  XP, addStat, addXP, awardStars, bumpDaily, claimChest, db, levelInfo, levelTitle,
  logEvent, recordCombo, recordWord, repairProgress, starsForScore, touchStreak,
} from "./domain/progress.ts";
import { buildJourney } from "./lib/journey.ts";
import { pickReaction } from "./lib/reactions.ts";
import { applyTheme, loadPrefs, savePrefs } from "./lib/prefs.ts";
import { setSoundEnabled, sfx } from "./lib/sound.ts";
import { Confetti, LevelUpModal, RewardToast, XpPops } from "./components/ui.tsx";
import { MascotReaction } from "./components/Mascots.tsx";
import { Cosmos } from "./components/Cosmos.tsx";
import { Shell } from "./components/Shell.tsx";
import { CommandPalette } from "./components/CommandPalette.tsx";
import { AuthScreen } from "./screens/AuthScreen.tsx";
import { FamilyScreen } from "./screens/FamilyScreen.tsx";
import { ParentDashboard } from "./screens/ParentDashboard.tsx";
import { HomeScreen } from "./screens/HomeScreen.tsx";
import { LessonScreen } from "./screens/LessonScreen.tsx";
import { ActivityScreen } from "./screens/ActivityScreen.tsx";
import { DoneScreen } from "./screens/DoneScreen.tsx";
import { ReviewScreen } from "./screens/ReviewScreen.tsx";
import { ProfileScreen } from "./screens/ProfileScreen.tsx";
import { TrophyScreen } from "./screens/TrophyScreen.tsx";

const badgeEarned = (id, p) => !!BADGES.find(b => b.id === id)?.check(p);
const SHELL_VIEWS = new Set(["home", "review", "trophies", "profile", "lesson"]);

// Restore the saved session synchronously, so there's no loading flash.
function restore() {
  const sess = db.getSession();
  const parent = sess?.parentEmail ? db.findParent(sess.parentEmail) : null;
  const child = parent && sess.activeChildId ? db.getChild(sess.activeChildId) : null;
  return { parent, child };
}

const pageMotion = {
  // Opacity + y only: a lingering filter/transform would break position:fixed
  // children (tab bar, modals), and framer resets y:0 to "transform: none".
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
  exit: { opacity: 0, y: -10, transition: { duration: 0.18 } },
};

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
  const [combo, setCombo] = useState(0);
  const [sessionXp, setSessionXp] = useState(0);
  const [pops, setPops] = useState([]);
  const [levelUp, setLevelUp] = useState(null);
  const [prefs, setPrefs] = useState(loadPrefs);
  const [palette, setPalette] = useState(false);
  const childRef = useRef(child);
  const streakRef = useRef({ run: 0, lastWrong: false });
  const sessionXpRef = useRef(0);
  const pointer = useRef({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  childRef.current = child;

  const lesson = LESSONS.find(l => l.id === lessonId) || LESSONS[0];

  // ---------- preferences ----------
  useEffect(() => { applyTheme(prefs.theme); setSoundEnabled(prefs.sound); savePrefs(prefs); }, [prefs]);
  const togglePref = key => setPrefs(p => key === "theme"
    ? { ...p, theme: p.theme === "galaxy" ? "daylight" : "galaxy" }
    : { ...p, sound: !p.sound });

  // Remember where the child last tapped (XP pops float up from there) + a soft tap sound.
  useEffect(() => {
    const down = e => {
      pointer.current = { x: e.clientX, y: e.clientY };
      if (e.target.closest?.("button, [role=button]")) sfx.tap();
    };
    window.addEventListener("pointerdown", down, { passive: true });
    return () => window.removeEventListener("pointerdown", down);
  }, []);

  const celebrate = useCallback(() => setConfetti(c => c + 1), []);
  useEffect(() => {
    if (!confetti) return;
    const t = setTimeout(() => setConfetti(0), 3200);
    return () => clearTimeout(t);
  }, [confetti]);

  // ---------- progress: the single write path ----------
  // Read the latest saved copy, apply a pure change, award anything newly
  // earned, then save + render — so no update can overwrite another.
  const update = useCallback(fn => {
    const id = childRef.current?.id;
    if (!id) return null;
    const before = db.getProgress(id);
    let { progress: next, rewards: won } = applyRewards(fn(before));
    const L0 = levelInfo(before.xp).level, L1 = levelInfo(next.xp).level;
    // Everything earned also lands in the activity feed.
    for (const r of won) {
      const item = findReward(r);
      if (item) next = logEvent(next, { type: r.type, emoji: item.emoji, text: `New ${r.type === "badge" ? "badge" : r.type === "sticker" ? "sticker" : "outfit"}: ${item.name}` });
    }
    if (L1 > L0) next = logEvent(next, { type: "level", emoji: "⬆️", text: `Reached level ${L1} — ${levelTitle(L1)}!` });
    db.saveProgress(id, next);
    setProgress(next);
    if (won.length) { setRewards(q => [...q, ...won]); sfx.star(); }
    if (L1 > L0) {
      setTimeout(() => { setLevelUp({ level: L1, title: levelTitle(L1) }); sfx.levelUp(); setConfetti(c => c + 1); }, 450);
    }
    return next;
  }, []);

  const gainXP = (amount, label) => {
    sessionXpRef.current += amount;
    setSessionXp(sessionXpRef.current);
    const id = Math.random();
    setPops(p => [...p, { id, amount, label, x: pointer.current.x, y: pointer.current.y - 20 }]);
    setTimeout(() => setPops(p => p.filter(x => x.id !== id)), 1300);
  };

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
  const resetSession = () => { sessionXpRef.current = 0; setSessionXp(0); setCombo(0); streakRef.current = { run: 0, lastWrong: false }; setReaction(null); };
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
  const nav = key => (key === "family" ? switchChild() : (setJourney(null), setActivity(null), setView(key)));

  const startLesson = l => {
    const steps = buildJourney(l);
    resetSession();
    setLessonId(l.id);
    setJourney({ steps, step: 0, correct: 0, total: 0 });
    setActivity({ type: steps[0], run: Date.now() });
    setView("activity");
    sfx.whoosh();
  };
  const practice = type => { resetSession(); setJourney(null); setActivity({ type, run: Date.now() }); setView("activity"); };

  // ---------- answers & activities ----------
  const onWord = useCallback((es, en, ok, { quiet } = {}) => {
    const s = streakRef.current;
    if (quiet) { update(p => recordWord(p, es, en, ok)); return; }
    if (ok) {
      s.run += 1;
      const bonus = s.run % 5 === 0 ? XP.combo5 : 0;
      update(p => recordCombo(addXP(recordWord(p, es, en, ok), XP.correct + bonus), s.run));
      gainXP(XP.correct + bonus, s.run >= 3 ? `🔥x${s.run}` : "");
      setCombo(s.run);
      if (bonus) sfx.combo(); else sfx.correct();
      // Mascot reactions: occasional and earned, never on every answer.
      if (s.run % 3 === 0) setReaction(pickReaction("streak"));
      else if (s.lastWrong && Math.random() < 0.5) setReaction(pickReaction("recover"));
      s.lastWrong = false;
    } else {
      update(p => recordWord(p, es, en, ok));
      sfx.wrong();
      s.run = 0;
      s.lastWrong = true;
      setCombo(0);
      if (Math.random() < 0.34) setReaction(pickReaction("wrong"));
    }
  }, [update]); // eslint-disable-line react-hooks/exhaustive-deps

  // An activity finished (in a journey or in free practice).
  const finishActivity = (correct = 0, total = 0, stats = {}) => {
    let goalMet = false;
    update(p => {
      let n = p;
      if (!stats.noCount) { const r = bumpDaily(n); n = addXP(r.progress, XP.activity); goalMet = r.justMet; }
      if (correct) n = addStat(n, "correctAnswers", correct);
      if (stats.micUses) n = addStat(n, "micUses", stats.micUses);
      if (stats.storiesRead) n = addStat(n, "storiesRead", stats.storiesRead);
      return n;
    });
    if (!stats.noCount) { sessionXpRef.current += XP.activity; setSessionXp(sessionXpRef.current); }
    if (goalMet) celebrate();
    if (!journey) { if (total) sfx.complete(); return; }

    const j = { ...journey, correct: journey.correct + correct, total: journey.total + total };
    const next = j.step + 1;
    if (next < j.steps.length) {
      setJourney({ ...j, step: next });
      setActivity({ type: j.steps[next], run: Date.now() });
      sfx.whoosh();
      return;
    }
    // Journey complete → stars from how well it went, plus a lesson XP bonus.
    const before = db.getProgress(child.id).stars?.[lesson.id] || 0;
    const earned = starsForScore(j.correct, j.total);
    const bonus = XP.lesson + earned * XP.perStar;
    const after = update(p => logEvent(addXP(awardStars(p, lesson.id, earned), bonus),
      { type: "lesson", title: lesson.title, emoji: lesson.emoji, text: `Finished “${lesson.title}” · ${"★".repeat(earned)} · +${sessionXpRef.current + bonus} XP` }))?.stars?.[lesson.id] || earned;
    sessionXpRef.current += bonus;
    setDoneResult({ correct: j.correct, total: j.total, earned, before, after, xp: sessionXpRef.current });
    setJourney(null);
    setActivity(null);
    setReaction(null);
    setView("done");
    celebrate();
    sfx.complete();
  };

  const finishReview = (s, t) => {
    let goalMet = false;
    update(p => {
      const r = bumpDaily(addStat(addStat(p, "correctAnswers", s), "reviewsDone", 1));
      goalMet = r.justMet;
      return logEvent(addXP(r.progress, XP.review), { type: "review", emoji: "🔁", text: `Daily review: ${s} of ${t} right` });
    });
    sfx.complete();
    if (goalMet || s === t) celebrate();
  };

  const openChest = () => { update(p => logEvent(claimChest(p), { type: "chest", emoji: "🎁", text: `Opened the treasure chest · +${XP.chest} XP` })); gainXP(XP.chest, "🎁"); celebrate(); sfx.levelUp(); };

  // Sol's mission steps.
  const onMission = step => {
    if (step.action === "review") setView("review");
    else if (step.action === "lesson") step.done ? openLesson(step.lesson) : startLesson(step.lesson);
    else if (step.action === "quests" && step.ready) openChest();
  };

  // ⌘K / Ctrl+K opens "Ask Sol".
  useEffect(() => {
    const key = e => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); if (childRef.current) setPalette(p => !p); }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);
  const equip = (who, id) => update(p => ({ ...p, [who === "sol" ? "solOutfit" : "lunaOutfit"]: id }));

  // ---------- render ----------
  const overlays = <>
    <Confetti burst={confetti} />
    <XpPops pops={pops} />
    {rewards[0] && <RewardToast key={`${rewards[0].type}-${rewards[0].id}`} reward={rewards[0]} onClose={() => setRewards(q => q.slice(1))} />}
    {(view === "activity" || view === "review") && <MascotReaction reaction={reaction} onDone={() => setReaction(null)} />}
    {palette && child && progress && <CommandPalette onClose={() => setPalette(false)} onOpenLesson={openLesson}
      unlockedUpTo={Math.min(LESSONS.length, Object.keys(progress.stars || {}).reduce((m, id) => Math.max(m, Number(id)), 0) + 1)} />}
    {levelUp && <LevelUpModal level={levelUp.level} title={levelUp.title} onClose={() => setLevelUp(null)} />}
  </>;

  let content;
  if (!parent) content = <AuthScreen onLogin={login} />;
  else if (view === "dashboard") content = <ParentDashboard parent={parent} onBack={() => setView("family")} />;
  else if (!child || !progress || view === "family") {
    content = <FamilyScreen parent={parent} onPickChild={pickChild} onDashboard={() => setView("dashboard")} onLogout={logout} prefs={prefs} onToggle={togglePref} />;
  } else if (SHELL_VIEWS.has(view)) {
    let inner = null;
    if (view === "home") inner = <HomeScreen child={child} progress={progress}
      onStartLesson={startLesson} onOpenLesson={openLesson} onClaim={openChest} onSearch={() => setPalette(true)} onMission={onMission} />;
    if (view === "profile") inner = <ProfileScreen child={child} parent={parent} progress={progress} onTrophies={() => setView("trophies")} onSwitchChild={switchChild} />;
    if (view === "trophies") inner = <TrophyScreen progress={progress} onEquip={equip} />;
    if (view === "review") inner = <ReviewScreen progress={progress} onBack={goHome} onFinish={finishReview} onWord={onWord} />;
    if (view === "lesson") inner = <LessonScreen lesson={lesson} stars={progress.stars?.[lesson.id] || 0} onBack={goHome} onStart={() => startLesson(lesson)} onPractice={practice} />;
    content = <Shell child={child} progress={progress} active={view === "lesson" ? "home" : view} onNav={nav} prefs={prefs} onToggle={togglePref} onSearch={() => setPalette(true)}>
      <AnimatePresence mode="wait">
        <motion.div key={view + lessonId} {...pageMotion}>{inner}</motion.div>
      </AnimatePresence>
    </Shell>;
  } else if (view === "activity" && activity) {
    content = <ActivityScreen key={`${activity.type}-${activity.run}`} lesson={lesson} type={activity.type} journey={journey}
      combo={combo} sessionXp={sessionXp} onWord={onWord} onFinish={finishActivity}
      onExit={() => (journey ? goHome() : openLesson(lesson))}
      onRetry={() => practice(activity.type)} />;
  } else if (view === "done" && doneResult) {
    content = <DoneScreen lesson={lesson} result={doneResult} progress={progress}
      onNext={startLesson} onHome={goHome} onPractice={() => openLesson(lesson)} />;
  }

  const topKey = !parent ? "auth" : SHELL_VIEWS.has(view) && child ? "shell" : view === "activity" ? `act-${activity?.run}` : view;
  return <MotionConfig reducedMotion="user">
    <Cosmos />
    <div className="app">
      <AnimatePresence mode="wait">
        <motion.div key={topKey} {...pageMotion}>{content}</motion.div>
      </AnimatePresence>
    </div>
    {overlays}
  </MotionConfig>;
}
