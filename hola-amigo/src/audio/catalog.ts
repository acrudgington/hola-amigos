// ============================================================
// What can be said, and how. The player and the clip generator both use
// these helpers, so a line always maps to the same clips.
// ============================================================
import { ALL_WORDS, LESSONS, SURPRISES } from "../content/index.ts";
import { REACTION_LINES } from "../lib/reactions.ts";
import { BOSS_HIT, DONE_LINES, INSTRUCTIONS, LEVEL_UP_LINE, PRAISE, REMEMBERED, REVIEW_INSTRUCTION } from "./lines.ts";
import { clipId, segmentMixed, single, splitSentences, type Segment, type Speaker, type VoiceRole } from "./text.ts";

// A Spanish word, phrase or sentence, said by the Castilian teacher voice.
export const spanish = (text: string): Segment[] => single("es", text);
// English narration that may contain Spanish (stories, questions, instructions).
export const narration = (text: string, speaker: Speaker = "teacher"): Segment[] => segmentMixed(text, speaker);

export interface Clip { id: string; role: VoiceRole; text: string }

// Every clip the course needs, de-duplicated.
export function collectClips(): Clip[] {
  const clips = new Map<string, Clip>();
  const add = (segs: Segment[]) => { for (const s of segs) { const id = clipId(s.role, s.text); if (!clips.has(id)) clips.set(id, { id, ...s }); } };

  for (const w of ALL_WORDS) add(spanish(w.es));
  for (const l of LESSONS) {
    add(spanish(l.phrase.es));
    add(narration(l.funFact));
    for (const s of l.sentences) add(spanish(s.correct.join(" ")));
    for (const g of l.gaps) add(narration(g.q));
    for (const p of l.story.paras) for (const s of splitSentences(p)) add(narration(s));
    for (const q of l.story.qs) add(narration(q.q));
  }
  for (const s of SURPRISES) for (const line of s.lines) add(narration(line));
  for (const t of [...Object.values(INSTRUCTIONS), REVIEW_INSTRUCTION]) add(narration(t));
  for (const p of [...PRAISE, BOSS_HIT]) add(single("sol-es", p));
  for (const t of [REMEMBERED, LEVEL_UP_LINE, ...Object.values(DONE_LINES)]) add(narration(t, "sol"));
  for (const r of REACTION_LINES) add(narration(r.text, r.who));
  return [...clips.values()];
}
