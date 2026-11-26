// Seasonal touches on the home screen while a seasonal pack is running:
// a banner that opens the pack, and a few drifting decorations (snow at
// Christmas; bats, pumpkins and leaves at Halloween). Purely decorative.
import { useMemo } from "react";
import { activeSeason, packProgress } from "../domain/packs.ts";
import type { Progress } from "../domain/progress.ts";
import { Art } from "./Art.tsx";

const DECOR: Record<string, string[]> = {
  halloween: ["🦇", "🎃", "🍂", "🦇", "👻", "🍁"],
  christmas: ["❄️", "❄️", "⭐", "❄️", "✨", "❄️"],
};
const GREETING: Record<string, { es: string; en: string }> = {
  halloween: { es: "¡Feliz Halloween!", en: "Spooky lessons are here until 2 November" },
  christmas: { es: "¡Felices fiestas!", en: "Christmas lessons are here until 6 January" },
};

export function SeasonalDecor() {
  const season = activeSeason();
  const bits = useMemo(() => {
    const set = season ? DECOR[season.id] ?? [] : [];
    return Array.from({ length: 10 }, (_, i) => ({
      e: set[i % set.length], left: (i * 37) % 100, delay: -((i * 1.7) % 12), dur: 10 + ((i * 3) % 8), size: 14 + ((i * 5) % 14),
    }));
  }, [season]);
  if (!season || !DECOR[season.id]) return null;
  return <div className={`season-decor season-decor--${season.id}`} aria-hidden="true">
    {bits.map((b, i) => <span key={i} style={{ left: `${b.left}%`, animationDelay: `${b.delay}s`, animationDuration: `${b.dur}s`, fontSize: b.size }}>{b.e}</span>)}
  </div>;
}

export function SeasonBanner({ progress, onOpen }: { progress: Progress; onOpen: (id: string) => void }) {
  const season = activeSeason();
  if (!season) return null;
  const g = GREETING[season.id] ?? { es: season.title, en: season.en };
  const pr = packProgress(progress, season);
  return <button type="button" className="season-banner" style={{ "--pc": season.color }} onClick={() => onOpen(season.id)}>
    <Art e={season.emoji} size={52} eager />
    <span className="grow">
      <span className="season-banner__es" lang="es">{g.es}</span>
      <span className="season-banner__en">{g.en} · {pr.done}/{pr.total} done</span>
    </span>
    <span className="season-banner__go">Play →</span>
  </button>;
}
