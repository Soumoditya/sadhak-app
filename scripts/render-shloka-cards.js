// Renders the shloka-of-the-day share cards (1080×1350 JPEG) from
// constants/shlokas.ts into assets/shlokas/N.jpg.
// Run: node scripts/render-shloka-cards.js   (needs Playwright + Chromium)
const fs = require('fs');
const path = require('path');
let chromium;
try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require('/opt/node-tools/node_modules/playwright')); }

const root = path.join(__dirname, '..');
const src = fs.readFileSync(path.join(root, 'constants/shlokas.ts'), 'utf8');
const items = [...src.matchAll(/\{ text: '([^']+)', en: '([^']+)', hi: '[^']+', bn: '[^']+', source: '([^']+)' \}/g)]
  .map((m) => ({ text: m[1], en: m[2], source: m[3] }));
const font = (f) => 'data:font/ttf;base64,' + fs.readFileSync(path.join(root, 'assets/fonts', f)).toString('base64');
const emblem = 'data:image/png;base64,' + fs.readFileSync(path.join(root, 'assets/images/emblem.png')).toString('base64');
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

const page = (s) => `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face { font-family: Tiro; src: url(${font('TiroDevanagariHindi_400Regular.ttf')}); }
@font-face { font-family: Fraunces; src: url(${font('Fraunces_600SemiBold.ttf')}); }
* { margin: 0; box-sizing: border-box; }
body { width: 1080px; height: 1350px; font-family: system-ui, sans-serif; color: #1F1A16;
  background: radial-gradient(120% 80% at 50% 0%, #FFF3E2 0%, #FBF4EA 45%, #F3E6D3 100%); position: relative; overflow: hidden; }
.om { position: absolute; right: -40px; top: -90px; font-family: Tiro; font-size: 560px; color: #C2410C; opacity: .06; }
.frame { position: absolute; inset: 40px; border: 3px solid #E8CDA8; border-radius: 48px; }
.inner { position: absolute; inset: 58px; border: 1.5px solid #EED9BB; border-radius: 36px; }
.wrap { position: absolute; left: 0; right: 0; top: 0; bottom: 250px; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 60px 110px 0; text-align: center; }
.label { font-size: 30px; font-weight: 800; letter-spacing: 8px; color: #C2410C; text-transform: uppercase; }
.rule { width: 120px; height: 4px; border-radius: 2px; background: linear-gradient(90deg, #C2410C, #E8743B); margin: 34px 0 0; }
.shloka { font-family: Tiro; font-size: ${s.text.length > 30 ? 76 : 96}px; line-height: 1.55; margin-top: 56px; color: #2A1E14; }
.en { font-family: Fraunces; font-size: 46px; line-height: 1.35; margin-top: 46px; color: #5C3A1E; }
.src { font-size: 30px; font-weight: 700; letter-spacing: 1px; margin-top: 34px; color: #9A6A3A; }
.foot { position: absolute; left: 90px; right: 90px; bottom: 96px; display: flex; align-items: center; gap: 28px;
  background: #FFFFFFCC; border: 2px solid #EED9BB; border-radius: 34px; padding: 26px 34px; }
.foot img { width: 108px; height: 108px; border-radius: 54px; }
.app { font-family: Fraunces; font-size: 46px; color: #1F1A16; }
.tag { font-size: 24px; color: #6B5B4D; margin-top: 4px; white-space: nowrap; }
.link { margin-left: auto; text-align: right; font-size: 25px; font-weight: 800; color: #C2410C; line-height: 1.4; white-space: nowrap; }
</style></head><body>
<div class="om">ॐ</div><div class="frame"></div><div class="inner"></div>
<div class="wrap">
  <div class="label">Shloka of the day</div>
  <div class="rule"></div>
  <div class="shloka">${esc(s.text)}</div>
  <div class="en">${esc(s.en)}</div>
  <div class="src">${esc(s.source)}</div>
</div>
<div class="foot">
  <img src="${emblem}">
  <div><div class="app">Sadhak</div><div class="tag">Daily spiritual companion</div></div>
  <div class="link">Get the app<br>sadhak-app.vercel.app</div>
</div>
</body></html>`;

(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1080, height: 1350 } });
  for (const [i, s] of items.entries()) {
    await p.setContent(page(s));
    await p.evaluate(() => document.fonts.ready);
    await p.screenshot({ path: path.join(root, 'assets/shlokas', `${i}.jpg`), type: 'jpeg', quality: 80 });
  }
  await b.close();
  console.log('rendered', items.length);
})();
