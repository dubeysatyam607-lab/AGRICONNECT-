/**
 * VoiceEngine — Crop Entity Extraction & Consistency Protection
 *
 * Prevents crop hallucinations (e.g. user asks for tomato, AI talks about soybean).
 * Extracts canonical crop, market, and intent.
 */

export interface ExtractedEntities {
  crop: string | null;
  cropDisplayName: { hi: string; en: string; hinglish: string } | null;
  mandi: string | null;
  state: string | null;
  intent: 'mandi_price' | 'fertilizer' | 'irrigation' | 'pest' | 'disease' | 'scheme' | 'weather' | 'general';
  rawQuery: string;
}

export interface CropDefinition {
  canonical: string;
  hi: string;
  en: string;
  hinglish: string;
  aliases: string[];
}

export const CROP_DICTIONARY: Record<string, CropDefinition> = {
  tomato: {
    canonical: 'tomato',
    hi: 'टमाटर',
    en: 'Tomato',
    hinglish: 'Tamatar',
    aliases: ['tamatar', 'tamatr', 'tomato', 'tamater', 'टमाटर', 'टमाटार'],
  },
  wheat: {
    canonical: 'wheat',
    hi: 'गेहूं',
    en: 'Wheat',
    hinglish: 'Gehu',
    aliases: ['gehu', 'gehun', 'wheat', 'gehoon', 'गेहूं', 'गेहू', 'कनक', 'kanak'],
  },
  soybean: {
    canonical: 'soybean',
    hi: 'सोयाबीन',
    en: 'Soybean',
    hinglish: 'Soyabean',
    aliases: ['soyabean', 'soybean', 'soya', 'soya bean', 'सोयाबीन', 'सोया'],
  },
  onion: {
    canonical: 'onion',
    hi: 'प्याज',
    en: 'Onion',
    hinglish: 'Pyaz',
    aliases: ['pyaz', 'pyaj', 'pyaaz', 'onion', 'kanda', 'प्याज', 'कांदा', 'प्याज़'],
  },
  potato: {
    canonical: 'potato',
    hi: 'आलू',
    en: 'Potato',
    hinglish: 'Aloo',
    aliases: ['aloo', 'aalu', 'potato', 'batata', 'आलू', 'बटाटा'],
  },
  garlic: {
    canonical: 'garlic',
    hi: 'लहसुन',
    en: 'Garlic',
    hinglish: 'Lahsun',
    aliases: ['lahsun', 'lasun', 'lehsun', 'garlic', 'लहसुन', 'लहसून'],
  },
  cotton: {
    canonical: 'cotton',
    hi: 'कपास',
    en: 'Cotton',
    hinglish: 'Kapas',
    aliases: ['kapas', 'cotton', 'kapaas', 'ruiee', 'rui', 'कपास', 'रूई'],
  },
  mustard: {
    canonical: 'mustard',
    hi: 'सरसों',
    en: 'Mustard',
    hinglish: 'Sarson',
    aliases: ['sarson', 'sarsonn', 'mustard', 'rai', 'toria', 'सरसों', 'राई', 'तोरिया'],
  },
  chilli: {
    canonical: 'chilli',
    hi: 'मिर्च',
    en: 'Chilli',
    hinglish: 'Mirch',
    aliases: ['mirch', 'mirchi', 'chilli', 'chili', 'red chilli', 'green chilli', 'मिर्च', 'हरी मिर्च', 'लाल मिर्च'],
  },
  rice: {
    canonical: 'rice',
    hi: 'धान / चावल',
    en: 'Rice / Paddy',
    hinglish: 'Dhan / Chawal',
    aliases: ['dhan', 'chawal', 'paddy', 'rice', 'धान', 'चावल', 'बासमती', 'basmati'],
  },
  maize: {
    canonical: 'maize',
    hi: 'मक्का',
    en: 'Maize / Corn',
    hinglish: 'Makka',
    aliases: ['makka', 'makai', 'maize', 'corn', 'मक्का', 'मकई', 'भुट्टा', 'bhutta'],
  },
  sugarcane: {
    canonical: 'sugarcane',
    hi: 'गन्ना',
    en: 'Sugarcane',
    hinglish: 'Ganna',
    aliases: ['ganna', 'sugarcane', 'ikshu', 'गन्ना', 'ईख'],
  },
  groundnut: {
    canonical: 'groundnut',
    hi: 'मूंगफली',
    en: 'Groundnut / Peanut',
    hinglish: 'Mungfali',
    aliases: ['mungfali', 'moongfali', 'groundnut', 'peanut', 'singdana', 'मूंगफली', 'सिंगदाना'],
  },
  gram: {
    canonical: 'gram',
    hi: 'चना',
    en: 'Gram / Chickpea',
    hinglish: 'Chana',
    aliases: ['chana', 'channa', 'gram', 'chickpea', 'desi chana', 'चना', 'छोला'],
  },
  ginger: {
    canonical: 'ginger',
    hi: 'अदरक',
    en: 'Ginger',
    hinglish: 'Adrak',
    aliases: ['adrak', 'ginger', 'aada', 'अदरक', 'सोंठ'],
  },
  turmeric: {
    canonical: 'turmeric',
    hi: 'हल्दी',
    en: 'Turmeric',
    hinglish: 'Haldi',
    aliases: ['haldi', 'turmeric', 'हल्दी'],
  },
  cumin: {
    canonical: 'cumin',
    hi: 'जीरा',
    en: 'Cumin',
    hinglish: 'Jeera',
    aliases: ['jeera', 'jira', 'cumin', 'जीरा'],
  },
};

