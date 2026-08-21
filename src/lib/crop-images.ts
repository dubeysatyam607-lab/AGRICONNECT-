/**
 * Crop Images Helper for AgriConnect Mandi Module.
 * Maps Indian crop names (in English and Hindi) to high-resolution, curated agricultural images.
 */

const CROP_IMAGE_MAP: Record<string, string> = {
  // Cereals & Grains
  wheat: "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&q=80&w=600",
  gehu: "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&q=80&w=600",
  "गेहूं": "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&q=80&w=600",
  "गेहू": "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&q=80&w=600",

  "rice (basmati)": "https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&q=80&w=600",
  rice: "https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&q=80&w=600",
  paddy: "https://images.unsplash.com/photo-1536657464919-892534f60d6e?auto=format&fit=crop&q=80&w=600",
  dhan: "https://images.unsplash.com/photo-1536657464919-892534f60d6e?auto=format&fit=crop&q=80&w=600",
  chawal: "https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&q=80&w=600",
  "धान": "https://images.unsplash.com/photo-1536657464919-892534f60d6e?auto=format&fit=crop&q=80&w=600",
  "चावल": "https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&q=80&w=600",

  maize: "https://images.unsplash.com/photo-1551754655-cd27e38d2076?auto=format&fit=crop&q=80&w=600",
  corn: "https://images.unsplash.com/photo-1551754655-cd27e38d2076?auto=format&fit=crop&q=80&w=600",
  makka: "https://images.unsplash.com/photo-1551754655-cd27e38d2076?auto=format&fit=crop&q=80&w=600",
  "मक्का": "https://images.unsplash.com/photo-1551754655-cd27e38d2076?auto=format&fit=crop&q=80&w=600",

  barley: "https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?auto=format&fit=crop&q=80&w=600",
  jau: "https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?auto=format&fit=crop&q=80&w=600",
  "जौ": "https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?auto=format&fit=crop&q=80&w=600",

  jowar: "https://images.unsplash.com/photo-1592417817098-8f3d6eb18865?auto=format&fit=crop&q=80&w=600",
  "ज्वार": "https://images.unsplash.com/photo-1592417817098-8f3d6eb18865?auto=format&fit=crop&q=80&w=600",
  bajra: "https://images.unsplash.com/photo-1592417817098-8f3d6eb18865?auto=format&fit=crop&q=80&w=600",
  "बाजरा": "https://images.unsplash.com/photo-1592417817098-8f3d6eb18865?auto=format&fit=crop&q=80&w=600",

  // Oilseeds & Cash Crops
  soybean: "https://images.unsplash.com/photo-1599599810769-bcde5a160d32?auto=format&fit=crop&q=80&w=600",
  soyabean: "https://images.unsplash.com/photo-1599599810769-bcde5a160d32?auto=format&fit=crop&q=80&w=600",
  soya: "https://images.unsplash.com/photo-1599599810769-bcde5a160d32?auto=format&fit=crop&q=80&w=600",
  "सोयाबीन": "https://images.unsplash.com/photo-1599599810769-bcde5a160d32?auto=format&fit=crop&q=80&w=600",

  cotton: "https://images.unsplash.com/photo-1605000797498-6f2145b1b9c3?auto=format&fit=crop&q=80&w=600",
  kapas: "https://images.unsplash.com/photo-1605000797498-6f2145b1b9c3?auto=format&fit=crop&q=80&w=600",
  "कपास": "https://images.unsplash.com/photo-1605000797498-6f2145b1b9c3?auto=format&fit=crop&q=80&w=600",
  "रुई": "https://images.unsplash.com/photo-1605000797498-6f2145b1b9c3?auto=format&fit=crop&q=80&w=600",

  mustard: "https://images.unsplash.com/photo-1508747703725-719777637510?auto=format&fit=crop&q=80&w=600",
  sarson: "https://images.unsplash.com/photo-1508747703725-719777637510?auto=format&fit=crop&q=80&w=600",
  sarso: "https://images.unsplash.com/photo-1508747703725-719777637510?auto=format&fit=crop&q=80&w=600",
  rai: "https://images.unsplash.com/photo-1508747703725-719777637510?auto=format&fit=crop&q=80&w=600",
  "सरसों": "https://images.unsplash.com/photo-1508747703725-719777637510?auto=format&fit=crop&q=80&w=600",
  "राई": "https://images.unsplash.com/photo-1508747703725-719777637510?auto=format&fit=crop&q=80&w=600",

  groundnut: "https://images.unsplash.com/photo-1567406213238-9631637e1c67?auto=format&fit=crop&q=80&w=600",
  peanut: "https://images.unsplash.com/photo-1567406213238-9631637e1c67?auto=format&fit=crop&q=80&w=600",
  mungfali: "https://images.unsplash.com/photo-1567406213238-9631637e1c67?auto=format&fit=crop&q=80&w=600",
  "मूंगफली": "https://images.unsplash.com/photo-1567406213238-9631637e1c67?auto=format&fit=crop&q=80&w=600",

  sunflower: "https://images.unsplash.com/photo-1597848212624-a19eb35e2651?auto=format&fit=crop&q=80&w=600",
  surajmukhi: "https://images.unsplash.com/photo-1597848212624-a19eb35e2651?auto=format&fit=crop&q=80&w=600",
  "सूरजमुखी": "https://images.unsplash.com/photo-1597848212624-a19eb35e2651?auto=format&fit=crop&q=80&w=600",

  sugarcane: "https://images.unsplash.com/photo-1589923188900-85dae523342b?auto=format&fit=crop&q=80&w=600",
  ganna: "https://images.unsplash.com/photo-1589923188900-85dae523342b?auto=format&fit=crop&q=80&w=600",
  "गन्ना": "https://images.unsplash.com/photo-1589923188900-85dae523342b?auto=format&fit=crop&q=80&w=600",

  // Vegetables
  onion: "https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?auto=format&fit=crop&q=80&w=600",
  pyaj: "https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?auto=format&fit=crop&q=80&w=600",
  piyaj: "https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?auto=format&fit=crop&q=80&w=600",
  kanda: "https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?auto=format&fit=crop&q=80&w=600",
  "प्याज": "https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?auto=format&fit=crop&q=80&w=600",
  "कांदा": "https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?auto=format&fit=crop&q=80&w=600",

  potato: "https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&q=80&w=600",
  aloo: "https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&q=80&w=600",
  alu: "https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&q=80&w=600",
  batata: "https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&q=80&w=600",
  "आलू": "https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&q=80&w=600",
  "बटाटा": "https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&q=80&w=600",

  tomato: "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&q=80&w=600",
  tamatar: "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&q=80&w=600",
  tamatr: "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&q=80&w=600",
  "टमाटर": "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&q=80&w=600",

  garlic: "https://images.unsplash.com/photo-1540148426945-6cf22a6b2383?auto=format&fit=crop&q=80&w=600",
  lahsun: "https://images.unsplash.com/photo-1540148426945-6cf22a6b2383?auto=format&fit=crop&q=80&w=600",
  lasun: "https://images.unsplash.com/photo-1540148426945-6cf22a6b2383?auto=format&fit=crop&q=80&w=600",
  "लहसुन": "https://images.unsplash.com/photo-1540148426945-6cf22a6b2383?auto=format&fit=crop&q=80&w=600",

  ginger: "https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&q=80&w=600",
  adrak: "https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&q=80&w=600",
  "अदरक": "https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&q=80&w=600",

  cabbage: "https://images.unsplash.com/photo-1594282486552-05b4d80fbb9f?auto=format&fit=crop&q=80&w=600",
  patta: "https://images.unsplash.com/photo-1594282486552-05b4d80fbb9f?auto=format&fit=crop&q=80&w=600",
  "पत्ता गोभी": "https://images.unsplash.com/photo-1594282486552-05b4d80fbb9f?auto=format&fit=crop&q=80&w=600",
  "बंदगोभी": "https://images.unsplash.com/photo-1594282486552-05b4d80fbb9f?auto=format&fit=crop&q=80&w=600",

  cauliflower: "https://images.unsplash.com/photo-1568584711075-3d021a7c3ca3?auto=format&fit=crop&q=80&w=600",
  phool: "https://images.unsplash.com/photo-1568584711075-3d021a7c3ca3?auto=format&fit=crop&q=80&w=600",
  "फूल गोभी": "https://images.unsplash.com/photo-1568584711075-3d021a7c3ca3?auto=format&fit=crop&q=80&w=600",

  "green peas": "https://images.unsplash.com/photo-1587735243615-c03f25aaff15?auto=format&fit=crop&q=80&w=600",
  peas: "https://images.unsplash.com/photo-1587735243615-c03f25aaff15?auto=format&fit=crop&q=80&w=600",
  pea: "https://images.unsplash.com/photo-1587735243615-c03f25aaff15?auto=format&fit=crop&q=80&w=600",
  matar: "https://images.unsplash.com/photo-1587735243615-c03f25aaff15?auto=format&fit=crop&q=80&w=600",
  "मटर": "https://images.unsplash.com/photo-1587735243615-c03f25aaff15?auto=format&fit=crop&q=80&w=600",

  carrot: "https://images.unsplash.com/photo-1598170845058-128a34a49470?auto=format&fit=crop&q=80&w=600",
  gajar: "https://images.unsplash.com/photo-1598170845058-128a34a49470?auto=format&fit=crop&q=80&w=600",
  "गाजर": "https://images.unsplash.com/photo-1598170845058-128a34a49470?auto=format&fit=crop&q=80&w=600",

  brinjal: "https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&q=80&w=600",
  eggplant: "https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&q=80&w=600",
  baingan: "https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&q=80&w=600",
  "बैंगन": "https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&q=80&w=600",

  okra: "https://images.unsplash.com/photo-1605000797498-6f2145b1b9c3?auto=format&fit=crop&q=80&w=600",
  bhindi: "https://images.unsplash.com/photo-1605000797498-6f2145b1b9c3?auto=format&fit=crop&q=80&w=600",
  "भिंडी": "https://images.unsplash.com/photo-1605000797498-6f2145b1b9c3?auto=format&fit=crop&q=80&w=600",

  spinach: "https://images.unsplash.com/photo-1576045057995-568f588f82fb?auto=format&fit=crop&q=80&w=600",
  palak: "https://images.unsplash.com/photo-1576045057995-568f588f82fb?auto=format&fit=crop&q=80&w=600",
  "पालक": "https://images.unsplash.com/photo-1576045057995-568f588f82fb?auto=format&fit=crop&q=80&w=600",

  "bitter gourd": "https://images.unsplash.com/photo-1606865923806-e24e9d4a0da3?auto=format&fit=crop&q=80&w=600",
  karela: "https://images.unsplash.com/photo-1606865923806-e24e9d4a0da3?auto=format&fit=crop&q=80&w=600",
  "करेला": "https://images.unsplash.com/photo-1606865923806-e24e9d4a0da3?auto=format&fit=crop&q=80&w=600",

  "bottle gourd": "https://images.unsplash.com/photo-1606865923806-e24e9d4a0da3?auto=format&fit=crop&q=80&w=600",
  lauki: "https://images.unsplash.com/photo-1606865923806-e24e9d4a0da3?auto=format&fit=crop&q=80&w=600",
  "लौकी": "https://images.unsplash.com/photo-1606865923806-e24e9d4a0da3?auto=format&fit=crop&q=80&w=600",

  // Pulses & Spices
  chana: "https://images.unsplash.com/photo-1515543237350-b3eea1ec8082?auto=format&fit=crop&q=80&w=600",
  gram: "https://images.unsplash.com/photo-1515543237350-b3eea1ec8082?auto=format&fit=crop&q=80&w=600",
  chickpea: "https://images.unsplash.com/photo-1515543237350-b3eea1ec8082?auto=format&fit=crop&q=80&w=600",
  "चना": "https://images.unsplash.com/photo-1515543237350-b3eea1ec8082?auto=format&fit=crop&q=80&w=600",

  moong: "https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&q=80&w=600",
  mung: "https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&q=80&w=600",
  "मूंग": "https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&q=80&w=600",

  tur: "https://images.unsplash.com/photo-1515543237350-b3eea1ec8082?auto=format&fit=crop&q=80&w=600",
  arhar: "https://images.unsplash.com/photo-1515543237350-b3eea1ec8082?auto=format&fit=crop&q=80&w=600",
  tuvar: "https://images.unsplash.com/photo-1515543237350-b3eea1ec8082?auto=format&fit=crop&q=80&w=600",
  "अरहर": "https://images.unsplash.com/photo-1515543237350-b3eea1ec8082?auto=format&fit=crop&q=80&w=600",
  "तुअर": "https://images.unsplash.com/photo-1515543237350-b3eea1ec8082?auto=format&fit=crop&q=80&w=600",

  masoor: "https://images.unsplash.com/photo-1515543237350-b3eea1ec8082?auto=format&fit=crop&q=80&w=600",
  lentil: "https://images.unsplash.com/photo-1515543237350-b3eea1ec8082?auto=format&fit=crop&q=80&w=600",
  "मसूर": "https://images.unsplash.com/photo-1515543237350-b3eea1ec8082?auto=format&fit=crop&q=80&w=600",

  cumin: "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&q=80&w=600",
  jeera: "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&q=80&w=600",
  jira: "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&q=80&w=600",
  "जीरा": "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&q=80&w=600",

  turmeric: "https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&q=80&w=600",
  haldi: "https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&q=80&w=600",
  "हल्दी": "https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&q=80&w=600",

  chilli: "https://images.unsplash.com/photo-1588252303782-cb80119abd6d?auto=format&fit=crop&q=80&w=600",
  chilly: "https://images.unsplash.com/photo-1588252303782-cb80119abd6d?auto=format&fit=crop&q=80&w=600",
  chili: "https://images.unsplash.com/photo-1588252303782-cb80119abd6d?auto=format&fit=crop&q=80&w=600",
  mirch: "https://images.unsplash.com/photo-1588252303782-cb80119abd6d?auto=format&fit=crop&q=80&w=600",
  mirchi: "https://images.unsplash.com/photo-1588252303782-cb80119abd6d?auto=format&fit=crop&q=80&w=600",
  "मिर्च": "https://images.unsplash.com/photo-1588252303782-cb80119abd6d?auto=format&fit=crop&q=80&w=600",
  "हरी मिर्च": "https://images.unsplash.com/photo-1588252303782-cb80119abd6d?auto=format&fit=crop&q=80&w=600",
  "लाल मिर्च": "https://images.unsplash.com/photo-1588252303782-cb80119abd6d?auto=format&fit=crop&q=80&w=600",

  coriander: "https://images.unsplash.com/photo-1599599810769-bcde5a160d32?auto=format&fit=crop&q=80&w=600",
  dhania: "https://images.unsplash.com/photo-1599599810769-bcde5a160d32?auto=format&fit=crop&q=80&w=600",
  dhaniya: "https://images.unsplash.com/photo-1599599810769-bcde5a160d32?auto=format&fit=crop&q=80&w=600",
  "धनिया": "https://images.unsplash.com/photo-1599599810769-bcde5a160d32?auto=format&fit=crop&q=80&w=600",

  // Fruits
  banana: "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?auto=format&fit=crop&q=80&w=600",
  kela: "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?auto=format&fit=crop&q=80&w=600",
  "केला": "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?auto=format&fit=crop&q=80&w=600",

  mango: "https://images.unsplash.com/photo-1553279768-865429fa0078?auto=format&fit=crop&q=80&w=600",
  aam: "https://images.unsplash.com/photo-1553279768-865429fa0078?auto=format&fit=crop&q=80&w=600",
  "आम": "https://images.unsplash.com/photo-1553279768-865429fa0078?auto=format&fit=crop&q=80&w=600",

  apple: "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?auto=format&fit=crop&q=80&w=600",
  seb: "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?auto=format&fit=crop&q=80&w=600",
  "सेब": "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?auto=format&fit=crop&q=80&w=600",

  orange: "https://images.unsplash.com/photo-1611080626919-7cf5a9dbab5b?auto=format&fit=crop&q=80&w=600",
  santra: "https://images.unsplash.com/photo-1611080626919-7cf5a9dbab5b?auto=format&fit=crop&q=80&w=600",
  "संतरा": "https://images.unsplash.com/photo-1611080626919-7cf5a9dbab5b?auto=format&fit=crop&q=80&w=600",

  grapes: "https://images.unsplash.com/photo-1537640538966-79f369143f8f?auto=format&fit=crop&q=80&w=600",
  angoor: "https://images.unsplash.com/photo-1537640538966-79f369143f8f?auto=format&fit=crop&q=80&w=600",
  "अंगूर": "https://images.unsplash.com/photo-1537640538966-79f369143f8f?auto=format&fit=crop&q=80&w=600",

  pomegranate: "https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&q=80&w=600",
  anaar: "https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&q=80&w=600",
  "अनार": "https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&q=80&w=600",

  papaya: "https://images.unsplash.com/photo-1553279768-865429fa0078?auto=format&fit=crop&q=80&w=600",
  papita: "https://images.unsplash.com/photo-1553279768-865429fa0078?auto=format&fit=crop&q=80&w=600",
  "पपीता": "https://images.unsplash.com/photo-1553279768-865429fa0078?auto=format&fit=crop&q=80&w=600",

  guava: "https://images.unsplash.com/photo-1553279768-865429fa0078?auto=format&fit=crop&q=80&w=600",
  amrood: "https://images.unsplash.com/photo-1553279768-865429fa0078?auto=format&fit=crop&q=80&w=600",
  "अमरूद": "https://images.unsplash.com/photo-1553279768-865429fa0078?auto=format&fit=crop&q=80&w=600",

  lemon: "https://images.unsplash.com/photo-1590502593747-42a996133562?auto=format&fit=crop&q=80&w=600",
  nimbu: "https://images.unsplash.com/photo-1590502593747-42a996133562?auto=format&fit=crop&q=80&w=600",
  "नींबू": "https://images.unsplash.com/photo-1590502593747-42a996133562?auto=format&fit=crop&q=80&w=600",

  // Default fallback
  default: "https://images.unsplash.com/photo-1574943320219-553eb213f72d?auto=format&fit=crop&q=80&w=600",
};

