// Hindu Wiki — a small curated encyclopedia (deities, scriptures, festivals,
// concepts). Concise, respectful, widely-accepted summaries. Expandable.

export interface WikiArticle {
  id: string; title: string; titleHi?: string; category: WikiCat; summary: string; body: string;
}
export type WikiCat = 'deities' | 'scriptures' | 'festivals' | 'concepts';

export const WIKI_CATEGORIES: { key: WikiCat; label: string; icon: string; color: string }[] = [
  { key: 'deities', label: 'Deities', icon: 'account-star', color: '#C2410C' },
  { key: 'scriptures', label: 'Scriptures', icon: 'book-open-page-variant', color: '#1565C0' },
  { key: 'festivals', label: 'Festivals', icon: 'party-popper', color: '#7C3AED' },
  { key: 'concepts', label: 'Concepts', icon: 'lightbulb-on-outline', color: '#2D6A4F' },
];

export const WIKI: WikiArticle[] = [
  // ── Deities ──
  { id: 'ganesha', title: 'Ganesha', titleHi: 'गणेश', category: 'deities',
    summary: 'The elephant-headed remover of obstacles, invoked first in any worship.',
    body: 'Ganesha (Ganapati, Vinayaka) is the son of Shiva and Parvati, lord of beginnings and remover of obstacles (Vighnaharta). He is invoked before any undertaking, journey, or ceremony. His large head signifies wisdom; the broken tusk, sacrifice; the mouse vehicle, mastery over desire. His favourite offering is modak. Chaturthi (4th tithi) and especially Ganesh Chaturthi (Bhadrapada) are dedicated to him. Mool mantra: "Om Gam Ganapataye Namah".' },
  { id: 'shiva', title: 'Shiva', titleHi: 'शिव', category: 'deities',
    summary: 'The auspicious one — destroyer and transformer within the Trimurti.',
    body: 'Shiva (Mahadeva, Rudra, Shankara) is the transformer among the Trimurti (Brahma-Vishnu-Shiva). He is both the fierce ascetic of Kailasa and the loving householder with Parvati, father of Ganesha and Kartikeya. Worshipped chiefly as the Shivalinga, he is associated with meditation, detachment, and the cosmic dance (Tandava). Monday (Somvar), Pradosh, and Maha Shivaratri are sacred to him. Panchakshara mantra: "Om Namah Shivaya".' },
  { id: 'vishnu', title: 'Vishnu', titleHi: 'विष्णु', category: 'deities',
    summary: 'The preserver who descends as avatars to restore dharma.',
    body: 'Vishnu is the preserver and sustainer of the cosmos, resting on the serpent Shesha in the ocean of milk with Lakshmi. When dharma declines, he descends as an avatar — the Dashavatara includes Rama and Krishna. He is worshipped as Narayana, Hari, and Satyanarayana. Thursday, Ekadashi, and Purnima are dear to him; tulsi is essential in his worship. Mantra: "Om Namo Narayanaya".' },
  { id: 'durga', title: 'Durga', titleHi: 'दुर्गा', category: 'deities',
    summary: 'The invincible Mother Goddess, slayer of Mahishasura.',
    body: 'Durga is the supreme Shakti, the fierce and protective Mother who rides a lion and wields the weapons of all the gods. She slew the buffalo-demon Mahishasura, and is celebrated over the nine nights of Navratri, culminating in Vijayadashami. Her forms include the nine Navadurgas. She embodies courage, protection, and the triumph of good. Mantra: "Om Dum Durgayai Namah".' },
  { id: 'hanuman', title: 'Hanuman', titleHi: 'हनुमान', category: 'deities',
    summary: 'The devoted vanara, embodiment of strength, service, and bhakti.',
    body: 'Hanuman is the mighty vanara devotee of Rama, son of the wind-god Vayu. Renowned for boundless strength, celibacy, humility, and unwavering devotion, he leapt to Lanka to find Sita and carried the Sanjivani mountain. He is the model of selfless service (seva) and protection. Tuesday and Saturday are his days; the Hanuman Chalisa is his best-loved hymn. Mantra: "Om Hanumate Namah".' },
  { id: 'lakshmi', title: 'Lakshmi', titleHi: 'लक्ष्मी', category: 'deities',
    summary: 'Goddess of wealth, fortune, beauty, and abundance.',
    body: 'Lakshmi is the consort of Vishnu and goddess of prosperity — material and spiritual. She is worshipped for wealth, harmony, and grace, especially on Fridays, Diwali, and Sharad Purnima. She favours cleanliness, light, and generosity, and dislikes disorder. Her forms (Ashta Lakshmi) govern eight kinds of abundance. Mantra: "Om Shreem Mahalakshmyai Namah".' },

  // ── Scriptures ──
  { id: 'gita', title: 'Bhagavad Gita', titleHi: 'भगवद्गीता', category: 'scriptures',
    summary: "Krishna's 700-verse counsel to Arjuna on duty, devotion, and the Self.",
    body: 'The Bhagavad Gita ("Song of God") is a 700-verse dialogue within the Mahabharata, spoken by Krishna to Arjuna on the battlefield of Kurukshetra. It reconciles the paths of action (karma yoga), knowledge (jnana yoga), and devotion (bhakti yoga), teaching one to act without attachment to results, seeing the eternal Self (Atman) beyond the changing body. It is among the most cherished texts of Sanatana Dharma.' },
  { id: 'vedas', title: 'The Vedas', titleHi: 'वेद', category: 'scriptures',
    summary: 'The oldest scriptures — Rig, Yajur, Sama, Atharva.',
    body: 'The four Vedas — Rigveda, Yajurveda, Samaveda, Atharvaveda — are the foundational revealed texts (shruti) of Sanatana Dharma, preserved orally for millennia. Each has four parts: Samhitas (hymns), Brahmanas (ritual), Aranyakas (contemplation), and Upanishads (philosophy). They contain mantras to the devas, the science of yajna, and the seeds of Vedanta.' },
  { id: 'upanishads', title: 'Upanishads', titleHi: 'उपनिषद्', category: 'scriptures',
    summary: 'The philosophical culmination of the Vedas (Vedanta).',
    body: 'The Upanishads are the concluding portions of the Vedas ("Vedanta"), exploring the nature of Brahman (ultimate reality) and Atman (the Self), and their identity ("Tat Tvam Asi" — That thou art). The principal Upanishads (Isha, Kena, Katha, Mundaka, Mandukya, and others) are the source of the great mahavakyas and India\'s enduring philosophy of non-duality.' },
  { id: 'ramayana', title: 'Ramayana', titleHi: 'रामायण', category: 'scriptures',
    summary: "Valmiki's epic of Rama — dharma embodied.",
    body: 'The Ramayana, composed by Maharishi Valmiki, narrates the life of Rama, prince of Ayodhya — his exile, the abduction of Sita by Ravana, the alliance with Hanuman and Sugriva, and the victory of dharma. It is a moral touchstone on duty, devotion, ideal kingship, and the bonds of family. Tulsidas\' Ramcharitmanas retells it in Awadhi.' },

  // ── Festivals ──
  { id: 'diwali', title: 'Diwali', titleHi: 'दीपावली', category: 'festivals',
    summary: 'The festival of lights — the victory of light over darkness.',
    body: 'Diwali (Deepavali) is the five-day festival of lights in Kartika, celebrating the return of Rama to Ayodhya and the worship of Lakshmi for prosperity. Homes are cleaned and lit with diyas and rangoli, sweets are shared, and Lakshmi-Ganesha puja is performed on the main night (Amavasya). It symbolises the inner victory of light, knowledge, and goodness over darkness.' },
  { id: 'holi', title: 'Holi', titleHi: 'होली', category: 'festivals',
    summary: 'The festival of colours and the triumph of devotion.',
    body: 'Holi is the spring festival of colours on Phalguna Purnima. The eve (Holika Dahan) commemorates the saving of the devotee Prahlada and the burning of Holika, marking the victory of devotion over arrogance. The next day people play with colours (gulal), celebrating love, forgiveness, and renewal — famously associated with Krishna and Radha in Braj.' },
  { id: 'navratri', title: 'Navratri', titleHi: 'नवरात्रि', category: 'festivals',
    summary: 'Nine nights of the Divine Mother.',
    body: 'Navratri is nine nights of worship of the Divine Mother in her nine forms (Navadurga), observed chiefly in Ashwin (Sharad Navratri) and Chaitra. Devotees fast, chant the Durga Saptashati, and perform garba/dandiya. It culminates in Vijayadashami (Dussehra), the victory of Durga over Mahishasura and of Rama over Ravana.' },
  { id: 'ekadashi', title: 'Ekadashi', titleHi: 'एकादशी', category: 'festivals',
    summary: 'The 11th tithi — a fasting day dear to Vishnu.',
    body: 'Ekadashi is the 11th lunar day of each fortnight, observed as a fast (vrat) dedicated to Vishnu. Devotees abstain from grains and beans, spend the day in prayer, japa, and reading, and break the fast (parana) at the prescribed time the next day (Dwadashi). It is prized for purifying the body and mind and deepening devotion.' },

  // ── Concepts ──
  { id: 'dharma', title: 'Dharma', titleHi: 'धर्म', category: 'concepts',
    summary: 'Righteous duty and the cosmic order that upholds life.',
    body: 'Dharma is one of the four aims of life (purusharthas), meaning righteous conduct, duty, and the natural law that sustains the cosmos and society. It is context-sensitive — svadharma (one\'s own duty) varies by role, stage of life (ashrama), and situation. To live in dharma is to act in harmony with truth (satya) and the good of all.' },
  { id: 'karma', title: 'Karma', titleHi: 'कर्म', category: 'concepts',
    summary: 'The law of action and consequence.',
    body: 'Karma is the principle that every action, word, and intention bears fruit, shaping present and future experience across lifetimes. The Gita teaches nishkama karma — acting rightly without attachment to results — as the way to freedom. Karma is not fatalism but responsibility: we shape our destiny through conscious action.' },
  { id: 'moksha', title: 'Moksha', titleHi: 'मोक्ष', category: 'concepts',
    summary: 'Liberation — the fourth and ultimate aim of life.',
    body: 'Moksha is liberation from the cycle of birth and death (samsara) — the realisation of the Self (Atman) as one with Brahman. It is the highest of the four purusharthas (dharma, artha, kama, moksha). The paths to it include knowledge (jnana), devotion (bhakti), selfless action (karma), and meditation (raja yoga).' },
  { id: 'atman', title: 'Atman & Brahman', titleHi: 'आत्मन्–ब्रह्मन्', category: 'concepts',
    summary: 'The Self and the Absolute — the heart of Vedanta.',
    body: 'Atman is the eternal, unchanging Self within every being; Brahman is the infinite ground of all existence. The Upanishads reveal their identity — "Ayam Atma Brahma" (this Self is Brahman). Realising this unity, beyond the ego and the body, is the goal of Vedanta and the essence of moksha.' },
];
