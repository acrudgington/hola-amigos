// ============================================================
// REWARDS — badges, collectible stickers and mascot outfits
// ============================================================
import { WORLDS } from "../content/index.ts";
import { countLessons as lessonsOf, sumStars as starsOf, type Progress } from "./progress.ts";

export interface Reward { id: string; name: string; desc: string; emoji: string; check: (p: Progress) => boolean }
export interface Sticker extends Reward { rarity: "common" | "rare" | "legendary" }
export type RewardType = "badge" | "sticker" | "outfit";
export interface EarnedReward { type: RewardType; id: string }

const starsFor = (p: Progress, id: number) => p.stars[id] || 0;
const perfectCount = (p: Progress) => Object.values(p.stars).filter(s => s === 3).length;

export const BADGES: Reward[] = [
  { id: "first_star", name: "First Star", desc: "Earned your first star!", emoji: "⭐", check: p => starsOf(p) >= 1 },
  { id: "ten_stars", name: "Star Collector", desc: "10 stars earned", emoji: "🌟", check: p => starsOf(p) >= 10 },
  { id: "fifty_stars", name: "Star Master", desc: "50 stars earned", emoji: "✨", check: p => starsOf(p) >= 50 },
  { id: "hundred_stars", name: "Star Champion", desc: "100 stars earned", emoji: "💫", check: p => starsOf(p) >= 100 },
  { id: "first_lesson", name: "First Steps", desc: "Completed your first lesson", emoji: "👣", check: p => lessonsOf(p) >= 1 },
  { id: "five_lessons", name: "Getting Started", desc: "Completed 5 lessons", emoji: "🎒", check: p => lessonsOf(p) >= 5 },
  { id: "a1_champion", name: "A1 Champion", desc: "Finished World 1 & 2", emoji: "🏆", check: p => starsFor(p, 16) >= 1 },
  { id: "sentence_champ", name: "Sentence Champion", desc: "Conquered grammar!", emoji: "🧩", check: p => starsFor(p, 24) >= 1 },
  { id: "a2_legend", name: "A2 Super Legend", desc: "Finished A2 course!", emoji: "👑", check: p => starsFor(p, 32) >= 1 },
  { id: "word_master", name: "Word Master", desc: "Conquered Plaza del Pueblo!", emoji: "📚", check: p => starsFor(p, 40) >= 1 },
  { id: "comparison_champ", name: "Comparison Champion", desc: "Finished the Bridge!", emoji: "⚖️", check: p => starsFor(p, 50) >= 1 },
  { id: "storyteller", name: "Master Storyteller", desc: "Conquered the Castle!", emoji: "📖", check: p => starsFor(p, 60) >= 1 },
  {
    id: "perfect_world", name: "World Conqueror", desc: "All stars in one world", emoji: "🌍",
    // BUGFIX: the old check compared `undefined < 3` (always false), so an
    // untouched world counted as "perfect" and the badge unlocked on the very
    // first star. Every lesson in the world must now have 3 stars.
    check: p => WORLDS.some(w => {
      for (let i = w.range[0]; i <= w.range[1]; i++) if (starsFor(p, i) < 3) return false;
      return true;
    }),
  },
  { id: "casa_champ", name: "Casa Champion", desc: "Mastered everyday home life!", emoji: "🏠", check: p => starsFor(p, 68) >= 1 },
  { id: "juego_champ", name: "Juego Champion", desc: "Mastered play & toys!", emoji: "🎮", check: p => starsFor(p, 76) >= 1 },
  { id: "naturaleza_champ", name: "Naturaleza Champion", desc: "Mastered the natural world!", emoji: "🌳", check: p => starsFor(p, 84) >= 1 },
  { id: "persona_champ", name: "Persona Champion", desc: "Mastered self-expression!", emoji: "👤", check: p => starsFor(p, 92) >= 1 },
  { id: "mega_champ", name: "MEGA CHAMPION!", desc: "Completed ALL 100 lessons!!!", emoji: "👑", check: p => starsFor(p, 100) >= 1 },
  { id: "streak_3", name: "On Fire!", desc: "3-day streak", emoji: "🔥", check: p => p.streak >= 3 },
  { id: "streak_7", name: "Week Warrior", desc: "7-day streak", emoji: "🔥", check: p => p.streak >= 7 },
  { id: "streak_30", name: "Month Master", desc: "30-day streak!", emoji: "🔥", check: p => p.streak >= 30 },
  { id: "speaker", name: "Speaking Star", desc: "Used the mic 10 times", emoji: "🗣️", check: p => p.micUses >= 10 },
  { id: "reviewer", name: "Memory Keeper", desc: "Did Sol's mix 5 times", emoji: "🔁", check: p => p.reviewsDone >= 5 },
  { id: "reviewer_pro", name: "Memory Master", desc: "Did Sol's mix 20 times", emoji: "🧩", check: p => p.reviewsDone >= 20 },
  { id: "story_lover", name: "Story Lover", desc: "Read 10 stories", emoji: "📖", check: p => p.storiesRead >= 10 },
  { id: "quiz_master", name: "Quiz Master", desc: "100 correct answers", emoji: "🧠", check: p => p.correctAnswers >= 100 },
  { id: "halfway", name: "Halfway There!", desc: "Finished 50 lessons", emoji: "🎯", check: p => lessonsOf(p) >= 50 },
  { id: "perfectionist", name: "Perfectionist", desc: "3 stars in 10 lessons", emoji: "💯", check: p => perfectCount(p) >= 10 },
];

