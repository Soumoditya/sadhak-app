/**
 * Panchang (Hindu Almanac) Calculation Engine
 * 
 * Calculates the five elements of Panchang:
 * 1. Tithi (Lunar day)
 * 2. Nakshatra (Lunar mansion)
 * 3. Yoga (Luni-solar combination)
 * 4. Karana (Half of Tithi)
 * 5. Vara (Day of week)
 * 
 * Also calculates:
 * - Sunrise/Sunset times
 * - Rahu Kaal
 * - Brahma Muhurta
 * - Abhijit Muhurta
 * - Paksha (Lunar fortnight)
 * - Hindu month
 *
 * Accuracy: the five elements + masa come from `mhah-panchang` (sidereal /
 * Drik ganita with ayanamsha); sun/moon times from `suncalc`. Muhurta and
 * Rahu/Yama/Gulika windows are derived from the accurate sunrise/sunset.
 */

import { MhahPanchang } from 'mhah-panchang';
import * as SunCalc from 'suncalc';

const mhah = new MhahPanchang();

export interface PanchangData {
  date: Date;
  // Five elements
  tithi: {
    name: string;
    nameHi: string;
    number: number; // 1-30 (1-15 Shukla, 16-30 Krishna)
    paksha: 'shukla' | 'krishna';
    pakshaHi: string;
    endTime: string;
  };
  nakshatra: {
    name: string;
    nameHi: string;
    number: number; // 1-27
    lord: string;
    endTime: string;
  };
  yoga: {
    name: string;
    nameHi: string;
    number: number;
  };
  karana: {
    name: string;
    nameHi: string;
    number: number;
  };
  vara: {
    name: string;
    nameHi: string;
    deity: string;
    number: number;
  };
  // Additional
  hinduMonth: {
    name: string;
    nameHi: string;
  };
  sunrise: string;
  sunset: string;
  moonrise: string;
  rahuKaal: { start: string; end: string };
  brahmaMuhurta: { start: string; end: string };
  abhijitMuhurta: { start: string; end: string };
  yamaghanta: { start: string; end: string };
  gulikaKaal: { start: string; end: string };
}

// Tithi names in English and Hindi
export const TITHI_NAMES = [
  { en: 'Pratipada', hi: 'प्रतिपदा' },
  { en: 'Dwitiya', hi: 'द्वितीया' },
  { en: 'Tritiya', hi: 'तृतीया' },
  { en: 'Chaturthi', hi: 'चतुर्थी' },
  { en: 'Panchami', hi: 'पंचमी' },
  { en: 'Shashthi', hi: 'षष्ठी' },
  { en: 'Saptami', hi: 'सप्तमी' },
  { en: 'Ashtami', hi: 'अष्टमी' },
  { en: 'Navami', hi: 'नवमी' },
  { en: 'Dashami', hi: 'दशमी' },
  { en: 'Ekadashi', hi: 'एकादशी' },
  { en: 'Dwadashi', hi: 'द्वादशी' },
  { en: 'Trayodashi', hi: 'त्रयोदशी' },
  { en: 'Chaturdashi', hi: 'चतुर्दशी' },
  { en: 'Purnima', hi: 'पूर्णिमा' }, // Shukla 15
  { en: 'Pratipada', hi: 'प्रतिपदा' }, // Krishna starts
  { en: 'Dwitiya', hi: 'द्वितीया' },
  { en: 'Tritiya', hi: 'तृतीया' },
  { en: 'Chaturthi', hi: 'चतुर्थी' },
  { en: 'Panchami', hi: 'पंचमी' },
  { en: 'Shashthi', hi: 'षष्ठी' },
  { en: 'Saptami', hi: 'सप्तमी' },
  { en: 'Ashtami', hi: 'अष्टमी' },
  { en: 'Navami', hi: 'नवमी' },
  { en: 'Dashami', hi: 'दशमी' },
  { en: 'Ekadashi', hi: 'एकादशी' },
  { en: 'Dwadashi', hi: 'द्वादशी' },
  { en: 'Trayodashi', hi: 'त्रयोदशी' },
  { en: 'Chaturdashi', hi: 'चतुर्दशी' },
  { en: 'Amavasya', hi: 'अमावस्या' }, // Krishna 15
];

