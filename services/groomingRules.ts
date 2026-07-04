/**
 * Hindu Grooming Rules Engine
 * Based on Dharmashastra, Smriti texts, and traditional orthodox Hindu practices
 * 
 * Rules cover hair cutting, shaving, and nail cutting based on:
 * - Day of the week (vara)
 * - Tithi (lunar day)
 * - Nakshatra
 * - Gender
 * - Marriage status
 * - Special occasions (festivals, eclipses, shraddha)
 */

export type Gender = 'male' | 'female';
export type MarriageStatus = 'married' | 'unmarried' | 'widowed';
export type GroomingType = 'haircut' | 'shaving' | 'nailcut';
export type GroomingStatus = 'allowed' | 'avoid' | 'forbidden';

export interface GroomingRule {
  type: GroomingType;
  status: GroomingStatus;
  reason: string;
  reasonHi: string;
  scripture: string;
  severity: 'high' | 'medium' | 'low'; // high = strictly forbidden, medium = should avoid, low = mild caution
}

export interface DailyGroomingAdvice {
  date: Date;
  dayOfWeek: number;
  rules: GroomingRule[];
  overallStatus: GroomingStatus;
  summary: string;
  summaryHi: string;
}

// Day-based grooming restrictions
const DAY_RULES: Record<number, {
  haircut: { status: GroomingStatus; reason: string; reasonHi: string; scripture: string; severity: 'high' | 'medium' | 'low' };
  shaving: { status: GroomingStatus; reason: string; reasonHi: string; scripture: string; severity: 'high' | 'medium' | 'low' };
  nailcut: { status: GroomingStatus; reason: string; reasonHi: string; scripture: string; severity: 'high' | 'medium' | 'low' };
}> = {
  0: { // Sunday (Ravivar)
    haircut: { status: 'avoid', reason: 'Avoid haircut on Sunday — ruled by Surya Dev. May reduce lifespan and vitality.', reasonHi: 'रविवार को बाल न कटवाएं — सूर्य देव का दिन। आयु और तेज में कमी हो सकती है।', scripture: 'Dharmasindhu', severity: 'medium' },
    shaving: { status: 'avoid', reason: 'Avoid shaving on Sunday — may diminish solar energy and health.', reasonHi: 'रविवार को दाढ़ी न बनवाएं — स्वास्थ्य पर प्रभाव पड़ सकता है।', scripture: 'Dharmasindhu', severity: 'medium' },
    nailcut: { status: 'avoid', reason: 'Avoid cutting nails on Sunday.', reasonHi: 'रविवार को नाखून न काटें।', scripture: 'Smriti Texts', severity: 'low' },
  },
  1: { // Monday (Somvar)
    haircut: { status: 'allowed', reason: 'Monday is generally safe for grooming — blessed by Chandra/Shiva.', reasonHi: 'सोमवार को बाल कटवाना शुभ — चन्द्रमा/शिव जी का दिन।', scripture: 'General Practice', severity: 'low' },
    shaving: { status: 'allowed', reason: 'Shaving on Monday is considered acceptable.', reasonHi: 'सोमवार को दाढ़ी बनाना उचित है।', scripture: 'General Practice', severity: 'low' },
    nailcut: { status: 'allowed', reason: 'Nail cutting on Monday is acceptable.', reasonHi: 'सोमवार को नाखून काटना ठीक है।', scripture: 'General Practice', severity: 'low' },
  },
  2: { // Tuesday (Mangalvar)
    haircut: { status: 'forbidden', reason: 'STRICTLY AVOID haircut on Tuesday — Mangal (Mars) day. Cutting hair invites ill fortune, conflicts, and health problems.', reasonHi: 'मंगलवार को बाल कदापि न कटवाएं — मंगल ग्रह का दिन। अशुभ, कलह और स्वास्थ्य हानि।', scripture: 'Dharmashastra, Nirnaya Sindhu', severity: 'high' },
    shaving: { status: 'forbidden', reason: 'STRICTLY AVOID shaving on Tuesday — invites Mars-related doshas.', reasonHi: 'मंगलवार को दाढ़ी न बनवाएं — मंगल दोष लगता है।', scripture: 'Dharmashastra', severity: 'high' },
    nailcut: { status: 'forbidden', reason: 'STRICTLY AVOID cutting nails on Tuesday.', reasonHi: 'मंगलवार को नाखून कदापि न काटें।', scripture: 'Dharmashastra', severity: 'high' },
  },
  3: { // Wednesday (Budhvar)
    haircut: { status: 'allowed', reason: 'Wednesday is auspicious for haircut — Budha (Mercury) promotes good intellect and growth.', reasonHi: 'बुधवार को बाल कटवाना शुभ — बुध ग्रह बुद्धि और विकास देता है।', scripture: 'Jyotish Shastra', severity: 'low' },
    shaving: { status: 'allowed', reason: 'Shaving on Wednesday is considered good.', reasonHi: 'बुधवार को दाढ़ी बनाना शुभ है।', scripture: 'Jyotish Shastra', severity: 'low' },
    nailcut: { status: 'allowed', reason: 'Nail cutting on Wednesday is fine.', reasonHi: 'बुधवार को नाखून काटना ठीक है।', scripture: 'General Practice', severity: 'low' },
  },
  4: { // Thursday (Guruvar)
    haircut: { status: 'forbidden', reason: 'AVOID haircut on Thursday — Guru (Jupiter) day. Disrespects the Guru tattva. Can cause loss of wisdom and wealth.', reasonHi: 'गुरुवार को बाल न कटवाएं — बृहस्पति देव का दिन। गुरु तत्व का अपमान। ज्ञान और धन हानि।', scripture: 'Dharmashastra, Vishnu Smriti', severity: 'high' },
    shaving: { status: 'avoid', reason: 'Avoid shaving on Thursday — may reduce Guru blessings.', reasonHi: 'गुरुवार को दाढ़ी न बनवाएं — गुरु कृपा में कमी।', scripture: 'Smriti Texts', severity: 'medium' },
    nailcut: { status: 'avoid', reason: 'Avoid cutting nails on Thursday.', reasonHi: 'गुरुवार को नाखून न काटें।', scripture: 'Traditional Practice', severity: 'medium' },
  },
  5: { // Friday (Shukravar)
    haircut: { status: 'allowed', reason: 'Friday is auspicious for grooming — Shukra (Venus) day promotes beauty and grace.', reasonHi: 'शुक्रवार को बाल कटवाना शुभ — शुक्र ग्रह सौंदर्य और शृंगार का दिन।', scripture: 'Jyotish Shastra', severity: 'low' },
    shaving: { status: 'allowed', reason: 'Shaving on Friday is considered auspicious — enhances appearance.', reasonHi: 'शुक्रवार को दाढ़ी बनाना शुभ — रूप निखरता है।', scripture: 'Jyotish Shastra', severity: 'low' },
    nailcut: { status: 'allowed', reason: 'Friday is fine for nail cutting.', reasonHi: 'शुक्रवार को नाखून काटना ठीक है।', scripture: 'General Practice', severity: 'low' },
  },
  6: { // Saturday (Shanivar)
    haircut: { status: 'forbidden', reason: 'STRICTLY AVOID haircut on Saturday — Shani (Saturn) day. Invites Shani dosha, misfortune, obstacles, and health issues.', reasonHi: 'शनिवार को बाल कदापि न कटवाएं — शनि देव का दिन। शनि दोष, दुर्भाग्य, विघ्न और स्वास्थ्य हानि।', scripture: 'Dharmashastra, Shani Mahatmya', severity: 'high' },
    shaving: { status: 'forbidden', reason: 'STRICTLY AVOID shaving on Saturday — angers Shani Dev.', reasonHi: 'शनिवार को दाढ़ी न बनवाएं — शनि देव कुपित होते हैं।', scripture: 'Dharmashastra', severity: 'high' },
    nailcut: { status: 'forbidden', reason: 'STRICTLY AVOID cutting nails on Saturday — invites Shani dosha.', reasonHi: 'शनिवार को नाखून कदापि न काटें — शनि दोष लगता है।', scripture: 'Dharmashastra', severity: 'high' },
  },
};

