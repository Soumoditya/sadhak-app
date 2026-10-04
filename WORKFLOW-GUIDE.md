# Sadhak — Workflow Guide (how to work on this app)

Written for a beginner. This is the "how do I actually do things" companion to PROJECT-GUIDE.md.

---

## A. The golden rule: back up after every change
After any change (yours or an AI's), run this once, in PowerShell, from the project folder
(`C:\Users\HP\.gemini\antigravity-ide\scratch\sadhak-app`):

```
.\scripts\backup.ps1 "short note about what changed"
```

That commits your work, uploads it to GitHub (cloud copy), and saves a local zip. Two safe copies, one command. If PowerShell blocks it the first time, run:
`powershell -ExecutionPolicy Bypass -File scripts\backup.ps1 "note"`

---

## B. How to work with Claude Code on this project (the pro way)
1. **Start each session by telling Claude the goal in plain words.** e.g. "the aarti text looks cramped, fix the spacing" — you don't need technical terms.
2. **Use Plan Mode for anything non-trivial.** Ask: *"make a plan first."* Claude will research and show a plan **before** changing anything. You approve, then it works. This prevents surprises. (Great for redesigns, new features, risky changes.)
3. **For small fixes,** just ask directly — no plan needed.
4. **For design/UX work,** describe the feeling you want ("calm, premium, less cluttered") and point to the screen. Attach screenshots when you can — they help a lot.
5. **Review before shipping.** Ask *"what did you change and is anything risky?"* Claude keeps the app type-checked (`npx tsc --noEmit`) so broken code is caught early.
6. **Always end a work session with a backup** (Section A) and, when you want to test on your phone, a build (Section C).

Tips: keep requests concrete ("on the calendar, the Today button should…"), and if something looks wrong on your phone, send a screenshot — that's the fastest way to a fix.

---

## C. How the app gets onto your phone (builds)
The app is built **in the cloud** by EAS (no need for Android Studio). Two kinds:

- **Test APK (sideload to your phone):**
  ```
  npx eas-cli build --platform android --profile preview
  ```
  When it finishes, the terminal prints a link (and QR code). Download the `.apk`, open it on your phone, allow "install from unknown sources", install. *(The file downloads as `application-<long-id>.apk` — just rename it to `Sadhak.apk` if you like.)*

- **Play Store file (AAB, smaller downloads):**
  ```
  npx eas-cli build --platform android --profile production
  ```
  This makes a `.aab` — the file you upload in Google Play Console. Google then delivers a small, per-phone download to users.

**Before a build:** if you added a new library or native feature, Claude runs `npx expo prebuild --clean` first. For normal code/text changes, that's not needed.

**Version numbers** live in `app.json` (`version` like "1.8.0" and `versionCode` like 9). Bump them for each new release (Claude does this).

---

## C2. Instant (OTA) updates, no reinstall
From v1.11.0 the app has **expo-updates**. Changes to screens, text, design and app logic go straight to phones, no APK needed.

**Easiest: one click on GitHub (set up once)**
1. expo.dev → Account settings → Access tokens → create a token.
2. GitHub repo → Settings → Secrets and variables → Actions → New repository secret: name `EXPO_TOKEN`, paste the token.
3. Actions tab → **Publish OTA update** → Run workflow → pick the branch → Run. It also runs by itself on every push to `main`.

**From a computer:** `npx eas-cli update --channel production --message "what changed"`

Phones download the update in the background and show **Update ready → Restart** (from the first OTA onwards; before that, it applies on the next app start).

Rules:
- An OTA update only reaches builds with the **same app version** (`version` in `app.json`, now 1.12.0). Don't bump the version for an OTA update.
- Adding a library with native code, changing permissions, the app icon or splash still needs a **new build** (Section C). Bump the version then.
- Settings and About show the running update (e.g. "v1.12.0 · update 4 Oct, 3f9a2c1d"), so you can confirm it arrived.

---

## D. The website + privacy policy (Vercel)
- The website repo is `sadhak-web` (public) → shows at `sadhak-app.vercel.app`.
- **Privacy Policy** and **Terms** pages are written and already in the `sadhak-web` repo, plus a secure AI proxy (`api/gemini.js`). They just need to be **deployed once** — see "Your action list" below.
- Google **Play Store requires** a public privacy link. After deploying, use: `https://sadhak-app.vercel.app/privacy`.

---

## E. Your action list (things only you can click — each is quick)
These need your login and can't be automated. Do them when ready; ask Claude if any step is unclear.

**1) Put the website updates live (privacy + terms + AI proxy)**
   - Go to **vercel.com** → your project **`sadhak-app`** → **Settings → Git**.
   - Click **Connect Git Repository** and pick **`Soumoditya/sadhak-web`**. Save.
   - Go to **Deployments** → **Redeploy** (or push any change). Now `sadhak-app.vercel.app/privacy` and `/terms` work, and `/api/gemini` exists.
   - *(If it asks for a Production Branch, choose `main`.)*

**2) Add the AI key to Vercel (so the app doesn't ship it)**
   - Same Vercel project → **Settings → Environment Variables** → Add:
     - Name: `GEMINI_KEY`  ·  Value: *(your Gemini API key)*  · Environment: Production.
   - Save, then **Redeploy**.
   - Tell Claude "the proxy is live" → Claude switches the app to use it and you can then **rotate** (replace) the old key at aistudio.google.com so the old one is dead.

**3) Deploy the database security rules (protects your data)**
   - **Firestore:** Firebase Console → your project → **Firestore Database → Rules** → paste the contents of `firebase/firestore.rules` → **Publish**.
   - **Realtime Database:** Firebase Console → **Realtime Database → Rules** → paste `firebase/database.rules.json` → **Publish**.

**4) (Optional) App icon** — send Claude a 1024×1024 PNG of just the emblem on a **transparent** background; Claude wires it in so the icon fills nicely.

---

## F. If something breaks
- Nothing is ever lost — you have GitHub + local zip backups. To go back to a working version, tell Claude "restore the last good version" (it uses git history).
- If a build fails, copy the error link/text to Claude.
- If the app misbehaves on your phone, send a screenshot + say what you tapped.

That's it. Back up often, use Plan Mode for big things, and keep your screenshots coming.
