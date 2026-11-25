import type React from "react";
import { voice } from "../audio/player.ts";
// "Ask Sol" — a ⌘K command palette that searches every lesson and every word in the course.
// Words can be heard instantly; unlocked lessons open directly.
import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { LESSONS, type Lesson, type Word } from "../content/index.ts";
import { Icon } from "./Icon.tsx";

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[¿?¡!.,…]/g, "").trim();

// Every word with the lesson it first appears in.
type IndexedWord = Word & { lessonId: number; key: string };
type Result = { kind: "word"; id: string; w: IndexedWord } | { kind: "lesson"; id: string; l: Lesson; locked: boolean };

const WORD_INDEX = (() => {
  const seen = new Set<string>(), out: IndexedWord[] = [];
  for (const l of LESSONS) for (const w of l.words) {
    if (seen.has(w.es)) continue;
    seen.add(w.es);
    out.push({ ...w, lessonId: l.id, key: norm(`${w.es} ${w.en}`) });
  }
  return out;
})();

const SUGGESTIONS = ["hola", "dog", "colours", "family", "thank you", "numbers"];

export function CommandPalette({ onClose, onOpenLesson, unlockedUpTo }: { onClose: () => void; onOpenLesson: (l: Lesson) => void; unlockedUpTo: number }) {
  const [q, setQ] = useState("");
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => { input.current?.focus(); }, []);

  const results = useMemo((): Result[] => {
    const n = norm(q);
    if (!n) return [];
    const lessons = LESSONS.filter(l => norm(`${l.title} ${l.subtitle}`).includes(n)).slice(0, 5)
      .map((l): Result => ({ kind: "lesson", id: `l${l.id}`, l, locked: l.id > unlockedUpTo }));
    const words = WORD_INDEX.filter(w => w.key.includes(n))
      .sort((a, b) => (norm(a.es).startsWith(n) || norm(a.en).startsWith(n) ? -1 : 0) - (norm(b.es).startsWith(n) || norm(b.en).startsWith(n) ? -1 : 0))
      .slice(0, 8).map((w): Result => ({ kind: "word", id: `w${w.es}`, w }));
    return [...words, ...lessons];
  }, [q, unlockedUpTo]);

  useEffect(() => setActive(0), [q]);
  useEffect(() => { listRef.current?.querySelector(".is-active")?.scrollIntoView({ block: "nearest" }); }, [active]);

  const run = (r: Result | undefined) => {
    if (!r) return;
    if (r.kind === "word") voice.spanish(r.w.es);
    else if (!r.locked) { onOpenLesson(r.l); onClose(); }
  };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") onClose();
    else if (e.key === "ArrowDown") { e.preventDefault(); setActive(a => Math.min(results.length - 1, a + 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActive(a => Math.max(0, a - 1)); }
    else if (e.key === "Enter") run(results[active]);
  };

  const words = results.filter(r => r.kind === "word");
  const lessons = results.filter(r => r.kind === "lesson");
  const item = (r: Result, i: number) => <button key={r.id} type="button" className={`palette__item ${i === active ? "is-active" : ""}`} onMouseEnter={() => setActive(i)} onClick={() => run(r)}>
    {r.kind === "word" ? <>
      <span className="palette__emoji">{r.w.emoji}</span>
      <span className="grow">
        <span style={{ display: "block", fontWeight: 900 }}>{r.w.es} <span className="muted">· {r.w.en}</span></span>
        <span className="tiny muted">say “{r.w.say}” · lesson {r.w.lessonId}</span>
      </span>
      <Icon name="volume" size={18} style={{ color: "var(--luna)" }} />
    </> : <>
      <span className="palette__emoji">{r.l.emoji}</span>
      <span className="grow">
        <span style={{ display: "block", fontWeight: 900 }}>Lesson {r.l.id}: {r.l.title}</span>
        <span className="tiny muted">{r.l.subtitle}</span>
      </span>
      <Icon name={r.locked ? "lock" : "chevronRight"} size={18} style={{ color: "var(--muted)" }} />
    </>}
  </button>;

  return <div className="palette-backdrop" onClick={onClose}>
    <motion.div className="palette" role="dialog" aria-modal="true" aria-label="Ask Sol" onClick={e => e.stopPropagation()}
      initial={{ opacity: 0, y: -12, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.18 }}>
      <div className="palette__input">
        <Icon name="search" size={20} />
        <input ref={input} value={q} onChange={e => setQ(e.target.value)} onKeyDown={onKey} placeholder="Ask Sol: how do you say… ?"
          aria-label="Search words and lessons" role="combobox" aria-expanded={results.length > 0} aria-controls="palette-list" />
        <span className="kbd">esc</span>
      </div>
      <div className="palette__list" id="palette-list" ref={listRef} role="listbox">
        {!q && <>
          <div className="palette__group">Try asking</div>
          <div className="row row--wrap" style={{ gap: 8, padding: "2px 10px 10px" }}>
            {SUGGESTIONS.map(s => <button key={s} type="button" className="toggle" onClick={() => setQ(s)}>{s}</button>)}
          </div>
          <p className="small muted" style={{ padding: "4px 10px 10px" }}>Type a Spanish or English word — I know all {WORD_INDEX.length} words in the course! Tap a word to hear it.</p>
        </>}
        {q && !results.length && <div className="palette__empty">Hmm, I don’t know that one yet. Try another word!</div>}
        {words.length > 0 && <div className="palette__group">Words</div>}
        {words.map((r, i) => item(r, i))}
        {lessons.length > 0 && <div className="palette__group">Lessons</div>}
        {lessons.map((r, i) => item(r, words.length + i))}
      </div>
      <div className="palette__foot"><span>↑↓ move</span><span>↵ {results[active]?.kind === "word" ? "listen" : "open"}</span><span>esc close</span></div>
    </motion.div>
  </div>;
}
