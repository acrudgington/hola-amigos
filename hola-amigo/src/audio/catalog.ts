// ============================================================
// What can be said, and how. The player and the clip generator both use
// these helpers, so a line always maps to the same clips.
// ============================================================
import { ALL_WORDS, BOOKS, CHANTS, CONVERSATIONS, LESSONS, PACKS, PACK_CONVERSATIONS, PACK_LESSONS, SURPRISES } from "../content/index.ts";
import { REACTION_LINES } from "../lib/reactions.ts";
import { BOSS_HIT, DONE_LINES, INSTRUCTIONS, LEVEL_UP_LINE, PLACEMENT_LINES, PRAISE, REMEMBERED, REVIEW_INSTRUCTION, TOGETHER_LINES } from "./lines.ts";
import { clipId, segmentMixed, single, splitSentences, type Segment, type Speaker, type VoiceRole } from "./text.ts";

// A Spanish word, phrase or sentence, said by the Castilian teacher voice.
export const spanish = (text: string): Segment[] => single("es", text);
// Spanish said by Sol or Luna in their own voice (chants).
export const spanishBy = (who: "sol" | "luna", text: string): Segment[] => single(`${who}-es`, text);
// English narration that may contain Spanish (stories, questions, instructions).
export const narration = (text: string, speaker: Speaker = "teacher"): Segment[] => segmentMixed(text, speaker);

export interface Clip { id: string; role: VoiceRole; text: string }

// Every clip the course needs, de-duplicated.
export function collectClips(): Clip[] {
  const clips = new Map<string, Clip>();
  const add = (segs: Segment[]) => { for (const s of segs) { const id = clipId(s.role, s.text); if (!clips.has(id)) clips.set(id, { id, ...s }); } };

  for (const w of ALL_WORDS) add(spanish(w.es));
  for (const l of PACK_LESSONS) for (const w of l.words) add(spanish(w.es));
  for (const pk of PACKS) { add(spanish(pk.title)); for (const c of pk.cards ?? []) add(spanish(c.es)); }
  for (const l of [...LESSONS, ...PACK_LESSONS]) {
    add(spanish(l.phrase.es));
    add(narration(l.funFact));
    for (const s of l.sentences) add(spanish(s.correct.join(" ")));
    for (const g of l.gaps) add(narration(g.q));
    for (const p of l.story.paras) for (const s of splitSentences(p)) add(narration(s));
    for (const q of l.story.qs) add(narration(q.q));
  }
  for (const s of SURPRISES) for (const line of s.lines) add(narration(line));
  for (const b of BOOKS) {
    add(spanish(b.title));
    for (const s of b.sentences) add(spanish(s.es));
    for (const q of b.questions) add(narration(q.q));
  }
  // Conversations: the character's questions and replies in their own voice;
  // answers and tap options in the teacher's voice.
  for (const c of [...CONVERSATIONS, ...PACK_CONVERSATIONS]) for (const t of c.turns) {
    add(spanishBy(c.who, t.ask));
    if (t.reply) add(spanishBy(c.who, t.reply));
    for (const o of [t.answer, ...t.wrong.slice(0, 2)]) add(spanish(o));
  }
  for (const c of CHANTS) { add(spanish(c.title)); for (const l of c.lines) add(spanishBy(l.who, l.es)); }
  for (const t of [...Object.values(INSTRUCTIONS), REVIEW_INSTRUCTION]) add(narration(t));
  for (const p of [...PRAISE, BOSS_HIT]) add(single("sol-es", p));
  for (const t of [REMEMBERED, LEVEL_UP_LINE, ...Object.values(DONE_LINES), ...Object.values(PLACEMENT_LINES), ...Object.values(TOGETHER_LINES)]) add(narration(t, "sol"));
  for (const r of REACTION_LINES) add(narration(r.text, r.who));
  return [...clips.values()];
}