/**
 * Secondary backup image map using independent, reliable CDN real photographs
 */
const CROP_BACKUP_IMAGE_MAP: Record<string, string> = {
  wheat: "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&q=80&w=600",
  rice: "https://images.unsplash.com/photo-1536657464919-892534f60d6e?auto=format&fit=crop&q=80&w=600",
  paddy: "https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&q=80&w=600",
  maize: "https://images.unsplash.com/photo-1551754655-cd27e38d2076?auto=format&fit=crop&q=80&w=600",
  soybean: "https://images.unsplash.com/photo-1599599810769-bcde5a160d32?auto=format&fit=crop&q=80&w=600",
  cotton: "https://images.unsplash.com/photo-1605000797498-6f2145b1b9c3?auto=format&fit=crop&q=80&w=600",
  mustard: "https://images.unsplash.com/photo-1508747703725-719777637510?auto=format&fit=crop&q=80&w=600",
  onion: "https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?auto=format&fit=crop&q=80&w=600",
  potato: "https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&q=80&w=600",
  tomato: "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&q=80&w=600",
  chana: "https://images.unsplash.com/photo-1515543237350-b3eea1ec8082?auto=format&fit=crop&q=80&w=600",
  garlic: "https://images.unsplash.com/photo-1540148426945-6cf22a6b2383?auto=format&fit=crop&q=80&w=600",
  ginger: "https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&q=80&w=600",
  chilli: "https://images.unsplash.com/photo-1588252303782-cb80119abd6d?auto=format&fit=crop&q=80&w=600",
  turmeric: "https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&q=80&w=600",
  cumin: "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&q=80&w=600",
  groundnut: "https://images.unsplash.com/photo-1567406213238-9631637e1c67?auto=format&fit=crop&q=80&w=600",
  sugarcane: "https://images.unsplash.com/photo-1589923188900-85dae523342b?auto=format&fit=crop&q=80&w=600",
  banana: "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?auto=format&fit=crop&q=80&w=600",
  mango: "https://images.unsplash.com/photo-1553279768-865429fa0078?auto=format&fit=crop&q=80&w=600",
  apple: "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?auto=format&fit=crop&q=80&w=600",
  orange: "https://images.unsplash.com/photo-1611080626919-7cf5a9dbab5b?auto=format&fit=crop&q=80&w=600",
  default: "https://images.unsplash.com/photo-1500937386664-56d1dfef3854?auto=format&fit=crop&q=80&w=600",
};