// Tithi-based restrictions
const TITHI_RESTRICTIONS: Record<string, {
  allGrooming: { status: GroomingStatus; reason: string; reasonHi: string; scripture: string };
}> = {
  'Amavasya': {
    allGrooming: {
      status: 'forbidden',
      reason: 'FORBIDDEN on Amavasya (New Moon) — extremely inauspicious for any grooming. Associated with Pitru dosha.',
      reasonHi: 'अमावस्या को कोई भी शृंगार कार्य वर्जित — अत्यंत अशुभ। पितृ दोष लगता है।',
      scripture: 'Garuda Purana, Dharmasindhu',
    },
  },
  'Purnima': {
    allGrooming: {
      status: 'avoid',
      reason: 'Avoid grooming on Purnima (Full Moon) — day of fasting and spiritual observance.',
      reasonHi: 'पूर्णिमा को शृंगार से बचें — उपवास और आध्यात्मिक साधना का दिन।',
      scripture: 'Smriti Texts',
    },
  },
  'Chaturthi': {
    allGrooming: {
      status: 'avoid',
      reason: 'Avoid grooming on Chaturthi — sacred to Lord Ganesha.',
      reasonHi: 'चतुर्थी को शृंगार से बचें — गणेश जी का पवित्र दिन।',
      scripture: 'Dharmasindhu',
    },
  },
  'Ekadashi': {
    allGrooming: {
      status: 'avoid',
      reason: 'Avoid grooming on Ekadashi — day of Vishnu devotion, fasting, and spiritual discipline.',
      reasonHi: 'एकादशी को शृंगार से बचें — विष्णु भक्ति, उपवास और साधना का दिन।',
      scripture: 'Padma Purana',
    },
  },
  'Chaturdashi': {
    allGrooming: {
      status: 'avoid',
      reason: 'Avoid grooming on Chaturdashi — close to Purnima/Amavasya, spiritually sensitive day.',
      reasonHi: 'चतुर्दशी को शृंगार से बचें — पूर्णिमा/अमावस्या का निकटतम, आध्यात्मिक रूप से संवेदनशील दिन।',
      scripture: 'Nirnaya Sindhu',
    },
  },
};

