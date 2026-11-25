// "Read aloud" guidance: when on, instructions and questions are spoken so
// children who can't read yet can play on their own. Parents can turn it off.
import { createContext, useContext, useEffect } from "react";
import { voice } from "./player.ts";
import type { Speaker } from "./text.ts";

export const GuideContext = createContext(true);
export const useGuide = () => useContext(GuideContext);

// Say a line once when it first appears (and again if it changes), if guidance is on.
// With `lead`, it's an activity's instructions: words the game auto-plays in the
// meantime wait and follow them, instead of being cut off by them.
export function useSayOnShow(text: string | null | undefined, { delay = 300, speaker, queue = false, lead = false }: { delay?: number; speaker?: Speaker; queue?: boolean; lead?: boolean } = {}) {
  const on = useGuide();
  useEffect(() => {
    if (!on || !text) return;
    if (lead) voice.expectIntro(delay + 1200);
    const t = setTimeout(() => voice.narrate(text, { speaker, mode: lead ? "lead" : queue ? "queue" : "interrupt" }), delay);
    return () => { clearTimeout(t); if (lead) voice.cancelIntro(); };
  }, [on, text, delay, speaker, queue, lead]);
}
