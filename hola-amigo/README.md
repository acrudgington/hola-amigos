# ¡Hola, Amigo! — Learn Spanish ☀️

An interactive Spanish learning app for kids aged 6+, taking them from absolute zero through A1 to A2 level.

## Features

- **32 lessons** across 4 themed worlds (Starter Island → Word Town → Sentence City → Story Land)
- **6 game types**: Flashcards, Matching, Quiz, Sentence Builder, Story Reader, Gap-fill
- **3 milestone challenges**: A1 Final (Lesson 16), Sentence Champion (Lesson 24), A2 Final (Lesson 32)
- **User accounts**: Sign up, log in, log out — each user has their own progress
- **Persistent progress**: Stars and lesson completion saved per user (survives browser refresh)
- **Profile page**: Stats, progress bar, star count
- **Fun design**: Confetti, animations, floating emoji, colourful themes, kid-friendly UI

## Quick Start (Local Development)

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Then open http://localhost:5173 in your browser.

## Deploy to Vercel (Recommended — Free)

1. Push this folder to a GitHub repository
2. Go to [vercel.com](https://vercel.com) and sign in with GitHub
3. Click "New Project" → select your repo
4. Vercel auto-detects Vite — just click "Deploy"
5. Your site is live at `your-project.vercel.app` within 60 seconds

### Custom domain (optional)
In Vercel dashboard → Settings → Domains → add your domain (e.g. `holaamigo.es`)
Then update your domain's DNS to point at Vercel's servers (Vercel shows you exactly what to add).

## Deploy to Netlify (Also Free)

1. Push to GitHub
2. Go to [netlify.com](https://netlify.com) → "Add new site" → "Import from Git"
3. Select your repo
4. Build command: `npm run build`
5. Publish directory: `dist`
6. Click "Deploy"

## Deploy to Cloudflare Pages (Also Free)

1. Push to GitHub
2. Go to [pages.cloudflare.com](https://pages.cloudflare.com)
3. Create project → connect GitHub repo
4. Framework preset: Vite
5. Build command: `npm run build`
6. Output directory: `dist`

## How User Accounts Work

User accounts and progress are stored in the browser's localStorage. This means:

- ✅ Multiple users can sign up on the same device with separate progress
- ✅ Progress survives browser refreshes and closing/reopening
- ✅ No server or database needed — it's a fully static site
- ⚠️ Progress is per-device (if a child uses a different device, they'd need to start fresh)
- ⚠️ Clearing browser data will remove accounts

### Want cloud-based accounts?
If you need progress to sync across devices, you'd add a backend service like:
- **Firebase** (free tier) — add Firebase Auth + Firestore
- **Supabase** (free tier) — add Supabase Auth + Database
This is a straightforward upgrade — the app's auth flow is already structured for it.

## Tech Stack

- React 18
- Vite 6
- No external UI libraries — everything is custom-built
- Nunito font (Google Fonts)
- Pure CSS animations (no animation library needed)

## Project Structure

```
hola-amigo/
├── index.html          # Entry HTML with fonts & global CSS
├── package.json        # Dependencies & scripts
├── vite.config.js      # Vite configuration
├── .gitignore
├── README.md
└── src/
    ├── main.jsx        # React entry point
    └── App.jsx         # Complete app (auth + lessons + games)
```

## License

Built for personal/educational use.
