// ============================================================
// SOL (the sun) and LUNA (the moon): animated characters drawn in SVG.
//
// Each character is a small rig: body, face (eyes, brows, cheeks, mouth),
// little hands and their own extras (Sol's rays, Luna's nightcap and
// sparkles). On top of the mood you pass in, they:
//   · breathe, bob, blink (sometimes twice) and glance around when idle
//   · follow the child's finger or mouse with their eyes
//   · move their mouth while their own voice is playing
//   · jump for joy, tilt their head kindly, or pop with surprise when the mood changes
//   · giggle and squish when tapped
// Everything pauses when off-screen or in the background, and the device's
// "reduce motion" setting turns the idle loops off.
// The look is separate from the behaviour (useCharacter), so artist-made
// Rive versions can replace the drawings later without touching the screens.
// ============================================================
import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { speaking } from "../audio/player.ts";
import type { Mood, Reaction } from "../lib/reactions.ts";

export interface MascotProps { size?: number; mood?: Mood; outfit?: string | null }
type Who = "sol" | "luna";

const INK = "#2B2140";
const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const ORIGIN = { transformBox: "fill-box", transformOrigin: "center" } as const;

// ---------- behaviour ----------
function useVisible(ref: React.RefObject<Element>) {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { rootMargin: "40px" });
    io.observe(el);
    return () => io.disconnect();
  }, [ref]);
  const [shown, setShown] = useState(() => typeof document === "undefined" || document.visibilityState !== "hidden");
  useEffect(() => {
    const on = () => setShown(document.visibilityState !== "hidden");
    document.addEventListener("visibilitychange", on);
    return () => document.removeEventListener("visibilitychange", on);
  }, []);
  return visible && shown;
}

// Blinks, glances, eye-following, talking and one-shot reactions.
function useCharacter(who: Who, mood: Mood, size: number) {
  const ref = useRef<SVGSVGElement>(null);
  const reduce = useReducedMotion() ?? false;
  const active = useVisible(ref) && !reduce;
  const [blink, setBlink] = useState(false);
  const [look, setLook] = useState({ x: 0, y: 0 });
  const [mouth, setMouth] = useState(0);
  // One-shot reactions: a mood change plays its entrance, a tap plays a giggle.
  const [event, setEvent] = useState<{ n: number; kind: "mood" | "giggle" }>({ n: 0, kind: "mood" });
  const talking = useSyncExternalStore(speaking.subscribe, () => speaking.get() === who, () => false);

  // blink every few seconds, sometimes twice
  useEffect(() => {
    if (!active) return;
    let t: ReturnType<typeof setTimeout>;
    const loop = () => {
      t = setTimeout(() => {
        setBlink(true);
        setTimeout(() => setBlink(false), 120);
        if (Math.random() < 0.25) setTimeout(() => { setBlink(true); setTimeout(() => setBlink(false), 110); }, 260);
        loop();
      }, rnd(2200, 5600));
    };
    loop();
    return () => clearTimeout(t);
  }, [active]);

  // glance around now and then; follow the pointer when it moves
  useEffect(() => {
    if (!active) return;
    let lastPointer = 0;
    let t: ReturnType<typeof setTimeout>;
    const glance = () => {
      t = setTimeout(() => {
        if (Date.now() - lastPointer > 2500) setLook(Math.random() < 0.4 ? { x: 0, y: 0 } : { x: rnd(-1, 1), y: rnd(-0.6, 0.5) });
        glance();
      }, rnd(2400, 5200));
    };
    glance();
    let frame = 0;
    const onMove = (e: PointerEvent) => {
      if (size < 44 || frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const r = ref.current?.getBoundingClientRect();
        if (!r) return;
        const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
        const d = Math.hypot(dx, dy) || 1;
        const k = Math.min(1, d / 220);
        lastPointer = Date.now();
        setLook({ x: (dx / d) * k, y: (dy / d) * k * 0.7 });
      });
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => { clearTimeout(t); window.removeEventListener("pointermove", onMove); if (frame) cancelAnimationFrame(frame); };
  }, [active, size]);

  // mouth flaps while this character's voice is playing
  useEffect(() => {
    if (!talking) { setMouth(0); return; }
    const id = setInterval(() => setMouth(m => (m > 0.5 ? rnd(0.05, 0.4) : rnd(0.45, 1))), 105);
    return () => clearInterval(id);
  }, [talking]);

  // a mood change plays its entrance once
  const first = useRef(true);
  useEffect(() => { if (first.current) { first.current = false; return; } setEvent(e => ({ n: e.n + 1, kind: "mood" })); }, [mood]);

  const tap = () => { setEvent(e => ({ n: e.n + 1, kind: "giggle" })); setBlink(true); setTimeout(() => setBlink(false), 380); };
  return { ref, active, reduce, blink, look, mouth: talking ? mouth : 0, talking, event, tap };
}

