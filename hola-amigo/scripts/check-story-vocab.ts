// For each Spanish story, lists the words a child won't have met in the course
// by the end of that story's world (so stories stay at the right level).
// Run: npm run content:story-vocab
import { BOOKS, LESSONS, UNITS, WORLDS } from "../src/content/index.ts";
import { segmentMixed, splitSentences } from "../src/audio/text.ts";

const tokens = (s: string) => s.toLowerCase().split(/[^\p{L}]+/u).filter(Boolean);
// Little words every story needs (articles, pronouns, linking words, "says/said").
const GLUE = new Set("el la los las un una unos unas y o pero de del al a en con por para que qué es son está están hay su sus mi mis tu le lo se me te nos no sí muy más también dice dicen dijo pregunta preguntó".split(" "));

for (const book of BOOKS) {
  const last = WORLDS.find(w => w.id === book.world)!.range[1];
  const known = new Set<string>();
  for (const l of LESSONS.filter(l => l.id <= last)) {
    const texts = [...l.words.map(w => w.es), l.phrase.es, ...l.sentences.map(s => s.correct.join(" ")),
      ...l.story.paras.flatMap(p => splitSentences(p).flatMap(s => segmentMixed(s).filter(x => x.role === "es").map(x => x.text)))];
    texts.forEach(t => tokens(t).forEach(x => known.add(x)));
  }
  UNITS.filter(u => u.world <= book.world).forEach(u => u.goals.forEach(g => tokens(g.es).forEach(x => known.add(x))));
  const all = book.sentences.flatMap(s => tokens(s.es));
  const fresh = [...new Set(all.filter(t => !known.has(t) && !GLUE.has(t)))];
  const pct = Math.round((all.filter(t => known.has(t) || GLUE.has(t)).length / all.length) * 100);
  console.log(`W${book.world} ${book.title.padEnd(30)} ${pct}% known · new: ${fresh.join(", ") || "—"}`);
}
