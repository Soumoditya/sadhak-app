// Satvik bhog recipes — pure vegetarian, strictly NO onion & NO garlic.
// Quantities serve 4 (or one bhog thali) unless noted.

export interface BhogRecipe {
  id: string;
  name: string;
  nameHi: string;
  occasion: string;          // when it's traditionally offered
  time: string;              // approx total time
  icon: string;
  color: string;
  ingredients: { item: string; qty: string }[];
  steps: string[];
  tips?: string;
  playQuery: string;         // for in-app video
}

export const BHOG_RECIPES: BhogRecipe[] = [
  {
    id: 'sooji-halwa',
    name: 'Sooji Halwa',
    nameHi: 'सूजी का हलवा',
    occasion: 'Ashtami, Satyanarayan katha, everyday bhog',
    time: '20 min',
    icon: 'bowl-mix',
    color: '#C2410C',
    ingredients: [
      { item: 'Sooji (semolina)', qty: '1 cup' },
      { item: 'Ghee', qty: '½ cup' },
      { item: 'Sugar', qty: '¾–1 cup' },
      { item: 'Water', qty: '2½ cups' },
      { item: 'Cardamom powder', qty: '½ tsp' },
      { item: 'Cashews & raisins', qty: '2 tbsp' },
    ],
    steps: [
      'Heat ghee in a heavy kadhai; fry cashews & raisins, set aside',
      'Roast sooji in the same ghee on low-medium, stirring constantly, until golden and fragrant (8–10 min)',
      'Boil water with sugar separately until dissolved',
      'Lower the flame and pour the syrup into the sooji in a thin stream, stirring briskly (it will splutter)',
      'Cook until the halwa leaves the sides; mix in cardamom and dry fruits',
      'Offer hot as bhog with a tulsi leaf (for Vishnu/Krishna)',
    ],
    tips: 'Slow, patient roasting of the sooji is the whole secret — never rush it.',
    playQuery: 'sooji halwa prasad recipe',
  },
  {
    id: 'panjiri',
    name: 'Dhaniya Panjiri',
    nameHi: 'धनिया पंजीरी',
    occasion: 'Janmashtami (Krishna bhog)',
    time: '15 min',
    icon: 'grain',
    color: '#8B5E3C',
    ingredients: [
      { item: 'Coriander (dhaniya) powder', qty: '1 cup' },
      { item: 'Ghee', qty: '4 tbsp' },
      { item: 'Powdered sugar (boora)', qty: '¾ cup' },
      { item: 'Makhana (foxnuts)', qty: '½ cup' },
      { item: 'Chopped almonds & cashews', qty: '¼ cup' },
      { item: 'Grated dry coconut', qty: '2 tbsp' },
    ],
    steps: [
      'Roast makhana in 1 tbsp ghee until crisp; crush lightly',
      'Roast the dhaniya powder in remaining ghee on low flame until fragrant (4–5 min)',
      'Add nuts and coconut; roast 2 more minutes',
      'Cool slightly, then mix in the powdered sugar and makhana',
      'Offer to Laddu Gopal at midnight on Janmashtami',
    ],
    playQuery: 'dhaniya panjiri janmashtami recipe',
  },
  {
    id: 'sabudana-khichdi',
    name: 'Sabudana Khichdi',
    nameHi: 'साबूदाना खिचड़ी',
    occasion: 'Vrat / fasting (Ekadashi, Navratri)',
    time: '20 min + soaking',
    icon: 'rice',
    color: '#2D6A4F',
    ingredients: [
      { item: 'Sabudana (sago)', qty: '1 cup, soaked 4–5 hrs' },
      { item: 'Boiled potato', qty: '1, cubed' },
      { item: 'Roasted peanuts (coarse)', qty: '½ cup' },
      { item: 'Ghee', qty: '2 tbsp' },
      { item: 'Cumin seeds', qty: '1 tsp' },
      { item: 'Green chilli, curry leaves', qty: 'to taste' },
      { item: 'Sendha namak (rock salt)', qty: 'to taste' },
      { item: 'Lemon juice', qty: '1 tsp' },
    ],
    steps: [
      'Soak sabudana until pearls press easily; drain fully',
      'Mix the pearls with crushed peanuts and sendha namak',
      'Heat ghee; splutter cumin, chilli and curry leaves',
      'Add potato cubes, sauté; add the sabudana mix',
      'Toss on medium until pearls turn translucent (don\'t overcook — they turn gluey)',
      'Finish with lemon juice; serve hot',
    ],
    tips: 'Rinse the soaked sabudana and drain on a cloth — dry pearls stay separate.',
    playQuery: 'sabudana khichdi vrat recipe',
  },
  {
    id: 'kheer',
    name: 'Chawal ki Kheer',
    nameHi: 'चावल की खीर',
    occasion: 'Purnima, Lakshmi puja, festivals',
    time: '45 min',
    icon: 'cup',
    color: '#B8860B',
    ingredients: [
      { item: 'Full-cream milk', qty: '1 litre' },
      { item: 'Rice (small grain)', qty: '¼ cup, soaked 30 min' },
      { item: 'Sugar', qty: '½ cup' },
      { item: 'Cardamom powder', qty: '½ tsp' },
      { item: 'Saffron strands', qty: 'a pinch (optional)' },
      { item: 'Sliced almonds & pistachios', qty: '2 tbsp' },
    ],
    steps: [
      'Boil milk in a heavy pan; add drained rice',
      'Simmer on low, stirring every few minutes so it never sticks',
      'Cook ~35 min until rice is soft and milk has thickened',
      'Add sugar, cardamom, saffron; simmer 5 more minutes',
      'Garnish with nuts; offer warm or chilled',
    ],
    tips: 'Kheer offered on Sharad Purnima is traditionally kept under moonlight.',
    playQuery: 'rice kheer prasad recipe',
  },
  {
    id: 'besan-laddu',
    name: 'Besan Laddu',
    nameHi: 'बेसन के लड्डू',
    occasion: 'Ganesh Chaturthi, everyday bhog',
    time: '30 min',
    icon: 'circle-slice-8',
    color: '#F59E0B',
    ingredients: [
      { item: 'Besan (thick/laddu grade)', qty: '2 cups' },
      { item: 'Ghee', qty: '¾ cup' },
      { item: 'Boora / powdered sugar', qty: '1 cup' },
      { item: 'Cardamom powder', qty: '1 tsp' },
      { item: 'Chopped cashews', qty: '2 tbsp' },
    ],
    steps: [
      'Roast besan in ghee on LOW flame, stirring continuously, 15–20 min until deep golden and nutty',
      'It will loosen and release aroma — that\'s the sign',
      'Cool until just warm; mix in boora, cardamom and cashews',
      'Bind into laddus with greased palms',
      'Offer to Ganesha — his favourite after modak',
    ],
    tips: 'Under-roasted besan tastes raw; the low-and-slow roast is everything.',
    playQuery: 'besan ladoo prasad recipe',
  },
  {
    id: 'makhana-kheer',
    name: 'Makhana Kheer',
    nameHi: 'मखाना खीर',
    occasion: 'Vrat / fasting days',
    time: '30 min',
    icon: 'circle-multiple',
    color: '#7C3AED',
    ingredients: [
      { item: 'Makhana (foxnuts)', qty: '2 cups' },
      { item: 'Full-cream milk', qty: '1 litre' },
      { item: 'Ghee', qty: '1 tbsp' },
      { item: 'Sugar or mishri', qty: '⅓ cup' },
      { item: 'Cardamom, saffron, nuts', qty: 'as liked' },
    ],
    steps: [
      'Roast makhana in ghee until crisp; crush half, keep half whole',
      'Boil milk; add makhana and simmer 15 min',
      'Add sugar/mishri, cardamom, saffron',
      'Simmer until creamy; garnish with nuts',
    ],
    playQuery: 'makhana kheer vrat recipe',
  },
  {
    id: 'aloo-tamatar',
    name: 'Vrat Aloo-Tamatar',
    nameHi: 'व्रत वाले आलू-टमाटर',
    occasion: 'Navratri / vrat meal (with kuttu puri)',
    time: '25 min',
    icon: 'pot-steam',
    color: '#C62828',
    ingredients: [
      { item: 'Boiled potatoes', qty: '4, roughly broken' },
      { item: 'Tomatoes', qty: '3, puréed' },
      { item: 'Ghee', qty: '2 tbsp' },
      { item: 'Cumin seeds', qty: '1 tsp' },
      { item: 'Ginger & green chilli paste', qty: '1 tsp' },
      { item: 'Sendha namak', qty: 'to taste' },
      { item: 'Coriander leaves', qty: 'handful' },
    ],
    steps: [
      'Heat ghee; splutter cumin, add ginger-chilli paste',
      'Add tomato purée; cook until ghee separates',
      'Add broken potatoes, sendha namak and 1½ cups water',
      'Simmer 10 min until the gravy thickens slightly',
      'Finish with coriander; serve with kuttu or singhara puri',
    ],
    playQuery: 'vrat wale aloo tamatar sabzi recipe',
  },
  {
    id: 'kuttu-puri',
    name: 'Kuttu ki Puri',
    nameHi: 'कुट्टू की पूरी',
    occasion: 'Navratri / vrat',
    time: '30 min',
    icon: 'circle',
    color: '#8B5E3C',
    ingredients: [
      { item: 'Kuttu (buckwheat) flour', qty: '2 cups' },
      { item: 'Boiled potato (mashed)', qty: '2 medium' },
      { item: 'Sendha namak', qty: '1 tsp' },
      { item: 'Ghee/oil for frying', qty: 'as needed' },
    ],
    steps: [
      'Knead kuttu flour with mashed potato and sendha namak (little/no water)',
      'Rest 10 minutes; make small balls',
      'Roll gently between greased sheets (kuttu dough is delicate)',
      'Deep fry in medium-hot ghee until puffed and golden',
      'Serve hot with vrat aloo-tamatar and dahi',
    ],
    playQuery: 'kuttu puri navratri recipe',
  },
  {
    id: 'panchamrit',
    name: 'Panchamrit',
    nameHi: 'पंचामृत',
    occasion: 'Every abhishek & puja — the five nectars',
    time: '5 min',
    icon: 'cup-water',
    color: '#1565C0',
    ingredients: [
      { item: 'Raw milk', qty: '½ cup' },
      { item: 'Curd (dahi)', qty: '2 tbsp' },
      { item: 'Honey', qty: '1 tbsp' },
      { item: 'Ghee', qty: '1 tsp' },
      { item: 'Sugar / mishri', qty: '1 tbsp' },
      { item: 'Tulsi leaves', qty: '2–3 (added for Vishnu/Krishna, never for Shiva\'s bhog use)' },
    ],
    steps: [
      'Whisk curd smooth in a clean (ideally silver/brass) bowl',
      'Add milk, honey, ghee and sugar; stir gently',
      'Use first for abhishek, then distribute as charnamrit prasad',
    ],
    tips: 'Each ingredient is symbolic: milk (purity), curd (prosperity), honey (sweet speech), ghee (strength), sugar (bliss).',
    playQuery: 'panchamrit recipe for puja',
  },
  {
    id: 'moong-dal-halwa',
    name: 'Moong Dal Halwa',
    nameHi: 'मूंग दाल हलवा',
    occasion: 'Festive bhog, winter offerings',
    time: '50 min',
    icon: 'bowl',
    color: '#F59E0B',
    ingredients: [
      { item: 'Yellow moong dal', qty: '1 cup, soaked 3 hrs' },
      { item: 'Ghee', qty: '¾ cup' },
      { item: 'Milk', qty: '1 cup' },
      { item: 'Water', qty: '1 cup' },
      { item: 'Sugar', qty: '¾ cup' },
      { item: 'Cardamom, saffron, nuts', qty: 'as liked' },
    ],
    steps: [
      'Grind soaked dal coarsely with minimal water',
      'Roast the paste in ghee on low, scraping constantly, until golden and grainy (25–30 min — patience!)',
      'Boil milk + water + sugar; add to the dal in a stream, stirring',
      'Cook until absorbed and glossy; add cardamom, saffron, nuts',
    ],
    tips: 'The stick-and-scrape phase in the middle is normal — keep going, it transforms.',
    playQuery: 'moong dal halwa recipe',
  },
  {
    id: 'coconut-barfi',
    name: 'Nariyal Barfi',
    nameHi: 'नारियल बर्फी',
    occasion: 'Ganesh Chaturthi, Diwali bhog',
    time: '25 min',
    icon: 'square',
    color: '#607D8B',
    ingredients: [
      { item: 'Fresh grated coconut', qty: '2 cups' },
      { item: 'Sugar', qty: '1 cup' },
      { item: 'Milk', qty: '½ cup' },
      { item: 'Ghee', qty: '1 tbsp' },
      { item: 'Cardamom powder', qty: '½ tsp' },
    ],
    steps: [
      'Cook coconut, sugar and milk in a greased pan, stirring',
      'Cook until the mixture thickens and leaves the sides (12–15 min)',
      'Mix in ghee and cardamom',
      'Spread on a greased plate; cool and cut into squares',
    ],
    playQuery: 'nariyal barfi prasad recipe',
  },
  {
    id: 'khichdi-bhog',
    name: 'Bhog wali Khichdi',
    nameHi: 'भोग वाली खिचड़ी',
    occasion: 'Makar Sankranti, Shani daan, annadaan',
    time: '30 min',
    icon: 'pot',
    color: '#2D6A4F',
    ingredients: [
      { item: 'Rice', qty: '1 cup' },
      { item: 'Moong dal (yellow)', qty: '½ cup' },
      { item: 'Ghee', qty: '3 tbsp' },
      { item: 'Cumin, hing (asafoetida)', qty: '1 tsp + a pinch' },
      { item: 'Ginger (grated)', qty: '1 tsp' },
      { item: 'Turmeric', qty: '½ tsp' },
      { item: 'Seasonal vegetables (optional)', qty: '1 cup' },
      { item: 'Salt', qty: 'to taste' },
    ],
    steps: [
      'Wash rice & dal; heat ghee, splutter cumin & hing',
      'Add ginger, turmeric, vegetables; sauté briefly',
      'Add rice-dal and 5 cups water; salt',
      'Pressure cook 3–4 whistles to a soft, flowing consistency',
      'Top generously with ghee before offering',
    ],
    tips: 'Hing + ginger give the satvik depth that onion-garlic cooking chases.',
    playQuery: 'satvik khichdi bhog recipe',
  },
];

