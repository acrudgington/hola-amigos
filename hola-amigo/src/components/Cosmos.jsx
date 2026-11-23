import { memo } from "react";

// Fixed animated backdrop: drifting aurora blobs, a twinkling starfield and
// shooting stars in Galaxy mode; the same blobs plus clouds in Daylight mode.
// Positions are deterministic so it never "jumps" on re-render.
const STARS = Array.from({ length: 70 }, (_, i) => ({
  left: (i * 37.7) % 100,
  top: (i * 61.3) % 100,
  size: 1 + (i % 3),
  o: 0.35 + ((i * 7) % 10) / 15,
  d: 2 + (i % 5) * 0.7,
  delay: (i * 0.37) % 4,
}));

export const Cosmos = memo(function Cosmos() {
  return <div className="cosmos" aria-hidden="true">
    <div className="aurora aurora--1" />
    <div className="aurora aurora--2" />
    <div className="aurora aurora--3" />
    <div className="grid-glow" />
    {STARS.map((s, i) => <span key={i} className="star" style={{ left: `${s.left}%`, top: `${s.top}%`, width: s.size, height: s.size, "--o": s.o, "--d": `${s.d}s`, animationDelay: `${s.delay}s` }} />)}
    <span className="shooting-star" style={{ top: "12%", left: "85%" }} />
    <span className="shooting-star" style={{ top: "38%", left: "105%", animationDelay: "4.5s" }} />
    {[{ top: "8%", d: 80, delay: -10, s: 1 }, { top: "22%", d: 110, delay: -60, s: 0.7 }, { top: "55%", d: 95, delay: -35, s: 0.85 }].map((c, i) =>
      <div key={i} className="cloud" style={{ top: c.top, animationDuration: `${c.d}s`, animationDelay: `${c.delay}s`, scale: c.s }} />)}
  </div>;
});
