import type { Dictionary } from './en'

/**
 * Hindi. Typed as `Dictionary`, so `tsc` fails if this drifts from `en`.
 *
 * Hand-written, not machine-translated — per the plan, half-good translation
 * reads worse than none. Seed *content* translation is a separate decision
 * tracked in PLAN.md §12.
 */
export const hi: Dictionary = {
  meta: {
    title: 'इंडिया बिज़नेस डायरेक्टरी',
    description:
      'भारत भर के रेस्टोरेंट, क्लिनिक, दुकानें और सेवाएँ खोजें और उनकी समीक्षा पढ़ें — सत्यापित लिस्टिंग, वास्तविक खुलने का समय, और उन लोगों की समीक्षाएँ जो वहाँ असल में गए हैं।',
  },
  nav: {
    home: 'होम',
    search: 'खोजें',
    pricing: 'कीमतें',
    signIn: 'साइन इन',
    signUp: 'खाता बनाएँ',
    forBusiness: 'व्यापार के लिए',
    skipToContent: 'मुख्य सामग्री पर जाएँ',
    toggleTheme: 'थीम बदलें',
    toggleLanguage: 'भाषा बदलें',
    openMenu: 'मेन्यू खोलें',
    closeMenu: 'मेन्यू बंद करें',
  },
  home: {
    hero: {
      eyebrow: 'भारत',
      title: 'ऐसी जगहें खोजें जो आपके समय के लायक हों।',
      subtitle:
        'सत्यापित लिस्टिंग, वास्तविक खुलने का समय, और उन लोगों की समीक्षाएँ जो वहाँ असल में गए हैं।',
      searchPlaceholder: 'रेस्टोरेंट, क्लिनिक, सेवाएँ खोजें…',
      searchButton: 'खोजें',
      nearMe: 'मेरे आसपास',
    },
    scaffold: {
      eyebrow: 'चरण ०',
      title: 'नींव तैयार है।',
      body: 'Next.js, डिज़ाइन टोकन और डेवलपमेंट टूल तैयार हैं। डेटाबेस, खोज और लिस्टिंग अगले चरण में।',
      checklist: 'जाँच सूची',
    },
  },
  common: {
    loading: 'लोड हो रहा है…',
    retry: 'फिर कोशिश करें',
    openNow: 'अभी खुला है',
    closed: 'बंद',
    reviews: 'समीक्षाएँ',
    verified: 'सत्यापित',
    error: {
      title: 'कुछ गड़बड़ हो गई',
      body: 'यह अनुरोध पूरा नहीं हो सका। कृपया फिर कोशिश करें।',
    },
    notFound: {
      title: 'पेज नहीं मिला',
      body: 'आप जो पेज खोज रहे हैं वह मौजूद नहीं है या हटा दिया गया है।',
      cta: 'होम पर वापस जाएँ',
    },
  },
}
