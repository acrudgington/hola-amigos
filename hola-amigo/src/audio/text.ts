// ============================================================
// Text → voice clips. Shared by the clip generator (scripts/generate-audio.ts)
// and the in-app player, so both always agree on how text is split and
// which clip file belongs to which piece of text.
// ============================================================
import { ALL_WORDS, BOOKS, CHANTS, LESSONS } from "../content/index.ts";

// Who is speaking. Each role maps to one neural voice (see config.ts AUDIO).
export type VoiceRole = "es" | "en" | "sol-es" | "sol-en" | "luna-es" | "luna-en";
export type Speaker = "teacher" | "sol" | "luna";
export interface Segment { role: VoiceRole; text: string }

// ---------- clip ids ----------
// cyrb53: a fast 53-bit string hash (collisions are vanishingly unlikely at
// a few thousand clips). Same function in the browser and in Node.
function cyrb53(str: string, seed = 0) {
  let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}

export const normalizeText = (t: string) => t.replace(/\s+/g, " ").replace(/[‘’]/g, "'").replace(/[“”]/g, '"').trim();
export const clipId = (role: VoiceRole, text: string) => cyrb53(`${role}\u0000${normalizeText(text)}`).toString(36);

// ---------- sentences ----------
// Split a paragraph into sentences, but never inside a quotation
// ("He says '¡Hola! ¿Qué tal?' to her." stays one sentence). Apostrophes
// inside words (it's, Tomás's) don't count as quotes.
export function splitSentences(para: string): string[] {
  const out: string[] = [];
  let start = 0, inQuote = false;
  for (let i = 0; i < para.length; i++) {
    const ch = para[i], prev = para[i - 1] ?? " ", next = para[i + 1] ?? " ";
    if (ch === "'" || ch === "‘" || ch === "’" || ch === '"' || ch === "“" || ch === "”") {
      const opens = /\s|^|[(\[—–-]/.test(prev) && /\S/.test(next);
      const closes = /\S/.test(prev) && /[\s.,!?;:)\]—–-]|$/.test(next);
      if (!inQuote && opens) inQuote = true;
      else if (inQuote && closes && !/[A-Za-zÀ-ÿ]/.test(next)) inQuote = false;
      continue;
    }
    if (inQuote || !/[.!?…]/.test(ch)) continue;
    // End of sentence: punctuation (plus any closing quote) followed by space and a new sentence.
    let j = i + 1;
    while (j < para.length && /[.!?…'’"”]/.test(para[j])) j++;
    if (j < para.length && /\s/.test(para[j]) && /[A-Z¡¿'"‘“ÁÉÍÓÚÑ]/.test(para.slice(j).trimStart()[0] ?? "")) {
      out.push(para.slice(start, j).trim());
      start = j;
      i = j - 1;
    }
  }
  const tail = para.slice(start).trim();
  if (tail) out.push(tail);
  return out;
}

// ---------- language detection for mixed stories ----------
const SPANISH_CHARS = /[¿¡ñÑáéíóúÁÉÍÓÚü]/;
// Small function words: Spanish only when they sit next to other Spanish ("un perro").
const ES_GLUE = new Set(["el", "la", "los", "las", "un", "una", "unos", "unas", "y", "de", "del", "que", "es", "mi", "mis", "tu", "tus", "su", "sus", "te", "se", "con", "en", "por", "para", "al", "lo", "le", "les", "nos", "o", "a", "no", "me", "sol", "luna", "son"]);
// Common words not in the vocabulary lists but clearly Spanish.
const ES_EXTRA = ["muy", "sí", "hay", "está", "están", "soy", "eres", "hoy", "pero", "más", "qué", "cómo", "dónde", "cuándo", "quiero", "tengo", "gusta", "gustan", "hace", "hizo", "hacer", "tiene", "tienen", "va", "voy", "vamos", "dice", "mucho", "mucha", "muchos", "también", "aquí", "allí", "ahora", "siempre", "nunca", "todo", "todos", "nuevo", "nueva", "bonito", "bonita", "grande", "pequeño", "pequeña", "feliz", "bien", "mal", "buen", "buena", "bueno", "gracias", "hola", "adiós", "fue", "era", "estaba", "había", "puedo", "puedes", "vale", "claro", "ayer", "mañana", "tarde", "noche", "este", "esta", "estos", "estas", "ese", "esa",
  "nada", "pasa", "otro", "otra", "día", "días", "vez", "veces", "ya", "cuando", "donde", "porque", "ella", "él", "yo", "tú", "nosotros", "nosotras", "vosotros", "vosotras", "ellos", "ellas", "usted", "ustedes", "hemos", "habéis", "han", "ha", "hecho", "todavía", "alguna", "algo", "nadie", "después", "antes", "entonces", "luego", "pronto", "poco", "tanto", "mismo", "cada", "sin", "sobre", "entre", "hasta", "desde", "romper", "rompido", "baile", "vivir", "salir", "beber", "escribir", "recibir", "cenar", "zumo", "jugo", "verbo", "verbos", "sois", "somos", "diferente", "saca", "pintan", "casita", "deseo", "quince"];
// English words spelled like Spanish ones; never Spanish on their own.
const EN_SHADOW = new Set(["he", "are", "is", "come", "fin", "once", "dice", "pie", "real", "plan", "hotel", "hospital", "animal", "chocolate", "radio", "piano", "taxi", "bus", "idea", "mama", "papa", "gas", "set", "solo", "final", "normal", "local", "general", "total", "terrible", "horrible", "doctor", "actor", "color", "error", "motor", "popular", "regular", "similar", "pizza", "panda", "zoo", "ok", "on", "fan", "sale", "red", "mar", "tomato", "banana", "television", "has", "ten", "van", "sea", "dime", "pan", "tan", "miles", "lee", "comes", "sales", "once", "son"]);

const ES_ENDING = /(ado|ados|ida|ido|idos|amos|emos|imos|aron|ieron|aste|iste|asteis|isteis|ábamos|íamos|aba|aban|ía|ían|ción|ciones)$/;
const isShadow = (t: string) => EN_SHADOW.has(t) || EN_SHADOW.has(t.replace(/e?s$/, ""));
let lexicon: Set<string> | null = null;
function spanishLexicon() {
  if (lexicon) return lexicon;
  const lex = new Set<string>([...ES_GLUE, ...ES_EXTRA]);
  const add = (t: string) => {
    lex.add(t); lex.add(`${t}s`); lex.add(`${t}es`);
    if (t.endsWith("o")) { lex.add(`${t.slice(0, -1)}a`); lex.add(`${t.slice(0, -1)}as`); }
    if (t.endsWith("a")) { lex.add(`${t.slice(0, -1)}o`); lex.add(`${t.slice(0, -1)}os`); }
  };
  for (const w of ALL_WORDS) for (const tok of tokenize(w.es)) if (tok.length > 2) add(tok); else lex.add(tok);
  ES_EXTRA.forEach(add);
  // Every word of the course's all-Spanish lines (phrases, sentences, chants, stories) is Spanish too.
  const lines = [...LESSONS.flatMap(l => [l.phrase.es, ...l.sentences.map(x => x.correct.join(" "))]),
    ...CHANTS.flatMap(c => c.lines.map(x => x.es)), ...BOOKS.flatMap(b => b.sentences.map(x => x.es))];
  for (const line of lines) for (const tok of tokenize(line)) lex.add(tok);
  lexicon = lex;
  return lex;
}
const tokenize = (s: string) => s.toLowerCase().normalize("NFC").split(/[^a-záéíóúüñ]+/i).filter(Boolean);

type Kind = "es" | "glue" | "en";
function kindOf(word: string): Kind {
  const toks = tokenize(word);
  if (!toks.length) return "glue";              // numbers, emoji, punctuation follow their neighbours
  if (SPANISH_CHARS.test(word)) return "es";
  const lex = spanishLexicon();
  if (toks.every(t => ES_GLUE.has(t))) return "glue";
  // Unknown words with a clearly Spanish verb ending (he «cenado», ellos «salieron»).
  if (toks.every(t => !lex.has(t) && ES_ENDING.test(t))) return "es";
  // Words that are both English and Spanish ("he", "has") follow their neighbours.
  if (toks.every(t => lex.has(t) && (isShadow(t) || ES_GLUE.has(t)))) return "glue";
  if (toks.every(t => lex.has(t)) && toks.some(t => !isShadow(t) && !ES_GLUE.has(t))) return "es";
  return "en";
}

function looksSpanish(phrase: string): boolean {
  if (SPANISH_CHARS.test(phrase)) return true;
  const words = phrase.split(/\s+/).filter(w => tokenize(w).length);
  if (!words.length) return false;
  const kinds = words.map(kindOf);
  return kinds.includes("es") && kinds.filter(k => k !== "en").length / kinds.length >= 0.6;
}

// Split English text containing Spanish (quoted phrases, ¡exclamations!,
// ¿questions? or loose vocabulary words) into language segments, so Spanish
// is always said by a native Castilian voice.
export function segmentMixed(text: string, speaker: Speaker = "teacher"): Segment[] {
  const roleFor = (lang: "es" | "en"): VoiceRole => (speaker === "teacher" ? lang : (`${speaker}-${lang}` as VoiceRole));
  const out: Segment[] = [];
  const push = (lang: "es" | "en", t: string) => {
    const clean = t.replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu, "").replace(/^[\s,;:—–-]+|[\s,;:—–-]+$/g, "");
    if (!/[A-Za-zÁÉÍÓÚáéíóúñÑ0-9]/.test(clean)) return;
    const role = roleFor(lang);
    const last = out[out.length - 1];
    if (last && last.role === role) last.text = `${last.text} ${clean}`;
    else out.push({ role, text: clean });
  };

  // A ' only quotes when it isn't inside a word (it's, Tomás's are apostrophes).
  const parts = normalizeText(text).split(/((?<!\p{L})'(?:[^']|(?<=\p{L})'(?=\p{L}))+'(?!\p{L})|"[^"]+"|¡[^!]+!|¿[^?]+\?)/u);
  // Loose words: Spanish vocabulary runs, with small words joining the side they touch.
  const loose = (part: string) => {
    const words = part.split(/\s+/).filter(Boolean);
    const kinds = words.map(kindOf);
    const langs: ("es" | "en")[] = kinds.map(k => (k === "es" ? "es" : "en"));
    for (let pass = 0; pass < 3; pass++) {
      kinds.forEach((k, i) => {
        if (k !== "glue") return;
        const next = kinds.slice(i + 1).findIndex(x => x !== "glue");
        const nextLang = next >= 0 ? langs[i + 1 + next] : null;
        const prevLang = i > 0 ? langs[i - 1] : null;
        langs[i] = nextLang === "es" || (prevLang === "es" && nextLang !== "en") ? "es" : "en";
      });
    }
    let buf: string[] = [], cur: "es" | "en" | null = null;
    words.forEach((w, i) => {
      if (cur && langs[i] !== cur) { push(cur, buf.join(" ")); buf = []; }
      cur = langs[i]; buf.push(w);
    });
    if (cur && buf.length) push(cur, buf.join(" "));
  };
  for (const part of parts) {
    if (!part) continue;
    // A quote that reads as Spanish is said whole; a mixed one is split word by word.
    if (/^['"]/.test(part)) { if (looksSpanish(part)) push("es", part.slice(1, -1)); else loose(part.slice(1, -1)); continue; }
    if (/^[¡¿]/.test(part)) { push("es", part); continue; }
    loose(part);
  }
  return out;
}

// A single-language line, for words, phrases and fixed lines.
export const single = (role: VoiceRole, text: string): Segment[] => [{ role, text: normalizeText(text) }];
