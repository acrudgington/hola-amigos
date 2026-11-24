import type React from "react";
// Crisp, rounded line icons (24×24, stroke = currentColor) for the app chrome.
// Content stays playful with emoji; the interface uses these.
const P: Record<string, JSX.Element> = {
  map: <><path d="M9 4 3.5 6v14L9 18l6 2 5.5-2V4L15 6 9 4Z" /><path d="M9 4v14M15 6v14" /></>,
  review: <><path d="M20 11a8 8 0 0 0-14.6-4.5L4 8" /><path d="M4 4v4h4" /><path d="M4 13a8 8 0 0 0 14.6 4.5L20 16" /><path d="M20 20v-4h-4" /></>,
  trophy: <><path d="M8 4h8v5a4 4 0 0 1-8 0V4Z" /><path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4" /><path d="M12 13v4M8.5 20h7M10 17h4" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4.5 20a7.5 7.5 0 0 1 15 0" /></>,
  users: <><circle cx="9" cy="8" r="3.5" /><path d="M2.5 19.5a6.5 6.5 0 0 1 13 0" /><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 13.5a6.5 6.5 0 0 1 3.5 6" /></>,
  flame: <path d="M12 21c-4 0-6.5-2.6-6.5-6 0-3.6 3-5.6 3.8-9 2.4 1.4 3.4 3.6 3.2 5.6 1-.6 1.7-1.7 1.9-3 2.2 1.8 4.1 4 4.1 6.6 0 3.4-2.5 5.8-6.5 5.8Z" />,
  bolt: <path d="M13 2.5 4.5 13.5H12l-1 8 8.5-11H12l1-8Z" />,
  star: <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9L12 3Z" />,
  play: <path d="M8 5.5v13a1 1 0 0 0 1.5.9l10-6.5a1 1 0 0 0 0-1.8l-10-6.5A1 1 0 0 0 8 5.5Z" />,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  lock: <><rect x="5" y="10.5" width="14" height="10" rx="2.5" /><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" /></>,
  volume: <><path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5H4Z" /><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" /></>,
  mute: <><path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5H4Z" /><path d="m16 9.5 5 5M21 9.5l-5 5" /></>,
  moon: <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" /></>,
  search: <><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4.5 4.5" /></>,
  sparkles: <><path d="M10 3.5 11.6 8 16 9.5l-4.4 1.6L10 15.5l-1.6-4.4L4 9.5 8.4 8 10 3.5Z" /><path d="M18 14l.8 2.2 2.2.8-2.2.8L18 20l-.8-2.2L15 17l2.2-.8L18 14Z" /></>,
  clock: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></>,
  book: <><path d="M4 5.5A2 2 0 0 1 6 3.5h13v14H6a2 2 0 0 0-2 2v-14Z" /><path d="M4 19.5a2 2 0 0 0 2 2h13v-4" /></>,
  target: <><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="4.5" /><circle cx="12" cy="12" r="1" /></>,
  gift: <><rect x="3.5" y="8" width="17" height="4.5" rx="1" /><path d="M5 12.5v8h14v-8M12 8v12.5" /><path d="M12 8C9.5 8 7 7 7 5.2 7 3.5 9 3 10 4.5L12 8l2-3.5C15 3 17 3.5 17 5.2 17 7 14.5 8 12 8Z" /></>,
  chevronRight: <path d="m9 5 7 7-7 7" />,
  chevronLeft: <path d="m15 5-7 7 7 7" />,
  arrowLeft: <path d="M19 12H5m6-6-6 6 6 6" />,
  x: <path d="M6 6l12 12M18 6 6 18" />,
  brain: <><path d="M9 4.5a3 3 0 0 0-3 3 3 3 0 0 0-2 5 3 3 0 0 0 2 5 3 3 0 0 0 6 .5V6.5a2.5 2.5 0 0 0-3-2Z" /><path d="M15 4.5a3 3 0 0 1 3 3 3 3 0 0 1 2 5 3 3 0 0 1-2 5 3 3 0 0 1-6 .5" /></>,
  chart: <><path d="M4 20V4M4 20h16" /><path d="M8 16v-4M12 16V8M16 16v-6" /></>,
  mic: <><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21" /></>,
  chat: <path d="M5 5h14a1.5 1.5 0 0 1 1.5 1.5v9A1.5 1.5 0 0 1 19 17h-7l-4.5 3.5V17H5a1.5 1.5 0 0 1-1.5-1.5v-9A1.5 1.5 0 0 1 5 5Z" />,
  logout: <><path d="M14 4h4.5A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5H14" /><path d="M10 8l-4 4 4 4M6 12h10" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  command: <path d="M9 6.5A2.5 2.5 0 1 0 6.5 9H9V6.5Zm0 0v11m0-11h6m-6 11A2.5 2.5 0 1 1 6.5 15H9v2.5Zm0 0h6m0-11A2.5 2.5 0 1 1 17.5 9H15V6.5Zm0 0v11m0 0a2.5 2.5 0 1 0 2.5-2.5H15v2.5ZM9 9h6v6H9" />,
  word: <><path d="M4 6h16M4 12h10M4 18h7" /></>,
};

export type IconName = keyof typeof P;
export interface IconProps { name: string; size?: number; stroke?: number; fill?: boolean; className?: string; style?: React.CSSProperties; title?: string }

export function Icon({ name, size = 20, stroke = 2, fill = false, className = "", style, title }: IconProps) {
  const d = P[name];
  if (!d) return null;
  const solid = fill && ["flame", "bolt", "star", "play"].includes(name);
  return <svg className={`icon ${className}`} width={size} height={size} viewBox="0 0 24 24" fill={solid ? "currentColor" : "none"}
    stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" aria-hidden={title ? undefined : "true"} role={title ? "img" : undefined} style={style}>
    {title && <title>{title}</title>}{d}
  </svg>;
}
