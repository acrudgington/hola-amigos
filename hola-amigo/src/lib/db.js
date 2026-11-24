// ============================================================
// LOCAL STORAGE — parent accounts, child profiles and progress
// ============================================================
// Storage schema (unchanged from the original app, so existing saves load):
//   hola_parents        → [{ email, name, passHash, created, children: [childId...] }]
//   hola_children       → { [childId]: { id, parentEmail, name, avatar, created } }
//   hola_progress_<id>  → progress object (see DEFAULT_PROGRESS)
//   hola_session        → { parentEmail, activeChildId }
//
// Progress helpers below are *pure*: they take a progress object and return a
// new one. The app reads the latest copy from storage, applies one of these,
// and writes it back in one step — so no update can overwrite another.

import { todayKey } from "./utils.js";

const read = (key, fallback) => {
  try {
    const v = localStorage.getItem(key);
    return v == null ? fallback : JSON.parse(v);
  } catch {
    return fallback;
  }
};
const write = (key, value) => {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage full or blocked */ }
};

export const DEFAULT_PROGRESS = Object.freeze({
  stars: {}, lastLesson: 1, streak: 0, lastActive: null, timeSpent: 0,
  badges: [], lessonsDone: 0, correctAnswers: 0, wordMemory: {},
  dailyGoal: 3, dailyDate: null, dailyCount: 0, reviewsDone: 0,
  micUses: 0, storiesRead: 0,
  xp: 0, xpByDay: {}, bestCombo: 0, comboDay: null, comboToday: 0, chestDay: null, events: [],
  stickers: [], outfits: [], solOutfit: null, lunaOutfit: null,
});

// ---------- password hashing ----------
// Passwords used to be stored as plain text. They're now salted + SHA-256
// hashed. Old accounts are upgraded the first time they log in.
async function hashPassword(email, pass) {
  const input = `hola-amigo:${email}:${pass}`;
  if (globalThis.crypto?.subtle) {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
    return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
  }
  // Non-secure context fallback (e.g. plain http on a LAN): FNV-1a.
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) { h ^= input.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return `fnv-${(h >>> 0).toString(16)}`;
}