type Rig = ReturnType<typeof useCharacter>;

// Whole-body motion: idle breathing + bob, plus the latest one-shot reaction.
function bodyMotion(rig: Rig, mood: Mood) {
  const idle = rig.active ? { scaleY: [1, 1.025, 1], scaleX: [1, 0.99, 1], y: [0, -1.5, 0] } : { scaleY: 1, scaleX: 1, y: 0 };
  const idleT = { duration: 3.2, repeat: Infinity, ease: "easeInOut" as const };
  const once = rig.reduce || rig.event.n === 0 ? {} : reactionFor(mood, rig.event.kind === "giggle");
  return { idle, idleT, key: rig.event.n, once };
}
function reactionFor(mood: Mood, giggle: boolean) {
  if (giggle) return { scaleX: [1, 1.14, 0.94, 1.04, 1], scaleY: [1, 0.86, 1.08, 0.97, 1], rotate: [0, -6, 5, -2, 0] };
  switch (mood) {
    case "celebrate": return { y: [0, -14, 0, -6, 0], scaleY: [1, 1.08, 0.9, 1.04, 1], scaleX: [1, 0.94, 1.08, 0.98, 1] };
    case "encourage": return { rotate: [0, -9, -7, 0] };
    case "surprised": return { scale: [1, 1.15, 0.97, 1] };
    case "thinking": return { rotate: [0, 6, 4] };
    case "wink": return { rotate: [0, -5, 0] };
    default: return { y: [0, -4, 0] };
  }
}

// ---------- face parts (shared) ----------
function Eyes({ mood, blink, look, cx = 60, cy = 58, gap = 10, celebrateClosed = true }: { mood: Mood; blink: boolean; look: { x: number; y: number }; cx?: number; cy?: number; gap?: number; celebrateClosed?: boolean }) {
  const lx = cx - gap, rx = cx + gap;
  const arc = (x: number, up = true) => <path d={up ? `M ${x - 4} ${cy + 1} Q ${x} ${cy - 4} ${x + 4} ${cy + 1}` : `M ${x - 4} ${cy - 1} Q ${x} ${cy + 3} ${x + 4} ${cy - 1}`} stroke={INK} strokeWidth="2.6" fill="none" strokeLinecap="round" />;
  if (mood === "celebrate" && celebrateClosed) return <g>{arc(lx)}{arc(rx)}</g>;
  if (mood === "sleepy") return <g>{arc(lx, false)}{arc(rx, false)}</g>;
  const big = mood === "surprised";
  const rx_ = big ? 4.3 : 3.6, ry = big ? 5.4 : 4.6;
  const think = mood === "thinking" ? { x: 1.6, y: -1.8 } : { x: 0, y: 0 };
  const ox = (look.x * 2.2) + think.x, oy = (look.y * 1.8) + think.y;
  const eye = (x: number, closed: boolean) => closed
    ? arc(x)
    : <g>
        <ellipse cx={x + ox} cy={cy + oy} rx={rx_} ry={ry} fill={INK} />
        <circle cx={x + ox + 1.3} cy={cy + oy - 1.8} r={big ? 1.6 : 1.3} fill="#fff" />
        <circle cx={x + ox - 1.2} cy={cy + oy + 1.6} r="0.6" fill="#fff" opacity="0.7" />
      </g>;
  return <motion.g style={ORIGIN} animate={{ scaleY: blink ? 0.08 : 1 }} transition={{ duration: 0.07 }}>
    {eye(lx, false)}
    {mood === "wink" ? arc(rx) : eye(rx, false)}
  </motion.g>;
}

