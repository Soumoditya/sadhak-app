// Supported languages with native names
export interface LanguageInfo {
  code: string;
  name: string;
  nativeName: string;
  script: string;
}

export const SUPPORTED_LANGUAGES: LanguageInfo[] = [
  { code: 'en', name: 'English', nativeName: 'English', script: 'Latin' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', script: 'Devanagari' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', script: 'Bengali' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी', script: 'Devanagari' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી', script: 'Gujarati' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', script: 'Tamil' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', script: 'Telugu' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ', script: 'Kannada' },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം', script: 'Malayalam' },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', script: 'Gurmukhi' },
  { code: 'as', name: 'Assamese', nativeName: 'অসমীয়া', script: 'Bengali' },
  { code: 'od', name: 'Odia', nativeName: 'ଓଡ଼ିଆ', script: 'Odia' },
];

export type LanguageCode = 'en' | 'hi' | 'bn' | 'mr' | 'gu' | 'ta' | 'te' | 'kn' | 'ml' | 'pa' | 'as' | 'od';

// Translation dictionary — all UI strings
// Base language: English. Other languages: translations for each key.
// If a key is missing in a language, fallback: selected → hi → en
export type TranslationMap = Record<string, string>;

const en: TranslationMap = {
  // Navigation
  'nav.home': 'Home',
  'nav.calendar': 'Calendar',
  'nav.library': 'Library',
  'nav.chat': 'Chat',
  'nav.profile': 'Profile',

  // Home
  'home.greeting': 'Namaste',
  'home.today': "Today's Panchang",
  'home.grooming': 'Grooming Guide',
  'home.festivals': 'Upcoming Festivals',
  'home.shloka': 'Shloka of the Day',
  'home.quickActions': 'Quick Actions',
  'home.adminBadge': 'Admin',
  'home.guestBanner': 'Sign in for the full experience',

  // Calendar
  'cal.title': 'Hindu Calendar',
  'cal.addNote': 'Add Note',
  'cal.setReminder': 'Set Reminder',
  'cal.grooming': 'Grooming',
  'cal.festivals': 'Festivals',
  'cal.reset': 'Reset Calendar',

  // Library
  'lib.title': 'Sacred Library',
  'lib.search': 'Search books...',
  'lib.upload': 'Submit PDF',
  'lib.download': 'Download',
  'lib.read': 'Read',
  'lib.categories': 'Categories',
  'lib.booksAvailable': 'books available',

  // Chat
  'chat.title': 'Community',
  'chat.subtitle': 'Connect with fellow Sadhaks',
  'chat.explore': 'Explore Feed',
  'chat.exploreSub': 'Posts, discoveries, and Sadhaks near you',
  'chat.rooms': 'Rooms',
  'chat.dms': 'DMs',
  'chat.channels': 'Channels',
  'chat.private': 'Private',
  'chat.groups': 'Groups',
  'chat.broadcast': 'Broadcast',
  'chat.newGroup': 'Create Group',
  'chat.typeMessage': 'Type a message...',

  // Profile
  'profile.title': 'My Profile',
  'profile.editProfile': 'Edit Profile',
  'profile.bio': 'Bio',
  'profile.bioPlaceholder': 'Tell us about your spiritual journey...',
  'profile.joinedOn': 'Joined',
  'profile.guestAccount': 'Guest Account',
  'profile.signInPrompt': 'Sign in to unlock all features',

  // Settings sections
  'settings.appearance': 'Appearance',
  'settings.language': 'Language',
  'settings.notifications': 'Notifications',
  'settings.privacy': 'Privacy',
  'settings.support': 'Support',
  'settings.account': 'Account',
  'settings.dangerZone': 'Danger Zone',

  // Settings items
  'settings.darkMode': 'Dark Mode',
  'settings.appLanguage': 'App Language',
  'settings.spiritualReminders': 'Spiritual Reminders',
  'settings.groomingAlerts': 'Grooming Alerts',
  'settings.festivalAlerts': 'Festival Alerts',
  'settings.ekadashiAlerts': 'Ekadashi Alerts',
  'settings.quietHours': 'Quiet Hours',
  'settings.quietHoursDesc': 'No notifications during quiet hours',
  'settings.showInCommunity': 'Show Profile in Community',
  'settings.allowDMs': 'Allow Direct Messages',

  // Support & Settings
  'settings.rateApp': 'Rate Sadhak',
  'settings.shareApp': 'Share App',
  'settings.about': 'About Sadhak',
  'settings.privacyPolicy': 'Privacy Policy',
  'settings.terms': 'Terms & Conditions',
  'settings.contact': 'Contact & Feedback',
  'settings.changelog': 'Changelog',
  'settings.faq': 'FAQ & Help',
  'settings.deleteAccount': 'Delete Account',
  'settings.logout': 'Logout',

  // About
  'about.title': 'About Sadhak',
  'about.version': 'Version',
  'about.mission': 'Our Mission',
  'about.missionText': 'Sadhak is dedicated to bringing the timeless wisdom of Sanatan Dharma to the digital age. We believe that spiritual guidance should be accessible, accurate, and personalized for every Hindu.',
  'about.madeIn': 'Made with ❤️ in India',

  // Privacy
  'privacy.title': 'Privacy Policy',

  // Terms
  'terms.title': 'Terms & Conditions',

  // Contact
  'contact.title': 'Contact & Feedback',
  'contact.email': 'Email Us',
  'contact.reportBug': 'Report a Bug',
  'contact.featureRequest': 'Request a Feature',
  'contact.bugTitle': 'Bug Title',
  'contact.bugDescription': 'Describe the issue...',
  'contact.submit': 'Submit',
  'contact.thankYou': 'Thank you for your feedback!',

  // Changelog
  'changelog.title': 'Changelog',
  'changelog.whatsNew': "What's New",

  // Auth
  'auth.login': 'Login',
  'auth.signup': 'Sign Up',
  'auth.guest': 'Continue as Guest',
  'auth.email': 'Email',
  'auth.password': 'Password',
  'auth.name': 'Full Name',
  'auth.google': 'Continue with Google',
  'auth.phone': 'Continue with Phone',
  'auth.or': 'OR',
  'auth.noAccount': "Don't have an account?",
  'auth.hasAccount': 'Already have an account?',
  'auth.forgotPassword': 'Forgot Password?',

  // Panchang
  'panch.tithi': 'Tithi',
  'panch.nakshatra': 'Nakshatra',
  'panch.yoga': 'Yoga',
  'panch.karana': 'Karana',
  'panch.sunrise': 'Sunrise',
  'panch.sunset': 'Sunset',
  'panch.rahuKaal': 'Rahu Kaal',
  'panch.brahmaMuhurta': 'Brahma Muhurta',
  'panch.abhijit': 'Abhijit Muhurta',

  // Features
  'feat.panchang': 'Panchang',
  'feat.temples': 'Nearby Temples',
  'feat.bhandara': 'Bhandara',
  'feat.japa': 'Japa Mala',
  'feat.aarti': 'Aarti',
  'feat.notes': 'My Notes',

  // Common
  'common.save': 'Save',
  'common.cancel': 'Cancel',
  'common.delete': 'Delete',
  'common.edit': 'Edit',
  'common.submit': 'Submit',
  'common.loading': 'Loading...',
  'common.error': 'An error occurred',
  'common.success': 'Success!',
  'common.search': 'Search',
  'common.all': 'All',
  'common.done': 'Done',
  'common.confirm': 'Confirm',
  'common.yes': 'Yes',
  'common.no': 'No',
  'common.ok': 'OK',
  'common.retry': 'Retry',
  'common.close': 'Close',
  'common.share': 'Share',
  'common.copy': 'Copy',
  'common.noData': 'No data available',
  'common.comingSoon': 'Coming Soon',
};

