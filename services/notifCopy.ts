// Notification copy: warm, short, a little playful but always respectful.
// Three moments a day (morning, midday, evening) plus timely alerts for
// festivals, Ekadashi, grahan and grooming. English, Hindi and Bengali.

export type NLang = 'en' | 'hi' | 'bn';
export type Note = { title: string; body: string };
type Tri = Record<NLang, Note>;

const n = (en: [string, string], hi: [string, string], bn: [string, string]): Tri => ({
  en: { title: en[0], body: en[1] }, hi: { title: hi[0], body: hi[1] }, bn: { title: bn[0], body: bn[1] },
});

export const MOMENTS: Record<'morning' | 'midday' | 'evening', Tri[]> = {
  morning: [
    n(['Suprabhat 🌅', 'A fresh day, a fresh mind. One mala before the phone pulls you in?'],
      ['सुप्रभात 🌅', 'नया दिन, नया मन। फ़ोन में खो जाने से पहले एक माला हो जाए?'],
      ['সুপ্রভাত 🌅', 'নতুন দিন, নতুন মন। ফোনে ডুবে যাওয়ার আগে এক মালা হয়ে যাক?']),
    n(['The sun is up. Are you? ☀️', 'A little water for Surya Dev, a little gratitude for yourself.'],
      ['सूरज उठ गए, आप? ☀️', 'सूर्य देव को थोड़ा जल, और अपने लिए थोड़ा आभार।'],
      ['সূর্য উঠে গেছেন, আপনি? ☀️', 'সূর্যদেবকে একটু জল, আর নিজের জন্য একটু কৃতজ্ঞতা।']),
    n(['Your diya is waiting 🪔', 'Two minutes, one lamp, one prayer. The day goes better after.'],
      ['आपका दीया इंतज़ार में है 🪔', 'दो मिनट, एक दीया, एक प्रार्थना। फिर दिन अपने आप सँवरता है।'],
      ['আপনার প্রদীপ অপেক্ষায় 🪔', 'দুই মিনিট, একটি প্রদীপ, একটি প্রার্থনা। তারপর দিনটা ভালো যায়।']),
    n(['Today’s panchang is ready 📜', 'Tithi, nakshatra and Rahu Kaal for your city, in one look.'],
      ['आज का पंचांग तैयार है 📜', 'आपके शहर की तिथि, नक्षत्र और राहु काल, एक नज़र में।'],
      ['আজকের পঞ্জিকা তৈরি 📜', 'আপনার শহরের তিথি, নক্ষত্র আর রাহুকাল, এক নজরে।']),
    n(['A shloka with your chai ☕', 'Do your part well and let go of the rest. (Gita 2.47)'],
      ['चाय के साथ एक श्लोक ☕', 'कर्मण्येवाधिकारस्ते मा फलेषु कदाचन। अपना कर्म अच्छे से कीजिए, बाकी छोड़ दीजिए।'],
      ['চায়ের সাথে একটি শ্লোক ☕', 'নিজের কাজটা ভালো করে করুন, বাকিটা ছেড়ে দিন। (গীতা ২.৪৭)']),
    n(['Gayatri, eleven times 🕉️', 'Short enough for a busy morning, deep enough to carry you all day.'],
      ['ग्यारह बार गायत्री 🕉️', 'व्यस्त सुबह के लिए छोटा, पूरे दिन के लिए गहरा।'],
      ['এগারো বার গায়ত্রী 🕉️', 'ব্যস্ত সকালের জন্য ছোট, সারাদিনের জন্য গভীর।']),
    n(['Tulsi says namaste 🌿', 'A little water and one parikrama. The old way to start a day.'],
      ['तुलसी माँ का नमस्ते 🌿', 'थोड़ा जल और एक परिक्रमा। दिन शुरू करने का पुराना, प्यारा तरीका।'],
      ['তুলসী মায়ের নমস্কার 🌿', 'একটু জল আর একবার প্রদক্ষিণ। দিন শুরুর পুরনো, মিষ্টি উপায়।']),
    n(['Before the inbox, a sankalpa ✨', 'Pick one quality for today: patience, kindness or truth. We’ll ask tonight.'],
      ['इनबॉक्स से पहले एक संकल्प ✨', 'आज के लिए एक गुण चुनिए: धैर्य, दया या सत्य। शाम को पूछेंगे।'],
      ['ইনবক্সের আগে একটি সংকল্প ✨', 'আজকের জন্য একটি গুণ বেছে নিন: ধৈর্য, দয়া বা সত্য। সন্ধ্যায় জিজ্ঞেস করব।']),
    n(['Courage for the day 🙏', 'A Hanuman Chalisa on the way to work makes the traffic feel lighter.'],
      ['आज के लिए हिम्मत 🙏', 'रास्ते में एक हनुमान चालीसा, और ट्रैफ़िक भी हल्का लगेगा।'],
      ['আজকের সাহস 🙏', 'পথে একবার হনুমান চালিসা, যানজটও হালকা লাগবে।']),
    n(['One minute of stillness 🧘', 'Sit, breathe, and let the mind settle before the day begins to talk.'],
      ['एक मिनट की शांति 🧘', 'बैठिए, साँस लीजिए, दिन के शोर से पहले मन को ठहरने दीजिए।'],
      ['এক মিনিটের স্থিরতা 🧘', 'বসুন, শ্বাস নিন, দিনের কোলাহলের আগে মনকে থিতু হতে দিন।']),
  ],
  midday: [
    n(['Abhijit muhurta is near ⏳', 'The best window of the day for a fresh start. See today’s exact time.'],
      ['अभिजित मुहूर्त पास है ⏳', 'नई शुरुआत के लिए दिन का सबसे शुभ समय। आज का सही समय देखिए।'],
      ['অভিজিৎ মুহূর্ত কাছে ⏳', 'নতুন শুরুর জন্য দিনের সেরা সময়। আজকের সঠিক সময় দেখুন।']),
    n(['A pause, not a scroll 🧘', 'Close your eyes. Five slow breaths. Back to work, lighter.'],
      ['स्क्रॉल नहीं, एक ठहराव 🧘', 'आँखें बंद, पाँच धीमी साँसें। फिर काम पर, हल्के मन से।'],
      ['স্ক্রল নয়, একটু থামা 🧘', 'চোখ বন্ধ, পাঁচটি ধীর শ্বাস। তারপর কাজে, হালকা মনে।']),
    n(['Lunch is prasad today 🍛', 'A small thank-you before the first bite. Food tastes better that way.'],
      ['आज का खाना प्रसाद है 🍛', 'पहले कौर से पहले छोटा सा धन्यवाद। स्वाद अपने आप बढ़ जाता है।'],
      ['আজকের খাবার প্রসাদ 🍛', 'প্রথম গ্রাসের আগে ছোট্ট একটা ধন্যবাদ। স্বাদ নিজেই বেড়ে যায়।']),
    n(['Japa break? 📿', '27 beads takes under two minutes. Your streak will thank you.'],
      ['जप ब्रेक? 📿', '27 मनके, दो मिनट से भी कम। आपकी स्ट्रीक धन्यवाद कहेगी।'],
      ['জপ বিরতি? 📿', '২৭টি দানা, দুই মিনিটেরও কম। আপনার স্ট্রিক ধন্যবাদ জানাবে।']),
    n(['One verse, one minute 📖', 'Open the Gita to any page and read one verse. That’s all.'],
      ['एक श्लोक, एक मिनट 📖', 'गीता का कोई भी पन्ना खोलिए, एक श्लोक पढ़िए। बस इतना ही।'],
      ['একটি শ্লোক, এক মিনিট 📖', 'গীতার যেকোনো পাতা খুলে একটি শ্লোক পড়ুন। ব্যস।']),
    n(['Rahu Kaal check 🕰️', 'Planning something important this afternoon? See if Rahu Kaal is in the way.'],
      ['राहु काल देख लें 🕰️', 'दोपहर में कुछ ज़रूरी करना है? पहले देख लीजिए राहु काल तो नहीं।'],
      ['রাহুকাল দেখে নিন 🕰️', 'দুপুরে জরুরি কিছু করবেন? আগে দেখে নিন রাহুকাল পড়ছে কি না।']),
    n(['Sarve bhavantu sukhinah 🌏', 'Send a quiet good wish to the next five people you meet.'],
      ['सर्वे भवन्तु सुखिनः 🌏', 'अगले पाँच लोगों को जिनसे मिलें, मन ही मन शुभकामना भेजिए।'],
      ['সর্বে ভবন্তু সুখিনঃ 🌏', 'পরের পাঁচজন যাঁদের সাথে দেখা হবে, মনে মনে শুভকামনা পাঠান।']),
    n(['Water, the sacred kind 💧', 'Drink a full glass, slowly. The rishis called water the giver of life.'],
      ['जल, पवित्र वाला 💧', 'एक गिलास पानी, धीरे-धीरे। ऋषियों ने जल को जीवनदाता कहा है।'],
      ['জল, পবিত্র জল 💧', 'এক গ্লাস জল, ধীরে ধীরে। ঋষিরা জলকে জীবনদাতা বলেছেন।']),
  ],
  evening: [
    n(['Sandhya time 🪔', 'Light the evening lamp. A home feels different with a diya on.'],
      ['संध्या का समय 🪔', 'शाम का दीया जलाइए। दीये से घर का माहौल ही बदल जाता है।'],
      ['সন্ধ্যার সময় 🪔', 'সন্ধ্যাপ্রদীপ জ্বালান। প্রদীপ জ্বললে ঘরটাই অন্যরকম লাগে।']),
    n(['Aarti in your pocket 🎶', 'Do a virtual aarti tonight, thali, bell and all.'],
      ['जेब में आरती 🎶', 'आज रात वर्चुअल आरती कीजिए, थाली और घंटी के साथ।'],
      ['পকেটে আরতি 🎶', 'আজ রাতে ভার্চুয়াল আরতি করুন, থালা আর ঘণ্টা সমেত।']),
    n(['How was the sankalpa? ✨', 'Patience, kindness, truth: which one showed up today?'],
      ['संकल्प कैसा रहा? ✨', 'धैर्य, दया, सत्य: आज कौन सा साथ रहा?'],
      ['সংকল্প কেমন গেল? ✨', 'ধৈর্য, দয়া, সত্য: আজ কোনটা সঙ্গে ছিল?']),
    n(['The day is folding up 🌇', 'A few names of Hari before dinner, and it ends well.'],
      ['दिन सिमट रहा है 🌇', 'खाने से पहले हरि के कुछ नाम, और दिन सुंदर ढंग से पूरा।'],
      ['দিন গুটিয়ে আসছে 🌇', 'রাতের খাবারের আগে হরির কয়েকটি নাম, আর দিনটা সুন্দরভাবে শেষ।']),
    n(['Your mala missed you 📿', 'Even one round tonight keeps the streak alive.'],
      ['माला आपको याद कर रही है 📿', 'आज रात एक माला भी हो जाए तो स्ट्रीक बनी रहेगी।'],
      ['মালা আপনাকে মনে করছে 📿', 'আজ রাতে এক মালা হলেও স্ট্রিক বেঁচে থাকবে।']),
    n(['Story time 📚', 'A short chapter from the Library before bed beats one more reel.'],
      ['कहानी का समय 📚', 'सोने से पहले लाइब्रेरी से एक छोटा अध्याय, एक और रील से बेहतर।'],
      ['গল্পের সময় 📚', 'ঘুমের আগে লাইব্রেরি থেকে ছোট্ট একটি অধ্যায়, আরেকটা রিলের চেয়ে ভালো।']),
    n(['A peek at tomorrow 🌙', 'Fasts, festivals and good timings for tomorrow, in the calendar.'],
      ['कल की एक झलक 🌙', 'कल के व्रत, त्योहार और शुभ समय, कैलेंडर में।'],
      ['আগামীকালের এক ঝলক 🌙', 'আগামীকালের ব্রত, উৎসব আর শুভ সময়, ক্যালেন্ডারে।']),
    n(['Shubh sandhya 🙏', 'Thank the day for what it gave, and forgive it for what it didn’t.'],
      ['शुभ संध्या 🙏', 'जो दिन ने दिया उसका धन्यवाद, जो नहीं दिया उसे माफ़।'],
      ['শুভ সন্ধ্যা 🙏', 'দিন যা দিল তার জন্য ধন্যবাদ, যা দিল না তাকে ক্ষমা।']),
    n(['Ask Sadhak AI 💬', 'A question about a ritual, a verse or your chart? Ask, and get a calm answer.'],
      ['साधक AI से पूछिए 💬', 'किसी विधि, श्लोक या कुंडली के बारे में सवाल? पूछिए, शांत जवाब पाइए।'],
      ['সাধক AI-কে জিজ্ঞেস করুন 💬', 'কোনো আচার, শ্লোক বা কুণ্ডলী নিয়ে প্রশ্ন? জিজ্ঞেস করুন, শান্ত উত্তর পান।']),
  ],
};