function Brows({ mood, cx = 60, y = 48, gap = 10 }: { mood: Mood; cx?: number; y?: number; gap?: number }) {
  const lx = cx - gap, rx = cx + gap;
  const shape: Record<string, [string, string]> = {
    worried: [`M ${lx - 4} ${y} Q ${lx} ${y - 1} ${lx + 4} ${y - 3}`, `M ${rx - 4} ${y - 3} Q ${rx} ${y - 1} ${rx + 4} ${y}`],
    raised: [`M ${lx - 4} ${y - 2} Q ${lx} ${y - 6} ${lx + 4} ${y - 2}`, `M ${rx - 4} ${y - 2} Q ${rx} ${y - 6} ${rx + 4} ${y - 2}`],
    think: [`M ${lx - 4} ${y} Q ${lx} ${y - 1} ${lx + 4} ${y}`, `M ${rx - 4} ${y - 3} Q ${rx} ${y - 7} ${rx + 4} ${y - 3}`],
    soft: [`M ${lx - 4} ${y} Q ${lx} ${y - 3} ${lx + 4} ${y}`, `M ${rx - 4} ${y} Q ${rx} ${y - 3} ${rx + 4} ${y}`],
  };
  const k = mood === "encourage" ? "worried" : mood === "surprised" || mood === "celebrate" ? "raised" : mood === "thinking" ? "think" : "soft";
  return <g stroke={INK} strokeWidth="1.8" fill="none" strokeLinecap="round" opacity="0.85">
    <motion.path initial={{ d: shape[k][0] }} animate={{ d: shape[k][0] }} transition={{ duration: 0.25 }} />
    <motion.path initial={{ d: shape[k][1] }} animate={{ d: shape[k][1] }} transition={{ duration: 0.25 }} />
  </g>;
}

function Mouth({ mood, open, cx = 60, cy = 70, tone }: { mood: Mood; open: number; cx?: number; cy?: number; tone: string }) {
  if (open > 0.04) {
    const ry = 1.6 + open * 5.4, rx = 4.6 + (1 - open) * 1.6;
    return <g>
      <ellipse cx={cx} cy={cy + 1} rx={rx} ry={ry} fill={tone} />
      <ellipse cx={cx} cy={cy + 1 + ry * 0.55} rx={rx * 0.6} ry={ry * 0.35} fill="#FF7A9A" opacity={open > 0.3 ? 1 : 0} />
    </g>;
  }
  switch (mood) {
    case "celebrate": return <g><path d={`M ${cx - 8} ${cy - 2} Q ${cx} ${cy - 2} ${cx + 8} ${cy - 2} Q ${cx + 7} ${cy + 9} ${cx} ${cy + 9} Q ${cx - 7} ${cy + 9} ${cx - 8} ${cy - 2} Z`} fill={tone} />
      <ellipse cx={cx} cy={cy + 6} rx="4" ry="2.2" fill="#FF7A9A" /></g>;
    case "surprised": return <ellipse cx={cx} cy={cy + 2} rx="3.4" ry="4.2" fill={tone} />;
    case "encourage": return <path d={`M ${cx - 5} ${cy + 1} Q ${cx} ${cy + 4} ${cx + 5} ${cy + 1}`} stroke={INK} strokeWidth="2.4" fill="none" strokeLinecap="round" />;
    case "thinking": return <path d={`M ${cx - 4} ${cy + 2} Q ${cx + 1} ${cy + 1} ${cx + 5} ${cy - 1}`} stroke={INK} strokeWidth="2.4" fill="none" strokeLinecap="round" />;
    case "sleepy": return <ellipse cx={cx} cy={cy + 1} rx="2.6" ry="2" fill={tone} opacity="0.85" />;
    default: return <path d={`M ${cx - 7} ${cy - 1} Q ${cx} ${cy + 7} ${cx + 7} ${cy - 1}`} stroke={INK} strokeWidth="2.6" fill="none" strokeLinecap="round" />;
  }
}

// Little hands: where they sit for each mood (relative to a 120×120 body).
function handPose(mood: Mood, talking: boolean) {
  switch (mood) {
    case "celebrate": return { l: { x: 20, y: 36, r: -20 }, r: { x: 100, y: 36, r: 20 }, wave: true };
    case "thinking": return { l: { x: 24, y: 84, r: 0 }, r: { x: 70, y: 82, r: 0 }, wave: false };
    case "encourage": return { l: { x: 24, y: 84, r: 0 }, r: { x: 98, y: 58, r: 15 }, wave: false };
    case "surprised": return { l: { x: 26, y: 70, r: -10 }, r: { x: 94, y: 70, r: 10 }, wave: false };
    case "wink": return { l: { x: 24, y: 84, r: 0 }, r: { x: 100, y: 46, r: 10 }, wave: true };
    default: return { l: { x: 24, y: 84, r: 0 }, r: { x: 96, y: 84, r: 0 }, wave: talking };
  }
}
function Hands({ mood, talking, fill, stroke, active }: { mood: Mood; talking: boolean; fill: string; stroke: string; active: boolean }) {
  const p = handPose(mood, talking);
  const hand = (h: { x: number; y: number; r: number }, side: 1 | -1, wave: boolean) =>
    <motion.g initial={false} animate={{ x: h.x, y: h.y, rotate: wave && active ? [h.r, h.r + 18 * side, h.r] : h.r }}
      transition={{ x: { type: "spring", stiffness: 260, damping: 16 }, y: { type: "spring", stiffness: 260, damping: 16 }, rotate: wave && active ? { duration: 0.5, repeat: Infinity, ease: "easeInOut" } : { duration: 0.3 } }}>
      <ellipse cx="0" cy="0" rx="6.4" ry="5.8" fill={fill} stroke={stroke} strokeWidth="1.4" />
      <ellipse cx={-1.6 * side} cy="-1.8" rx="2.2" ry="1.4" fill="#fff" opacity="0.45" />
    </motion.g>;
  return <g>{hand(p.l, -1, p.wave && mood === "celebrate")}{hand(p.r, 1, p.wave)}</g>;
}