const hi: TranslationMap = {
  'nav.home': 'होम',
  'nav.calendar': 'कैलेंडर',
  'nav.library': 'पुस्तकालय',
  'nav.chat': 'चैट',
  'nav.profile': 'प्रोफ़ाइल',
  'home.greeting': 'नमस्ते',
  'home.today': 'आज का पंचांग',
  'home.grooming': 'शृंगार मार्गदर्शन',
  'home.festivals': 'आगामी त्योहार',
  'home.shloka': 'आज का श्लोक',
  'home.quickActions': 'त्वरित कार्य',
  'home.adminBadge': 'एडमिन',
  'home.guestBanner': 'पूर्ण अनुभव के लिए साइन इन करें',
  'cal.title': 'हिंदू कैलेंडर',
  'cal.addNote': 'नोट जोड़ें',
  'cal.setReminder': 'रिमाइंडर सेट करें',
  'cal.grooming': 'शृंगार',
  'cal.festivals': 'त्योहार',
  'cal.reset': 'कैलेंडर रीसेट करें',
  'lib.title': 'पवित्र पुस्तकालय',
  'lib.search': 'पुस्तकें खोजें...',
  'lib.upload': 'पीडीएफ भेजें',
  'lib.download': 'डाउनलोड',
  'lib.read': 'पढ़ें',
  'lib.categories': 'श्रेणियां',
  'lib.booksAvailable': 'पुस्तकें उपलब्ध',
  'chat.title': 'समुदाय',
  'chat.subtitle': 'साथी साधकों से जुड़ें',
  'chat.explore': 'एक्सप्लोर फ़ीड',
  'chat.exploreSub': 'पोस्ट, खोज और आस-पास के साधक',
  'chat.dms': 'संदेश',
  'chat.channels': 'चैनल',
  'chat.rooms': 'कक्ष',
  'chat.private': 'निजी',
  'chat.groups': 'समूह',
  'chat.broadcast': 'प्रसारण',
  'chat.newGroup': 'समूह बनाएं',
  'chat.typeMessage': 'संदेश लिखें...',
  'profile.title': 'मेरी प्रोफ़ाइल',
  'profile.editProfile': 'प्रोफ़ाइल संपादित करें',
  'profile.bio': 'परिचय',
  'profile.bioPlaceholder': 'अपनी आध्यात्मिक यात्रा के बारे में बताएं...',
  'profile.joinedOn': 'शामिल हुए',
  'profile.guestAccount': 'अतिथि खाता',
  'profile.signInPrompt': 'सभी सुविधाओं के लिए साइन इन करें',
  'settings.appearance': 'दिखावट',
  'settings.language': 'भाषा',
  'settings.notifications': 'सूचनाएं',
  'settings.privacy': 'गोपनीयता',
  'settings.support': 'सहायता',
  'settings.account': 'खाता',
  'settings.dangerZone': 'सावधानी क्षेत्र',
  'settings.darkMode': 'डार्क मोड',
  'settings.appLanguage': 'ऐप भाषा',
  'settings.spiritualReminders': 'आध्यात्मिक अनुस्मारक',
  'settings.groomingAlerts': 'शृंगार अलर्ट',
  'settings.festivalAlerts': 'त्योहार अलर्ट',
  'settings.ekadashiAlerts': 'एकादशी अलर्ट',
  'settings.quietHours': 'शांत समय',
  'settings.quietHoursDesc': 'शांत समय में कोई सूचना नहीं',
  'settings.showInCommunity': 'समुदाय में प्रोफ़ाइल दिखाएं',
  'settings.allowDMs': 'सीधे संदेश की अनुमति दें',
  'settings.rateApp': 'साधक को रेट करें',
  'settings.shareApp': 'ऐप शेयर करें',
  'settings.about': 'साधक के बारे में',
  'settings.privacyPolicy': 'गोपनीयता नीति',
  'settings.terms': 'नियम और शर्तें',
  'settings.contact': 'संपर्क और प्रतिक्रिया',
  'settings.changelog': 'बदलाव लॉग',
  'settings.faq': 'सवाल-जवाब और मदद',
  'settings.deleteAccount': 'खाता हटाएं',
  'settings.logout': 'लॉगआउट',
  'about.title': 'साधक के बारे में',
  'about.version': 'संस्करण',
  'about.mission': 'हमारा उद्देश्य',
  'about.missionText': 'साधक सनातन धर्म के शाश्वत ज्ञान को डिजिटल युग में लाने के लिए समर्पित है। हम विश्वास करते हैं कि आध्यात्मिक मार्गदर्शन हर हिंदू के लिए सुलभ, सटीक और व्यक्तिगत होना चाहिए।',
  'about.madeIn': '❤️ से भारत में बनाया गया',
  'privacy.title': 'गोपनीयता नीति',
  'terms.title': 'नियम और शर्तें',
  'contact.title': 'संपर्क और प्रतिक्रिया',
  'contact.email': 'ईमेल करें',
  'contact.reportBug': 'बग रिपोर्ट करें',
  'contact.featureRequest': 'सुविधा का अनुरोध',
  'contact.bugTitle': 'बग शीर्षक',
  'contact.bugDescription': 'समस्या का वर्णन करें...',
  'contact.submit': 'जमा करें',
  'contact.thankYou': 'आपकी प्रतिक्रिया के लिए धन्यवाद!',
  'changelog.title': 'बदलाव लॉग',
  'changelog.whatsNew': 'नया क्या है',
  'auth.login': 'लॉगिन',
  'auth.signup': 'साइन अप',
  'auth.guest': 'अतिथि के रूप में जारी रखें',
  'auth.email': 'ईमेल',
  'auth.password': 'पासवर्ड',
  'auth.name': 'पूरा नाम',
  'auth.google': 'गूगल से जारी रखें',
  'auth.phone': 'फ़ोन से जारी रखें',
  'auth.or': 'अथवा',
  'auth.noAccount': 'खाता नहीं है?',
  'auth.hasAccount': 'पहले से खाता है?',
  'panch.tithi': 'तिथि',
  'panch.nakshatra': 'नक्षत्र',
  'panch.yoga': 'योग',
  'panch.karana': 'करण',
  'panch.sunrise': 'सूर्योदय',
  'panch.sunset': 'सूर्यास्त',
  'panch.rahuKaal': 'राहु काल',
  'panch.brahmaMuhurta': 'ब्रह्म मुहूर्त',
  'panch.abhijit': 'अभिजित मुहूर्त',
  'feat.panchang': 'पंचांग',
  'feat.temples': 'निकटवर्ती मंदिर',
  'feat.bhandara': 'भंडारा',
  'feat.japa': 'जप माला',
  'feat.aarti': 'आरती',
  'feat.notes': 'मेरे नोट्स',
  'common.save': 'सहेजें',
  'common.cancel': 'रद्द करें',
  'common.delete': 'हटाएं',
  'common.edit': 'संपादित करें',
  'common.submit': 'जमा करें',
  'common.loading': 'लोड हो रहा है...',
  'common.error': 'एक त्रुटि हुई',
  'common.success': 'सफलता!',
  'common.search': 'खोजें',
  'common.all': 'सभी',
  'common.done': 'हो गया',
  'common.confirm': 'पुष्टि करें',
  'common.yes': 'हाँ',
  'common.no': 'नहीं',
  'common.ok': 'ठीक',
  'common.close': 'बंद करें',
  'common.share': 'शेयर करें',
  'common.noData': 'कोई डेटा उपलब्ध नहीं',
  'common.comingSoon': 'जल्द आ रहा है',
};

