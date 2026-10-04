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

// Official website is live. Social accounts can be added here later.
export const SOCIAL_LINKS: { instagram?: string; twitter?: string; website?: string } = {
  website: 'https://sadhak-app.vercel.app',
};
export const WEBSITE_URL = 'https://sadhak-app.vercel.app';

export interface ChangelogEntry {
  version: string;
  date: string;
  title: string;
  changes: string[];
}

export const CHANGELOG: ChangelogEntry[] = [
  {
    // Shipped over the air: the app version stays 1.12.0 so installed phones
    // (runtime 1.12.0) accept it.
    version: '1.12.0 · update 1',
    date: '2026-10-04',
    title: 'A new look, everywhere',
    changes: [
      'Theme and language switches on Home, every tab and every screen header',
      'New Tools tab, and every tool right under Today on Home',
      'Today card leads with the tithi, plus sunrise, sunset and Rahu Kaal at a glance',
      'Coming up: the next festivals, Ekadashi, Purnima and Amavasya on Home',
      'New type: a warm serif for titles and a classic Devanagari face for shlokas',
      'One calm colour family for icons instead of mixed bright colours',
      'Updates now install with one tap (Restart) instead of waiting for the next launch',
    ],
  },
  {
    version: '1.12.0',
    date: '2026-10-04',
    title: 'Light mode, your language & a calmer look',
    changes: [
      'Choose Light, Dark or follow your phone (Settings → Appearance); Light is the default',
      'Warmer, richer colours across the whole app',
      'Language switch now works: Hindi and Bengali throughout menus, Home, Panchang, Calendar and Settings',
      'Other Indian languages show their own words for the main labels; anything missing falls back to English',
      'New splash screen and a proper app and notification icon',
      'Share Sadhak with a beautiful invite card',
      'Japa follows your theme; onboarding restyled',
    ],
  },
  {
    version: '1.11.0',
    date: '2026-10-04',
    title: 'Premium icons & instant updates',
    changes: [
      'New premium duotone icon set across Home, tab bar, Settings, Panchang and Community',
      'A hand-drawn temple icon in the same style',
      'App can now receive updates instantly, without reinstalling',
    ],
  },
  {
    version: '1.10.0',
    date: '2026-10-04',
    title: 'Compass, temples & a fresh look',
    changes: [
      'Vastu Compass rebuilt: tilt-corrected, true north, steady needle, hold reading',
      'Nearby temples load in seconds and the map works again',
      'Bhandaras have a date and time, expire on their own, and can be pinned anywhere',
      'Panchang: browse any day, live "right now" muhurta, clearer timings',
      'Deity paintings, wallpapers and food photos load reliably',
      'Every screen redesigned to one clean, consistent style (light and dark)',
      'Calendar dates now sit under the correct weekday',
      'Notification switches in Settings now really work',
      'Japa counter, Ayurveda quiz, Home and tab bar redesigned',
    ],
  },
  {
    version: '1.9.1',
    date: '2026-10-04',
    title: 'Fixes & polish',
    changes: [
      'Calendar and note reminders are no longer wiped by the daily notification refresh',
      'Hourly spiritual notifications now pause at night (10 PM to 6 AM)',
      'Tapping a notification opens the right screen even when the app was closed',
      'Jyotish: running dasha and Sade Sati stay current instead of freezing at first compute',
      'Jyotish: daily guidance uses your local date and refreshes after editing birth details',
      'Jyotish: back button cancels an edit; retry when guidance fails to load',
      'Sadhak AI now actually reads your chart in "Chat about your chart"',
      'Hindu Wiki: back button returns to the article list',
      'Crowded houses in the birth chart no longer overlap',
      'Removed unused microphone permission',
    ],
  },
  {
    version: '1.9.0',
    date: '2026-07-13',
    title: 'Jyotish, Ayurveda & Hindu Wiki',
    changes: [
      'Vedic birth chart (D1/D9/D10/Moon), dasha, yogas and doshas',
      'Daily, weekly, monthly and yearly guidance + PDF kundli report',
      'Ayurveda prakriti assessment',
      'Hindu Wiki encyclopedia',
    ],
  },
  {
    version: '1.2.0',
    date: '2026-07-06',
    title: 'The Big One 🔱',
    changes: [
      'Uploads fixed for real — profile photos, PDFs and post images',
      'Devotional Library: full Hanuman Chalisa, complete aartis, mantras with meanings, stotras',
      'Listen/Watch any aarti or mantra inside the app',
      'Sadhak AI — your spiritual companion, powered by Gemini',
      'Sign in with username, forgot & change password',
      'Community bhandara & temple pins on the live map',
      'Comments on community posts',
      'Chat: delete messages, copy text, day separators',
      'Reminders at any hour with 5-minute precision',
      'Calendar decluttered; festival days marked correctly',
      'In-app PDF reader; launcher icon no longer cut',
    ],
  },
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
