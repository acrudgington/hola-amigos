// "Show the teacher": big, clear phrase cards a child can show (or play out
// loud) at a Spanish school while they're still learning the words. Works offline.
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { SLOW, voice } from "../audio/player.ts";
import { Button } from "../components/ui.tsx";
import { Art } from "../components/Art.tsx";
import { Icon } from "../components/Icon.tsx";

export interface PhraseCard { es: string; en: string; emoji: string }

export function TeacherCards({ cards, title, onClose }: { cards: PhraseCard[]; title: string; onClose: () => void }) {
  const [open, setOpen] = useState<number | null>(null);
  const card = open != null ? cards[open] : null;
  return <div style={{ paddingTop: 4, maxWidth: 760, margin: "0 auto" }}>
    <Button size="sm" variant="ghost" onClick={onClose} style={{ marginBottom: 8 }}><Icon name="chevronLeft" size={16} />{title}</Button>
    <h1 className="h2" style={{ marginBottom: 4 }}>Show the teacher</h1>
    <p className="small muted" style={{ marginBottom: 14 }}>Tap a card to show it big. Tap 🔊 to say it out loud for you.</p>
    <div className="phrase-grid">
      {cards.map((c, i) => <button key={c.es} type="button" className="phrase-card" onClick={() => { setOpen(i); voice.spanish(c.es); }}>
        <Art e={c.emoji} size={40} />
        <span className="phrase-card__es" lang="es">{c.es}</span>
        <span className="phrase-card__en">{c.en}</span>
      </button>)}
    </div>
    <AnimatePresence>
      {card && <motion.div className="phrase-full" role="dialog" aria-modal="true" aria-label={card.en}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(null)}>
        <motion.div className="phrase-full__card" initial={{ scale: 0.9 }} animate={{ scale: 1 }} onClick={e => e.stopPropagation()}>
          <Art e={card.emoji} size={96} eager />
          <div className="phrase-full__es" lang="es">{card.es}</div>
          <div className="phrase-full__en">{card.en}</div>
          <div className="row row--center" style={{ gap: 10, marginTop: 18 }}>
            <Button variant="sun" size="lg" onClick={() => voice.spanish(card.es)}>🔊 Say it</Button>
            <Button variant="white" size="lg" onClick={() => voice.spanish(card.es, { rate: SLOW })}>🐢 Slowly</Button>
          </div>
          <Button variant="ghost" onClick={() => setOpen(null)} style={{ marginTop: 10 }}>Close</Button>
        </motion.div>
      </motion.div>}
    </AnimatePresence>
  </div>;
}
