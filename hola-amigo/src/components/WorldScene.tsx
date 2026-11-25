// ============================================================
// Animated world scenes: one hand-built, layered scene per world.
//
//   sky (follows the real time of day) → sun or moon and stars → drifting
//   clouds → far hills/skyline → near ground → moving props (3D art)
//
// Drawn in a 400×160 box and cropped to fit (banner, hero card…). Motion is
// plain CSS on SVG groups (cheap), paused while the scene is off-screen, and
// turned off by the device's "reduce motion" setting.
// ============================================================
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { World } from "../content/index.ts";
import { artUrl } from "./Art.tsx";

const W = 400, H = 160, GROUND = 132;
// The scene is designed in 0..400 and widened (never zoomed) to fill wide
// spaces: full-width layers span [X0, X1], set per render from the container.
let X0 = 0, X1 = W;
const SPAN = () => X1 - X0;
const waves = (y: number, amp = 4) => `M ${X0 - 40} ${y} ${Array.from({ length: Math.ceil((SPAN() + 80) / 40) }).map(() => `q 10 -${amp} 20 0 t 20 0`).join(" ")}`;

// ---------- colour helpers ----------
const hex = (h: string) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const mix = (a: string, b: string, t: number) => {
  const [r1, g1, b1] = hex(a), [r2, g2, b2] = hex(b);
  const c = (x: number, y: number) => Math.round(x + (y - x) * t).toString(16).padStart(2, "0");
  return `#${c(r1, r2)}${c(g1, g2)}${c(b1, b2)}`;
};
const shade = (h: string, t: number) => mix(h, "#000000", t);
const tint = (h: string, t: number) => mix(h, "#ffffff", t);

// ---------- time of day ----------
export type Phase = "dawn" | "day" | "dusk" | "night";
export const phaseAt = (hour: number): Phase => (hour >= 6 && hour < 9 ? "dawn" : hour >= 9 && hour < 18 ? "day" : hour >= 18 && hour < 21 ? "dusk" : "night");
const SKY: Record<Phase, [string, string]> = {
  dawn: ["#ff9f8a", "#ffe2b8"],
  day: ["#5fb8ff", "#d6efff"],
  dusk: ["#5b3f9e", "#ff9a76"],
  night: ["#0a0f2e", "#2a2c66"],
};
// Some worlds keep their own mood whatever the time.
const FIXED: Partial<Record<World["scene"], Phase>> = { story: "dusk", stars: "night" };

// Small deterministic random, so scenes look the same on every render.
const seeded = (seed: number) => () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };

// ---------- building blocks ----------
const tiles = () => { const out: number[] = []; for (let k = Math.floor(X0 / W); k * W < X1; k++) out.push(k); return out; };
// A 3D illustration placed by its bottom-centre point.
function Prop({ e, x, y, s, cls, delay = 0, o = 1 }: { e: string; x: number; y: number; s: number; cls?: string; delay?: number; o?: number }) {
  const url = artUrl(e);
  return <g className={cls ? `ws-anim ${cls}` : undefined} style={{ animationDelay: `${delay}s` }} opacity={o}>
    {url ? <image href={url} x={x - s / 2} y={y - s} width={s} height={s} /> : <text x={x - s / 2} y={y} fontSize={s * 0.8}>{e}</text>}
  </g>;
}

