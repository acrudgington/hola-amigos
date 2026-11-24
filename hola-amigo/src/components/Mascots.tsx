// ============================================================
// MASCOTS — Sol (the sun) and Luna (the moon), drawn as SVG
// ============================================================
import { useEffect, useId, useRef } from "react";
import type { Mood, Reaction } from "../lib/reactions.ts";

export interface MascotProps { size?: number; mood?: Mood; outfit?: string | null }

// Accessory drawn on top of a mascot's head (in 100x100 viewBox space).
function OutfitAccessory({ outfit }: { outfit?: string | null }) {
  if (!outfit || outfit === "none") return null;
  switch (outfit) {
    case "party": // party hat
      return <g><polygon points="50,2 40,26 60,26" fill="#FF6B9D" stroke="#E0466B" strokeWidth="1.5" /><circle cx="50" cy="4" r="3.5" fill="#FFD93D" /><circle cx="45" cy="16" r="1.6" fill="#fff" /><circle cx="54" cy="20" r="1.6" fill="#fff" /></g>;
    case "sunglasses":
      return <g><rect x="30" y="42" width="16" height="10" rx="3" fill="#1E3A5F" /><rect x="54" y="42" width="16" height="10" rx="3" fill="#1E3A5F" /><rect x="46" y="45" width="8" height="3" fill="#1E3A5F" /></g>;
    case "crown":
      return <g><polygon points="34,20 40,10 50,18 60,10 66,20 66,26 34,26" fill="#FFD93D" stroke="#E0A800" strokeWidth="1.5" /><circle cx="40" cy="10" r="2.5" fill="#FF6B9D" /><circle cx="50" cy="16" r="2.5" fill="#4D96FF" /><circle cx="60" cy="10" r="2.5" fill="#FF6B9D" /></g>;
    case "flower":
      return <g><g transform="translate(30,18)"><circle r="4" fill="#FF9EC7" /><circle cx="-5" cy="-2" r="3" fill="#FFB3D9" /><circle cx="5" cy="-2" r="3" fill="#FFB3D9" /><circle cx="-3" cy="4" r="3" fill="#FFB3D9" /><circle cx="3" cy="4" r="3" fill="#FFB3D9" /><circle r="2" fill="#FFD93D" /></g><g transform="translate(68,20)"><circle r="3.5" fill="#B983FF" /><circle r="1.6" fill="#FFD93D" /></g></g>;
    case "wizard":
      return <g><polygon points="50,0 34,28 66,28" fill="#6C5CE7" stroke="#4A3FB0" strokeWidth="1.5" /><text x="50" y="20" fontSize="8" textAnchor="middle">⭐</text><ellipse cx="50" cy="28" rx="18" ry="4" fill="#6C5CE7" stroke="#4A3FB0" strokeWidth="1" /></g>;
    case "bow":
      return <g transform="translate(50,18)"><path d="M0 0 L-12 -6 L-12 6 Z" fill="#FF6B9D" stroke="#E0466B" strokeWidth="1" /><path d="M0 0 L12 -6 L12 6 Z" fill="#FF6B9D" stroke="#E0466B" strokeWidth="1" /><circle r="3" fill="#E0466B" /></g>;
    default:
      return null;
  }
}

