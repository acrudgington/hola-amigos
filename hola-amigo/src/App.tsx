// ============================================================
// ¡Hola, Amigo! — app shell
// Wires together: the account/storage services, the navigation state
// machine (state/nav.ts), the progress store (state/useProgress.ts) and the
// game-feel layer (XP pops, combos, sounds, toasts, level-ups).
// ============================================================
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { lessonById, LESSONS, packOf, type Lesson } from "./content/index.ts";
import { isBadgeEarned, type EarnedReward } from "./domain/rewards.ts";
import {
  XP, addStat, addXP, awardStars, bumpDaily, claimChest, logEvent,
  recordCombo, recordWord, repairProgress, starsForScore, starsOf, touchStreak, unlockedUpTo, isFreshLearner, type Progress,
} from "./domain/progress.ts";
import { services, type Child, type Parent } from "./services/index.ts";
import { initialNav, isLastStep, navReducer, type ShellView } from "./state/nav.ts";
import { useProgress } from "./state/useProgress.ts";
import { buildJourney, type ActivityType } from "./lib/journey.ts";
import type { MissionStep } from "./lib/mission.ts";
import { pickReaction, type Reaction } from "./lib/reactions.ts";
import { applyTheme, loadPrefs, savePrefs, type Prefs } from "./lib/prefs.ts";
import { setSoundEnabled, sfx } from "./lib/sound.ts";
import { voice } from "./audio/player.ts";
import { GuideContext } from "./audio/guide.ts";
import { LEVEL_UP_LINE } from "./audio/lines.ts";
import { Button, Confetti, LevelUpModal, RewardToast, XpPops, type XpPop } from "./components/ui.tsx";
import { MascotReaction } from "./components/Mascots.tsx";
import { Cosmos } from "./components/Cosmos.tsx";
import { Shell, type NavKey } from "./components/Shell.tsx";
import { CommandPalette } from "./components/CommandPalette.tsx";
import { AuthScreen } from "./screens/AuthScreen.tsx";
import { FamilyScreen } from "./screens/FamilyScreen.tsx";
import { ParentDashboard } from "./screens/ParentDashboard.tsx";
import { HomeScreen } from "./screens/HomeScreen.tsx";
import { LessonScreen } from "./screens/LessonScreen.tsx";
import { ActivityScreen, type ActivityStats } from "./screens/ActivityScreen.tsx";
import { DoneScreen } from "./screens/DoneScreen.tsx";
import { ReviewScreen } from "./screens/ReviewScreen.tsx";
import { ProfileScreen } from "./screens/ProfileScreen.tsx";
import { TrophyScreen } from "./screens/TrophyScreen.tsx";
import { PlacementScreen } from "./screens/PlacementScreen.tsx";
import { lastLessonOf } from "./domain/placement.ts";
import { StoriesScreen } from "./screens/StoriesScreen.tsx";
import { AdultCourseCard, PackScreen } from "./screens/PackScreen.tsx";
import { LabelsScreen } from "./screens/LabelsScreen.tsx";
import { TogetherScreen } from "./screens/TogetherScreen.tsx";
import type { Book } from "./content/index.ts";

const SHELL_VIEWS = new Set(["home", "review", "stories", "trophies", "profile", "lesson", "pack", "course"]);
const pageMotion = {
  // Opacity + y only: a lingering filter/transform would break position:fixed children.
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
  exit: { opacity: 0, y: -10, transition: { duration: 0.18 } },
};

