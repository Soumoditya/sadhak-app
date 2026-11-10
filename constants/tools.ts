import type { IconName } from '../components/ui/Icon';
import type { ToneName } from './theme';

// Every tool in the app, in one place. Home shows them as a grid, the Tools
// tab groups them with descriptions, and search matches on both.
export type ToolGroup = 'daily' | 'places' | 'learn' | 'personal';

export type Tool = {
  key: string;
  label: string; // translation key (short, for tiles)
  desc: string;  // translation key (one line, for the Tools tab)
  icon: IconName | 'diya';
  tone: ToneName;
  route: string;
  group: ToolGroup;
};

export const TOOLS: Tool[] = [
  { key: 'panchang', label: 'f.panchang', desc: 'd.panchang', icon: 'sun-horizon', tone: 'saffron', route: '/panchang', group: 'daily' },
  { key: 'calendar', label: 'f.calendar', desc: 'd.calendar', icon: 'calendar-dots', tone: 'kumkum', route: '/(tabs)/calendar', group: 'daily' },
  { key: 'japa', label: 'f.japa', desc: 'd.japa', icon: 'hands-praying', tone: 'haldi', route: '/japa', group: 'daily' },
  { key: 'aarti', label: 'f.aarti', desc: 'd.aarti', icon: 'diya', tone: 'saffron', route: '/aarti', group: 'daily' },
  { key: 'vpuja', label: 'f.vpuja', desc: 'd.vpuja', icon: 'flower-lotus', tone: 'kumkum', route: '/virtual-puja', group: 'daily' },
  { key: 'puja', label: 'f.puja', desc: 'd.puja', icon: 'scroll', tone: 'haldi', route: '/puja-guide', group: 'daily' },
  { key: 'bhog', label: 'f.bhog', desc: 'd.bhog', icon: 'cooking-pot', tone: 'tulsi', route: '/bhog', group: 'daily' },
  { key: 'temples', label: 'f.temples', desc: 'd.temples', icon: 'temple-hindu', tone: 'tulsi', route: '/temples', group: 'places' },
  { key: 'vastu', label: 'f.vastu', desc: 'd.vastu', icon: 'compass', tone: 'neel', route: '/compass', group: 'places' },
  { key: 'jyotish', label: 'f.jyotish', desc: 'd.jyotish', icon: 'star-four', tone: 'haldi', route: '/jyotish', group: 'learn' },
  { key: 'ai', label: 'f.ai', desc: 'd.ai', icon: 'sparkle', tone: 'plum', route: '/ask', group: 'learn' },
  { key: 'wiki', label: 'f.wiki', desc: 'd.wiki', icon: 'book-open-text', tone: 'neel', route: '/wiki', group: 'learn' },
  { key: 'library', label: 'f.library', desc: 'd.library', icon: 'books', tone: 'plum', route: '/(tabs)/library', group: 'learn' },
  { key: 'ayurveda', label: 'f.ayurveda', desc: 'd.ayurveda', icon: 'leaf', tone: 'tulsi', route: '/ayurveda', group: 'learn' },
  { key: 'notes', label: 'f.notes', desc: 'd.notes', icon: 'note-pencil', tone: 'neel', route: '/notes', group: 'personal' },
  { key: 'wallpaper', label: 'f.wallpapers', desc: 'd.wallpapers', icon: 'images', tone: 'plum', route: '/wallpapers', group: 'personal' },
  { key: 'feed', label: 'f.feed', desc: 'd.feed', icon: 'newspaper', tone: 'haldi', route: '/feed', group: 'personal' },
];

export const TOOL_GROUPS: { key: ToolGroup; label: string }[] = [
  { key: 'daily', label: 'g.daily' },
  { key: 'places', label: 'g.places' },
  { key: 'learn', label: 'g.learn' },
  { key: 'personal', label: 'g.personal' },
];