export const RARITY: Record<Sticker["rarity"], { c: string; label: string }> = {
  common: { c: "#2EC27E", label: "Sticker" },
  rare: { c: "#3D8BFF", label: "Rare Sticker" },
  legendary: { c: "#A06CF0", label: "Legendary Sticker" },
};

export const STICKERS: Sticker[] = [
  { id: "s_island", name: "Island Explorer", emoji: "🏝️", rarity: "common", desc: "Finished Starter Island", check: p => starsFor(p, 8) >= 1 },
  { id: "s_town", name: "Townsfolk", emoji: "🏘️", rarity: "common", desc: "Finished Word Town", check: p => starsFor(p, 16) >= 1 },
  { id: "s_city", name: "City Slicker", emoji: "🏙️", rarity: "common", desc: "Finished Sentence City", check: p => starsFor(p, 24) >= 1 },
  { id: "s_story", name: "Bookworm", emoji: "📖", rarity: "rare", desc: "Finished Story Land", check: p => starsFor(p, 32) >= 1 },
  { id: "s_plaza", name: "Plaza Star", emoji: "⛲", rarity: "rare", desc: "Finished Plaza del Pueblo", check: p => starsFor(p, 40) >= 1 },
  { id: "s_bridge", name: "Bridge Builder", emoji: "🌉", rarity: "rare", desc: "Finished the Bridge", check: p => starsFor(p, 50) >= 1 },
  { id: "s_castle", name: "Castle Guard", emoji: "🏰", rarity: "rare", desc: "Finished the Castle", check: p => starsFor(p, 60) >= 1 },
  { id: "s_home", name: "Home Hero", emoji: "🏠", rarity: "rare", desc: "Finished Vida Diaria", check: p => starsFor(p, 68) >= 1 },
  { id: "s_play", name: "Game Champ", emoji: "🎮", rarity: "rare", desc: "Finished Cosas que Hago", check: p => starsFor(p, 76) >= 1 },
  { id: "s_nature", name: "Nature Friend", emoji: "🌍", rarity: "rare", desc: "Finished El Mundo Alrededor", check: p => starsFor(p, 84) >= 1 },
  { id: "s_self", name: "True Self", emoji: "💜", rarity: "legendary", desc: "Finished Cómo Soy", check: p => starsFor(p, 92) >= 1 },
  { id: "s_final", name: "Grand Master", emoji: "👑", rarity: "legendary", desc: "Completed all 100 lessons!", check: p => starsFor(p, 100) >= 1 },
  { id: "s_rocket", name: "Blast Off!", emoji: "🚀", rarity: "common", desc: "Earned 10 stars", check: p => starsOf(p) >= 10 },
  { id: "s_rainbow", name: "Rainbow", emoji: "🌈", rarity: "rare", desc: "Earned 50 stars", check: p => starsOf(p) >= 50 },
  { id: "s_unicorn", name: "Unicorn", emoji: "🦄", rarity: "legendary", desc: "Earned 150 stars", check: p => starsOf(p) >= 150 },
  { id: "s_fire", name: "Hot Streak", emoji: "🔥", rarity: "common", desc: "3-day streak", check: p => p.streak >= 3 },
  { id: "s_star7", name: "Shooting Star", emoji: "☄️", rarity: "rare", desc: "7-day streak", check: p => p.streak >= 7 },
  { id: "s_brain", name: "Big Brain", emoji: "🧠", rarity: "rare", desc: "100 correct answers", check: p => p.correctAnswers >= 100 },
  { id: "s_mic", name: "Superstar Singer", emoji: "🎤", rarity: "common", desc: "Used the mic 10 times", check: p => p.micUses >= 10 },
  { id: "s_owl", name: "Wise Owl", emoji: "🦉", rarity: "rare", desc: "Did Sol's mix 10 times", check: p => p.reviewsDone >= 10 },
  { id: "s_medal", name: "Gold Medal", emoji: "🥇", rarity: "rare", desc: "3 stars in 10 lessons", check: p => perfectCount(p) >= 10 },
  { id: "s_trophy", name: "Halfway Hero", emoji: "🏆", rarity: "rare", desc: "Finished 50 lessons", check: p => lessonsOf(p) >= 50 },
];

