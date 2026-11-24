// Sol the study buddy plans "today's mission" from the child's real progress,
// like an agent laying out its task list. Pure: progress in, plan out.
import { LESSONS } from "../data/course.js";
import { dailyQuests, dayKey, getDueWords } from "./db.js";

const isToday = (t, now) => dayKey(t) === dayKey(now);

export function planMission(progress, now = Date.now()) {
  const events = (progress.events || []).filter(e => isToday(e.t, now));
  const stars = progress.stars || {};
  const done = Object.keys(stars).reduce((m, id) => Math.max(m, Number(id)), 0);
  const next = LESSONS.find(l => l.id === Math.min(LESSONS.length, done + 1));
  const due = getDueWords(progress, now).length;
  const reviewedToday = events.some(e => e.type === "review");
  const lessonToday = events.find(e => e.type === "lesson");
  const { allDone, claimed } = dailyQuests(progress, now);

  const steps = [];
  if (Object.keys(progress.wordMemory || {}).length) {
    steps.push({
      id: "review", action: "review", icon: "review",
      title: due ? `Refresh ${Math.min(due, 10)} word${due === 1 ? "" : "s"}` : "Quick memory warm-up",
      detail: due ? "Words that are ready to practise again" : "Keep your words strong",
      done: reviewedToday,
    });
  }
  steps.push({
    id: "lesson", action: "lesson", icon: "play", lesson: next,
    title: lessonToday ? `Finished “${lessonToday.title}”` : `Lesson ${next.id}: ${next.title}`,
    detail: lessonToday ? "Great work!" : `${next.subtitle} · new words & a story`,
    done: !!lessonToday,
  });
  steps.push({
    id: "chest", action: "quests", icon: "gift",
    title: claimed ? "Treasure chest opened" : "Unlock the treasure chest",
    detail: claimed ? "+50 XP collected" : allDone ? "Ready to open!" : "Finish all 3 daily quests",
    done: claimed,
    ready: allDone && !claimed,
  });

  const active = steps.find(s => !s.done);
  if (active) active.active = true;
  const completed = steps.filter(s => s.done).length;

  let message;
  if (completed === steps.length) message = "Mission complete! You did everything I planned today. ¡Eres increíble! 🎉";
  else if (completed === 0 && done === 0) message = "¡Hola! I’m Sol, your study buddy. I made you a plan — let’s start your very first lesson!";
  else if (completed === 0) message = `I planned ${steps.length} steps for today. Let’s start with: ${active.title.toLowerCase()}.`;
  else message = `${completed} of ${steps.length} done — ¡muy bien! Next up: ${active.title.toLowerCase()}.`;

  return { steps, completed, total: steps.length, message, active };
}