// Nakshatra names
export const NAKSHATRA_NAMES = [
  { en: 'Ashwini', hi: 'अश्विनी', lord: 'Ketu' },
  { en: 'Bharani', hi: 'भरणी', lord: 'Venus' },
  { en: 'Krittika', hi: 'कृत्तिका', lord: 'Sun' },
  { en: 'Rohini', hi: 'रोहिणी', lord: 'Moon' },
  { en: 'Mrigashira', hi: 'मृगशिरा', lord: 'Mars' },
  { en: 'Ardra', hi: 'आर्द्रा', lord: 'Rahu' },
  { en: 'Punarvasu', hi: 'पुनर्वसु', lord: 'Jupiter' },
  { en: 'Pushya', hi: 'पुष्य', lord: 'Saturn' },
  { en: 'Ashlesha', hi: 'आश्लेषा', lord: 'Mercury' },
  { en: 'Magha', hi: 'मघा', lord: 'Ketu' },
  { en: 'Purva Phalguni', hi: 'पूर्वा फाल्गुनी', lord: 'Venus' },
  { en: 'Uttara Phalguni', hi: 'उत्तरा फाल्गुनी', lord: 'Sun' },
  { en: 'Hasta', hi: 'हस्त', lord: 'Moon' },
  { en: 'Chitra', hi: 'चित्रा', lord: 'Mars' },
  { en: 'Swati', hi: 'स्वाति', lord: 'Rahu' },
  { en: 'Vishakha', hi: 'विशाखा', lord: 'Jupiter' },
  { en: 'Anuradha', hi: 'अनुराधा', lord: 'Saturn' },
  { en: 'Jyeshtha', hi: 'ज्येष्ठा', lord: 'Mercury' },
  { en: 'Mula', hi: 'मूल', lord: 'Ketu' },
  { en: 'Purva Ashadha', hi: 'पूर्वाषाढ़ा', lord: 'Venus' },
  { en: 'Uttara Ashadha', hi: 'उत्तराषाढ़ा', lord: 'Sun' },
  { en: 'Shravana', hi: 'श्रवण', lord: 'Moon' },
  { en: 'Dhanishta', hi: 'धनिष्ठा', lord: 'Mars' },
  { en: 'Shatabhisha', hi: 'शतभिषा', lord: 'Rahu' },
  { en: 'Purva Bhadrapada', hi: 'पूर्वा भाद्रपद', lord: 'Jupiter' },
  { en: 'Uttara Bhadrapada', hi: 'उत्तरा भाद्रपद', lord: 'Saturn' },
  { en: 'Revati', hi: 'रेवती', lord: 'Mercury' },
];

// Yoga names
const YOGA_NAMES = [
  { en: 'Vishkambha', hi: 'विष्कम्भ' },
  { en: 'Priti', hi: 'प्रीति' },
  { en: 'Ayushman', hi: 'आयुष्मान' },
  { en: 'Saubhagya', hi: 'सौभाग्य' },
  { en: 'Shobhana', hi: 'शोभन' },
  { en: 'Atiganda', hi: 'अतिगण्ड' },
  { en: 'Sukarma', hi: 'सुकर्मा' },
  { en: 'Dhriti', hi: 'धृति' },
  { en: 'Shula', hi: 'शूल' },
  { en: 'Ganda', hi: 'गण्ड' },
  { en: 'Vriddhi', hi: 'वृद्धि' },
  { en: 'Dhruva', hi: 'ध्रुव' },
  { en: 'Vyaghata', hi: 'व्याघात' },
  { en: 'Harshana', hi: 'हर्षण' },
  { en: 'Vajra', hi: 'वज्र' },
  { en: 'Siddhi', hi: 'सिद्धि' },
  { en: 'Vyatipata', hi: 'व्यतीपात' },
  { en: 'Variyan', hi: 'वरीयान' },
  { en: 'Parigha', hi: 'परिघ' },
  { en: 'Shiva', hi: 'शिव' },
  { en: 'Siddha', hi: 'सिद्ध' },
  { en: 'Sadhya', hi: 'साध्य' },
  { en: 'Shubha', hi: 'शुभ' },
  { en: 'Shukla', hi: 'शुक्ल' },
  { en: 'Brahma', hi: 'ब्रह्म' },
  { en: 'Indra', hi: 'इन्द्र' },
  { en: 'Vaidhriti', hi: 'वैधृति' },
];

