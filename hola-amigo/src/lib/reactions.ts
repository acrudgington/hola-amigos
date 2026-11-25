// What Sol & Luna say during activities. Sol = energetic, Luna = gentle.
export type Mood = "happy" | "celebrate" | "encourage" | "wink" | "sleepy";
export interface Reaction { who: "sol" | "luna"; mood: Mood; text: string; id: number }
type Kind = "streak" | "recover" | "wrong";

const REACTIONS: Record<Kind, Omit<Reaction, "id">[]> = {
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

export const pickReaction = (kind: Kind): Reaction => {
  const arr = REACTIONS[kind];
  return { ...arr[Math.floor(Math.random() * arr.length)], id: Math.random() };
};

// Every reaction line (the voice clip generator speaks each one).
export const REACTION_LINES = Object.values(REACTIONS).flat();
