// Prints how each mixed English/Spanish line will be split between the two voices,
// so lines read by the wrong voice are easy to spot.
// Run: FROM_LESSON=101 TO_LESSON=110 npm run content:voice-split
import { LESSONS, PACK_LESSONS } from "../src/content/index.ts";
import { segmentMixed, splitSentences } from "../src/audio/text.ts";
const FROM = Number(process.env.FROM_LESSON || 101), TO = Number(process.env.TO_LESSON || 999);
for (const l of [...LESSONS, ...PACK_LESSONS].filter(l => l.id >= FROM && l.id <= TO)) {
  const texts = [...l.story.paras, l.funFact, ...l.gaps.map(g => g.q), ...l.story.qs.map(q => q.q)];
  for (const t of texts) for (const s of splitSentences(t)) {
    const segs = segmentMixed(s);
    console.log(`L${l.id} ` + segs.map(x => x.role === "es" ? `[ES:${x.text}]` : `{${x.text}}`).join(" "));
  }
}
