// A child's avatar: 3D character on a colour background, with an optional
// accessory. Accepts the stored code ("av1:…") or an older single emoji.
import type { CSSProperties } from "react";
import { ACCESSORIES, BACKGROUNDS, avatarEmoji, decodeAvatar } from "../domain/avatar.ts";
import { Art } from "./Art.tsx";

export function Avatar({ value, size = 64, ring = true, className = "", style }: { value: string; size?: number; ring?: boolean; className?: string; style?: CSSProperties }) {
  const a = decodeAvatar(value);
  const [c1, c2] = BACKGROUNDS[a.bg];
  const acc = ACCESSORIES[a.acc];
  return <span className={`avatar ${ring ? "avatar--ring" : ""} ${className}`} role="img" aria-label="Avatar"
    style={{ width: size, height: size, "--a1": c1, "--a2": c2, ...style } as CSSProperties}>
    <span className="avatar__char"><Art e={avatarEmoji(a)} size={Math.round(size * 0.74)} still eager /></span>
    {acc.emoji && <span className={`avatar__acc avatar__acc--${acc.spot}`}><Art e={acc.emoji} size={Math.round(size * (acc.spot === "corner" ? 0.34 : 0.4))} still eager /></span>}
  </span>;
}