const MANDI_LOCATIONS: Record<string, { hi: string; en: string; state: string }> = {
  indore: { hi: 'इंदौर', en: 'Indore', state: 'Madhya Pradesh' },
  ujjain: { hi: 'उज्जैन', en: 'Ujjain', state: 'Madhya Pradesh' },
  dewas: { hi: 'देवास', en: 'Dewas', state: 'Madhya Pradesh' },
  bhopal: { hi: 'भोपाल', en: 'Bhopal', state: 'Madhya Pradesh' },
  mandsaur: { hi: 'मंदसौर', en: 'Mandsaur', state: 'Madhya Pradesh' },
  neemuch: { hi: 'नीमच', en: 'Neemuch', state: 'Madhya Pradesh' },
  kota: { hi: 'कोटा', en: 'Kota', state: 'Rajasthan' },
  jaipur: { hi: 'जयपुर', en: 'Jaipur', state: 'Rajasthan' },
  nashik: { hi: 'नासिक', en: 'Nashik', state: 'Maharashtra' },
  pune: { hi: 'पुणे', en: 'Pune', state: 'Maharashtra' },
  mumbai: { hi: 'मुंबई', en: 'Mumbai', state: 'Maharashtra' },
  nagpur: { hi: 'नागपुर', en: 'Nagpur', state: 'Maharashtra' },
  ludhiana: { hi: 'लुधियाना', en: 'Ludhiana', state: 'Punjab' },
  amritsar: { hi: 'अमृतसर', en: 'Amritsar', state: 'Punjab' },
  karnal: { hi: 'करनाल', en: 'Karnal', state: 'Haryana' },
  delhi: { hi: 'दिल्ली (आज़ादपुर)', en: 'Delhi Azadpur', state: 'Delhi' },
  agra: { hi: 'आगरा', en: 'Agra', state: 'Uttar Pradesh' },
  varanasi: { hi: 'वाराणसी', en: 'Varanasi', state: 'Uttar Pradesh' },
  kanpur: { hi: 'कानपुर', en: 'Kanpur', state: 'Uttar Pradesh' },
  patna: { hi: 'पटना', en: 'Patna', state: 'Bihar' },
  ahmedabad: { hi: 'अहमदाबाद', en: 'Ahmedabad', state: 'Gujarat' },
  rajkot: { hi: 'राजकोट', en: 'Rajkot', state: 'Gujarat' },
};

/**
 * Extracts crop, mandi, and intent from user query with STT error tolerance.
 */