/** Where each moment's tap leads. */
export const MOMENT_ROUTE: Record<string, string> = {
  'Today’s panchang is ready 📜': '/panchang', 'Abhijit muhurta is near ⏳': '/panchang', 'Rahu Kaal check 🕰️': '/panchang',
  'Japa break? 📿': '/japa', 'Your mala missed you 📿': '/japa', 'Suprabhat 🌅': '/japa',
  'Aarti in your pocket 🎶': '/virtual-puja', 'Your diya is waiting 🪔': '/virtual-puja',
  'One verse, one minute 📖': '/(tabs)/library', 'Story time 📚': '/(tabs)/library',
  'A peek at tomorrow 🌙': '/(tabs)/calendar', 'Ask Sadhak AI 💬': '/ask',
};

type Fill = Record<string, string>;
const fill = (s: string, v: Fill) => s.replace(/\{(\w+)\}/g, (_, k) => v[k] ?? '');

const ALERTS = {
  festEve: n(['Tomorrow: {name} 🪔', '{desc} Tap for timings and the puja vidhi.'],
    ['कल है {name} 🪔', '{desc} समय और पूजा विधि के लिए टैप कीजिए।'],
    ['আগামীকাল {name} 🪔', '{desc} সময় আর পূজার বিধির জন্য ট্যাপ করুন।']),
  festDay: n(['Shubh {name}! 🙏', '{desc}'], ['{name} की शुभकामनाएँ! 🙏', '{desc}'], ['শুভ {name}! 🙏', '{desc}']),
  ekEve: n(['Ekadashi tomorrow 🌙', 'The fast begins at sunrise. A light sattvic dinner tonight makes it easier.'],
    ['कल एकादशी है 🌙', 'व्रत सूर्योदय से शुरू होगा। आज रात हल्का सात्त्विक भोजन व्रत को आसान बनाता है।'],
    ['আগামীকাল একাদশী 🌙', 'উপবাস শুরু সূর্যোদয়ে। আজ রাতে হালকা সাত্ত্বিক খাবার উপবাস সহজ করে।']),
  ekDay: n(['Ekadashi today 🌙', 'A day for fasting, japa and remembering Vishnu.'],
    ['आज एकादशी है 🌙', 'व्रत, जप और श्री विष्णु के स्मरण का दिन।'],
    ['আজ একাদশী 🌙', 'উপবাস, জপ আর শ্রীবিষ্ণুকে স্মরণের দিন।']),
  sutak: n(['Sutak begins at {time}', '{kind} today, {start} to {end}. Many families pause cooking and eating until it ends.'],
    ['सूतक {time} से', 'आज {kind}, {start} से {end} तक। कई परिवार ग्रहण खत्म होने तक खाना बनाना और खाना रोक देते हैं।'],
    ['সূতক শুরু {time}', 'আজ {kind}, {start} থেকে {end}। অনেক পরিবার গ্রহণ শেষ না হওয়া পর্যন্ত রান্না-খাওয়া বন্ধ রাখেন।']),
  grahan: n(['{kind} in 30 minutes', 'From {start} to {end}. A good time for quiet japa; bathe once it ends.'],
    ['30 मिनट में {kind}', '{start} से {end} तक। शांत जप का अच्छा समय; खत्म होने पर स्नान कीजिए।'],
    ['৩০ মিনিটে {kind}', '{start} থেকে {end}। নীরব জপের ভালো সময়; শেষ হলে স্নান করুন।']),
  grooming: n(['A small grooming note ✂️', 'Traditionally not a day for a haircut, shaving or cutting nails.'],
    ['ग्रूमिंग की छोटी सी बात ✂️', 'परंपरा से आज बाल, दाढ़ी या नाखून काटने का दिन नहीं है।'],
    ['গ্রুমিং নিয়ে ছোট্ট কথা ✂️', 'প্রথা অনুযায়ী আজ চুল, দাড়ি বা নখ কাটার দিন নয়।']),
};

export const KIND: Record<NLang, { solar: string; lunar: string }> = {
  en: { solar: 'Surya grahan', lunar: 'Chandra grahan' },
  hi: { solar: 'सूर्य ग्रहण', lunar: 'चंद्र ग्रहण' },
  bn: { solar: 'সূর্যগ্রহণ', lunar: 'চন্দ্রগ্রহণ' },
};

export function alertCopy(key: keyof typeof ALERTS, lang: NLang, v: Fill = {}): Note {
  const t = ALERTS[key][lang];
  return { title: fill(t.title, v).trim(), body: fill(t.body, v).replace(/\s+/g, ' ').trim() };
}

/** The app language reduced to the three we write notifications in. */
export function notifLang(code: string | null | undefined): NLang {
  if (code === 'hi' || code === 'mr') return 'hi';
  if (code === 'bn' || code === 'as') return 'bn';
  return 'en';
}
