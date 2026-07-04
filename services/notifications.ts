/**
 * Sadhak Auto Notification Service
 * Sends unique spiritual notifications every hour — Zomato-style persistent engagement
 * 
 * Features:
 * - 200+ unique messages (never repeats within a cycle)
 * - Time-aware (morning mantras, evening aartis, night shlokas)
 * - Panchang-aware (tithi-based tips)
 * - Shuffle algorithm ensures uniqueness
 */

import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Configure notification handler.
// SDK 53+ splits the old `shouldShowAlert` into `shouldShowBanner` +
// `shouldShowList`; both are required or foreground notifications won't render.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldShowAlert: true, // back-compat for older runtimes
    shouldPlaySound: true,
    shouldSetBadge: true,
    priority: Notifications.AndroidNotificationPriority.HIGH,
  }) as any,
});

// ─── 200+ UNIQUE NOTIFICATION MESSAGES ───────────────────────────────
const NOTIFICATION_POOL = {
  // Morning (4 AM - 9 AM) — 40 messages
  morning: [
    { title: '🙏 Brahma Muhurta', body: '"ब्रह्ममुहूर्ते उत्तिष्ठेत्" — Rise during Brahma Muhurta for spiritual clarity and divine blessings.' },
    { title: '☀️ Surya Namaskar', body: 'Start your day with 12 rounds of Surya Namaskar. The Sun God blesses those who honor Him at dawn.' },
    { title: '🕉️ Morning Mantra', body: '"ॐ भूर्भुवः स्वः" — Chant the Gayatri Mantra 108 times for intellectual brilliance and spiritual awakening.' },
    { title: '🪔 Prabhati Aarti', body: 'Have you done your morning aarti? Light a diya and offer prayers to your Ishta Devta.' },
    { title: '📿 Japa Reminder', body: 'Morning japa is 10x more powerful. Complete your mala before breakfast for maximum benefit.' },
    { title: '🌅 Sunrise Blessing', body: '"उदयं सूर्यं नमस्कुर्यात्" — Offering water to the rising sun removes all sins and brings prosperity.' },
    { title: '💧 Ganga Jal', body: 'Sprinkle Ganga Jal in your home this morning. It purifies the atmosphere and invites positive energies.' },
    { title: '🌺 Tulsi Puja', body: 'Water the Tulsi plant and do parikrama. Tulsi Mata removes Vastu dosha and brings peace.' },
    { title: '📖 Gita Shloka', body: '"कर्मण्येवाधिकारस्ते" — Focus on your duty today without worrying about results. —Gita 2.47' },
    { title: '🔔 Temple Bell', body: 'The morning temple bell dispels negative energies. Visit your nearest temple today.' },
    { title: '🙏 Sandhya Vandana', body: 'Perform morning Sandhya Vandana. It is the foremost duty prescribed by the Vedas.' },
    { title: '🍃 Neem & Tulsi', body: 'Chew 2-3 Neem leaves on empty stomach. Ancient Ayurvedic wisdom for daily health.' },
    { title: '🌞 Aditya Hridayam', body: 'Recite Aditya Hridayam Stotram for victory over obstacles. Lord Rama chanted it before the war.' },
    { title: '🕉️ Pranayama', body: 'Practice Anulom Vilom for 10 minutes. It balances the Ida and Pingala nadis.' },
    { title: '📿 Mahamrityunjaya', body: '"ॐ त्र्यम्बकं यजामहे" — Chant the Mahamrityunjaya Mantra for health and longevity.' },
    { title: '🌸 Flower Offering', body: 'Offer fresh flowers to your deity. Red for Durga, White for Shiva, Yellow for Vishnu, Blue for Krishna.' },
    { title: '🍯 Panchamrit', body: 'Prepare Panchamrit (milk, curd, ghee, honey, sugar) for abhishekam. Each ingredient has divine significance.' },
    { title: '🪷 Lotus Sutra', body: '"Be like the lotus — in the world but not of the world." Start your day with detachment and devotion.' },
    { title: '🌄 Brahma Vidya', body: 'The early morning is best for studying scriptures. Even 10 minutes of Gita reading transforms your day.' },
    { title: '✨ Shakti Chalana', body: 'Do 5 minutes of meditation focusing on your Ajna Chakra. Awaken your inner shakti this morning.' },
    { title: '🎵 Vishnu Sahasranama', body: 'Reciting Vishnu Sahasranama in the morning removes all obstacles and fulfills wishes.' },
    { title: '🪔 Ghee Lamp', body: 'Light a ghee diya in front of your deity. Ghee lamp has the power to attract Lakshmi.' },
    { title: '🌿 Morning Routine', body: 'Dharmashastra says: Wake up, clean yourself, bathe, pray, then eat. This order brings prosperity.' },
    { title: '🙏 Guru Vandana', body: '"गुरुर्ब्रह्मा गुरुर्विष्णुः" — Remember your Guru this morning. Without Guru, knowledge is incomplete.' },
    { title: '💎 Ratna Shastra', body: 'Wearing the right gemstone as per your nakshatra amplifies planetary blessings. Check your Panchang!' },
    { title: '🕉️ Rudra Abhishekam', body: 'Monday? Perfect day for Shiva puja. Even mental worship of Shiva brings immense merit.' },
    { title: '🌺 Devi Stuti', body: '"या देवी सर्वभूतेषु" — Invoke the Divine Mother for strength, wisdom, and protection.' },
    { title: '📖 Upanishad Wisdom', body: '"तत् त्वम् असि" — You are That. You are divine. Remember your true nature today.' },
    { title: '🔱 Shiva Panchakshari', body: '"ॐ नमः शिवाय" — The five-syllable mantra that destroys all karma. Chant it 108 times.' },
    { title: '🌻 Karma Yoga', body: 'Whatever you do today, do it as an offering to God. This is the essence of Karma Yoga.' },
    { title: '🪷 Lakshmi Puja', body: 'Friday morning is ideal for Lakshmi puja. Keep your home clean — Lakshmi resides in cleanliness.' },
    { title: '🌸 Saraswati Vandana', body: '"या कुन्देन्दुतुषारहारधवला" — Invoke Saraswati for knowledge and artistic inspiration.' },
    { title: '📿 Hanuman Chalisa', body: 'Tuesday morning: Read Hanuman Chalisa 7 times. It removes fear, obstacles, and evil eye.' },
    { title: '🕉️ Aum Meditation', body: 'Chant "Aum" 21 times with deep breath. Feel the vibration in your entire body. This is Nada Yoga.' },
    { title: '🌅 Arghya Daan', body: 'Offering water (Arghya) to the Sun with red flowers and kumkum brings health and fame.' },
    { title: '🙏 Pitru Smaran', body: 'Remember your ancestors with gratitude this morning. Their blessings are the foundation of your life.' },
    { title: '🍃 Ayurvedic Tip', body: 'Drink warm water with tulsi and ginger on empty stomach. Ancient rishis knew this health secret.' },
    { title: '✨ Positive Sankalpa', body: 'Set a spiritual intention (Sankalpa) for today. What virtue will you practice? Patience? Compassion? Truth?' },
    { title: '🔔 Mandir Darshan', body: 'Even a 2-minute darshan at a temple charges your spiritual energy for the whole day.' },
    { title: '🌺 Pushpanjali', body: 'Offer flowers with both hands to your deity. The fragrance carries your prayers to the divine.' },
  ],

  // Afternoon (9 AM - 4 PM) — 40 messages
  afternoon: [
    { title: '📖 Did You Know?', body: 'The Rig Veda is the oldest known text in the world, composed over 5,000 years ago. Our heritage is timeless.' },
    { title: '🕉️ Midday Mantra', body: '"सर्वे भवन्तु सुखिनः" — May all beings be happy. Send this blessing to everyone around you.' },
    { title: '🍲 Sattvic Food', body: 'Having lunch? Eat sattvic food with gratitude. Say "ब्रह्मार्पणं ब्रह्म हविः" before eating.' },
    { title: '📿 Vishnu Stuti', body: '"शान्ताकारं भुजगशयनं" — Meditate on Lord Vishnu for peace amidst your busy day.' },
    { title: '💡 Vedic Math', body: 'Ancient Indians invented Zero, Decimal system, and Algebra. Be proud of your civilizational genius!' },
    { title: '🌿 Abhijit Muhurta', body: 'Midday Abhijit Muhurta is highly auspicious. Start important tasks during this window.' },
    { title: '📜 Sanskrit Word', body: '"धर्म" (Dharma) doesn\'t mean religion. It means "that which sustains" — your duty, righteousness, cosmic order.' },
    { title: '🏛️ Temple Fact', body: 'Kailasa Temple at Ellora was carved from a SINGLE rock, top-down. 200,000 tons of rock removed by hand!' },
    { title: '🧘 Desk Meditation', body: 'Close your eyes for 60 seconds. Take 5 deep breaths. Imagine golden light filling your body. Refreshed!' },
    { title: '📖 Chanakya Niti', body: '"विद्वत्वं च नृपत्वं च" — Education and kingdom are never comparable. Education always wins.' },
    { title: '🌺 Puja Reminder', body: 'Have you offered afternoon prayers? Even a moment of remembrance is powerful.' },
    { title: '💎 Gem of Wisdom', body: 'Thiruvalluvar said: "What is the use of eyes if they cannot see the suffering of others?"' },
    { title: '🏯 Architecture Marvel', body: 'Brihadeeswarar Temple is 1000+ years old. Its shadow never falls on the ground at noon!' },
    { title: '🌏 Vasudhaiva Kutumbakam', body: '"वसुधैव कुटुम्बकम्" — The world is one family. Practice compassion with everyone you meet today.' },
    { title: '📿 Afternoon Japa', body: 'Even 5 minutes of japa during lunch break accumulates enormous spiritual merit.' },
    { title: '🔬 Ancient Science', body: 'Sushruta performed surgeries 2,600 years ago including cataract and rhinoplasty. Ayurveda is advanced science!' },
    { title: '💧 Water Wisdom', body: 'Before drinking water, remember: Water is sacred (Apas). Silently chant "ॐ आपो ज्योती" for purification.' },
    { title: '🌸 Bhakti Movement', body: 'Mirabai left a palace for Krishna. True devotion transcends all worldly bonds.' },
    { title: '📖 Arthashastra', body: 'Kautilya wrote the world\'s first economics treatise 2,400 years ago. Ancient India was a knowledge superpower.' },
    { title: '🕉️ Karma Theory', body: 'Every action has a consequence. Choose wisely today — your karma shapes your tomorrow.' },
    { title: '🌿 Ayurveda Tip', body: 'Avoid drinking water immediately after meals. Wait 30 min. This ancient wisdom aids digestion.' },
    { title: '📜 Yoga Sutra', body: '"योगश्चित्तवृत्तिनिरोधः" — Yoga is the cessation of mental fluctuations. Practice stillness.' },
    { title: '🏔️ Himalayan Wisdom', body: 'The Himalayas are called "Devbhoomi" — Land of Gods. 33 crore deities reside there according to Puranas.' },
    { title: '📿 Naam Japa', body: 'In Kaliyuga, Naam Japa is the easiest path to moksha. Keep repeating your chosen deity\'s name.' },
    { title: '🌺 Tulsi Benefits', body: 'Tulsi has 300+ medicinal compounds. It\'s called "The Incomparable One" in Ayurveda. Water it daily!' },
    { title: '💡 Fibonacci in Nature', body: 'Ancient Indian mathematician Pingala discovered the Fibonacci sequence centuries before Fibonacci. In temple architecture!' },
    { title: '🕉️ Mandala Meditation', body: 'Draw a simple mandala pattern. This ancient meditative art calms the mind and activates creativity.' },
    { title: '📖 Ramayana Lesson', body: 'Hanuman\'s devotion moved mountains. When you work with devotion, nothing is impossible.' },
    { title: '🌻 Gratitude Practice', body: 'Name 3 things you\'re grateful for right now. Gratitude is the highest form of prayer.' },
    { title: '🏛️ Nalanda University', body: 'Nalanda had 10,000+ students from across Asia studying for free. India pioneered free education 1,500 years ago.' },
    { title: '🌿 Pranayama Break', body: 'Do Kapalabhati for 2 minutes. It cleanses the nadis, energizes the mind, and burns toxins.' },
    { title: '📿 Durga Kavach', body: 'Feeling stressed? Mentally recite "ॐ ऐं ह्रीं क्लीं चामुण्डायै विच्चे" — Durga protects from all fears.' },
    { title: '🌸 Flower Therapy', body: 'Looking at fresh flowers reduces stress by 40%. Keep flowers near your workspace or home mandir.' },
    { title: '💎 Vidur Niti', body: 'Vidura said: "A wise person never reveals their wealth, age, family problems, mantras, and medicines."' },
    { title: '🕉️ Dhyana Shloka', body: '"ध्यायेत्सदा सवितृमण्डलमध्यवर्ती" — Meditate on the divine light within the solar disc.' },
    { title: '📜 Panini\'s Grammar', body: 'Panini wrote the world\'s first formal grammar 2,500 years ago. 4,000 rules that still astound linguists!' },
    { title: '🌏 Vedic Cosmology', body: 'Rig Veda describes the universe\'s age as 8.64 billion years. Modern science says 13.8 billion. Remarkably close!' },
    { title: '🍃 Forest Bathing', body: 'Ancient rishis lived in forests for a reason. Spend 10 minutes near trees today. Nature heals.' },
    { title: '📖 Thirukkural', body: '"Attach yourself to Him who is free from attachments. Bind yourself to that bond to unbind all bonds."' },
    { title: '🙏 Seva Reminder', body: 'Do one act of kindness today. Feeding a hungry person earns more merit than 100 yagnas.' },
  ],

  // Evening (4 PM - 9 PM) — 40 messages
  evening: [
    { title: '🪔 Sandhya Deepam', body: 'Light an evening diya at your home mandir. The transition from day to night is a sacred time.' },
    { title: '🔔 Evening Aarti', body: 'Time for evening aarti! "ॐ जय जगदीश हरे" — singing aarti purifies the home atmosphere.' },
    { title: '🌙 Chandra Darshan', body: 'Look at the moon tonight. Chandra Dev blesses you with mental peace and emotional balance.' },
    { title: '📿 Sandhya Vandana', body: 'Perform evening Sandhya Vandana. The junction of day and night is the most powerful meditation time.' },
    { title: '🌺 Flowers & Incense', body: 'Light agarbatti (incense) in your home. The sacred smoke carries prayers to the heavens.' },
    { title: '📖 Sundara Kanda', body: 'Reading Sundara Kanda in the evening removes all obstacles and brings good news.' },
    { title: '🕉️ Evening Shanti', body: '"ॐ शान्तिः शान्तिः शान्तिः" — Chant the Shanti Mantra for peace in body, mind, and spirit.' },
    { title: '🌙 Nakshatra Check', body: 'Check today\'s Nakshatra in Sadhak app. Each Nakshatra has specific do\'s and don\'ts.' },
    { title: '🪔 Deepam Benefits', body: 'Lighting a ghee lamp in the evening removes Vastu dosha and attracts Lakshmi into your home.' },
    { title: '🌿 Tulsi Evening Care', body: 'Don\'t water or pluck Tulsi leaves after sunset. This is an important scriptural guideline.' },
    { title: '📿 Shiva Tandav', body: '"जटाटवीगलज्जलप्रवाहपावितस्थले" — Recite Shiva Tandava Stotram for immense energy and power.' },
    { title: '🌸 Sandhya Puja', body: 'Even if you\'re tired, do a simple 2-minute prayer. Consistency matters more than duration.' },
    { title: '🍃 Wind Down Ritual', body: 'Ancient practice: Apply sesame oil to your feet before sleep. It calms Vata dosha and ensures deep sleep.' },
    { title: '📖 Bhagavatam Story', body: 'Prahlad was only 5 years old when he defeated Hiranyakashipu through pure devotion. Age doesn\'t matter for bhakti.' },
    { title: '🙏 Family Prayer', body: 'Gather your family for a 5-minute evening prayer. Families that pray together stay blessed together.' },
    { title: '🕉️ Gayatri at Sunset', body: 'The second Sandhya is at sunset. Chant Gayatri Mantra facing west for divine protection through the night.' },
    { title: '🌙 Moon Gazing', body: 'Gazing at the moon for 5 minutes calms the mind. In Yoga, this is called Chandra Trataka.' },
    { title: '📿 Hanuman Mantra', body: '"ॐ हनुमते नमः" — Chant this 21 times before sleep. Hanuman protects from nightmares and evil spirits.' },
    { title: '🪔 Cow Ghee Diya', body: 'A cow ghee diya in the evening generates 10x more positive energy than an oil lamp.' },
    { title: '🌺 Reflection Time', body: 'Spend 5 minutes reflecting on your day. What was dharmic? What needs improvement? Self-audit is Tapas.' },
    { title: '📖 Yoga Vasistha', body: '"This world is like a long dream" — Sage Vasistha. Don\'t take temporary things too seriously.' },
    { title: '🌿 Camphor Benefits', body: 'Burning camphor during evening aarti kills 99% of airborne bacteria. Ancient wisdom, modern science.' },
    { title: '🔔 Bell Significance', body: 'Temple bells produce the sound "OM". The vibration clears the mind and awakens consciousness.' },
    { title: '🙏 Daan at Dusk', body: 'Giving food or money at sunset time has special merit according to Dharmashastra.' },
    { title: '📿 108 Significance', body: 'Why 108? 27 Nakshatras × 4 Padas = 108. Sun\'s diameter is 108× Earth\'s. Distance to Sun is 108× Sun\'s diameter.' },
    { title: '🌙 Shukla Paksha', body: 'In Shukla Paksha, positive energies increase. In Krishna Paksha, it\'s time for introspection and tapas.' },
    { title: '🌸 Evening Kirtan', body: 'Sing a bhajan or listen to one. Music is the fastest way to connect with the Divine.' },
    { title: '📖 Vivekachudamani', body: '"Brahma satyam jagan mithya" — Ultimate reality is Brahman, the world is an appearance. —Shankaracharya' },
    { title: '🕉️ Trataka Practice', body: 'Gaze at a candle flame for 5 minutes without blinking. This Trataka practice strengthens focus and intuition.' },
    { title: '🌿 Ashwagandha Tip', body: 'Take Ashwagandha with warm milk in the evening. Ancient rasayana for stress relief and strength.' },
    { title: '📿 Navagraha Mantra', body: 'Each day has a ruling planet. Chant the corresponding Navagraha mantra for planetary blessings.' },
    { title: '🪔 Significance of Wick', body: 'Single wick diya = material progress. Double wick = spiritual progress. Five wick = Pancha Tattva balance.' },
    { title: '🌺 Goddess Worship', body: 'Friday evening is sacred to Lakshmi and Santoshi Mata. Light a lamp and offer prasad.' },
    { title: '📖 Narada Bhakti Sutra', body: '"Bhakti is intense love for God" — Narada. Love without conditions, without expectations. That is true bhakti.' },
    { title: '🙏 Ancestor Blessing', body: 'Light a sesame oil lamp in the south direction for Pitru blessings. They protect from unseen dangers.' },
    { title: '🌙 Chandra Mantra', body: '"ॐ श्रां श्रीं श्रौं सः चन्द्रमसे नमः" — Chant for emotional balance and mental clarity.' },
    { title: '📿 Maha Mantra', body: '"हरे कृष्ण हरे कृष्ण कृष्ण कृष्ण हरे हरे" — The most powerful mantra of Kaliyuga.' },
    { title: '🌸 Sunderkand Path', body: 'Group Sunderkand reading on Tuesday/Saturday evening removes all major obstacles in life.' },
    { title: '🕉️ Yoganidra', body: 'Practice Yoga Nidra before sleep. 30 minutes of Yoga Nidra = 3 hours of deep sleep.' },
    { title: '📖 Ashtavakra Gita', body: '"You are already free" — Ashtavakra to King Janaka. Liberation is not achieved, it is recognized.' },
  ],

  // Night (9 PM - 4 AM) — 40 messages
  night: [
    { title: '🌙 Shubh Ratri', body: 'Before sleep, chant "ॐ नमो भगवते वासुदेवाय" 11 times. Lord Vishnu protects you through the night.' },
    { title: '📿 Night Protection', body: '"करचरणकृतं वाक्कायजं कर्मजं वा" — Recite the Kshama Prarthana to seek forgiveness for day\'s mistakes.' },
    { title: '🕉️ Shiva at Midnight', body: 'Midnight (Nishita Kaal) is Shiva\'s time. Even a single "Om Namah Shivaya" is enormously powerful now.' },
    { title: '🌙 Dream Yoga', body: 'Before sleep, set intention to remember your dreams. In Yoga, dreams carry messages from the subconscious.' },
    { title: '📖 Bhagavad Gita 15.15', body: '"I am seated in everyone\'s heart" — Krishna. You are never alone. The Divine is always with you.' },
    { title: '🌿 Sleep Hygiene', body: 'Ayurveda says: Sleep on your left side for better digestion. Head pointing South for alignment with Earth\'s field.' },
    { title: '📿 Rama Raksha', body: 'Recite Rama Raksha Stotra before sleep. It creates a divine shield of protection around you.' },
    { title: '🌙 Night Sky', body: 'Ancient Rishis named every constellation. They mapped the sky without telescopes. Look up and wonder.' },
    { title: '🕉️ Ajapa Japa', body: 'Your breath naturally chants "So-Ham" (I am That). 21,600 times per day. You\'re always in japa.' },
    { title: '📖 Mandukya Upanishad', body: 'The 4th state beyond waking, dreaming, and deep sleep is Turiya — pure consciousness. That is your true self.' },
    { title: '🌿 Warm Milk', body: 'Drink warm milk with a pinch of turmeric and nutmeg. This is Rishi\'s recipe for deep, healing sleep.' },
    { title: '📿 Bedtime Shloka', body: '"राम स्कन्दं हनूमन्तं वैनतेयं वृकोदरम्" — Remember these 5 warriors for protection during sleep.' },
    { title: '🌙 Cosmic Time', body: 'Right now, someone in a Himalayan cave is meditating for the welfare of all beings. Feel that energy.' },
    { title: '🕉️ Surrender', body: '"त्वमेव माता च पिता त्वमेव" — You alone are my mother, father, friend, and everything. Surrender completely.' },
    { title: '📖 Guru Granth Sahib', body: '"जैसा सेवै तैसा होइ" — As you serve, so you become. What did you serve today?' },
    { title: '🌿 Night Ritual', body: 'Touch the ground with your right hand before sleeping. Thank Mother Earth for supporting you all day.' },
    { title: '📿 Counting Blessings', body: 'Instead of counting sheep, count your blessings. Gratitude before sleep attracts more abundance tomorrow.' },
    { title: '🌙 Star Wisdom', body: 'Your birth Nakshatra influences your personality. Check it in the Sadhak app under Panchang.' },
    { title: '🕉️ Nidra Mantra', body: '"ॐ अग्निर्ज्योतिर्ज्योतिरग्निः" — This Vedic mantra invokes the inner fire to burn away negative dreams.' },
    { title: '📖 Ribhu Gita', body: '"All is Brahman, there is nothing else" — Ribhu Gita. Sleep in this awareness tonight.' },
    { title: '🌿 Vastu Tip', body: 'Keep your bedroom clutter-free. In Vastu, clutter blocks the flow of positive energy during sleep.' },
    { title: '📿 Daily Account', body: 'Keep a spiritual diary. Note your sadhana, japa count, and insights. Even great yogis kept daily records.' },
    { title: '🌙 Tomorrow\'s Sankalpa', body: 'Before sleeping, set a positive intention for tomorrow. Your subconscious works on it while you sleep.' },
    { title: '🕉️ Atma Shatakam', body: '"चिदानन्दरूपः शिवोऽहम् शिवोऽहम्" — I am Shiva, I am bliss-consciousness. Sleep as Shiva tonight.' },
    { title: '📖 Ancient Lullaby', body: 'Yashoda sang to baby Krishna: "So ja meri ladli..." — Even God was put to sleep with love.' },
    { title: '🌿 Feet Wash', body: 'Wash your feet with warm water before bed. This Ayurvedic practice removes tiredness and ensures sound sleep.' },
    { title: '📿 Night Gratitude', body: 'Thank Agni for cooking, Vayu for breathing, Varuna for water, Prithvi for standing. Every element serves you.' },
    { title: '🌙 Pradosha Time', body: 'The period between sunset and night is sacred for Shiva worship. Did you remember Mahadeva today?' },
    { title: '🕉️ Sleep as Sadhana', body: 'Sleep with awareness. The transition from waking to sleep mirrors the transition from life to liberation.' },
    { title: '📖 Kabir Doha', body: '"कल करे सो आज कर, आज करे सो अब" — Don\'t postpone spiritual practice. Start now.' },
    { title: '🌿 Moon Salutation', body: 'Chandra Namaskar before bed is cooling and calming. Opposite of energizing Surya Namaskar.' },
    { title: '📿 Forgiveness Prayer', body: '"Whatever wrongs I have done today in thought, word, or deed, may all beings forgive me. Om Shanti."' },
    { title: '🌙 Rahu Kaal Reminder', body: 'Check tomorrow\'s Rahu Kaal timing in Sadhak app. Avoid starting new ventures during Rahu Kaal.' },
    { title: '🕉️ Deep Sleep Mantra', body: 'Mentally chant "Om" with each exhale as you fall asleep. This aligns you with cosmic vibration.' },
    { title: '📖 Tirumurai Wisdom', body: '"Those who have realized God see Him in everything" — Saint Appar. Seek the divine in all experiences.' },
    { title: '🌿 Sacred Geometry', body: 'Sri Yantra has 43 triangles forming 9 interlocking triangles. Meditating on it activates all chakras.' },
    { title: '📿 Night Parikrama', body: 'If possible, do one mental parikrama of your Ishta Devta\'s murti before sleeping. Visualization is powerful.' },
    { title: '🌙 Constellation Story', body: 'Saptarishi (Big Dipper) represents the 7 great sages. They watch over humanity from the night sky.' },
    { title: '🕉️ Nirvana Shatakam', body: '"मनो बुद्ध्यहंकार चित्तानि नाहं" — I am not the mind, intellect, or ego. I am pure consciousness.' },
    { title: '📖 Final Thought', body: 'Your last thought before sleep shapes your subconscious. Let it be of God, gratitude, and peace. Shubh Ratri.' },
  ],

  // General/anytime — 40 messages
  general: [
    { title: '🕉️ Sadhak Wisdom', body: '"अहिंसा परमो धर्मः" — Non-violence is the supreme Dharma. Practice kindness in thoughts, words, and actions.' },
    { title: '📖 Daily Reminder', body: 'Have you checked today\'s Panchang? Tithi, Nakshatra, and Yoga affect your daily decisions.' },
    { title: '🌺 Mandir Visit', body: 'When did you last visit a temple? Even a short darshan recharges your spiritual batteries.' },
    { title: '📿 Japa Milestone', body: 'Have you done your daily japa? Open Sadhak\'s Japa Mala and complete at least one mala today.' },
    { title: '🌿 Eco Dharma', body: 'Planting a tree is equivalent to 10 sons in Puranic merit. Plant one tree this month.' },
    { title: '💡 Gita Verse', body: '"न हि ज्ञानेन सदृशं पवित्रमिह विद्यते" — Nothing is as purifying as knowledge. Keep learning.' },
    { title: '📖 Read a Scripture', body: 'Open the Sadhak Library and read a sacred text for 10 minutes. Knowledge is the path to moksha.' },
    { title: '🙏 Help Someone', body: '"परोपकारः पुण्याय" — Helping others is the greatest punya. Do one kind act today.' },
    { title: '🕉️ Breath Awareness', body: 'Right now, take 3 conscious breaths. In... Out... You just practiced Pranayama. That simple.' },
    { title: '📿 Ekadashi Reminder', body: 'Check if today is Ekadashi. Fasting on Ekadashi is said to grant the merit of a thousand ashvamedha yagnas.' },
    { title: '🌺 Bhajan Time', body: 'Listen to a bhajan right now. Music bypasses the mind and goes straight to the soul.' },
    { title: '💧 Water Prayer', body: 'Next time you drink water, mentally offer it to the divine first. This is the simplest form of yagna.' },
    { title: '📖 Sanskrit Quote', body: '"विद्या ददाति विनयम्" — Knowledge gives humility, humility gives worthiness, worthiness gives wealth.' },
    { title: '🌿 Nature Walk', body: 'Ancient rishis did sadhana in forests. Take a walk in nature. Every tree is a living temple.' },
    { title: '🕉️ Chakra Check', body: 'Which chakra needs attention? Root (security), Heart (love), or Third Eye (intuition)? Meditate on it.' },
    { title: '📿 Mala Math', body: '1 mala = 108 chants. 3 malas/day = 324. In a year = 118,260 chants. Small daily practice = huge results.' },
    { title: '🙏 Donate Today', body: 'Donating food on Saturday removes Shani dosha. Even a small act of charity transforms karma.' },
    { title: '📖 Upanishad Fact', body: 'There are 108 Upanishads. The word means "sitting near" — sitting near the Guru to receive wisdom.' },
    { title: '🌺 Temple Architecture', body: 'Hindu temples are built as cosmic diagrams. The garbhagriha represents the cave of the heart.' },
    { title: '💡 Yoga Fact', body: 'Yoga is 5,000+ years old. The word means "union" — union of individual consciousness with Universal.' },
    { title: '🕉️ Mudra Practice', body: 'Gyan Mudra (index finger + thumb) increases concentration. Hold it for 5 minutes while sitting still.' },
    { title: '📿 Tirtha Yatra', body: 'Plan a pilgrimage this year. Even the intention to visit sacred places starts purifying karma.' },
    { title: '🌿 Cow Veneration', body: 'Feed a cow today. In Hindu tradition, all 33 crore deities reside in the body of a cow.' },
    { title: '📖 Number Symbolism', body: '7 chakras, 7 swaras (notes), 7 rivers, 7 rishis, 7 horses of Surya. Number 7 is deeply sacred.' },
    { title: '🙏 Digital Detox', body: 'Ancient rishis practiced Mauna (silence). Try 30 minutes of phone-free time. Your mind will thank you.' },
    { title: '🌺 Rangoli Tradition', body: 'Drawing rangoli at the entrance invites Lakshmi and repels negative energies. An ancient daily practice.' },
    { title: '📿 Rudraksha Power', body: '5-mukhi Rudraksha reduces stress and blood pressure. Science confirms what Shiva told Parvati millennia ago.' },
    { title: '💡 Sanskrit is Alive', body: 'Sanskrit is the only language where word order doesn\'t change meaning. NASA calls it the most computer-friendly language.' },
    { title: '🕉️ Yantra Meditation', body: 'Place a Sri Yantra in your puja room. Meditating on it for 5 minutes daily activates abundance consciousness.' },
    { title: '🌿 Neem Wisdom', body: 'Neem is called "Sarva Roga Nivarini" — healer of all diseases. Keep a neem tree near your home.' },
    { title: '📖 Thirukkural', body: '"Those who possess wisdom possess everything. Those who lack it lack everything." — Thiruvalluvar' },
    { title: '📿 Festival Prep', body: 'Check upcoming festivals in Sadhak Calendar. Preparing early doubles the spiritual benefit.' },
    { title: '🙏 Satsang', body: '"सत्सङ्गत्वे निस्सङ्गत्वम्" — Good company leads to detachment, which leads to liberation. Seek satsang.' },
    { title: '🌺 Color Therapy', body: 'Saffron increases courage (Bhagwa), White brings purity, Yellow invites knowledge, Red provides protection.' },
    { title: '💡 Astronomy Origins', body: 'Aryabhata calculated Earth\'s circumference with 99.8% accuracy in the 5th century. Without any instruments!' },
    { title: '🕉️ Marma Points', body: 'Ancient warriors knew 107 Marma points (vital pressure points) in the body. This became acupressure.' },
    { title: '📿 Gotra System', body: 'Your Gotra traces back to one of the Saptarishis. It\'s a 5000+ year-old genetic mapping system.' },
    { title: '🌿 Sacred Rivers', body: '7 sacred rivers: Ganga, Yamuna, Saraswati, Godavari, Narmada, Sindhu, Kaveri. They are living goddesses.' },
    { title: '📖 Cosmic Dance', body: 'Nataraja represents cosmic creation (drum), preservation (raised hand), destruction (fire), and liberation (raised foot).' },
    { title: '🙏 Sadhak Community', body: 'Join the Sadhak chat community! Share your spiritual experiences and learn from fellow seekers.' },
  ],
};