export function Sol({ size = 56, mood = "happy", outfit }: MascotProps) {
  const gid = `sol-${useId().replace(/:/g, "")}`;
  // Expression variants
  const eyesBy: Partial<Record<Mood, JSX.Element>> = {
    happy: <g><ellipse cx="41" cy="47" rx="3.2" ry="4" fill="#1E3A5F" /><circle cx="42" cy="46" r="1" fill="#fff" /><ellipse cx="59" cy="47" rx="3.2" ry="4" fill="#1E3A5F" /><circle cx="60" cy="46" r="1" fill="#fff" /></g>,
    celebrate: <g><path d="M 37 48 Q 41 43 45 48" stroke="#1E3A5F" strokeWidth="2.6" fill="none" strokeLinecap="round" /><path d="M 55 48 Q 59 43 63 48" stroke="#1E3A5F" strokeWidth="2.6" fill="none" strokeLinecap="round" /></g>,
    encourage: <g><ellipse cx="41" cy="47" rx="3" ry="3.6" fill="#1E3A5F" /><circle cx="42" cy="46" r="1" fill="#fff" /><ellipse cx="59" cy="47" rx="3" ry="3.6" fill="#1E3A5F" /><circle cx="60" cy="46" r="1" fill="#fff" /></g>,
    wink: <g><path d="M 37 47 Q 41 43 45 47" stroke="#1E3A5F" strokeWidth="2.6" fill="none" strokeLinecap="round" /><ellipse cx="59" cy="47" rx="3.2" ry="4" fill="#1E3A5F" /><circle cx="60" cy="46" r="1" fill="#fff" /></g>,
  };
  const eyes = eyesBy[mood] ?? eyesBy.happy;
  const mouthBy: Partial<Record<Mood, JSX.Element>> = {
    happy: <path d="M 42 56 Q 50 64 58 56" stroke="#1E3A5F" strokeWidth="2.4" fill="none" strokeLinecap="round" />,
    celebrate: <ellipse cx="50" cy="58" rx="7" ry="8" fill="#E0466B" />,
    encourage: <path d="M 43 57 Q 50 61 57 57" stroke="#1E3A5F" strokeWidth="2.4" fill="none" strokeLinecap="round" />,
    wink: <path d="M 42 56 Q 50 63 58 56" stroke="#1E3A5F" strokeWidth="2.4" fill="none" strokeLinecap="round" />,
  };
  const mouth = mouthBy[mood] ?? mouthBy.happy;
  return <svg width={size} height={size} viewBox="0 0 100 100" role="img" aria-label="Sol the sun">
    {/* Sun rays */}
    <g className={`mascot-spin ${mood === "celebrate" ? "mascot-spin--fast" : ""}`}>
      {Array.from({ length: 12 }).map((_, i) => <rect key={i} x="48" y="4" width="4" height="14" rx="2" fill="#FFD93D" transform={`rotate(${i * 30} 50 50)`} />)}
    </g>
    {/* Sun body */}
    <circle cx="50" cy="50" r="28" fill="#FFD93D" stroke="#FF8C42" strokeWidth="2" />
    <circle cx="50" cy="50" r="28" fill={`url(#${gid})`} />
    <defs>
      <radialGradient id={gid} cx="40%" cy="38%">
        <stop offset="0%" stopColor="#FFEC84" />
        <stop offset="100%" stopColor="#FFB12B" />
      </radialGradient>
    </defs>
    {/* Cheeks */}
    <circle cx="38" cy="56" r="4.5" fill="#FF9EC7" opacity="0.75" />
    <circle cx="62" cy="56" r="4.5" fill="#FF9EC7" opacity="0.75" />
    <g className="m-eyes">{eyes}</g>
    {mouth}
    <OutfitAccessory outfit={outfit} />
  </svg>;
}

