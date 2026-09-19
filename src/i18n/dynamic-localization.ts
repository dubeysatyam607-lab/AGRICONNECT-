import type { Language } from '@/contexts/LanguageContext';
import { resolveKey } from './translate';

/** Canonical Crop Dictionary mapping IDs to localized names across 12 Indian languages */
export const CROP_LOCALIZATIONS: Record<string, Record<Language, string>> = {
  soybean: {
    en: 'Soybean',
    hi: 'सोयाबीन',
    mr: 'सोयाबीन',
    gu: 'સોયાબીન',
    pa: 'ਸੋਇਆਬੀਨ',
    ta: 'சோயாபீன்',
    te: 'సోయాబీన్',
    kn: 'ಸೋಯಾಬೀನ್',
    ml: 'സോയാബീൻ',
    bn: 'সয়াবিন',
    or: 'ସୋୟାବିନ୍',
    as: 'ছয়াবিন',
  },
  wheat: {
    en: 'Wheat',
    hi: 'गेहूं',
    mr: 'गहू',
    gu: 'ઘઉં',
    pa: 'ਕਣਕ',
    ta: 'கோதுமை',
    te: 'గోధుమలు',
    kn: 'ಗೋಧಿ',
    ml: 'ഗോതമ്പ്',
    bn: 'গম',
    or: 'ଗହମ',
    as: 'ঘেঁহু',
  },
  rice: {
    en: 'Paddy / Rice',
    hi: 'धान / चावल',
    mr: 'भात / तांदूळ',
    gu: 'ડાંગર / ચોખા',
    pa: 'ਝੋਨਾ / ਚਾਵਲ',
    ta: 'நெல் / அரிசி',
    te: 'వరి / బియ్యం',
    kn: 'ಬತ್ತ / ಅಕ್ಕಿ',
    ml: 'നെല്ല് / അരി',
    bn: 'ধান / চাল',
    or: 'ଧାନ / ଚାଉଳ',
    as: 'ধান / চাউল',
  },
  cotton: {
    en: 'Cotton',
    hi: 'कपास',
    mr: 'कापूस',
    gu: 'કપાસ',
    pa: 'ਕਪਾਹ',
    ta: 'பருத்தி',
    te: 'పత్తి',
    kn: 'அரளி / ಹತ್ತಿ',
    ml: 'പരുത്തി',
    bn: 'তুলা',
    or: 'କପା',
    as: 'কপাহ',
  },
  sugarcane: {
    en: 'Sugarcane',
    hi: 'गन्ना',
    mr: 'ऊस',
    gu: 'શેરડી',
    pa: 'ਗੰਨਾ',
    ta: 'கரும்பு',
    te: 'చెరకు',
    kn: 'கಬ್ಬು',
    ml: 'കരിമ്പ്',
    bn: 'আখ',
    or: 'ଆଖୁ',
    as: 'কুঁহিয়াৰ',
  },
  tomato: {
    en: 'Tomato',
    hi: 'टमाटर',
    mr: 'टोमॅटो',
    gu: 'ટમેટા',
    pa: 'ਟਮਾਟਰ',
    ta: 'தக்காளி',
    te: 'టమాట',
    kn: 'ಟೊಮೆಟೊ',
    ml: 'തക്കാളി',
    bn: 'টমেটো',
    or: 'ଟମାଟୋ',
    as: 'বিলাহী',
  },
  onion: {
    en: 'Onion',
    hi: 'प्याज',
    mr: 'कांदा',
    gu: 'ડુંગળી / કાંદા',
    pa: 'ਗੰਢਾ / ਪਿਆਜ਼',
    ta: 'வெங்காயம்',
    te: 'ఉల్లిపాయ',
    kn: 'ಈರುಳ್ಳಿ',
    ml: 'സവാള',
    bn: 'পেঁয়াজ',
    or: 'ପିଆଜ',
    as: 'পিয়াজ',
  },
  potato: {
    en: 'Potato',
    hi: 'आलू',
    mr: 'बटाटा',
    gu: 'બટાકા',
    pa: 'ਆਲੂ',
    ta: 'உருளைக்கிழங்கு',
    te: 'బంగాళాదుంప',
    kn: 'ಆಲೂಗಡ್ಡೆ',
    ml: 'ഉരുളക്കിഴങ്ങ്',
    bn: 'আলু',
    or: 'ଆଳୁ',
    as: 'আলু',
  },
  mustard: {
    en: 'Mustard',
    hi: 'सरसों',
    mr: 'मोहरी',
    gu: 'રાઈ / રાયડો',
    pa: 'ਸਰ੍ਹੋਂ',
    ta: 'கடுகு',
    te: 'ఆవాలు',
    kn: 'ಸಾಸಿವೆ',
    ml: 'കടുക്',
    bn: 'সরিষা',
    or: 'ସୋରିଷ',
    as: 'সৰিয়হ',
  },
  maize: {
    en: 'Maize / Corn',
    hi: 'मक्का',
    mr: 'मका',
    gu: 'મકાઈ',
    pa: 'ਮੱਕੀ',
    ta: 'மக்காச்சோளம்',
    te: 'మొక్కజొన్న',
    kn: 'ಮೆಕ್ಕೆಜೋಳ',
    ml: 'ചോളം',
    bn: 'ভুট্টা',
    or: 'ମକା',
    as: 'মাকৈ',
  },
  chana: {
    en: 'Gram / Chana',
    hi: 'चना',
    mr: 'हरभरा',
    gu: 'ચણા',
    pa: 'ਛੋਲੇ',
    ta: 'கொண்டைக்கடலை',
    te: 'శనగలు',
    kn: 'ಕಡಲೆ',
    ml: 'കടല',
    bn: 'ছোলা',
    or: 'ବୁଟ',
    as: 'বুট',
  },
};

