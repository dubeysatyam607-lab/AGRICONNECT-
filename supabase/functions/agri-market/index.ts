import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit, getRateLimitHeaders } from "../_shared/rate-limiter.ts";
import { validateAuth, authErrorResponse } from "../_shared/auth-validator.ts";

const ALLOWED_ORIGINS = (
  Deno.env.get("ALLOWED_ORIGINS") ||
  "http://localhost:3000,http://localhost:5173,http://localhost:8000,https://agriconnect-navy-six.vercel.app,https://agriconnect-navy-six-*.vercel.app"
).split(",").map(o => o.trim());

function getCORSHeaders(origin: string | null): Record<string, string> {
  const allowed = origin && ALLOWED_ORIGINS.some((o) => o === origin) ? origin : undefined;
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Headers": "authorization, x-client-info, content-type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
  };
}

const RATE_LIMIT_CONFIG = { maxRequests: 80, windowMs: 60 * 1000 };

const CATEGORIES = ["seeds", "fertilizers", "pesticides", "tools", "machinery"] as const;
type Category = typeof CATEGORIES[number];

interface Product {
  id: string;
  name: string;
  nameHi: string;
  category: Category;
  price: number;
  mrp: number;
  unit: string;
  brand: string;
  rating: number;
  reviews: number;
  sold: number;
  stock: number;
  description: string;
  descriptionHi: string;
  tags: string[];
  offer: string;
  freeDelivery: boolean;
  deliveryDays: string;
  color: string;
  weightKg: number;
  imageUrl?: string;
}

