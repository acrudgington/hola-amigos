# ¡Hola, Amigo! — Learn Spanish ☀️

An interactive Spanish learning app for kids aged 6+, taking them from absolute zero through A1 to A2 level.

## 🌟 Features

### Learning content
- **200 lessons** across 22 themed worlds: lessons 1–100 (Starter Island to Repaso Total) cover Pre-A1 to A1, and lessons 101–200 (Lo que he hecho to ¡Fiesta A2!) cover the A2 curriculum
- **1,412 Spanish words and phrases** across vocabulary, grammar, the three past tenses, the future, and everyday situations (shopping, travel, health, opinions)
- **15 activity types**: Learn, Flashcards, Listen, Matching, Drag & Match, Odd One Out, Quiz, Say It! (speaking), **Let's Talk! (conversations)**, Sentences, Word Order, Stories, Warm-ups, Surprises and end-of-world Boss Battles
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

### Look & feel — "mission control for kids"
- **Bento dashboard** home: Sol's mission plan, an "Up next" lesson card, live stat tiles with sparklines, daily quests, an activity feed, a weekly XP chart and word-power meter
- **Sol the study buddy** plans today's mission (review → lesson → treasure chest) as a live, step-by-step checklist
- **Ask Sol** (⌘K / Ctrl+K): search all 1,412 words and 200 lessons; tap a word to hear it
- **Journey map** with world tabs: flip through the 22 worlds, each with its own illustrated banner and winding path
- **Night and Day themes**: crisp, flat surfaces on a dot-grid canvas, with a custom SVG icon set
- **Motion**: spring animations, page transitions, typing text, flowing paths, floating "+XP" pop-ups
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

### Useful commands

| Command | What it does |
|---|---|
| `npm run dev` | Start the app locally with live reload |
| `npm run typecheck` | Strict TypeScript check of the whole app |
| `npm test` | Unit tests (Vitest): progress rules, rewards, lesson flow, storage, content |
| `npm run content:check` | Validate every lesson file in `content/` |
| `npm run test:e2e` | Real-browser tests on phone and desktop sizes (Playwright) |
| `npm run test:emulators` | Security-rules and cloud-account tests against the Firebase emulators (needs Java) |
| `npm run emulators` | Run local Firebase Auth + Firestore for development |
| `npm run build` | Typecheck, then build the installable app into `dist/` |
| `npm run ci` | Everything CI runs, except the browser tests |

The first time you run the browser tests on a new machine, install the browser with `npx playwright install chromium`.

GitHub Actions (`.github/workflows/ci.yml`) runs all of this on every push and pull request.

## "I can…" goals and levels

`content/units.json` groups the 200 lessons into 22 units (one per world) with 99
plain-English goals such as *"I can say what I like and don't like"*, each with a
Spanish example and the lessons that teach it. A goal counts as **achieved** when its
lessons are finished **and** the child reliably knows at least 60% of their words
(`src/domain/goals.ts`). Parents see progress goal by goal in the grown-up dashboard;
children see "Things I can do in Spanish" on their profile.

Levels are honest CEFR bands: worlds 1–2 are **Pre-A1**, worlds 3–12 **A1** (goals in
them that introduce A2 grammar are marked **A2 taster**), and worlds 13–22 are **A2**,
following the Instituto Cervantes A2 inventory: the present perfect, the indefinido
(regular and irregular), the imperfect, the future, object pronouns, commands,
comparisons and everyday tasks such as shopping, travel and the doctor.
The content check fails if any lesson isn't covered by exactly one goal.

## Adaptive practice

`src/domain/memory.ts` keeps a picture of how well each word is known:
recognising it (Spanish → English), recalling it (English → Spanish), how often it's
been got wrong, and how much it has faded since it was last seen.

- **Sol's mix** (the Practise tab) builds a personal 10-question session: tricky words
  (fewer choices so they can win them back), words that are due, recall challenges for
  words they already recognise, then a refresh of earlier lessons, weakest first.
