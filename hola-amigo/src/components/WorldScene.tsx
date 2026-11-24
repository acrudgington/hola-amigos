import { darken } from "../lib/utils.ts";
import type { World } from "../content/index.ts";

// A themed horizon behind each world banner. Pure SVG: crisp and light.
export function WorldScene({ world, height = 60 }: { world: World; height?: number }) {
  const c = world.color;
  const dk = darken(c);
  const scene = world.scene;
  const shapes: Record<World["scene"], JSX.Element> = {
    island: <>
      <path d={`M0 ${height} Q 60 ${height-14} 120 ${height} T 240 ${height} T 360 ${height} T 480 ${height} V ${height} H0 Z`} fill={c} opacity="0.25" />
      <ellipse cx="70" cy={height} rx="34" ry="14" fill={c} opacity="0.5" />
      <ellipse cx="300" cy={height} rx="40" ry="12" fill={c} opacity="0.4" />
      <text x="66" y={height-8} fontSize="20">🌴</text>
      <text x="290" y={height-6} fontSize="16">🌴</text>
    </>,
    town: <>
      {[20, 70, 120, 175, 230, 290, 340].map((x, i) => <rect key={i} x={x} y={height - (18 + (i % 3) * 10)} width="34" height={18 + (i % 3) * 10} rx="4" fill={c} opacity={0.3 + (i % 3) * 0.12} />)}
      {[30, 130, 240, 350].map((x, i) => <polygon key={i} points={`${x-2},${height-(18+(i%3)*10)} ${x+18},${height-(28+(i%3)*10)} ${x+38},${height-(18+(i%3)*10)}`} fill={dk} opacity="0.35" />)}
    </>,
    city: <>
      {[10, 50, 92, 140, 190, 240, 295, 350].map((x, i) => { const h = 22 + ((i * 13) % 30); return <rect key={i} x={x} y={height - h} width="32" height={h} rx="2" fill={c} opacity={0.25 + (i % 4) * 0.1} />; })}
      {[10, 92, 190, 295].map((x, i) => { const h = 22 + ((i * 2 * 13) % 30); return Array.from({ length: 3 }).map((_, j) => <rect key={`${i}-${j}`} x={x + 6 + j * 9} y={height - h + 6} width="4" height="5" fill="#FFF3C4" opacity="0.8" />); })}
    </>,
    story: <>
      <path d={`M0 ${height} Q 120 ${height-24} 240 ${height} T 480 ${height} V ${height} H0 Z`} fill={c} opacity="0.22" />
      {[40, 110, 180, 260, 330].map((x, i) => <text key={i} x={x} y={height - 12 - (i % 2) * 8} fontSize="13" opacity="0.5">✨</text>)}
      <text x="200" y={height-18} fontSize="20">🌙</text>
    </>,
    plaza: <>
      <path d={`M0 ${height} Q 120 ${height-16} 240 ${height} T 480 ${height} V ${height} H0 Z`} fill={c} opacity="0.22" />
      <text x="180" y={height-6} fontSize="26">⛲</text>
      {[60, 300].map((x, i) => <text key={i} x={x} y={height-8} fontSize="16" opacity="0.7">🌺</text>)}
    </>,
    bridge: <>
      <path d={`M10 ${height} Q 190 ${height-40} 370 ${height}`} stroke={c} strokeWidth="6" fill="none" opacity="0.4" />
      <path d={`M10 ${height} Q 190 ${height-40} 370 ${height}`} stroke={dk} strokeWidth="2" fill="none" opacity="0.4" strokeDasharray="2 8" />
      {[70, 150, 230, 310].map((x, i) => <line key={i} x1={x} y1={height} x2={x} y2={height - (34 - Math.abs(190 - x) / 6)} stroke={c} strokeWidth="3" opacity="0.3" />)}
    </>,
    castle: <>
      <rect x="150" y={height - 40} width="120" height="40" fill={c} opacity="0.3" />
      {[150, 185, 220, 255].map((x, i) => <rect key={i} x={x} y={height - 48} width="16" height="12" fill={c} opacity="0.4" />)}
      <polygon points={`180,${height-40} 195,${height-58} 210,${height-40}`} fill={dk} opacity="0.4" />
      <polygon points={`225,${height-40} 240,${height-58} 255,${height-40}`} fill={dk} opacity="0.4" />
      <text x="196" y={height-44} fontSize="10">🚩</text>
    </>,
    home: <>
      <path d={`M0 ${height} Q 60 ${height-12} 120 ${height} T 240 ${height} T 360 ${height} V ${height} H0 Z`} fill={c} opacity="0.22" />
      <rect x="150" y={height - 30} width="60" height="30" rx="3" fill={c} opacity="0.4" />
      <polygon points={`145,${height-30} 180,${height-50} 215,${height-30}`} fill={dk} opacity="0.4" />
      <rect x="172" y={height - 20} width="16" height="20" fill={dk} opacity="0.5" />
      {[70, 300].map((x, i) => <text key={i} x={x} y={height-6} fontSize="16" opacity="0.7">🌻</text>)}
    </>,
    play: <>
      <path d={`M0 ${height} Q 120 ${height-14} 240 ${height} T 480 ${height} V ${height} H0 Z`} fill={c} opacity="0.22" />
      {["⚽", "🎨", "🪁", "🎮", "🧩"].map((e, i) => <text key={i} x={40 + i * 70} y={height - 8 - (i % 2) * 10} fontSize="16" opacity="0.75">{e}</text>)}
    </>,
    nature: <>
      <path d={`M0 ${height} Q 90 ${height-20} 180 ${height} T 360 ${height} T 480 ${height} V ${height} H0 Z`} fill={c} opacity="0.25" />
      {[40, 90, 150, 210, 280, 340].map((x, i) => <text key={i} x={x} y={height-6} fontSize={14 + (i % 3) * 3} opacity="0.7">{["🌲","🌳","🌲","🍄","🌳","🌲"][i]}</text>)}
    </>,
    self: <>
      <path d={`M0 ${height} Q 120 ${height-16} 240 ${height} T 480 ${height} V ${height} H0 Z`} fill={c} opacity="0.22" />
      {["🎒", "👤", "💜", "📚", "🎈"].map((e, i) => <text key={i} x={45 + i * 70} y={height - 8 - (i % 2) * 8} fontSize="15" opacity="0.75">{e}</text>)}
    </>,
    stars: <>
      {Array.from({ length: 14 }).map((_, i) => <text key={i} x={(i * 53) % 460 + 10} y={12 + ((i * 29) % (height - 20))} fontSize={10 + (i % 3) * 4} opacity="0.6">{["⭐","🌟","✨"][i % 3]}</text>)}
      <text x="200" y={height-10} fontSize="24">🌈</text>
    </>,
  };
  return <svg width="100%" height={height} viewBox={`0 0 400 ${height}`} preserveAspectRatio="xMidYMax slice" style={{ display: "block" }}>
    <defs>
      <linearGradient id={`sky-${world.id}`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor={c} stopOpacity="0" />
        <stop offset="100%" stopColor={c} stopOpacity="0.22" />
      </linearGradient>
    </defs>
    <rect width="400" height={height} fill={`url(#sky-${world.id})`} />
    {shapes[scene] || null}
  </svg>;
}