// ---------- outfits ----------
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

// ---------- Sol ----------
export function Sol({ size = 56, mood = "happy", outfit }: MascotProps) {
  const id = `sol-${useId().replace(/:/g, "")}`;
  const rig = useCharacter("sol", mood, size);
  const m = bodyMotion(rig, mood);
  const party = mood === "celebrate";
  return <svg ref={rig.ref} width={size} height={size} viewBox="0 0 120 120" role="img" aria-label="Sol the sun" className="character" onPointerDown={rig.tap} style={{ overflow: "visible" }}>
    <defs>
      <radialGradient id={`${id}-b`} cx="38%" cy="32%" r="75%">
        <stop offset="0%" stopColor="#FFF3B0" /><stop offset="45%" stopColor="#FFD23F" /><stop offset="100%" stopColor="#FF9F1C" />
      </radialGradient>
      <linearGradient id={`${id}-r`} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#FFE066" /><stop offset="100%" stopColor="#FFA62B" /></linearGradient>
    </defs>
    <ellipse cx="60" cy="112" rx="22" ry="3.5" fill="#000" opacity="0.12" />
    <motion.g key={m.key} style={ORIGIN} animate={m.once} transition={{ duration: 0.7, ease: "easeOut" }}>
      <motion.g style={ORIGIN} animate={m.idle} transition={m.idleT}>
        {/* rays */}
        <motion.g style={{ transformOrigin: "60px 60px" }} animate={rig.active ? { rotate: 360 } : { rotate: 0 }}
          transition={{ duration: party ? 3 : 26, repeat: Infinity, ease: "linear" }}>
          <motion.g style={{ transformOrigin: "60px 60px" }} animate={rig.active ? { scale: party ? [1, 1.12, 1] : [1, 1.04, 1] } : { scale: 1 }}
            transition={{ duration: party ? 0.6 : 2.6, repeat: Infinity, ease: "easeInOut" }}>
            {Array.from({ length: 12 }).map((_, i) => <path key={i} d={i % 2 ? "M -4.5 -37 Q 0 -51 4.5 -37 Z" : "M -5.5 -37 Q 0 -57 5.5 -37 Z"}
              transform={`translate(60 60) rotate(${i * 30})`} fill={`url(#${id}-r)`} stroke="#F7931E" strokeWidth="0.8" strokeLinejoin="round" />)}
          </motion.g>
        </motion.g>
        {/* body */}
        <circle cx="60" cy="60" r="33" fill={`url(#${id}-b)`} stroke="#F08A1C" strokeWidth="1.6" />
        <ellipse cx="47" cy="43" rx="11" ry="6.5" fill="#fff" opacity="0.4" transform="rotate(-28 47 43)" />
        <path d="M 34 74 Q 60 96 86 74" stroke="#F08A1C" strokeWidth="1.2" fill="none" opacity="0.35" />
        {/* face */}
        <g>
          <ellipse cx="44" cy="67" rx="5" ry="3.2" fill="#FF7FA6" opacity="0.55" />
          <ellipse cx="76" cy="67" rx="5" ry="3.2" fill="#FF7FA6" opacity="0.55" />
          <Brows mood={mood} />
          <Eyes mood={mood} blink={rig.blink} look={rig.look} />
          <Mouth mood={mood} open={rig.mouth} tone="#7A2E1F" />
        </g>
        <Hands mood={mood} talking={rig.talking} fill="#FFC93C" stroke="#F08A1C" active={rig.active} />
        <g transform="translate(60 60) scale(1.18) translate(-50 -52)"><OutfitAccessory outfit={outfit} /></g>
      </motion.g>
    </motion.g>
  </svg>;
}