const bn: TranslationMap = {
  'nav.home': 'হোম', 'nav.calendar': 'ক্যালেন্ডার', 'nav.library': 'গ্রন্থাগার', 'nav.chat': 'চ্যাট', 'nav.profile': 'প্রোফাইল',
  'home.greeting': 'নমস্কার', 'home.today': 'আজকের পঞ্চাঙ্গ', 'home.grooming': 'পরিচর্যা গাইড', 'home.shloka': 'আজকের শ্লোক', 'home.quickActions': 'দ্রুত কাজ',
  'settings.darkMode': 'ডার্ক মোড', 'settings.language': 'ভাষা', 'settings.notifications': 'বিজ্ঞপ্তি', 'settings.logout': 'লগআউট',
  'settings.rateApp': 'সাধক রেটিং দিন', 'settings.shareApp': 'অ্যাপ শেয়ার করুন', 'settings.about': 'সাধক সম্পর্কে',
  'settings.privacyPolicy': 'গোপনীয়তা নীতি', 'settings.terms': 'শর্তাবলী', 'settings.contact': 'যোগাযোগ ও মতামত',
  'common.save': 'সংরক্ষণ', 'common.cancel': 'বাতিল', 'common.delete': 'মুছুন', 'common.loading': 'লোড হচ্ছে...',
  'auth.login': 'লগইন', 'auth.signup': 'সাইন আপ', 'auth.guest': 'অতিথি হিসেবে চালিয়ে যান',
  'panch.tithi': 'তিথি', 'panch.nakshatra': 'নক্ষত্র', 'panch.sunrise': 'সূর্যোদয়', 'panch.sunset': 'সূর্যাস্ত',
  'about.madeIn': '❤️ দিয়ে ভারতে তৈরি',
};