const CATALOG: Product[] = [
  { id: "p-1", name: "Urea Fertilizer 45kg", nameHi: "यूरिया खाद 45 किग्रा", category: "fertilizers", price: 266, mrp: 290, unit: "45 kg Bag", brand: "IFFCO", rating: 4.6, reviews: 412, sold: 9800, stock: 200, description: "High-nitrogen granular urea for strong vegetative growth. Ideal for wheat, paddy and maize top dressing.", descriptionHi: "मजबूत वानस्पतिक वृद्धि के लिए उच्च नाइट्रोजन दानेदार यूरिया। गेहूं, धान और मक्का की टॉप ड्रेसिंग के लिए आदर्श।", tags: ["NPK 46-0-0", "Subsidy", "Top dressing"], offer: "MRP ₹290", freeDelivery: true, deliveryDays: "2-3 days", color: "#16a34a", weightKg: 45, imageUrl: "https://images.unsplash.com/photo-1628352081506-83c43123ed6d?auto=format&fit=crop&q=80&w=600" },
  { id: "p-2", name: "DAP Fertilizer 50kg", nameHi: "डीएपी खाद 50 किग्रा", category: "fertilizers", price: 1350, mrp: 1420, unit: "50 kg Bag", brand: "Coromandel", rating: 4.7, reviews: 356, sold: 7400, stock: 150, description: "Balanced N-P fertilizer for root development and flowering. Best applied at sowing time.", descriptionHi: "जड़ विकास और फूल के लिए संतुलित एन-पी उर्वरक। बुवाई के समय सर्वोत्तम।", tags: ["NPK 18-46-0", "Basal dose", "Certified"], offer: "5% OFF", freeDelivery: true, deliveryDays: "2-3 days", color: "#2563eb", weightKg: 50, imageUrl: "https://images.unsplash.com/photo-1597657133350-14b85b99ef95?auto=format&fit=crop&q=80&w=600" },
  { id: "p-3", name: "NPK 19-19-19 Fertilizer", nameHi: "एनपीके 19-19-19 खाद", category: "fertilizers", price: 980, mrp: 1100, unit: "50 kg Bag", brand: "Aries", rating: 4.5, reviews: 288, sold: 5100, stock: 120, description: "Water-soluble NPK for drip and foliar application. Complete nutrition for all crops.", descriptionHi: "ड्रिप और पत्तेदार अनुप्रयोग के लिए पानी में घुलनशील एनपीके। सभी फसलों के लिए संपूर्ण पोषण।", tags: ["Water soluble", "Foliar", "Drip"], offer: "11% OFF", freeDelivery: false, deliveryDays: "3-4 days", color: "#0891b2", weightKg: 50, imageUrl: "https://images.unsplash.com/photo-1585336261026-775c74256856?auto=format&fit=crop&q=80&w=600" },
  { id: "p-4", name: "Organic Compost Manure", nameHi: "जैविक कम्पोस्ट खाद", category: "fertilizers", price: 450, mrp: 520, unit: "25 kg Bag", brand: "GreenAgro", rating: 4.4, reviews: 198, sold: 3200, stock: 300, description: "Fully decomposed organic compost rich in humus and beneficial microbes.", descriptionHi: "ह्यूमस और लाभकारी सूक्ष्मजीवों से भरपूर पूर्णतः सड़ा हुआ जैविक कम्पोस्ट।", tags: ["Organic", "Soil health", "NPK 0.8-0.4-0.8"], offer: "13% OFF", freeDelivery: false, deliveryDays: "2-4 days", color: "#65a30d", weightKg: 25, imageUrl: "https://images.unsplash.com/photo-1606865923806-e24e9d4a0da3?auto=format&fit=crop&q=80&w=600" },
  { id: "p-5", name: "Potash (MOP) 25kg", nameHi: "पोटाश (एमओपी) 25 किग्रा", category: "fertilizers", price: 720, mrp: 780, unit: "25 kg Bag", brand: "IPL", rating: 4.3, reviews: 154, sold: 2600, stock: 180, description: "Muriate of potash for fruit development, quality and disease resistance.", descriptionHi: "फल विकास, गुणवत्ता और रोग प्रतिरोधक क्षमता के लिए म्यूरेट ऑफ पोटाश।", tags: ["NPK 0-0-60", "Fruiting", "Quality"], offer: "8% OFF", freeDelivery: true, deliveryDays: "3-4 days", color: "#ca8a04", weightKg: 25, imageUrl: "https://images.unsplash.com/photo-1628352081506-83c43123ed6d?auto=format&fit=crop&q=80&w=600" },
  { id: "p-6", name: "Vermicompost 20kg", nameHi: "केंचुआ खाद 20 किग्रा", category: "fertilizers", price: 380, mrp: 450, unit: "20 kg Bag", brand: "EarthWorm Co.", rating: 4.6, reviews: 265, sold: 4300, stock: 250, description: "Premium worm castings with high microbial activity for organic farming.", descriptionHi: "जैविक खेती के लिए उच्च सूक्ष्मजीव गतिविधि वाला प्रीमियम केंचुआ खाद।", tags: ["Organic", "Microbial", "Premium"], offer: "16% OFF", freeDelivery: false, deliveryDays: "2-3 days", color: "#7c3aed", weightKg: 20, imageUrl: "https://images.unsplash.com/photo-1606865923806-e24e9d4a0da3?auto=format&fit=crop&q=80&w=600" },
  { id: "p-7", name: "Hybrid Wheat Seeds HD-3086", nameHi: "हाइब्रिड गेहूं बीज HD-3086", category: "seeds", price: 850, mrp: 950, unit: "10 kg Pkt", brand: "Pioneer", rating: 4.8, reviews: 520, sold: 11200, stock: 140, description: "High-yielding HD-3086 variety with excellent rust resistance. Ideal for timely sown North-West India.", descriptionHi: "उच्च उपज वाली HD-3086 किस्म जिसमें उत्कृष्ट रतुआ प्रतिरोधक क्षमता है।", tags: ["Timely sown", "Rust resistant", "Certified"], offer: "11% OFF", freeDelivery: true, deliveryDays: "2-3 days", color: "#d97706", weightKg: 10, imageUrl: "https://images.unsplash.com/photo-1574323347407-f5e1ad6d020b?auto=format&fit=crop&q=80&w=600" },
  { id: "p-8", name: "Hybrid Cotton Seeds (Bt)", nameHi: "हाइब्रिड कपास बीज (बीटी)", category: "seeds", price: 750, mrp: 820, unit: "450 g Pkt", brand: "BioSeed", rating: 4.4, reviews: 340, sold: 6900, stock: 160, description: "Bt cotton hybrid with high boll retention and fiber quality. GMO certified.", descriptionHi: "उच्च गोला धारण और रेशा गुणवत्ता वाला बीटी कपास हाइब्रिड।", tags: ["Bt", "High yield", "Long staple"], offer: "9% OFF", freeDelivery: false, deliveryDays: "3-4 days", color: "#16a34a", weightKg: 1, imageUrl: "https://images.unsplash.com/photo-1605000797498-6f2145b1b9c3?auto=format&fit=crop&q=80&w=600" },
  { id: "p-9", name: "Tomato Seeds Arka Rakshak", nameHi: "टमाटर बीज अर्का रक्षक", category: "seeds", price: 320, mrp: 360, unit: "100 g Pkt", brand: "ICAR", rating: 4.5, reviews: 190, sold: 3800, stock: 220, description: "Disease-resistant tomato hybrid, good for fresh market and processing.", descriptionHi: "रोग प्रतिरोधी टमाटर हाइब्रिड, ताजा बाजार और प्रसंस्करण के लिए उपयुक्त।", tags: ["Disease resistant", "High shelf life"], offer: "11% OFF", freeDelivery: true, deliveryDays: "2-3 days", color: "#dc2626", weightKg: 1, imageUrl: "https://images.unsplash.com/photo-1592841200221-a6898f307baa?auto=format&fit=crop&q=80&w=600" },
  { id: "p-10", name: "Maize Hybrid Seeds", nameHi: "मक्का हाइब्रिड बीज", category: "seeds", price: 620, mrp: 680, unit: "8 kg Pkt", brand: "Syngenta", rating: 4.6, reviews: 240, sold: 4100, stock: 130, description: "Drought-tolerant maize hybrid with uniform cob size and high shelling.", descriptionHi: "सूखा सहनशील मक्का हाइब्रिड, एकसमान भुट्टा आकार और उच्च दाना।", tags: ["Drought tolerant", "Uniform"], offer: "9% OFF", freeDelivery: false, deliveryDays: "3-5 days", color: "#ca8a04", weightKg: 8, imageUrl: "https://images.unsplash.com/photo-1551754655-cd27e38d2076?auto=format&fit=crop&q=80&w=600" },
  { id: "p-11", name: "Paddy Seeds PB-1121", nameHi: "धान बीज PB-1121", category: "seeds", price: 1100, mrp: 1200, unit: "10 kg Pkt", brand: "PAU", rating: 4.7, reviews: 310, sold: 5200, stock: 90, description: "Premium basmati paddy seed for premium grain quality and export market.", descriptionHi: "प्रीमियम अनाज गुणवत्ता और निर्यात बाजार के लिए प्रीमियम बासमती धान बीज।", tags: ["Basmati", "Export quality"], offer: "8% OFF", freeDelivery: true, deliveryDays: "2-4 days", color: "#9333ea", weightKg: 10, imageUrl: "https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&q=80&w=600" },
  { id: "p-12", name: "Vegetable Seeds Combo", nameHi: "सब्जी बीज कॉम्बो", category: "seeds", price: 450, mrp: 540, unit: "12 Pkt Set", brand: "Nunhems", rating: 4.5, reviews: 170, sold: 2900, stock: 240, description: "Combo of brinjal, okra, chilli and leafy vegetable seeds for kitchen gardens.", descriptionHi: "रसोई बगीचे के लिए बैंगन, भिंडी, मिर्च और पत्तेदार सब्जी बीजों का कॉम्बो।", tags: ["Kitchen garden", "Value pack"], offer: "17% OFF", freeDelivery: false, deliveryDays: "2-4 days", color: "#65a30d", weightKg: 1, imageUrl: "https://images.unsplash.com/photo-1592417817098-8f3d6eb18865?auto=format&fit=crop&q=80&w=600" },
  { id: "p-13", name: "Imidacloprid 17.8 SL", nameHi: "इमिडाक्लोप्रिड 17.8 SL", category: "pesticides", price: 420, mrp: 470, unit: "250 ml", brand: "Bayer", rating: 4.6, reviews: 280, sold: 5600, stock: 170, description: "Systemic insecticide for sucking pests — jassids, aphids and whitefly control.", descriptionHi: "चूसने वाले कीट — जैसिड, एफिड और सफेद मक्खी नियंत्रण के लिए प्रणालीगत कीटनाशक।", tags: ["Systemic", "Sucking pests"], offer: "11% OFF", freeDelivery: true, deliveryDays: "2-3 days", color: "#0891b2", weightKg: 1, imageUrl: "https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?auto=format&fit=crop&q=80&w=600" },
  { id: "p-14", name: "Chlorpyrifos 20 EC", nameHi: "क्लोरपायरीफॉस 20 ईसी", category: "pesticides", price: 560, mrp: 610, unit: "1 L", brand: "Tata Rallis", rating: 4.4, reviews: 190, sold: 3200, stock: 140, description: "Broad-spectrum contact insecticide for soil and foliage pests.", descriptionHi: "मिट्टी और पत्ते के कीटों के लिए व्यापक-स्पेक्ट्रम संपर्क कीटनाशक।", tags: ["Contact", "Broad spectrum"], offer: "8% OFF", freeDelivery: false, deliveryDays: "3-4 days", color: "#7c3aed", weightKg: 1, imageUrl: "https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?auto=format&fit=crop&q=80&w=600" },
  { id: "p-15", name: "Fungicide Mancozeb 75 WP", nameHi: "कवकनाशी मैन्कोजेब 75 WP", category: "pesticides", price: 310, mrp: 350, unit: "1 kg", brand: "UPL", rating: 4.5, reviews: 230, sold: 4700, stock: 190, description: "Protective fungicide controlling blight, downy mildew and anthracnose.", descriptionHi: "झुलसा, आद्रता फफूंद और एन्थ्रेक्नोज को नियंत्रित करने वाला सुरक्षात्मक कवकनाशी।", tags: ["Protective", "Mildew"], offer: "11% OFF", freeDelivery: true, deliveryDays: "2-4 days", color: "#16a34a", weightKg: 1, imageUrl: "https://images.unsplash.com/photo-1585336261026-775c74256856?auto=format&fit=crop&q=80&w=600" },
  { id: "p-16", name: "Herbicide Glyphosate 41%", nameHi: "शाकनाशी ग्लाइफोसेट 41%", category: "pesticides", price: 640, mrp: 700, unit: "1 L", brand: "Rallis", rating: 4.3, reviews: 160, sold: 2800, stock: 130, description: "Non-selective systemic herbicide for total weed control before sowing.", descriptionHi: "बुवाई से पहले पूर्ण खरपतवार नियंत्रण के लिए गैर-चयनात्मक प्रणालीगत शाकनाशी।", tags: ["Weed control", "Pre-sowing"], offer: "9% OFF", freeDelivery: false, deliveryDays: "3-5 days", color: "#dc2626", weightKg: 1, imageUrl: "https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?auto=format&fit=crop&q=80&w=600" },
  { id: "p-17", name: "Neem Oil Spray 1L", nameHi: "नीम तेल स्प्रे 1L", category: "pesticides", price: 380, mrp: 440, unit: "1 L", brand: "HerbalAgro", rating: 4.7, reviews: 310, sold: 6100, stock: 210, description: "Organic neem-based insect repellent. Safe for vegetables and organic farms.", descriptionHi: "जैविक नीम-आधारित कीट विकर्षक। सब्जियों और जैविक खेतों के लिए सुरक्षित।", tags: ["Organic", "Repellent"], offer: "14% OFF", freeDelivery: true, deliveryDays: "2-3 days", color: "#65a30d", weightKg: 1, imageUrl: "https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?auto=format&fit=crop&q=80&w=600" },
  { id: "p-18", name: "Fertilizer Granule Spreader", nameHi: "खाद दानेदार फैलाने की मशीन", category: "tools", price: 1650, mrp: 1900, unit: "1 Unit", brand: "Gurukrupa", rating: 4.4, reviews: 120, sold: 1400, stock: 60, description: "Adjustable hand-push spreader for even fertilizer distribution.", descriptionHi: "समान उर्वरक वितरण के लिए समायोज्य हाथ-धकेल स्प्रेडर।", tags: ["Adjustable", "Stainless"], offer: "13% OFF", freeDelivery: true, deliveryDays: "3-5 days", color: "#2563eb", weightKg: 8, imageUrl: "https://images.unsplash.com/photo-1589923188900-85dae523342b?auto=format&fit=crop&q=80&w=600" },
  { id: "p-19", name: "Manual Pesticide Sprayer 16L", nameHi: "मैनुअल कीटनाशक स्प्रेयर 16L", category: "tools", price: 1200, mrp: 1400, unit: "1 Unit", brand: "Gala", rating: 4.5, reviews: 260, sold: 3800, stock: 80, description: "16-litre brass nozzle knapsack sprayer with adjustable lance.", descriptionHi: "16-लीटर पीतल नोजल नैपसैक स्प्रेयर समायोज्य लांस के साथ।", tags: ["16L", "Brass nozzle"], offer: "14% OFF", freeDelivery: false, deliveryDays: "3-5 days", color: "#16a34a", weightKg: 4, imageUrl: "https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?auto=format&fit=crop&q=80&w=600" },
  { id: "p-20", name: "Drip Irrigation Kit (1 Acre)", nameHi: "ड्रिप सिंचाई किट (1 एकड़)", category: "tools", price: 2500, mrp: 3000, unit: "1 Set", brand: "Jain Irrigation", rating: 4.8, reviews: 340, sold: 2900, stock: 45, description: "Complete drip kit with pipes, laterals, drippers and filter. Saves up to 70% water.", descriptionHi: "पाइप, लेटरल, ड्रिपर और फिल्टर के साथ संपूर्ण ड्रिप किट। 70% तक पानी बचाएं।", tags: ["Water saving", "Complete kit"], offer: "17% OFF", freeDelivery: true, deliveryDays: "4-6 days", color: "#0891b2", weightKg: 15, imageUrl: "https://images.unsplash.com/photo-1625246333195-78d9c38ad449?auto=format&fit=crop&q=80&w=600" },
  { id: "p-21", name: "Rotavator Blades Set", nameHi: "रोटावेटर ब्लेड सेट", category: "tools", price: 890, mrp: 1000, unit: "1 Set", brand: "Shaktiman", rating: 4.4, reviews: 90, sold: 1100, stock: 120, description: "Tungsten-coated blades set for 4 ft rotavator. Hardened for tough soil.", descriptionHi: "4 फुट रोटावेटर के लिए टंगस्टन-लेपित ब्लेड सेट। कठोर मिट्टी के लिए सख्त।", tags: ["Tungsten", "4ft"], offer: "11% OFF", freeDelivery: false, deliveryDays: "3-5 days", color: "#ca8a04", weightKg: 6, imageUrl: "https://images.unsplash.com/photo-1589923188900-85dae523342b?auto=format&fit=crop&q=80&w=600" },
  { id: "p-22", name: "Pruning Shears Professional", nameHi: "प्रूनिंग कैंची प्रोफेशनल", category: "tools", price: 350, mrp: 420, unit: "1 Unit", brand: "Felco Style", rating: 4.6, reviews: 150, sold: 2300, stock: 200, description: "Carbon steel bypass pruner for orchards and vineyards with ergonomic grip.", descriptionHi: "बागों और अंगूर के बागों के लिए कार्बन स्टील बायपास प्रूनर।", tags: ["Carbon steel", "Ergonomic"], offer: "17% OFF", freeDelivery: true, deliveryDays: "2-3 days", color: "#dc2626", weightKg: 1, imageUrl: "https://images.unsplash.com/photo-1589923188900-85dae523342b?auto=format&fit=crop&q=80&w=600" },
  { id: "p-23", name: "Water Pump 1.5 HP", nameHi: "जल पंप 1.5 HP", category: "machinery", price: 4200, mrp: 4800, unit: "1 Unit", brand: "Kirloskar", rating: 4.6, reviews: 220, sold: 1900, stock: 40, description: "Energy-efficient monoblock pump for irrigation and domestic use.", descriptionHi: "सिंचाई और घरेलू उपयोग के लिए ऊर्जा कुशल मोनोब्लॉक पंप।", tags: ["Monoblock", "ISI"], offer: "13% OFF", freeDelivery: true, deliveryDays: "5-7 days", color: "#2563eb", weightKg: 25, imageUrl: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?auto=format&fit=crop&q=80&w=600" },
  { id: "p-24", name: "Mini Power Tiller 5 HP", nameHi: "मिनी पावर टिलर 5 HP", category: "machinery", price: 18500, mrp: 21000, unit: "1 Unit", brand: "Greaves", rating: 4.7, reviews: 140, sold: 620, stock: 15, description: "5 HP diesel tiller for small and medium farms. Plough, intercultivate and haul.", descriptionHi: "छोटे और मध्यम खेतों के लिए 5 HP डीजल टिलर। जुताई, इंटरकल्टीवेट और ढुलाई।", tags: ["Diesel", "Compact"], offer: "12% OFF", freeDelivery: true, deliveryDays: "7-10 days", color: "#16a34a", weightKg: 90, imageUrl: "https://images.unsplash.com/photo-1589923188900-85dae523342b?auto=format&fit=crop&q=80&w=600" },
  { id: "p-25", name: "Seed Drill (9 Row)", nameHi: "सीड ड्रिल (9 पंक्ति)", category: "machinery", price: 14800, mrp: 16800, unit: "1 Unit", brand: "Shaktiman", rating: 4.5, reviews: 85, sold: 410, stock: 12, description: "9-row tractor-mounted seed cum fertilizer drill for precision sowing.", descriptionHi: "सटीक बुवाई के लिए 9-पंक्ति ट्रैक्टर-माउंटेड सीड-कम-उर्वरक ड्रिल।", tags: ["9 row", "Fertilizer hopper"], offer: "12% OFF", freeDelivery: true, deliveryDays: "7-10 days", color: "#ca8a04", weightKg: 180, imageUrl: "https://images.unsplash.com/photo-1589923188900-85dae523342b?auto=format&fit=crop&q=80&w=600" },
  { id: "p-26", name: "Chaff Cutter Electric", nameHi: "चारा काटने की मशीन", category: "machinery", price: 9800, mrp: 11000, unit: "1 Unit", brand: "Balwan", rating: 4.4, reviews: 110, sold: 530, stock: 18, description: "2 HP electric chaff cutter for green and dry fodder. Suitable for 10-15 cattle.", descriptionHi: "हरे और सूखे चारे के लिए 2 HP इलेक्ट्रिक चारा काटने की मशीन। 10-15 पशुओं के लिए।", tags: ["2 HP", "Fodder"], offer: "11% OFF", freeDelivery: true, deliveryDays: "5-8 days", color: "#7c3aed", weightKg: 40, imageUrl: "https://images.unsplash.com/photo-1589923188900-85dae523342b?auto=format&fit=crop&q=80&w=600" },
  { id: "p-27", name: "Solar Fence Energizer", nameHi: "सोलर फेंस एनर्जाइज़र", category: "machinery", price: 3600, mrp: 4100, unit: "1 Unit", brand: "SunAgro", rating: 4.5, reviews: 95, sold: 720, stock: 35, description: "Solar-powered fence energizer to protect crops from stray animals.", descriptionHi: "आवारा पशुओं से फसल की रक्षा के लिए सौर-चालित फेंस एनर्जाइज़र।", tags: ["Solar", "Animal deterrence"], offer: "12% OFF", freeDelivery: true, deliveryDays: "5-7 days", color: "#d97706", weightKg: 5, imageUrl: "https://images.unsplash.com/photo-1509391365360-2e959784a276?auto=format&fit=crop&q=80&w=600" },
  { id: "p-28", name: "Tractor Trolley (6 Tyre)", nameHi: "ट्रैक्टर ट्रॉली (6 टायर)", category: "machinery", price: 125000, mrp: 138000, unit: "1 Unit", brand: "Silver", rating: 4.6, reviews: 65, sold: 180, stock: 6, description: "Heavy-duty 6-tonne capacity trolley with hydraulic tipping body.", descriptionHi: "हाइड्रोलिक टिपिंग body के साथ 6 टन क्षमता की भारी-कर्तव्य ट्रॉली।", tags: ["6 ton", "Hydraulic"], offer: "9% OFF", freeDelivery: true, deliveryDays: "10-15 days", color: "#2563eb", weightKg: 1500, imageUrl: "https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&fit=crop&q=80&w=600" },
  { id: "p-29", name: "Mini Rice Transplanter", nameHi: "मिनी राइस ट्रांसप्लांटर", category: "machinery", price: 38000, mrp: 42000, unit: "1 Unit", brand: "Kubota", rating: 4.8, reviews: 55, sold: 120, stock: 8, description: "Walking type 4-row transplanter that cuts paddy planting labor by 80%.", descriptionHi: "चलने-फिरने वाला 4-पंक्ति ट्रांसप्लांटर जो धान रोपाई श्रम को 80% घटाता है।", tags: ["4 row", "Labor saving"], offer: "10% OFF", freeDelivery: true, deliveryDays: "8-12 days", color: "#16a34a", weightKg: 120, imageUrl: "https://images.unsplash.com/photo-1536657464919-892534f60d6e?auto=format&fit=crop&q=80&w=600" },
  { id: "p-30", name: "Spray Drone Guard Kit", nameHi: "स्प्रे ड्रोन गार्ड किट", category: "machinery", price: 2400, mrp: 2800, unit: "1 Set", brand: "AgriDrone", rating: 4.3, reviews: 40, sold: 300, stock: 30, description: "Complete drone spray kit with tank, pump and nozzle set for drones.", descriptionHi: "ड्रोन के लिए टैंक, पंप और नोजल सेट वाली संपूर्ण ड्रोन स्प्रे किट।", tags: ["Drone", "Precision"], offer: "14% OFF", freeDelivery: false, deliveryDays: "5-7 days", color: "#0891b2", weightKg: 3, imageUrl: "https://images.unsplash.com/photo-1508614589041-895b88991e3e?auto=format&fit=crop&q=80&w=600" },
  { id: "p-31", name: "Vegetable Seed Pack 6in1", nameHi: "सब्जी बीज पैक 6इन1", category: "seeds", price: 280, mrp: 340, unit: "6 Pkt Set", brand: "Nunhems", rating: 4.4, reviews: 130, sold: 2100, stock: 260, description: "Curry leaf, spinach, coriander and gourds seeds for home gardens.", descriptionHi: "घर के बगीचे के लिए करी पत्ता, पालक, धनिया और कद्दू बीज।", tags: ["Home garden", "Value"], offer: "18% OFF", freeDelivery: true, deliveryDays: "2-3 days", color: "#65a30d", weightKg: 1, imageUrl: "https://images.unsplash.com/photo-1592417817098-8f3d6eb18865?auto=format&fit=crop&q=80&w=600" },
  { id: "p-32", name: "Micronutrient Mix 500g", nameHi: "सूक्ष्म पोषक मिश्रण 500ग्रा", category: "fertilizers", price: 210, mrp: 260, unit: "500 g Pkt", brand: "Arka", rating: 4.5, reviews: 175, sold: 3300, stock: 280, description: "Zinc, boron, iron and manganese mix for correcting hidden hunger.", descriptionHi: "छिपी भूख को ठीक करने के लिए जस्ता, बोरॉन, लोहा और मैंगनीज मिश्रण।", tags: ["Zinc", "Boron", "Foliar"], offer: "19% OFF", freeDelivery: true, deliveryDays: "2-3 days", color: "#9333ea", weightKg: 1, imageUrl: "https://images.unsplash.com/photo-1585336261026-775c74256856?auto=format&fit=crop&q=80&w=600" },
];

const COUPONS: Array<{ code: string; type: "percent" | "flat"; value: number; cap: number; min: number; desc: string; descHi: string; expiry: string }> = [
  { code: "WELCOME10", type: "percent", value: 10, cap: 200, min: 499, desc: "10% off up to ₹200", descHi: "₹200 तक 10% छूट", expiry: "31 Dec 2026" },
  { code: "KHETI20", type: "percent", value: 20, cap: 500, min: 999, desc: "20% off up to ₹500", descHi: "₹500 तक 20% छूट", expiry: "31 Dec 2026" },
  { code: "SAVE150", type: "flat", value: 150, cap: 150, min: 799, desc: "Flat ₹150 off", descHi: "फ्लैट ₹150 छूट", expiry: "31 Dec 2026" },
  { code: "FEST50", type: "flat", value: 50, cap: 50, min: 299, desc: "Flat ₹50 off", descHi: "फ्लैट ₹50 छूट", expiry: "30 Sep 2026" },
  { code: "FREESHIP", type: "percent", value: 0, cap: 49, min: 499, desc: "Free shipping over ₹499", descHi: "₹499 से अधिक पर मुफ्त शिपिंग", expiry: "31 Dec 2026" },
];

const COURIERS = ["Delhivery", "BlueDart", "Ekart", "India Post", "XpressBees"];
const TRACK_NOS = ["DL-8821-44512", "BD-3320-77891", "EK-5512-90834", "IN-9923-11258", "XP-1177-66403"];

const ORDERS = new Map<string, Record<string, unknown>>();
const REVIEWS: Array<Record<string, unknown>> = [];

async function saveOrder(order: Record<string, unknown>, userId?: string) {
  ORDERS.set(order.id as string, order);
  if (!userId) return;
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseKey) return;
    const supabase = createClient(supabaseUrl, supabaseKey);
    await supabase.from("market_orders").insert({
      user_id: userId,
      order_id: order.id,
      items: JSON.stringify(order.items),
      subtotal: order.subtotal,
      discount: order.discount,
      shipping: order.shipping,
      total: order.total,
      coupon_code: order.couponCode || "",
      user_name: order.userName || "Farmer",
      phone: order.phone || "",
      address: order.address || "",
      payment_method: order.paymentMethod || "upi",
      payment_status: "pending",
      status: "confirmed",
    });
  } catch {
    console.error("Order persistence skipped (table may not exist)");
  }
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashStr(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function seededReviews(productId: string, count: number) {
  const names = ["Amit", "Pooja Devi", "Ranjit", "Kavita", "Sunil", "Meena", "Arjun", "Lakshmi", "Bharat", "Nisha", "Ravi", "Sita", "Om", "Deepa", "Mohan"];
  const comments = [
    "Genuine product, delivered on time and well packed.",
    "Very good quality. Got expected results in my field.",
    "Reasonable price compared to local market.",
    "The packaging was sturdy and brand seal intact.",
    "Works exactly as described. Would recommend.",
    "Delivery took a day extra but quality is top notch.",
    "My crop improved visibly after using this. 5 stars.",
    "Good value for money. Reordering for next season.",
    "Customer support helped with usage instructions.",
    "Fast delivery to my village. Very impressed.",
  ];
  const out: Array<{ user: string; rating: number; comment: string; when: string }> = [];
  const rand = mulberry32(hashStr(productId + "reviews"));
  const n = Math.min(count, 12);
  for (let i = 0; i < n; i++) {
    out.push({
      user: names[Math.floor(rand() * names.length)],
      rating: Math.min(5, Math.max(1, Math.round(3.7 + rand() * 1.4))),
      comment: comments[Math.floor(rand() * comments.length)],
      when: `${Math.floor(rand() * 30) + 1}d ago`,
    });
  }
  return out;
}

function validateCoupon(code: string, subtotal: number): { ok: boolean; coupon?: { code: string; type: "percent" | "flat"; value: number; cap: number; min: number; desc: string; descHi: string; discount: number }; error?: string } {
  const c = COUPONS.find(x => x.code === code.toUpperCase());
  if (!c) return { ok: false, error: "Invalid coupon code" };
  if (subtotal < c.min) return { ok: false, error: `Add items worth ₹${c.min} to use ${c.code}` };
  let discount = 0;
  if (c.type === "percent" && c.value > 0) discount = Math.round(Math.min(subtotal * (c.value / 100), c.cap));
  if (c.type === "flat") discount = c.value;
  if (c.code === "FREESHIP") discount = 49;
  return { ok: true, coupon: { ...c, discount } };
}

function buildTracking(orderId: string, totalKm: number, now: number) {
  const rand = mulberry32(hashStr(orderId + "track"));
  const created = Math.floor(hashStr(orderId + "t") % 1000000);
  const minutes = ((now / 60000) % 1000000 + created) % 1000000;
  const totalMin = totalKm * 12;
  const progress = Math.min(99, Math.round((minutes / totalMin) * 100));
  const stages = [
    { label: "Order confirmed", done: true, when: "Day 1" },
    { label: "Packed & ready", done: progress >= 8, when: progress >= 8 ? "Day 1" : "Pending" },
    { label: "Shipped", done: progress >= 20, when: progress >= 20 ? "Day 2" : "Pending" },
    { label: "Out for delivery", done: progress >= 60, when: progress >= 60 ? "Today" : "Pending" },
    { label: "Delivered", done: progress >= 95, when: progress >= 95 ? "Today" : "Pending" },
  ];
  return {
    orderId,
    courier: COURIERS[Math.floor(rand() * COURIERS.length)],
    trackingNo: TRACK_NOS[Math.floor(rand() * TRACK_NOS.length)],
    progress,
    stages,
    eta: `${2 + Math.floor(rand() * 4)}-${6 + Math.floor(rand() * 4)} days`,
    current: stages.filter(s => s.done).pop()?.label || "Order confirmed",
    status: progress >= 95 ? "delivered" : progress >= 60 ? "out-for-delivery" : progress >= 20 ? "shipped" : "confirmed",
  };
}

function summarize(product: Product, inStock: boolean) {
  return {
    id: product.id, name: product.name, nameHi: product.nameHi, category: product.category,
    price: product.price, mrp: product.mrp, unit: product.unit, brand: product.brand,
    rating: product.rating, reviews: product.reviews, sold: product.sold, stock: product.stock,
    offer: product.offer, freeDelivery: product.freeDelivery, deliveryDays: product.deliveryDays,
    color: product.color, inStock,
    discountPct: Math.round(((product.mrp - product.price) / product.mrp) * 100),
  };
}

serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCORSHeaders(origin);

  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const forwarded = req.headers.get("x-forwarded-for");
  const clientIP = forwarded ? forwarded.split(",")[0].trim() : "unknown";
  const rateLimit = await checkRateLimit(clientIP, "agri-market", RATE_LIMIT_CONFIG);
  if (!rateLimit.allowed) {
    return new Response(
      JSON.stringify({ error: "Too many requests. Please try again later." }),
      { status: 429, headers: { ...corsHeaders, ...getRateLimitHeaders(rateLimit), "Content-Type": "application/json", "Retry-After": Math.ceil((rateLimit.resetAt.getTime() - Date.now()) / 1000).toString() } }
    );
  }

  const headers = { ...corsHeaders, ...getRateLimitHeaders(rateLimit), "Content-Type": "application/json" };
  const bad = (msg: string, status = 400) => new Response(JSON.stringify({ error: msg }), { status, headers });

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return bad("Invalid JSON body");
  }

  const action = body.action;
  if (typeof action !== "string") return bad("Missing action");

  try {
    switch (action) {
      case "catalog": {
        const search = typeof body.search === "string" ? body.search.trim().toLowerCase() : "";
        const category = typeof body.category === "string" ? body.category : "All";
        const sort = typeof body.sort === "string" ? body.sort : "popular";
        const minPrice = typeof body.minPrice === "number" ? body.minPrice : 0;
        const maxPrice = typeof body.maxPrice === "number" ? body.maxPrice : Number.MAX_SAFE_INTEGER;
        const minRating = typeof body.minRating === "number" ? body.minRating : 0;
        const inStockOnly = Boolean(body.inStockOnly);

        let list = CATALOG.map(p => summarize(p, p.stock > 0));
        if (category !== "All") list = list.filter(p => p.category === category);
        if (search) {
          list = list.filter(p =>
            p.name.toLowerCase().includes(search) ||
            p.nameHi.includes(body.search as string) ||
            p.brand.toLowerCase().includes(search) ||
            p.category.includes(search)
          );
        }
        list = list.filter(p => p.price >= minPrice && p.price <= maxPrice && p.rating >= minRating);
        if (inStockOnly) list = list.filter(p => p.inStock);

        if (sort === "price_asc") list.sort((a, b) => a.price - b.price);
        else if (sort === "price_desc") list.sort((a, b) => b.price - a.price);
        else if (sort === "rating") list.sort((a, b) => b.rating - a.rating);
        else list.sort((a, b) => b.sold - a.sold);

        return new Response(JSON.stringify({
          products: list,
          categories: CATEGORIES,
          coupons: COUPONS.map(c => ({ code: c.code, desc: c.desc, descHi: c.descHi, min: c.min, expiry: c.expiry })),
          stats: {
            total: CATALOG.length,
            offers: CATALOG.filter(p => p.mrp > p.price).length,
            brands: new Set(CATALOG.map(p => p.brand)).size,
            avgRating: Math.round((CATALOG.reduce((s, p) => s + p.rating, 0) / CATALOG.length) * 10) / 10,
          },
          banners: [
            { id: "b1", title: "Kharif Sale", titleHi: "खरीफ सेल", sub: "Upto 20% off on seeds & fertilizers", subHi: "बीज और खाद पर 20% तक की छूट", color: "#16a34a" },
            { id: "b2", title: "Free Delivery", titleHi: "मुफ्त डिलीवरी", sub: "On orders above ₹499", subHi: "₹499 से अधिक के ऑर्डर पर", color: "#d97706" },
            { id: "b3", title: "Machinery EMI", titleHi: "मशीनरी ईएमआई", sub: "0% interest up to 12 months", subHi: "12 महीने तक 0% ब्याज", color: "#0891b2" },
          ],
        }), { headers });
      }

      case "details": {
        const product = CATALOG.find(p => p.id === body.id);
        if (!product) return bad("Product not found", 404);
        const related = CATALOG.filter(p => p.category === product.category && p.id !== product.id).slice(0, 4);
        const userReviews = REVIEWS.filter(r => r.productId === product.id);
        return new Response(JSON.stringify({
          product: { ...product, ...summarize(product, product.stock > 0) },
          related: related.map(p => summarize(p, p.stock > 0)),
          reviews: [
            ...userReviews.map(r => ({ user: r.userName, rating: r.rating, comment: r.comment, when: "Just now" })),
            ...seededReviews(product.id, product.reviews).slice(0, 8),
          ],
        }), { headers });
      }

      case "coupons": {
        const code = typeof body.code === "string" ? body.code : "";
        if (!code) return new Response(JSON.stringify({ coupons: COUPONS.map(c => ({ code: c.code, desc: c.desc, descHi: c.descHi, min: c.min, expiry: c.expiry })) }), { headers });
        const subtotal = typeof body.subtotal === "number" ? body.subtotal : 0;
        return new Response(JSON.stringify(validateCoupon(code, subtotal)), { headers });
      }

      case "place-order": {
        const authResult = await validateAuth(req);
        if (!authResult.authenticated) {
          return authErrorResponse("Authentication required to place an order", headers);
        }
        const userId = authResult.userId;
        const items = Array.isArray(body.items) ? body.items as Array<{ id: string; qty: number }> : [];
        if (items.length === 0) return bad("Cart is empty");
        const lines: Array<Record<string, unknown>> = [];
        let subtotal = 0;
        for (const it of items) {
          const product = CATALOG.find(p => p.id === it.id);
          if (!product) return bad(`Product not found: ${it.id}`);
          const qty = Math.max(1, Math.min(50, Math.floor(Number(it.qty) || 1)));
          const lineTotal = product.price * qty;
          subtotal += lineTotal;
          lines.push({
            productId: product.id, name: product.name, nameHi: product.nameHi, unit: product.unit,
            price: product.price, qty, lineTotal, color: product.color, category: product.category,
          });
        }
        const couponCode = typeof body.couponCode === "string" ? body.couponCode : "";
        let discount = 0;
        let coupon = null;
        if (couponCode) {
          const v = validateCoupon(couponCode, subtotal);
          if (!v.ok) return bad(v.error || "Invalid coupon");
          discount = v.coupon?.discount ?? 0;
          coupon = v.coupon;
        }
        const freeShip = subtotal - discount >= 499;
        const shipping = coupon && coupon.code === "FREESHIP" ? 0 : freeShip ? 0 : 49;
        const total = subtotal - discount + shipping;
        const id = crypto.randomUUID();
        const order: Record<string, unknown> = {
          id,
          items: lines,
          subtotal,
          discount,
          shipping,
          total,
          couponCode: coupon?.code || "",
          couponDesc: coupon?.desc || "",
          userName: typeof body.name === "string" ? body.name : "Farmer",
          phone: typeof body.phone === "string" ? body.phone : "",
          address: typeof body.address === "string" ? body.address : "",
          paymentMethod: typeof body.paymentMethod === "string" ? body.paymentMethod : "upi",
          paymentStatus: "pending",
          status: "confirmed",
          userId,
          placedAt: new Date().toISOString(),
        };
        await saveOrder(order, userId);
        return new Response(JSON.stringify({ order, tracking: buildTracking(id, 300 + (hashStr(id) % 700), Date.now()) }), { headers });
      }

      case "orders": {
        const authResult = await validateAuth(req);
        if (!authResult.authenticated) {
          return authErrorResponse("Authentication required", headers);
        }
        let mine = Array.from(ORDERS.values()).filter(o => o.userId === authResult.userId);
        if (mine.length === 0) {
          try {
            const supabaseUrl = Deno.env.get("SUPABASE_URL");
            const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
            if (supabaseUrl && supabaseKey) {
              const supabase = createClient(supabaseUrl, supabaseKey);
              const { data } = await supabase.from("market_orders").select("*").eq("user_id", authResult.userId).order("created_at", { ascending: false });
              if (data && data.length > 0) {
                mine = data.map((r: Record<string, unknown>) => ({
                  id: r.order_id || r.id,
                  items: typeof r.items === "string" ? JSON.parse(r.items) : r.items,
                  subtotal: r.subtotal,
                  discount: r.discount,
                  shipping: r.shipping,
                  total: r.total,
                  couponCode: r.coupon_code,
                  userName: r.user_name,
                  phone: r.phone,
                  address: r.address,
                  paymentMethod: r.payment_method,
                  status: r.status,
                  userId: r.user_id,
                }));
              }
            }
          } catch {
            // fall back to in-memory only
          }
        }
        return new Response(JSON.stringify({ orders: mine.slice().reverse() }), { headers });
      }

      case "track-order": {
        const authResult = await validateAuth(req);
        if (!authResult.authenticated) {
          return authErrorResponse("Authentication required", headers);
        }
        const orderId = String(body.orderId || "");
        if (!orderId) return bad("orderId is required", 400);

        // Try in-memory first, then DB fallback
        let order = ORDERS.get(orderId);
        if (order && order.userId !== authResult.userId) return bad("Order not found", 404);

        if (!order) {
          try {
            const supabaseUrl = Deno.env.get("SUPABASE_URL");
            const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
            if (supabaseUrl && supabaseKey) {
              const supabase = createClient(supabaseUrl, supabaseKey);
              const { data } = await supabase
                .from("transport_bookings")
                .select("*")
                .eq("id", orderId)
                .single();
              if (data && data.name) {
                order = { id: data.id, userId: data.name, status: data.date || "confirmed" };
              }
            }
          } catch {
            // fall back to in-memory only
          }
        }

        if (!order) return bad("Order not found", 404);
        return new Response(JSON.stringify({ tracking: buildTracking(order.id as string, 500, Date.now()) }), { headers });
      }

      case "review": {
        const authResult = await validateAuth(req);
        if (!authResult.authenticated) {
          return authErrorResponse("Authentication required to post a review", headers);
        }
        const product = CATALOG.find(p => p.id === body.productId);
        if (!product) return bad("Product not found", 404);
        const rating = Math.max(1, Math.min(5, Math.round(Number(body.rating) || 5)));
        REVIEWS.push({
          productId: product.id,
          userName: typeof body.userName === "string" ? body.userName : "Farmer",
          rating,
          comment: typeof body.comment === "string" ? body.comment.slice(0, 500) : "",
          createdAt: new Date().toISOString(),
        });
        product.reviews += 1;
        product.rating = Math.round(((product.rating * (product.reviews - 1) + rating) / product.reviews) * 10) / 10;
        return new Response(JSON.stringify({ success: true, rating: product.rating, reviews: product.reviews }), { headers });
      }

      case "ping":
        return new Response(JSON.stringify({ ok: true, catalog: CATALOG.length }), { headers });

      default:
        return bad("Unknown action");
    }
  } catch (error) {
    console.error("Agri market function error:", error);
    return new Response(JSON.stringify({ error: "An unexpected error occurred. Please try again." }), { status: 500, headers });
  }
});
