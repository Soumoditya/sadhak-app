import * as SunCalc from 'suncalc';
import { siderealLon } from './jyotishExtras';
import { HINDU_MONTHS } from './panchang';
import { keepsTithi, sunriseTithi, tithiGap, tithiIndex, type Kala } from './observance';

// Regional Hindu calendars. Lunar ones (Purnimanta, Amanta) name the month
// from the tithi; solar ones (Bengali, Assamese, Odia, Tamil, Malayalam) count
// days from the Sun's entry into each sidereal sign, each with its own rule
// for which civil day becomes the 1st.

export type Region = 'purnimanta' | 'amanta' | 'bengali' | 'assamese' | 'odia' | 'tamil' | 'malayalam';

export const REGIONS: { key: Region; label: string; native: string; who: string; solar: boolean }[] = [
  { key: 'purnimanta', label: 'North Indian', native: 'उत्तर भारतीय', who: 'Hindi belt, Bihar, Punjab, Nepal (month ends on Purnima)', solar: false },
  { key: 'amanta', label: 'Amanta', native: 'अमांत', who: 'Gujarat, Maharashtra, Karnataka, Andhra, Telangana (month ends on Amavasya)', solar: false },
  { key: 'bengali', label: 'Bengali', native: 'বাংলা', who: 'West Bengal, Tripura, Bangladesh (Bangabda)', solar: true },
  { key: 'assamese', label: 'Assamese', native: 'অসমীয়া', who: 'Assam (Bhaskarabda)', solar: true },
  { key: 'odia', label: 'Odia', native: 'ଓଡ଼ିଆ', who: 'Odisha', solar: true },
  { key: 'tamil', label: 'Tamil', native: 'தமிழ்', who: 'Tamil Nadu, Puducherry', solar: true },
  { key: 'malayalam', label: 'Malayalam', native: 'മലയാളം', who: 'Kerala (Kollam era)', solar: true },
];

/** Default region from the app language. */
export function defaultRegion(lang: string): Region {
  return lang === 'bn' ? 'bengali' : lang === 'as' ? 'assamese' : lang === 'od' ? 'odia' : lang === 'ta' ? 'tamil' : lang === 'ml' ? 'malayalam'
    : ['mr', 'gu', 'kn', 'te'].includes(lang) ? 'amanta' : 'purnimanta';
}

// Solar month names, index 0 = Sun in Aries (Mesha).
const SOLAR: Record<string, { en: string[]; nat: string[] }> = {
  bengali: {
    en: ['Boishakh', 'Joishtho', 'Asharh', 'Srabon', 'Bhadro', 'Ashwin', 'Kartik', 'Ogrohayon', 'Poush', 'Magh', 'Falgun', 'Choitro'],
    nat: ['বৈশাখ', 'জ্যৈষ্ঠ', 'আষাঢ়', 'শ্রাবণ', 'ভাদ্র', 'আশ্বিন', 'কার্তিক', 'অগ্রহায়ণ', 'পৌষ', 'মাঘ', 'ফাল্গুন', 'চৈত্র'],
  },
  assamese: {
    en: ['Bohag', 'Jeth', 'Aahar', 'Xaon', 'Bhado', 'Ahin', 'Kati', 'Aghun', 'Puh', 'Magh', 'Phagun', 'Sot'],
    nat: ['ব’হাগ', 'জেঠ', 'আহাৰ', 'শাওণ', 'ভাদ', 'আহিন', 'কাতি', 'আঘোণ', 'পুহ', 'মাঘ', 'ফাগুন', 'চ’ত'],
  },
  odia: {
    en: ['Baisakha', 'Jyeshtha', 'Ashadha', 'Shrabana', 'Bhadraba', 'Ashwina', 'Kartika', 'Margasira', 'Pausha', 'Magha', 'Phalguna', 'Chaitra'],
    nat: ['ବୈଶାଖ', 'ଜ୍ୟେଷ୍ଠ', 'ଆଷାଢ଼', 'ଶ୍ରାବଣ', 'ଭାଦ୍ରବ', 'ଆଶ୍ୱିନ', 'କାର୍ତ୍ତିକ', 'ମାର୍ଗଶିର', 'ପୌଷ', 'ମାଘ', 'ଫାଲ୍ଗୁନ', 'ଚୈତ୍ର'],
  },
  tamil: {
    en: ['Chithirai', 'Vaikasi', 'Aani', 'Aadi', 'Avani', 'Purattasi', 'Aippasi', 'Karthigai', 'Margazhi', 'Thai', 'Maasi', 'Panguni'],
    nat: ['சித்திரை', 'வைகாசி', 'ஆனி', 'ஆடி', 'ஆவணி', 'புரட்டாசி', 'ஐப்பசி', 'கார்த்திகை', 'மார்கழி', 'தை', 'மாசி', 'பங்குனி'],
  },
  malayalam: {
    en: ['Medam', 'Edavam', 'Mithunam', 'Karkidakam', 'Chingam', 'Kanni', 'Thulam', 'Vrischikam', 'Dhanu', 'Makaram', 'Kumbham', 'Meenam'],
    nat: ['മേടം', 'ഇടവം', 'മിഥുനം', 'കർക്കടകം', 'ചിങ്ങം', 'കന്നി', 'തുലാം', 'വൃശ്ചികം', 'ധനു', 'മകരം', 'കുംഭം', 'മീനം'],
  },
};
const NATIVE_LANG: Record<string, string> = { bengali: 'bn', assamese: 'as', odia: 'od', tamil: 'ta', malayalam: 'ml' };