const mr: TranslationMap = {
  'nav.home': 'मुख्यपृष्ठ', 'nav.calendar': 'दिनदर्शिका', 'nav.library': 'ग्रंथालय', 'nav.chat': 'चॅट', 'nav.profile': 'प्रोफाइल',
  'home.greeting': 'नमस्कार', 'home.today': 'आजचे पंचांग', 'home.grooming': 'शृंगार मार्गदर्शन', 'home.shloka': 'आजचा श्लोक', 'home.quickActions': 'जलद कृती',
  'settings.darkMode': 'डार्क मोड', 'settings.language': 'भाषा', 'settings.notifications': 'सूचना', 'settings.logout': 'लॉगआउट',
  'settings.rateApp': 'साधकला रेट करा', 'settings.shareApp': 'अॅप शेअर करा', 'settings.about': 'साधक बद्दल',
  'common.save': 'जतन करा', 'common.cancel': 'रद्द करा', 'common.delete': 'हटवा', 'common.loading': 'लोड होत आहे...',
  'auth.login': 'लॉगिन', 'auth.signup': 'साइन अप', 'auth.guest': 'अतिथी म्हणून सुरू ठेवा',
  'about.madeIn': '❤️ ने भारतात बनवलेले',
};

const gu: TranslationMap = {
  'nav.home': 'હોમ', 'nav.calendar': 'કૅલેન્ડર', 'nav.library': 'પુસ્તકાલય', 'nav.chat': 'ચૅટ', 'nav.profile': 'પ્રોફાઈલ',
  'home.greeting': 'નમસ્તે', 'home.today': 'આજનું પંચાંગ', 'home.shloka': 'આજનો શ્લોક', 'home.quickActions': 'ઝડપી ક્રિયાઓ',
  'settings.darkMode': 'ડાર્ક મોડ', 'settings.language': 'ભાષા', 'settings.notifications': 'સૂચનાઓ', 'settings.logout': 'લૉગઆઉટ',
  'common.save': 'સાચવો', 'common.cancel': 'રદ કરો', 'common.loading': 'લોડ થઈ રહ્યું છે...',
  'auth.login': 'લૉગિન', 'auth.signup': 'સાઇન અપ', 'auth.guest': 'અતિથિ તરીકે ચાલુ રાખો',
  'about.madeIn': '❤️ થી ભારતમાં બનાવેલ',
};