function Sky({ phase, color, id }: { phase: Phase; color: string; id: string }) {
  const [top, bottom] = SKY[phase];
  return <>
    <defs>
      <linearGradient id={`${id}-sky`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={top} />
        <stop offset="100%" stopColor={mix(bottom, color, 0.28)} />
      </linearGradient>
    </defs>
    <rect x={X0} width={SPAN()} height={H} fill={`url(#${id}-sky)`} />
  </>;
}

function Celestial({ phase }: { phase: Phase }) {
  if (phase === "night" || phase === "dusk") {
    const r = seeded(7);
    return <g>
      {Array.from({ length: Math.round((phase === "night" ? 26 : 10) * SPAN() / W) }).map((_, i) =>
        <circle key={i} className="ws-anim ws-twinkle" style={{ animationDelay: `${r() * 3}s` }} cx={X0 + r() * SPAN()} cy={8 + r() * 80} r={0.6 + r() * 1.1} fill="#fff" opacity={0.85} />)}
      <g transform="translate(330 40)">
        <circle r="13" fill="#FFF6D6" />
        <circle r="13" cx="6" cy="-4" fill={phase === "night" ? "#0a0f2e" : "#5b3f9e"} opacity="0.9" />
      </g>
    </g>;
  }
  const y = phase === "dawn" ? 62 : 40;
  return <g transform={`translate(330 ${y})`}>
    <g className="ws-anim ws-spin">
      {Array.from({ length: 10 }).map((_, i) => <rect key={i} x="-1.6" y="-26" width="3.2" height="8" rx="1.6" fill="#FFE07A" opacity="0.8" transform={`rotate(${i * 36})`} />)}
    </g>
    <circle r="14" fill="#FFD84D" /><circle r="14" fill="#FFF3B0" opacity="0.35" cx="-3" cy="-3" />
  </g>;
}

function Clouds({ phase, count = 3, y = 34 }: { phase: Phase; count?: number; y?: number }) {
  const fill = phase === "night" ? "#3a3f7a" : phase === "dusk" ? "#ffd1c4" : "#ffffff";
  const r = seeded(3);
  return <g opacity={phase === "night" ? 0.5 : 0.85}>
    {Array.from({ length: Math.round(count * SPAN() / W) }).map((_, i) => {
      const cy = y + r() * 28, s = 0.7 + r() * 0.6, dur = 60 + r() * 50;
      return <g key={i} className="ws-anim ws-drift" style={{ animationDuration: `${dur}s`, animationDelay: `${-r() * dur}s` }}>
        <g transform={`translate(0 ${cy}) scale(${s})`}>
          <ellipse cx="0" cy="0" rx="22" ry="8" fill={fill} /><ellipse cx="-10" cy="-5" rx="11" ry="9" fill={fill} /><ellipse cx="8" cy="-7" rx="13" ry="11" fill={fill} />
        </g>
      </g>;
    })}
  </g>;
}

function Hills({ color, phase, far = true }: { color: string; phase: Phase; far?: boolean }) {
  const dark = phase === "night" ? 0.55 : phase === "dusk" ? 0.3 : 0;
  return <>
    {tiles().map(k => <g key={k} transform={`translate(${k * W} 0)`}>
      {far && <path d={`M0 ${GROUND - 26} Q 70 ${GROUND - 52} 140 ${GROUND - 26} T 280 ${GROUND - 30} T 400 ${GROUND - 26} V ${H} H0 Z`} fill={shade(tint(color, 0.35), dark)} opacity="0.7" />}
      <path d={`M0 ${GROUND - 6} Q 90 ${GROUND - 24} 200 ${GROUND - 6} T 400 ${GROUND - 6} V ${H} H0 Z`} fill={shade(color, 0.12 + dark)} />
    </g>)}
  </>;
}

function Ground({ color, phase }: { color: string; phase: Phase }) {
  const dark = phase === "night" ? 0.6 : phase === "dusk" ? 0.35 : 0.2;
  return <rect x={X0} y={GROUND} width={SPAN()} height={H - GROUND} fill={shade(color, dark)} />;
}

function Birds({ phase, y = 46 }: { phase: Phase; y?: number }) {
  const ink = phase === "night" ? "#c9c7ff" : "#3b3a55";
  return <g className="ws-anim ws-fly" style={{ animationDuration: "26s" }}>
    {[[0, 0], [14, 6], [26, -2]].map(([dx, dy], i) =>
      <path key={i} className="ws-anim ws-flap" style={{ animationDelay: `${i * 0.15}s` }} d={`M ${dx - 5} ${y + dy} Q ${dx - 2} ${y + dy - 4} ${dx} ${y + dy} Q ${dx + 2} ${y + dy - 4} ${dx + 5} ${y + dy}`}
        stroke={ink} strokeWidth="1.4" fill="none" strokeLinecap="round" />)}
  </g>;
}

function House({ x, w, h, color, roof, phase, door = true }: { x: number; w: number; h: number; color: string; roof: string; phase: Phase; door?: boolean }) {
  const lit = phase === "night" || phase === "dusk";
  return <g>
    <rect x={x} y={GROUND - h} width={w} height={h} fill={color} rx="1.5" />
    <polygon points={`${x - 3},${GROUND - h} ${x + w / 2},${GROUND - h - w * 0.45} ${x + w + 3},${GROUND - h}`} fill={roof} />
    <rect x={x + w * 0.18} y={GROUND - h + 6} width={w * 0.22} height={w * 0.2} fill={lit ? "#FFE58A" : "#cfe8ff"} />
    <rect x={x + w * 0.6} y={GROUND - h + 6} width={w * 0.22} height={w * 0.2} fill={lit ? "#FFE58A" : "#cfe8ff"} />
    {door && <rect x={x + w * 0.4} y={GROUND - h * 0.42} width={w * 0.2} height={h * 0.42} fill={shade(color, 0.35)} rx="1" />}
  </g>;
}

// ---------- the 12 scenes ----------
function sceneBody(world: World, phase: Phase): ReactNode {
  const c = world.color;
  const night = phase === "night";
  const r = seeded(world.id * 97);
  switch (world.scene) {
    case "island": return <>
      <Birds phase={phase} />
      <rect x={X0} y={GROUND - 18} width={SPAN()} height={H} fill={night ? "#1d3a6b" : "#3fb6e8"} />
      <g className="ws-anim ws-wave"><path d={waves(GROUND - 12)} stroke="#ffffff" strokeOpacity="0.6" strokeWidth="1.6" fill="none" /></g>
      <g className="ws-anim ws-wave ws-wave--slow"><path d={waves(GROUND - 2)} stroke="#ffffff" strokeOpacity="0.4" strokeWidth="1.4" fill="none" /></g>
      <ellipse cx="110" cy={GROUND + 4} rx="70" ry="16" fill={night ? "#a68c5c" : "#ffd796"} />
      <ellipse cx="320" cy={GROUND + 10} rx="50" ry="12" fill={night ? "#a68c5c" : "#ffe0a8"} />
      <Prop e="🌴" x={96} y={GROUND} s={46} cls="ws-sway" />
      <Prop e="🌴" x={136} y={GROUND + 2} s={34} cls="ws-sway" delay={-1.2} />
      <Prop e="🐚" x={160} y={GROUND + 10} s={14} />
      <Prop e="🌴" x={330} y={GROUND + 6} s={30} cls="ws-sway" delay={-0.6} />
    </>;
    case "town": return <>
      <Birds phase={phase} y={40} />
      {Hills({ color: c, phase })}
      <House x={60} w={34} h={26} color="#fff3e0" roof="#e46c4f" phase={phase} />
      <House x={110} w={28} h={34} color="#ffe9c7" roof="#4d8fd6" phase={phase} />
      <House x={250} w={36} h={24} color="#fde2e4" roof="#7b61c9" phase={phase} />
      {Ground({ color: c, phase })}
      <Prop e="🌳" x={30} y={GROUND + 2} s={34} cls="ws-sway" />
      <Prop e="🌳" x={210} y={GROUND + 2} s={30} cls="ws-sway" delay={-1} />
      <Prop e="🌷" x={160} y={GROUND + 10} s={14} cls="ws-sway" delay={-0.4} />
      <Prop e="🌷" x={176} y={GROUND + 12} s={12} cls="ws-sway" delay={-0.9} />
      <Prop e="🐦" x={300} y={GROUND + 4} s={18} cls="ws-hop" />
    </>;
    case "city": {
      const far = Array.from({ length: Math.ceil(SPAN() / 34) + 1 }).map((_, i) => ({ x: X0 + i * 34 - 4, h: 40 + r() * 40 }));
      const near = Array.from({ length: Math.ceil(SPAN() / 46) }).map((_, i) => ({ x: X0 + i * 46 + 4, h: 34 + r() * 46, w: 30 + r() * 10 }));
      const lit = phase !== "day";
      return <>
        {far.map((b, i) => <rect key={i} x={b.x} y={GROUND - b.h - 10} width="30" height={b.h + 10} fill={shade(tint(c, 0.4), night ? 0.6 : 0.15)} opacity="0.6" />)}
        {near.map((b, i) => <g key={i}>
          <rect x={b.x} y={GROUND - b.h} width={b.w} height={b.h} fill={shade(c, night ? 0.55 : 0.2)} rx="1.5" />
          {Array.from({ length: Math.floor(b.h / 10) }).map((_, row) => [0, 1, 2].map(col =>
            <rect key={`${row}-${col}`} className={lit && r() > 0.55 ? "ws-anim ws-twinkle" : undefined} style={{ animationDelay: `${r() * 4}s`, animationDuration: `${3 + r() * 4}s` }}
              x={b.x + 4 + col * (b.w - 8) / 3} y={GROUND - b.h + 5 + row * 10} width={(b.w - 8) / 3 - 3} height="5" fill={lit ? (r() > 0.35 ? "#FFE58A" : "#2a3159") : "#cfe8ff"} opacity={lit ? 1 : 0.7} />))}
        </g>)}
        <rect x={X0} y={GROUND} width={SPAN()} height={H - GROUND} fill="#2b3046" />
        <path d={`M ${X0} ${GROUND + 13} H ${X1}`} stroke="#ffffff" strokeOpacity="0.5" strokeWidth="1.4" strokeDasharray="10 10" />
        <g className="ws-anim ws-drive"><Prop e="🚕" x={0} y={GROUND + 16} s={26} /></g>
        <Prop e="🚦" x={360} y={GROUND + 2} s={30} />
      </>;
    }
    case "story": return <>
      {Hills({ color: c, phase })}
      {Ground({ color: c, phase })}
      {Array.from({ length: 7 }).map((_, i) => <Prop key={i} e="✨" x={X0 + 30 + r() * (SPAN() - 60)} y={30 + r() * 70} s={10 + r() * 8} cls="ws-twinkle" delay={-r() * 3} />)}
      <Prop e="📖" x={200} y={GROUND - 14} s={54} cls="ws-bob" />
      <Prop e="🕯️" x={140} y={GROUND + 6} s={22} cls="ws-flicker" />
      <Prop e="🕯️" x={262} y={GROUND + 6} s={20} cls="ws-flicker" delay={-0.5} />
      <Prop e="🦉" x={56} y={GROUND - 4} s={30} cls="ws-tilt" />
    </>;
    case "plaza": return <>
      <Birds phase={phase} y={36} />
      <House x={20} w={54} h={44} color="#ffe2cf" roof="#d9603f" phase={phase} door={false} />
      <House x={320} w={60} h={40} color="#fff0d9" roof="#c94f6d" phase={phase} door={false} />
      <path d={`M ${X0} 40 Q 100 62 200 44 T ${X1} 40`} stroke="#5a4a3a" strokeWidth="0.8" fill="none" />
      {Array.from({ length: Math.ceil(SPAN() / 33) }).map((_, i) => {
        const x = X0 + 12 + i * 33, y = 42 + Math.sin(((x - X0) / SPAN()) * Math.PI) * 12;
        return <polygon key={i} className="ws-anim ws-flutter" style={{ animationDelay: `${-i * 0.2}s` }} points={`${x - 5},${y} ${x + 5},${y} ${x},${y + 10}`} fill={["#FF6B6B", "#FFD93D", "#4D96FF", "#6BCB77"][i % 4]} />;
      })}
      <rect x={X0} y={GROUND} width={SPAN()} height={H - GROUND} fill={night ? "#6a5a6a" : "#f2d2b8"} />
      {Array.from({ length: Math.ceil(SPAN() / 30) + 1 }).map((_, i) => <line key={i} x1={X0 + i * 30} y1={GROUND} x2={X0 + i * 30 - 12} y2={H} stroke="#000" strokeOpacity="0.06" />)}
      {/* fountain */}
      <ellipse cx="200" cy={GROUND + 6} rx="46" ry="9" fill="#9fb5c9" /><ellipse cx="200" cy={GROUND + 4} rx="40" ry="6" fill="#7fd3ff" />
      <rect x="196" y={GROUND - 26} width="8" height="30" fill="#c5d3df" rx="2" />
      {[-1, 1].map(side => <path key={side} className="ws-anim ws-shimmer" d={`M 200 ${GROUND - 26} Q ${200 + side * 22} ${GROUND - 46} ${200 + side * 30} ${GROUND + 2}`} stroke="#bfe9ff" strokeWidth="2.2" fill="none" strokeDasharray="3 4" />)}
      {Array.from({ length: 5 }).map((_, i) => <circle key={i} className="ws-anim ws-drip" style={{ animationDelay: `${i * 0.25}s` }} cx={186 + i * 7} cy={GROUND - 4} r="1.4" fill="#e6f7ff" />)}
      <Prop e="🌺" x={120} y={GROUND + 8} s={22} cls="ws-sway" />
      <Prop e="🌺" x={290} y={GROUND + 8} s={20} cls="ws-sway" delay={-0.8} />
      <g className="ws-anim ws-fly" style={{ animationDuration: "18s" }}><Prop e="🕊️" x={0} y={70} s={22} /></g>
    </>;
    case "bridge": return <>
      {Hills({ color: c, phase, far: true })}
      <rect x={X0} y={GROUND - 8} width={SPAN()} height={H} fill={night ? "#1d3a6b" : "#58b9f0"} />
      {[0, 1, 2].map(i => <g key={i} className="ws-anim ws-wave" style={{ animationDuration: `${6 + i * 2}s` }}>
        <path d={waves(GROUND + i * 7, 3)} stroke="#fff" strokeOpacity={0.5 - i * 0.1} strokeWidth="1.2" fill="none" /></g>)}
      <path d={`M 40 ${GROUND - 8} Q 200 ${GROUND - 70} 360 ${GROUND - 8}`} stroke={shade(c, 0.25)} strokeWidth="7" fill="none" />
      <path d={`M 30 ${GROUND - 40} H 370`} stroke={shade(c, 0.35)} strokeWidth="5" />
      {Array.from({ length: 11 }).map((_, i) => { const x = 60 + i * 28, top = GROUND - 8 - (64 - Math.pow((x - 200) / 160, 2) * 64) * 0.9;
        return <line key={i} x1={x} y1={Math.min(top, GROUND - 40)} x2={x} y2={GROUND - 40} stroke={shade(c, 0.3)} strokeWidth="1.5" />; })}
      {[0, 1, 2].map(i => <g key={i} className="ws-anim ws-rise" style={{ animationDelay: `${-i * 3.3}s` }}><Prop e="🎈" x={90 + i * 110} y={H + 30} s={24} /></g>)}
    </>;
    case "castle": return <>
      <g className="ws-anim ws-fly" style={{ animationDuration: "34s" }}><Prop e="🐉" x={0} y={64} s={34} cls="ws-bob" /></g>
      {Hills({ color: c, phase })}
      <g fill={shade("#b9a7c9", night ? 0.5 : 0.1)}>
        <rect x="150" y={GROUND - 52} width="100" height="52" />
        <rect x="140" y={GROUND - 74} width="24" height="74" /><rect x="236" y={GROUND - 74} width="24" height="74" />
        {[150, 168, 186, 204, 222, 240].map(x => <rect key={x} x={x} y={GROUND - 60} width="10" height="9" />)}
        <polygon points={`136,${GROUND - 74} 152,${GROUND - 96} 168,${GROUND - 74}`} fill={shade(c, 0.2)} />
        <polygon points={`232,${GROUND - 74} 248,${GROUND - 96} 264,${GROUND - 74}`} fill={shade(c, 0.2)} />
      </g>
      <path d={`M 186 ${GROUND} V ${GROUND - 22} Q 200 ${GROUND - 34} 214 ${GROUND - 22} V ${GROUND} Z`} fill="#4a3550" />
      {[152, 248].map((x, i) => <g key={x}><line x1={x} y1={GROUND - 96} x2={x} y2={GROUND - 112} stroke="#5a4a3a" strokeWidth="1.2" />
        <path className="ws-anim ws-flag" style={{ animationDelay: `${-i * 0.4}s` }} d={`M ${x} ${GROUND - 112} q 8 -2 14 2 q -6 2 -14 6 Z`} fill={c} /></g>)}
      {Ground({ color: c, phase })}
      <Prop e="🛡️" x={90} y={GROUND + 8} s={24} />
      <Prop e="👑" x={310} y={GROUND + 6} s={22} cls="ws-bob" />
    </>;
    case "home": return <>
      {Hills({ color: c, phase })}
      <House x={150} w={92} h={58} color="#fff3e2" roof="#d9603f" phase={phase} />
      <rect x="220" y={GROUND - 92} width="10" height="18" fill="#a2593f" />
      {[0, 1, 2].map(i => <circle key={i} className="ws-anim ws-smoke" style={{ animationDelay: `${i * 1.2}s` }} cx="225" cy={GROUND - 96} r="5" fill="#ffffff" opacity="0.7" />)}
      {Ground({ color: c, phase })}
      {Array.from({ length: 12 }).map((_, i) => <rect key={i} x={20 + i * 11} y={GROUND - 12} width="6" height="14" rx="2" fill="#fff8ec" opacity="0.9" />)}
      <path d={`M 18 ${GROUND - 6} H 150`} stroke="#fff8ec" strokeWidth="2" />
      <Prop e="🌻" x={290} y={GROUND + 4} s={30} cls="ws-sway" />
      <Prop e="🌻" x={318} y={GROUND + 6} s={24} cls="ws-sway" delay={-0.7} />
      <Prop e="🌻" x={344} y={GROUND + 4} s={28} cls="ws-sway" delay={-1.3} />
    </>;
    case "play": return <>
      <g className="ws-anim ws-kite"><line x1="300" y1="40" x2="250" y2={GROUND} stroke="#ffffff" strokeOpacity="0.8" strokeWidth="0.8" /><Prop e="🪁" x={300} y={52} s={30} /></g>
      {Hills({ color: c, phase })}
      {Ground({ color: c, phase })}
      {/* swing set */}
      <path d={`M 70 ${GROUND} L 90 ${GROUND - 54} L 150 ${GROUND - 54} L 170 ${GROUND}`} stroke="#e46c4f" strokeWidth="3" fill="none" />
      <g className="ws-anim ws-swing" style={{ transformOrigin: `120px ${GROUND - 54}px` }}>
        <line x1="112" y1={GROUND - 54} x2="112" y2={GROUND - 16} stroke="#5a4a3a" /><line x1="128" y1={GROUND - 54} x2="128" y2={GROUND - 16} stroke="#5a4a3a" />
        <rect x="108" y={GROUND - 17} width="24" height="4" rx="2" fill="#4d8fd6" />
      </g>
      <g className="ws-anim ws-bounce"><Prop e="⚽" x={220} y={GROUND + 4} s={22} /></g>
      <Prop e="🎨" x={340} y={GROUND + 6} s={24} />
    </>;
    case "nature": return <>
      <g className="ws-anim ws-rocket"><Prop e="🚀" x={0} y={40} s={24} /></g>
      {Hills({ color: c, phase })}
      {Array.from({ length: Math.ceil(SPAN() / 48) + 1 }).map((_, i) => { const x = X0 + i * 48 + 10, h = 40 + r() * 30;
        return <polygon key={i} points={`${x - 16},${GROUND} ${x},${GROUND - h} ${x + 16},${GROUND}`} fill={shade(c, 0.35 + (night ? 0.3 : 0))} opacity="0.75" />; })}
      {Ground({ color: c, phase })}
      <Prop e="🌲" x={50} y={GROUND + 4} s={42} cls="ws-sway" />
      <Prop e="🌳" x={340} y={GROUND + 4} s={40} cls="ws-sway" delay={-1.1} />
      <Prop e="🍄" x={110} y={GROUND + 8} s={16} />
      {[0, 1].map(i => <g key={i} className="ws-anim ws-flutterby" style={{ animationDelay: `${-i * 4}s` }}><Prop e="🦋" x={160 + i * 60} y={90} s={18} /></g>)}
    </>;
    case "self": return <>
      {Hills({ color: c, phase })}
      <g>
        <rect x="236" y={GROUND - 56} width="110" height="56" fill="#ffe9d6" />
        <polygon points={`230,${GROUND - 56} 291,${GROUND - 80} 352,${GROUND - 56}`} fill="#c94f6d" />
        <rect x="282" y={GROUND - 92} width="18" height="14" fill="#fff" /><circle cx="291" cy={GROUND - 85} r="4" fill="none" stroke="#5a4a3a" strokeWidth="1" />
        {[248, 270, 314, 332].map(x => <rect key={x} x={x} y={GROUND - 44} width="10" height="10" fill={phase === "day" ? "#cfe8ff" : "#FFE58A"} />)}
        <rect x="284" y={GROUND - 26} width="14" height="26" fill="#a2593f" />
      </g>
      {Ground({ color: c, phase })}
      <path d={`M 0 ${H} Q 140 ${GROUND + 6} 291 ${GROUND}`} stroke={tint(c, 0.6)} strokeWidth="10" fill="none" opacity="0.6" />
      <Prop e="🎒" x={140} y={GROUND + 8} s={30} cls="ws-bob" />
      {[0, 1, 2].map(i => <g key={i} className="ws-anim ws-rise ws-rise--short" style={{ animationDelay: `${-i * 2}s` }}><Prop e="💜" x={60 + i * 40} y={GROUND} s={16} /></g>)}
    </>;
    case "stars": return <>
      <g opacity="0.9" transform={`translate(200 ${GROUND + 30})`}>
        {["#FF6B6B", "#FFB84D", "#FFE066", "#6BCB77", "#4D96FF", "#9B72FF"].map((col, i) =>
          <path key={col} d={`M ${-150 + i * 7} 0 A ${150 - i * 7} ${120 - i * 7} 0 0 1 ${150 - i * 7} 0`} stroke={col} strokeWidth="6.5" fill="none" opacity="0.75" />)}
      </g>
      {Ground({ color: c, phase })}
      <Prop e="🏆" x={200} y={GROUND + 4} s={44} cls="ws-bob" />
      {Array.from({ length: 16 }).map((_, i) => <rect key={i} className="ws-anim ws-confetti" style={{ animationDelay: `${-r() * 6}s`, animationDuration: `${4 + r() * 4}s` }}
        x={X0 + r() * SPAN()} y={-10} width="3" height="6" rx="1" fill={["#FF6B6B", "#FFD93D", "#4D96FF", "#6BCB77", "#FF9EC7"][i % 5]} />)}
    </>;
  }
}

export function WorldScene({ world, height = 150, phase: forced }: { world: World; height?: number; phase?: Phase }) {
  const ref = useRef<SVGSVGElement>(null);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => setPaused(!e.isIntersecting));
    io.observe(el);
    return () => io.disconnect();
  }, []);
  // Widen the scene to the container's shape instead of zooming in on it.
  const [vw, setVw] = useState(W);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(([e]) => {
      const { width, height: h } = e.contentRect;
      if (width && h) setVw(Math.max(W, Math.round(((H * width) / h) / 20) * 20));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const phase = FIXED[world.scene] ?? forced ?? phaseAt(new Date().getHours());
  const id = `ws${world.id}-${phase}`;
  const pad = (vw - W) / 2;
  const scene = useMemo(() => {
    X0 = -pad; X1 = W + pad;
    return <>
      {Sky({ phase, color: world.color, id })}
      {Celestial({ phase })}
      {Clouds({ phase })}
      {sceneBody(world, phase)}
    </>;
  }, [world, phase, pad, id]);
  return <svg ref={ref} className={`world-scene ${paused ? "is-paused" : ""}`} width="100%" height={height} viewBox={`${-pad} 0 ${vw} ${H}`}
    preserveAspectRatio="xMidYMax slice" aria-hidden="true" data-phase={phase}
    style={{ "--x0": `${-pad - 60}px`, "--x1": `${W + pad + 60}px` } as React.CSSProperties}>
    {scene}
  </svg>;
}