// Special occasion restrictions
export const SPECIAL_RESTRICTIONS = {
  eclipse: {
    status: 'forbidden' as GroomingStatus,
    reason: 'ALL grooming STRICTLY FORBIDDEN during solar/lunar eclipse (Grahan). Period of spiritual impurity (Sutak).',
    reasonHi: 'ग्रहण काल में सभी शृंगार कार्य सर्वथा वर्जित। सूतक काल।',
    scripture: 'Dharmashastra, Matsya Purana',
  },
  shraddha: {
    status: 'forbidden' as GroomingStatus,
    reason: 'ALL grooming FORBIDDEN during Shraddha period (ancestor rites). Shows respect to departed souls.',
    reasonHi: 'श्राद्ध काल में सभी शृंगार कार्य वर्जित। पितरों के प्रति सम्मान।',
    scripture: 'Garuda Purana, Vishnu Dharmottara',
  },
  navratri: {
    status: 'forbidden' as GroomingStatus,
    reason: 'ALL grooming FORBIDDEN during Navratri — nine nights of Devi worship and austerity.',
    reasonHi: 'नवरात्रि में सभी शृंगार कार्य वर्जित — देवी पूजन और तप के नौ दिन।',
    scripture: 'Devi Bhagavata Purana',
  },
  adhikMaas: {
    status: 'avoid' as GroomingStatus,
    reason: 'Avoid grooming during Adhik Maas (extra lunar month) — considered inauspicious for worldly activities.',
    reasonHi: 'अधिक मास में शृंगार से बचें — सांसारिक कार्यों के लिए अशुभ।',
    scripture: 'Dharmasindhu',
  },
};

/**
 * Get gender-specific grooming advice
 */
function getGenderSpecificRules(gender: Gender, marriageStatus: MarriageStatus): string[] {
  const rules: string[] = [];

  if (gender === 'female') {
    rules.push('Women traditionally do not cut hair on Tuesday, Thursday, and Saturday.');
    if (marriageStatus === 'married') {
      rules.push('Married women should especially avoid hair cutting during husband\'s birth nakshatra day.');
    }
    if (marriageStatus === 'widowed') {
      rules.push('Widowed women follow additional restrictions as per family tradition.');
    }
  }

  if (gender === 'male') {
    if (marriageStatus === 'unmarried') {
      rules.push('Unmarried men (Brahmacharis) should maintain regularity in grooming on permitted days only.');
    }
    if (marriageStatus === 'married') {
      rules.push('Married men should avoid grooming on wife\'s birth nakshatra day for her well-being.');
    }
  }

  return rules;
}

/**
 * Get the tithi name for a lunar day (simplified)
 * In production, this should use astronomical calculations
 */
export function getTithiName(lunarDay: number, paksha: 'shukla' | 'krishna'): string {
  const tithiIndex = ((lunarDay - 1) % 15);
  if (tithiIndex === 14) {
    return paksha === 'shukla' ? 'Purnima' : 'Amavasya';
  }
  return TITHIS[tithiIndex];
}

const TITHIS = [
  'Pratipada', 'Dwitiya', 'Tritiya', 'Chaturthi', 'Panchami',
  'Shashthi', 'Saptami', 'Ashtami', 'Navami', 'Dashami',
  'Ekadashi', 'Dwadashi', 'Trayodashi', 'Chaturdashi', 'Purnima',
];

/**
 * Main function to get daily grooming advice
 */