const ta: TranslationMap = {
  'nav.home': 'முகப்பு', 'nav.calendar': 'நாட்காட்டி', 'nav.library': 'நூலகம்', 'nav.chat': 'அரட்டை', 'nav.profile': 'சுயவிவரம்',
  'home.greeting': 'வணக்கம்', 'home.today': 'இன்றைய பஞ்சாங்கம்', 'home.shloka': 'இன்றைய ஸ்லோகம்', 'home.quickActions': 'விரைவு செயல்கள்',
  'settings.darkMode': 'இருண்ட பயன்முறை', 'settings.language': 'மொழி', 'settings.notifications': 'அறிவிப்புகள்', 'settings.logout': 'வெளியேறு',
  'common.save': 'சேமி', 'common.cancel': 'ரத்து', 'common.loading': 'ஏற்றுகிறது...',
  'auth.login': 'உள்நுழை', 'auth.signup': 'பதிவு செய்', 'auth.guest': 'விருந்தினராக தொடரவும்',
  'about.madeIn': '❤️ உடன் இந்தியாவில் தயாரிக்கப்பட்டது',
};

const te: TranslationMap = {
  'nav.home': 'హోమ్', 'nav.calendar': 'క్యాలెండర్', 'nav.library': 'లైబ్రరీ', 'nav.chat': 'చాట్', 'nav.profile': 'ప్రొఫైల్',
  'home.greeting': 'నమస్కారం', 'home.today': 'ఈ రోజు పంచాంగం', 'home.shloka': 'ఈ రోజు శ్లోకం', 'home.quickActions': 'త్వరిత చర్యలు',
  'settings.darkMode': 'డార్క్ మోడ్', 'settings.language': 'భాష', 'settings.notifications': 'నోటిఫికేషన్లు', 'settings.logout': 'లాగ్‌అవుట్',
  'common.save': 'సేవ్', 'common.cancel': 'రద్దు', 'common.loading': 'లోడ్ అవుతోంది...',
  'auth.login': 'లాగిన్', 'auth.signup': 'సైన్ అప్', 'auth.guest': 'అతిథిగా కొనసాగండి',
  'about.madeIn': '❤️ తో భారతదేశంలో తయారు చేయబడింది',
};

