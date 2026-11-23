import { sumStars, countLessons } from "./utils.js";
import { liveStreak } from "./db.js";

// Reaction lines for in-activity moments. Sol = energetic, Luna = gentle.
const REACTIONS = {
  streak: [
    { who: "sol", mood: "celebrate", text: "¡Increíble! You're on fire! 🔥" },
    { who: "sol", mood: "celebrate", text: "Three in a row! ¡Vamos!" },
    { who: "sol", mood: "wink", text: "¡Qué bien! Keep going!" },
    { who: "luna", mood: "happy", text: "Beautiful work! ✨" },
  ],
  recover: [
    { who: "luna", mood: "encourage", text: "¡Sí! You got it that time!" },
    { who: "luna", mood: "happy", text: "See? You can do it! 💫" },
  ],
  wrong: [
    { who: "luna", mood: "encourage", text: "¡Casi! Try the next one." },
    { who: "luna", mood: "encourage", text: "That's okay — keep going!" },
  ],
};

export const pickReaction = kind => {
  const arr = REACTIONS[kind] || [];
  return arr.length ? { ...arr[Math.floor(Math.random() * arr.length)], id: Math.random() } : null;
};

// Home-screen greeting, chosen from what's genuinely true for this child.
// `previousVisit` is the lastActive value from *before* today's visit was recorded.
export function pickGreeting(progress, childName, previousVisit) {
  const streak = liveStreak(progress);
  const daysSince = previousVisit ? Math.floor((Date.now() - previousVisit) / 86400000) : null;
  const stars = sumStars(progress);
  const hour = new Date().getHours();

  if (countLessons(progress) === 0) return { who: "sol", mood: "celebrate", text: `¡Hola, ${childName}! Ready for your first adventure? 🌟` };
  if (daysSince !== null && daysSince >= 2) return { who: "luna", mood: "happy", text: `¡Bienvenido, ${childName}! We missed you! 💜` };
  if (streak >= 5) return { who: "sol", mood: "celebrate", text: `${streak} days in a row! ¡Increíble! 🔥` };
  if (streak >= 2) return { who: "sol", mood: "wink", text: `${streak}-day streak! Keep it going, ${childName}!` };
  if (hour < 12) return { who: "sol", mood: "happy", text: `¡Buenos días, ${childName}! Let's learn! ☀️` };
  if (hour >= 19) return { who: "luna", mood: "sleepy", text: `¡Buenas noches, ${childName}! One more lesson? 🌙` };
  if (stars >= 30) return { who: "sol", mood: "celebrate", text: `${stars} stars already! ¡Fantástico!` };
  return { who: "sol", mood: "happy", text: `¡Hola, ${childName}! What shall we learn today?` };
}
