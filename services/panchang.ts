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
 */

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
const TITHI_NAMES = [
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
const NAKSHATRA_NAMES = [
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

/**
 * Calculate Julian Day Number from a given date
 */
function dateToJD(date: Date): number {
  let y = date.getFullYear();
  let m = date.getMonth() + 1;
  const d = date.getDate() + (date.getHours() + date.getMinutes() / 60.0 + date.getSeconds() / 3600.0) / 24.0;

  if (m <= 2) {
    y -= 1;
    m += 12;
  }

  const A = Math.floor(y / 100);
  const B = 2 - A + Math.floor(A / 4);

  return Math.floor(365.25 * (y + 4716)) + Math.floor(30.6001 * (m + 1)) + d + B - 1524.5;
}

/**
 * Calculate Sun's longitude
 */
function sunLongitude(jd: number): number {
  const T = (jd - 2451545.0) / 36525.0;
  const L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T;
  const M = 357.52911 + 35999.05029 * T - 0.0001537 * T * T;
  const Mr = M * Math.PI / 180;
  const C = (1.914602 - 0.004817 * T - 0.000014 * T * T) * Math.sin(Mr)
    + (0.019993 - 0.000101 * T) * Math.sin(2 * Mr)
    + 0.000289 * Math.sin(3 * Mr);
  let sunLon = L0 + C;
  sunLon = sunLon % 360;
  if (sunLon < 0) sunLon += 360;
  return sunLon;
}

/**
 * Calculate Moon's longitude (simplified)
 */
function moonLongitude(jd: number): number {
  const T = (jd - 2451545.0) / 36525.0;
  const Lm = 218.3165 + 481267.8813 * T;
  const D = 297.8502 + 445267.1115 * T;
  const M = 357.5291 + 35999.0503 * T;
  const Mm = 134.9634 + 477198.8676 * T;
  const F = 93.272 + 483202.0175 * T;

  const Dr = D * Math.PI / 180;
  const Mr = M * Math.PI / 180;
  const Mmr = Mm * Math.PI / 180;
  const Fr = F * Math.PI / 180;

  let moonLon = Lm
    + 6.289 * Math.sin(Mmr)
    + 1.274 * Math.sin(2 * Dr - Mmr)
    + 0.658 * Math.sin(2 * Dr)
    + 0.214 * Math.sin(2 * Mmr)
    - 0.186 * Math.sin(Mr)
    - 0.114 * Math.sin(2 * Fr)
    + 0.059 * Math.sin(2 * Dr - 2 * Mmr)
    + 0.057 * Math.sin(2 * Dr - Mr - Mmr)
    + 0.053 * Math.sin(2 * Dr + Mmr)
    + 0.046 * Math.sin(2 * Dr - Mr);

  moonLon = moonLon % 360;
  if (moonLon < 0) moonLon += 360;
  return moonLon;
}

/**
 * Calculate sunrise and sunset times based on latitude and longitude
 * Returns times in "HH:MM" format
 */
function calculateSunriseSunset(date: Date, lat: number, lon: number): { sunrise: string; sunset: string } {
  const jd = dateToJD(date);
  const T = (jd - 2451545.0) / 36525.0;

  // Solar noon
  const M = 357.52911 + 35999.05029 * T;
  const Mr = M * Math.PI / 180;
  const eqTime = -7.655 * Math.sin(Mr) + 9.873 * Math.sin(2 * Mr + 3.5932); // Simplified equation of time

  const decl = 23.45 * Math.sin(Math.PI / 180 * (360 / 365 * (date.getDate() + 30 * date.getMonth() - 81)));
  const declRad = decl * Math.PI / 180;
  const latRad = lat * Math.PI / 180;

  const cosH = (Math.cos(90.833 * Math.PI / 180) - Math.sin(latRad) * Math.sin(declRad)) / (Math.cos(latRad) * Math.cos(declRad));
  
  if (cosH > 1 || cosH < -1) {
    return { sunrise: '06:00', sunset: '18:00' }; // Fallback for polar regions
  }

  const H = Math.acos(cosH) * 180 / Math.PI;

  const solarNoon = 720 - 4 * lon - eqTime;
  const sunriseMin = solarNoon - H * 4;
  const sunsetMin = solarNoon + H * 4;

  // Get timezone offset
  const tzOffset = date.getTimezoneOffset();

  const srMinLocal = sunriseMin - tzOffset;
  const ssMinLocal = sunsetMin - tzOffset;

  const formatTime = (mins: number): string => {
    let h = Math.floor(mins / 60);
    let m = Math.round(mins % 60);
    if (m === 60) { h++; m = 0; }
    if (h >= 24) h -= 24;
    if (h < 0) h += 24;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  return {
    sunrise: formatTime(srMinLocal),
    sunset: formatTime(ssMinLocal),
  };
}

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
  const jd = dateToJD(date);
  const sunLon = sunLongitude(jd);
  const moonLon = moonLongitude(jd);

  // Tithi calculation
  let diff = moonLon - sunLon;
  if (diff < 0) diff += 360;
  const tithiNum = Math.floor(diff / 12); // 0-29
  const tithiData = TITHI_NAMES[tithiNum];
  const paksha = tithiNum < 15 ? 'shukla' : 'krishna';

  // Nakshatra calculation
  const nakNum = Math.floor(moonLon / (360 / 27)); // 0-26
  const nakData = NAKSHATRA_NAMES[nakNum];

  // Yoga calculation
  let yogaAngle = sunLon + moonLon;
  if (yogaAngle >= 360) yogaAngle -= 360;
  const yogaNum = Math.floor(yogaAngle / (360 / 27));
  const yogaData = YOGA_NAMES[yogaNum % 27];

  // Karana calculation (half of tithi)
  const karanaNum = Math.floor(diff / 6) % 11;
  const karanaData = KARANA_NAMES[karanaNum];

  // Vara (day of week)
  const dayOfWeek = date.getDay();
  const varaData = VARA_NAMES[dayOfWeek];

  // Hindu month (approximate based on Sun's position)
  const hinduMonthNum = Math.floor(((sunLon + 360 - 23.5) % 360) / 30);
  const hinduMonth = HINDU_MONTHS[hinduMonthNum % 12];

  // Sunrise/Sunset
  const { sunrise, sunset } = calculateSunriseSunset(date, lat, lon);

  // Rahu Kaal
  const rahuKaal = calculateRahuKaal(dayOfWeek, sunrise, sunset);

  // Brahma Muhurta
  const brahmaMuhurta = calculateBrahmaMuhurta(sunrise);

  // Abhijit Muhurta
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
      endTime: '--:--',
    },
    nakshatra: {
      name: nakData.en,
      nameHi: nakData.hi,
      number: nakNum + 1,
      lord: nakData.lord,
      endTime: '--:--',
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
    moonrise: '--:--', // Simplified - would need more complex calculation
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