// Karana names (11 karanas, some repeat)
const KARANA_NAMES = [
  { en: 'Bava', hi: 'बव' },
  { en: 'Balava', hi: 'बालव' },
  { en: 'Kaulava', hi: 'कौलव' },
  { en: 'Taitila', hi: 'तैतिल' },
  { en: 'Garaja', hi: 'गरज' },
  { en: 'Vanija', hi: 'वणिज' },
  { en: 'Vishti', hi: 'विष्टि' },
  { en: 'Shakuni', hi: 'शकुनि' },
  { en: 'Chatushpada', hi: 'चतुष्पद' },
  { en: 'Naga', hi: 'नाग' },
  { en: 'Kimstughna', hi: 'किंस्तुघ्न' },
];

// Vara (Day of Week)
const VARA_NAMES = [
  { en: 'Sunday', hi: 'रविवार', deity: 'Surya (Sun)' },
  { en: 'Monday', hi: 'सोमवार', deity: 'Chandra (Moon)' },
  { en: 'Tuesday', hi: 'मंगलवार', deity: 'Mangal (Mars)' },
  { en: 'Wednesday', hi: 'बुधवार', deity: 'Budha (Mercury)' },
  { en: 'Thursday', hi: 'गुरुवार', deity: 'Brihaspati (Jupiter)' },
  { en: 'Friday', hi: 'शुक्रवार', deity: 'Shukra (Venus)' },
  { en: 'Saturday', hi: 'शनिवार', deity: 'Shani (Saturn)' },
];

// Hindu month names
const HINDU_MONTHS = [
  { en: 'Chaitra', hi: 'चैत्र' },
  { en: 'Vaishakha', hi: 'वैशाख' },
  { en: 'Jyeshtha', hi: 'ज्येष्ठ' },
  { en: 'Ashadha', hi: 'आषाढ़' },
  { en: 'Shravana', hi: 'श्रावण' },
  { en: 'Bhadrapada', hi: 'भाद्रपद' },
  { en: 'Ashvina', hi: 'आश्विन' },
  { en: 'Kartika', hi: 'कार्तिक' },
  { en: 'Margashirsha', hi: 'मार्गशीर्ष' },
  { en: 'Pausha', hi: 'पौष' },
  { en: 'Magha', hi: 'माघ' },
  { en: 'Phalguna', hi: 'फाल्गुन' },
];

// Adhik Maas (Purushottam Maas) — the intercalary lunar month. Its dates are
// published years in advance; this curated table is authoritative (verified
// against Drik Panchang) and replaces mhah-panchang's unreliable leap flag.
// Bounds are inclusive epoch-ms (IST day boundaries). Extend as new years are
// confirmed (next Adhik Maas after 2026 is in 2029).
const ADHIK_MAAS_PERIODS: { start: number; end: number; monthEn: string }[] = [
  // Adhik Shravana 2023: 18 Jul – 16 Aug 2023
  { start: Date.UTC(2023, 6, 17, 18, 30), end: Date.UTC(2023, 7, 16, 18, 30), monthEn: 'Shravana' },
  // Adhik Jyeshtha 2026: 17 May – 15 Jun 2026
  { start: Date.UTC(2026, 4, 16, 18, 30), end: Date.UTC(2026, 5, 15, 18, 30), monthEn: 'Jyeshtha' },
];

/**
 * Calculate Rahu Kaal based on day of week and sunrise/sunset
 * Rahu Kaal formula: divide day into 8 equal parts
 * Day order: Mon=2, Sat=7, Fri=5, Wed=4, Thu=6, Tue=3, Sun=1
 */
