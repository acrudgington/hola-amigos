// Writes content/review/teacher-review.csv: every line of Spanish in the course,
// one row each, for a Spanish teacher to check and sign off. Opens in Excel,
// Numbers or Google Sheets. Run: npm run content:review-sheet
import { writeFileSync } from "node:fs";
import { LESSONS, WORLDS } from "../src/content/index.ts";

const rows: string[][] = [["World", "Lesson", "Title", "Type", "Spanish", "English", "Pronunciation guide", "OK? (Y/N)", "Correction / comment"]];
const worldOf = (id: number) => WORLDS.find(w => id >= w.range[0] && id <= w.range[1])?.name ?? "";
for (const l of LESSONS) {
  const base = [worldOf(l.id), String(l.id), l.title];
  const add = (type: string, es: string, en = "", say = "") => rows.push([...base, type, es, en, say, "", ""]);
  add("Fun fact", l.funFact);
  add("Key phrase", l.phrase.es, l.phrase.en);
  for (const w of l.words) add("Word", w.es, w.en, w.say);
  for (const s of l.sentences) add("Sentence", s.correct.join(" "), s.en);
  for (const g of l.gaps) add("Question", g.q, g.opts.join(" / "));
  add("Story title", l.story.title);
  l.story.paras.forEach((p, i) => add(`Story ${i + 1}`, p));
  for (const q of l.story.qs) add("Story question", q.q, q.opts.join(" / "));
}
const csv = rows.map(r => r.map(c => `"${c.replace(/"/g, '""')}"`).join(",")).join("\r\n");
writeFileSync("content/review/teacher-review.csv", "﻿" + csv + "\r\n");   // BOM so Excel reads the accents
console.log(`${rows.length - 1} rows → content/review/teacher-review.csv`);
