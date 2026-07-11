# Sadhak — Project Guide (for the owner)

A plain-language map of your app: what it is, what works, where everything lives, and the accounts it depends on. You don't need to be a coder to use this — it's your reference.

---

## 1. What Sadhak is
A Hindu daily-practice Android app: Panchang, Hindu calendar, temples map, sacred library, aartis, japa, community, and helper tools (AI, Vastu, Puja Guide, recipes, wallpapers). Built with **Expo / React Native** (one codebase → an Android app).

- **App code repo (private):** `github.com/Soumoditya/sadhak-app` — this project.
- **Website repo (public):** `github.com/Soumoditya/sadhak-web` → shows at `sadhak-app.vercel.app`.
- **Current version:** see `app.json` (`version`).

---

## 2. Every feature — and does it work?
✅ works · ⚠️ works, could be improved · ❌ not built

| Feature | Status | Notes |
|---|---|---|
| Home dashboard (today's panchang, quick access, shloka) | ✅ | |
| Hindu Calendar + month/year jump + notes/reminders | ✅ | |
| Today's Panchang (5 elements, timings) | ✅ | |
| Grooming guidance (per weekday + gender) | ✅ | Scripture-cited; edit gender in profile |
| Devotional Library (Aarti/Chalisa/Mantra/Stotra) | ✅ | Text + YouTube player + deity art |
| Sacred Library (PDF books, upload, read) | ✅ | Admin can delete (long-press) |
| Temples map (OpenStreetMap) | ✅ | Free map, no paid API |
| Community rooms + Explore feed + posts | ✅ | Tap a post to view it |
| Direct messages / chat | ⚠️ | Works; a full WhatsApp-style redesign is still a future idea |
| Japa counter | ✅ | |
| Notes (rich text, folders, reminders) | ✅ | |
| Sadhak AI (Gemini) | ✅ | History saved; see "Secrets" about the key |
| Vastu Compass | ✅ | Uses phone sensors |
| Puja Guide (per deity) | ✅ | Ravi Varma paintings |
| Satvik Bhog (recipes) | ✅ | Real food photos |
| Wallpapers (set to home/lock) | ✅ | Uses a small native module (v1.8+) |
| Profile (Instagram-style) + Settings | ✅ | |
| App icon | ⚠️ | Looks like a white square — needs a transparent PNG from you |
| Home-screen widgets | ❌ | Not built (future idea) |

---

## 3. Where everything lives ("I want to change X…")
Top-level folders in `sadhak-app`:

- **`app/`** — every screen you see. File name = the screen. e.g. `app/(tabs)/index.tsx` = Home, `app/aarti.tsx` = Devotional Library, `app/wallpapers.tsx` = Wallpapers. `app/(tabs)/` are the 5 bottom-tab screens.
- **`components/`** — reusable building blocks. `components/ui/` = shared Button, Card, Header, etc. `components/Diya.tsx` = the diya icon. `components/TempleMap.tsx` = the map.
- **`constants/`** — the **content/data** you'll most often want to edit:
  - Deity images → `constants/deityImages.ts`
  - Food/recipe images → `constants/foodImages.ts`
  - Wallpapers list → `constants/wallpapers.ts`
  - Aarti/Chalisa/Mantra text → `constants/devotional.ts`
  - Puja guides → `constants/pujaGuides.ts`
  - App name / links / support email → `constants/appInfo.ts`
  - Design system (colors, spacing, fonts) → `constants/ds.ts`
- **`services/`** — the "brains" (logic, no screens):
  - Panchang math → `services/panchang.ts`
  - Grooming rules → `services/groomingRules.ts`
  - Festivals → `services/festivals.ts`
  - Sadhak AI → `services/ai.ts`
  - Image uploads (Cloudinary) → `services/cloudinary.ts`
  - Notifications → `services/notifications.ts`
  - Posts/feed → `services/posts.ts`
- **`contexts/`** — app-wide settings: login (`AuthContext`), theme (`ThemeContext`), language, dialogs.
- **`config/`** — `firebase.ts` (database connection + keys).
- **`modules/`** — the custom native wallpaper-setter (`sadhak-wallpaper`).
- **`assets/`** — app icons, splash, fonts (these ship inside the app).
- **`firebase/`** — database security rules (`firestore.rules`, `database.rules.json`).
- **`scripts/backup.ps1`** — one-command backup (see below).
- **`android/`** — auto-generated build files. **Don't edit by hand**; they're rebuilt each time.

---

## 4. The accounts Sadhak uses (and what each does)
| Account | What it does | Login |
|---|---|---|
| **GitHub** | Stores your code + free cloud backup | github.com/Soumoditya |
| **Expo / EAS** | Builds the app into an installable file (in the cloud) | account `shadowfluxx404` |
| **Firebase** (Google) | Accounts, database, chat, storage | project `sadhak-app` |
| **Cloudinary** | Hosts uploaded images/PDFs | cloud `dq3bkfgid` |
| **Google Gemini** | Powers "Sadhak AI" | an API key |
| **Vercel** | Hosts the website `sadhak-app.vercel.app` | team `spxd` |

---

## 5. Backups — your work is safe now
Two copies exist after every backup:
1. **GitHub (private)** — `github.com/Soumoditya/sadhak-app`.
2. **Local zip** — `C:\Users\HP\Documents\Sadhak-Backups\`.

**To back up anytime:** open PowerShell in the project folder and run
`.\scripts\backup.ps1 "what I changed"`
It commits, uploads to GitHub, and writes a fresh zip — all in one step.

---

## 6. Secrets & safety (simple version)
- **Firebase keys** in the code look scary but are *meant* to be public — real safety comes from the **security rules** in `firebase/` (deploy them once; see WORKFLOW-GUIDE).
- **Gemini AI key** is the one true secret. A proxy (`api/gemini.js` in the website repo) is ready so the key can live on the server, not inside the app. Finish it with the steps in WORKFLOW-GUIDE.
- Keep the **app repo private**. The website repo is public (that's fine — it's just a webpage).

---

## 7. Known limitations / future ideas
- App icon needs a transparent-background PNG (from you) to stop looking like a white square.
- Home-screen widgets aren't built.
- A full WhatsApp-style chat redesign is optional/future.
- Deity images are the best free public-domain ones; you can swap in your own via `constants/deityImages.ts` (or Cloudinary).

See **WORKFLOW-GUIDE.md** for how to actually work on the app (builds, backups, deploying the website, using Claude Code).
