// Avatars: a character (3D picture, children in 5 skin tones), a background
// colour and an optional accessory. Stored as a short ASCII code so it fits the
// existing 16-character limit in the database rules, e.g. "av1:0a3c2".
// Older avatars (a single emoji like "🦊") still work.

export interface AvatarCharacter { id: string; label: string; tones: string[] }
export const CHARACTERS: AvatarCharacter[] = [
  { id: "girl", label: "Girl", tones: ["👧", "👧🏻", "👧🏼", "👧🏽", "👧🏾", "👧🏿"] },
  { id: "boy", label: "Boy", tones: ["👦", "👦🏻", "👦🏼", "👦🏽", "👦🏾", "👦🏿"] },
  { id: "child", label: "Child", tones: ["🧒", "🧒🏻", "🧒🏼", "🧒🏽", "🧒🏾", "🧒🏿"] },
  { id: "hero", label: "Superhero", tones: ["🦸", "🦸🏻", "🦸🏼", "🦸🏽", "🦸🏾", "🦸🏿"] },
  { id: "fairy", label: "Fairy", tones: ["🧚", "🧚🏻", "🧚🏼", "🧚🏽", "🧚🏾", "🧚🏿"] },
  { id: "fox", label: "Fox", tones: ["🦊"] },
  { id: "panda", label: "Panda", tones: ["🐼"] },
  { id: "unicorn", label: "Unicorn", tones: ["🦄"] },
  { id: "tiger", label: "Tiger", tones: ["🐯"] },
  { id: "dog", label: "Dog", tones: ["🐶"] },
  { id: "cat", label: "Cat", tones: ["🐱"] },
  { id: "rabbit", label: "Rabbit", tones: ["🐰"] },
  { id: "frog", label: "Frog", tones: ["🐸"] },
  { id: "lion", label: "Lion", tones: ["🦁"] },
  { id: "bear", label: "Bear", tones: ["🐻"] },
  { id: "koala", label: "Koala", tones: ["🐨"] },
  { id: "monkey", label: "Monkey", tones: ["🐵"] },
  { id: "owl", label: "Owl", tones: ["🦉"] },
  { id: "penguin", label: "Penguin", tones: ["🐧"] },
  { id: "turtle", label: "Turtle", tones: ["🐢"] },
  { id: "octopus", label: "Octopus", tones: ["🐙"] },
  { id: "dino", label: "Dinosaur", tones: ["🦖"] },
  { id: "robot", label: "Robot", tones: ["🤖"] },
  { id: "alien", label: "Alien", tones: ["👾"] },
];

export const BACKGROUNDS: [string, string][] = [
  ["#FFB547", "#FF7A45"], ["#7C6CF2", "#4C3FD1"], ["#34D399", "#0E9F6E"], ["#60A5FA", "#2563EB"],
  ["#F472B6", "#DB2777"], ["#FDE047", "#F59E0B"], ["#2DD4BF", "#0D9488"], ["#A3A3B5", "#52526B"],
];

export interface Accessory { id: string; label: string; emoji: string | null; spot: "top" | "corner" | "side" }
export const ACCESSORIES: Accessory[] = [
  { id: "none", label: "Nothing", emoji: null, spot: "top" },
  { id: "crown", label: "Crown", emoji: "👑", spot: "top" },
  { id: "cap", label: "Cap", emoji: "🧢", spot: "top" },
  { id: "tophat", label: "Top hat", emoji: "🎩", spot: "top" },
  { id: "bow", label: "Bow", emoji: "🎀", spot: "side" },
  { id: "flower", label: "Flower", emoji: "🌸", spot: "side" },
  { id: "headphones", label: "Headphones", emoji: "🎧", spot: "top" },
  { id: "sparkles", label: "Sparkles", emoji: "✨", spot: "corner" },
  { id: "star", label: "Star", emoji: "⭐", spot: "corner" },
  { id: "heart", label: "Heart", emoji: "💖", spot: "corner" },
];

export interface AvatarSpec { char: number; tone: number; bg: number; acc: number }
export const DEFAULT_AVATAR: AvatarSpec = { char: 5, tone: 0, bg: 0, acc: 0 };   // the fox

const b36 = (n: number) => n.toString(36);
export function encodeAvatar(a: AvatarSpec): string {
  return `av1:${b36(a.char).padStart(2, "0")}${b36(a.tone)}${b36(a.bg)}${b36(a.acc)}`;
}

const clamp = (n: number, max: number) => (Number.isFinite(n) && n >= 0 && n < max ? n : 0);
export function decodeAvatar(value: string | undefined | null): AvatarSpec & { legacy?: string } {
  if (value && value.startsWith("av1:") && value.length === 9) {
    const p = (i: number, n: number) => parseInt(value.slice(i, i + n), 36);
    const char = clamp(p(4, 2), CHARACTERS.length);
    return { char, tone: clamp(p(6, 1), CHARACTERS[char].tones.length), bg: clamp(p(7, 1), BACKGROUNDS.length), acc: clamp(p(8, 1), ACCESSORIES.length) };
  }
  // A single-emoji avatar from before: show it as it was, in the new frame.
  const legacy = value || "🦊";
  const i = CHARACTERS.findIndex(c => c.tones.includes(legacy));
  const bg = [...legacy].reduce((h, ch) => h + (ch.codePointAt(0) || 0), 0) % BACKGROUNDS.length;
  return i >= 0 ? { char: i, tone: CHARACTERS[i].tones.indexOf(legacy), bg, acc: 0 } : { char: 0, tone: 0, bg, acc: 0, legacy };
}

export const avatarEmoji = (a: AvatarSpec & { legacy?: string }) => a.legacy ?? CHARACTERS[a.char].tones[a.tone] ?? CHARACTERS[a.char].tones[0];

export function randomAvatar(): string {
  const r = (n: number) => Math.floor(Math.random() * n);
  const char = r(CHARACTERS.length);
  return encodeAvatar({ char, tone: r(CHARACTERS[char].tones.length), bg: r(BACKGROUNDS.length), acc: r(ACCESSORIES.length) });
}
