// National holidays and important days of India.
// Gazetted dates: DoPT lists for Central Government offices (Delhi), 2026
// and 2027. Islamic dates can move by a day with moon sighting.

export type Holiday = { name: string; hi: string; bn: string; kind: 'national' | 'gazetted' | 'day' };

// Same date every year.
const FIXED: Record<string, Holiday> = {
  '1-12': { name: 'National Youth Day', hi: 'राष्ट्रीय युवा दिवस', bn: 'জাতীয় যুব দিবস', kind: 'day' },
  '1-23': { name: 'Parakram Diwas (Netaji Jayanti)', hi: 'पराक्रम दिवस (नेताजी जयंती)', bn: 'পরাক্রম দিবস (নেতাজি জয়ন্তী)', kind: 'day' },
  '1-26': { name: 'Republic Day', hi: 'गणतंत्र दिवस', bn: 'প্রজাতন্ত্র দিবস', kind: 'national' },
  '1-30': { name: 'Martyrs’ Day', hi: 'शहीद दिवस', bn: 'শহিদ দিবস', kind: 'day' },
  '2-28': { name: 'National Science Day', hi: 'राष्ट्रीय विज्ञान दिवस', bn: 'জাতীয় বিজ্ঞান দিবস', kind: 'day' },
  '3-8': { name: 'International Women’s Day', hi: 'अंतरराष्ट्रीय महिला दिवस', bn: 'আন্তর্জাতিক নারী দিবস', kind: 'day' },
  '4-14': { name: 'Ambedkar Jayanti', hi: 'आंबेडकर जयंती', bn: 'আম্বেদকর জয়ন্তী', kind: 'day' },
  '5-1': { name: 'Labour Day', hi: 'मज़दूर दिवस', bn: 'শ্রমিক দিবস', kind: 'day' },
  '6-21': { name: 'International Yoga Day', hi: 'अंतरराष्ट्रीय योग दिवस', bn: 'আন্তর্জাতিক যোগ দিবস', kind: 'day' },
  '8-15': { name: 'Independence Day', hi: 'स्वतंत्रता दिवस', bn: 'স্বাধীনতা দিবস', kind: 'national' },
  '8-29': { name: 'National Sports Day', hi: 'राष्ट्रीय खेल दिवस', bn: 'জাতীয় ক্রীড়া দিবস', kind: 'day' },
  '9-5': { name: 'Teachers’ Day', hi: 'शिक्षक दिवस', bn: 'শিক্ষক দিবস', kind: 'day' },
  '9-14': { name: 'Hindi Diwas', hi: 'हिंदी दिवस', bn: 'হিন্দি দিবস', kind: 'day' },
  '10-2': { name: 'Gandhi Jayanti', hi: 'गांधी जयंती', bn: 'গান্ধী জয়ন্তী', kind: 'national' },
  '10-31': { name: 'Rashtriya Ekta Diwas', hi: 'राष्ट्रीय एकता दिवस', bn: 'রাষ্ট্রীয় একতা দিবস', kind: 'day' },
  '11-14': { name: 'Children’s Day', hi: 'बाल दिवस', bn: 'শিশু দিবস', kind: 'day' },
  '11-26': { name: 'Constitution Day', hi: 'संविधान दिवस', bn: 'সংবিধান দিবস', kind: 'day' },
  '12-25': { name: 'Christmas', hi: 'क्रिसमस', bn: 'বড়দিন', kind: 'gazetted' },
};

const G = (name: string, hi: string, bn: string): Holiday => ({ name, hi, bn, kind: 'gazetted' });

// Gazetted holidays that move each year (y-m-d).
const DATED: Record<string, Holiday> = {
  // 2026
  '2026-3-4': G('Holi', 'होली', 'দোল / হোলি'),
  '2026-3-21': G('Id-ul-Fitr', 'ईद-उल-फ़ित्र', 'ঈদ-উল-ফিতর'),
  '2026-3-26': G('Ram Navami', 'राम नवमी', 'রাম নবমী'),
  '2026-3-31': G('Mahavir Jayanti', 'महावीर जयंती', 'মহাবীর জয়ন্তী'),
  '2026-4-3': G('Good Friday', 'गुड फ्राइडे', 'গুড ফ্রাইডে'),
  '2026-5-1': G('Buddha Purnima', 'बुद्ध पूर्णिमा', 'বুদ্ধ পূর্ণিমা'),
  '2026-5-27': G('Id-ul-Zuha (Bakrid)', 'ईद-उल-ज़ुहा (बकरीद)', 'ঈদ-উল-আজহা'),
  '2026-6-26': G('Muharram', 'मुहर्रम', 'মহরম'),
  '2026-8-26': G('Milad-un-Nabi', 'मिलाद-उन-नबी', 'মিলাদ-উন-নবী'),
  '2026-9-4': G('Janmashtami', 'जन्माष्टमी', 'জন্মাষ্টমী'),
  '2026-10-20': G('Dussehra', 'दशहरा', 'দশেরা / বিজয়া দশমী'),
  '2026-11-8': G('Diwali', 'दीपावली', 'দীপাবলি'),
  '2026-11-24': G('Guru Nanak Jayanti', 'गुरु नानक जयंती', 'গুরু নানক জয়ন্তী'),
  // 2027
  '2027-3-10': G('Id-ul-Fitr', 'ईद-उल-फ़ित्र', 'ঈদ-উল-ফিতর'),
  '2027-3-23': G('Holi', 'होली', 'দোল / হোলি'),
  '2027-3-26': G('Good Friday', 'गुड फ्राइडे', 'গুড ফ্রাইডে'),
  '2027-4-15': G('Ram Navami', 'राम नवमी', 'রাম নবমী'),
  '2027-4-19': G('Mahavir Jayanti', 'महावीर जयंती', 'মহাবীর জয়ন্তী'),
  '2027-5-17': G('Id-ul-Zuha (Bakrid)', 'ईद-उल-ज़ुहा (बकरीद)', 'ঈদ-উল-আজহা'),
  '2027-5-20': G('Buddha Purnima', 'बुद्ध पूर्णिमा', 'বুদ্ধ পূর্ণিমা'),
  '2027-6-16': G('Muharram', 'मुहर्रम', 'মহরম'),
  '2027-8-15': G('Milad-un-Nabi', 'मिलाद-उन-नबी', 'মিলাদ-উন-নবী'),
  '2027-8-25': G('Janmashtami', 'जन्माष्टमी', 'জন্মাষ্টমী'),
  '2027-10-9': G('Dussehra', 'दशहरा', 'দশেরা / বিজয়া দশমী'),
  '2027-10-29': G('Diwali', 'दीपावली', 'দীপাবলি'),
  '2027-11-14': G('Guru Nanak Jayanti', 'गुरु नानक जयंती', 'গুরু নানক জয়ন্তী'),
};

/** Holidays and important days on a date (public holidays first). */
export function holidaysOn(d: Date): Holiday[] {
  const md = `${d.getMonth() + 1}-${d.getDate()}`;
  const out: Holiday[] = [];
  const dated = DATED[`${d.getFullYear()}-${md}`];
  if (dated) out.push(dated);
  const fixed = FIXED[md];
  if (fixed) out.push(fixed);
  const rank = { national: 0, gazetted: 1, day: 2 } as const;
  return out.sort((a, b) => rank[a.kind] - rank[b.kind]);
}

export const isPublicHoliday = (h: Holiday) => h.kind !== 'day';
