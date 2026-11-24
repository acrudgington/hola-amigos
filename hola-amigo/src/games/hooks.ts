import { useCallback, useEffect, useRef, useState } from "react";

// setTimeout that is cancelled when the component unmounts, so leaving an
// activity mid-answer can never fire onDone() behind the child's back.
export function useLater() {
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());
  useEffect(() => {
    const set = timers.current;
    return () => { set.forEach(clearTimeout); set.clear(); };
  }, []);
  return useCallback((fn: () => void, ms: number) => {
    const id = setTimeout(() => { timers.current.delete(id); fn(); }, ms);
    timers.current.add(id);
    return id;
  }, []);
}

// Run a multiple-choice round: tracks index, score and the picked answer.
// `items` must be stable for the life of the game.
export function useRounds<T>(items: T[], { onDone, delay = 950 }: { onDone?: (score: number, total: number) => void; delay?: number } = {}) {
  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const score = useRef(0);
  const later = useLater();
  const answer = (key: string, ok: boolean) => {
    if (picked != null) return;
    setPicked(key);
    if (ok) score.current += 1;
    later(() => {
      setPicked(null);
      if (idx + 1 < items.length) setIdx(idx + 1);
      else onDone?.(score.current, items.length);
    }, delay);
  };
  return { idx, item: items[idx] as T | undefined, picked, answer, total: items.length };
}
