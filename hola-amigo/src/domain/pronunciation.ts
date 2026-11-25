// Pronunciation tips for English-speaking grown-ups, worked out from how a
// Spanish word is spelled. Spanish spelling is regular, so a handful of rules
// covers almost everything. These are for Castilian Spanish (Spain), where
// "z" and "c" before e/i are said like the "th" in "think".
export interface Tip { id: string; text: string }

const RULES: { id: string; test: (w: string) => boolean; text: string }[] = [
  { id: "theta", test: w => /z|c[eéií]/.test(w), text: "In Spain, z (and c before e or i) sounds like the “th” in “think”." },
  { id: "jota", test: w => /j|g[eéií]/.test(w), text: "j (and g before e or i) is a breathy sound from the throat, like the “ch” in Scottish “loch”." },
  { id: "enye", test: w => w.includes("ñ"), text: "ñ sounds like the “ny” in “canyon”." },
  { id: "ll", test: w => w.includes("ll"), text: "ll sounds like the “y” in “yes”." },
  { id: "rr", test: w => /rr|(^|[\s¡¿])r/.test(w), text: "rr, and r at the start of a word, is a rolled r: tap the tongue behind the top teeth several times." },
  { id: "h", test: w => /(^|[^c])h/.test(w), text: "h is always silent in Spanish." },
  { id: "qu", test: w => /qu[eéií]/.test(w), text: "qu sounds like “k”: the u is silent." },
  { id: "gu", test: w => /gu[eéií]/.test(w), text: "In gue and gui the u is silent and the g is hard, as in “get”." },
  { id: "v", test: w => w.includes("v"), text: "v sounds just like b." },
  { id: "stress", test: w => /[áéíóú]/.test(w), text: "The accent mark shows which part to say strongest." },
];

const VOWELS: Tip = { id: "vowels", text: "Spanish vowels are short and pure: a as in “father”, e as in “bed”, i as in “machine”, o as in “hot”, u as in “food”." };

// Up to `max` tips for a word or phrase, most distinctive first.
export function tipsFor(es: string, max = 2): Tip[] {
  const w = es.toLowerCase();
  const tips = RULES.filter(r => r.test(w)).map(({ id, text }) => ({ id, text }));
  return (tips.length ? tips : [VOWELS]).slice(0, max);
}
