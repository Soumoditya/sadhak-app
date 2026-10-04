// Devotional content library — complete, traditional texts.
// Categories: aarti (daily worship songs), chalisa (40-verse hymns),
// mantra (vedic/puranic mantras with meaning), stotra (hymns of praise).

export type DevotionalCategory = 'aarti' | 'chalisa' | 'mantra' | 'stotra';

export interface DevotionalItem {
  id: string;
  category: DevotionalCategory;
  title: string;
  titleHi: string;
  deity: string;
  color: string;
  /** Full Devanagari text. */
  text: string;
  /** Optional meaning / translation shown under the text. */
  meaning?: string;
  /** Search query used for in-app YouTube playback. */
  playQuery: string;
}

export const DEVOTIONAL_CATEGORIES: { key: DevotionalCategory; label: string; labelHi: string; icon: string }[] = [
  { key: 'aarti', label: 'Aarti', labelHi: 'आरती', icon: 'candle' },
  { key: 'chalisa', label: 'Chalisa', labelHi: 'चालीसा', icon: 'book-open-variant' },
  { key: 'mantra', label: 'Mantra', labelHi: 'मंत्र', icon: 'meditation' },
  { key: 'stotra', label: 'Stotra', labelHi: 'स्तोत्र', icon: 'music-clef-treble' },
];

