// ============================================================
// The single write path for a child's progress.
// The current progress lives in memory (a ref + React state). Every change
// is a pure function applied to that copy; rewards are awarded, the result
// is rendered immediately and saved in the background through the storage
// service. Saves are queued so they always land in order, which matters
// once the store is a network database.
// ============================================================
import { useCallback, useRef, useState } from "react";
import { applyRewards, findReward, type EarnedReward } from "../domain/rewards.ts";
import { levelInfo, levelTitle, logEvent, type Progress } from "../domain/progress.ts";
import { stampGoals } from "../domain/goals.ts";
import { services } from "../services/index.ts";

export interface ProgressEffects {
  onRewards?: (rewards: EarnedReward[]) => void;
  onLevelUp?: (level: number, title: string) => void;
}

// Pure: apply a change, award anything newly earned and log it to the feed.
export function applyChange(before: Progress, fn: (p: Progress) => Progress) {
  const changed = applyRewards(fn(before));
  // Note when "I can…" goals are first achieved (for the weekly report). Only
  // stars and word memory affect goals, so skip the work when neither changed.
  let next = changed.progress.stars !== before.stars || changed.progress.wordMemory !== before.wordMemory
    ? stampGoals(changed.progress) : changed.progress;
  for (const r of changed.rewards) {
    const item = findReward(r);
    if (item) next = logEvent(next, { type: r.type, emoji: item.emoji, text: `New ${r.type}: ${item.name}` });
  }
  const L0 = levelInfo(before.xp).level;
  const L1 = levelInfo(next.xp).level;
  if (L1 > L0) next = logEvent(next, { type: "level", emoji: "⬆️", text: `Reached level ${L1} — ${levelTitle(L1)}!` });
  return { next, rewards: changed.rewards, levelUp: L1 > L0 ? L1 : null };
}

export function useProgress(effects: ProgressEffects) {
  const [progress, setProgress] = useState<Progress | null>(null);
  const current = useRef<{ childId: string; progress: Progress } | null>(null);
  const saving = useRef<Promise<void>>(Promise.resolve());
  const fx = useRef(effects);
  fx.current = effects;

  const load = useCallback(async (childId: string) => {
    const p = await services.progress.load(childId);
    current.current = { childId, progress: p };
    setProgress(p);
    return p;
  }, []);

  const clear = useCallback(() => { current.current = null; setProgress(null); }, []);

  const update = useCallback((fn: (p: Progress) => Progress): Progress | null => {
    const cur = current.current;
    if (!cur) return null;
    const { next, rewards, levelUp } = applyChange(cur.progress, fn);
    current.current = { childId: cur.childId, progress: next };
    setProgress(next);
    // Queue the save behind any earlier one so writes never arrive out of order.
    saving.current = saving.current.then(() => services.progress.save(cur.childId, next)).catch(err => console.error("Couldn't save progress", err));
    if (rewards.length) fx.current.onRewards?.(rewards);
    if (levelUp) fx.current.onLevelUp?.(levelUp, levelTitle(levelUp));
    return next;
  }, []);

  return { progress, load, clear, update };
}