export default function App() {
  // ---------- who is using the app ----------
  const [booted, setBooted] = useState(false);
  const [parent, setParent] = useState<Parent | null>(null);
  const [child, setChild] = useState<Child | null>(null);
  const [nav, dispatch] = useReducer(navReducer, initialNav(false));

  // ---------- game-feel state ----------
  const [rewards, setRewards] = useState<EarnedReward[]>([]);
  const [confetti, setConfetti] = useState(0);
  const [reaction, setReaction] = useState<Reaction | null>(null);
  const [combo, setCombo] = useState(0);
  const [sessionXp, setSessionXp] = useState(0);
  const [pops, setPops] = useState<XpPop[]>([]);
  const [levelUp, setLevelUp] = useState<{ level: number; title: string } | null>(null);
  const [prefs, setPrefs] = useState<Prefs>(loadPrefs);
  const [palette, setPalette] = useState(false);
  const streak = useRef({ run: 0, lastWrong: false });
  const sessionXpRef = useRef(0);
  const pointer = useRef({ x: window.innerWidth / 2, y: window.innerHeight / 2 });

  const celebrate = useCallback(() => setConfetti(c => c + 1), []);
  const { progress, load, clear, update } = useProgress({
    onRewards: won => { setRewards(q => [...q, ...won]); sfx.star(); },
    onLevelUp: (level, title) => setTimeout(() => { setLevelUp({ level, title }); sfx.levelUp(); celebrate(); voice.narrate(LEVEL_UP_LINE, { speaker: "sol", mode: "queue" }); }, 450),
  });

  const lesson: Lesson = lessonById(nav.lessonId) ?? LESSONS[0];

  // ---------- start-up: restore the signed-in parent and active child ----------
  const enterChild = useCallback(async (c: Child) => {
    setChild(c);
    await load(c.id);
    update(p => touchStreak(repairProgress(p, isBadgeEarned)));
  }, [load, update]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const p = await services.auth.current();
      const session = await services.session.get();
      const c = p && session?.activeChildId ? await services.family.getChild(session.activeChildId) : null;
      if (cancelled) return;
      setParent(p);
      if (c) { await enterChild(c); dispatch({ type: "go", view: "home" }); }
      setBooted(true);
    })();
    return () => { cancelled = true; };
  }, [enterChild]);

  // ---------- preferences ----------
  useEffect(() => { applyTheme(prefs.theme); setSoundEnabled(prefs.sound); voice.setSlow(prefs.slow); savePrefs(prefs); }, [prefs]);
  const togglePref = (key: keyof Prefs) => setPrefs(p => (key === "theme"
    ? { ...p, theme: p.theme === "galaxy" ? "daylight" : "galaxy" }
    : { ...p, [key]: !p[key] }));

  // Remember the last tap (XP pops rise from there) and play a soft tap sound.
  useEffect(() => {
    const down = (e: PointerEvent) => {
      pointer.current = { x: e.clientX, y: e.clientY };
      voice.unlock();
      if ((e.target as Element | null)?.closest?.("button, [role=button]")) sfx.tap();
    };
    window.addEventListener("pointerdown", down, { passive: true });
    return () => window.removeEventListener("pointerdown", down);
  }, []);

  // ⌘K / Ctrl+K opens "Ask Sol".
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setPalette(p => !p); }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);

  useEffect(() => {
    if (!confetti) return;
    const t = setTimeout(() => setConfetti(0), 3200);
    return () => clearTimeout(t);
  }, [confetti]);

  // Scroll to the top whenever the screen changes (the map manages its own scroll).
  useEffect(() => { if (nav.view !== "home") window.scrollTo(0, 0); }, [nav.view, nav.activity?.run]);
  // A brand-new learner is first asked whether Spanish is new to them (placement check).
  useEffect(() => {
    // Grown-ups land on their own course; they're offered the level check when they open the main course.
    const main = child?.kind === "adult" ? "course" : "home";
    if (nav.view === main && progress && isFreshLearner(progress)) dispatch({ type: "go", view: "placement" });
  }, [nav.view, progress, child?.kind]);

  const gainXP = (amount: number, label?: string) => {
    sessionXpRef.current += amount;
    setSessionXp(sessionXpRef.current);
    const id = Math.random();
    setPops(p => [...p, { id, amount, label, x: pointer.current.x, y: pointer.current.y - 20 }]);
    setTimeout(() => setPops(p => p.filter(x => x.id !== id)), 1300);
  };

  // ---------- accounts & navigation ----------
  const resetSession = () => {
    sessionXpRef.current = 0; setSessionXp(0); setCombo(0);
    streak.current = { run: 0, lastWrong: false }; setReaction(null);
  };
  const login = (p: Parent) => { setParent(p); dispatch({ type: "go", view: "family" }); };
  const logout = async () => { await services.auth.logOut(); setParent(null); setChild(null); clear(); dispatch({ type: "go", view: "family" }); };
  const pickChild = async (c: Child) => {
    if (!parent) return;
    await services.session.set({ parentId: parent.id, activeChildId: c.id });
    await enterChild(c);
    dispatch({ type: "go", view: "home" });
  };
  const switchChild = async () => {
    if (parent) await services.session.set({ parentId: parent.id, activeChildId: null });
    setChild(null); clear();
    dispatch({ type: "go", view: "family" });
  };
  const goTo = (key: NavKey) => (key === "family" ? void switchChild() : dispatch({ type: "go", view: key as ShellView }));
  const openLesson = (l: Lesson) => dispatch({ type: "openLesson", lessonId: l.id });
  const startLesson = (l: Lesson) => {
    resetSession();
    // Warm the offline cache with this lesson's words and story.
    voice.prefetch({ spanish: [...l.words.map(w => w.es), l.phrase.es], narration: l.story.paras });
    dispatch({ type: "startLesson", lessonId: l.id, steps: buildJourney(l), run: Date.now() });
    sfx.whoosh();
  };
  const practice = (activity: ActivityType) => { resetSession(); dispatch({ type: "practice", activity, run: Date.now() }); };

  // ---------- answers & activities ----------
  const onWord = useCallback((es: string, en: string, ok: boolean, opts?: { quiet?: boolean; dir?: "recognise" | "recall" }) => {
    const s = streak.current;
    const record = (p: Progress) => recordWord(p, es, en, ok, Date.now(), opts?.dir);
    if (opts?.quiet) { update(record); return; }
    if (ok) {
      s.run += 1;
      const bonus = s.run % 5 === 0 ? XP.combo5 : 0;
      update(p => recordCombo(addXP(record(p), XP.correct + bonus), s.run));
      gainXP(XP.correct + bonus, s.run >= 3 ? `🔥x${s.run}` : "");
      setCombo(s.run);
      if (bonus) sfx.combo(); else sfx.correct();
      // Mascot reactions: occasional and earned, never on every answer.
      if (s.run % 3 === 0) setReaction(pickReaction("streak"));
      else if (s.lastWrong && Math.random() < 0.5) setReaction(pickReaction("recover"));
      s.lastWrong = false;
    } else {
      update(record);
      sfx.wrong();
      s.run = 0; s.lastWrong = true; setCombo(0);
      if (Math.random() < 0.34) {
        const r = pickReaction("wrong");
        setReaction(r);
        if (prefs.guide) voice.narrate(r.text, { speaker: r.who, mode: "queue" });   // Luna's gentle encouragement
      }
    }
  }, [update]); // eslint-disable-line react-hooks/exhaustive-deps

  const finishActivity = (correct = 0, total = 0, stats: ActivityStats = {}) => {
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
    if (!nav.journey) { if (total) sfx.complete(); return; }

    if (!isLastStep(nav)) {
      dispatch({ type: "activityFinished", correct, total, run: Date.now() });
      sfx.whoosh();
      return;
    }
    // Journey complete → stars from how well it went, plus a lesson XP bonus.
    const j = { correct: nav.journey.correct + correct, total: nav.journey.total + total };
    const before = progress ? starsOf(progress, lesson.id) : 0;
    const earned = starsForScore(j.correct, j.total);
    const bonus = XP.lesson + earned * XP.perStar;
    const xp = sessionXpRef.current + bonus;
    const afterP = update(p => logEvent(addXP(awardStars(p, lesson.id, earned), bonus),
      { type: "lesson", title: lesson.title, emoji: lesson.emoji, text: `Finished “${lesson.title}” · ${"★".repeat(earned)} · +${xp} XP` }));
    const after = afterP ? starsOf(afterP, lesson.id) : earned;
    sessionXpRef.current = xp;
    dispatch({ type: "lessonComplete", result: { ...j, earned, before, after, xp } });
    setReaction(null);
    celebrate();
    sfx.complete();
  };

  const finishStory = (book: Book, s: number, t: number) => {
    update(p => logEvent(addXP(addStat(addStat({ ...p, storyBest: { ...p.storyBest, [book.id]: Math.max(p.storyBest?.[book.id] ?? 0, s) } }, "storiesRead", 1), "correctAnswers", s), XP.review),
      { type: "story", emoji: book.emoji, text: `Read “${book.title}”: ${s} of ${t} right` }));
    sfx.complete();
    if (s === t) celebrate();
  };

  const finishReview = (s: number, t: number) => {
    let goalMet = false;
    update(p => {
      const r = bumpDaily(addStat(addStat(p, "correctAnswers", s), "reviewsDone", 1));
      goalMet = r.justMet;
      return logEvent(addXP(r.progress, XP.review), { type: "review", emoji: "🔁", text: `Sol's mix: ${s} of ${t} right` });
    });
    sfx.complete();
    if (goalMet || s === t) celebrate();
  };

  const openChest = () => {
    update(p => logEvent(claimChest(p), { type: "chest", emoji: "🎁", text: `Opened the treasure chest · +${XP.chest} XP` }));
    gainXP(XP.chest, "🎁"); celebrate(); sfx.levelUp();
  };
  const equip = (who: "sol" | "luna", id: string) => update(p => ({ ...p, [who === "sol" ? "solOutfit" : "lunaOutfit"]: id }));
  const onMission = (step: MissionStep) => {
    if (step.action === "review") dispatch({ type: "go", view: "review" });
    else if (step.action === "lesson" && step.lesson) (step.done ? openLesson(step.lesson) : startLesson(step.lesson));
    else if (step.action === "quests" && step.ready) openChest();
  };

  // Pack lessons go back to their pack's page; map lessons to the map.
  const isAdult = child?.kind === "adult";
  const backFromLesson = () => {
    const pk = packOf(lesson.id);
    if (isAdult) return dispatch(pk && pk.audience !== "adult" ? { type: "openPack", packId: pk.id } : { type: "go", view: pk ? "home" : "course" });
    dispatch(pk ? { type: "openPack", packId: pk.id } : { type: "go", view: "home" });
  };
  const openPack = (packId: string) => dispatch({ type: "openPack", packId });

  // ---------- render ----------
  let content: JSX.Element | null = null;
  let topKey = nav.view as string;
  if (!booted) {
    content = <div className="center-screen" aria-busy="true"><div className="muted">Loading…</div></div>;
    topKey = "boot";
  } else if (!parent) {
    content = <AuthScreen onLogin={login} />;
    topKey = "auth";
  } else if (nav.view === "dashboard") {
    content = <ParentDashboard parent={parent} onBack={() => dispatch({ type: "go", view: "family" })}
      onAccountDeleted={() => { setParent(null); setChild(null); clear(); dispatch({ type: "go", view: "family" }); }}
      onLabels={() => dispatch({ type: "go", view: "labels" })} />;
  } else if (nav.view === "labels") {
    content = <LabelsScreen onBack={() => dispatch({ type: "go", view: "dashboard" })} />;
  } else if (!child || !progress || nav.view === "family") {
    content = <FamilyScreen parent={parent} onPickChild={c => void pickChild(c)} onDashboard={() => dispatch({ type: "go", view: "dashboard" })}
      onLogout={() => void logout()} prefs={prefs} onToggle={togglePref} />;
    topKey = "family";
  } else if (SHELL_VIEWS.has(nav.view)) {
    let inner: JSX.Element | null = null;
    const kidsHome = <HomeScreen child={child} progress={progress} onStartLesson={startLesson} onOpenLesson={openLesson}
      onClaim={openChest} onSearch={() => setPalette(true)} onMission={onMission} onPack={openPack} />;
    if (nav.view === "home") inner = isAdult
      ? <PackScreen packId="parents" progress={progress} onBack={() => undefined} onStart={startLesson} onOpen={openLesson}
          home={{ greeting: `¡Hola, ${child.name}!`, extra: <AdultCourseCard onOpen={() => dispatch({ type: "go", view: "course" })} /> }} />
      : kidsHome;
    if (nav.view === "course") inner = <>
      {isAdult && <Button size="sm" variant="ghost" onClick={() => dispatch({ type: "go", view: "home" })} style={{ marginBottom: 8 }}>← Español para padres</Button>}
      {kidsHome}
    </>;
    if (nav.view === "profile") inner = <ProfileScreen child={child} parent={parent} progress={progress} onTrophies={() => dispatch({ type: "go", view: "trophies" })} onSwitchChild={() => void switchChild()} onPlacement={() => dispatch({ type: "go", view: "placement" })}
      onAvatar={code => void services.family.updateChild(child.id, { avatar: code }).then(c => { if (c) setChild(c); })} />;
    if (nav.view === "stories") inner = <StoriesScreen progress={progress} onFinish={finishStory}
      onChant={c => update(p => logEvent(addXP(p, XP.activity), { type: "chant", emoji: "🎵", text: `Chanted “${c.title}”` }))} />;
    if (nav.view === "trophies") inner = <TrophyScreen progress={progress} onEquip={equip} />;
    if (nav.view === "review") inner = <ReviewScreen progress={progress} onBack={() => dispatch({ type: "go", view: "home" })} onFinish={finishReview} onWord={onWord} onTogether={() => dispatch({ type: "go", view: "together" })} />;
    if (nav.view === "pack" && nav.packId) inner = <PackScreen packId={nav.packId} progress={progress} onBack={() => dispatch({ type: "go", view: "home" })}
      onStart={startLesson} onOpen={openLesson} />;
    if (nav.view === "lesson") inner = <LessonScreen lesson={lesson} stars={starsOf(progress, lesson.id)} onBack={backFromLesson}
      onStart={() => startLesson(lesson)} onPractice={practice} />;
    content = <Shell child={child} progress={progress} active={nav.view === "lesson" || nav.view === "pack" || nav.view === "course" ? "home" : (nav.view as ShellView)} onNav={goTo}
      prefs={prefs} onToggle={togglePref} onSearch={() => setPalette(true)}>
      <AnimatePresence mode="wait">
        <motion.div key={nav.view + nav.lessonId} {...pageMotion}>{inner}</motion.div>
      </AnimatePresence>
    </Shell>;
    topKey = "shell";
  } else if (nav.view === "activity" && nav.activity) {
    content = <ActivityScreen key={`${nav.activity.type}-${nav.activity.run}`} lesson={lesson} type={nav.activity.type} journey={nav.journey} progress={progress}
      combo={combo} sessionXp={sessionXp} onWord={onWord} onFinish={finishActivity}
      onExit={() => dispatch({ type: "exitActivity" })} onRetry={() => practice(nav.activity!.type)} />;
    topKey = `act-${nav.activity.run}`;
  } else if (nav.view === "together") {
    content = <TogetherScreen child={child} progress={progress} onWord={onWord} onBack={() => dispatch({ type: "go", view: "review" })}
      onFinish={(s, t) => {
        let goalMet = false;
        update(p => { const r = bumpDaily(p); goalMet = r.justMet; return logEvent(addXP(r.progress, XP.review), { type: "together", emoji: "🤝", text: `Learned together: ${s} of ${t} as a team` }); });
        sfx.complete();
        if (goalMet || s === t) celebrate();
      }} />;
  } else if (nav.view === "placement") {
    content = <PlacementScreen child={child} progress={progress}
      onRecord={(es, en, ok, dir) => onWord(es, en, ok, { quiet: true, dir })}
      onCancel={() => { update(p => ({ ...p, placementOffered: true })); dispatch({ type: "go", view: isAdult ? "course" : "home" }); }}
      onDone={r => {
        update(p => r === "new" ? { ...p, placementOffered: true }
          : { ...p, placementOffered: true, placedUpTo: lastLessonOf(r.world), placement: { world: r.world, at: Date.now(), asked: r.asked, right: r.right } });
        dispatch({ type: "go", view: isAdult ? "course" : "home" });
      }} />;
  } else if (nav.view === "done" && nav.done) {
    content = <DoneScreen lesson={lesson} result={nav.done} progress={progress}
      onNext={startLesson} onHome={backFromLesson} onPractice={() => openLesson(lesson)} />;
  }

  return <GuideContext.Provider value={prefs.guide}><MotionConfig reducedMotion="user">
    <Cosmos />
    <div className="app">
      <AnimatePresence mode="wait">
        <motion.div key={topKey} {...pageMotion}>{content}</motion.div>
      </AnimatePresence>
    </div>
    <Confetti burst={confetti} />
    <XpPops pops={pops} />
    {rewards[0] && <RewardToast key={`${rewards[0].type}-${rewards[0].id}`} reward={rewards[0]} onClose={() => setRewards(q => q.slice(1))} />}
    {(nav.view === "activity" || nav.view === "review") && <MascotReaction reaction={reaction} onDone={() => setReaction(null)} />}
    {palette && child && progress && <CommandPalette onClose={() => setPalette(false)} onOpenLesson={openLesson}
      unlockedUpTo={unlockedUpTo(progress, LESSONS.length)} />}
    {levelUp && <LevelUpModal level={levelUp.level} title={levelUp.title} onClose={() => setLevelUp(null)} />}
  </MotionConfig></GuideContext.Provider>;
}
