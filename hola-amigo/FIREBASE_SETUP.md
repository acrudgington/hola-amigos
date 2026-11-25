# Setting up Firebase (parent accounts + cloud sync)

Without Firebase the app works fully **on one device**. Turning Firebase on gives
families real accounts: log in on any phone, tablet or computer and every
child's progress is there, password resets work, and nothing is lost if the
browser is cleared. It takes about 20 minutes and is free at the start
(Firebase's free "Spark" plan covers thousands of families).

You'll need: a Google account, and the site deployed somewhere (e.g. Vercel).

---

## 1. Create the project

1. Go to **console.firebase.google.com** → **Create a project**.
2. Name it, e.g. `hola-amigos`. Note the **project ID** it shows underneath
   (e.g. `hola-amigos-1a2b3`). You'll need it later.
3. When asked about **Google Analytics, turn it off.** The app is for children
   and promises no tracking.

## 2. Turn on email + password sign-in

1. In the left menu: **Build → Authentication → Get started**.
2. **Sign-in method** tab → **Email/Password** → switch on the first toggle
   (leave "Email link" off) → **Save**.
3. **Templates** tab (optional but recommended): set the sender name to
   `¡Hola, Amigo!` and check the wording of the *password reset* and
   *email address verification* emails. The app sends both.
4. **Settings** tab → **Authorised domains** → **Add domain** → add your live
   site's domain, e.g. `hola-amigos.vercel.app` (and your own domain later).
   `localhost` is already there.

## 3. Create the database (in Spain)

1. **Build → Firestore Database → Create database**.
2. **Location: choose `europe-southwest1 (Madrid)`**. This keeps families'
   data in Spain and **can't be changed later**.
3. Choose **Start in production mode** (everything locked). Step 5 uploads the
   app's own rules, which let each parent see only their own family.

## 4. Register the web app and copy its settings

1. Click the ⚙️ next to *Project Overview* → **Project settings**.
2. Under **Your apps**, click the **`</>`** (Web) icon. Nickname: `hola-amigos-web`.
   Leave "Firebase Hosting" unticked → **Register app**.
3. You'll see a `firebaseConfig = { … }` block. You need four of its values:

   | In the Firebase config | Environment variable |
   |---|---|
   | `apiKey` | `VITE_FIREBASE_API_KEY` |
   | `authDomain` | `VITE_FIREBASE_AUTH_DOMAIN` |
   | `projectId` | `VITE_FIREBASE_PROJECT_ID` |
   | `appId` | `VITE_FIREBASE_APP_ID` |

   These values identify your project to the browser; they aren't passwords.
   What protects the data is the security rules from step 5.

## 5. Upload the security rules

From the `hola-amigo` folder on your computer:

```bash
npx firebase login
```

```bash
npx firebase use --add
```

Pick your project from the list and give it the alias `default`. This updates
`.firebaserc`, which you can commit.

```bash
npm run firebase:deploy-rules
```

*(No terminal handy? In the console open **Firestore Database → Rules**, paste
the whole of `firestore.rules`, and press **Publish**. Do this again whenever
that file changes.)*

## 6. Switch the live site over

The live site must be built from code that includes Firebase (merged to `main`).

1. In **Vercel → your project → Settings → Environment Variables**, add these
   five. Choose type **Config** (not Secret): `VITE_` values end up inside the
   website anyway, and Config lets you check them later. Paste the **real
   values** from step 4, without the quote marks.

   | Key | Value (example shape) |
   |---|---|
   | `VITE_BACKEND` | `firebase` (literally this word) |
   | `VITE_FIREBASE_API_KEY` | `AIzaSy…` |
   | `VITE_FIREBASE_AUTH_DOMAIN` | `your-project.firebaseapp.com` |
   | `VITE_FIREBASE_PROJECT_ID` | `your-project` |
   | `VITE_FIREBASE_APP_ID` | `1:1234567890:web:abc…` |

   This is the Firebase key, not the Google text-to-speech key used for voices.
2. In **Firebase → Authentication → Settings → Authorised domains**, add your
   site's address exactly as Vercel shows it (no `https://`).
3. The variables are baked in when the site is built, so they take effect on the
   next deployment: either merge new code to `main`, or use
   **Deployments → ⋯ → Redeploy**.

Check it works: open the live site, sign up as a new parent, add a child, play a
lesson, then log in on a second device. The child and their stars should be
there. You'll also see the account under **Authentication → Users** and the
data under **Firestore Database → Data**.

**Families who used the app before** created their accounts on one device. They
sign up again with the same email. The app spots their children on that device
and offers to *"bring them in"* with all their progress.

## 7. Lock down the API key (recommended)

1. Go to **console.cloud.google.com** → choose the same project →
   **APIs & Services → Credentials** → click the key named *Browser key
   (auto created by Firebase)*.
2. **Application restrictions → Websites**: add `https://your-domain/*`
   (e.g. `https://hola-amigos.vercel.app/*`) and `http://localhost:5173/*`
   for development → **Save**.

This stops other websites from using your project's key. Leave "API
restrictions" alone unless you know which Firebase APIs to keep.

## 8. Before launch (Spain)

- [ ] Fill in your legal or trading name, NIF/NIE and postal address in
      `src/config.ts` (`PRIVACY.controller`). They appear in the privacy notice.
- [ ] Have the privacy notice reviewed (`legal/privacy-notice.md`), then change
      `PRIVACY.version` so it no longer ends in `-draft`.
- [ ] Spanish law (LSSI) requires an *aviso legal* on the website with the same
      business details, and consumer law expects terms to be available in Spanish.
- [ ] Check Google's data processing terms are accepted for the project
      (Firebase console → ⚙️ Project settings, look for the **Privacy** / data
      processing section) and add your contact details there.
- [ ] Spain has no yearly registration fee for data protection (unlike the UK's
      ICO). Keep a simple record of what data you hold and why (the notice covers it).
- [ ] Optional: **Firebase App Check** (reCAPTCHA Enterprise) to block bots.
- [ ] When you upgrade from the free Spark plan, set a small budget alert in
      Google Cloud **Billing → Budgets**.

---

## For developers: running locally against Firebase

You don't need a real project to develop. The local emulators need Java 11+:

```bash
npm run emulators
```

Then in a second terminal create `.env.local` (git ignores it):

```
VITE_BACKEND=firebase
VITE_FIREBASE_API_KEY=demo-key
VITE_FIREBASE_AUTH_DOMAIN=localhost
VITE_FIREBASE_PROJECT_ID=demo-hola-amigos
VITE_FIREBASE_APP_ID=demo-app
VITE_FIREBASE_EMULATOR_HOST=127.0.0.1
```

```bash
npm run dev
```

The security rules and the cloud services have their own tests, which start the
emulators by themselves:

```bash
npm run test:emulators
```

### How the data is laid out

```
parents/{uid}                                     name, email, consent record, plan
parents/{uid}/children/{childId}                  first name + animal avatar only
parents/{uid}/children/{childId}/progress/current stars, words, streaks, badges…
```

- Each parent can read and write **only their own tree**; everything else is denied.
- The `plan` field can't be changed from the app. Payments (step 5) will set it
  from the server.
- Children never have their own logins, emails or any other personal details.
- Progress saves are batched (one write per child after a short pause, and
  straight away when the app is closed) and work offline: they sync when the
  device is back online.