/**
 * Category-level real photo fallbacks
 */
export const CATEGORY_CROP_IMAGES: Record<string, string> = {
  Cereals: "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&q=80&w=600",
  Pulses: "https://images.unsplash.com/photo-1515543237350-b3eea1ec8082?auto=format&fit=crop&q=80&w=600",
  Vegetables: "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&q=80&w=600",
  Fruits: "https://images.unsplash.com/photo-1553279768-865429fa0078?auto=format&fit=crop&q=80&w=600",
  Spices: "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&q=80&w=600",
  Oilseeds: "https://images.unsplash.com/photo-1508747703725-719777637510?auto=format&fit=crop&q=80&w=600",
  Commercial: "https://images.unsplash.com/photo-1605000797498-6f2145b1b9c3?auto=format&fit=crop&q=80&w=600",
  General: "https://images.unsplash.com/photo-1574943320219-553eb213f72d?auto=format&fit=crop&q=80&w=600",
};

/**
 * Get high-quality image URL for a given crop name.
 */
export function getCropImage(cropName: string): string {
  if (!cropName) return CROP_IMAGE_MAP.default;

  const lower = cropName.toLowerCase().trim();

  // Exact or word boundary match
  for (const [key, value] of Object.entries(CROP_IMAGE_MAP)) {
    if (key !== "default" && (lower.includes(key) || key.includes(lower))) {
      return value;
    }
  }

  // Token match
  // eslint-disable-next-line no-misleading-character-class
  const tokens = lower.split(/[^a-z0-9\u0900-\u097F]+/u).filter(Boolean);
  for (const token of tokens) {
    if (token.length < 3) continue;
    for (const [key, value] of Object.entries(CROP_IMAGE_MAP)) {
      if (key !== "default" && (token.includes(key) || key.includes(token))) {
        return value;
      }
    }
  }

  // Category fallback to real photo
  const category = getCropCategory(cropName);
  return CATEGORY_CROP_IMAGES[category] || CROP_IMAGE_MAP.default;
}

