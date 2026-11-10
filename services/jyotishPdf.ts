// Sadhak — Kundli PDF report. Builds a printable HTML report (chart, details,
// grahas with R/C/V marks, dashas with antardashas, Sade Sati, yogas, doshas),
// turns it into a PDF with expo-print under a readable file name, and saves it
// to Downloads (Android) or shares it.
import * as Print from 'expo-print';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import type { Kundli, BirthInput } from './jyotish';
import { grahaFlags, analyse, saturnPeriods, antardashas, extraBirthDetails, fmtDeg, SIGNS } from './jyotishExtras';
import { saveToDownloads, notifySaved } from './downloads';
import { shareFile } from './shareApp';

const esc = (s: any) => String(s ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c] as string));
const ABBR: Record<string, string> = { Sun: 'Su', Moon: 'Mo', Mars: 'Ma', Mercury: 'Me', Jupiter: 'Ju', Venus: 'Ve', Saturn: 'Sa', Rahu: 'Ra', Ketu: 'Ke' };
const fmtDate = (d: Date | string) => new Date(typeof d === 'string' ? d + 'T00:00:00' : d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

function northChartSvg(k: Kundli, flags: ReturnType<typeof grahaFlags>): string {
  const S = 300, M = 150;
  const POS: Record<number, [number, number]> = {
    1: [0.5, 0.25], 2: [0.25, 0.1], 3: [0.1, 0.25], 4: [0.25, 0.5], 5: [0.1, 0.75], 6: [0.25, 0.9],
    7: [0.5, 0.75], 8: [0.75, 0.9], 9: [0.9, 0.75], 10: [0.75, 0.5], 11: [0.9, 0.25], 12: [0.75, 0.1],
  };
  const L = k.lagna.signIndex;
  let body = '';
  for (let h = 1; h <= 12; h++) {
    const sign = (L + h - 1) % 12;
    const [fx, fy] = POS[h];
    const corner = [2, 3, 5, 6, 8, 9, 11, 12].includes(h);
    body += `<text x="${fx * S}" y="${fy * S + (corner ? -12 : -20)}" font-size="9" fill="#9a8a7a" text-anchor="middle">${sign + 1}</text>`;
    const occ = k.planets.filter((p) => p.signIndex === sign);
    occ.forEach((p, i) => {
      const f = flags[p.name] || ({} as any);
      const m = [f.retro && 'R', f.combust && 'C', f.vargottama && 'V'].filter(Boolean);
      const marks = m.length ? `(${m.join(',')})` : '';
      const cols = occ.length > 2 ? 2 : 1;
      const x = fx * S + (cols === 1 ? 0 : (i % 2 === 0 ? -13 : 13));
      const y = fy * S + 4 + Math.floor(i / cols) * 14 - (Math.ceil(occ.length / cols) - 1) * 7;
      body += `<text x="${x}" y="${y}" font-size="12" font-weight="700" fill="${p.name === 'Sun' || p.name === 'Moon' ? '#C2410C' : '#1F1A16'}" text-anchor="middle">${ABBR[p.name]}${marks ? `<tspan font-size="9" fill="#7a6a5a">${marks}</tspan>` : ''}</text>`;
    });
  }
  const ln = 'stroke="#C2410C" stroke-opacity="0.45" stroke-width="1.2"';
  return `<svg width="260" height="260" viewBox="0 0 ${S} ${S}" xmlns="http://www.w3.org/2000/svg">
    <rect x="1" y="1" width="${S - 2}" height="${S - 2}" rx="10" fill="#FFFBF5" stroke="#C2410C" stroke-width="1.6"/>
    <polygon points="${M},0 225,75 ${M},${M} 75,75" fill="#C2410C" fill-opacity="0.08"/>
    <line x1="0" y1="0" x2="${S}" y2="${S}" ${ln}/><line x1="${S}" y1="0" x2="0" y2="${S}" ${ln}/>
    <line x1="${M}" y1="0" x2="${S}" y2="${M}" ${ln}/><line x1="${S}" y1="${M}" x2="${M}" y2="${S}" ${ln}/>
    <line x1="${M}" y1="${S}" x2="0" y2="${M}" ${ln}/><line x1="0" y1="${M}" x2="${M}" y2="0" ${ln}/>
    <text x="${M}" y="109" font-size="9" font-weight="800" fill="#C2410C" text-anchor="middle">As</text>
    ${body}</svg>`;
}

function buildHtml(k: Kundli, birth: BirthInput | null, name?: string): string {
  const b = k.basics;
  const flags = grahaFlags(k);
  const { yogas, doshas } = analyse(k);
  const now = new Date();
  const periods = saturnPeriods(k, now.getFullYear() - 20, now.getFullYear() + 40).filter((p) => p.kind === 'sadeSati');
  const today = now.toISOString().slice(0, 10);
  const runningMaha = k.dasha?.maha.find((m) => m.start <= today && today < m.end);
  const planetRows = k.planets.map((p) => {
    const f = flags[p.name];
    const tags = [f.retro && 'Retrograde', f.combust && 'Combust', f.vargottama && 'Vargottama'].filter(Boolean).join(', ');
    return `<tr><td><b>${esc(p.name)}</b></td><td>${esc(p.sign)} ${fmtDeg(p.degree)}</td><td>${p.house}</td>
      <td>${esc(p.nakshatra)} ${p.pada}</td><td>${esc(p.dignity && p.dignity !== '—' && p.dignity !== 'Neutral' ? p.dignity : '')}${tags ? `<br><span class="tag">${tags}</span>` : ''}</td></tr>`;
  }).join('');
  const dashaRows = (k.dasha?.maha || []).map((m) => {
    const on = runningMaha?.start === m.start;
    return `<tr class="${on ? 'on' : ''}"><td><b>${esc(m.lord)}</b></td><td>${fmtDate(m.start)} &ndash; ${fmtDate(m.end)}</td></tr>`;
  }).join('');
  const antarRows = runningMaha ? antardashas(runningMaha).map((a) => {
    const on = a.start <= today && today < a.end;
    return `<tr class="${on ? 'on' : ''}"><td>${esc(runningMaha.lord)} / <b>${esc(a.lord)}</b></td><td>${fmtDate(a.start)} &ndash; ${fmtDate(a.end)}</td></tr>`;
  }).join('') : '';
  const sadeRows = periods.map((p) => `<tr><td>${fmtDate(p.start)} &ndash; ${fmtDate(p.end)}</td><td>${(p.phases || []).map((ph) => `${ph.name}: ${fmtDate(ph.start)}`).join(' · ')}</td></tr>`).join('');
  const yogaRows = yogas.filter((y) => y.present).map((y) => `<li><b>${esc(y.name)}</b>: ${esc(y.detail)}.${y.note ? ` <i>${esc(y.note)}</i>` : ''}</li>`).join('') || '<li>No major classical yogas from this set.</li>';
  const doshaRows = doshas.map((d) => `<li><b>${esc(d.name)}</b>: ${d.present ? '<span class="bad">Present</span>' : 'Not present'}. ${esc(d.detail)}.${d.present && d.note ? ` <i>${esc(d.note)}</i>` : ''}</li>`).join('');
  const extra = extraBirthDetails(k);

  return `<!doctype html><html><head><meta charset="utf-8"/>
  <style>
    @page { margin: 28px; }
    * { box-sizing: border-box; }
    body { font-family: -apple-system, 'Segoe UI', Roboto, sans-serif; color: #1F1A16; font-size: 11.5px; }
    .hd { display:flex; align-items:center; gap:18px; border-bottom: 2px solid #C2410C; padding-bottom: 12px; margin-bottom: 14px; }
    .hd h1 { margin: 0; color: #C2410C; font-size: 22px; }
    .hd p { margin: 2px 0; color: #5C534B; }
    h2 { color:#C2410C; font-size: 12.5px; text-transform: uppercase; letter-spacing: 1px; border-bottom:1px solid #eee; padding-bottom:4px; margin: 16px 0 8px; }
    table { width:100%; border-collapse: collapse; }
    td, th { padding: 4px 6px; border-bottom: 1px solid #f0e8de; text-align:left; vertical-align: top; }
    th { color:#7a6a5a; font-weight:700; font-size: 10.5px; }
    tr.on td { background: #FFF1E6; }
    .two { display:flex; gap:18px; align-items:flex-start; }
    .grid { flex:1; display:grid; grid-template-columns: 1fr 1fr; gap: 3px 12px; }
    .tag { color:#C2410C; font-size: 10px; }
    .bad { color:#B0263E; font-weight:700; }
    ul { margin: 4px 0; padding-left: 16px; } li { margin: 3px 0; }
    .legend { color:#7a6a5a; font-size:10px; margin-top:4px; }
    .foot { margin-top: 18px; text-align:center; color:#999; font-size: 9.5px; border-top:1px solid #eee; padding-top:8px; }
  </style></head><body>
  <div class="hd"><div>
    <h1>Sadhak · Kundli</h1>
    <p><b>${esc(name || 'Devotee')}</b></p>
    <p>${birth ? `Born ${fmtDate(birth.date)}${birth.hasTime ? ' at ' + esc(birth.time) : ' (time unknown)'} · ${esc(birth.place)}` : ''}</p>
    <p>Generated ${fmtDate(now)}</p>
  </div></div>
  <div class="two">
    <div>${northChartSvg(k, flags)}<div class="legend">(R) retrograde · (C) combust · (V) vargottama</div></div>
    <div class="grid">
      <div>Lagna: <b>${esc(b.lagna)}</b></div><div>Rashi: <b>${esc(b.rashi)}</b> (lord ${esc(b.rashiLord)})</div>
      <div>Nakshatra: <b>${esc(b.nakshatra)}</b> pada ${b.pada}</div><div>Nakshatra lord: <b>${esc(b.nakLord)}</b></div>
      <div>Gana: <b>${esc(b.gana)}</b></div><div>Nadi: <b>${esc(b.nadi)}</b></div>
      <div>Yoni: <b>${esc(b.yoni)}</b></div><div>Deity: <b>${esc(b.deity)}</b></div>
      ${extra.map(([kk, v]) => `<div>${esc(kk)}: <b>${esc(v)}</b></div>`).join('')}
      <div>Ayanamsa: <b>Lahiri ${Number(k.meta.ayanamsa).toFixed(2)}°</b></div>
    </div>
  </div>
  <h2>Graha positions</h2>
  <table><tr><th>Graha</th><th>Sign</th><th>House</th><th>Nakshatra</th><th>Dignity / notes</th></tr>${planetRows}</table>
  ${dashaRows ? `<h2>Vimshottari mahadasha</h2><table>${dashaRows}</table>` : ''}
  ${antarRows ? `<h2>Antardashas in the running mahadasha</h2><table>${antarRows}</table>` : ''}
  ${sadeRows ? `<h2>Sade Sati (Saturn over the Moon sign ${esc(SIGNS[k.planets.find((p) => p.name === 'Moon')!.signIndex])})</h2><table>${sadeRows}</table>` : ''}
  <h2>Yogas</h2><ul>${yogaRows}</ul>
  <h2>Doshas</h2><ul>${doshaRows}</ul>
  <div class="foot">Calculated with Swiss Ephemeris · Lahiri ayanamsa · whole-sign houses · for reflection, not a guarantee.<br/>Sadhak, your daily spiritual companion · sadhak-app.vercel.app</div>
  </body></html>`;
}

export function kundliFileName(name?: string) {
  const who = (name || 'Kundli').normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-').slice(0, 32) || 'Kundli';
  const d = new Date();
  const ymd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return `Sadhak-Kundli-${who}-${ymd}.pdf`;
}

/** Make the PDF under a readable name in the cache; returns its local URI. */
export async function buildKundliPdf(k: Kundli, birth: BirthInput | null, name?: string): Promise<{ uri: string; fileName: string }> {
  const html = buildHtml(k, birth, name);
  const { uri } = await Print.printToFileAsync({ html, base64: false });
  const fileName = kundliFileName(name);
  const dest = `${FileSystem.cacheDirectory}${fileName}`;
  await FileSystem.deleteAsync(dest, { idempotent: true }).catch(() => {});
  await FileSystem.moveAsync({ from: uri, to: dest });
  return { uri: dest, fileName };
}

/** Save to Downloads (with a notification). Returns false if the user declined the folder. */
export async function downloadKundliPdf(k: Kundli, birth: BirthInput | null, name?: string): Promise<{ saved: boolean; uri: string; fileName: string; savedUri?: string }> {
  const { uri, fileName } = await buildKundliPdf(k, birth, name);
  const savedUri = await saveToDownloads(uri, fileName, 'application/pdf');
  if (savedUri) await notifySaved('Kundli saved', `${fileName} · tap to open`, savedUri, 'application/pdf');
  return { saved: !!savedUri, uri, fileName, savedUri: savedUri || undefined };
}

export async function shareKundliPdf(k: Kundli, birth: BirthInput | null, name?: string) {
  const { uri, fileName } = await buildKundliPdf(k, birth, name);
  await shareFile(uri, 'application/pdf', `Kundli of ${name || 'my birth chart'}`, fileName);
}