export const db = {
  // ---------- parents ----------
  getParents: () => read("hola_parents", []),
  saveParents: p => write("hola_parents", p),
  findParent: email => db.getParents().find(p => p.email === email) || null,

  async createParent(name, email, pass) {
    const parents = db.getParents();
    if (parents.some(p => p.email === email)) return null;
    const parent = { email, name, passHash: await hashPassword(email, pass), created: Date.now(), children: [] };
    db.saveParents([...parents, parent]);
    return parent;
  },

  // Returns the parent on success, or an error string.
  async login(email, pass) {
    const parents = db.getParents();
    const idx = parents.findIndex(p => p.email === email);
    if (idx < 0) return "No account found with this email.";
    const parent = parents[idx];
    const hash = await hashPassword(email, pass);
    if (parent.passHash) {
      if (parent.passHash !== hash) return "Wrong password! Try again.";
    } else {
      // Legacy plain-text account → verify then upgrade.
      if (parent.pass !== pass) return "Wrong password! Try again.";
      const { pass: _drop, ...rest } = parent;
      parents[idx] = { ...rest, passHash: hash };
      db.saveParents(parents);
    }
    return parents[idx];
  },

  // ---------- children ----------
  getChildren: () => read("hola_children", {}),
  saveChildren: c => write("hola_children", c),
  getChild: id => db.getChildren()[id] || null,
  getChildrenOf(parentEmail) {
    const all = db.getChildren();
    const parent = db.findParent(parentEmail);
    return (parent?.children || []).map(id => all[id]).filter(Boolean);
  },
  createChild(parentEmail, name, avatar) {
    const parents = db.getParents();
    const pIdx = parents.findIndex(p => p.email === parentEmail);
    if (pIdx < 0) return null;
    const id = `c_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const child = { id, parentEmail, name: name.trim(), avatar: avatar || "🦊", created: Date.now() };
    db.saveChildren({ ...db.getChildren(), [id]: child });
    parents[pIdx] = { ...parents[pIdx], children: [...(parents[pIdx].children || []), id] };
    db.saveParents(parents);
    db.saveProgress(id, { ...DEFAULT_PROGRESS });
    return child;
  },
  deleteChild(childId) {
    const children = db.getChildren();
    const child = children[childId];
    if (!child) return;
    delete children[childId];
    db.saveChildren(children);
    const parents = db.getParents().map(p =>
      p.email === child.parentEmail ? { ...p, children: (p.children || []).filter(id => id !== childId) } : p);
    db.saveParents(parents);
    try { localStorage.removeItem(`hola_progress_${childId}`); } catch { /* ignore */ }
  },

  // ---------- session ----------
  getSession: () => read("hola_session", null),
  setSession: s => write("hola_session", s),
  clearSession: () => { try { localStorage.removeItem("hola_session"); } catch { /* ignore */ } },

  // ---------- progress ----------
  getProgress: childId => migrate({ ...DEFAULT_PROGRESS, ...(read(`hola_progress_${childId}`, null) || {}) }),
  saveProgress: (childId, p) => write(`hola_progress_${childId}`, p),
};

// ============================================================
// PURE PROGRESS TRANSFORMS
// ============================================================

// Record today's visit for the day streak.
export function touchStreak(p, now = Date.now()) {
  const today = new Date(now).toDateString();
  const last = p.lastActive ? new Date(p.lastActive).toDateString() : null;
  if (last === today) return p;
  const yesterday = new Date(now - 86400000).toDateString();
  return { ...p, streak: last === yesterday ? (p.streak || 0) + 1 : 1, lastActive: now };
}

// The streak shown on screen: if the child skipped a whole day the stored
// streak is stale, so show 0 until they practise again.
export function liveStreak(p, now = Date.now()) {
  if (!p?.lastActive) return 0;
  const last = new Date(p.lastActive).toDateString();
  const today = new Date(now).toDateString();
  const yesterday = new Date(now - 86400000).toDateString();
  return last === today || last === yesterday ? p.streak || 0 : 0;
}

// ---------- spaced repetition (Leitner boxes 1–5) ----------
// Interval per box, in days. Box 1 = due next day, box 5 = due in ~3 weeks.
export const BOX_INTERVALS = [0, 1, 2, 4, 9, 21];

export function recordWord(p, es, en, correct, now = Date.now()) {
  if (!es) return p;
  const prev = p.wordMemory?.[es] || { box: 0, seen: 0, en };
  const box = correct ? Math.min(5, (prev.box || 0) + 1) : 1;
  return {
    ...p,
    wordMemory: { ...(p.wordMemory || {}), [es]: { box, seen: (prev.seen || 0) + 1, en: en || prev.en || "", last: now } },
  };
}

// Words whose review interval has elapsed, most overdue first.
export function getDueWords(p, now = Date.now()) {
  const due = [];
  for (const [es, w] of Object.entries(p.wordMemory || {})) {
    const dueAt = (w.last || 0) + (BOX_INTERVALS[w.box] || 0) * 86400000;
    if (now >= dueAt) due.push({ es, en: w.en, box: w.box, overdue: now - dueAt });
  }
  return due.sort((a, b) => b.overdue - a.overdue);
}

// ---------- daily goal ----------
export function getDaily(p) {
  const goal = p.dailyGoal || 3;
  const count = p.dailyDate === todayKey() ? p.dailyCount || 0 : 0;
  return { count, goal, met: count >= goal };
}

export function bumpDaily(p) {
  const before = getDaily(p);
  const count = before.count + 1;
  return {
    progress: { ...p, dailyDate: todayKey(), dailyCount: count },
    justMet: !before.met && count >= before.goal,
  };
}

// Stars for one run of a guided lesson, from how well it went.
export function starsForScore(correct, total) {
  if (!total) return 1;
  const pct = correct / total;
  return pct >= 0.9 ? 3 : pct >= 0.7 ? 2 : 1;
}

// Record a lesson result: keeps the child's best star count (max 3).
export function awardStars(p, lessonId, earned) {
  const cur = p.stars?.[lessonId] || 0;
  const best = Math.min(3, Math.max(cur, earned));
  return {
    ...p,
    stars: { ...(p.stars || {}), [lessonId]: best },
    lastLesson: Math.max(p.lastLesson || 1, lessonId),
    lessonsDone: (p.lessonsDone || 0) + 1,
  };
}

// Undo rewards that an old bug handed out (see rewards.js perfect_world).
export function repairProgress(p, isEarned) {
  if ((p.badges || []).includes("perfect_world") && !isEarned("perfect_world", p)) {
    return { ...p, badges: p.badges.filter(b => b !== "perfect_world") };
  }
  return p;
}

export const addStat = (p, key, amount = 1) => ({ ...p, [key]: (p[key] || 0) + amount });

// ============================================================
// XP, LEVELS & DAILY QUESTS
// ============================================================
export const XP = { correct: 10, activity: 15, lesson: 50, perStar: 20, review: 25, combo5: 15, chest: 50 };

// Local calendar date as YYYY-MM-DD (not UTC, so "today" matches the child's day).
export const dayKey = (t = Date.now()) => {
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

// Saves from before XP existed get a fair starting total.
function migrate(p) {
  if (p.xp === 0 && !Object.keys(p.xpByDay || {}).length && (p.correctAnswers || Object.keys(p.stars || {}).length)) {
    const stars = Object.values(p.stars || {}).reduce((a, b) => a + b, 0);
    return { ...p, xp: (p.correctAnswers || 0) * XP.correct + stars * XP.perStar + Object.keys(p.stars).length * XP.lesson };
  }
  return p;
}

export function addXP(p, amount, now = Date.now()) {
  if (!amount) return p;
  const k = dayKey(now);
  return { ...p, xp: (p.xp || 0) + amount, xpByDay: { ...(p.xpByDay || {}), [k]: ((p.xpByDay || {})[k] || 0) + amount } };
}

// Level L starts at 60·(L−1)·L XP: 0, 120, 360, 720, 1200, …
export const xpForLevel = L => 60 * (L - 1) * L;
export function levelInfo(xp = 0) {
  let L = 1;
  while (xp >= xpForLevel(L + 1)) L++;
  const base = xpForLevel(L), next = xpForLevel(L + 1);
  return { level: L, into: xp - base, span: next - base, pct: (xp - base) / (next - base), toNext: next - xp };
}

export const LEVEL_TITLES = ["Explorador", "Aprendiz", "Amigo", "Viajero", "Estrella", "Campeón", "Héroe", "Leyenda", "Maestro", "Superestrella"];
export const levelTitle = L => LEVEL_TITLES[Math.min(LEVEL_TITLES.length - 1, Math.floor((L - 1) / 2))];

// Last 7 days of XP, oldest first.
export function weekXP(p, now = Date.now()) {
  return Array.from({ length: 7 }, (_, i) => {
    const t = now - (6 - i) * 86400000;
    return { key: dayKey(t), date: new Date(t), xp: (p.xpByDay || {})[dayKey(t)] || 0 };
  });
}

export function recordCombo(p, combo, now = Date.now()) {
  const k = dayKey(now);
  const today = p.comboDay === k ? p.comboToday || 0 : 0;
  return { ...p, bestCombo: Math.max(p.bestCombo || 0, combo), comboDay: k, comboToday: Math.max(today, combo) };
}

export function dailyQuests(p, now = Date.now()) {
  const k = dayKey(now);
  const daily = getDaily(p);
  const xpToday = (p.xpByDay || {})[k] || 0;
  const combo = p.comboDay === k ? p.comboToday || 0 : 0;
  const quests = [
    { id: "acts", emoji: "🎯", label: `Finish ${daily.goal} activities`, value: Math.min(daily.count, daily.goal), goal: daily.goal },
    { id: "xp", emoji: "⚡", label: "Earn 100 XP", value: Math.min(xpToday, 100), goal: 100 },
    { id: "combo", emoji: "🔥", label: "Get a 5-answer combo", value: Math.min(combo, 5), goal: 5 },
  ];
  const allDone = quests.every(q => q.value >= q.goal);
  return { quests, allDone, claimed: p.chestDay === k };
}

export function claimChest(p, now = Date.now()) {
  const q = dailyQuests(p, now);
  if (!q.allDone || q.claimed) return p;
  return { ...addXP(p, XP.chest, now), chestDay: dayKey(now) };
}

// ============================================================
// ACTIVITY FEED — the latest things the child achieved (newest first)
// ============================================================
export function logEvent(p, ev, now = Date.now()) {
  return { ...p, events: [{ ...ev, t: now }, ...(p.events || [])].slice(0, 40) };
}

export function timeAgo(t, now = Date.now()) {
  const s = Math.max(0, Math.round((now - t) / 1000));
  if (s < 45) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24);
  return d === 1 ? "yesterday" : `${d} days ago`;
}