// ─── Allergens ─────────────────────────────────────────────────────────────
// Worked out from the ingredient names so every recipe is covered.
export type Allergen = 'dairy' | 'nuts' | 'peanuts' | 'gluten' | 'sesame' | 'coconut';
export const ALLERGENS: { key: Allergen; label: string; icon: string }[] = [
  { key: 'dairy', label: 'Dairy', icon: 'cup-water' },
  { key: 'nuts', label: 'Tree nuts', icon: 'peanut-off-outline' },
  { key: 'peanuts', label: 'Peanuts', icon: 'peanut-outline' },
  { key: 'gluten', label: 'Gluten', icon: 'barley' },
  { key: 'sesame', label: 'Sesame', icon: 'grain' },
  { key: 'coconut', label: 'Coconut', icon: 'palm-tree' },
];
const ALLERGEN_RX: Record<Allergen, RegExp> = {
  dairy: /\b(ghee|milk|khoya|mawa|paneer|curd|dahi|yog(h)?urt|butter|cream|malai|chhena|rabri|condensed)\b/i,
  nuts: /\b(cashews?|kaju|almonds?|badam|pistachios?|pista|walnuts?|chironji|nuts)\b/i,
  peanuts: /\b(peanuts?|groundnuts?|moongphali)\b/i,
  gluten: /\b(wheat|atta|sooji|semolina|maida|rava|dalia|barley|vermicelli|seviyan|hing|asafoetida)\b/i,
  sesame: /\b(sesame|til)\b/i,
  coconut: /\b(coconut|nariyal|copra)\b/i,
};
const cache = new Map<string, Allergen[]>();
/** Allergens in a recipe. Makhana (fox nut) is a seed, not a tree nut. */
export function allergensOf(r: BhogRecipe): Allergen[] {
  const hit = cache.get(r.id);
  if (hit) return hit;
  const text = r.ingredients.map((i) => i.item.replace(/makhana \(foxnuts\)|foxnuts?/gi, '')).join(' · ');
  const out = (Object.keys(ALLERGEN_RX) as Allergen[]).filter((k) => ALLERGEN_RX[k].test(text));
  cache.set(r.id, out);
  return out;
}
