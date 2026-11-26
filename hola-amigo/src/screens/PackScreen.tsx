// A pack's page: its lessons (with stars), and for the school kit the
// "show the teacher" phrase cards.
import { useState } from "react";
import { motion } from "framer-motion";
import { packById, type Lesson } from "../content/index.ts";
import { isPackLessonOpen, packProgress } from "../domain/packs.ts";
import type { Progress } from "../domain/progress.ts";
import { Button, Card, SpeakButton } from "../components/ui.tsx";
import { Art } from "../components/Art.tsx";
import { Icon } from "../components/Icon.tsx";
import { TeacherCards } from "./TeacherCards.tsx";

export function PackScreen({ packId, progress, onBack, onStart, onOpen }: {
  packId: string; progress: Progress; onBack: () => void; onStart: (l: Lesson) => void; onOpen: (l: Lesson) => void;
}) {
  const pack = packById(packId);
  const [cards, setCards] = useState(false);
  if (!pack) return null;
  const prog = packProgress(progress, pack);
  if (cards && pack.cards) return <TeacherCards cards={pack.cards} title={pack.title} onClose={() => setCards(false)} />;

  return <div style={{ paddingTop: 4, maxWidth: 760, margin: "0 auto" }}>
    <Button size="sm" variant="ghost" onClick={onBack} style={{ marginBottom: 8 }}><Icon name="chevronLeft" size={16} />Back</Button>
    <Card className="card--pad-lg pack-hero" style={{ "--pc": pack.color }}>
      <Art e={pack.emoji} size={72} eager />
      <div className="grow">
        <div className="eyebrow">{prog.done} of {prog.total} lessons · {prog.stars} ★</div>
        <h1 className="h1" lang="es" style={{ marginTop: 2 }}>{pack.title}</h1>
        <p className="small muted" style={{ marginTop: 4 }}>{pack.about}</p>
      </div>
    </Card>

    {pack.cards && <button type="button" className="card pack-cards-cta" onClick={() => setCards(true)}>
      <Art e="🪪" size={44} />
      <div className="grow"><div className="h3">Show the teacher</div><div className="small muted">Big phrase cards to show (or play) at school when you can’t find the words yet.</div></div>
      <Icon name="chevronRight" size={20} />
    </button>}

    <div className="pack-lessons">
      {pack.lessons.map((l, i) => {
        const stars = progress.packStars?.[l.id] || 0;
        const open = isPackLessonOpen(progress, pack, i);
        return <motion.button key={l.id} type="button" className={`pack-lesson ${open ? "" : "is-locked"} ${stars ? "is-done" : ""}`} disabled={!open}
          onClick={() => (stars ? onOpen(l) : onStart(l))} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
          aria-label={open ? `${l.title}: ${l.subtitle}. ${stars} of 3 stars` : `${l.title}, locked`}>
          <span className="pack-lesson__num">{i + 1}</span>
          {open ? <Art e={l.emoji} size={40} /> : <span className="pack-lesson__lock"><Icon name="lock" size={20} /></span>}
          <span className="grow" style={{ textAlign: "left" }}>
            <span className="pack-lesson__title" lang="es">{l.title}</span>
            <span className="pack-lesson__sub">{l.subtitle}</span>
          </span>
          <span className="pack-lesson__stars" aria-hidden="true">{[1, 2, 3].map(s => <span key={s} className={s <= stars ? "on" : ""}>★</span>)}</span>
        </motion.button>;
      })}
    </div>
    {pack.lessons[0] && <p className="tiny muted text-center" style={{ marginTop: 12 }}>
      Tip: tap <SpeakButton text={pack.lessons[0].phrase.es} size={24} /> buttons to hear any word, and 🐢 to hear it slowly.
    </p>}
  </div>;
}