export const OUTFITS: Reward[] = [
  { id: "none", name: "None", emoji: "🚫", desc: "No accessory", check: () => true },
  { id: "party", name: "Party Hat", emoji: "🎉", desc: "Finish your first lesson", check: p => lessonsOf(p) >= 1 },
  { id: "sunglasses", name: "Cool Shades", emoji: "😎", desc: "Earn 20 stars", check: p => starsOf(p) >= 20 },
  { id: "crown", name: "Royal Crown", emoji: "👑", desc: "Finish Word Town (lesson 16)", check: p => starsFor(p, 16) >= 1 },
  { id: "flower", name: "Flower Crown", emoji: "🌸", desc: "5-day streak", check: p => p.streak >= 5 },
  { id: "wizard", name: "Wizard Hat", emoji: "🧙", desc: "Earn 75 stars", check: p => starsOf(p) >= 75 },
  { id: "bow", name: "Fancy Bow", emoji: "🎀", desc: "Read 5 stories", check: p => p.storiesRead >= 5 },
];

// Award anything newly earned. Returns the updated progress plus the rewards
// to celebrate, in display order (stickers & outfits first).
export function applyRewards(progress: Progress): { progress: Progress; rewards: EarnedReward[] } {
  const p: Progress = { ...progress };
  const rewards: EarnedReward[] = [];
  const award = (list: Reward[], field: "badges" | "stickers" | "outfits", type: RewardType, base: string[] = []) => {
    const owned = new Set([...p[field], ...base]);
    for (const item of list) {
      if (!owned.has(item.id) && item.check(p)) {
        owned.add(item.id);
        rewards.push({ type, id: item.id });
      }
    }
    p[field] = [...owned];
  };
  award(BADGES, "badges", "badge");
  award(STICKERS, "stickers", "sticker");
  award(OUTFITS, "outfits", "outfit", ["none"]);
  const order: Record<RewardType, number> = { sticker: 0, outfit: 1, badge: 2 };
  rewards.sort((a, b) => order[a.type] - order[b.type]);
  return { progress: p, rewards };
}

export function findReward({ type, id }: EarnedReward): Reward | Sticker | null {
  const list: Reward[] = type === "badge" ? BADGES : type === "sticker" ? STICKERS : OUTFITS;
  return list.find(x => x.id === id) || null;
}

export const isBadgeEarned = (id: string, p: Progress) => !!BADGES.find(b => b.id === id)?.check(p);