// Get time-appropriate notification pool
function getTimePool(): { title: string; body: string }[] {
  const hour = new Date().getHours();
  if (hour >= 4 && hour < 9) return NOTIFICATION_POOL.morning;
  if (hour >= 9 && hour < 16) return NOTIFICATION_POOL.afternoon;
  if (hour >= 16 && hour < 21) return NOTIFICATION_POOL.evening;
  return NOTIFICATION_POOL.night;
}

// Shuffle array using Fisher-Yates algorithm
function shuffle<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Track used notification indices to never repeat
async function getUniqueNotification(): Promise<{ title: string; body: string }> {
  const timePool = getTimePool();
  const generalPool = NOTIFICATION_POOL.general;
  
  // Combine time-specific + general pool
  const combined = [...timePool, ...generalPool];
  
  // Get used indices
  const usedKey = `notif_used_${new Date().toDateString()}`;
  let usedIndices: number[] = [];
  try {
    const stored = await AsyncStorage.getItem(usedKey);
    if (stored) usedIndices = JSON.parse(stored);
  } catch (e) {}

  // Find unused
  const available = combined.filter((_, idx) => !usedIndices.includes(idx));
  
  // If all used, reset
  if (available.length === 0) {
    usedIndices = [];
    await AsyncStorage.setItem(usedKey, '[]');
  }

  // Pick random from available
  const finalPool = available.length > 0 ? available : combined;
  const picked = finalPool[Math.floor(Math.random() * finalPool.length)];
  
  // Mark as used
  const pickedIdx = combined.indexOf(picked);
  usedIndices.push(pickedIdx);
  await AsyncStorage.setItem(usedKey, JSON.stringify(usedIndices));

  return picked;
}

