import type React from "react";
import { SLOW, voice } from "../audio/player.ts";
import { useEffect, useMemo, useRef, useState, type ButtonHTMLAttributes, type HTMLAttributes, type InputHTMLAttributes, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { findReward, RARITY, type EarnedReward, type Sticker } from "../domain/rewards.ts";
export type SpeakLang = "es" | "en";
import { darken } from "../lib/utils.ts";
import { Art } from "./Art.tsx";

export type ButtonVariant = "white" | "sun" | "luna" | "mint" | "coral" | "sky" | "ghost";
interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> { variant?: ButtonVariant; size?: "sm" | "lg"; block?: boolean }
export function Button({ variant = "white", size, block, className = "", children, ...rest }: ButtonProps) {
  const cls = ["btn", `btn--${variant}`, size && `btn--${size}`, block && "btn--block", className].filter(Boolean).join(" ");
  return <button type="button" className={cls} {...rest}>{children}</button>;
}

interface CardProps extends HTMLAttributes<HTMLElement> { pad?: boolean; as?: "div" | "button" | "section"; type?: "button" | "submit"; disabled?: boolean }
export function Card({ className = "", pad = true, as = "div", children, ...rest }: CardProps) {
  const Tag = as as "div";
  return <Tag className={`card ${pad ? "card--pad" : ""} ${className}`} {...rest}>{children}</Tag>;
}

export function Field({ label, ...rest }: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return <label className="field">
    <span className="field__label">{label}</span>
    <input className="field__input" {...rest} />
  </label>;
}

export function ProgressBar({ value, color, thin, label }: { value: number; color?: string; thin?: boolean; label?: string }) {
  const pct = Math.max(0, Math.min(1, value || 0)) * 100;
  return <div className={`progress ${thin ? "progress--thin" : ""}`} role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
    <div className="progress__fill" style={{ width: `${pct}%`, "--fill": color }} />
  </div>;
}

export function Stars({ count, max = 3, className = "stone__stars" }: { count: number; max?: number; className?: string }) {
  return <div className={className} aria-label={`${count} of ${max} stars`}>
    {Array.from({ length: max }, (_, i) => <span key={i} className={i < count ? "on" : ""}>⭐</span>)}
  </div>;
}

// 🔊 button that speaks a Spanish word, with a 🐢 button beside it that says
// it slowly (same pitch) so learners can hear every sound.
export function SpeakButton({ text, size = 40, big = false, lang = "es", label = "Listen", slow = true }: { text: string; size?: number; big?: boolean; lang?: SpeakLang; label?: string; slow?: boolean }) {
  const [on, setOn] = useState<"normal" | "slow" | null>(null);
  const t = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => clearTimeout(t.current), []);
  if (!voice.available()) return null;
  const say = (how: "normal" | "slow") => (e: React.MouseEvent) => {
    e.stopPropagation();
    const rate = how === "slow" ? SLOW : undefined;
    if (lang === "es") voice.spanish(text, { rate }); else voice.narrate(text, { rate });
    setOn(how);
    clearTimeout(t.current);
    t.current = setTimeout(() => setOn(null), how === "slow" ? 1200 : 700);
  };
  const main = <button type="button" onClick={say("normal")} aria-label={`${label}: ${text}`} title={label}
    className={`speak-btn ${big ? "speak-btn--big" : ""} ${on === "normal" ? "is-on" : ""}`} style={big ? undefined : { "--s": `${size}px` }}>🔊</button>;
  if (!slow || lang !== "es") return main;
  return <span className="speak-pair">
    {main}
    <button type="button" onClick={say("slow")} aria-label={`Say it slowly: ${text}`} title="Say it slowly"
      className={`speak-btn speak-btn--slow ${on === "slow" ? "is-on" : ""}`} style={{ "--s": `${Math.round((big ? 64 : size) * 0.62)}px` }}>🐢</button>
  </span>;
}

export function Modal({ onClose, children, labelledBy }: { onClose?: () => void; children: ReactNode; labelledBy?: string }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return <div className="modal-backdrop" onClick={onClose}>
    <div className="modal card card--pad-lg" role="dialog" aria-modal="true" aria-labelledby={labelledBy} onClick={e => e.stopPropagation()}>{children}</div>
  </div>;
}

const CONFETTI_COLOURS = ["#FF5A6E", "#FFB020", "#2EC27E", "#3D8BFF", "#7C6CF2", "#FF8FC7", "#FF7A45"];

// Confetti burst. Pieces are generated once per burst (keyed by `burst`), so
// re-renders don't make them jump around.
export function Confetti({ burst }: { burst: number }) {
  const pieces = useMemo(() => Array.from({ length: 48 }, (_, i) => ({
    left: Math.random() * 100,
    w: 7 + Math.random() * 7,
    h: 10 + Math.random() * 9,
    dur: 1.6 + Math.random() * 1.2,
    delay: Math.random() * 0.5,
    c: CONFETTI_COLOURS[i % CONFETTI_COLOURS.length],
    round: i % 4 === 0,
  })), [burst]);
  if (!burst) return null;
  return <div className="confetti" aria-hidden="true">
    {pieces.map((p, i) => <i key={`${burst}-${i}`} style={{
      left: `${p.left}%`, width: p.w, height: p.round ? p.w : p.h, background: p.c,
      borderRadius: p.round ? "50%" : 3, animationDuration: `${p.dur}s`, animationDelay: `${p.delay}s`,
    }} />)}
  </div>;
}

