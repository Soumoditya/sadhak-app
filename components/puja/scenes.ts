/**
 * The four pujas: the painted place, where the deity stands in it, what can be offered and the
 * mantras said while offering. Points are fractions of the background picture (0–1 across,
 * 0–1 down), so they hold on every screen size; the stage maps them through the same "cover"
 * crop the picture gets.
 *
 * Mantras are the traditional Sanskrit texts (public domain), shown in Devanagari with a
 * Latin reading under them.
 */
export type Lang = 'en' | 'hi' | 'bn';

export type SpriteName =
  | 'aarti-thali' | 'akshat' | 'bel-patra' | 'bell' | 'bowl-curd' | 'bowl-ghee' | 'bowl-honey' | 'bowl-milk'
  | 'bowl-sandal' | 'bowl-water' | 'coconut' | 'conch' | 'diya' | 'firewood' | 'guggal' | 'incense' | 'kalash'
  | 'lotus' | 'marigold' | 'paddy';

export const SPRITES: readonly SpriteName[] = [
  'aarti-thali', 'akshat', 'bel-patra', 'bell', 'bowl-curd', 'bowl-ghee', 'bowl-honey', 'bowl-milk',
  'bowl-sandal', 'bowl-water', 'coconut', 'conch', 'diya', 'firewood', 'guggal', 'incense', 'kalash',
  'lotus', 'marigold', 'paddy',
];

export type OfferingKind =
  /** Poured from the vessel onto the deity: a stream, a splash, the stone wet for a while. */
  | 'pour'
  /** Many small pieces fall and stay at the deity's feet. */
  | 'shower'
  /** The thing itself is set down and stays. */
  | 'place'
  /** A lamp set down and lit; it keeps burning. */
  | 'light'
  /** Incense set down; smoke keeps rising. */
  | 'smoke'
  | 'bell'
  | 'conch'
  /** The thali is carried in circles by the reader's finger. */
  | 'aarti'
  /** Given to the havan fire. */
  | 'ahuti';

export interface Offering {
  id: string;
  sprite: SpriteName;
  kind: OfferingKind;
  label: Readonly<Record<Lang, string>>;
  /** Liquid colour for a pour; piece colour for grain showers. */
  colour?: string;
  /** Grain showers draw small grains instead of little copies of the picture. */
  grain?: boolean;
}

export interface Mantra {
  dev: string;
  latin: string;
}

export interface Scene {
  id: 'shiva' | 'havan' | 'ganesh' | 'tulsi';
  bg: 'bg-shiva' | 'bg-havan' | 'bg-ghar-mandir' | 'bg-tulsi';
  title: Readonly<Record<Lang, string>>;
  blurb: Readonly<Record<Lang, string>>;
  deity: Readonly<Record<Lang, string>>;
  /** How far down the picture the deity sits, for the card on the puja list: that point is
   *  shown in the clear part of the card, above the caption. */
  card: number;
  /** Where pours land and what aarti circles (the deity, or the fire). */
  target: { x: number; y: number };
  /** The strip where flowers and grains come to rest. */
  rest: { x0: number; x1: number; y: number };
  lamp: { x: number; y: number };
  incense: { x: number; y: number };
  bell: { x: number; y: number };
  /** Havan only: the fire's base and width. */
  fire?: { x: number; y: number; w: number };
  offerings: readonly Offering[];
  mantras: readonly Mantra[];
}

const L = (en: string, hi: string, bn: string) => ({ en, hi, bn });

const O = {
  water: { id: 'water', sprite: 'kalash', kind: 'pour', colour: '#cfe7ff', label: L('Water', 'जल', 'জল') },
  milk: { id: 'milk', sprite: 'bowl-milk', kind: 'pour', colour: '#fbf8f0', label: L('Milk', 'दूध', 'দুধ') },
  curd: { id: 'curd', sprite: 'bowl-curd', kind: 'pour', colour: '#f4efe2', label: L('Curd', 'दही', 'দই') },
  honey: { id: 'honey', sprite: 'bowl-honey', kind: 'pour', colour: '#d9921f', label: L('Honey', 'शहद', 'মধু') },
  ghee: { id: 'ghee', sprite: 'bowl-ghee', kind: 'pour', colour: '#f1c34e', label: L('Ghee', 'घी', 'ঘি') },
  sandal: { id: 'sandal', sprite: 'bowl-sandal', kind: 'pour', colour: '#d8b58c', label: L('Sandal', 'चंदन', 'চন্দন') },
  bel: { id: 'bel', sprite: 'bel-patra', kind: 'shower', label: L('Bel leaves', 'बेलपत्र', 'বেলপাতা') },
  flowers: { id: 'flowers', sprite: 'marigold', kind: 'shower', label: L('Flowers', 'फूल', 'ফুল') },
  lotus: { id: 'lotus', sprite: 'lotus', kind: 'place', label: L('Lotus', 'कमल', 'পদ্ম') },
  akshat: { id: 'akshat', sprite: 'akshat', kind: 'shower', grain: true, colour: '#fbf6ea', label: L('Akshat', 'अक्षत', 'অক্ষত') },
  coconut: { id: 'coconut', sprite: 'coconut', kind: 'place', label: L('Coconut', 'नारियल', 'নারকেল') },
  lamp: { id: 'lamp', sprite: 'diya', kind: 'light', label: L('Lamp', 'दीप', 'প্রদীপ') },
  incense: { id: 'incense', sprite: 'incense', kind: 'smoke', label: L('Incense', 'धूप', 'ধূপ') },
  bell: { id: 'bell', sprite: 'bell', kind: 'bell', label: L('Bell', 'घंटी', 'ঘণ্টা') },
  conch: { id: 'conch', sprite: 'conch', kind: 'conch', label: L('Conch', 'शंख', 'শঙ্খ') },
  aarti: { id: 'aarti', sprite: 'aarti-thali', kind: 'aarti', label: L('Aarti', 'आरती', 'আরতি') },
} as const satisfies Record<string, Offering>;

