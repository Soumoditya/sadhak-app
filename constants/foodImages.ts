// Satvik Bhog food imagery — Wikimedia Commons photographs.
//
// These are real photos of the actual dishes. Licensed CC BY-SA 4.0 / CC BY
// (attribution required) — the app displays them from Wikimedia's own servers
// and surfaces credits in the About screen; it does not redistribute the files.
//
// Keyed by the recipe `id` in constants/recipes.ts. Recipes without a good
// free photo simply fall back to their MaterialCommunityIcons glyph.

const FILE_BASE = 'https://commons.wikimedia.org/wiki/Special:FilePath/';
const WIDTH = 600;
const wm = (filename: string): string =>
  `${FILE_BASE}${encodeURIComponent(filename)}?width=${WIDTH}`;

export interface FoodImage {
  url: string;
  blurhash: string;
  credit: string;
}

// Warm food-photo placeholder blurhashes (approximate; disk-cached after first view).
const CREAM = 'LEHV6nWB2yk8pyo0adR*.7kCMdnj';
const GOLDEN = 'L6PZfSjE.AyE_3t7t7R**0o#DgR4';

export const FOOD_IMAGES: Record<string, FoodImage> = {
  'sooji-halwa': { url: wm('Sooji-halwa.jpg'), blurhash: GOLDEN, credit: 'Wikimedia Commons, CC BY-SA 4.0' },
  'sabudana-khichdi': { url: wm('Home made Sabudana Khichdi Fasting Delicacies.jpg'), blurhash: CREAM, credit: 'Wikimedia Commons, CC BY-SA 4.0' },
  'kheer': { url: wm('Rice Kheer or Rice Pudding.JPG'), blurhash: CREAM, credit: 'Wikimedia Commons, CC BY-SA 4.0' },
  'besan-laddu': { url: wm('Besan Laddu cropped.jpg'), blurhash: GOLDEN, credit: 'Wikimedia Commons, CC BY-SA 4.0' },
  'makhana-kheer': { url: wm('Foxnut Makhana - Nawada District - Bihar - 1.jpg'), blurhash: CREAM, credit: 'Wikimedia Commons, CC BY-SA 4.0' },
  'kuttu-puri': { url: wm('Aaloo ki sabji & Kuttu ki puri - Gujarat - SHAILI 016.jpg'), blurhash: GOLDEN, credit: 'Wikimedia Commons, CC BY-SA 4.0' },
  'panchamrit': { url: wm('Panchamrita.jpg'), blurhash: CREAM, credit: 'Wikimedia Commons, CC BY-SA 4.0' },
  'moong-dal-halwa': { url: wm('Moong Dal Ka Halwa (Sheera).jpg'), blurhash: GOLDEN, credit: 'Wikimedia Commons, CC BY-SA 4.0' },
  'coconut-barfi': { url: wm('Barfi Coconut Sweets of India.jpg'), blurhash: CREAM, credit: 'Wikimedia Commons, CC BY 2.0' },
  'khichdi-bhog': { url: wm('Spicy Khichdi.JPG'), blurhash: GOLDEN, credit: 'Wikimedia Commons, CC BY-SA 4.0' },
};

export function getFoodImage(recipeId: string): FoodImage | null {
  return FOOD_IMAGES[recipeId] ?? null;
}