// Celebrates one newly earned badge / sticker / outfit.
export function RewardToast({ reward, onClose }: { reward: EarnedReward; onClose: () => void }) {
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const t = setTimeout(() => close.current?.(), 4200);
    return () => clearTimeout(t);
  }, [reward]);
  const item = findReward(reward);
  if (!item) return null;
  let col = "#FFB020", kicker = "NEW BADGE!";
  if (reward.type === "sticker") { const r = RARITY[(item as Sticker).rarity]; col = r?.c || col; kicker = `NEW ${(r?.label || "Sticker").toUpperCase()}!`; }
  if (reward.type === "outfit") { col = "#7C6CF2"; kicker = "NEW OUTFIT!"; }
  return <button type="button" className="toast" onClick={onClose} role="status" style={{ "--toast": col, "--toast-d": darken(col) }}>
    <div className="toast__icon"><Art e={item.emoji} size={34} eager /></div>
    <div>
      <div className="toast__kicker">{kicker}</div>
      <div className="toast__title">{item.name}</div>
    </div>
  </button>;
}


// Shared multiple-choice grid. `options` are items; `getKey`/`render` describe
// them; `answerKey` is the correct key; `picked` the chosen key (or null).
export interface ChoicesProps<T> { options: T[]; getKey: (o: T) => string; render: (o: T) => ReactNode; answerKey: string; picked: string | null; onPick: (o: T) => void; list?: boolean }
export function Choices<T>({ options, getKey, render, answerKey, picked, onPick, list = false }: ChoicesProps<T>) {
  return <div className={`choices ${list ? "choices--list" : ""}`}>
    {options.map(o => {
      const k = getKey(o);
      const revealed = picked != null;
      const cls = !revealed ? "" : k === answerKey ? "is-correct" : k === picked ? "is-wrong" : "is-dim";
      return <button key={k} type="button" className={`choice ${cls}`} disabled={revealed} onClick={() => onPick(o)}>{render(o)}</button>;
    })}
  </div>;
}

export function Feedback({ show, good, children }: { show: boolean; good: boolean; children: ReactNode }) {
  if (!show) return <div className="feedback-spacer" />;
  return <div className={`feedback ${good ? "feedback--good" : "feedback--bad"}`} role="status">{children}</div>;
}

// Tab-style switcher with a highlight that slides between options.
export function Segmented<K extends string>({ options, value, onChange, id = "seg" }: { options: readonly (readonly [K, ReactNode])[]; value: K; onChange: (k: K) => void; id?: string }) {
  return <div className="segmented" role="tablist">
    {options.map(([key, label]) => <button key={key} type="button" role="tab" aria-selected={value === key} onClick={() => onChange(key)}>
      {value === key && <motion.span layoutId={`${id}-pill`} className="segmented__pill" transition={{ type: "spring", stiffness: 500, damping: 36 }} />}
      {label}
    </button>)}
  </div>;
}

// "+10 XP" numbers that float up from where the child answered.
export interface XpPop { id: number; amount: number; label?: string; x: number; y: number }
export function XpPops({ pops }: { pops: XpPop[] }) {
  return <AnimatePresence>
    {pops.map(p => <motion.div key={p.id} className="xp-pop" style={{ left: p.x, top: p.y }}
      initial={{ opacity: 0, y: 0, scale: 0.6, x: "-50%" }} animate={{ opacity: [0, 1, 1, 0], y: -90, scale: [0.6, 1.25, 1, 1] }}
      exit={{ opacity: 0 }} transition={{ duration: 1.2, ease: "easeOut" }}>+{p.amount} XP{p.label ? ` ${p.label}` : ""}</motion.div>)}
  </AnimatePresence>;
}

export function LevelUpModal({ level, title, onClose }: { level: number; title: string; onClose: () => void }) {
  return <div className="modal-backdrop" onClick={onClose}>
    <div className="sunburst" aria-hidden="true" />
    <motion.div className="modal card card--pad-lg level-up" role="dialog" aria-modal="true" aria-labelledby="lvl-title" onClick={e => e.stopPropagation()}
      initial={{ scale: 0.4, rotate: -8, opacity: 0 }} animate={{ scale: 1, rotate: 0, opacity: 1 }} transition={{ type: "spring", stiffness: 260, damping: 16 }}>
      <div className="eyebrow" style={{ color: "var(--gold)" }}>Level up!</div>
      <motion.div className="level-up__badge" initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: "spring", stiffness: 300, damping: 12 }}>
        <span className="level-up__num">{level}</span>
      </motion.div>
      <h2 id="lvl-title" className="h1" style={{ fontSize: 34 }}>¡Increíble!</h2>
      <p className="muted" style={{ margin: "6px 0 20px" }}>You’re now a <b style={{ color: "var(--text)" }}>{title}</b>. Keep going!</p>
      <Button variant="sun" size="lg" block onClick={onClose}>¡Vamos! 🚀</Button>
    </motion.div>
  </div>;
}
