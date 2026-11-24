// ============================================================
// Every fixed line the app says out loud. Keeping them here means the clip
// generator voices exactly what the app plays.
// ============================================================
import type { ActivityType } from "../lib/journey.ts";

// Read aloud when each activity starts, so children who can't read yet can play alone.
export const INSTRUCTIONS: Record<ActivityType, string> = {
  learn: "Let's meet some new words! Listen, then tap next.",
  flash: "Tap a card to flip it over. Tap the speaker to hear the word.",
  listen: "Listen carefully, then tap the right picture.",
  match: "Tap a Spanish word, then tap its English partner.",
  dragmatch: "Drag each Spanish word onto its picture.",
  oddone: "Three of these words belong in this lesson. Tap the one that doesn't!",
  quiz: "Let's see what you remember! Tap the right answer.",
  sayit: "Listen to the word, then tap the microphone and say it out loud.",
  build: "Tap the words in the right order to make the sentence.",
  wordorder: "These words are all mixed up. Tap them in the right order.",
  story: "Story time! Tap read to me, or tap any sentence to hear it.",
  surprise: "Surprise!",
  warmup: "Warm-up time! Can you still remember these words?",
  boss: "It's the big challenge! Every right answer is a hit. You can do it!",
};

export const REVIEW_INSTRUCTION = "Daily review! Let's keep your words strong.";

// Short Spanish praise, said by Sol when an answer is right.
export const PRAISE = ["¡Correcto!", "¡Muy bien!", "¡Sí!", "¡Genial!", "¡Fantástico!"];
export const BOSS_HIT = "¡Toma!";
export const REMEMBERED = "¡Sí! You remembered!";

// Lesson-complete messages (by score band) and level-up.
export const DONE_LINES = {
  great: "¡Increíble! Perfect work!",
  good: "¡Muy bien! Great job!",
  keepGoing: "¡Bien hecho! Keep practising!",
};
export const LEVEL_UP_LINE = "¡Increíble! You reached a new level!";