const kn: TranslationMap = {
  'nav.home': 'ಮುಖಪುಟ', 'nav.calendar': 'ಕ್ಯಾಲೆಂಡರ್', 'nav.library': 'ಗ್ರಂಥಾಲಯ', 'nav.chat': 'ಚಾಟ್', 'nav.profile': 'ಪ್ರೊಫೈಲ್',
  'home.greeting': 'ನಮಸ್ಕಾರ', 'home.today': 'ಇಂದಿನ ಪಂಚಾಂಗ', 'home.shloka': 'ಇಂದಿನ ಶ್ಲೋಕ', 'home.quickActions': 'ತ್ವರಿತ ಕ್ರಿಯೆಗಳು',
  'settings.darkMode': 'ಡಾರ್ಕ್ ಮೋಡ್', 'settings.language': 'ಭಾಷೆ', 'settings.notifications': 'ಅಧಿಸೂಚನೆಗಳು', 'settings.logout': 'ಲಾಗ್‌ಔಟ್',
  'common.save': 'ಉಳಿಸಿ', 'common.cancel': 'ರದ್ದುಮಾಡಿ', 'common.loading': 'ಲೋಡ್ ಆಗುತ್ತಿದೆ...',
  'auth.login': 'ಲಾಗಿನ್', 'auth.signup': 'ಸೈನ್ ಅಪ್', 'auth.guest': 'ಅತಿಥಿಯಾಗಿ ಮುಂದುವರಿಯಿರಿ',
  'about.madeIn': '❤️ ಇಂದ ಭಾರತದಲ್ಲಿ ತಯಾರಿಸಲಾಗಿದೆ',
};

const ml: TranslationMap = {
  'nav.home': 'ഹോം', 'nav.calendar': 'കലണ്ടർ', 'nav.library': 'ലൈബ്രറി', 'nav.chat': 'ചാറ്റ്', 'nav.profile': 'പ്രൊഫൈൽ',
  'home.greeting': 'നമസ്കാരം', 'home.today': 'ഇന്നത്തെ പഞ്ചാംഗം', 'home.shloka': 'ഇന്നത്തെ ശ്ലോകം', 'home.quickActions': 'ദ്രുത പ്രവർത്തനങ്ങൾ',
  'settings.darkMode': 'ഇരുണ്ട മോഡ്', 'settings.language': 'ഭാഷ', 'settings.notifications': 'അറിയിപ്പുകൾ', 'settings.logout': 'ലോഗൗട്ട്',
  'common.save': 'സേവ്', 'common.cancel': 'റദ്ദാക്കുക', 'common.loading': 'ലോഡ് ചെയ്യുന്നു...',
  'auth.login': 'ലോഗിൻ', 'auth.signup': 'സൈൻ അപ്പ്', 'auth.guest': 'അതിഥിയായി തുടരുക',
  'about.madeIn': '❤️ ഉപയോഗിച്ച് ഇന്ത്യയിൽ നിർമ്മിച്ചത്',
};