const AHUTI = {
  samidha: { id: 'samidha', sprite: 'firewood', kind: 'ahuti', label: L('Samidha', 'समिधा', 'সমিধ') },
  ghee: { id: 'ghee', sprite: 'bowl-ghee', kind: 'ahuti', label: L('Ghee', 'घी', 'ঘি') },
  guggal: { id: 'guggal', sprite: 'guggal', kind: 'ahuti', label: L('Guggal', 'गुग्गुल', 'গুগ্গুল') },
  paddy: { id: 'paddy', sprite: 'paddy', kind: 'ahuti', label: L('Paddy', 'धान', 'ধান') },
  akshat: { id: 'akshat', sprite: 'akshat', kind: 'ahuti', label: L('Akshat', 'अक्षत', 'অক্ষত') },
  coconut: { id: 'coconut', sprite: 'coconut', kind: 'ahuti', label: L('Purnahuti', 'पूर्णाहुति', 'পূর্ণাহুতি') },
} as const satisfies Record<string, Offering>;

export const SCENES: readonly Scene[] = [
  {
    id: 'shiva',
    bg: 'bg-shiva',
    title: L('Shiva Abhishek', 'शिव अभिषेक', 'শিব অভিষেক'),
    blurb: L('Water, milk and honey on the lingam, with bel leaves', 'लिंग पर जल, दूध, शहद और बेलपत्र', 'লিঙ্গে জল, দুধ, মধু আর বেলপাতা'),
    deity: L('Shiva', 'शिव', 'শিব'),
    card: 0.5,
    target: { x: 0.5, y: 0.455 },
    rest: { x0: 0.33, x1: 0.62, y: 0.585 },
    lamp: { x: 0.24, y: 0.735 },
    incense: { x: 0.77, y: 0.73 },
    bell: { x: 0.5, y: 0.185 },
    offerings: [O.water, O.milk, O.curd, O.honey, O.ghee, O.sandal, O.bel, O.flowers, O.lamp, O.incense, O.bell, O.aarti],
    mantras: [
      { dev: 'ॐ नमः शिवाय', latin: 'Om Namah Shivaya' },
      { dev: 'ॐ त्र्यम्बकं यजामहे सुगन्धिं पुष्टिवर्धनम्।', latin: 'Om tryambakam yajamahe sugandhim pushtivardhanam' },
      { dev: 'उर्वारुकमिव बन्धनान् मृत्योर्मुक्षीय माऽमृतात्॥', latin: 'Urvarukamiva bandhanan mrityor mukshiya maamritat' },
      { dev: 'कर्पूरगौरं करुणावतारं संसारसारं भुजगेन्द्रहारम्।', latin: 'Karpura gauram karunavataram samsara saram bhujagendra haram' },
      { dev: 'सदा वसन्तं हृदयारविन्दे भवं भवानीसहितं नमामि॥', latin: 'Sada vasantam hridayaravinde bhavam bhavani sahitam namami' },
    ],
  },
  {
    id: 'havan',
    bg: 'bg-havan',
    title: L('Havan', 'हवन', 'হবন'),
    blurb: L('Offerings to the sacred fire, each with svaha', 'पवित्र अग्नि में आहुति, हर एक पर स्वाहा', 'পবিত্র অগ্নিতে আহুতি, প্রতিটিতে স্বাহা'),
    deity: L('Agni', 'अग्नि', 'অগ্নি'),
    card: 0.6,
    target: { x: 0.5, y: 0.66 },
    rest: { x0: 0.4, x1: 0.6, y: 0.7 },
    lamp: { x: 0.2, y: 0.8 },
    incense: { x: 0.8, y: 0.8 },
    bell: { x: 0.5, y: 0.22 },
    fire: { x: 0.5, y: 0.705, w: 0.3 },
    offerings: [AHUTI.samidha, AHUTI.ghee, AHUTI.guggal, AHUTI.paddy, AHUTI.akshat, AHUTI.coconut, O.bell, O.conch],
    mantras: [
      { dev: 'ॐ अग्नये स्वाहा। इदं अग्नये न मम॥', latin: 'Om agnaye svaha, idam agnaye na mama' },
      { dev: 'ॐ सोमाय स्वाहा। इदं सोमाय न मम॥', latin: 'Om somaya svaha, idam somaya na mama' },
      { dev: 'ॐ प्रजापतये स्वाहा। इदं प्रजापतये न मम॥', latin: 'Om prajapataye svaha, idam prajapataye na mama' },
      { dev: 'ॐ इन्द्राय स्वाहा। इदं इन्द्राय न मम॥', latin: 'Om indraya svaha, idam indraya na mama' },
      { dev: 'ॐ भूर्भुवः स्वः स्वाहा॥', latin: 'Om bhur bhuvah svah svaha' },
      { dev: 'ॐ पूर्णमदः पूर्णमिदं पूर्णात्पूर्णमुदच्यते॥', latin: 'Om purnamadah purnamidam purnat purnamudachyate' },
    ],
  },
  {
    id: 'ganesh',
    bg: 'bg-ghar-mandir',
    title: L('Ganesh Puja', 'गणेश पूजा', 'গণেশ পূজা'),
    blurb: L('Lamp, flowers and aarti for a good start', 'शुभ आरंभ के लिए दीप, फूल और आरती', 'শুভ শুরুর জন্য প্রদীপ, ফুল আর আরতি'),
    deity: L('Ganesha', 'गणेश', 'গণেশ'),
    card: 0.58,
    target: { x: 0.56, y: 0.53 },
    rest: { x0: 0.47, x1: 0.66, y: 0.64 },
    lamp: { x: 0.4, y: 0.705 },
    incense: { x: 0.75, y: 0.7 },
    bell: { x: 0.2, y: 0.24 },
    offerings: [O.lamp, O.incense, O.flowers, O.lotus, O.akshat, O.sandal, O.coconut, O.bell, O.conch, O.aarti],
    mantras: [
      { dev: 'ॐ गं गणपतये नमः', latin: 'Om Gam Ganapataye Namah' },
      { dev: 'वक्रतुण्ड महाकाय सूर्यकोटि समप्रभ।', latin: 'Vakratunda mahakaya suryakoti samaprabha' },
      { dev: 'निर्विघ्नं कुरु मे देव सर्वकार्येषु सर्वदा॥', latin: 'Nirvighnam kuru me deva sarva karyeshu sarvada' },
      { dev: 'ॐ एकदन्ताय विद्महे वक्रतुण्डाय धीमहि।', latin: 'Om ekadantaya vidmahe vakratundaya dhimahi' },
      { dev: 'तन्नो दन्ती प्रचोदयात्॥', latin: 'Tanno danti prachodayat' },
    ],
  },
  {
    id: 'tulsi',
    bg: 'bg-tulsi',
    title: L('Tulsi Puja', 'तुलसी पूजा', 'তুলসী পূজা'),
    blurb: L('Water, a lamp and flowers for the home', 'घर के लिए जल, दीप और फूल', 'ঘরের জন্য জল, প্রদীপ আর ফুল'),
    deity: L('Tulsi', 'तुलसी', 'তুলসী'),
    card: 0.4,
    target: { x: 0.5, y: 0.47 },
    rest: { x0: 0.4, x1: 0.6, y: 0.785 },
    lamp: { x: 0.37, y: 0.8 },
    incense: { x: 0.64, y: 0.8 },
    bell: { x: 0.2, y: 0.3 },
    offerings: [O.water, O.lamp, O.incense, O.flowers, O.akshat, O.sandal, O.bell, O.aarti],
    mantras: [
      { dev: 'ॐ श्री तुलस्यै नमः', latin: 'Om Shri Tulasyai Namah' },
      { dev: 'महाप्रसाद जननी सर्व सौभाग्यवर्धिनी।', latin: 'Mahaprasada janani sarva saubhagya vardhini' },
      { dev: 'आधि व्याधि हरा नित्यं तुलसी त्वं नमोऽस्तु ते॥', latin: 'Adhi vyadhi hara nityam tulasi tvam namostute' },
    ],
  },
];

export const sceneById = (id: string) => SCENES.find((s) => s.id === id);