export type RegionalDay = { day: number; month: number; year?: number; monthName: string; label: string };

const sunSignAt = (t: Date) => Math.floor(siderealLon('Sun', t) / 30) % 12;

/** The moment of the civil day whose Sun sign decides the solar month. */
function refMoment(region: Region, d: Date, lat: number, lon: number): Date {
  const y = d.getFullYear(), m = d.getMonth(), day = d.getDate();
  if (region === 'bengali' || region === 'assamese') return new Date(y, m, day, 0, 0, 1); // sankranti before midnight → next day is the 1st
  if (region === 'odia') return new Date(y, m, day, 23, 59, 59); // sankranti day itself is the 1st
  const t = SunCalc.getTimes(new Date(y, m, day, 12), lat, lon);
  const ok = (x: Date | null | undefined): x is Date => !!x && !isNaN(x.getTime());
  const rise = ok(t.sunrise) ? t.sunrise : new Date(y, m, day, 6);
  const set = ok(t.sunset) ? t.sunset : new Date(y, m, day, 18);
  if (region === 'tamil') return set; // before sunset → same day
  return new Date(rise.getTime() + 0.6 * (set.getTime() - rise.getTime())); // Malayalam: before aparahna
}

function solarYear(region: Region, d: Date, sign: number): number | undefined {
  const g = d.getFullYear(), m = d.getMonth();
  if (region === 'bengali' || region === 'assamese') {
    const after = m > 3 || (m === 3 && sign <= 1); // Boishakh/Bohag begins mid-April
    return after ? g - 593 : g - 594;
  }
  if (region === 'malayalam') {
    const after = m > 7 || (m === 7 && sign === 4); // Kollam era turns over on Chingam 1
    return after ? g - 824 : g - 825;
  }
  return undefined;
}

/** Regional dates for every day of a Gregorian month (solar regions only). */
export function solarMonthDays(year: number, month: number, region: Region, lat: number, lon: number, lang: string): Record<number, RegionalDay> {
  const out: Record<number, RegionalDay> = {};
  if (!SOLAR[region]) return out;
  const names = lang === NATIVE_LANG[region] || (region === 'assamese' && lang === 'as') ? SOLAR[region].nat : SOLAR[region].en;
  // Walk back from the 1st to find where the current solar month began.
  let d = new Date(year, month, 1);
  let sign = sunSignAt(refMoment(region, d, lat, lon));
  let count = 1;
  for (let i = 1; i <= 32; i++) {
    const prev = new Date(year, month, 1 - i);
    if (sunSignAt(refMoment(region, prev, lat, lon)) !== sign) break;
    count++;
  }
  const days = new Date(year, month + 1, 0).getDate();
  for (let day = 1; day <= days; day++) {
    d = new Date(year, month, day);
    const s = day === 1 ? sign : sunSignAt(refMoment(region, d, lat, lon));
    if (day > 1) { if (s !== sign) { sign = s; count = 1; } else count++; }
    const yr = solarYear(region, d, sign);
    out[day] = { day: count, month: sign, year: yr, monthName: names[sign], label: `${count} ${names[sign]}${yr ? ` ${yr}` : ''}` };
  }
  return out;
}