// ---------- Luna ----------
export function Luna({ size = 56, mood = "sleepy", outfit }: MascotProps) {
  const id = `luna-${useId().replace(/:/g, "")}`;
  const rig = useCharacter("luna", mood, size);
  const m = bodyMotion(rig, mood);
  const party = mood === "celebrate";
  return <svg ref={rig.ref} width={size} height={size} viewBox="0 0 120 120" role="img" aria-label="Luna the moon" className="character" onPointerDown={rig.tap} style={{ overflow: "visible" }}>
    <defs>
      <radialGradient id={`${id}-b`} cx="36%" cy="32%" r="78%">
        <stop offset="0%" stopColor="#FFFFFF" /><stop offset="50%" stopColor="#DCD7FF" /><stop offset="100%" stopColor="#A79FEF" />
      </radialGradient>
      <linearGradient id={`${id}-c`} x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#C49BFF" /><stop offset="100%" stopColor="#8B5CF6" /></linearGradient>
    </defs>
    <ellipse cx="60" cy="112" rx="22" ry="3.5" fill="#000" opacity="0.12" />
    {/* sparkles */}
    {[[18, 30, 0], [102, 26, 0.5], [104, 86, 1], [14, 88, 1.5]].map(([x, y, d], i) =>
      <motion.path key={i} d="M 0 -6 Q 0 0 6 0 Q 0 0 0 6 Q 0 0 -6 0 Q 0 0 0 -6 Z" fill="#FFE27A" transform={`translate(${x} ${y})`}
        initial={false} animate={rig.active ? { opacity: party ? [0, 1, 0] : [0, 0.7, 0], scale: party ? [0.4, 1.3, 0.4] : [0.3, 0.8, 0.3] } : { opacity: 0 }}
        transition={{ duration: party ? 0.9 : 3.2, repeat: Infinity, delay: Number(d), ease: "easeInOut" }} style={ORIGIN} />)}
    <motion.g key={m.key} style={ORIGIN} animate={m.once} transition={{ duration: 0.7, ease: "easeOut" }}>
      <motion.g style={ORIGIN} animate={m.idle} transition={{ ...m.idleT, duration: 3.8 }}>
        {/* body + craters */}
        <circle cx="60" cy="60" r="34" fill={`url(#${id}-b)`} stroke="#8F86E0" strokeWidth="1.6" />
        <ellipse cx="46" cy="42" rx="12" ry="7" fill="#fff" opacity="0.55" transform="rotate(-28 46 42)" />
        <circle cx="82" cy="50" r="4" fill="#B9B1F2" opacity="0.7" /><circle cx="84" cy="73" r="5.5" fill="#B9B1F2" opacity="0.6" /><circle cx="73" cy="86" r="2.6" fill="#B9B1F2" opacity="0.6" />
        {/* nightcap with a swinging pompom */}
        <g>
          <path d="M 30 44 Q 30 18 58 20 Q 70 22 76 30 Q 62 30 52 34 Q 40 38 30 44 Z" fill={`url(#${id}-c)`} stroke="#7448D8" strokeWidth="1.2" />
          <path d="M 28 46 Q 44 34 70 32" stroke="#fff" strokeWidth="5" strokeLinecap="round" opacity="0.9" fill="none" />
          <motion.g style={{ transformOrigin: "60px 22px" }} animate={rig.active ? { rotate: party ? [-25, 25, -25] : [-8, 8, -8] } : { rotate: 0 }}
            transition={{ duration: party ? 0.5 : 2.8, repeat: Infinity, ease: "easeInOut" }}>
            <path d="M 60 22 Q 70 12 78 16" stroke="#7448D8" strokeWidth="2" fill="none" />
            <circle cx="79" cy="16" r="5" fill="#FFE27A" stroke="#F5B400" strokeWidth="1" />
          </motion.g>
        </g>
        {/* face */}
        <g>
          <ellipse cx="42" cy="69" rx="5" ry="3.2" fill="#FF8FB8" opacity="0.6" />
          <ellipse cx="72" cy="69" rx="5" ry="3.2" fill="#FF8FB8" opacity="0.6" />
          <Brows mood={mood} cx={57} y={50} />
          <Eyes mood={mood} blink={rig.blink} look={rig.look} cx={57} cy={60} />
          <Mouth mood={mood} open={rig.mouth} cx={57} cy={72} tone="#5B3A9E" />
        </g>
        <Hands mood={mood} talking={rig.talking} fill="#E4DFFF" stroke="#8F86E0" active={rig.active} />
        <g transform="translate(60 60) scale(1.18) translate(-50 -52)"><OutfitAccessory outfit={outfit} /></g>
      </motion.g>
    </motion.g>
  </svg>;
}

export function Mascot({ who, ...rest }: MascotProps & { who: Who }) {
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