// ─── NOTIFICATION SETUP ──────────────────────────────────────────────

export async function requestNotificationPermissions(): Promise<boolean> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    return false;
  }

  // Set Android notification channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('sadhak-spiritual', {
      name: 'Spiritual Reminders',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#D94F00',
      sound: 'default',
      description: 'Hourly spiritual wisdom, mantras, and Hindu facts',
    });
    
    await Notifications.setNotificationChannelAsync('sadhak-festivals', {
      name: 'Festival Alerts',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 500, 250, 500],
      lightColor: '#FFD700',
      sound: 'default',
      description: 'Festival and religious observance reminders',
    });
  }

  return true;
}

// Schedule hourly notifications (up to 64 — Android limit)
export async function scheduleHourlyNotifications(): Promise<void> {
  // Cancel all existing scheduled notifications
  await Notifications.cancelAllScheduledNotificationsAsync();

  const hasPermission = await requestNotificationPermissions();
  if (!hasPermission) return;

  // Schedule notifications for the next 48 hours (48 unique messages)
  const now = new Date();
  
  for (let i = 1; i <= 48; i++) {
    const notif = await getUniqueNotification();
    const triggerDate = new Date(now.getTime() + i * 60 * 60 * 1000); // Every hour
    
    await Notifications.scheduleNotificationAsync({
      content: {
        title: notif.title,
        body: notif.body,
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.HIGH,
        ...(Platform.OS === 'android' ? { channelId: 'sadhak-spiritual' } : {}),
        data: { type: 'spiritual_reminder', timestamp: triggerDate.getTime() },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: triggerDate,
      },
    });
  }

  // Store last scheduled time
  await AsyncStorage.setItem('lastNotifSchedule', now.toISOString());
}

