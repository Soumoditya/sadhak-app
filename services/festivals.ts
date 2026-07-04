/**
 * Hindu Festival Database
 * Contains major and minor Hindu festivals with calculation rules
 * Dates are based on Hindu lunar calendar (Purnimant system)
 */

export interface Festival {
  id: string;
  name: string;
  nameHi: string;
  description: string;
  descriptionHi: string;
  type: 'major' | 'minor' | 'observance' | 'ekadashi' | 'pradosh' | 'sankranti';
  month: string; // Hindu month
  tithi?: string;
  paksha?: 'shukla' | 'krishna';
  fixedGregorian?: { month: number; day: number }; // For Sankranti-type festivals
  color: string;
  icon: string;
  rituals?: string[];
  fasting?: boolean;
  groomingRestricted?: boolean;
}

export const FESTIVALS: Festival[] = [
  // ===== MAJOR FESTIVALS =====
  {
    id: 'makar_sankranti',
    name: 'Makar Sankranti',
    nameHi: 'मकर संक्रांति',
    description: 'Sun enters Capricorn. Harvest festival celebrated with sesame and jaggery.',
    descriptionHi: 'सूर्य मकर राशि में प्रवेश। तिल-गुड़ का त्योहार।',
    type: 'major',
    month: 'Pausha',
    fixedGregorian: { month: 1, day: 14 },
    color: '#FFD700',
    icon: 'white-balance-sunny',
    rituals: ['Til-Gud distribution', 'Kite flying', 'Holy bath in rivers', 'Charity'],
    fasting: false,
  },
  {
    id: 'vasant_panchami',
    name: 'Vasant Panchami',
    nameHi: 'वसंत पंचमी',
    description: 'Celebration of Goddess Saraswati. Beginning of spring season.',
    descriptionHi: 'मां सरस्वती की पूजा। वसंत ऋतु का आगमन।',
    type: 'major',
    month: 'Magha',
    tithi: 'Panchami',
    paksha: 'shukla',
    color: '#FFD700',
    icon: 'flower-tulip',
    rituals: ['Saraswati Puja', 'Wearing yellow clothes', 'Flying kites'],
  },
  {
    id: 'maha_shivaratri',
    name: 'Maha Shivaratri',
    nameHi: 'महा शिवरात्रि',
    description: 'The Great Night of Lord Shiva. Night-long worship and fasting.',
    descriptionHi: 'भगवान शिव की महारात्रि। रात्रि जागरण और उपवास।',
    type: 'major',
    month: 'Phalguna',
    tithi: 'Chaturdashi',
    paksha: 'krishna',
    color: '#4A148C',
    icon: 'moon-waning-crescent',
    rituals: ['Night vigil', 'Shiva Linga Abhishek', 'Bel Patra offering', 'Fasting'],
    fasting: true,
    groomingRestricted: true,
  },
  {
    id: 'holi',
    name: 'Holi',
    nameHi: 'होली',
    description: 'Festival of Colors. Celebrates victory of good over evil.',
    descriptionHi: 'रंगों का त्योहार। बुराई पर अच्छाई की विजय।',
    type: 'major',
    month: 'Phalguna',
    tithi: 'Purnima',
    paksha: 'shukla',
    color: '#E91E63',
    icon: 'palette',
    rituals: ['Holika Dahan', 'Playing with colors', 'Thandai', 'Gujiya'],
  },
  {
    id: 'ugadi',
    name: 'Ugadi / Gudi Padwa / Hindu New Year',
    nameHi: 'उगादि / गुड़ी पड़वा / हिंदू नव वर्ष',
    description: 'Hindu New Year. Beginning of Chaitra month.',
    descriptionHi: 'हिंदू नव वर्ष। चैत्र मास का प्रारम्भ।',
    type: 'major',
    month: 'Chaitra',
    tithi: 'Pratipada',
    paksha: 'shukla',
    color: '#FF6B00',
    icon: 'party-popper',
    rituals: ['Panchanga Shravanam', 'Neem-Jaggery eating', 'New beginnings'],
  },
  {
    id: 'ram_navami',
    name: 'Ram Navami',
    nameHi: 'राम नवमी',
    description: 'Birth anniversary of Lord Rama. Day of dharma and righteousness.',
    descriptionHi: 'भगवान राम का जन्मोत्सव। धर्म और मर्यादा का दिन।',
    type: 'major',
    month: 'Chaitra',
    tithi: 'Navami',
    paksha: 'shukla',
    color: '#FF8C00',
    icon: 'bow-arrow',
    rituals: ['Ram Katha', 'Bhajan', 'Temple visit', 'Fasting'],
    fasting: true,
  },
  {
    id: 'hanuman_jayanti',
    name: 'Hanuman Jayanti',
    nameHi: 'हनुमान जयंती',
    description: 'Birth anniversary of Lord Hanuman.',
    descriptionHi: 'भगवान हनुमान का जन्मोत्सव।',
    type: 'major',
    month: 'Chaitra',
    tithi: 'Purnima',
    paksha: 'shukla',
    color: '#E65100',
    icon: 'shield-cross',
    rituals: ['Hanuman Chalisa', 'Sundarkand Path', 'Oil offering'],
    fasting: true,
  },
  {
    id: 'akshaya_tritiya',
    name: 'Akshaya Tritiya',
    nameHi: 'अक्षय तृतीया',
    description: 'Most auspicious day for new beginnings. Buying gold is tradition.',
    descriptionHi: 'नए कार्यों के लिए सर्वाधिक शुभ दिन।',
    type: 'major',
    month: 'Vaishakha',
    tithi: 'Tritiya',
    paksha: 'shukla',
    color: '#FFD700',
    icon: 'star-four-points',
    rituals: ['Charity', 'Gold purchase', 'Starting new ventures'],
  },
  {
    id: 'guru_purnima',
    name: 'Guru Purnima',
    nameHi: 'गुरु पूर्णिमा',
    description: 'Day to honor spiritual and academic teachers.',
    descriptionHi: 'गुरुओं के सम्मान का दिन।',
    type: 'major',
    month: 'Ashadha',
    tithi: 'Purnima',
    paksha: 'shukla',
    color: '#FF8C00',
    icon: 'school',
    rituals: ['Guru Puja', 'Vyasa Puja', 'Offering to teachers'],
  },
  {
    id: 'raksha_bandhan',
    name: 'Raksha Bandhan',
    nameHi: 'रक्षा बंधन',
    description: 'Festival of brother-sister bond. Sisters tie Rakhi on brothers\' wrists.',
    descriptionHi: 'भाई-बहन के बंधन का त्योहार। बहनें भाइयों को राखी बांधती हैं।',
    type: 'major',
    month: 'Shravana',
    tithi: 'Purnima',
    paksha: 'shukla',
    color: '#E91E63',
    icon: 'heart',
    rituals: ['Tying Rakhi', 'Sweets exchange', 'Prayers'],
  },
  {
    id: 'krishna_janmashtami',
    name: 'Krishna Janmashtami',
    nameHi: 'कृष्ण जन्माष्टमी',
    description: 'Birth of Lord Krishna at midnight. Day of devotion and fasting.',
    descriptionHi: 'मध्यरात्रि में भगवान कृष्ण का जन्म। भक्ति और उपवास का दिन।',
    type: 'major',
    month: 'Shravana',
    tithi: 'Ashtami',
    paksha: 'krishna',
    color: '#1A237E',
    icon: 'flute',
    rituals: ['Midnight celebration', 'Dahi Handi', 'Fasting', 'Bhajan'],
    fasting: true,
    groomingRestricted: true,
  },
  {
    id: 'ganesh_chaturthi',
    name: 'Ganesh Chaturthi',
    nameHi: 'गणेश चतुर्थी',
    description: 'Birthday of Lord Ganesha. 10-day celebration.',
    descriptionHi: 'भगवान गणेश का जन्मोत्सव। दस दिवसीय उत्सव।',
    type: 'major',
    month: 'Bhadrapada',
    tithi: 'Chaturthi',
    paksha: 'shukla',
    color: '#E65100',
    icon: 'elephant',
    rituals: ['Ganesh Sthapana', 'Modak offering', 'Aarti', 'Visarjan on 10th day'],
  },
  {
    id: 'navratri_sharad',
    name: 'Sharad Navratri',
    nameHi: 'शारदीय नवरात्रि',
    description: 'Nine nights of Goddess Durga worship. Most important Navratri.',
    descriptionHi: 'देवी दुर्गा की पूजा के नौ दिन। सबसे महत्वपूर्ण नवरात्रि।',
    type: 'major',
    month: 'Ashvina',
    tithi: 'Pratipada',
    paksha: 'shukla',
    color: '#C62828',
    icon: 'sword-cross',
    rituals: ['Daily Durga Puja', 'Fasting', 'Garba/Dandiya', 'Kanya Pujan'],
    fasting: true,
    groomingRestricted: true,
  },
  {
    id: 'dussehra',
    name: 'Dussehra / Vijayadashami',
    nameHi: 'दशहरा / विजयादशमी',
    description: 'Victory of Lord Rama over Ravana. End of Navratri.',
    descriptionHi: 'भगवान राम की रावण पर विजय। नवरात्रि का समापन।',
    type: 'major',
    month: 'Ashvina',
    tithi: 'Dashami',
    paksha: 'shukla',
    color: '#D32F2F',
    icon: 'sword',
    rituals: ['Ravan Dahan', 'Shami Puja', 'Weapon worship', 'New beginnings'],
  },
  {
    id: 'karwa_chauth',
    name: 'Karwa Chauth',
    nameHi: 'करवा चौथ',
    description: 'Married women fast for husband\'s long life.',
    descriptionHi: 'विवाहित महिलाएं पति की लंबी उम्र के लिए व्रत रखती हैं।',
    type: 'major',
    month: 'Kartika',
    tithi: 'Chaturthi',
    paksha: 'krishna',
    color: '#E91E63',
    icon: 'moon-full',
    rituals: ['Fasting till moonrise', 'Viewing moon through sieve', 'Puja'],
    fasting: true,
  },
  {
    id: 'dhanteras',
    name: 'Dhanteras',
    nameHi: 'धनतेरस',
    description: 'Worship of Lord Dhanvantari. Buying gold/silver is tradition.',
    descriptionHi: 'भगवान धन्वंतरि की पूजा। सोना-चांदी खरीदने की परंपरा।',
    type: 'major',
    month: 'Kartika',
    tithi: 'Trayodashi',
    paksha: 'krishna',
    color: '#FFD700',
    icon: 'currency-inr',
    rituals: ['Lakshmi Puja', 'Buying metals', 'Diya lighting'],
  },
  {
    id: 'diwali',
    name: 'Diwali',
    nameHi: 'दीपावली',
    description: 'Festival of Lights. Return of Lord Rama to Ayodhya. Victory of light over darkness.',
    descriptionHi: 'दीपों का त्योहार। भगवान राम की अयोध्या वापसी। अंधकार पर प्रकाश की विजय।',
    type: 'major',
    month: 'Kartika',
    tithi: 'Amavasya',
    paksha: 'krishna',
    color: '#FF6F00',
    icon: 'candle',
    rituals: ['Lakshmi-Ganesh Puja', 'Diya lighting', 'Rangoli', 'Fireworks', 'Sweets'],
  },
  {
    id: 'govardhan_puja',
    name: 'Govardhan Puja / Annakut',
    nameHi: 'गोवर्धन पूजा / अन्नकूट',
    description: 'Day after Diwali. Krishna lifted Govardhan Hill.',
    descriptionHi: 'दीवाली के अगले दिन। कृष्ण ने गोवर्धन पर्वत उठाया।',
    type: 'major',
    month: 'Kartika',
    tithi: 'Pratipada',
    paksha: 'shukla',
    color: '#4CAF50',
    icon: 'mountain',
    rituals: ['Annakut offering', 'Govardhan Puja', 'Cow worship'],
  },
  {
    id: 'bhai_dooj',
    name: 'Bhai Dooj',
    nameHi: 'भाई दूज',
    description: 'Brother-sister celebration. Sister applies tilak on brother\'s forehead.',
    descriptionHi: 'भाई-बहन का उत्सव। बहन भाई के माथे पर तिलक लगाती है।',
    type: 'major',
    month: 'Kartika',
    tithi: 'Dwitiya',
    paksha: 'shukla',
    color: '#E91E63',
    icon: 'account-heart',
    rituals: ['Tilak ceremony', 'Gifts exchange', 'Special meals'],
  },
  {
    id: 'chhath_puja',
    name: 'Chhath Puja',
    nameHi: 'छठ पूजा',
    description: 'Worship of Sun God and Chhathi Maiya. 4-day festival of devotion.',
    descriptionHi: 'सूर्य देव और छठी मैया की पूजा। चार दिवसीय भक्ति पर्व।',
    type: 'major',
    month: 'Kartika',
    tithi: 'Shashthi',
    paksha: 'shukla',
    color: '#FF6B00',
    icon: 'weather-sunset',
    rituals: ['Holy bath', 'Fasting', 'Arghya to Sun', 'Thekua offering'],
    fasting: true,
    groomingRestricted: true,
  },

  // ===== MINOR FESTIVALS & OBSERVANCES =====
  {
    id: 'pongal',
    name: 'Pongal / Lohri',
    nameHi: 'पोंगल / लोहड़ी',
    description: 'Harvest festival celebrated in South & North India.',
    descriptionHi: 'फसल कटाई का त्योहार।',
    type: 'minor',
    month: 'Pausha',
    fixedGregorian: { month: 1, day: 13 },
    color: '#8BC34A',
    icon: 'fire',
  },
  {
    id: 'magh_purnima',
    name: 'Magh Purnima',
    nameHi: 'माघ पूर्णिमा',
    description: 'Holy bath in rivers. Very auspicious Purnima.',
    descriptionHi: 'नदियों में पवित्र स्नान। अत्यंत शुभ पूर्णिमा।',
    type: 'observance',
    month: 'Magha',
    tithi: 'Purnima',
    paksha: 'shukla',
    color: '#2196F3',
    icon: 'water',
    fasting: true,
  },
  {
    id: 'nag_panchami',
    name: 'Nag Panchami',
    nameHi: 'नाग पंचमी',
    description: 'Worship of serpent deities (Nagas).',
    descriptionHi: 'नाग देवताओं की पूजा।',
    type: 'minor',
    month: 'Shravana',
    tithi: 'Panchami',
    paksha: 'shukla',
    color: '#4CAF50',
    icon: 'snake',
  },
  {
    id: 'hariyali_teej',
    name: 'Hariyali Teej',
    nameHi: 'हरियाली तीज',
    description: 'Women\'s festival celebrating monsoon and marital bliss.',
    descriptionHi: 'सावन और वैवाहिक सुख का त्योहार।',
    type: 'minor',
    month: 'Shravana',
    tithi: 'Tritiya',
    paksha: 'shukla',
    color: '#4CAF50',
    icon: 'leaf',
    fasting: true,
  },
  {
    id: 'onam',
    name: 'Onam',
    nameHi: 'ओणम',
    description: 'Kerala\'s harvest festival honoring King Mahabali.',
    descriptionHi: 'केरल का फसल उत्सव। राजा महाबली का सम्मान।',
    type: 'minor',
    month: 'Shravana',
    color: '#FFD700',
    icon: 'flower',
  },
  {
    id: 'anant_chaturdashi',
    name: 'Anant Chaturdashi',
    nameHi: 'अनंत चतुर्दशी',
    description: 'Worship of Lord Vishnu in his infinite form. Ganesh Visarjan.',
    descriptionHi: 'भगवान विष्णु के अनंत रूप की पूजा। गणेश विसर्जन।',
    type: 'observance',
    month: 'Bhadrapada',
    tithi: 'Chaturdashi',
    paksha: 'shukla',
    color: '#1565C0',
    icon: 'infinity',
  },
  {
    id: 'sharad_purnima',
    name: 'Sharad Purnima',
    nameHi: 'शरद पूर्णिमा',
    description: 'Brightest full moon. Kheer kept under moonlight.',
    descriptionHi: 'सबसे उज्ज्वल पूर्णिमा। चांदनी में खीर रखी जाती है।',
    type: 'observance',
    month: 'Ashvina',
    tithi: 'Purnima',
    paksha: 'shukla',
    color: '#E0E0E0',
    icon: 'moon-full',
  },
  {
    id: 'tulsi_vivah',
    name: 'Tulsi Vivah',
    nameHi: 'तुलसी विवाह',
    description: 'Ceremonial marriage of Tulsi plant with Lord Vishnu.',
    descriptionHi: 'तुलसी और भगवान विष्णु का विवाह।',
    type: 'observance',
    month: 'Kartika',
    tithi: 'Dwadashi',
    paksha: 'shukla',
    color: '#4CAF50',
    icon: 'leaf',
  },
  {
    id: 'dev_uthani_ekadashi',
    name: 'Dev Uthani / Prabodhini Ekadashi',
    nameHi: 'देवउठनी / प्रबोधिनी एकादशी',
    description: 'Lord Vishnu awakens from cosmic sleep. Marriage season begins.',
    descriptionHi: 'भगवान विष्णु योग निद्रा से जागते हैं। विवाह का मौसम शुरू।',
    type: 'ekadashi',
    month: 'Kartika',
    tithi: 'Ekadashi',
    paksha: 'shukla',
    color: '#1565C0',
    icon: 'weather-sunny',
    fasting: true,
  },

  // ===== PITRU PAKSHA =====
  {
    id: 'pitru_paksha',
    name: 'Pitru Paksha (Shraddha Period)',
    nameHi: 'पितृ पक्ष (श्राद्ध काल)',
    description: '16-day period for honoring ancestors. No auspicious activities.',
    descriptionHi: 'पितरों के सम्मान के 16 दिन। कोई शुभ कार्य नहीं।',
    type: 'observance',
    month: 'Bhadrapada',
    paksha: 'krishna',
    color: '#616161',
    icon: 'account-group',
    groomingRestricted: true,
  },
];

/**
 * Get festivals for a specific Hindu month and tithi
 */
export function getFestivalsForDate(
  hinduMonth: string,
  tithi: string,
  paksha: 'shukla' | 'krishna'
): Festival[] {
  return FESTIVALS.filter(f => {
    if (f.month !== hinduMonth) return false;
    if (f.tithi && f.tithi !== tithi) return false;
    if (f.paksha && f.paksha !== paksha) return false;
    return true;
  });
}

/**
 * Get festivals for a Gregorian date (for fixed-date festivals like Sankranti)
 */
export function getFixedFestivals(month: number, day: number): Festival[] {
  return FESTIVALS.filter(f => 
    f.fixedGregorian?.month === month && f.fixedGregorian?.day === day
  );
}

/**
 * Get all festivals for a specific type
 */
export function getFestivalsByType(type: Festival['type']): Festival[] {
  return FESTIVALS.filter(f => f.type === type);
}

/**
 * Search festivals by name
 */
export function searchFestivals(query: string): Festival[] {
  const lower = query.toLowerCase();
  return FESTIVALS.filter(f => 
    f.name.toLowerCase().includes(lower) ||
    f.nameHi.includes(query) ||
    f.description.toLowerCase().includes(lower)
  );
}
