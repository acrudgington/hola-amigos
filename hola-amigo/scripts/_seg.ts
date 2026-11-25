import { LESSONS } from "../src/content/index.ts";
import { segmentMixed, splitSentences } from "../src/audio/text.ts";
const FROM = Number(process.env.FROM_LESSON || 101), TO = Number(process.env.TO_LESSON || 999);
for (const l of LESSONS.filter(l => l.id >= FROM && l.id <= TO)) {
  const texts = [...l.story.paras, l.funFact, ...l.gaps.map(g => g.q), ...l.story.qs.map(q => q.q)];
  for (const t of texts) for (const s of splitSentences(t)) {
    const segs = segmentMixed(s);
    console.log(`L${l.id} ` + segs.map(x => x.role === "es" ? `[ES:${x.text}]` : `{${x.text}}`).join(" "));
  }
}
