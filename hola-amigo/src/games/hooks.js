import { useCallback, useEffect, useRef, useState } from "react";

// setTimeout that is cancelled when the component unmounts. The original
// games used bare timeouts, so leaving an activity mid-answer still fired
// onDone() a second later and pushed the lesson forward behind the child's back.
export function useLater() {
  const timers = useRef(new Set());
  useEffect(() => () => { timers.current.forEach(clearTimeout); timers.current.clear(); }, []);
  return useCallback((fn, ms) => {
    const id = setTimeout(() => { timers.current.delete(id); fn(); }, ms);
    timers.current.add(id);
    return id;
  }, []);
}

// Run a multiple-choice round: tracks index, score and the picked answer.
// `items` must be stable for the life of the game.
export function useRounds(items, { onDone, delay = 950 } = {}) {
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState(null);
  const score = useRef(0);
  const later = useLater();
  const answer = (key, ok) => {
    if (picked != null) return;
    setPicked(key);
    if (ok) score.current += 1;
    later(() => {
      setPicked(null);
      if (idx + 1 < items.length) setIdx(idx + 1);
      else onDone?.(score.current, items.length);
    }, delay);
  };
  return { idx, item: items[idx], picked, answer, total: items.length };
}