- **Difficulty adapts while playing**: after 2 misses in a row the next question has 3
  choices and the word is read aloud as a hint; after 4 right in a row it goes up to 5–6
  choices, all look-alikes from the same lesson. Wrong answers are drawn only from words
  the child has learned.
- **Warm-ups** use the child's weakest earlier words.
- Parents see the **words their child finds tricky** in the grown-up dashboard.

## Placement check ("Find my level")

New learners are asked whether Spanish is new to them. Children who know some can take
a short check (`src/domain/placement.ts`): 3 questions per world, 2 right passes it;
worlds 1–2 in turn, then jumps of two (4, 6, 8…), checking the world in between after a
missed jump. Beginners finish in 3–6 questions, and nobody sees more than 24. There's an
"I don't know" button and no right/wrong feedback, so children don't guess their way
past lessons they need. Placement unlocks lessons up to their level **without** awarding
stars or claiming "I can…" goals. It can be retaken from the child's "Me" page, and
parents see the result in the dashboard.

## Spanish stories

`content/stories.json` has one story per unit (12), written in Castilian Spanish with
the vocabulary that unit teaches, each with an English translation per sentence and
3 questions. The **Stories** tab is a bookshelf; a story unlocks when its world is
finished (or placed past). The reader reads aloud in the Castilian voice, highlighting
each sentence, with an English switch. `npm run content:story-vocab` shows how much of
each story the child already knows by then (77–97%) and lists the new words;
`npm run content:grammar` checks every story sentence.

## Chants and rhymes

`content/chants.json` has 8 short rhyming chants (greetings, counting to ten, colours,
"Cabeza, hombros, rodillas y pies", the days of the week, the weather, bedtime and the
seasons). Sol and Luna take turns saying each line in their own Spanish voices over a
soft synthesised beat, with the line lit up on screen; **Your turn** mode pauses after
each line so the child can say it back. They're spoken in rhythm, not sung (the AI voices
can't sing); real recordings could replace the voices later without changing the screen.
A chant opens as soon as the child reaches its world.

## Avatars

Children make their own avatar (`src/domain/avatar.ts`, `components/AvatarMaker.tsx`):
24 characters in 3D (children and superheroes in five skin tones, animals, a robot, a
dinosaur…), 8 background colours and 10 extras (crown, cap, bow, headphones…). It's
saved as a short code like `av1:0a3c2`, which fits the existing database rules, and
older single-emoji avatars still display. Change it any time from the ✏️ on the "Me" page.

## Editing lessons

All course content lives in `content/` as plain JSON, so it can be edited without touching code:

- `content/worlds.json`: the 22 worlds (name, colour, lesson range, scenery)
- `content/lessons/world-01.json` … `world-12.json`: each world's lessons (words, phrase, fun fact, sentences, quiz questions, story)
- `content/surprises.json`: the surprise cards

Spanish is **Castilian (Spain)**: the `say` pronunciation guides use Castilian sounds (e.g. *GRAH-thyass*).

After editing, run `npm run content:check`. It checks every file against the schema (`src/content/schema.ts`) and teaching rules: lesson ids run 1–100 with no gaps, sentence tiles match their answers, quiz answers point at a real option, and so on. CI runs the same check, so broken content can't be merged.

## Architecture

```
src/
├── content/      Course loader + schema (content itself is in /content)
├── domain/       Pure rules: progress, XP, streaks, spaced repetition, rewards
├── services/     Accounts & storage behind interfaces (on-device or Firebase)
├── state/        Navigation & lesson-flow state machine, progress store, hooks
├── lib/          Speech, sound, journeys, Sol's mission planner, preferences
├── components/   Shell, widgets, Ask Sol palette, icons, mascots, UI kit
├── games/        The 14 activity types
└── screens/      One file per screen
```

- **Screens never touch storage directly.** They go through `services` (`src/services/types.ts`), whose methods are all async. That lets a cloud backend replace on-device storage without changing any screen.
- **Progress changes are pure functions** (`src/domain/progress.ts`) applied through one store (`src/state/useProgress.ts`). The store awards rewards, renders immediately, and queues saves so they always land in order.
- **Navigation is a pure state machine** (`src/state/nav.ts`). Every transition (start lesson, finish activity, exit…) is unit tested.
- **Product settings live in `src/config.ts`:** Castilian Spanish, pricing (€20 a year; free during early access), the free tier and which backend to use.