export const DEVOTIONAL_ITEMS: DevotionalItem[] = [
  // ═══════════════════════════ CHALISA ═══════════════════════════
  {
    id: 'hanuman-chalisa',
    category: 'chalisa',
    title: 'Hanuman Chalisa',
    titleHi: 'श्री हनुमान चालीसा',
    deity: 'Lord Hanuman',
    color: '#BF360C',
    playQuery: 'Hanuman Chalisa',
    text: `॥ दोहा ॥
श्रीगुरु चरन सरोज रज, निज मनु मुकुरु सुधारि।
बरनउँ रघुबर बिमल जसु, जो दायकु फल चारि॥
बुद्धिहीन तनु जानिके, सुमिरौं पवन-कुमार।
बल बुधि बिद्या देहु मोहिं, हरहु कलेस बिकार॥

॥ चौपाई ॥
जय हनुमान ज्ञान गुन सागर। जय कपीस तिहुँ लोक उजागर॥ १॥
राम दूत अतुलित बल धामा। अंजनि-पुत्र पवनसुत नामा॥ २॥
महाबीर बिक्रम बजरंगी। कुमति निवार सुमति के संगी॥ ३॥
कंचन बरन बिराज सुबेसा। कानन कुंडल कुंचित केसा॥ ४॥
हाथ बज्र औ ध्वजा बिराजै। काँधे मूँज जनेऊ साजै॥ ५॥
संकर सुवन केसरीनंदन। तेज प्रताप महा जग बन्दन॥ ६॥
विद्यावान गुनी अति चातुर। राम काज करिबे को आतुर॥ ७॥
प्रभु चरित्र सुनिबे को रसिया। राम लखन सीता मन बसिया॥ ८॥
सूक्ष्म रूप धरि सियहिं दिखावा। बिकट रूप धरि लंक जरावा॥ ९॥
भीम रूप धरि असुर सँहारे। रामचंद्र के काज सँवारे॥ १०॥
लाय सजीवन लखन जियाये। श्रीरघुबीर हरषि उर लाये॥ ११॥
रघुपति कीन्ही बहुत बड़ाई। तुम मम प्रिय भरतहि सम भाई॥ १२॥
सहस बदन तुम्हरो जस गावैं। अस कहि श्रीपति कंठ लगावैं॥ १३॥
सनकादिक ब्रह्मादि मुनीसा। नारद सारद सहित अहीसा॥ १४॥
जम कुबेर दिगपाल जहाँ ते। कबि कोबिद कहि सके कहाँ ते॥ १५॥
तुम उपकार सुग्रीवहिं कीन्हा। राम मिलाय राज पद दीन्हा॥ १६॥
तुम्हरो मंत्र बिभीषन माना। लंकेस्वर भए सब जग जाना॥ १७॥
जुग सहस्र जोजन पर भानू। लील्यो ताहि मधुर फल जानू॥ १८॥
प्रभु मुद्रिका मेलि मुख माहीं। जलधि लाँघि गये अचरज नाहीं॥ १९॥
दुर्गम काज जगत के जेते। सुगम अनुग्रह तुम्हरे तेते॥ २०॥
राम दुआरे तुम रखवारे। होत न आज्ञा बिनु पैसारे॥ २१॥
सब सुख लहै तुम्हारी सरना। तुम रच्छक काहू को डर ना॥ २२॥
आपन तेज सम्हारो आपै। तीनों लोक हाँक तें काँपै॥ २३॥
भूत पिसाच निकट नहिं आवै। महाबीर जब नाम सुनावै॥ २४॥
नासै रोग हरै सब पीरा। जपत निरंतर हनुमत बीरा॥ २५॥
संकट तें हनुमान छुड़ावै। मन क्रम बचन ध्यान जो लावै॥ २६॥
सब पर राम तपस्वी राजा। तिन के काज सकल तुम साजा॥ २७॥
और मनोरथ जो कोई लावै। सोई अमित जीवन फल पावै॥ २८॥
चारों जुग परताप तुम्हारा। है परसिद्ध जगत उजियारा॥ २९॥
साधु संत के तुम रखवारे। असुर निकंदन राम दुलारे॥ ३०॥
अष्ट सिद्धि नौ निधि के दाता। अस बर दीन जानकी माता॥ ३१॥
राम रसायन तुम्हरे पासा। सदा रहो रघुपति के दासा॥ ३२॥
तुम्हरे भजन राम को पावै। जनम-जनम के दुख बिसरावै॥ ३३॥
अन्तकाल रघुबर पुर जाई। जहाँ जन्म हरि-भक्त कहाई॥ ३४॥
और देवता चित्त न धरई। हनुमत सेइ सर्ब सुख करई॥ ३५॥
संकट कटै मिटै सब पीरा। जो सुमिरै हनुमत बलबीरा॥ ३६॥
जै जै जै हनुमान गोसाईं। कृपा करहु गुरुदेव की नाईं॥ ३७॥
जो सत बार पाठ कर कोई। छूटहि बंदि महा सुख होई॥ ३८॥
जो यह पढ़ै हनुमान चालीसा। होय सिद्धि साखी गौरीसा॥ ३९॥
तुलसीदास सदा हरि चेरा। कीजै नाथ हृदय महँ डेरा॥ ४०॥

॥ दोहा ॥
पवनतनय संकट हरन, मंगल मूरति रूप।
राम लखन सीता सहित, हृदय बसहु सुर भूप॥`,
    meaning: 'Composed by Goswami Tulsidas, the 40 verses of Hanuman Chalisa praise Shri Hanuman — his strength, devotion and service to Shri Ram — and are recited daily for courage and protection.',
  },

  // ═══════════════════════════ AARTIS (complete) ═══════════════════════════
  {
    id: 'om-jai-jagdish',
    category: 'aarti',
    title: 'Om Jai Jagdish Hare',
    titleHi: 'ॐ जय जगदीश हरे',
    deity: 'Lord Vishnu',
    color: '#1565C0',
    playQuery: 'Om Jai Jagdish Hare aarti',
    text: `ॐ जय जगदीश हरे, स्वामी जय जगदीश हरे।
भक्त जनों के संकट, दास जनों के संकट,
क्षण में दूर करे॥ ॐ जय जगदीश हरे॥

जो ध्यावे फल पावे, दुख बिनसे मन का।
स्वामी दुख बिनसे मन का।
सुख सम्पत्ति घर आवे, कष्ट मिटे तन का॥ ॐ जय जगदीश हरे॥

मात-पिता तुम मेरे, शरण गहूँ मैं किसकी।
स्वामी शरण गहूँ मैं किसकी।
तुम बिन और न दूजा, आस करूँ मैं जिसकी॥ ॐ जय जगदीश हरे॥

तुम पूरन परमात्मा, तुम अन्तर्यामी।
स्वामी तुम अन्तर्यामी।
पारब्रह्म परमेश्वर, तुम सबके स्वामी॥ ॐ जय जगदीश हरे॥

तुम करुणा के सागर, तुम पालनकर्ता।
स्वामी तुम पालनकर्ता।
मैं मूरख खल कामी, कृपा करो भर्ता॥ ॐ जय जगदीश हरे॥

तुम हो एक अगोचर, सबके प्राणपति।
स्वामी सबके प्राणपति।
किस विधि मिलूँ दयामय, तुमको मैं कुमति॥ ॐ जय जगदीश हरे॥

दीनबन्धु दुखहर्ता, ठाकुर तुम मेरे।
स्वामी ठाकुर तुम मेरे।
अपने हाथ उठाओ, द्वार पड़ा तेरे॥ ॐ जय जगदीश हरे॥

विषय-विकार मिटाओ, पाप हरो देवा।
स्वामी पाप हरो देवा।
श्रद्धा-भक्ति बढ़ाओ, सन्तन की सेवा॥ ॐ जय जगदीश हरे॥`,
  },
  {
    id: 'om-jai-shiv-omkara',
    category: 'aarti',
    title: 'Om Jai Shiv Omkara',
    titleHi: 'ॐ जय शिव ओंकारा',
    deity: 'Lord Shiva',
    color: '#4A148C',
    playQuery: 'Om Jai Shiv Omkara aarti',
    text: `ॐ जय शिव ओंकारा, स्वामी जय शिव ओंकारा।
ब्रह्मा, विष्णु, सदाशिव, अर्द्धांगी धारा॥ ॐ जय शिव ओंकारा॥

एकानन चतुरानन पंचानन राजे।
स्वामी पंचानन राजे।
हंसासन गरुड़ासन वृषवाहन साजे॥ ॐ जय शिव ओंकारा॥

दो भुज चार चतुर्भुज दसभुज अति सोहे।
स्वामी दसभुज अति सोहे।
त्रिगुण रूप निरखते त्रिभुवन जन मोहे॥ ॐ जय शिव ओंकारा॥

अक्षमाला वनमाला मुण्डमाला धारी।
स्वामी मुण्डमाला धारी।
त्रिपुरारी कंसारी कर माला धारी॥ ॐ जय शिव ओंकारा॥

श्वेताम्बर पीताम्बर बाघम्बर अंगे।
स्वामी बाघम्बर अंगे।
सनकादिक गरुड़ादिक भूतादिक संगे॥ ॐ जय शिव ओंकारा॥

कर के मध्य कमण्डलु चक्र त्रिशूलधारी।
स्वामी चक्र त्रिशूलधारी।
सुखकारी दुखहारी जगपालनकारी॥ ॐ जय शिव ओंकारा॥

ब्रह्मा विष्णु सदाशिव जानत अविवेका।
स्वामी जानत अविवेका।
प्रणवाक्षर के मध्ये ये तीनों एका॥ ॐ जय शिव ओंकारा॥

काशी में विश्वनाथ विराजत नन्दी ब्रह्मचारी।
स्वामी नन्दी ब्रह्मचारी।
नित उठि भोग लगावत महिमा अति भारी॥ ॐ जय शिव ओंकारा॥

त्रिगुणस्वामी जी की आरती जो कोई नर गावे।
स्वामी जो कोई नर गावे।
कहत शिवानन्द स्वामी मनवांछित फल पावे॥ ॐ जय शिव ओंकारा॥`,
  },
  {
    id: 'jai-ganesh-deva',
    category: 'aarti',
    title: 'Jai Ganesh Deva',
    titleHi: 'जय गणेश देवा',
    deity: 'Lord Ganesha',
    color: '#C2410C',
    playQuery: 'Jai Ganesh Jai Ganesh Deva aarti',
    text: `जय गणेश जय गणेश, जय गणेश देवा।
माता जाकी पार्वती, पिता महादेवा॥

एक दन्त दयावन्त, चार भुजा धारी।
माथे पर तिलक सोहे, मूसे की सवारी॥
जय गणेश जय गणेश, जय गणेश देवा॥

पान चढ़े फल चढ़े, और चढ़े मेवा।
लड्डुअन का भोग लगे, सन्त करें सेवा॥
जय गणेश जय गणेश, जय गणेश देवा॥

अन्धन को आँख देत, कोढ़िन को काया।
बाँझन को पुत्र देत, निर्धन को माया॥
जय गणेश जय गणेश, जय गणेश देवा॥

'सूर' श्याम शरण आए, सफल कीजे सेवा।
माता जाकी पार्वती, पिता महादेवा॥
जय गणेश जय गणेश, जय गणेश देवा॥

दीनन की लाज रखो, शम्भु सुतकारी।
कामना को पूर्ण करो, जाऊँ बलिहारी॥
जय गणेश जय गणेश, जय गणेश देवा॥`,
  },
  {
    id: 'hanuman-aarti',
    category: 'aarti',
    title: 'Aarti Shri Hanuman Ji Ki',
    titleHi: 'आरती कीजै हनुमान लला की',
    deity: 'Lord Hanuman',
    color: '#BF360C',
    playQuery: 'Aarti Kije Hanuman Lala Ki',
    text: `आरती कीजै हनुमान लला की।
दुष्ट दलन रघुनाथ कला की॥

जाके बल से गिरिवर काँपे।
रोग दोष जाके निकट न झाँके॥
अंजनि पुत्र महा बलदाई।
संतन के प्रभु सदा सहाई॥
आरती कीजै हनुमान लला की॥

दे बीरा रघुनाथ पठाए।
लंका जारि सिया सुधि लाए॥
लंका सो कोट समुद्र सी खाई।
जात पवनसुत बार न लाई॥
आरती कीजै हनुमान लला की॥

लंका जारि असुर सँहारे।
सियारामजी के काज सँवारे॥
लक्ष्मण मूर्छित पड़े सकारे।
आनि संजीवन प्राण उबारे॥
आरती कीजै हनुमान लला की॥

पैठि पताल तोरि जम-कारे।
अहिरावण की भुजा उखारे॥
बाईं भुजा असुर दल मारे।
दाहिने भुजा संतजन तारे॥
आरती कीजै हनुमान लला की॥

सुर नर मुनि आरती उतारें।
जय जय जय हनुमान उचारें॥
कंचन थार कपूर लौ छाई।
आरती करत अंजना माई॥
आरती कीजै हनुमान लला की॥

जो हनुमानजी की आरती गावै।
बसि बैकुण्ठ परम पद पावै॥
आरती कीजै हनुमान लला की॥`,
  },
  {
    id: 'om-jai-lakshmi',
    category: 'aarti',
    title: 'Om Jai Lakshmi Mata',
    titleHi: 'ॐ जय लक्ष्मी माता',
    deity: 'Goddess Lakshmi',
    color: '#D32F2F',
    playQuery: 'Om Jai Lakshmi Mata aarti',
    text: `ॐ जय लक्ष्मी माता, मैया जय लक्ष्मी माता।
तुमको निशदिन सेवत, हरि विष्णु विधाता॥ ॐ जय लक्ष्मी माता॥

उमा रमा ब्रह्माणी, तुम ही जग-माता।
मैया तुम ही जग-माता।
सूर्य-चन्द्रमा ध्यावत, नारद ऋषि गाता॥ ॐ जय लक्ष्मी माता॥

दुर्गा रूप निरंजनी, सुख सम्पत्ति दाता।
मैया सुख सम्पत्ति दाता।
जो कोई तुमको ध्यावत, ऋद्धि-सिद्धि धन पाता॥ ॐ जय लक्ष्मी माता॥

तुम पाताल-निवासिनी, तुम ही शुभदाता।
मैया तुम ही शुभदाता।
कर्म-प्रभाव-प्रकाशिनी, भवनिधि की त्राता॥ ॐ जय लक्ष्मी माता॥

जिस घर में तुम रहतीं, सब सद्गुण आता।
मैया सब सद्गुण आता।
सब सम्भव हो जाता, मन नहीं घबराता॥ ॐ जय लक्ष्मी माता॥

तुम बिन यज्ञ न होते, वस्त्र न कोई पाता।
मैया वस्त्र न कोई पाता।
खान-पान का वैभव, सब तुमसे आता॥ ॐ जय लक्ष्मी माता॥

शुभ-गुण मन्दिर सुन्दर, क्षीरोदधि-जाता।
मैया क्षीरोदधि-जाता।
रत्न चतुर्दश तुम बिन, कोई नहीं पाता॥ ॐ जय लक्ष्मी माता॥

महालक्ष्मीजी की आरती, जो कोई नर गाता।
मैया जो कोई नर गाता।
उर आनन्द समाता, पाप उतर जाता॥ ॐ जय लक्ष्मी माता॥`,
  },
  {
    id: 'jai-ambe-gauri',
    category: 'aarti',
    title: 'Jai Ambe Gauri',
    titleHi: 'जय अम्बे गौरी',
    deity: 'Goddess Durga',
    color: '#C62828',
    playQuery: 'Jai Ambe Gauri aarti',
    text: `जय अम्बे गौरी, मैया जय श्यामा गौरी।
तुमको निशदिन ध्यावत, हरि ब्रह्मा शिवरी॥ जय अम्बे गौरी॥

माँग सिन्दूर विराजत, टीको मृगमद को।
मैया टीको मृगमद को।
उज्ज्वल से दोउ नैना, चन्द्रवदन नीको॥ जय अम्बे गौरी॥

कनक समान कलेवर, रक्ताम्बर राजै।
मैया रक्ताम्बर राजै।
रक्तपुष्प गल माला, कण्ठन पर साजै॥ जय अम्बे गौरी॥

केहरि वाहन राजत, खड्ग खप्पर धारी।
मैया खड्ग खप्पर धारी।
सुर-नर-मुनिजन सेवत, तिनके दुखहारी॥ जय अम्बे गौरी॥

कानन कुण्डल शोभित, नासाग्रे मोती।
मैया नासाग्रे मोती।
कोटिक चन्द्र दिवाकर, सम राजत ज्योती॥ जय अम्बे गौरी॥

शुम्भ-निशुम्भ बिदारे, महिषासुर घाती।
मैया महिषासुर घाती।
धूम्र विलोचन नैना, निशदिन मदमाती॥ जय अम्बे गौरी॥

चण्ड-मुण्ड संहारे, शोणित बीज हरे।
मैया शोणित बीज हरे।
मधु-कैटभ दोउ मारे, सुर भयहीन करे॥ जय अम्बे गौरी॥

ब्रह्माणी, रुद्राणी, तुम कमला रानी।
मैया तुम कमला रानी।
आगम-निगम-बखानी, तुम शिव पटरानी॥ जय अम्बे गौरी॥

चौंसठ योगिनी गावत, नृत्य करत भैरूँ।
मैया नृत्य करत भैरूँ।
बाजत ताल मृदंगा, अरु बाजत डमरू॥ जय अम्बे गौरी॥

तुम ही जग की माता, तुम ही हो भर्ता।
मैया तुम ही हो भर्ता।
भक्तन की दुःख हर्ता, सुख सम्पत्ति कर्ता॥ जय अम्बे गौरी॥

भुजा चार अति शोभित, वर-मुद्रा धारी।
मैया वर-मुद्रा धारी।
मनवांछित फल पावत, सेवत नर-नारी॥ जय अम्बे गौरी॥

कंचन थाल विराजत, अगर कपूर बाती।
मैया अगर कपूर बाती।
श्रीमालकेतु में राजत, कोटि रतन ज्योती॥ जय अम्बे गौरी॥

श्री अम्बेजी की आरती, जो कोई नर गावे।
मैया जो कोई नर गावे।
कहत शिवानन्द स्वामी, सुख सम्पत्ति पावे॥ जय अम्बे गौरी॥`,
  },
  {
    id: 'kunj-bihari',
    category: 'aarti',
    title: 'Aarti Kunj Bihari Ki',
    titleHi: 'आरती कुंजबिहारी की',
    deity: 'Lord Krishna',
    color: '#0D47A1',
    playQuery: 'Aarti Kunj Bihari Ki',
    text: `आरती कुंजबिहारी की, श्री गिरिधर कृष्ण मुरारी की॥

गले में बैजन्ती माला, बजावै मुरली मधुर बाला।
श्रवण में कुण्डल झलकाला, नन्द के आनन्द नन्दलाला।
गगन सम अंग कान्ति काली, राधिका चमक रही आली।
लतन में ठाढ़े बनमाली।
भ्रमर सी अलक, कस्तूरी तिलक, चन्द्र सी झलक।
ललित छवि श्यामा प्यारी की॥
श्री गिरिधर कृष्ण मुरारी की॥

कनकमय मोर मुकुट बिलसै, देवता दरसन को तरसैं।
गगन सों सुमन रासि बरसै।
बजे मुरचंग, मधुर मिरदंग, ग्वालिन संग।
अतुल रति गोप कुमारी की॥
श्री गिरिधर कृष्ण मुरारी की॥

जहाँ ते प्रकट भई गंगा, सकल मन हारिणि श्री गंगा।
स्मरन ते होत मोह भंगा।
बसी शिव सीस, जटा के बीच, हरै अघ कीच।
चरन छवि श्रीबनवारी की॥
श्री गिरिधर कृष्ण मुरारी की॥

चमकती उज्ज्वल तट रेनू, बज रही वृन्दावन बेनू।
चहुँ दिसि गोपि ग्वाल धेनू।
हंसत मृदु मन्द, चाँदनी चन्द, कटत भव फन्द।
टेर सुनु दीन दुखारी की॥
श्री गिरिधर कृष्ण मुरारी की॥

आरती कुंजबिहारी की, श्री गिरिधर कृष्ण मुरारी की॥`,
  },
  {
    id: 'saraswati-aarti',
    category: 'aarti',
    title: 'Jai Saraswati Mata',
    titleHi: 'जय सरस्वती माता',
    deity: 'Goddess Saraswati',
    color: '#B8860B',
    playQuery: 'Jai Saraswati Mata aarti',
    text: `जय सरस्वती माता, मैया जय सरस्वती माता।
सद्गुण वैभव शालिनी, त्रिभुवन विख्याता॥ जय सरस्वती माता॥

चन्द्रवदनि पद्मासिनि, द्युति मंगलकारी।
मैया द्युति मंगलकारी।
सोहे शुभ हंस सवारी, अतुल तेजधारी॥ जय सरस्वती माता॥

बाएँ कर में वीणा, दाएँ कर माला।
मैया दाएँ कर माला।
शीश मुकुट मणि सोहे, गल मोतियन माला॥ जय सरस्वती माता॥

देवि शरण जो आए, उनका उद्धार किया।
मैया उनका उद्धार किया।
पैठि मंथरा दासी, रावण संहार किया॥ जय सरस्वती माता॥

विद्या ज्ञान प्रदायिनि, ज्ञान प्रकाश भरो।
मैया ज्ञान प्रकाश भरो।
मोह अज्ञान और तिमिर का, जग से नाश करो॥ जय सरस्वती माता॥

धूप दीप फल मेवा, माँ स्वीकार करो।
मैया माँ स्वीकार करो।
ज्ञानचक्षु दे माता, जग निस्तार करो॥ जय सरस्वती माता॥

माँ सरस्वती की आरती, जो कोई जन गावे।
मैया जो कोई जन गावे।
हितकारी सुखकारी, ज्ञान भक्ति पावे॥ जय सरस्वती माता॥`,
  },

  // ═══════════════════════════ MANTRAS ═══════════════════════════
  {
    id: 'gayatri',
    category: 'mantra',
    title: 'Gayatri Mantra',
    titleHi: 'गायत्री मंत्र',
    deity: 'Savitr (Surya)',
    color: '#F59E0B',
    playQuery: 'Gayatri Mantra 108 times',
    text: `ॐ भूर्भुवः स्वः।
तत्सवितुर्वरेण्यं।
भर्गो देवस्य धीमहि।
धियो यो नः प्रचोदयात्॥`,
    meaning: 'We meditate on the divine light of Savitr (the Sun), who illuminates the three worlds — may that radiance awaken and guide our intellect. (Rigveda 3.62.10)',
  },
  {
    id: 'mahamrityunjaya',
    category: 'mantra',
    title: 'Mahamrityunjaya Mantra',
    titleHi: 'महामृत्युंजय मंत्र',
    deity: 'Lord Shiva',
    color: '#4A148C',
    playQuery: 'Mahamrityunjaya Mantra 108',
    text: `ॐ त्र्यम्बकं यजामहे
सुगन्धिं पुष्टिवर्धनम्।
उर्वारुकमिव बन्धनान्
मृत्योर्मुक्षीय मामृतात्॥`,
    meaning: 'We worship the three-eyed Lord (Shiva), fragrant and nourishing. As a ripe cucumber is freed from its stem, may He free us from death — never from immortality. (Rigveda 7.59.12)',
  },
  {
    id: 'panchakshari',
    category: 'mantra',
    title: 'Shiva Panchakshari',
    titleHi: 'ॐ नमः शिवाय',
    deity: 'Lord Shiva',
    color: '#37474F',
    playQuery: 'Om Namah Shivaya chanting',
    text: `ॐ नमः शिवाय॥`,
    meaning: 'The five-syllable mantra of Lord Shiva — "I bow to Shiva," the auspicious inner Self of all.',
  },
  {
    id: 'mahamantra',
    category: 'mantra',
    title: 'Hare Krishna Mahamantra',
    titleHi: 'हरे कृष्ण महामंत्र',
    deity: 'Lord Krishna',
    color: '#0D47A1',
    playQuery: 'Hare Krishna Mahamantra kirtan',
    text: `हरे कृष्ण हरे कृष्ण,
कृष्ण कृष्ण हरे हरे।
हरे राम हरे राम,
राम राम हरे हरे॥`,
    meaning: 'The great mantra of the Kali Yuga (Kali-Santarana Upanishad) — calling upon the divine energy (Hare) and the all-attractive Lord as Krishna and Rama.',
  },
  {
    id: 'vakratunda',
    category: 'mantra',
    title: 'Vakratunda Mahakaya',
    titleHi: 'वक्रतुण्ड महाकाय',
    deity: 'Lord Ganesha',
    color: '#C2410C',
    playQuery: 'Vakratunda Mahakaya mantra',
    text: `वक्रतुण्ड महाकाय
सूर्यकोटि समप्रभ।
निर्विघ्नं कुरु मे देव
सर्वकार्येषु सर्वदा॥`,
    meaning: 'O curved-trunked, mighty-bodied Lord, radiant as ten million suns — make all my endeavours forever free of obstacles.',
  },
  {
    id: 'saraswati-vandana',
    category: 'mantra',
    title: 'Saraswati Vandana',
    titleHi: 'या कुन्देन्दुतुषारहारधवला',
    deity: 'Goddess Saraswati',
    color: '#B8860B',
    playQuery: 'Ya Kundendu Tushar Har Dhavala',
    text: `या कुन्देन्दुतुषारहारधवला या शुभ्रवस्त्रावृता
या वीणावरदण्डमण्डितकरा या श्वेतपद्मासना।
या ब्रह्माच्युतशंकरप्रभृतिभिर्देवैः सदा वन्दिता
सा मां पातु सरस्वती भगवती निःशेषजाड्यापहा॥`,
    meaning: 'May Goddess Saraswati — white as jasmine, the moon and snow, robed in white, veena in hand, seated on a white lotus, adored by Brahma, Vishnu and Shiva — protect me and remove all dullness of mind.',
  },
  {
    id: 'shanti-mantra',
    category: 'mantra',
    title: 'Sarve Bhavantu Sukhinah',
    titleHi: 'सर्वे भवन्तु सुखिनः',
    deity: 'Universal Peace',
    color: '#2D6A4F',
    playQuery: 'Sarve Bhavantu Sukhinah shanti mantra',
    text: `ॐ सर्वे भवन्तु सुखिनः,
सर्वे सन्तु निरामयाः।
सर्वे भद्राणि पश्यन्तु,
मा कश्चिद् दुःखभाग्भवेत्।
ॐ शान्तिः शान्तिः शान्तिः॥`,
    meaning: 'May all be happy, may all be free from illness, may all see what is auspicious, may none suffer. Om, peace, peace, peace.',
  },
  {
    id: 'asato-ma',
    category: 'mantra',
    title: 'Asato Ma Sadgamaya',
    titleHi: 'असतो मा सद्गमय',
    deity: 'Pavamana Mantra',
    color: '#7C3AED',
    playQuery: 'Asato Ma Sadgamaya chant',
    text: `ॐ असतो मा सद्गमय।
तमसो मा ज्योतिर्गमय।
मृत्योर्मा अमृतं गमय।
ॐ शान्तिः शान्तिः शान्तिः॥`,
    meaning: 'Lead me from the unreal to the real, from darkness to light, from death to immortality. (Brihadaranyaka Upanishad 1.3.28)',
  },
  {
    id: 'guru-mantra',
    category: 'mantra',
    title: 'Guru Mantra',
    titleHi: 'गुरुर्ब्रह्मा गुरुर्विष्णुः',
    deity: 'Guru',
    color: '#8B1A1A',
    playQuery: 'Gurur Brahma Gurur Vishnu shloka',
    text: `गुरुर्ब्रह्मा गुरुर्विष्णुः
गुरुर्देवो महेश्वरः।
गुरुः साक्षात् परब्रह्म
तस्मै श्रीगुरवे नमः॥`,
    meaning: 'The Guru is Brahma, Vishnu and Maheshwara; the Guru is verily the supreme Brahman — salutations to that revered Guru.',
  },
  {
    id: 'hanuman-mantra',
    category: 'mantra',
    title: 'Hanuman Vandana',
    titleHi: 'मनोजवं मारुततुल्यवेगम्',
    deity: 'Lord Hanuman',
    color: '#BF360C',
    playQuery: 'Manojavam Marut Tulya Vegam',
    text: `मनोजवं मारुततुल्यवेगं
जितेन्द्रियं बुद्धिमतां वरिष्ठम्।
वातात्मजं वानरयूथमुख्यं
श्रीरामदूतं शरणं प्रपद्ये॥`,
    meaning: 'Swift as thought, fast as the wind, master of the senses, foremost among the wise — I take refuge in the son of the Wind, chief of the vanaras, messenger of Shri Ram.',
  },
  {
    id: 'karagre',
    category: 'mantra',
    title: 'Karagre Vasate Lakshmi',
    titleHi: 'कराग्रे वसते लक्ष्मीः',
    deity: 'Morning Prayer',
    color: '#F59E0B',
    playQuery: 'Karagre Vasate Lakshmi morning shloka',
    text: `कराग्रे वसते लक्ष्मीः
करमध्ये सरस्वती।
करमूले तु गोविन्दः
प्रभाते करदर्शनम्॥`,
    meaning: 'At the fingertips dwells Lakshmi, in the middle of the palm Saraswati, at the base of the palm Govinda — therefore look upon your palms at dawn.',
  },
  {
    id: 'tvameva',
    category: 'mantra',
    title: 'Tvameva Mata',
    titleHi: 'त्वमेव माता च पिता त्वमेव',
    deity: 'Surrender Prayer',
    color: '#1565C0',
    playQuery: 'Tvameva Mata Cha Pita Tvameva',
    text: `त्वमेव माता च पिता त्वमेव,
त्वमेव बन्धुश्च सखा त्वमेव।
त्वमेव विद्या द्रविणं त्वमेव,
त्वमेव सर्वं मम देवदेव॥`,
    meaning: 'You alone are my mother and father, my kin and my friend, my knowledge and my wealth — You are my everything, O God of gods.',
  },

  // ═══════════════════════════ STOTRAS ═══════════════════════════
  {
    id: 'lingashtakam',
    category: 'stotra',
    title: 'Lingashtakam',
    titleHi: 'लिंगाष्टकम्',
    deity: 'Lord Shiva',
    color: '#37474F',
    playQuery: 'Lingashtakam stotram',
    text: `ब्रह्ममुरारिसुरार्चितलिङ्गं
निर्मलभासितशोभितलिङ्गम्।
जन्मजदुःखविनाशकलिङ्गं
तत्प्रणमामि सदाशिवलिङ्गम्॥ १॥

देवमुनिप्रवरार्चितलिङ्गं
कामदहं करुणाकरलिङ्गम्।
रावणदर्पविनाशनलिङ्गं
तत्प्रणमामि सदाशिवलिङ्गम्॥ २॥

सर्वसुगन्धिसुलेपितलिङ्गं
बुद्धिविवर्धनकारणलिङ्गम्।
सिद्धसुरासुरवन्दितलिङ्गं
तत्प्रणमामि सदाशिवलिङ्गम्॥ ३॥

कनकमहामणिभूषितलिङ्गं
फणिपतिवेष्टितशोभितलिङ्गम्।
दक्षसुयज्ञविनाशनलिङ्गं
तत्प्रणमामि सदाशिवलिङ्गम्॥ ४॥

कुङ्कुमचन्दनलेपितलिङ्गं
पङ्कजहारसुशोभितलिङ्गम्।
सञ्चितपापविनाशनलिङ्गं
तत्प्रणमामि सदाशिवलिङ्गम्॥ ५॥

देवगणार्चितसेवितलिङ्गं
भावैर्भक्तिभिरेव च लिङ्गम्।
दिनकरकोटिप्रभाकरलिङ्गं
तत्प्रणमामि सदाशिवलिङ्गम्॥ ६॥

अष्टदलोपरिवेष्टितलिङ्गं
सर्वसमुद्भवकारणलिङ्गम्।
अष्टदरिद्रविनाशितलिङ्गं
तत्प्रणमामि सदाशिवलिङ्गम्॥ ७॥

सुरगुरुसुरवरपूजितलिङ्गं
सुरवनपुष्पसदार्चितलिङ्गम्।
परात्परं परमात्मकलिङ्गं
तत्प्रणमामि सदाशिवलिङ्गम्॥ ८॥

लिङ्गाष्टकमिदं पुण्यं यः पठेच्छिवसन्निधौ।
शिवलोकमवाप्नोति शिवेन सह मोदते॥`,
    meaning: 'Eight verses in praise of the Shiva Linga. Whoever recites this Lingashtakam in the presence of Shiva attains the abode of Shiva and rejoices with Him.',
  },
  {
    id: 'madhurashtakam',
    category: 'stotra',
    title: 'Madhurashtakam',
    titleHi: 'मधुराष्टकम्',
    deity: 'Lord Krishna',
    color: '#0D47A1',
    playQuery: 'Madhurashtakam Adharam Madhuram',
    text: `अधरं मधुरं वदनं मधुरं
नयनं मधुरं हसितं मधुरम्।
हृदयं मधुरं गमनं मधुरं
मधुराधिपतेरखिलं मधुरम्॥ १॥

वचनं मधुरं चरितं मधुरं
वसनं मधुरं वलितं मधुरम्।
चलितं मधुरं भ्रमितं मधुरं
मधुराधिपतेरखिलं मधुरम्॥ २॥

वेणुर्मधुरो रेणुर्मधुरः
पाणिर्मधुरः पादौ मधुरौ।
नृत्यं मधुरं सख्यं मधुरं
मधुराधिपतेरखिलं मधुरम्॥ ३॥

गीतं मधुरं पीतं मधुरं
भुक्तं मधुरं सुप्तं मधुरम्।
रूपं मधुरं तिलकं मधुरं
मधुराधिपतेरखिलं मधुरम्॥ ४॥

करणं मधुरं तरणं मधुरं
हरणं मधुरं रमणं मधुरम्।
वमितं मधुरं शमितं मधुरं
मधुराधिपतेरखिलं मधुरम्॥ ५॥

गुञ्जा मधुरा माला मधुरा
यमुना मधुरा वीची मधुरा।
सलिलं मधुरं कमलं मधुरं
मधुराधिपतेरखिलं मधुरम्॥ ६॥

गोपी मधुरा लीला मधुरा
युक्तं मधुरं मुक्तं मधुरम्।
दृष्टं मधुरं शिष्टं मधुरं
मधुराधिपतेरखिलं मधुरम्॥ ७॥

गोपा मधुरा गावो मधुरा
यष्टिर्मधुरा सृष्टिर्मधुरा।
दलितं मधुरं फलितं मधुरं
मधुराधिपतेरखिलं मधुरम्॥ ८॥`,
    meaning: 'Shri Vallabhacharya\'s eight verses on the all-sweet Lord: His lips, face, eyes, smile, heart, gait — everything about Shri Krishna is sweetness itself.',
  },
  {
    id: 'ganesh-pancharatnam',
    category: 'stotra',
    title: 'Ganesha Pancharatnam',
    titleHi: 'गणेश पञ्चरत्नम्',
    deity: 'Lord Ganesha',
    color: '#C2410C',
    playQuery: 'Ganesha Pancharatnam Mudakaratta Modakam',
    text: `मुदाकरात्तमोदकं सदा विमुक्तिसाधकं
कलाधरावतंसकं विलासिलोकरक्षकम्।
अनायकैकनायकं विनाशितेभदैत्यकं
नताशुभाशुनाशकं नमामि तं विनायकम्॥ १॥

नतेतरातिभीकरं नवोदितार्कभास्वरं
नमत्सुरारिनिर्जरं नताधिकापदुद्धरम्।
सुरेश्वरं निधीश्वरं गजेश्वरं गणेश्वरं
महेश्वरं तमाश्रये परात्परं निरन्तरम्॥ २॥

समस्तलोकशंकरं निरस्तदैत्यकुञ्जरं
दरेतरोदरं वरं वरेभवक्त्रमक्षरम्।
कृपाकरं क्षमाकरं मुदाकरं यशस्करं
मनस्करं नमस्कृतां नमस्करोमि भास्वरम्॥ ३॥

अकिञ्चनार्तिमार्जनं चिरन्तनोक्तिभाजनं
पुरारिपूर्वनन्दनं सुरारिगर्वचर्वणम्।
प्रपञ्चनाशभीषणं धनञ्जयादिभूषणं
कपोलदानवारणं भजे पुराणवारणम्॥ ४॥

नितान्तकान्तदन्तकान्तिमन्तकान्तकात्मजं
अचिन्त्यरूपमन्तहीनमन्तरायकृन्तनम्।
हृदन्तरे निरन्तरं वसन्तमेव योगिनां
तमेकदन्तमेव तं विचिन्तयामि सन्ततम्॥ ५॥

महागणेशपञ्चरत्नमादरेण योऽन्वहं
प्रजल्पति प्रभातके हृदि स्मरन् गणेश्वरम्।
अरोगतामदोषतां सुसाहितीं सुपुत्रतां
समाहितायुरष्टभूतिमभ्युपैति सोऽचिरात्॥`,
    meaning: 'Adi Shankaracharya\'s five jewels in praise of Vinayaka. Reciting them each dawn while remembering Ganesha bestows health, virtue, learning, worthy progeny and long life.',
  },
];

export function getDevotionalByCategory(cat: DevotionalCategory): DevotionalItem[] {
  return DEVOTIONAL_ITEMS.filter((i) => i.category === cat);
}
