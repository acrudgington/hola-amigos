// 3D illustrations (Microsoft Fluent Emoji 3D, MIT) for the emoji used across
// the course, served from our own site. Falls back to the plain emoji if a
// picture is missing or fails to load. See scripts/sync-art.ts.
import { useMemo, useState, type CSSProperties } from "react";
import manifest from "../art/manifest.json";

const FILES = manifest as Record<string, string>;
export const artUrl = (e: string): string | null => (FILES[e] ? `/art/${FILES[e]}.webp` : null);

// Motion (styles.css "Word-picture motion"): pictures pop in, bigger ones bob
// gently while idle, any picture jelly-wobbles when tapped, and they jump or
// droop with right and wrong answers (driven by the surrounding .choice etc.).
// `still` turns the idle motion off (e.g. inside things that already move).
export function Art({ e, size = 40, label, className = "", style, eager = false, still = false }: {
  e: string; size?: number; label?: string; className?: string; style?: CSSProperties; eager?: boolean; still?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const [tapped, setTapped] = useState(0);
  const delay = useMemo(() => `${-(Math.random() * 3).toFixed(2)}s`, []);
  const src = artUrl(e);
  const motion = [size >= 40 && "art--pop", size >= 56 && !still && "art--idle", tapped && "is-tapped"].filter(Boolean).join(" ");
  const wobble = () => { setTapped(t => t + 1); setTimeout(() => setTapped(0), 560); };
  if (!src || failed) {
    return <span className={`art art--text ${motion} ${className}`} onPointerDown={wobble} role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true}
      style={{ fontSize: size * 0.82, width: size, height: size, ...style }}>{e}</span>;
  }
  return <img className={`art ${motion} ${className}`} src={src} width={size} height={size} alt={label ?? ""} draggable={false}
    loading={eager ? "eager" : "lazy"} decoding="async" onError={() => setFailed(true)} onPointerDown={wobble}
    style={{ "--art-delay": delay, ...style } as CSSProperties} />;
}