export function extractEntities(query: string): ExtractedEntities {
  const normalized = query.toLowerCase().trim();

  // 1. Identify Crop Entity
  let matchedCrop: CropDefinition | null = null;

  for (const def of Object.values(CROP_DICTIONARY)) {
    for (const alias of def.aliases) {
      // Strict regex boundary matching to prevent substring collisions (e.g. 'aam' in 'naam')
      const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(^|\\s|[.,!?;])${escaped}($|\\s|[.,!?;])`, 'i');
      if (regex.test(normalized)) {
        matchedCrop = def;
        break;
      }
    }
    if (matchedCrop) break;
  }

  // 2. Identify Mandi / Market
  let matchedMandi: string | null = null;
  let matchedState: string | null = null;

  for (const [key, loc] of Object.entries(MANDI_LOCATIONS)) {
    if (
      normalized.includes(key) ||
      normalized.includes(loc.en.toLowerCase()) ||
      query.includes(loc.hi)
    ) {
      matchedMandi = loc.en;
      matchedState = loc.state;
      break;
    }
  }

  // 3. Identify Intent
  let intent: ExtractedEntities['intent'] = 'general';

  if (
    ['bhav', 'rate', 'mandi', 'bhaav', 'price', 'daam', 'भाव', 'दर', 'दाम', 'मंडी', 'किमत', 'कीमत'].some((k) =>
      normalized.includes(k),
    )
  ) {
    intent = 'mandi_price';
  } else if (
    ['fertilizer', 'khad', 'khaad', 'urea', 'dap', 'npk', 'खाद', 'यूरिया', 'डीएपी'].some((k) =>
      normalized.includes(k),
    )
  ) {
    intent = 'fertilizer';
  } else if (
    ['irrigation', 'paani', 'pani', 'sinchai', 'सिंचाई', 'पानी'].some((k) =>
      normalized.includes(k),
    )
  ) {
    intent = 'irrigation';
  } else if (
    ['keeda', 'kida', 'pest', 'ill', 'illi', 'sundi', 'कीट', 'कीड़ा', 'इल्ली', 'सुंडी'].some((k) =>
      normalized.includes(k),
    )
  ) {
    intent = 'pest';
  } else if (
    ['rog', 'bimari', 'disease', 'yellow', 'peeli', 'blight', 'रोग', 'बीमारी', 'पीली', 'धब्बे'].some((k) =>
      normalized.includes(k),
    )
  ) {
    intent = 'disease';
  } else if (
    ['yojana', 'scheme', 'subsidy', 'pmkisan', 'pm-kisan', 'kcc', 'योजना', 'सब्सिडी', 'कर्ज'].some((k) =>
      normalized.includes(k),
    )
  ) {
    intent = 'scheme';
  } else if (
    ['mausam', 'weather', 'barish', 'rain', 'मौसम', 'बारिश', 'तापमान', 'पाला'].some((k) =>
      normalized.includes(k),
    )
  ) {
    intent = 'weather';
  }

  return {
    crop: matchedCrop ? matchedCrop.canonical : null,
    cropDisplayName: matchedCrop
      ? { hi: matchedCrop.hi, en: matchedCrop.en, hinglish: matchedCrop.hinglish }
      : null,
    mandi: matchedMandi,
    state: matchedState,
    intent,
    rawQuery: query,
  };
}

/**
 * Consistency Check: Verify that the generated answer matches the requested crop.
 * If user requested Tomato, answer MUST NOT discuss Soybean or Wheat instead.
 */
export function verifyCropConsistency(requestedCrop: string | null, responseText: string): boolean {
  if (!requestedCrop) return true;

  const respLower = responseText.toLowerCase();
  const reqDef = CROP_DICTIONARY[requestedCrop];
  if (!reqDef) return true;

  // Check if any other distinct crop was answered while requested crop was missing
  for (const [otherKey, otherDef] of Object.entries(CROP_DICTIONARY)) {
    if (otherKey === requestedCrop) continue;

    const mentionsOther = otherDef.aliases.some((alias) =>
      respLower.includes(alias.toLowerCase()),
    );
    const mentionsRequested = reqDef.aliases.some((alias) =>
      respLower.includes(alias.toLowerCase()),
    );

    // If it heavily mentions another crop without mentioning the requested crop, it is a mismatch!
    if (mentionsOther && !mentionsRequested) {
      return false;
    }
  }

  return true;
}
