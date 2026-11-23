// Build a lesson's guided activity sequence with stable per-lesson variety.
import { isMilestone, lessonSeed } from "../data/course.js";

export function buildJourney(lesson) {
  const seed = lessonSeed(lesson.id);

  // Milestones are a boss battle over the whole world's vocabulary.
  if (isMilestone(lesson.id)) {
    const seq = ["learn", "warmup", "boss"];
    if (lesson.story) seq.push("story");
    return seq;
  }

  const core = ["learn", "flash", "listen", "match", "quiz", "sayit"];
  if (lesson.sentences?.length) core.push("build");

  // Opening style: mostly learn-first, sometimes story-first or warm-up-first.
  // Lesson 1 never opens with a warm-up — there's nothing to warm up on yet.
  const opener = seed % 5;
  let seq;
  if (opener === 3 && lesson.story) seq = ["story", ...core];
  else if (opener === 4 && lesson.id > 1) seq = ["warmup", ...core];
  else seq = [...core];

  if (lesson.story && !seq.includes("story")) seq.push("story");

  // Swap in hands-on variants so each lesson has its own texture.
  if (seed % 2 === 0) { const i = seq.indexOf("match"); if (i !== -1) seq[i] = "dragmatch"; }
  if (seed % 3 === 1) { const i = seq.indexOf("quiz"); if (i !== -1) seq.splice(i + 1, 0, "oddone"); }
  if (seed % 2 === 1) { const i = seq.indexOf("build"); if (i !== -1) seq[i] = "wordorder"; }

  // A surprise card in roughly 1 of 4 lessons.
  if (seed % 4 === 0) seq.splice(Math.min(2 + (seed % 2), seq.length), 0, "surprise");

  // Some lessons are shorter "snack" sessions.
  if (seed % 3 === 2 && seq.length > 6) {
    for (const t of ["match", "dragmatch", "sayit", "listen"]) {
      const i = seq.indexOf(t);
      if (i !== -1) { seq.splice(i, 1); break; }
    }
  }
  return seq;
}

export const ACTIVITIES = {
  learn: { title: "Learn", emoji: "🌱", desc: "Meet the new words", color: "#2EC27E" },
  flash: { title: "Flashcards", emoji: "🃏", desc: "Flip to learn", color: "#3D8BFF" },
  listen: { title: "Listen", emoji: "👂", desc: "Hear it, tap the picture", color: "#7C6CF2" },
  match: { title: "Matching", emoji: "🎯", desc: "Match Spanish → English", color: "#1FB5A8" },
  dragmatch: { title: "Drag & Match", emoji: "👆", desc: "Drag words to pictures", color: "#5B6CF0" },
  oddone: { title: "Odd One Out", emoji: "🤔", desc: "Spot the stranger", color: "#FF922B" },
  quiz: { title: "Quiz", emoji: "🧠", desc: "Test yourself", color: "#FF7A45" },
  sayit: { title: "Say It!", emoji: "🎤", desc: "Say the words aloud", color: "#FF5A6E" },
  build: { title: "Sentences", emoji: "🔨", desc: "Build sentences", color: "#A06CF0" },
  wordorder: { title: "Word Order", emoji: "🧩", desc: "Unscramble the sentence", color: "#9A5BE0" },
  story: { title: "Story", emoji: "📖", desc: "Read a story", color: "#F062A8" },
  surprise: { title: "Surprise!", emoji: "🎁", desc: "", color: "#FFB020" },
  warmup: { title: "Warm-up", emoji: "🔥", desc: "Remember earlier words", color: "#FF7A45" },
  boss: { title: "Boss Challenge", emoji: "⚔️", desc: "The big world challenge", color: "#7C6CF2" },
};

// Activities a child can pick individually from the lesson page.
export function practiceList(lesson) {
  const list = ["learn", "flash", "listen", "match", "dragmatch", "oddone", "quiz", "sayit"];
  if (lesson.sentences?.length) list.push("build", "wordorder");
  if (lesson.story) list.push("story");
  return list;
}