export function getDailyGroomingAdvice(
  date: Date,
  gender: Gender,
  marriageStatus: MarriageStatus,
  tithi?: string,
  isSpecialOccasion?: keyof typeof SPECIAL_RESTRICTIONS,
): DailyGroomingAdvice {
  const dayOfWeek = date.getDay();
  const dayRules = DAY_RULES[dayOfWeek];
  const rules: GroomingRule[] = [];

  // Check special occasions first (highest priority)
  if (isSpecialOccasion && SPECIAL_RESTRICTIONS[isSpecialOccasion]) {
    const special = SPECIAL_RESTRICTIONS[isSpecialOccasion];
    const groomingTypes: GroomingType[] = ['haircut', 'shaving', 'nailcut'];
    groomingTypes.forEach(type => {
      rules.push({
        type,
        status: special.status,
        reason: special.reason,
        reasonHi: special.reasonHi,
        scripture: special.scripture,
        severity: 'high',
      });
    });

    return {
      date,
      dayOfWeek,
      rules,
      overallStatus: 'forbidden',
      summary: special.reason,
      summaryHi: special.reasonHi,
    };
  }

  // Check tithi restrictions
  if (tithi && TITHI_RESTRICTIONS[tithi]) {
    const tithiRule = TITHI_RESTRICTIONS[tithi].allGrooming;
    const groomingTypes: GroomingType[] = ['haircut', 'shaving', 'nailcut'];
    groomingTypes.forEach(type => {
      rules.push({
        type,
        status: tithiRule.status,
        reason: tithiRule.reason,
        reasonHi: tithiRule.reasonHi,
        scripture: tithiRule.scripture,
        severity: tithiRule.status === 'forbidden' ? 'high' : 'medium',
      });
    });
  } else {
    // Apply day-based rules
    rules.push({
      type: 'haircut',
      status: dayRules.haircut.status,
      reason: dayRules.haircut.reason,
      reasonHi: dayRules.haircut.reasonHi,
      scripture: dayRules.haircut.scripture,
      severity: dayRules.haircut.severity,
    });
    rules.push({
      type: 'shaving',
      status: dayRules.shaving.status,
      reason: dayRules.shaving.reason,
      reasonHi: dayRules.shaving.reasonHi,
      scripture: dayRules.shaving.scripture,
      severity: dayRules.shaving.severity,
    });
    rules.push({
      type: 'nailcut',
      status: dayRules.nailcut.status,
      reason: dayRules.nailcut.reason,
      reasonHi: dayRules.nailcut.reasonHi,
      scripture: dayRules.nailcut.scripture,
      severity: dayRules.nailcut.severity,
    });
  }

  // Determine overall status
  let overallStatus: GroomingStatus = 'allowed';
  if (rules.some(r => r.status === 'forbidden')) {
    overallStatus = 'forbidden';
  } else if (rules.some(r => r.status === 'avoid')) {
    overallStatus = 'avoid';
  }

  // Generate summary
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const dayNamesHi = ['रविवार', 'सोमवार', 'मंगलवार', 'बुधवार', 'गुरुवार', 'शुक्रवार', 'शनिवार'];

  let summary = '';
  let summaryHi = '';
  if (overallStatus === 'forbidden') {
    summary = `❌ Grooming restricted on ${dayNames[dayOfWeek]}${tithi ? ` (${tithi})` : ''}`;
    summaryHi = `❌ ${dayNamesHi[dayOfWeek]}${tithi ? ` (${tithi})` : ''} को शृंगार वर्जित`;
  } else if (overallStatus === 'avoid') {
    summary = `⚠️ Caution advised for grooming on ${dayNames[dayOfWeek]}${tithi ? ` (${tithi})` : ''}`;
    summaryHi = `⚠️ ${dayNamesHi[dayOfWeek]}${tithi ? ` (${tithi})` : ''} को शृंगार में सावधानी`;
  } else {
    summary = `✅ ${dayNames[dayOfWeek]} is safe for grooming`;
    summaryHi = `✅ ${dayNamesHi[dayOfWeek]} को शृंगार शुभ है`;
  }

  return {
    date,
    dayOfWeek,
    rules,
    overallStatus,
    summary,
    summaryHi,
  };
}

/**
 * Get grooming status color
 */
export function getGroomingStatusColor(status: GroomingStatus): string {
  switch (status) {
    case 'allowed': return '#2D6A4F';
    case 'avoid': return '#F59E0B';
    case 'forbidden': return '#DC2626';
    default: return '#8A8A8A';
  }
}

/**
 * Get grooming status icon
 */
export function getGroomingStatusIcon(status: GroomingStatus): string {
  switch (status) {
    case 'allowed': return 'check-circle';
    case 'avoid': return 'alert-circle';
    case 'forbidden': return 'close-circle';
    default: return 'help-circle';
  }
}
