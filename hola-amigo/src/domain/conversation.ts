// Judging a child's spoken reply in a conversation. Real conversations have
// many right answers ("Me llamo Mia", "Soy Mia", "Mia"), so a reply counts
// when it is close to a model answer OR uses one of the turn's key words.
import type { Turn } from "../content/index.ts";
import { similarity } from "../lib/speech.ts";

export type Verdict = "good" | "close" | "try-again";

// Lower case, no accents or punctuation, single spaces, padded so we can
// look for whole words with " key ".
export const normalise = (s: string) => ` ${s.toLowerCase()
  .normalize("NFD").replace(/[̀-ͯ]/g, "")
  .replace(/[¿?¡!.,;:…"'«»()—–-]/g, " ")
  .replace(/\s+/g, " ").trim()} `;

const hasKey = (heard: string, key: string) => normalise(heard).includes(normalise(key));

export function judgeReply(alternatives: string[], turn: Turn): Verdict {
  const models = [turn.answer, ...(turn.also ?? [])];
  let best = 0;
  for (const heard of alternatives) {
    if (!heard.trim()) continue;
    if (turn.keys.some(k => hasKey(heard, k))) return "good";
    for (const m of models) best = Math.max(best, similarity(heard, m));
  }
  return best >= 0.7 ? "good" : best >= 0.45 ? "close" : "try-again";
}

// A tapped option is right only if it's the model answer.
export const isRightOption = (option: string, turn: Turn) => option === turn.answer;