// The panchang engine names months the Purnimanta way (Krishna paksha takes
// the next month's name). Amanta shifts Krishna paksha back one month.
function shift(month: string, by: number): { en: string; hi: string } {
  const adhik = month.startsWith('Adhik ');
  const base = month.replace(/^Adhik /, '');
  const i = HINDU_MONTHS.findIndex((m) => m.en === base);
  if (i < 0) return { en: month, hi: month };
  const j = adhik ? i : (i + by + 12) % 12; // an Adhik month has one name in both systems
  return { en: (adhik ? 'Adhik ' : '') + HINDU_MONTHS[j].en, hi: (adhik ? 'अधिक ' : '') + HINDU_MONTHS[j].hi };
}
export const toAmanta = (purnimantaMonth: string, paksha: 'shukla' | 'krishna') => shift(purnimantaMonth, paksha === 'krishna' ? -1 : 0);

/** Lunar month name in a region's convention. */
export function lunarMonth(region: Region, purnimantaMonth: string, paksha: 'shukla' | 'krishna'): { en: string; hi: string } {
  return region === 'purnimanta' ? shift(purnimantaMonth, 0) : toAmanta(purnimantaMonth, paksha);
}

// ── Regional festivals ──────────────────────────────────────────────────────
export type RegionalFest = { name: string; hi: string; bn?: string; note: string };
type Rule =
  | { solar: [number, number] } // [sign, day]
  | { lunar: [string, 'shukla' | 'krishna', string, Kala?] } // AMANTA month, paksha, tithi, kala
  | { fixed: [number, number] }; // [month 1-12, day]