/** Crop Growth Stage Dictionary mapping canonical stage codes to localized terms */
export const STAGE_LOCALIZATIONS: Record<string, Record<Language, string>> = {
  germination: {
    en: 'Germination',
    hi: 'अंकुरण',
    mr: 'अंकुरण',
    gu: 'અંકુરણ',
    pa: 'ਅੰਕੁਰਨ',
    ta: 'முளைப்பு',
    te: 'మొలకెత్తడం',
    kn: 'ಮೊಳಕೆಯೊಡೆಯುವಿಕೆ',
    ml: 'മുളയ്ക്കൽ',
    bn: 'অঙ্কুরোদ্গম',
    or: 'ଅଙ୍କୁରୋଦ୍ଗମ',
    as: 'অংকুৰণ',
  },
  vegetative: {
    en: 'Vegetative',
    hi: 'वानस्पतिक वृद्धि',
    mr: 'शाकीय वाढ',
    gu: 'વાનસ્પતિક વૃદ્ધિ',
    pa: 'ਬੂਟਾ ਵਧਣ ਦੀ ਅਵਸਥਾ',
    ta: 'வளர்ச்சி நிலை',
    te: 'శాకీయ ఎదుగుదల',
    kn: 'ಅಂಗಾಂಗ ಬೆಳೆವಣಿಗೆ',
    ml: 'കായിക വളർച്ച',
    bn: 'অঙ্গজ বৃদ্ধি',
    or: 'ବୃଦ୍ଧି ପର୍ଯ୍ୟାୟ',
    as: 'দৈহিক বৃদ্ধি',
  },
  flowering: {
    en: 'Flowering',
    hi: 'पुष्पन (फूल आना)',
    mr: 'फुलोरा अवस्था',
    gu: 'ફૂલ આવવાની અવસ્થા',
    pa: 'ਫੁੱਲ ਆਉਣ ਦੀ ਅਵਸਥਾ',
    ta: 'பூக்கும் நிலை',
    te: 'పూత దశ',
    kn: 'ಹೂಬಿಡುವ ಹಂತ',
    ml: 'പൂവിടൽ ഘട്ടം',
    bn: 'ফুল ফোটার সময়',
    or: 'ଫୁଲ ଧରିବା ପର୍ଯ୍ୟାୟ',
    as: 'ফুল ধৰা সময়',
  },
  podding: {
    en: 'Pod Development',
    hi: 'फली निर्माण',
    mr: 'शेंगा भरण्याची अवस्था',
    gu: 'શીંગો બેસવાની અવસ્થા',
    pa: 'ਫਲੀਆਂ ਬਣਨ ਦੀ ਅਵਸਥਾ',
    ta: 'காய் பிடிக்கும் நிலை',
    te: 'కాయలు తోడిగే దశ',
    kn: 'ಕಾಯಿ ಕಟ್ಟುವ ಹಂತ',
    ml: 'കായ്കൾ വരും ഘട്ടം',
    bn: 'শুঁটি গঠন',
    or: 'ଛୁଇଁ ବାନ୍ଧିବା ପର୍ଯ୍ୟାୟ',
    as: 'পাঁচ ধৰা',
  },
  maturity: {
    en: 'Maturity',
    hi: 'परिपक्वता (पकना)',
    mr: 'परिपक्वता',
    gu: 'પરિપક્વતા',
    pa: 'ਪੱਕਣ ਦੀ ਅਵਸਥਾ',
    ta: 'முதிர்ச்சி நிலை',
    te: 'పక్వత దశ',
    kn: 'ಪಕ್ವತೆ ಹಂತ',
    ml: 'വിളവെടുപ്പ് പകം',
    bn: 'পরিপক্কতা',
    or: 'ପାଚିବା ପର୍ଯ୍ୟାୟ',
    as: 'পকা সময়',
  },
  harvesting: {
    en: 'Harvesting',
    hi: 'कटाई',
    mr: 'कापणी',
    gu: 'લણણી / કાપણી',
    pa: 'ਕਟਾਈ',
    ta: 'அறுவடை',
    te: 'కోత దశ',
    kn: 'ಕೊಯ್ಲು',
    ml: 'വിളവെടുപ്പ്',
    bn: 'ফসল কাটা',
    or: 'ଅମଳ',
    as: 'দাৱন / চপোৱা',
  },
};

