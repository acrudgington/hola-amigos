// 3D illustrations (Microsoft Fluent Emoji 3D, MIT) for the emoji used across
// the course, served from our own site. Falls back to the plain emoji if a
// picture is missing or fails to load. See scripts/sync-art.ts.
import { useState, type CSSProperties } from "react";
import manifest from "../art/manifest.json";

const FILES = manifest as Record<string, string>;
export const artUrl = (e: string): string | null => (FILES[e] ? `/art/${FILES[e]}.webp` : null);

export function Art({ e, size = 40, label, className = "", style, eager = false }: {
  e: string; size?: number; label?: string; className?: string; style?: CSSProperties; eager?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const src = artUrl(e);
  if (!src || failed) {
    return <span className={`art art--text ${className}`} role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true}
      style={{ fontSize: size * 0.82, width: size, height: size, ...style }}>{e}</span>;
  }
  return <img className={`art ${className}`} src={src} width={size} height={size} alt={label ?? ""} draggable={false}
    loading={eager ? "eager" : "lazy"} decoding="async" onError={() => setFailed(true)} style={style} />;
}