function calculateRahuKaal(dayOfWeek: number, sunrise: string, sunset: string): { start: string; end: string } {
  const rahuOrder: Record<number, number> = {
    0: 8, // Sunday - 8th segment
    1: 2, // Monday - 2nd segment
    2: 7, // Tuesday - 7th segment
    3: 5, // Wednesday - 5th segment
    4: 6, // Thursday - 6th segment
    5: 4, // Friday - 4th segment
    6: 3, // Saturday - 3rd segment
  };

  const srParts = sunrise.split(':');
  const ssParts = sunset.split(':');
  const srMin = parseInt(srParts[0]) * 60 + parseInt(srParts[1]);
  const ssMin = parseInt(ssParts[0]) * 60 + parseInt(ssParts[1]);
  const dayLength = ssMin - srMin;
  const segmentLength = dayLength / 8;

  const segment = rahuOrder[dayOfWeek];
  const startMin = srMin + (segment - 1) * segmentLength;
  const endMin = startMin + segmentLength;

  const formatTime = (mins: number): string => {
    const h = Math.floor(mins / 60);
    const m = Math.round(mins % 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  return {
    start: formatTime(startMin),
    end: formatTime(endMin),
  };
}

/**
 * Calculate Brahma Muhurta (1 hr 36 min before sunrise)
 */
function calculateBrahmaMuhurta(sunrise: string): { start: string; end: string } {
  const parts = sunrise.split(':');
  const srMin = parseInt(parts[0]) * 60 + parseInt(parts[1]);
  const startMin = srMin - 96; // 1 hr 36 min = 96 min
  const endMin = srMin - 48; // 48 min before sunrise

  const formatTime = (mins: number): string => {
    let m = mins;
    if (m < 0) m += 1440;
    const h = Math.floor(m / 60);
    const min = Math.round(m % 60);
    return `${h.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
  };

  return {
    start: formatTime(startMin),
    end: formatTime(endMin),
  };
}

/**
 * Calculate Abhijit Muhurta (around solar noon, ~24 min before and after)
 */
function calculateAbhijitMuhurta(sunrise: string, sunset: string): { start: string; end: string } {
  const srParts = sunrise.split(':');
  const ssParts = sunset.split(':');
  const srMin = parseInt(srParts[0]) * 60 + parseInt(srParts[1]);
  const ssMin = parseInt(ssParts[0]) * 60 + parseInt(ssParts[1]);
  const midday = (srMin + ssMin) / 2;

  const formatTime = (mins: number): string => {
    const h = Math.floor(mins / 60);
    const m = Math.round(mins % 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  return {
    start: formatTime(midday - 24),
    end: formatTime(midday + 24),
  };
}

/**
 * Main Panchang Calculation
 */
export function calculatePanchang(
  date: Date,
  lat: number = 28.6139, // Default: New Delhi
  lon: number = 77.209
): PanchangData {
  // ── Accurate sun times (suncalc), anchored to local noon of the given day ──
  const noon = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0);
  const sunTimes = SunCalc.getTimes(noon, lat, lon);
  const toHHMM = (d: Date): string =>
    `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  const validDate = (d?: Date | null): d is Date => !!d && !isNaN(d.getTime());
  const sunrise = validDate(sunTimes.sunrise) ? toHHMM(sunTimes.sunrise) : '06:00';
  const sunset = validDate(sunTimes.sunset) ? toHHMM(sunTimes.sunset) : '18:00';
  const moonTimes = SunCalc.getMoonTimes(noon, lat, lon);
  const moonrise = validDate(moonTimes.rise) ? toHHMM(moonTimes.rise) : '--:--';

  // ── Five elements + masa from mhah-panchang (sidereal, with ayanamsha),
  //    evaluated at sunrise — the traditional reference moment for the day. ──
  const anchor = validDate(sunTimes.sunrise) ? sunTimes.sunrise : noon;
  const elems: any = mhah.calculate(anchor);
  const cal: any = mhah.calendar(anchor, lat, lon);
  const clamp = (n: number, max: number) => (n < 0 ? 0 : n > max ? max : Math.floor(n));

  const tithiNum = clamp(elems?.Tithi?.ino ?? 0, 29); // 0-29
  const tithiData = TITHI_NAMES[tithiNum];
  const paksha: 'shukla' | 'krishna' = tithiNum < 15 ? 'shukla' : 'krishna';
  const tithiEnd = validDate(elems?.Tithi?.end && new Date(elems.Tithi.end)) ? toHHMM(new Date(elems.Tithi.end)) : '--:--';

  const nakNum = clamp(elems?.Nakshatra?.ino ?? 0, 26); // 0-26
  const nakData = NAKSHATRA_NAMES[nakNum];
  const nakEnd = validDate(elems?.Nakshatra?.end && new Date(elems.Nakshatra.end)) ? toHHMM(new Date(elems.Nakshatra.end)) : '--:--';

  const yogaNum = clamp(elems?.Yoga?.ino ?? 0, 26);
  const yogaData = YOGA_NAMES[yogaNum];

  const karanaNum = clamp(elems?.Karna?.ino ?? 0, 10);
  const karanaData = KARANA_NAMES[karanaNum];

  // Vara (day of week)
  const dayOfWeek = date.getDay();
  const varaData = VARA_NAMES[dayOfWeek];

  // Hindu (amanta) lunar month. mhah's masa index is offset by one vs our table.
  // NOTE: mhah's isLeapMonth flag is unreliable (it mislabels regular months as
  // Adhik). Adhik Maas is rare and its dates are published years in advance, so
  // we use a curated table (ADHIK_MAAS_PERIODS) instead of the library flag.
  const masaIno = clamp(cal?.Masa?.ino ?? 0, 11);
  const monthBase = HINDU_MONTHS[(masaIno + 1) % 12];
  const isLeapMonth = ADHIK_MAAS_PERIODS.some(
    (p) => anchor.getTime() >= p.start && anchor.getTime() <= p.end,
  );
  const hinduMonth = {
    en: (isLeapMonth ? 'Adhik ' : '') + monthBase.en,
    hi: (isLeapMonth ? 'अधिक ' : '') + monthBase.hi,
  };

  // Rahu / muhurta windows derived from the accurate sun times
  const rahuKaal = calculateRahuKaal(dayOfWeek, sunrise, sunset);
  const brahmaMuhurta = calculateBrahmaMuhurta(sunrise);
  const abhijitMuhurta = calculateAbhijitMuhurta(sunrise, sunset);

  // Yamaghanta (approximate)
  const srParts = sunrise.split(':');
  const ssParts = sunset.split(':');
  const srMin = parseInt(srParts[0]) * 60 + parseInt(srParts[1]);
  const ssMin = parseInt(ssParts[0]) * 60 + parseInt(ssParts[1]);
  const dayLen = ssMin - srMin;
  const segLen = dayLen / 8;
  
  const yamaOrder: Record<number, number> = { 0: 5, 1: 4, 2: 3, 3: 2, 4: 1, 5: 7, 6: 6 };
  const yamaSeg = yamaOrder[dayOfWeek];
  const yamaStart = srMin + (yamaSeg - 1) * segLen;
  const formatTime = (mins: number): string => {
    const h = Math.floor(mins / 60);
    const m = Math.round(mins % 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  // Gulika Kaal
  const gulikaOrder: Record<number, number> = { 0: 7, 1: 6, 2: 5, 3: 4, 4: 3, 5: 2, 6: 1 };
  const gulikaSeg = gulikaOrder[dayOfWeek];
  const gulikaStart = srMin + (gulikaSeg - 1) * segLen;

  return {
    date,
    tithi: {
      name: tithiData.en,
      nameHi: tithiData.hi,
      number: tithiNum + 1,
      paksha,
      pakshaHi: paksha === 'shukla' ? 'शुक्ल पक्ष' : 'कृष्ण पक्ष',
      endTime: tithiEnd,
    },
    nakshatra: {
      name: nakData.en,
      nameHi: nakData.hi,
      number: nakNum + 1,
      lord: nakData.lord,
      endTime: nakEnd,
    },
    yoga: {
      name: yogaData.en,
      nameHi: yogaData.hi,
      number: yogaNum + 1,
    },
    karana: {
      name: karanaData.en,
      nameHi: karanaData.hi,
      number: karanaNum + 1,
    },
    vara: {
      name: varaData.en,
      nameHi: varaData.hi,
      deity: varaData.deity,
      number: dayOfWeek,
    },
    hinduMonth: {
      name: hinduMonth.en,
      nameHi: hinduMonth.hi,
    },
    sunrise,
    sunset,
    moonrise,
    rahuKaal,
    brahmaMuhurta,
    abhijitMuhurta,
    yamaghanta: {
      start: formatTime(yamaStart),
      end: formatTime(yamaStart + segLen),
    },
    gulikaKaal: {
      start: formatTime(gulikaStart),
      end: formatTime(gulikaStart + segLen),
    },
  };
}

/**
 * Get a human-readable Panchang summary
 */
export function getPanchangSummary(panchang: PanchangData): string {
  return `${panchang.vara.nameHi} | ${panchang.tithi.pakshaHi} ${panchang.tithi.nameHi} | ${panchang.nakshatra.nameHi} | ${panchang.hinduMonth.nameHi}`;
}