## Deploy to Vercel (Recommended — Free)

1. Push this folder to a GitHub repository
2. Go to vercel.com and sign in with GitHub
3. Click "New Project" → select your repo
4. Vercel auto-detects Vite — click "Deploy"
5. Live at `your-project.vercel.app` in ~60 seconds

## Deploy to Netlify / Cloudflare Pages

Same process — connect your GitHub repo. Build command: `npm run build`. Publish directory: `dist`.

## How Family Accounts Work

- A **parent or guardian** signs up (email + password) and agrees to the privacy notice. Their consent is recorded.
- From parent home, **add child profiles**: just a first name and an animal avatar.
- Tap a child to start their learning. Switch children anytime with the 👥 button.
- The **grown-up dashboard** shows every child's progress. Its *Account & privacy* panel lets the parent download all their data, reset their password, read the privacy notice, or permanently delete the account.

Two backends, chosen with `VITE_BACKEND` at build time:

| | `local` (default) | `firebase` |
|---|---|---|
| Where data lives | This device only | Firebase (database in Madrid, Spain) with an offline copy on each device |
| Works across devices | No | Yes |
| Password reset | No | Yes, by email |
| Setup | None | ~20 minutes: see **[FIREBASE_SETUP.md](FIREBASE_SETUP.md)** |

Switching an existing install to Firebase is safe: when a parent signs up with the same email, the app offers to bring the children saved on that device into the new account.

## Installing as a PWA

On iPhone/iPad: open the site in Safari → tap Share → "Add to Home Screen"
On Android: open in Chrome → tap menu → "Install app" or "Add to Home Screen"
On Desktop: Chrome/Edge will show an install icon in the address bar

## Tech Stack

- React 18 + TypeScript (strict) + Vite 6
- Framer Motion (animations)
- Zod (content validation), Vitest (unit tests), Playwright (browser tests)
- vite-plugin-pwa / Workbox (installable, offline-ready app)
- Fredoka + Nunito fonts (Google Fonts)
- Plain CSS design system with CSS variables (`src/styles.css`)
- Web Speech API (TTS + speech recognition)
- localStorage (persistent)

## License

Built for personal/educational use.

## Weekly report and Learn together

- **Weekly report.** The grown-up dashboard has a "This week" card for each
  child, with email, share and copy buttons. It is built by
  `src/domain/weeklyReport.ts` from daily activity counts (`doneByDay`), when
  each word was first met (`first`) and when each goal was achieved (`goalsAt`).
  `WEEKLY_EMAIL.md` explains how to send it automatically.
- **Learn together** (Practise tab). A child and a grown-up take turns on one
  device, and their partner checks each answer. Grown-ups get Castilian
  pronunciation tips worked out from the spelling (`src/domain/pronunciation.ts`).
  Only the child's answers count towards their word memory.

## Conversations ("Let's talk!")

Every one of the 200 lessons ends its practice with a short role-play
(`content/conversations/world-XX.json`, 3–5 turns each): Sol or Luna asks a
question in their own voice, as a waiter, a doctor, a ticket seller, Grandma on
the phone… The child answers **out loud** or taps an answer.

- Spoken answers are judged for a *sensible reply*, not an exact match
  (`src/domain/conversation.ts`): a reply counts if it uses one of the turn's key
  words (so personal answers like "Me llamo Tomás" work) or is close to a model
  answer. After two tries the model answer is shown and spoken, and the chat goes on.
- Tap options are the model answer plus replies that don't fit the question, so
  tapping also practises *what makes sense in a conversation*.
- The content check makes sure every lesson has exactly one conversation; the
  authoring rules (every answer contains a key word, no wrong option does) keep
  the judging fair.
- **Learn together → Chat cards** shows the same questions to a grown-up, with an
  example answer and its English, so families can have the conversation at home.