/** Soil Testing Workflow States */
export const SOIL_STATUS_LOCALIZATIONS: Record<string, Record<Language, string>> = {
  booked: {
    en: 'Booked',
    hi: 'बुक किया गया',
    mr: 'बुक केले',
    gu: 'બુક કર્યું',
    pa: 'ਬੁੱਕ ਕੀਤਾ',
    ta: 'முன்பதிவு செய்யப்பட்டது',
    te: 'బుక్ చేయబడింది',
    kn: 'ಬುಕ್ ಮಾಡಲಾಗಿದೆ',
    ml: 'ബുക്ക് ചെയ്തു',
    bn: 'বুক করা হয়েছে',
    or: 'ବୁକ୍ ହୋଇଛି',
    as: 'বুক কৰা হ’ল',
  },
  pickup_requested: {
    en: 'Pickup Requested',
    hi: 'पिकअप अनुरोध किया गया',
    mr: 'पिकअप विनंती केली',
    gu: 'પીકઅપ વિનંતી કરી',
    pa: 'ਪਿਕਅੱਪ ਬੇਨਤੀ ਕੀਤੀ',
    ta: 'பிக்கப் கோரப்பட்டது',
    te: 'పికప్ అభ్యర్థించబడింది',
    kn: 'ಪಿಕಪ್ ವಿನಂತಿಸಲಾಗಿದೆ',
    ml: 'പിക്കപ്പ് അഭ്യർത്ഥിച്ചു',
    bn: 'পিকআপ অনুরোধ করা হয়েছে',
    or: 'ପିକ୍ଅପ୍ ଅନୁରୋଧ ହୋଇଛି',
    as: 'পিকআপ অনুৰোধ কৰা হ’ল',
  },
  agent_assigned: {
    en: 'Agent Assigned',
    hi: 'प्रतिनिधि नियुक्त',
    mr: 'प्रतिनिधी नियुक्त',
    gu: 'એજન્ટ ફાળવ્યો',
    pa: 'ਏਜੰਟ ਨਿਯੁਕਤ',
    ta: 'முகவர் ஒதுக்கப்பட்டார்',
    te: 'ఏజెంట్ కేటాయించబడ్డారు',
    kn: 'ಏಜೆಂಟ್ ನಿಯೋಜಿಸಲಾಗಿದೆ',
    ml: 'ഏജന്റ് നിയോഗിക്കപ്പെട്ടു',
    bn: 'এজেন্ট নিযুক্ত',
    or: 'ଏଜେଣ୍ଟ ନିଯୁକ୍ତ',
    as: 'এজেণ্ট নিযুক্তি দিয়া হ’ল',
  },
  sample_collected: {
    en: 'Sample Collected',
    hi: 'नमूना एकत्र किया गया',
    mr: 'नमूना गोळा केला',
    gu: 'સેમ્પલ લીધું',
    pa: 'ਸੈਂਪਲ ਲਿਆ ਗਿਆ',
    ta: 'மாதிரி சேகரிக்கப்பட்டது',
    te: 'నమూనా సేకరించబడింది',
    kn: 'ಮಾದರಿ ಸಂಗ್ರಹಿಸಲಾಗಿದೆ',
    ml: 'സാമ്പിൾ ശേഖരിച്ചു',
    bn: 'নমুনা সংগৃহীত',
    or: 'ନମୁନା ସଂଗ୍ରହ ହୋଇଛି',
    as: 'নমুনা সংগ্ৰহ কৰা হ’ল',
  },
  testing: {
    en: 'Testing in Progress',
    hi: 'जांच जारी है',
    mr: 'तपासणी सुरू आहे',
    gu: 'તપાસ ચાલુ છે',
    pa: 'ਜਾਂਚ ਚੱਲ ਰਹੀ ਹੈ',
    ta: 'பரிசோதனை நடக்கிறது',
    te: 'పరీక్ష జరుగుతోంది',
    kn: 'ಪರೀಕ್ಷೆ ಪ್ರಗತಿಯಲ್ಲಿದೆ',
    ml: 'പരിശോധന പുരോഗമിക്കുന്നു',
    bn: 'পরীক্ষা চলছে',
    or: 'ପରୀକ୍ଷା ଚାଲିଛି',
    as: 'পৰীক্ষা চলি আছে',
  },
  report_ready: {
    en: 'Report Ready',
    hi: 'रिपोर्ट तैयार है',
    mr: 'अहवाल तयार आहे',
    gu: 'રિપોર્ટ તૈયાર છે',
    pa: 'ਰਿਪੋਰਟ ਤਿਆਰ ਹੈ',
    ta: 'அறிக்கை தயார்',
    te: 'నివేదిక సిద్ధంగా ఉంది',
    kn: 'ವರದಿ ಸಿದ್ಧವಾಗಿದೆ',
    ml: 'റിപ്പോർട്ട് തയ്യാർ',
    bn: 'রিপোর্ট প্রস্তুত',
    or: 'ରିପୋର୍ଟ ପ୍ରସ୍ତୁତ',
    as: 'ৰিপ’ৰ্ট সাজু',
  },
};