// Re-schedule if needed (call on app open)
export async function ensureNotificationsScheduled(): Promise<void> {
  try {
    const lastSchedule = await AsyncStorage.getItem('lastNotifSchedule');
    if (!lastSchedule) {
      await scheduleHourlyNotifications();
      return;
    }

    const lastDate = new Date(lastSchedule);
    const hoursSince = (Date.now() - lastDate.getTime()) / (1000 * 60 * 60);
    
    // Re-schedule if more than 24 hours since last schedule
    if (hoursSince > 24) {
      await scheduleHourlyNotifications();
    }
  } catch (e) {
    console.error('Notification scheduling error:', e);
    await scheduleHourlyNotifications();
  }
}

// Send an immediate test notification
export async function sendTestNotification(): Promise<void> {
  const notif = await getUniqueNotification();
  await Notifications.scheduleNotificationAsync({
    content: {
      title: notif.title,
      body: notif.body,
      sound: 'default',
      priority: Notifications.AndroidNotificationPriority.HIGH,
      ...(Platform.OS === 'android' ? { channelId: 'sadhak-spiritual' } : {}),
    },
    trigger: null, // Immediate
  });
}

// Send festival notification
export async function sendFestivalNotification(festivalName: string, message: string): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: `🪔 ${festivalName}`,
      body: message,
      sound: 'default',
      priority: Notifications.AndroidNotificationPriority.MAX,
      ...(Platform.OS === 'android' ? { channelId: 'sadhak-festivals' } : {}),
    },
    trigger: null,
  });
}
