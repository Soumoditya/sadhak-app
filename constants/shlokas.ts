// Shloka of the day: one per day of the year, in a fixed cycle. Each has a
// pre-rendered share card (assets/shlokas/N.jpg, made by
// scripts/render-shloka-cards.js) so sharing is instant and the Devanagari is
// typeset perfectly.

export type Shloka = { text: string; en: string; hi: string; bn: string; source: string };

export const SHLOKAS: Shloka[] = [
  { text: 'योगः कर्मसु कौशलम्।', en: 'Yoga is skill in action.', hi: 'कर्म में कुशलता ही योग है।', bn: 'কর্মে দক্ষতাই যোগ।', source: 'Bhagavad Gita 2.50' },
  { text: 'कर्मण्येवाधिकारस्ते मा फलेषु कदाचन।', en: 'Your right is to action alone, never to its fruits.', hi: 'तुम्हारा अधिकार केवल कर्म पर है, फल पर कभी नहीं।', bn: 'তোমার অধিকার শুধু কর্মে, ফলে কখনও নয়।', source: 'Bhagavad Gita 2.47' },
  { text: 'सत्यमेव जयते।', en: 'Truth alone triumphs.', hi: 'सत्य की ही जीत होती है।', bn: 'সত্যেরই জয় হয়।', source: 'Mundaka Upanishad 3.1.6' },
  { text: 'तमसो मा ज्योतिर्गमय।', en: 'Lead me from darkness to light.', hi: 'मुझे अंधकार से प्रकाश की ओर ले चलो।', bn: 'আমাকে অন্ধকার থেকে আলোর পথে নিয়ে চলো।', source: 'Brihadaranyaka Upanishad 1.3.28' },
  { text: 'वसुधैव कुटुम्बकम्।', en: 'The whole world is one family.', hi: 'सारी पृथ्वी एक परिवार है।', bn: 'সমগ্র পৃথিবী এক পরিবার।', source: 'Maha Upanishad 6.71' },
  { text: 'उद्धरेदात्मनात्मानं नात्मानमवसादयेत्।', en: 'Lift yourself by your own self; never let yourself sink.', hi: 'स्वयं ही अपना उद्धार करो, अपने को गिरने मत दो।', bn: 'নিজেই নিজেকে তুলে ধরো, নিজেকে ডুবতে দিও না।', source: 'Bhagavad Gita 6.5' },
  { text: 'अहिंसा परमो धर्मः।', en: 'Non-violence is the highest dharma.', hi: 'अहिंसा ही परम धर्म है।', bn: 'অহিংসাই পরম ধর্ম।', source: 'Mahabharata' },
  { text: 'श्रद्धावान् लभते ज्ञानम्।', en: 'The one with faith attains knowledge.', hi: 'श्रद्धावान को ही ज्ञान प्राप्त होता है।', bn: 'শ্রদ্ধাবানই জ্ঞান লাভ করেন।', source: 'Bhagavad Gita 4.39' },
  { text: 'धर्मो रक्षति रक्षितः।', en: 'Dharma protects those who protect it.', hi: 'जो धर्म की रक्षा करता है, धर्म उसकी रक्षा करता है।', bn: 'যে ধর্মকে রক্ষা করে, ধর্ম তাকে রক্ষা করে।', source: 'Manusmriti 8.15' },
  { text: 'सर्वे भवन्तु सुखिनः सर्वे सन्तु निरामयाः।', en: 'May all be happy; may all be free from illness.', hi: 'सब सुखी हों, सब निरोगी हों।', bn: 'সবাই সুখী হোক, সবাই রোগমুক্ত হোক।', source: 'Shanti Mantra' },
  { text: 'विद्या ददाति विनयम्।', en: 'Knowledge gives humility.', hi: 'विद्या विनम्रता देती है।', bn: 'বিদ্যা বিনয় দান করে।', source: 'Hitopadesha' },
  { text: 'मातृदेवो भव। पितृदेवो भव।', en: 'Honour your mother and father as divine.', hi: 'माता को देवता मानो, पिता को देवता मानो।', bn: 'মাতাকে দেবতা জানো, পিতাকে দেবতা জানো।', source: 'Taittiriya Upanishad 1.11.2' },
  { text: 'ॐ सह नाववतु। सह नौ भुनक्तु।', en: 'May we be protected together; may we be nourished together.', hi: 'हम दोनों की साथ रक्षा हो, साथ पोषण हो।', bn: 'আমরা একসাথে রক্ষিত হই, একসাথে পুষ্ট হই।', source: 'Taittiriya Upanishad 2.2' },
  { text: 'यत्र योगेश्वरः कृष्णो यत्र पार्थो धनुर्धरः।', en: 'Where there is Krishna, lord of yoga, and Arjuna the archer, there is victory.', hi: 'जहाँ योगेश्वर कृष्ण और धनुर्धर अर्जुन हैं, वहीं विजय है।', bn: 'যেখানে যোগেশ্বর কৃষ্ণ ও ধনুর্ধর অর্জুন, সেখানেই জয়।', source: 'Bhagavad Gita 18.78' },
];

// require() needs literal paths, so the cards are listed by hand.
export const SHLOKA_CARDS = [
  require('../assets/shlokas/0.jpg'), require('../assets/shlokas/1.jpg'), require('../assets/shlokas/2.jpg'),
  require('../assets/shlokas/3.jpg'), require('../assets/shlokas/4.jpg'), require('../assets/shlokas/5.jpg'),
  require('../assets/shlokas/6.jpg'), require('../assets/shlokas/7.jpg'), require('../assets/shlokas/8.jpg'),
  require('../assets/shlokas/9.jpg'), require('../assets/shlokas/10.jpg'), require('../assets/shlokas/11.jpg'),
  require('../assets/shlokas/12.jpg'), require('../assets/shlokas/13.jpg'),
];

export function shlokaIndexFor(d: Date): number {
  const start = new Date(d.getFullYear(), 0, 0);
  const day = Math.floor((d.getTime() - start.getTime()) / 86400000);
  return day % SHLOKAS.length;
}