const pa: TranslationMap = {
  'nav.home': 'ਹੋਮ', 'nav.calendar': 'ਕੈਲੰਡਰ', 'nav.library': 'ਲਾਇਬ੍ਰੇਰੀ', 'nav.chat': 'ਚੈਟ', 'nav.profile': 'ਪ੍ਰੋਫਾਈਲ',
  'home.greeting': 'ਸਤ ਸ੍ਰੀ ਅਕਾਲ', 'home.today': 'ਅੱਜ ਦਾ ਪੰਚਾਂਗ', 'home.shloka': 'ਅੱਜ ਦਾ ਸ਼ਲੋਕ', 'home.quickActions': 'ਤੇਜ਼ ਕਾਰਵਾਈਆਂ',
  'settings.darkMode': 'ਡਾਰਕ ਮੋਡ', 'settings.language': 'ਭਾਸ਼ਾ', 'settings.notifications': 'ਸੂਚਨਾਵਾਂ', 'settings.logout': 'ਲੌਗਆਊਟ',
  'common.save': 'ਸੰਭਾਲੋ', 'common.cancel': 'ਰੱਦ ਕਰੋ', 'common.loading': 'ਲੋਡ ਹੋ ਰਿਹਾ ਹੈ...',
  'auth.login': 'ਲੌਗਿਨ', 'auth.signup': 'ਸਾਈਨ ਅੱਪ', 'auth.guest': 'ਮਹਿਮਾਨ ਵਜੋਂ ਜਾਰੀ ਰੱਖੋ',
  'about.madeIn': '❤️ ਨਾਲ ਭਾਰਤ ਵਿੱਚ ਬਣਾਇਆ ਗਿਆ',
};

const as_lang: TranslationMap = {
  'nav.home': 'হোম', 'nav.calendar': 'কেলেণ্ডাৰ', 'nav.library': 'পুথিভঁৰাল', 'nav.chat': 'চাট', 'nav.profile': 'প্ৰ\'ফাইল',
  'home.greeting': 'নমস্কাৰ', 'home.today': 'আজিৰ পঞ্চাংগ', 'home.shloka': 'আজিৰ শ্লোক',
  'settings.darkMode': 'ডাৰ্ক ম\'ড', 'settings.language': 'ভাষা', 'settings.logout': 'লগআউট',
  'common.save': 'সংৰক্ষণ', 'common.cancel': 'বাতিল', 'common.loading': 'ল\'ড হৈ আছে...',
  'auth.login': 'লগইন', 'auth.signup': 'চাইন আপ', 'auth.guest': 'অতিথি হিচাপে আগবাঢ়ক',
  'about.madeIn': '❤️ ৰে ভাৰতত নিৰ্মিত',
};

const od: TranslationMap = {
  'nav.home': 'ମୂଳପୃଷ୍ଠା', 'nav.calendar': 'କ୍ୟାଲେଣ୍ଡର', 'nav.library': 'ଗ୍ରନ୍ଥାଗାର', 'nav.chat': 'ଚାଟ୍', 'nav.profile': 'ପ୍ରୋଫାଇଲ',
  'home.greeting': 'ନମସ୍କାର', 'home.today': 'ଆଜିର ପଞ୍ଚାଙ୍ଗ', 'home.shloka': 'ଆଜିର ଶ୍ଳୋକ',
  'settings.darkMode': 'ଡାର୍କ ମୋଡ', 'settings.language': 'ଭାଷା', 'settings.logout': 'ଲଗଆଉଟ',
  'common.save': 'ସଞ୍ଚୟ', 'common.cancel': 'ବାତିଲ', 'common.loading': 'ଲୋଡ ହେଉଛି...',
  'auth.login': 'ଲଗଇନ', 'auth.signup': 'ସାଇନ ଅପ', 'auth.guest': 'ଅତିଥି ଭାବେ ଜାରି ରଖନ୍ତୁ',
  'about.madeIn': '❤️ ସହ ଭାରତରେ ନିର୍ମିତ',
};

// Aggregate all translations
export const ALL_TRANSLATIONS: Record<LanguageCode, TranslationMap> = {
  en,
  hi,
  bn,
  mr,
  gu,
  ta,
  te,
  kn,
  ml,
  pa,
  as: as_lang,
  od,
};
