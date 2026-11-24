import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { speech } from "../lib/speech.js";
import { findReward, RARITY } from "../data/rewards.js";
import { darken } from "../lib/utils.js";

export function Button({ variant = "white", size, block, className = "", children, ...rest }) {
  const cls = ["btn", `btn--${variant}`, size && `btn--${size}`, block && "btn--block", className].filter(Boolean).join(" ");
  return <button type="button" className={cls} {...rest}>{children}</button>;
}

export function Card({ className = "", pad = true, as: Tag = "div", children, ...rest }) {
  return <Tag className={`card ${pad ? "card--pad" : ""} ${className}`} {...rest}>{children}</Tag>;
}

export function Field({ label, ...rest }) {
  return <label className="field">
    <span className="field__label">{label}</span>
    <input className="field__input" {...rest} />
  </label>;
}

export function ProgressBar({ value, color, thin, label }) {
  const pct = Math.max(0, Math.min(1, value || 0)) * 100;
  return <div className={`progress ${thin ? "progress--thin" : ""}`} role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
    <div className="progress__fill" style={{ width: `${pct}%`, "--fill": color }} />
  </div>;
}

export function Stars({ count, max = 3, className = "stone__stars" }) {
  return <div className={className} aria-label={`${count} of ${max} stars`}>
    {Array.from({ length: max }, (_, i) => <span key={i} className={i < count ? "on" : ""}>⭐</span>)}
  </div>;
}

// 🔊 button that speaks a Spanish word.
export function SpeakButton({ text, size = 40, big = false, lang = "es", label = "Listen" }) {
  const [on, setOn] = useState(false);
  const t = useRef();
  useEffect(() => () => clearTimeout(t.current), []);
  if (!speech.supported()) return null;
  const click = e => {
    e.stopPropagation();
    speech.speak(text, { lang });
    setOn(true);
    clearTimeout(t.current);
    t.current = setTimeout(() => setOn(false), 700);
  };
  return <button type="button" onClick={click} aria-label={`${label}: ${text}`} title={label}
    className={`speak-btn ${big ? "speak-btn--big" : ""} ${on ? "is-on" : ""}`} style={big ? undefined : { "--s": `${size}px` }}>🔊</button>;
}

export function Modal({ onClose, children, labelledBy }) {
  useEffect(() => {
    const onKey = e => e.key === "Escape" && onClose?.();
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
export function Confetti({ burst }) {
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
export function RewardToast({ reward, onClose }) {
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const t = setTimeout(() => close.current?.(), 4200);
    return () => clearTimeout(t);
  }, [reward]);
  const item = findReward(reward);
  if (!item) return null;
  let col = "#FFB020", kicker = "NEW BADGE!";
  if (reward.type === "sticker") { col = RARITY[item.rarity]?.c || col; kicker = `NEW ${(RARITY[item.rarity]?.label || "Sticker").toUpperCase()}!`; }
  if (reward.type === "outfit") { col = "#7C6CF2"; kicker = "NEW OUTFIT!"; }
  return <button type="button" className="toast" onClick={onClose} role="status" style={{ "--toast": col, "--toast-d": darken(col) }}>
    <div className="toast__icon">{item.emoji}</div>
    <div>
      <div className="toast__kicker">{kicker}</div>
      <div className="toast__title">{item.name}</div>
    </div>
  </button>;
}


// Shared multiple-choice grid. `options` are items; `getKey`/`render` describe
// them; `answerKey` is the correct key; `picked` the chosen key (or null).
export function Choices({ options, getKey, render, answerKey, picked, onPick, list = false }) {
  return <div className={`choices ${list ? "choices--list" : ""}`}>
    {options.map(o => {
      const k = getKey(o);
      const revealed = picked != null;
      const cls = !revealed ? "" : k === answerKey ? "is-correct" : k === picked ? "is-wrong" : "is-dim";
      return <button key={k} type="button" className={`choice ${cls}`} disabled={revealed} onClick={() => onPick(o)}>{render(o)}</button>;
    })}
  </div>;
}

export function Feedback({ show, good, children }) {
  if (!show) return <div className="feedback-spacer" />;
  return <div className={`feedback ${good ? "feedback--good" : "feedback--bad"}`} role="status">{children}</div>;
}

// Tab-style switcher with a highlight that slides between options.
export function Segmented({ options, value, onChange, id = "seg" }) {
  return <div className="segmented" role="tablist">
    {options.map(([key, label]) => <button key={key} type="button" role="tab" aria-selected={value === key} onClick={() => onChange(key)}>
      {value === key && <motion.span layoutId={`${id}-pill`} className="segmented__pill" transition={{ type: "spring", stiffness: 500, damping: 36 }} />}
      {label}
    </button>)}
  </div>;
}

// "+10 XP" numbers that float up from where the child answered.
export function XpPops({ pops }) {
  return <AnimatePresence>
    {pops.map(p => <motion.div key={p.id} className="xp-pop" style={{ left: p.x, top: p.y }}
      initial={{ opacity: 0, y: 0, scale: 0.6, x: "-50%" }} animate={{ opacity: [0, 1, 1, 0], y: -90, scale: [0.6, 1.25, 1, 1] }}
      exit={{ opacity: 0 }} transition={{ duration: 1.2, ease: "easeOut" }}>+{p.amount} XP{p.label ? ` ${p.label}` : ""}</motion.div>)}
  </AnimatePresence>;
}

export function LevelUpModal({ level, title, onClose }) {
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