/** Localize crop name cleanly using fallback */
export function getLocalizedCropName(cropIdOrName: string, lang: Language): string {
  if (!cropIdOrName) return '';
  const key = cropIdOrName.toLowerCase().trim();
  if (CROP_LOCALIZATIONS[key]?.[lang]) {
    return CROP_LOCALIZATIONS[key][lang];
  }
  // Try i18n resolveKey fallback
  const i18nResolved = resolveKey(lang, `crop.${key}`);
  if (i18nResolved && i18nResolved !== `crop.${key}`) {
    return i18nResolved;
  }
  return cropIdOrName;
}

/** Localize crop stage cleanly */
export function getLocalizedCropStage(stageIdOrName: string, lang: Language): string {
  if (!stageIdOrName) return '';
  const key = stageIdOrName.toLowerCase().trim();
  if (STAGE_LOCALIZATIONS[key]?.[lang]) {
    return STAGE_LOCALIZATIONS[key][lang];
  }
  const i18nResolved = resolveKey(lang, `stage.${key}`);
  if (i18nResolved && i18nResolved !== `stage.${key}`) {
    return i18nResolved;
  }
  return stageIdOrName;
}

/** Localize soil test status */
export function getLocalizedSoilStatus(status: string, lang: Language): string {
  if (!status) return '';
  const key = status.toLowerCase().trim();
  if (SOIL_STATUS_LOCALIZATIONS[key]?.[lang]) {
    return SOIL_STATUS_LOCALIZATIONS[key][lang];
  }
  return status;
}
