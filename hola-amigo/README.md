# ¡Hola, Amigo! — Learn Spanish ☀️

An interactive Spanish learning app for kids aged 6+, taking them from absolute zero through A1 to A2 level.

## 🌟 Features

### Learning content
- **100 lessons** across 12 themed worlds, from Starter Island to Repaso Total
- **800 Spanish words** across vocabulary, phrases, grammar, past, future, and everyday situations
- **14 activity types**: Learn, Flashcards, Listen, Matching, Drag & Match, Odd One Out, Quiz, Say It! (speaking), Sentences, Word Order, Stories, Warm-ups, Surprises and end-of-world Boss Battles
- **Guided lessons** that mix the activities differently in each lesson, scored 1–3 stars
- **Daily review** with spaced repetition (Leitner boxes) so words stick
- **Interactive stories** on every lesson, written around that lesson's vocabulary

### Audio & voice
- **🔊 Listen buttons** on every flashcard and phrase — hear words in Spanish
- **🎤 Say It! game** — kids say words aloud; app listens and gives thumbs up/down
- Uses native browser speech APIs (no paid services needed)

### Family accounts & progress
- **Parent accounts** with email + password login (passwords are hashed, never stored as plain text)
- **Multiple child profiles** per family — each child has their own avatar, name, and separate progress
- **Parent Dashboard** showing all children's stats in one place
- **Persistent progress** saved locally (survives browser refresh)

### Gamification
- **⭐ Stars** per lesson (1–3, based on how well the lesson went; your best score counts)
- **🔥 Daily streaks** — consecutive days of practice
- **🏆 28 badges, 22 collectible stickers and 7 mascot outfits** on the Trophy Shelf
- **⚡ XP & levels**: XP for every right answer, activity and lesson; level-ups get a full-screen celebration
- **🔥 Combos**: answer streaks build a combo meter, with bonus XP every 5 in a row
- **📜 Daily quests** with a treasure chest to open when all three are done
- **📊 Personal dashboard**: weekly XP chart, streak calendar and a "word power" mastery bar
- **🎉 Confetti** celebrations on every star

### Look & feel
- **Two themes**: *Galaxy* (deep-space glass with aurora lights and shooting stars) and *Daylight*
- **Dashboard layout**: sidebar + stats panel on desktop, bottom tab bar on phones
- **Motion everywhere**: spring animations, page transitions, floating "+XP" pop-ups, a tilting "Up next" card, a flowing path on the map
- **Sound effects** synthesised in the browser (no audio files), with a mute button
- Respects the device's *reduce motion* setting

### Mobile & offline
- **Installable PWA** — "Add to Home Screen" on iPhone/iPad/Android
- **Offline mode** — works without internet after first visit
- **Native app feel** — splash screen, custom icon, full-screen mode

## Quick Start (Local Development)

```bash
npm install
npm run dev
```

Open http://localhost:5173 in your browser.

Run the logic tests (course data, stars, streaks, spaced repetition, rewards):

```bash
npm test
```

## Deploy to Vercel (Recommended — Free)

1. Push this folder to a GitHub repository
2. Go to vercel.com and sign in with GitHub
3. Click "New Project" → select your repo
4. Vercel auto-detects Vite — click "Deploy"
5. Live at `your-project.vercel.app` in ~60 seconds

## Deploy to Netlify / Cloudflare Pages

Same process — connect your GitHub repo. Build command: `npm run build`. Publish directory: `dist`.

## How Family Accounts Work

- Sign up creates a **parent account** (email + password)
- From parent home, **add child profiles** — each with a name and avatar
- Click any child to enter their learning experience
- Switch between children anytime with the 👥 button
- **Parent Dashboard** shows all children's progress side-by-side

All data is stored in browser localStorage:
- ✅ Multiple children on one device with isolated progress
- ✅ Survives browser refreshes and closing/reopening
- ⚠️ Per-device storage (doesn't sync across different devices)
- ⚠️ Clearing browser data will remove accounts

### Want cloud sync across devices?
Add Firebase Auth + Firestore or Supabase — the app's data layer is structured for easy upgrade.

## Installing as a PWA

On iPhone/iPad: open the site in Safari → tap Share → "Add to Home Screen"
On Android: open in Chrome → tap menu → "Install app" or "Add to Home Screen"
On Desktop: Chrome/Edge will show an install icon in the address bar

## Tech Stack

- React 18 + Vite 6
- Framer Motion (animations)
- Fredoka + Nunito fonts (Google Fonts)
- Plain CSS design system with CSS variables (`src/styles.css`)
- Web Speech API (TTS + speech recognition)
- localStorage (persistent)
- Service Worker (offline support)

## Project Structure

```
hola-amigo/
├── index.html
├── public/                 # PWA manifest, service worker, icons
├── src/
│   ├── main.jsx            # React entry (+ service worker in production)
│   ├── App.jsx             # Session, navigation and the single progress-saving path
│   ├── styles.css          # Design system: tokens, components, animations
│   ├── data/
│   │   ├── course.js       # 12 worlds, 100 lessons, stories
│   │   └── rewards.js      # Badges, stickers, outfits
│   ├── lib/                # Storage & XP, speech, sound effects, preferences, journey builder
│   ├── components/         # Shell (sidebar/tab bar), widgets & charts, cosmic background, UI kit, Sol & Luna
│   ├── games/              # One file per family of activities
│   └── screens/            # Auth, family, home map, lesson, activity, review…
└── tests/logic.test.js     # node --test
```

## License

Built for personal/educational use.
