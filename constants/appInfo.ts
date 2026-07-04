import Constants from 'expo-constants';

// Centralized app metadata — single source of truth for version, links, etc.
export const APP_NAME = 'Sadhak';
export const APP_TAGLINE = 'Your Hindu Spiritual Companion';
export const APP_VERSION = Constants.expoConfig?.version || '1.0.0';
export const BUILD_NUMBER = Constants.expoConfig?.android?.versionCode?.toString() || '1';

export const DEVELOPER_NAME = 'Sadhak Team';
export const SUPPORT_EMAIL = 'soumodityapramanik@gmail.com';
export const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.sadhak.app';
export const PLAY_STORE_MARKET_URL = 'market://details?id=com.sadhak.app';

// No active social media accounts yet. Add real links here once they exist,
// then the About screen will render buttons for any non-empty entry.
export const SOCIAL_LINKS: { instagram?: string; twitter?: string; website?: string } = {};

export interface ChangelogEntry {
  version: string;
  date: string;
  title: string;
  changes: string[];
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    version: '1.0.0',
    date: '2026-06-27',
    title: 'Initial Release 🚀',
    changes: [
      'Daily Panchang with Tithi, Nakshatra, Yoga, Karana, Vara',
      'Hindu Calendar with grooming guidance',
      'Sacred Library — upload and read Hindu scriptures',
      'Community Chat — public rooms, groups, and broadcasts',
      'Japa Mala — digital bead counter with haptic feedback',
      'Aarti Collection — lyrics in Hindi and English',
      'Grooming rules based on Panchang and scriptures',
      'Festival notifications and reminders',
      '200+ unique spiritual notification messages',
      'Dark mode with premium saffron theme',
      'Multi-language support (12+ Indian languages)',
      'Profile customization with bio and profile picture',
    ],
  },
];
