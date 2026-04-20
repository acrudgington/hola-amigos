# ¡Hola, Amigo! — Learn Spanish ☀️

An interactive Spanish learning app for kids aged 6+, taking them from absolute zero through A1 to A2 level.

## 🌟 Features

### Learning content
- **32 lessons** across 4 themed worlds (Starter Island → Word Town → Sentence City → Story Land)
- **300+ Spanish words** across vocabulary, phrases, grammar, past, future, and everyday situations
- **7 activity types**: Flashcards, Matching, Quiz, Say It! (speaking), Sentence Builder, Stories, Songs
- **3 milestone challenges**: A1 Final (Lesson 16), Sentence Champion (Lesson 24), A2 Final (Lesson 32)
- **Interactive stories** on every lesson, written around that lesson's vocabulary
- **6 classic Spanish songs** with karaoke-style highlighted lyrics (Los pollitos dicen, Un elefante, De colores, etc.)

### Audio & voice
- **🔊 Listen buttons** on every flashcard and phrase — hear words in Spanish
- **🎤 Say It! game** — kids say words aloud; app listens and gives thumbs up/down
- Uses native browser speech APIs (no paid services needed)

### Family accounts & progress
- **Parent accounts** with email + password login
- **Multiple child profiles** per family — each child has their own avatar, name, and separate progress
- **Parent Dashboard** showing all children's stats in one place
- **Persistent progress** saved locally (survives browser refresh)

### Gamification
- **⭐ Stars** earned per activity (up to 3 per lesson)
- **🔥 Daily streaks** — consecutive days of practice
- **🏆 20 unlockable badges** — trophy cabinet with milestones (First Star, A1 Champion, Week Warrior, Song Star, etc.)
- **🎉 Confetti** celebrations on every star

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
- Nunito font (Google Fonts)
- Web Speech API (TTS + speech recognition)
- localStorage (persistent)
- Service Worker (offline support)
- No external UI libraries — everything custom built

## Project Structure

```
hola-amigo/
├── index.html              # Entry HTML with PWA manifest, SW registration
├── public/
│   ├── manifest.json       # PWA manifest
│   ├── sw.js               # Service worker for offline
│   ├── icon-192.png        # PWA icon
│   └── icon-512.png        # Large PWA icon
├── src/
│   ├── main.jsx            # React entry
│   └── App.jsx             # Complete app (~1400 lines)
├── package.json
├── vite.config.js
└── README.md
```

## License

Built for personal/educational use.
