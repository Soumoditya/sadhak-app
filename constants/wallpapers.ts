// Spiritual wallpapers — gods, temples, and sacred nature.
//
// All from Wikimedia Commons: deity paintings are public-domain Raja Ravi Varma;
// temple/nature photos are CC BY-SA (attribution shown in the wallpaper screen).
// Delivered at 1080px via Special:FilePath — good enough for a phone wallpaper,
// small enough to download quickly.

const FILE_BASE = 'https://commons.wikimedia.org/wiki/Special:FilePath/';
const wm = (filename: string, width = 1080): string =>
  `${FILE_BASE}${encodeURIComponent(filename)}?width=${width}`;

import { CUSTOM_WALLPAPERS } from './customImages.generated';

export interface Wallpaper {
  id: string;
  title: string;
  category: 'deity' | 'temple' | 'nature' | 'mine';
  /** Full-size download URL (1080px). */
  url: string;
  /** Smaller URL for the grid thumbnail. */
  thumb: string;
  blurhash: string;
  credit: string;
  /** Owner's own bundled image (require id) if dropped in assets/custom/wallpapers/. */
  local?: number;
}

const WARM = 'L6PZfSjE.AyE_3t7t7R**0o#DgR4';
const BLUE = 'L6Pj0^i_.AyE_3t7t7R**0o#DgRj';
const GREEN = 'L5H2EC=PM+yV0g-mq.wG9c010J}I';

export const WALLPAPERS: Wallpaper[] = [
  // ─── Deities (public domain) ───
  {
    id: 'krishna', title: 'Krishna', category: 'deity',
    url: wm('Yashoda with Krishna, Raja Ravi Varma.jpg'),
    thumb: wm('Yashoda with Krishna, Raja Ravi Varma.jpg', 400),
    blurhash: WARM, credit: 'Raja Ravi Varma (public domain)',
  },
  {
    id: 'lakshmi', title: 'Lakshmi', category: 'deity',
    url: wm('Raja Ravi Varma, Goddess Lakshmi, 1896.jpg'),
    thumb: wm('Raja Ravi Varma, Goddess Lakshmi, 1896.jpg', 400),
    blurhash: WARM, credit: 'Raja Ravi Varma, 1896 (public domain)',
  },
  {
    id: 'saraswati', title: 'Saraswati', category: 'deity',
    url: wm('Raja Ravi Varma, Goddess Saraswati.jpg'),
    thumb: wm('Raja Ravi Varma, Goddess Saraswati.jpg', 400),
    blurhash: WARM, credit: 'Raja Ravi Varma (public domain)',
  },
  {
    id: 'durga', title: 'Durga', category: 'deity',
    url: wm('Goddess Durga by Raja Ravi Varma.jpg'),
    thumb: wm('Goddess Durga by Raja Ravi Varma.jpg', 400),
    blurhash: GREEN, credit: 'Raja Ravi Varma (public domain)',
  },
  // ─── Temples ───
  {
    id: 'kedarnath', title: 'Kedarnath', category: 'temple',
    url: wm('Kedarnath Temple.jpg'),
    thumb: wm('Kedarnath Temple.jpg', 400),
    blurhash: BLUE, credit: 'Wikimedia Commons, CC BY-SA',
  },
  {
    id: 'kedarnath-rain', title: 'Kedarnath in the Rains', category: 'temple',
    url: wm('Kedarnath Temple in Rainy season.jpg'),
    thumb: wm('Kedarnath Temple in Rainy season.jpg', 400),
    blurhash: BLUE, credit: 'Wikimedia Commons, CC BY-SA',
  },
  {
    id: 'meenakshi', title: 'Meenakshi Temple', category: 'temple',
    url: wm('MEENAKSHI TEMPLE- WEST TOWER.jpg'),
    thumb: wm('MEENAKSHI TEMPLE- WEST TOWER.jpg', 400),
    blurhash: WARM, credit: 'Wikimedia Commons, CC BY-SA',
  },
  {
    id: 'tirumala', title: 'Tirumala', category: 'temple',
    url: wm('Tirumala 090615.jpg'),
    thumb: wm('Tirumala 090615.jpg', 400),
    blurhash: GREEN, credit: 'Wikimedia Commons, CC BY-SA',
  },
  // ─── Sacred nature ───
  {
    id: 'himalaya', title: 'Himalayan Sunrise', category: 'nature',
    url: wm('Himalaya sunrise.jpg'),
    thumb: wm('Himalaya sunrise.jpg', 400),
    blurhash: BLUE, credit: 'Wikimedia Commons, CC BY-SA',
  },
  {
    id: 'ganga-aarti', title: 'Ganga Aarti, Varanasi', category: 'nature',
    url: wm('Evening ganga aarti at varanasi ghat UP.jpg'),
    thumb: wm('Evening ganga aarti at varanasi ghat UP.jpg', 400),
    blurhash: WARM, credit: 'Wikimedia Commons, CC BY-SA',
  },
];

export const WALLPAPER_CATEGORIES: Array<{ key: 'all' | Wallpaper['category']; label: string; icon: string }> = [
  { key: 'all', label: 'All', icon: 'view-grid-outline' },
  { key: 'mine', label: 'Mine', icon: 'heart-outline' },
  { key: 'deity', label: 'Deities', icon: 'account-star-outline' },
  { key: 'temple', label: 'Temples', icon: 'temple-hindu' },
  { key: 'nature', label: 'Nature', icon: 'image-filter-hdr' },
];

// Build the full wallpaper list: the owner's own images first (any file dropped
// into assets/custom/wallpapers/), then the curated ones. A custom file whose
// name matches a built-in id (e.g. "krishna.jpg") replaces that built-in image.
function titleCase(key: string): string {
  return key.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function getWallpapers(): Wallpaper[] {
  const customKeys = Object.keys(CUSTOM_WALLPAPERS);
  // Override built-ins that share an id with a dropped file.
  const merged = WALLPAPERS.map((w) =>
    CUSTOM_WALLPAPERS[w.id] ? { ...w, local: CUSTOM_WALLPAPERS[w.id], category: 'mine' as const } : w,
  );
  // Brand-new wallpapers for custom files that don't match a built-in id.
  const builtinIds = new Set(WALLPAPERS.map((w) => w.id));
  const fresh: Wallpaper[] = customKeys
    .filter((k) => !builtinIds.has(k))
    .map((k) => ({
      id: k, title: titleCase(k), category: 'mine' as const,
      url: '', thumb: '', blurhash: WARM, credit: 'Your image',
      local: CUSTOM_WALLPAPERS[k],
    }));
  return [...fresh, ...merged];
}
