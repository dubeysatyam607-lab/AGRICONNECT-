/**
 * Crop Images Helper for AgriConnect Mandi Module.
 * Maps Indian crop names (in English and Hindi) to high-resolution, curated agricultural images.
 */

const CROP_IMAGE_MAP: Record<string, string> = {
  // Cereals & Grains
  wheat: "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&q=80&w=400",
  "rice (basmati)": "https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&q=80&w=400",
  rice: "https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&q=80&w=400",
  paddy: "https://images.unsplash.com/photo-1536657464919-892534f60d6e?auto=format&fit=crop&q=80&w=400",
  maize: "https://images.unsplash.com/photo-1551754655-cd27e38d2076?auto=format&fit=crop&q=80&w=400",
  corn: "https://images.unsplash.com/photo-1551754655-cd27e38d2076?auto=format&fit=crop&q=80&w=400",
  barley: "https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?auto=format&fit=crop&q=80&w=400",
  jowar: "https://images.unsplash.com/photo-1592417817098-8f3d6eb18865?auto=format&fit=crop&q=80&w=400",
  bajra: "https://images.unsplash.com/photo-1592417817098-8f3d6eb18865?auto=format&fit=crop&q=80&w=400",

  // Oilseeds & Cash Crops
  soybean: "https://images.unsplash.com/photo-1599599810769-bcde5a160d32?auto=format&fit=crop&q=80&w=400",
  cotton: "https://images.unsplash.com/photo-1605000797498-6f2145b1b9c3?auto=format&fit=crop&q=80&w=400",
  mustard: "https://images.unsplash.com/photo-1508747703725-719777637510?auto=format&fit=crop&q=80&w=400",
  groundnut: "https://images.unsplash.com/photo-1567406213238-9631637e1c67?auto=format&fit=crop&q=80&w=400",
  peanut: "https://images.unsplash.com/photo-1567406213238-9631637e1c67?auto=format&fit=crop&q=80&w=400",
  sunflower: "https://images.unsplash.com/photo-1597848212624-a19eb35e2651?auto=format&fit=crop&q=80&w=400",
  sugarcane: "https://images.unsplash.com/photo-1589923188900-85dae523342b?auto=format&fit=crop&q=80&w=400",

  // Vegetables
  onion: "https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?auto=format&fit=crop&q=80&w=400",
  potato: "https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&q=80&w=400",
  tomato: "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&q=80&w=400",
  garlic: "https://images.unsplash.com/photo-1540148426945-6cf22a6b2383?auto=format&fit=crop&q=80&w=400",
  cabbage: "https://images.unsplash.com/photo-1594282486552-05b4d80fbb9f?auto=format&fit=crop&q=80&w=400",
  cauliflower: "https://images.unsplash.com/photo-1568584711075-3d021a7c3ca3?auto=format&fit=crop&q=80&w=400",
  "green peas": "https://images.unsplash.com/photo-1587735243615-c03f25aaff15?auto=format&fit=crop&q=80&w=400",
  pea: "https://images.unsplash.com/photo-1587735243615-c03f25aaff15?auto=format&fit=crop&q=80&w=400",
  carrot: "https://images.unsplash.com/photo-1598170845058-128a34a49470?auto=format&fit=crop&q=80&w=400",
  brinjal: "https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&q=80&w=400",
  eggplant: "https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&q=80&w=400",
  okra: "https://images.unsplash.com/photo-1605000797498-6f2145b1b9c3?auto=format&fit=crop&q=80&w=400",
  spinach: "https://images.unsplash.com/photo-1576045057995-568f588f82fb?auto=format&fit=crop&q=80&w=400",
  "bitter gourd": "https://images.unsplash.com/photo-1606865923806-e24e9d4a0da3?auto=format&fit=crop&q=80&w=400",

  // Pulses & Spices
  chana: "https://images.unsplash.com/photo-1515543237350-b3eea1ec8082?auto=format&fit=crop&q=80&w=400",
  gram: "https://images.unsplash.com/photo-1515543237350-b3eea1ec8082?auto=format&fit=crop&q=80&w=400",
  chickpea: "https://images.unsplash.com/photo-1515543237350-b3eea1ec8082?auto=format&fit=crop&q=80&w=400",
  moong: "https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&q=80&w=400",
  tur: "https://images.unsplash.com/photo-1515543237350-b3eea1ec8082?auto=format&fit=crop&q=80&w=400",
  arhar: "https://images.unsplash.com/photo-1515543237350-b3eea1ec8082?auto=format&fit=crop&q=80&w=400",
  masoor: "https://images.unsplash.com/photo-1515543237350-b3eea1ec8082?auto=format&fit=crop&q=80&w=400",
  cumin: "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&q=80&w=400",
  turmeric: "https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&q=80&w=400",
  chilli: "https://images.unsplash.com/photo-1588252303782-cb80119abd6d?auto=format&fit=crop&q=80&w=400",
  coriander: "https://images.unsplash.com/photo-1599599810769-bcde5a160d32?auto=format&fit=crop&q=80&w=400",

  // Fruits
  banana: "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?auto=format&fit=crop&q=80&w=400",
  mango: "https://images.unsplash.com/photo-1553279768-865429fa0078?auto=format&fit=crop&q=80&w=400",
  apple: "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?auto=format&fit=crop&q=80&w=400",
  orange: "https://images.unsplash.com/photo-1611080626919-7cf5a9dbab5b?auto=format&fit=crop&q=80&w=400",
  grapes: "https://images.unsplash.com/photo-1537640538966-79f369143f8f?auto=format&fit=crop&q=80&w=400",
  pomegranate: "https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&q=80&w=400",

  // Default fallback
  default: "https://images.unsplash.com/photo-1592417817098-8f3d6eb18865?auto=format&fit=crop&q=80&w=400",
};

/**
 * Get high-quality image URL for a given crop name.
 */
export function getCropImage(cropName: string): string {
  if (!cropName) return CROP_IMAGE_MAP.default;

  const lower = cropName.toLowerCase();
  for (const [key, value] of Object.entries(CROP_IMAGE_MAP)) {
    if (key !== "default" && lower.includes(key)) {
      return value;
    }
  }

  return CROP_IMAGE_MAP.default;
}

/**
 * Classify a crop into one of 7 standard categories.
 */
export function getCropCategory(cropName: string): string {
  const lower = (cropName || "").toLowerCase();
  if (/wheat|rice|paddy|maize|corn|jowar|bajra|barley/.test(lower)) return "Cereals";
  if (/chana|gram|chickpea|moong|tur|arhar|masoor|pulse|dal|lentil/.test(lower)) return "Pulses";
  if (/onion|potato|tomato|garlic|cabbage|cauliflower|peas|carrot|brinjal|okra|spinach|gourd|vegetable/.test(lower)) return "Vegetables";
  if (/banana|mango|apple|orange|grapes|pomegranate|papaya|guava|fruit/.test(lower)) return "Fruits";
  if (/cumin|turmeric|chilli|coriander|cardamom|clove|ginger|garlic|spice/.test(lower)) return "Spices";
  if (/soybean|mustard|groundnut|peanut|sunflower|sesame|oil/.test(lower)) return "Oilseeds";
  if (/cotton|sugarcane|jute|tobacco/.test(lower)) return "Commercial";
  return "General";
}