const FESTS: Partial<Record<Region, (RegionalFest & { rule: Rule })[]>> = {
  bengali: [
    { name: 'Poila Boishakh', hi: 'पोइला बोइशाख', bn: 'পয়লা বৈশাখ', note: 'Bengali New Year', rule: { solar: [0, 1] } },
    { name: 'Rabindra Jayanti', hi: 'रवींद्र जयंती', bn: 'রবীন্দ্র জয়ন্তী', note: '25 Boishakh, birth of Rabindranath Tagore', rule: { solar: [0, 25] } },
    { name: 'Jamai Shashthi', hi: 'जमाई षष्ठी', bn: 'জামাই ষষ্ঠী', note: 'Mothers-in-law bless their sons-in-law', rule: { lunar: ['Jyeshtha', 'shukla', 'Shashthi'] } },
    { name: 'Mahalaya', hi: 'महालया', bn: 'মহালয়া', note: 'End of Pitri Paksha, Devi Paksha begins', rule: { lunar: ['Bhadrapada', 'krishna', 'Amavasya'] } },
    { name: 'Durga Puja: Shashthi', hi: 'दुर्गा पूजा: षष्ठी', bn: 'দুর্গাপূজা: ষষ্ঠী', note: 'Bodhon, the Goddess is welcomed', rule: { lunar: ['Ashvina', 'shukla', 'Shashthi'] } },
    { name: 'Durga Puja: Saptami', hi: 'दुर्गा पूजा: सप्तमी', bn: 'দুর্গাপূজা: সপ্তমী', note: 'Nabapatrika snan', rule: { lunar: ['Ashvina', 'shukla', 'Saptami'] } },
    { name: 'Durga Puja: Ashtami', hi: 'दुर्गा पूजा: अष्टमी', bn: 'দুর্গাপূজা: অষ্টমী', note: 'Kumari puja, Sandhi puja, anjali', rule: { lunar: ['Ashvina', 'shukla', 'Ashtami'] } },
    { name: 'Durga Puja: Navami', hi: 'दुर्गा पूजा: नवमी', bn: 'দুর্গাপূজা: নবমী', note: 'Last day of the puja', rule: { lunar: ['Ashvina', 'shukla', 'Navami'] } },
    { name: 'Bijoya Dashami', hi: 'विजया दशमी', bn: 'বিজয়া দশমী', note: 'Sindoor khela and visarjan', rule: { lunar: ['Ashvina', 'shukla', 'Dashami'] } },
    { name: 'Kojagari Lakshmi Puja', hi: 'कोजागरी लक्ष्मी पूजा', bn: 'কোজাগরী লক্ষ্মীপূজা', note: 'Lakshmi puja on the full moon', rule: { lunar: ['Ashvina', 'shukla', 'Purnima', 'nishita'] } },
    { name: 'Kali Puja', hi: 'काली पूजा', bn: 'কালীপূজা', note: 'Night worship of Maa Kali, Deepanwita', rule: { lunar: ['Ashvina', 'krishna', 'Amavasya', 'nishita'] } },
    { name: 'Bhai Phonta', hi: 'भाई फोंटा', bn: 'ভাইফোঁটা', note: 'Sisters bless their brothers', rule: { lunar: ['Kartika', 'shukla', 'Dwitiya'] } },
    { name: 'Jagaddhatri Puja', hi: 'जगद्धात्री पूजा', bn: 'জগদ্ধাত্রী পূজা', note: 'Chandannagar and Krishnanagar', rule: { lunar: ['Kartika', 'shukla', 'Navami'] } },
    { name: 'Poush Sankranti', hi: 'पौष संक्रांति', bn: 'পৌষ সংক্রান্তি', note: 'Pithe-puli and Gangasagar', rule: { solar: [9, 1] } },
    { name: 'Saraswati Puja', hi: 'सरस्वती पूजा', bn: 'সরস্বতী পূজা', note: 'Basanta Panchami', rule: { lunar: ['Magha', 'shukla', 'Panchami'] } },
    { name: 'Dol Jatra', hi: 'डोल यात्रा', bn: 'দোলযাত্রা', note: 'Festival of colours, Gaura Purnima', rule: { lunar: ['Phalguna', 'shukla', 'Purnima'] } },
    { name: 'Rath Yatra', hi: 'रथ यात्रा', bn: 'রথযাত্রা', note: 'Chariot festival of Jagannath', rule: { lunar: ['Ashadha', 'shukla', 'Dwitiya'] } },
  ],
  assamese: [
    { name: 'Bohag Bihu', hi: 'बोहाग बिहू', note: 'Rongali Bihu, Assamese New Year', rule: { solar: [0, 1] } },
    { name: 'Kati Bihu', hi: 'काती बिहू', note: 'Kongali Bihu, lamps in the fields', rule: { solar: [6, 1] } },
    { name: 'Magh Bihu', hi: 'माघ बिहू', note: 'Bhogali Bihu, harvest feast', rule: { solar: [9, 1] } },
    { name: 'Ambubachi Mela', hi: 'अंबुबाची मेला', note: 'Kamakhya temple', rule: { fixed: [6, 22] } },
  ],
  odia: [
    { name: 'Pana Sankranti', hi: 'पना संक्रांति', note: 'Maha Vishuba Sankranti, Odia New Year', rule: { solar: [0, 1] } },
    { name: 'Raja Parba', hi: 'रज पर्व', note: 'Celebration of Mother Earth (3 days)', rule: { solar: [2, 1] } },
    { name: 'Rath Yatra', hi: 'रथ यात्रा', note: 'Chariot festival of Jagannath, Puri', rule: { lunar: ['Ashadha', 'shukla', 'Dwitiya'] } },
    { name: 'Kumar Purnima', hi: 'कुमार पूर्णिमा', note: 'Festival of Kartikeya', rule: { lunar: ['Ashvina', 'shukla', 'Purnima'] } },
    { name: 'Boita Bandana', hi: 'बोइत बंदाण', note: 'Kartika Purnima, toy boats on the water', rule: { lunar: ['Kartika', 'shukla', 'Purnima'] } },
  ],
  tamil: [
    { name: 'Puthandu', hi: 'पुथांडु', note: 'Tamil New Year', rule: { solar: [0, 1] } },
    { name: 'Aadi Perukku', hi: 'आडि पेरुक्कु', note: 'Thanksgiving to rivers, 18 Aadi', rule: { solar: [3, 18] } },
    { name: 'Thai Pongal', hi: 'थाई पोंगल', note: 'Harvest festival', rule: { solar: [9, 1] } },
    { name: 'Karthigai Deepam', hi: 'कार्तिगई दीपम', note: 'Festival of lamps', rule: { lunar: ['Kartika', 'shukla', 'Purnima'] } },
    { name: 'Thaipusam', hi: 'थाईपूसम', note: 'Murugan festival', rule: { lunar: ['Pausha', 'shukla', 'Purnima'] } },
  ],
  malayalam: [
    { name: 'Vishu', hi: 'विशु', note: 'Vishukkani at dawn, Malayalam new year by Medam', rule: { solar: [0, 1] } },
    { name: 'Chingam 1', hi: 'चिंगम 1', note: 'Kollam New Year', rule: { solar: [4, 1] } },
    { name: 'Karkidaka Vavu', hi: 'कर्किडक वावु', note: 'Ancestor rites on the new moon', rule: { lunar: ['Ashadha', 'krishna', 'Amavasya'] } },
  ],
  amanta: [
    { name: 'Gudi Padwa / Ugadi', hi: 'गुड़ी पड़वा / उगादि', note: 'New Year in Maharashtra, Karnataka, Andhra and Telangana', rule: { lunar: ['Chaitra', 'shukla', 'Pratipada'] } },
    { name: 'Gujarati New Year', hi: 'गुजराती नववर्ष', note: 'Bestu Varas, the day after Diwali', rule: { lunar: ['Kartika', 'shukla', 'Pratipada'] } },
    { name: 'Bathukamma ends', hi: 'बतुकम्मा', note: 'Telangana flower festival (Saddula)', rule: { lunar: ['Ashvina', 'shukla', 'Ashtami'] } },
  ],
  purnimanta: [
    { name: 'Lohri', hi: 'लोहड़ी', note: 'Bonfire festival of Punjab', rule: { fixed: [1, 13] } },
    { name: 'Baisakhi', hi: 'बैसाखी', note: 'Harvest and Khalsa day', rule: { solar: [0, 1] } },
  ],
};

