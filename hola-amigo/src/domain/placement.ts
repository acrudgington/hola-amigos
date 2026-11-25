// Placement check: find where a child who already knows some Spanish should start.
//
// 4 questions per world; 3 right passes it. From world 3 on, two of the four
// are whole sentences (meaning and grammar), which can't be guessed from a
// cognate or a picture. Worlds 1 and 2 are checked in turn,
// then it jumps two at a time (4, 6, 8 … 22). After a missed jump it checks
// the world in between, so the result is exact without asking about every world.
// A beginner finishes in 4–8 questions; the most anyone sees is 52.
import { WORLDS, lessonsInWorld, type Word } from "../content/index.ts";
import { shuffle } from "../lib/utils.ts";

export const PER_WORLD = 4;
export const PASS_MARK = 3;
const JUMPS = [1, ...WORLDS.map(w => w.id).filter(id => id % 2 === 0)];

export interface WorldResult { world: number; right: number }
export const passed = (r: WorldResult) => r.right >= PASS_MARK;

// The next world to check, or null when the placement is decided.
export function nextWorld(results: WorldResult[]): number | null {
  if (!results.length) return JUMPS[0];
  const last = results[results.length - 1];
  const tested = new Set(results.map(r => r.world));
  if (passed(last)) {
    // Passed the in-between world after missing a higher one: that's the answer.
    if (results.some(r => !passed(r) && r.world > last.world)) return null;
    const next = JUMPS.find(w => w > last.world && !tested.has(w));
    return next ?? null;
  }
  // Missed a jump: check the skipped world in between, if there is one.
  const between = last.world - 1;
  if (between >= 1 && !tested.has(between) && results.some(r => r.world === between - 1 && passed(r))) return between;
  return null;
}

// The highest world they've shown they know (0 = start from the very beginning).
export function placedWorld(results: WorldResult[]): number {
  // Highest passed world, as long as no lower world was failed (a passed jump,
  // e.g. world 4 after world 2, covers the world it skipped).
  let w = 0;
  for (const r of [...results].sort((a, b) => a.world - b.world)) {
    if (!passed(r)) break;
    w = r.world;
  }
  return w;
}

export const lastLessonOf = (world: number) => (world >= 1 ? WORLDS.find(w => w.id === world)?.range[1] ?? 0 : 0);

export type QuestionKind = "listen" | "recognise" | "recall" | "sentence" | "sentenceRecall";
export interface SentencePair { es: string; en: string }
export interface PlacementQuestion { world: number; word: Word; kind: QuestionKind; sentence?: SentencePair }

// Sentences taught in a world (built sentences and lesson phrases).
export function sentencesOf(world: number): SentencePair[] {
  const w = WORLDS.find(x => x.id === world);
  if (!w) return [];
  const out: SentencePair[] = [];
  for (const l of lessonsInWorld(w)) {
    out.push({ es: l.phrase.es, en: l.phrase.en });
    for (const s of l.sentences) out.push({ es: s.correct.join(" "), en: s.en });
  }
  const seen = new Set<string>();
  return out.filter(x => !seen.has(x.en) && seen.add(x.en));
}

// Four questions spread across the world (early, middle and late lessons).
export function questionsFor(world: number, { canListen = true }: { canListen?: boolean } = {}): PlacementQuestion[] {
  const w = WORLDS.find(x => x.id === world);
  if (!w) return [];
  const lessons = lessonsInWorld(w).filter(l => !l.milestone);
  const quarters = [0, 1, 2, 3].map(i => lessons.slice(Math.floor((i * lessons.length) / 4), Math.floor(((i + 1) * lessons.length) / 4)));
  const first: QuestionKind = canListen ? "listen" : "recognise";
  const sentences = shuffle(sentencesOf(world));
  const useSentences = world >= 3 && sentences.length >= 4;
  const kinds: QuestionKind[] = world <= 2 || !useSentences ? [first, "recognise", "recall", "recall"] : [first, "recall", "sentence", "sentenceRecall"];
  return quarters.map((group, i) => {
    const words = shuffle(group.flatMap(l => l.words));
    const q: PlacementQuestion = { world, word: words[0] ?? lessons[0].words[0], kind: kinds[i] };
    if (kinds[i] === "sentence" || kinds[i] === "sentenceRecall") q.sentence = sentences[i - 2];
    return q;
  }).filter(q => q.word);
}
