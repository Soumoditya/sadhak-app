// Deity imagery registry — Wikimedia Commons public-domain paintings.
//
// All paintings are by Raja Ravi Varma (d. 1906, public domain worldwide) or
// oleographs from his press. Canonical, culturally respected iconography —
// the images you'd see in a family shrine, not stock art.
//
// URLs use Wikimedia's Special:FilePath redirect, which resolves by filename
// regardless of the MD5-hashed thumb path (thumb/x/xx/...). This is the
// documented stable URL scheme for external reuse. `?width=800` requests a
// pre-scaled ~800px JPEG derivative instead of the multi-MB original.

const FILE_BASE = 'https://commons.wikimedia.org/wiki/Special:FilePath/';
const WIDTH = 800;

const wm = (filename: string): string =>
  `${FILE_BASE}${encodeURIComponent(filename)}?width=${WIDTH}`;

export interface DeityImage {
  /** Wikimedia Commons stable URL (public domain). */
  url: string;
  /** Blurhash placeholder — warm oil-painting palette (approximate). */
  blurhash: string;
  /** Attribution — surface once, quietly, in the About screen. */
  credit: string;
}

// Warm oil-painting placeholders. These are close enough to Ravi Varma's
// palette that the ~200ms flash before the real image loads reads as
// intentional. Disk-cached, so first-view only.
const WARM_GOLD = 'L6PZfSjE.AyE_3t7t7R**0o#DgR4';
const DEEP_ROSE = 'L5H2EC=PM+yV0g-mq.wG9c010J}I';
const NIGHT_BLUE = 'L6Pj0^i_.AyE_3t7t7R**0o#DgRj';

export const DEITY_IMAGES: Record<string, DeityImage> = {
  'Lord Vishnu': {
    url: wm('Raja Ravi Varma, Seshanarayana (Oleographic print).jpg'),
    blurhash: NIGHT_BLUE,
    credit: 'Raja Ravi Varma Press, "Seshanarayana" (public domain)',
  },
  'Lord Shiva': {
    url: wm('An Oleograph of Shiva, Parvati and Nandi by Raja Ravi Varma.jpg'),
    blurhash: WARM_GOLD,
    credit: 'Raja Ravi Varma, "Shiva, Parvati and Nandi" (public domain)',
  },
  'Lord Ganesha': {
    url: wm('Rebirth of Ganesha.jpg'),
    blurhash: WARM_GOLD,
    credit: 'Raja Ravi Varma Press, "Rebirth of Ganesha" (public domain)',
  },
  'Lord Hanuman': {
    url: wm("Hanuman fetches the herb-bearing mountain, in a print from the Ravi Varma Press, 1910's.jpg"),
    blurhash: WARM_GOLD,
    credit: 'Ravi Varma Press, c. 1910s (public domain)',
  },
  'Goddess Lakshmi': {
    url: wm('Raja Ravi Varma, Goddess Lakshmi, 1896.jpg'),
    blurhash: WARM_GOLD,
    credit: 'Raja Ravi Varma, "Goddess Lakshmi", 1896 (public domain)',
  },
  'Goddess Durga': {
    url: wm('Goddess Durga by Raja Ravi Varma.jpg'),
    blurhash: DEEP_ROSE,
    credit: 'Raja Ravi Varma, "Goddess Durga" (public domain)',
  },
  'Lord Krishna': {
    url: wm('Yashoda with Krishna, Raja Ravi Varma.jpg'),
    blurhash: WARM_GOLD,
    credit: 'Raja Ravi Varma, "Yashoda with Krishna" (public domain)',
  },
  'Goddess Saraswati': {
    url: wm('Raja Ravi Varma, Goddess Saraswati.jpg'),
    blurhash: WARM_GOLD,
    credit: 'Raja Ravi Varma, "Goddess Saraswati" (public domain)',
  },
  'Savitr (Surya)': {
    url: wm('Surya Narayana.jpg'),
    blurhash: WARM_GOLD,
    credit: 'Ravi Varma Press, "Surya Narayana" (public domain)',
  },
  'Shani Dev': {
    url: wm('Shani.jpg'),
    blurhash: NIGHT_BLUE,
    credit: 'Engraving after P. Sonnerat, 1782 (public domain)',
  },
};

/**
 * Get the image for a deity by its EXACT registry key, or null.
 * Used by screens whose data already uses the canonical names (aarti).
 */
export function getDeityImage(deity: string): DeityImage | null {
  return DEITY_IMAGES[deity] ?? null;
}

// Keyword → registry-key map, so screens that use looser names
// ("Maa Durga", "Surya Dev", "Lord Vishnu / Satyanarayan") still resolve.
const KEYWORD_TO_KEY: Array<[RegExp, string]> = [
  [/ganesh/i, 'Lord Ganesha'],
  [/shiv|mahadev|shankar/i, 'Lord Shiva'],
  [/lakshmi|laxmi/i, 'Goddess Lakshmi'],
  [/hanuman|bajrang/i, 'Lord Hanuman'],
  [/durga|devi|ambe|amba/i, 'Goddess Durga'],
  [/krishna|kunj|govind|madhav/i, 'Lord Krishna'],
  [/saraswati|sarasvati/i, 'Goddess Saraswati'],
  [/surya|savitr|sun/i, 'Savitr (Surya)'],
  [/shani|saturn/i, 'Shani Dev'],
  [/vishnu|satyanarayan|jagdish|hari|narayan/i, 'Lord Vishnu'],
];

/**
 * Resolve a deity image from a loose deity string by keyword.
 * Falls back to exact-key lookup first, then keyword patterns, else null.
 */
export function resolveDeityImage(deity: string): DeityImage | null {
  if (!deity) return null;
  if (DEITY_IMAGES[deity]) return DEITY_IMAGES[deity];
  for (const [re, key] of KEYWORD_TO_KEY) {
    if (re.test(deity)) return DEITY_IMAGES[key];
  }
  return null;
}
