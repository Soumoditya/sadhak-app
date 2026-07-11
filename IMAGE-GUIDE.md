# 🖼️ How to use YOUR OWN images in Sadhak (super simple)

You do **two things**: (1) put your image file in the right folder with the right name, (2) tell Claude *"I added images."* That's it — Claude finishes the wiring and rebuilds.

No coding. No accounts. If you don't add an image, the app keeps its current one automatically.

---

## The rule
- File types allowed: **.jpg, .png, .webp**
- The **file name = the "key"** (lowercase). Example: to change Shiva's picture, name the file `shiva.jpg`.

---

## 1) Deity pictures (Aarti + Puja Guide)
Put files in: **`assets/custom/deities/`**

| To change… | Name the file |
|---|---|
| Vishnu | `vishnu.jpg` |
| Shiva | `shiva.jpg` |
| Ganesha | `ganesha.jpg` |
| Hanuman | `hanuman.jpg` |
| Lakshmi | `lakshmi.jpg` |
| Durga | `durga.jpg` |
| Krishna | `krishna.jpg` |
| Saraswati | `saraswati.jpg` |
| Surya | `surya.jpg` |
| Shani | `shani.jpg` |

## 2) Food photos (Satvik Bhog)
Put files in: **`assets/custom/food/`** — name each file by its recipe id:
`sooji-halwa` · `sabudana-khichdi` · `kheer` · `besan-laddu` · `makhana-kheer` · `kuttu-puri` · `panchamrit` · `moong-dal-halwa` · `coconut-barfi` · `khichdi-bhog`
(e.g. `kheer.jpg`)

## 3) Wallpapers (add as many as you want!)
Put files in: **`assets/custom/wallpapers/`**
- **Any** file you drop here becomes a **new wallpaper** in the app (shown under the "Mine" tab).
- Name it whatever you like — the name becomes the title. `golden-temple.jpg` → shows as "Golden Temple".
- If you name it the same as a built-in (e.g. `krishna.jpg`), it **replaces** that one.

## 4) App icon (the home-screen icon)
Put your icon at: **`assets/images/`**, named **`app-icon.png`**
- Best: **1024×1024**, **transparent background** (so it isn't a white square).
- Then tell Claude "I added the icon" — Claude wires it into the app settings.

---

## After you add files
Just say to Claude: **"I added images"** (or "I added the icon").
Claude runs the small updater (`node scripts/build-custom-images.js`) and rebuilds the app so your images show up. Nothing else for you to do.

> Note: images placed in these folders are bundled *inside* the app, so many large images make the app file a bit bigger. For lots of images later, Claude can move them to your Cloudinary account to keep the app small — just ask.
