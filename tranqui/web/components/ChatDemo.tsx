"use client";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";

const SCRIPT: { from: "user" | "bot"; text: string }[] = [
  { from: "user", text: "Help! Outlook keeps asking for my password 😩" },
  { from: "bot", text: "No stress, Sarah. I can see your laptop. Your Microsoft sign-in token expired after the update last night." },
  { from: "bot", text: "I've refreshed it remotely. Close Outlook, reopen it and sign in once. That should be it." },
  { from: "user", text: "Fixed!! Thank you 🙌" },
  { from: "bot", text: "Lovely. Ticket closed in 2m 14s. ☀️" },
];

/** Illustrative demo conversation (clearly labelled as an example). */
export function ChatDemo() {
  const [n, setN] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setN((x) => (x >= SCRIPT.length + 2 ? 0 : x + 1)), n === 0 ? 1600 : 2200);
    return () => clearTimeout(t);
  }, [n]);
  return (
    <motion.div className="glass animate-float rounded-3xl p-4 shadow-2xl shadow-black/40">
      <div className="mb-3 flex items-center gap-3 border-b border-white/10 pb-3">
        <div className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-sun to-coral text-sm font-bold text-night">T</div>
        <div className="text-left">
          <p className="text-sm font-semibold">Tranqui Helpdesk</p>
          <p className="text-xs text-sea">online · replies in seconds</p>
        </div>
        <span className="ml-auto rounded-full bg-white/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-mist">example</span>
      </div>
      <div className="flex h-56 flex-col justify-end gap-2 overflow-hidden">
        <AnimatePresence initial={false}>
          {SCRIPT.slice(0, Math.min(n, SCRIPT.length)).map((m, i) => (
            <motion.div key={`${i}-${m.text}`} layout initial={{ opacity: 0, y: 14, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0 }}
              className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-left text-sm ${m.from === "user" ? "self-end rounded-br-md bg-sea/90 text-night" : "self-start rounded-bl-md bg-white/10"}`}>
              {m.text}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