/**
 * Secondary fallback photo for a crop.
 */
export function getCropBackupImage(cropName: string): string {
  if (!cropName) return CROP_BACKUP_IMAGE_MAP.default;
  const lower = cropName.toLowerCase().trim();

  for (const [key, value] of Object.entries(CROP_BACKUP_IMAGE_MAP)) {
    if (key !== "default" && (lower.includes(key) || key.includes(lower))) {
      return value;
    }
  }

  const category = getCropCategory(cropName);
  return CATEGORY_CROP_IMAGES[category] || CROP_BACKUP_IMAGE_MAP.default;
}

/**
 * Classify a crop into one of 7 standard categories.
 */
export function getCropCategory(cropName: string): string {
  const lower = (cropName || "").toLowerCase();
  if (/wheat|rice|paddy|maize|corn|jowar|bajra|barley|gehu|dhan|chawal|makka|jau|गेहूं|चावल|धान|मक्का|ज्वार|बाजरा/.test(lower)) return "Cereals";
  if (/chana|gram|chickpea|moong|tur|arhar|masoor|pulse|dal|lentil|tuvar|चना|मूंग|अरहर|तुअर|मसूर|दाल/.test(lower)) return "Pulses";
  if (/onion|potato|tomato|garlic|cabbage|cauliflower|peas|carrot|brinjal|okra|spinach|gourd|vegetable|pyaj|piyaj|kanda|aloo|alu|batata|tamatar|tamatr|lahsun|adrak|patta|phool|matar|gajar|baingan|bhindi|palak|karela|lauki|प्याज|आलू|टमाटर|लहसुन|अदरक|गोभी|मटर|गाजर|बैंगन|भिंडी|पालक|करेला|लौकी/.test(lower)) return "Vegetables";
  if (/banana|mango|apple|orange|grapes|pomegranate|papaya|guava|fruit|kela|aam|seb|santra|angoor|anaar|papita|amrood|lemon|nimbu|केला|आम|सेब|संतरा|अंगूर|अनार|पपीता|अमरूद|नींबू/.test(lower)) return "Fruits";
  if (/cumin|turmeric|chilli|chilly|chili|coriander|cardamom|clove|ginger|garlic|spice|jeera|jira|haldi|mirch|mirchi|dhania|dhaniya|जीरा|हल्दी|मिर्च|धनिया/.test(lower)) return "Spices";
  if (/soybean|soyabean|soya|mustard|sarson|sarso|rai|groundnut|peanut|mungfali|sunflower|surajmukhi|sesame|til|oil|सोयाबीन|सरसों|राई|मूंगफली|सूरजमुखी|तिल/.test(lower)) return "Oilseeds";
  if (/cotton|kapas|sugarcane|ganna|jute|tobacco|कपास|गन्ना/.test(lower)) return "Commercial";
  return "General";
}
