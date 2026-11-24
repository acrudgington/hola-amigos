// Tiny synthesised sound effects (Web Audio API) — no audio files to download.
let ctx: AudioContext | null = null;
let enabled = true;

export const setSoundEnabled = (on: boolean) => { enabled = on; };

function audio(): AudioContext | null {
  if (!enabled || typeof window === "undefined") return null;
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  if (!ctx) ctx = new AC();
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}

// One soft note: sine/triangle with a quick attack and gentle release.
function note(freq: number, start: number, dur: number, { type = "sine", gain = 0.12 }: { type?: OscillatorType; gain?: number } = {}) {
  const a = audio();
  if (!a) return;
  const t = a.currentTime + start;
  const osc = a.createOscillator();
  const g = a.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(g).connect(a.destination);
  osc.start(t);
  osc.stop(t + dur + 0.05);
}

const C5 = 523.25, E5 = 659.25, G5 = 783.99, C6 = 1046.5, A4 = 440, F4 = 349.23, D5 = 587.33, B5 = 987.77;

export const sfx = {
  tap: () => note(880, 0, 0.06, { type: "triangle", gain: 0.05 }),
  correct: () => { note(E5, 0, 0.14, { type: "triangle" }); note(B5, 0.08, 0.22, { type: "triangle" }); },
  wrong: () => { note(A4, 0, 0.16, { type: "sine", gain: 0.08 }); note(F4, 0.1, 0.24, { type: "sine", gain: 0.07 }); },
  combo: () => { [C5, E5, G5, C6].forEach((f, i) => note(f, i * 0.05, 0.14, { type: "triangle", gain: 0.07 })); },
  complete: () => { [C5, E5, G5, C6, G5, C6].forEach((f, i) => note(f, i * 0.09, 0.22, { type: "triangle", gain: 0.09 })); },
  star: () => { note(C6, 0, 0.12, { type: "sine", gain: 0.08 }); note(1318.5, 0.06, 0.2, { type: "sine", gain: 0.06 }); },
  levelUp: () => {
    [C5, E5, G5, C6].forEach((f, i) => note(f, i * 0.11, 0.3, { type: "triangle", gain: 0.1 }));
    [D5, G5, B5, 1174.7].forEach((f, i) => note(f, 0.5 + i * 0.08, 0.4, { type: "sine", gain: 0.07 }));
  },
  whoosh: () => note(300, 0, 0.12, { type: "sine", gain: 0.03 }),
};