/** Regional festivals on a day (lunar ones by kala, Adhik months skipped). */
export function regionalFestivals(region: Region, d: Date, lat: number, lon: number, solar?: RegionalDay, sunSignDay?: { sign: number; day: number }): RegionalFest[] {
  const list = FESTS[region] || [];
  const sd = solar ? { sign: solar.month, day: solar.day } : sunSignDay;
  let n0 = -1;
  return list.filter((f) => {
    const r = f.rule as any;
    if (r.fixed) return d.getMonth() + 1 === r.fixed[0] && d.getDate() === r.fixed[1];
    if (r.solar) {
      if (sd) return sd.sign === r.solar[0] && sd.day === r.solar[1];
      // Lunar regions have no solar day count: a "1st" is the day the Sun
      // enters the sign before sunset (Baisakhi on the sankranti day).
      if (r.solar[1] !== 1) return false;
      const set = (x: Date) => SunCalc.getTimes(new Date(x.getFullYear(), x.getMonth(), x.getDate(), 12), lat, lon).sunset || new Date(x.getFullYear(), x.getMonth(), x.getDate(), 18);
      const prev = new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1);
      return sunSignAt(set(d)) === r.solar[0] && sunSignAt(set(prev)) !== r.solar[0];
    }
    if (r.lunar) {
      const target = tithiIndex(r.lunar[2], r.lunar[1]);
      if (n0 < 0) n0 = sunriseTithi(d, lat, lon);
      if (target < 0 || tithiGap(target, n0) > 2) return false;
      const m = HINDU_MONTHS.findIndex((x) => x.en === r.lunar[0]);
      return keepsTithi(d, m, target, r.lunar[3] || 'sunrise', lat, lon);
    }
    return false;
  });
}
