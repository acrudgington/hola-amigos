// Grammar-checks every piece of Spanish in the course with LanguageTool
// (api.languagetool.org, free public service). Only course text is sent.
// Mixed English/Spanish lines are split with the same splitter the voices use,
// so only the Spanish parts are checked. Run: npm run content:grammar
import { writeFileSync } from "node:fs";
import { LESSONS } from "../src/content/index.ts";
import { segmentMixed, splitSentences } from "../src/audio/text.ts";

interface Item { where: string; text: string }
const items: Item[] = [];
const add = (where: string, text: string) => { const t = text.trim(); if (t.split(/\s+/).length >= 2) items.push({ where, text: t }); };
const addMixed = (where: string, text: string) => {
  for (const s of splitSentences(text)) for (const seg of segmentMixed(s)) if (seg.role === "es") add(where, seg.text);
};
for (const l of LESSONS) {
  const L = `L${l.id}`;
  add(`${L} phrase`, l.phrase.es);
  for (const w of l.words) add(`${L} word`, w.es);
  for (const s of l.sentences) add(`${L} sentence`, s.correct.join(" "));
  addMixed(`${L} fact`, l.funFact);
  for (const g of l.gaps) addMixed(`${L} gap`, g.q);
  l.story.paras.forEach((p, i) => addMixed(`${L} story ${i + 1}`, p));
  for (const q of l.story.qs) addMixed(`${L} question`, q.q);
}

// Rules that only flag the course's deliberate style (sentence-building tiles have
// no punctuation; children's lines are short and exclamatory).
const IGNORE = new Set(["UPPERCASE_SENTENCE_START", "WHITESPACE_RULE", "ES_UNPAIRED_BRACKETS", "UNPAIRED_BRACKETS", "PUNCTUATION_PARAGRAPH_END", "DOUBLE_PUNCTUATION", "MORFOLOGIK_RULE_ES"]);

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
async function check(text: string) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await fetch("https://api.languagetool.org/v2/check", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ text, language: "es" }),
    });
    if (res.status === 429) { await sleep(65_000); continue; }
    if (!res.ok) throw new Error(`LanguageTool ${res.status}: ${await res.text()}`);
    return (await res.json()) as { matches: { offset: number; length: number; message: string; rule: { id: string }; replacements: { value: string }[] }[] };
  }
  throw new Error("LanguageTool kept rate-limiting");
}

// Batch items into requests (one item per line), staying well under the free limits.
const SEP = "\n\n";
const batches: Item[][] = [];
let cur: Item[] = [], size = 0;
for (const it of items) {
  if (size + it.text.length > 6000 && cur.length) { batches.push(cur); cur = []; size = 0; }
  cur.push(it); size += it.text.length + SEP.length;
}
if (cur.length) batches.push(cur);

const out: string[] = [];
console.log(`${items.length} Spanish lines in ${batches.length} requests`);
for (const [bi, batch] of batches.entries()) {
  const text = batch.map(b => b.text).join(SEP);
  const starts: number[] = [];
  let pos = 0;
  for (const b of batch) { starts.push(pos); pos += b.text.length + SEP.length; }
  const { matches } = await check(text);
  for (const m of matches) {
    if (IGNORE.has(m.rule.id)) continue;
    let i = starts.length - 1;
    while (i > 0 && starts[i] > m.offset) i--;
    const it = batch[i];
    const local = m.offset - starts[i];
    const bad = it.text.slice(local, local + m.length);
    out.push(`${it.where}\t${m.rule.id}\t«${bad}» in «${it.text}»\t${m.message}${m.replacements.length ? ` → ${m.replacements.slice(0, 3).map(r => r.value).join(" / ")}` : ""}`);
  }
  process.stdout.write(`  ${bi + 1}/${batches.length}\r`);
  await sleep(4000);
}
writeFileSync("content/review/grammar-check.tsv", ["Where\tRule\tText\tLanguageTool says", ...out].join("\n") + "\n");
console.log(`\n${out.length} things to look at → content/review/grammar-check.tsv`);