export function Luna({ size = 56, mood = "sleepy", outfit }: MascotProps) {
  const gid = `luna-${useId().replace(/:/g, "")}`;
  const eyesBy: Partial<Record<Mood, JSX.Element>> = {
    sleepy: <g><path d="M 36 49 Q 40 45 44 49" stroke="#1E3A5F" strokeWidth="2.4" fill="none" strokeLinecap="round" /><path d="M 52 50 Q 56 46 60 50" stroke="#1E3A5F" strokeWidth="2.4" fill="none" strokeLinecap="round" /></g>,
    happy: <g><ellipse cx="40" cy="49" rx="3" ry="3.6" fill="#1E3A5F" /><circle cx="41" cy="48" r="0.9" fill="#fff" /><ellipse cx="56" cy="50" rx="3" ry="3.6" fill="#1E3A5F" /><circle cx="57" cy="49" r="0.9" fill="#fff" /></g>,
    celebrate: <g><path d="M 36 50 Q 40 45 44 50" stroke="#1E3A5F" strokeWidth="2.6" fill="none" strokeLinecap="round" /><path d="M 52 51 Q 56 46 60 51" stroke="#1E3A5F" strokeWidth="2.6" fill="none" strokeLinecap="round" /></g>,
    encourage: <g><ellipse cx="40" cy="49" rx="2.8" ry="3.4" fill="#1E3A5F" /><circle cx="41" cy="48" r="0.9" fill="#fff" /><ellipse cx="56" cy="50" rx="2.8" ry="3.4" fill="#1E3A5F" /><circle cx="57" cy="49" r="0.9" fill="#fff" /></g>,
  };
  const eyes = eyesBy[mood] ?? eyesBy.happy;
  const mouthBy: Partial<Record<Mood, JSX.Element>> = {
    sleepy: <path d="M 42 58 Q 48 63 54 58" stroke="#1E3A5F" strokeWidth="2.4" fill="none" strokeLinecap="round" />,
    happy: <path d="M 41 58 Q 48 64 55 58" stroke="#1E3A5F" strokeWidth="2.4" fill="none" strokeLinecap="round" />,
    celebrate: <ellipse cx="48" cy="59" rx="6" ry="7" fill="#7B5BC0" />,
    encourage: <path d="M 42 59 Q 48 62 54 59" stroke="#1E3A5F" strokeWidth="2.4" fill="none" strokeLinecap="round" />,
  };
  const mouth = mouthBy[mood] ?? mouthBy.happy;
  return <svg width={size} height={size} viewBox="0 0 100 100" role="img" aria-label="Luna the moon">
    <defs>
      <radialGradient id={gid} cx="35%" cy="35%">
        <stop offset="0%" stopColor="#F7F4FF" />
        <stop offset="100%" stopColor="#B8B5E8" />
      </radialGradient>
    </defs>
    {/* Moon body */}
    <circle cx="50" cy="50" r="32" fill={`url(#${gid})`} stroke="#8F8BD6" strokeWidth="2" />
    {/* Craters */}
    <circle cx="70" cy="42" r="3" fill="#C9C5F0" opacity="0.7" />
    <circle cx="68" cy="64" r="4" fill="#C9C5F0" opacity="0.7" />
    <circle cx="78" cy="55" r="2" fill="#C9C5F0" opacity="0.6" />
    {/* Sleepy cap */}
    <path d="M 26 34 Q 30 20 48 22 L 56 30 Z" fill="#B983FF" />
    <circle cx="30" cy="22" r="4" fill="#FFD93D" />
    {/* Cheeks */}
    <circle cx="36" cy="58" r="4" fill="#FF9EC7" opacity="0.7" />
    <circle cx="56" cy="60" r="4" fill="#FF9EC7" opacity="0.7" />
    <g className="m-eyes">{eyes}</g>
    {mouth}
    <OutfitAccessory outfit={outfit} />
  </svg>;
}

export function Mascot({ who, ...rest }: MascotProps & { who: "sol" | "luna" }) {
  return who === "luna" ? <Luna {...rest} /> : <Sol {...rest} />;
}

// A mascot with a speech bubble that pops up from the bottom, then leaves.
export function MascotReaction({ reaction, onDone, duration = 2000 }: { reaction: Reaction | null; onDone?: () => void; duration?: number }) {
  // Keep the latest callback in a ref so parent re-renders don't restart the timer.
  const done = useRef(onDone);
  done.current = onDone;
  useEffect(() => {
    if (!reaction) return;
    const t = setTimeout(() => done.current?.(), duration);
    return () => clearTimeout(t);
  }, [reaction, duration]);
  if (!reaction) return null;
  return <div className="reaction" key={reaction.id} aria-live="polite">
    <div className="reaction__mascot"><Mascot who={reaction.who} mood={reaction.mood || (reaction.who === "sol" ? "celebrate" : "happy")} size={58} /></div>
    <div className="reaction__bubble">{reaction.text}</div>
  </div>;
}
