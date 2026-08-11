import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit, getRateLimitHeaders } from "../_shared/rate-limiter.ts";
import { validateAuth, authErrorResponse } from "../_shared/auth-validator.ts";

const ALLOWED_ORIGINS = (
  Deno.env.get("ALLOWED_ORIGINS") ||
  "http://localhost:3000,http://localhost:8000,https://agriconnect.in"
).split(",").map(o => o.trim());

function getCORSHeaders(origin: string | null): Record<string, string> {
  const allowed = origin && ALLOWED_ORIGINS.some((o) => o === origin) ? origin : null;
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Headers": "authorization, x-client-info, content-type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
  };
}

const RATE_LIMIT_CONFIG = { maxRequests: 60, windowMs: 60 * 1000 };

const CATEGORIES = ["Tractor", "Rotavator", "Harvester", "Plough", "Seeder", "Cultivator", "Thresher", "Sprayer"] as const;
type Category = typeof CATEGORIES[number];

interface Owner {
  id: string;
  name: string;
  nameHi: string;
  phone: string;
  rating: number;
  jobs: number;
  verified: boolean;
  joined: string;
  response: string;
  avatar: string;
  village: string;
  city: string;
  state: string;
  lat: number;
  lng: number;
}

interface Listing {
  id: string;
  name: string;
  category: Category;
  brand: string;
  hp?: number;
  implements: string[];
  owner: Owner;
  rateHour: number;
  rateAcre: number;
  rateDay: number;
  deposit: number;
  rating: number;
  reviews: number;
  status: "available" | "busy" | "maintenance";
  nextAvailable: string;
  year: number;
  engine: string;
  lifting: string;
  fuel: string;
  cabin: boolean;
  features: string[];
  city: string;
  state: string;
  lat: number;
  lng: number;
  color: string;
  popular: boolean;
  description: string;
}

const FALLBACK_CATALOG: Listing[] = [
  { id: "t-1", name: "Mahindra 575 DI", category: "Tractor", brand: "Mahindra", hp: 45, implements: ["Rotavator", "Cultivator"], owner: { id: "o-1", name: "Ramesh Kumar", nameHi: "रमेश कुमार", phone: "+919811000111", rating: 4.9, jobs: 142, verified: true, joined: "2021", response: "< 10 min", avatar: "RK", village: "Gillanwala", city: "Jaipur", state: "Rajasthan", lat: 26.9124, lng: 75.7873 }, rateHour: 800, rateAcre: 1200, rateDay: 7000, deposit: 2000, rating: 4.8, reviews: 86, status: "available", nextAvailable: "Available now", year: 2021, engine: "2730 cc", lifting: "1400 kg", fuel: "Diesel", cabin: false, features: ["Hydraulic", "Power Steering", "GPS Fitted"], city: "Jaipur", state: "Rajasthan", lat: 26.9124, lng: 75.7873, color: "#16a34a", popular: true, description: "Well maintained 45 HP Mahindra with new rotavator. Best for ploughing and sowing on medium farms." },
  { id: "t-2", name: "Sonalika Tiger 55", category: "Tractor", brand: "Sonalika", hp: 55, implements: ["Plough", "Harvester"], owner: { id: "o-2", name: "Suresh Singh", nameHi: "सुरेश सिंह", phone: "+919811000222", rating: 4.6, jobs: 98, verified: true, joined: "2020", response: "< 30 min", avatar: "SS", village: "Dhana Kalan", city: "Ludhiana", state: "Punjab", lat: 30.901, lng: 75.8573 }, rateHour: 900, rateAcre: 1400, rateDay: 8000, deposit: 2500, rating: 4.5, reviews: 61, status: "busy", nextAvailable: "Today 5 PM", year: 2019, engine: "3100 cc", lifting: "1600 kg", fuel: "Diesel", cabin: false, features: ["Front Trolley Hook", "Heavy Duty", "Certified"], city: "Ludhiana", state: "Punjab", lat: 30.901, lng: 75.8573, color: "#2563eb", popular: true, description: "Powerful 55 HP Tiger for heavy operations. Currently engaged; available by evening." },
  { id: "t-3", name: "John Deere 5310", category: "Tractor", brand: "John Deere", hp: 55, implements: ["Rotavator", "Plough"], owner: { id: "o-3", name: "Vikram Jat", nameHi: "विक्रम जाट", phone: "+919811000333", rating: 5.0, jobs: 210, verified: true, joined: "2019", response: "< 5 min", avatar: "VJ", village: "Chhani", city: "Bharatpur", state: "Rajasthan", lat: 27.2173, lng: 77.4901 }, rateHour: 1100, rateAcre: 1600, rateDay: 10000, deposit: 3000, rating: 4.9, reviews: 128, status: "available", nextAvailable: "Available now", year: 2022, engine: "2900 cc", lifting: "1750 kg", fuel: "Diesel", cabin: true, features: ["AC Cabin", "8+8 Syncro", "Telematics"], city: "Bharatpur", state: "Rajasthan", lat: 27.2173, lng: 77.4901, color: "#ca8a04", popular: true, description: "Premium John Deere with AC cabin and GPS. Ideal for large landholdings and contract work." },
  { id: "t-4", name: "Swaraj 855", category: "Tractor", brand: "Swaraj", hp: 52, implements: ["Seeder", "Cultivator"], owner: { id: "o-4", name: "Amit Patel", nameHi: "अमित पटेल", phone: "+919811000444", rating: 4.7, jobs: 121, verified: true, joined: "2020", response: "< 15 min", avatar: "AP", village: "Pratapgarh", city: "Kanpur", state: "Uttar Pradesh", lat: 26.4499, lng: 80.3319 }, rateHour: 850, rateAcre: 1300, rateDay: 7500, deposit: 2000, rating: 4.6, reviews: 74, status: "available", nextAvailable: "Available now", year: 2018, engine: "2900 cc", lifting: "1300 kg", fuel: "Diesel", cabin: false, features: ["Synchronised Gearbox", "Compact"], city: "Kanpur", state: "Uttar Pradesh", lat: 26.4499, lng: 80.3319, color: "#dc2626", popular: false, description: "Reliable Swaraj with good fuel efficiency for small to medium farms." },
  { id: "t-5", name: "Massey Ferguson 241", category: "Tractor", brand: "Massey Ferguson", hp: 42, implements: ["Rotavator", "Plough"], owner: { id: "o-5", name: "Gurmeet Singh", nameHi: "गुरमीत सिंह", phone: "+919811000555", rating: 4.4, jobs: 87, verified: true, joined: "2021", response: "< 20 min", avatar: "GS", village: "Bhadaur", city: "Barnala", state: "Punjab", lat: 30.3738, lng: 75.5484 }, rateHour: 780, rateAcre: 1250, rateDay: 6900, deposit: 2000, rating: 4.4, reviews: 53, status: "available", nextAvailable: "Available now", year: 2020, engine: "2600 cc", lifting: "1350 kg", fuel: "Diesel", cabin: false, features: ["Power Steering", "Low Fuel Consumption"], city: "Barnala", state: "Punjab", lat: 30.3738, lng: 75.5484, color: "#9333ea", popular: false, description: "Fuel-efficient MF 241 ideal for ploughing and light hauling." },
  { id: "t-6", name: "Kubota M5-091", category: "Harvester", brand: "Kubota", implements: ["Wheat", "Paddy"], owner: { id: "o-6", name: "Dilip Mahato", nameHi: "दिलीप महतो", phone: "+919811000666", rating: 4.8, jobs: 76, verified: true, joined: "2022", response: "< 10 min", avatar: "DM", village: "Makhdumpur", city: "Jehanabad", state: "Bihar", lat: 25.2151, lng: 84.9883 }, rateHour: 2400, rateAcre: 2200, rateDay: 22000, deposit: 5000, rating: 4.8, reviews: 44, status: "available", nextAvailable: "Available now", year: 2023, engine: "3100 cc", lifting: "0 kg", fuel: "Diesel", cabin: true, features: ["Self Propelled", "18 ft Header", "Straw Baler"], city: "Jehanabad", state: "Bihar", lat: 25.2151, lng: 84.9883, color: "#0891b2", popular: true, description: "Modern combine harvester with 18 ft header. Perfect for wheat and paddy harvest season." },
  { id: "t-7", name: "Mahindra Rotavator 4FT", category: "Rotavator", brand: "Mahindra", implements: ["Ploughing", "Seedbed"], owner: { id: "o-7", name: "Prakash Nair", nameHi: "प्रकाश नायर", phone: "+919811000777", rating: 4.5, jobs: 132, verified: true, joined: "2020", response: "< 15 min", avatar: "PN", village: "Vellayani", city: "Thiruvananthapuram", state: "Kerala", lat: 8.4371, lng: 76.9826 }, rateHour: 550, rateAcre: 900, rateDay: 5000, deposit: 1500, rating: 4.5, reviews: 92, status: "available", nextAvailable: "Available now", year: 2022, engine: "0 cc", lifting: "0 kg", fuel: "PTO Driven", cabin: false, features: ["Heavy Duty Blades", "360° PTO", "Depth Control"], city: "Thiruvananthapuram", state: "Kerala", lat: 8.4371, lng: 76.9826, color: "#16a34a", popular: true, description: "4 ft heavy-duty rotavator that mounts on any 35-55 HP tractor. Great for seedbed preparation." },
  { id: "t-8", name: "Sonalika Plough 3-Typr", category: "Plough", brand: "Sonalika", implements: ["Mould Board"], owner: { id: "o-8", name: "Ravi Yadav", nameHi: "रवि यादव", phone: "+919811000888", rating: 4.3, jobs: 65, verified: false, joined: "2023", response: "< 40 min", avatar: "RY", village: "Sarai", city: "Varanasi", state: "Uttar Pradesh", lat: 25.3176, lng: 82.9739 }, rateHour: 500, rateAcre: 850, rateDay: 4500, deposit: 1200, rating: 4.2, reviews: 37, status: "available", nextAvailable: "Available now", year: 2021, engine: "0 cc", lifting: "0 kg", fuel: "PTO Driven", cabin: false, features: ["Mould Board Plough", "Disc Attachment"], city: "Varanasi", state: "Uttar Pradesh", lat: 25.3176, lng: 82.9739, color: "#ca8a04", popular: false, description: "3-tyne mould board plough for deep tilling. Pairs with 40+ HP tractors." },
  { id: "t-9", name: "Kubota M7-171", category: "Tractor", brand: "Kubota", hp: 170, implements: ["Rotavator", "Plough", "Seeder"], owner: { id: "o-9", name: "Harpreet Kaur", nameHi: "हरप्रीत कौर", phone: "+919811000999", rating: 4.7, jobs: 58, verified: true, joined: "2022", response: "< 10 min", avatar: "HK", village: "Khera", city: "Mansa", state: "Punjab", lat: 29.9884, lng: 75.3832 }, rateHour: 1800, rateAcre: 2500, rateDay: 16000, deposit: 4500, rating: 4.7, reviews: 29, status: "busy", nextAvailable: "Tomorrow 8 AM", year: 2023, engine: "6100 cc", lifting: "3100 kg", fuel: "Diesel", cabin: true, features: ["AC Cabin", "Powershift 24x24", "Auto Guidance"], city: "Mansa", state: "Punjab", lat: 29.9884, lng: 75.3832, color: "#0891b2", popular: true, description: "High horsepower Kubota for contractors. Auto-guidance ready for precision farming." },
  { id: "t-10", name: "Swaraj XT Tractor", category: "Tractor", brand: "Swaraj", hp: 42, implements: ["Rotavator"], owner: { id: "o-10", name: "Mahesh Gowda", nameHi: "महेश गौड़ा", phone: "+919822000111", rating: 4.6, jobs: 110, verified: true, joined: "2020", response: "< 20 min", avatar: "MG", village: "Hosahalli", city: "Mysuru", state: "Karnataka", lat: 12.2958, lng: 76.6394 }, rateHour: 700, rateAcre: 1100, rateDay: 6200, deposit: 1800, rating: 4.6, reviews: 83, status: "available", nextAvailable: "Available now", year: 2020, engine: "2700 cc", lifting: "1250 kg", fuel: "Diesel", cabin: false, features: ["Tilt Steering", "Dual Clutch"], city: "Mysuru", state: "Karnataka", lat: 12.2958, lng: 76.6394, color: "#16a34a", popular: false, description: "Dependable Swaraj XT for inter-cultivation and hauling. Driver available." },
  { id: "t-11", name: "FieldKing Harvester", category: "Harvester", brand: "FieldKing", implements: ["Paddy", "Soybean"], owner: { id: "o-11", name: "Nilesh Pawar", nameHi: "निलेश पवार", phone: "+919822000222", rating: 4.4, jobs: 71, verified: true, joined: "2021", response: "< 15 min", avatar: "NP", village: "Manjari", city: "Pune", state: "Maharashtra", lat: 18.5204, lng: 73.8567 }, rateHour: 2200, rateAcre: 2100, rateDay: 20000, deposit: 5000, rating: 4.4, reviews: 39, status: "maintenance", nextAvailable: "In 2 days", year: 2021, engine: "3400 cc", lifting: "0 kg", fuel: "Diesel", cabin: true, features: ["Comfort Cabin", "Paddy Header", "Auto Level"], city: "Pune", state: "Maharashtra", lat: 18.5204, lng: 73.8567, color: "#dc2626", popular: false, description: "FieldKing harvester under routine maintenance. Back in service shortly." },
  { id: "t-12", name: "Tirth Agro Seed Drill", category: "Seeder", brand: "Tirth", implements: ["Seed Drill", "Fertilizer"], owner: { id: "o-12", name: "Karan Rathore", nameHi: "करण राठौड़", phone: "+919822000333", rating: 4.6, jobs: 94, verified: true, joined: "2019", response: "< 10 min", avatar: "KR", village: "Semari", city: "Kota", state: "Rajasthan", lat: 25.2138, lng: 75.8648 }, rateHour: 600, rateAcre: 1000, rateDay: 5400, deposit: 1500, rating: 4.6, reviews: 58, status: "available", nextAvailable: "Available now", year: 2022, engine: "0 cc", lifting: "0 kg", fuel: "PTO Driven", cabin: false, features: ["9 Row", "Fertilizer Hopper", "Zero Till"], city: "Kota", state: "Rajasthan", lat: 25.2138, lng: 75.8648, color: "#9333ea", popular: true, description: "9-row zero-till seed drill with fertilizer attachment for faster sowing." },
  { id: "t-13", name: "VST 30HP Tractor", category: "Tractor", brand: "VST", hp: 30, implements: ["Cultivator"], owner: { id: "o-13", name: "Sundar Rajan", nameHi: "सुंदर राजन", phone: "+919822000444", rating: 4.5, jobs: 66, verified: true, joined: "2021", response: "< 25 min", avatar: "SR", village: "Kallakurichi", city: "Villupuram", state: "Tamil Nadu", lat: 11.74, lng: 78.995 }, rateHour: 620, rateAcre: 950, rateDay: 5600, deposit: 1500, rating: 4.5, reviews: 41, status: "available", nextAvailable: "Available now", year: 2019, engine: "1800 cc", lifting: "900 kg", fuel: "Diesel", cabin: false, features: ["Compact", "Orchard Friendly"], city: "Villupuram", state: "Tamil Nadu", lat: 11.74, lng: 78.995, color: "#2563eb", popular: false, description: "Compact 30 HP VST perfect for orchards and inter-row operations." },
  { id: "t-14", name: "Balwan Thresher", category: "Thresher", brand: "Balwan", implements: ["Wheat", "Mustard"], owner: { id: "o-14", name: "Mohit Bishnoi", nameHi: "मोहित बिश्नोई", phone: "+919822000555", rating: 4.2, jobs: 47, verified: false, joined: "2023", response: "< 45 min", avatar: "MB", village: "Abhorsar", city: "Bikaner", state: "Rajasthan", lat: 28.0229, lng: 73.3119 }, rateHour: 750, rateAcre: 800, rateDay: 6500, deposit: 2000, rating: 4.1, reviews: 22, status: "available", nextAvailable: "Available now", year: 2021, engine: "0 cc", lifting: "0 kg", fuel: "PTO Driven", cabin: false, features: ["Grain Cleaner", "Bagging Unit"], city: "Bikaner", state: "Rajasthan", lat: 28.0229, lng: 73.3119, color: "#ca8a04", popular: false, description: "High capacity thresher for wheat and mustard with integrated grain cleaner." },
  { id: "t-15", name: "New Holland 5630", category: "Tractor", brand: "New Holland", hp: 57, implements: ["Rotavator", "Plough", "Baler"], owner: { id: "o-15", name: "Rajdeep Gill", nameHi: "राजदीप गिल", phone: "+919822000666", rating: 4.8, jobs: 134, verified: true, joined: "2019", response: "< 8 min", avatar: "RG", village: "Mehal Kalan", city: "Moga", state: "Punjab", lat: 30.8165, lng: 75.1681 }, rateHour: 1000, rateAcre: 1500, rateDay: 9000, deposit: 2500, rating: 4.8, reviews: 96, status: "available", nextAvailable: "Available now", year: 2022, engine: "2800 cc", lifting: "1800 kg", fuel: "Diesel", cabin: true, features: ["AC Cabin", "24x8 Transmission", "Baler Kit"], city: "Moga", state: "Punjab", lat: 30.8165, lng: 75.1681, color: "#16a34a", popular: true, description: "Versatile New Holland with baler kit. Great all-rounder for North Indian farming." },
  { id: "t-16", name: "Shaktiman Cultivator", category: "Cultivator", brand: "Shaktiman", implements: ["Interculture"], owner: { id: "o-16", name: "Bhavesh Solanki", nameHi: "भावेश सोलंकी", phone: "+919822000777", rating: 4.3, jobs: 58, verified: true, joined: "2022", response: "< 20 min", avatar: "BS", village: "Mehsana", city: "Ahmedabad", state: "Gujarat", lat: 23.0225, lng: 72.5714 }, rateHour: 480, rateAcre: 820, rateDay: 4300, deposit: 1200, rating: 4.3, reviews: 33, status: "available", nextAvailable: "Available now", year: 2020, engine: "0 cc", lifting: "0 kg", fuel: "PTO Driven", cabin: false, features: ["11 Tyne", "Adjustable Depth", "Spring Loaded"], city: "Ahmedabad", state: "Gujarat", lat: 23.0225, lng: 72.5714, color: "#0891b2", popular: false, description: "11-tyne spring-loaded cultivator for fast interculture and weed control." },
  { id: "t-17", name: "Crompton Sprayer", category: "Sprayer", brand: "Crompton", implements: ["Pesticide", "Weedicide"], owner: { id: "o-17", name: "Sujata Kulkarni", nameHi: "सुजाता कुलकर्णी", phone: "+919822000888", rating: 4.5, jobs: 72, verified: true, joined: "2021", response: "< 15 min", avatar: "SK", village: "Lasalgaon", city: "Nashik", state: "Maharashtra", lat: 20.1427, lng: 74.2235 }, rateHour: 420, rateAcre: 700, rateDay: 3800, deposit: 1000, rating: 4.5, reviews: 49, status: "available", nextAvailable: "Available now", year: 2023, engine: "0 cc", lifting: "0 kg", fuel: "PTO Driven", cabin: false, features: ["600 L Tank", "Boom 12 m", "Auto Mix"], city: "Nashik", state: "Maharashtra", lat: 20.1427, lng: 74.2235, color: "#16a34a", popular: false, description: "600 litre boom sprayer with 12 m coverage for vineyards and vegetable farms." },
  { id: "t-18", name: "Eicher 548 Tractor", category: "Tractor", brand: "Eicher", hp: 48, implements: ["Cultivator", "Trolley"], owner: { id: "o-18", name: "Lokesh Reddy", nameHi: "लोकेश रेड्डी", phone: "+919822000999", rating: 4.4, jobs: 89, verified: true, joined: "2020", response: "< 18 min", avatar: "LR", village: "Medak", city: "Hyderabad", state: "Telangana", lat: 17.385, lng: 78.4867 }, rateHour: 760, rateAcre: 1200, rateDay: 6800, deposit: 2000, rating: 4.4, reviews: 57, status: "available", nextAvailable: "Available now", year: 2019, engine: "2800 cc", lifting: "1350 kg", fuel: "Diesel", cabin: false, features: ["Trolley Kit", "Power Steering"], city: "Hyderabad", state: "Telangana", lat: 17.385, lng: 78.4867, color: "#2563eb", popular: false, description: "Sturdy Eicher with trolley kit for transport and light field work." },
  { id: "t-19", name: "CLAAS Dominator", category: "Harvester", brand: "CLAAS", implements: ["Paddy", "Maize"], owner: { id: "o-19", name: "Anil Kumar", nameHi: "अनिल कुमार", phone: "+919833000111", rating: 4.7, jobs: 52, verified: true, joined: "2022", response: "< 12 min", avatar: "AK", village: "Palladam", city: "Coimbatore", state: "Tamil Nadu", lat: 10.9957, lng: 77.2536 }, rateHour: 2600, rateAcre: 2400, rateDay: 24000, deposit: 6000, rating: 4.7, reviews: 31, status: "available", nextAvailable: "Available now", year: 2023, engine: "3600 cc", lifting: "0 kg", fuel: "Diesel", cabin: true, features: ["GPS Yield Map", "20 ft Header", "Rotary Separator"], city: "Coimbatore", state: "Tamil Nadu", lat: 10.9957, lng: 77.2536, color: "#ca8a04", popular: true, description: "Premium CLAAS combine with GPS yield mapping. For large commercial harvests." },
  { id: "t-20", name: "Preet Plough", category: "Plough", brand: "Preet", implements: ["Disc Harrow"], owner: { id: "o-20", name: "Simran Sandhu", nameHi: "सिमरन संधू", phone: "+919833000222", rating: 4.6, jobs: 63, verified: true, joined: "2021", response: "< 10 min", avatar: "SS2", village: "Doraha", city: "Ludhiana", state: "Punjab", lat: 30.8158, lng: 76.1028 }, rateHour: 520, rateAcre: 880, rateDay: 4700, deposit: 1300, rating: 4.6, reviews: 40, status: "available", nextAvailable: "Available now", year: 2021, engine: "0 cc", lifting: "0 kg", fuel: "PTO Driven", cabin: false, features: ["Disc Harrow", "Dual Gang"], city: "Ludhiana", state: "Punjab", lat: 30.8158, lng: 76.1028, color: "#9333ea", popular: false, description: "Heavy disc harrow for secondary tillage and clod breaking." },
  { id: "t-21", name: "Farmtrac 60 PowerMax", category: "Tractor", brand: "Farmtrac", hp: 60, implements: ["Rotavator", "Plough", "Forklift"], owner: { id: "o-21", name: "Dhananjay Verma", nameHi: "धनंजय वर्मा", phone: "+919833000333", rating: 4.5, jobs: 77, verified: true, joined: "2020", response: "< 15 min", avatar: "DV", village: "Belwa", city: "Gorakhpur", state: "Uttar Pradesh", lat: 26.7606, lng: 83.3732 }, rateHour: 920, rateAcre: 1350, rateDay: 8200, deposit: 2500, rating: 4.5, reviews: 55, status: "maintenance", nextAvailable: "Tomorrow 11 AM", year: 2020, engine: "3000 cc", lifting: "1600 kg", fuel: "Diesel", cabin: false, features: ["Forklift Ready", "8+2 Shift"], city: "Gorakhpur", state: "Uttar Pradesh", lat: 26.7606, lng: 83.3732, color: "#dc2626", popular: false, description: "Farmtrac 60 with forklift capability. Brief maintenance window currently." },
  { id: "t-22", name: "VST Shakti DI", category: "Tractor", brand: "VST", hp: 32, implements: ["Rotavator", "Water Pump"], owner: { id: "o-22", name: "Ganesh Hegde", nameHi: "गणेश हेगड़े", phone: "+919833000444", rating: 4.5, jobs: 68, verified: true, joined: "2021", response: "< 20 min", avatar: "GH", village: "Barkur", city: "Udupi", state: "Karnataka", lat: 13.3409, lng: 74.7452 }, rateHour: 640, rateAcre: 980, rateDay: 5800, deposit: 1500, rating: 4.5, reviews: 46, status: "available", nextAvailable: "Available now", year: 2022, engine: "2000 cc", lifting: "950 kg", fuel: "Diesel", cabin: false, features: ["Water Pump PTO", "Compact", "Oil Immersed Brakes"], city: "Udupi", state: "Karnataka", lat: 13.3409, lng: 74.7452, color: "#16a34a", popular: false, description: "Compact VST with PTO water pump, ideal for smallholdings and coastal farms." },
  { id: "t-23", name: "Kubota Rice Transplanter", category: "Seeder", brand: "Kubota", implements: ["Rice Planting"], owner: { id: "o-23", name: "Bibhuti Mohanty", nameHi: "बिभूति मोहंती", phone: "+919833000555", rating: 4.6, jobs: 41, verified: true, joined: "2022", response: "< 12 min", avatar: "BM", village: "Kendrapara", city: "Bhubaneswar", state: "Odisha", lat: 20.2961, lng: 85.8245 }, rateHour: 1900, rateAcre: 2000, rateDay: 17000, deposit: 4000, rating: 4.6, reviews: 26, status: "available", nextAvailable: "Available now", year: 2023, engine: "1500 cc", lifting: "0 kg", fuel: "Diesel", cabin: false, features: ["8 Row", "Auto Leveling", "Seedling Tray"], city: "Bhubaneswar", state: "Odisha", lat: 20.2961, lng: 85.8245, color: "#0891b2", popular: true, description: "8-row rice transplanter that cuts planting time by 70%. Auto leveling for paddy fields." },
  { id: "t-24", name: "New Holland Drip Sprayer", category: "Sprayer", brand: "New Holland", implements: ["Drip", "Foliar"], owner: { id: "o-24", name: "Fatima Sheikh", nameHi: "फातिमा शेख", phone: "+919833000666", rating: 4.4, jobs: 54, verified: true, joined: "2021", response: "< 15 min", avatar: "FS", village: "Uran", city: "Navi Mumbai", state: "Maharashtra", lat: 18.8782, lng: 72.9394 }, rateHour: 450, rateAcre: 750, rateDay: 4000, deposit: 1100, rating: 4.4, reviews: 35, status: "available", nextAvailable: "Available now", year: 2022, engine: "0 cc", lifting: "0 kg", fuel: "PTO Driven", cabin: false, features: ["800 L Tank", "Foliar Kit", "Drip Ready"], city: "Navi Mumbai", state: "Maharashtra", lat: 18.8782, lng: 72.9394, color: "#9333ea", popular: false, description: "Large-capacity sprayer for drip fertigation and foliar feeding." },
];

const DRIVERS = ["Suresh Kumar", "Baldev Singh", "Rahul Verma", "Imran Khan", "Mahesh Patil", "Deepak Yadav"];
const PLATES = ["RJ 14 GB 4521", "PB 10 AB 8812", "UP 32 CD 5519", "MH 12 DE 3390", "KA 01 FG 7742", "GJ 05 HJ 2261"];

const BOOKINGS = new Map<string, Record<string, unknown>>();
const REVIEWS: Array<Record<string, unknown>> = [];

let catalogCache: Listing[] | null = null;

function rowToListing(row: Record<string, unknown>): Listing {
  return {
    id: row.id as string,
    name: row.name as string,
    category: row.category as Category,
    brand: row.brand as string,
    hp: row.hp as number | undefined,
    implements: row.implements as string[] ?? [],
    owner: {
      id: row.owner_id as string,
      name: row.owner_name as string,
      nameHi: row.owner_name_hi as string,
      phone: row.owner_phone as string,
      rating: Number(row.owner_rating ?? 5),
      jobs: Number(row.owner_jobs ?? 0),
      verified: Boolean(row.owner_verified),
      joined: row.owner_joined as string,
      response: row.owner_response as string,
      avatar: row.owner_avatar as string,
      village: row.owner_village as string,
      city: row.owner_city as string,
      state: row.owner_state as string,
      lat: Number(row.owner_lat ?? 0),
      lng: Number(row.owner_lng ?? 0),
    },
    rateHour: Number(row.rate_hour),
    rateAcre: Number(row.rate_acre),
    rateDay: Number(row.rate_day),
    deposit: Number(row.deposit),
    rating: Number(row.rating ?? 0),
    reviews: Number(row.reviews ?? 0),
    status: row.status as Listing["status"],
    nextAvailable: row.next_available as string,
    year: Number(row.year ?? 0),
    engine: row.engine as string,
    lifting: row.lifting as string,
    fuel: row.fuel as string,
    cabin: Boolean(row.cabin),
    features: row.features as string[] ?? [],
    city: row.city as string,
    state: row.state as string,
    lat: Number(row.lat ?? 0),
    lng: Number(row.lng ?? 0),
    color: row.color as string,
    popular: Boolean(row.popular),
    description: row.description as string,
  };
}

async function getCatalog(): Promise<Listing[]> {
  if (catalogCache) return catalogCache;
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (supabaseUrl && supabaseKey) {
      const supabase = createClient(supabaseUrl, supabaseKey);
      const { data, error } = await supabase
        .from("tractor_listings")
        .select("*")
        .order("created_at", { ascending: true });
      if (!error && data && data.length > 0) {
        catalogCache = data.map(r => rowToListing(r as Record<string, unknown>));
        return catalogCache;
      }
    }
  } catch {
    // fall back to embedded catalog below
  }
  return FALLBACK_CATALOG;
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

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
}

function maskPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 4) return "********";
  return "******" + digits.slice(-4);
}

function ratingStars(r: number): string {
  return "★".repeat(Math.round(r)) + "☆".repeat(5 - Math.round(r));
}

function seededReviews(listingId: string, count: number) {
  const names = ["Amit Sharma", "Pooja Devi", "Ranjit Singh", "Kavita Patel", "Sunil Kumar", "Meena Rani", "Arjun Meena", "Lakshmi N", "Bharat Jadav", "Nisha Gupta"];
  const comments = [
    "Machine arrived on time and was spotless. Driver was very professional.",
    "Great quality work, my field was ready in half the expected time.",
    "Reasonable rates and smooth booking. Would definitely rebook.",
    "The owner was helpful and explained everything. Highly recommended.",
    "On-time service, clean equipment, fair pricing. 5 stars.",
    "Slightly late but quality made up for it. Good experience overall.",
    "Very good condition tractor, no breakdown issues during work.",
    "Best price in the area and the driver knew the work well.",
    "Booking was instant and tracking worked perfectly.",
    "Superb service for my mango orchard. Very careful driving.",
  ];
  const out: Array<{ user: string; rating: number; comment: string; when: string }> = [];
  const rand = mulberry32(hashStr(listingId + "reviews"));
  const n = Math.min(count, 10);
  for (let i = 0; i < n; i++) {
    out.push({
      user: names[Math.floor(rand() * names.length)],
      rating: Math.min(5, Math.max(1, Math.round(3.6 + rand() * 1.5))),
      comment: comments[Math.floor(rand() * comments.length)],
      when: `${Math.floor(rand() * 30) + 1}d ago`,
    });
  }
  return out.sort((a, b) => Number(b.when.split("d")[0]) - Number(a.when.split("d")[0]));
}

function withDistance(listing: Listing, latitude?: number, longitude?: number) {
  const d = typeof latitude === "number" && typeof longitude === "number"
    ? haversineKm(latitude, longitude, listing.lat, listing.lng)
    : null;
  return {
    id: listing.id,
    name: listing.name,
    category: listing.category,
    brand: listing.brand,
    hp: listing.hp,
    implements: listing.implements,
    rateHour: listing.rateHour,
    rateAcre: listing.rateAcre,
    rateDay: listing.rateDay,
    deposit: listing.deposit,
    rating: listing.rating,
    reviews: listing.reviews,
    status: listing.status,
    nextAvailable: listing.nextAvailable,
    city: listing.city,
    state: listing.state,
    color: listing.color,
    popular: listing.popular,
    verified: listing.owner.verified,
    distance: d === null ? null : formatDistance(d),
    distanceKm: d,
  };
}

function buildFare(listing: Listing, hours: number, acres: number, withDriver: boolean) {
  const base = hours > 0 ? hours * listing.rateHour : acres * listing.rateAcre;
  const fuel = Math.round(base * 0.12);
  const driver = withDriver ? 150 : 0;
  const deposit = listing.deposit;
  const total = base + fuel + driver;
  return { base, fuel, driver, deposit, total };
}

function fakeEta(listing: Listing): number {
  const d = listing.distanceKm ?? 3 + (hashStr(listing.id) % 20) / 10;
  return Math.max(15, Math.round(d * 4 + 8));
}

function generateRoute(bookingId: string, ownerLat: number, ownerLng: number, destLat: number, destLng: number) {
  const rand = mulberry32(hashStr(bookingId + "route"));
  const points: Array<{ lat: number; lng: number }> = [];
  const steps = 8;
  for (let i = 0; i <= steps; i++) {
    const f = i / steps;
    const jitter = (rand() - 0.5) * 0.012;
    points.push({
      lat: ownerLat + (destLat - ownerLat) * f + jitter,
      lng: ownerLng + (destLng - ownerLng) * f + jitter,
    });
  }
  return points;
}

async function buildTracking(booking: Record<string, unknown>, now: number) {
  const catalog = await getCatalog();
  const listing = catalog.find(c => c.id === booking.tractorId) || catalog[0] || FALLBACK_CATALOG[0];
  const created = new Date((booking.createdAt as string) || Date.now()).getTime();
  const totalTrip = 55 + (hashStr(booking.id as string) % 30);
  const elapsedMin = Math.max(0, (now - created) / 60000);
  const progress = Math.min(99, Math.round((elapsedMin / totalTrip) * 100));
  const rand = mulberry32(hashStr(booking.id as string));
  const driver = DRIVERS[Math.floor(rand() * DRIVERS.length)];
  const plate = PLATES[Math.floor(rand() * PLATES.length)];
  const destLat = listing.owner.lat + (rand() - 0.5) * 0.15;
  const destLng = listing.owner.lng + (rand() - 0.5) * 0.15;
  const route = generateRoute(booking.id as string, listing.owner.lat, listing.owner.lng, destLat, destLng);
  const eta = Math.max(2, Math.round(totalTrip - elapsedMin));
  const steps = [
    { label: "Booking confirmed", time: "0 min", done: true },
    { label: "Driver assigned", time: "3 min", done: progress >= 5 },
    { label: "On the way", time: "5 min", done: progress >= 8 },
    { label: "Arriving at farm", time: `${totalTrip - 8} min`, done: progress >= 70 },
    { label: "Work in progress", time: "at site", done: progress >= 90 },
  ];
  return {
    bookingId: booking.id,
    tractor: listing.name,
    driver,
    plate,
    progress,
    eta,
    speed: progress < 95 ? Math.round(18 + rand() * 14) : 0,
    route,
    destination: { lat: destLat, lng: destLng },
    steps,
    totalTrip,
    status: progress >= 95 ? "completed" : progress >= 8 ? "enroute" : "assigned",
  };
}

async function saveBooking(b: Record<string, unknown>, userId?: string) {
  BOOKINGS.set(b.id as string, b);
  if (!userId) return;
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseKey) return;
    const supabase = createClient(supabaseUrl, supabaseKey);
    await supabase.from("tractor_bookings").insert({
      user_id: userId,
      user_name: b.userName,
      tractor_id: b.tractorId,
      tractor_name: b.tractorName,
      owner_id: b.ownerId,
      owner_name: b.ownerName,
      category: b.category,
      hours: b.hours,
      acres: b.acres,
      address: b.address,
      payment_method: b.paymentMethod,
      with_driver: b.withDriver,
      base_fare: b.baseFare,
      fuel_surcharge: b.fuelSurcharge,
      driver_charge: b.driverCharge,
      deposit: b.deposit,
      total: b.total,
      status: "confirmed",
    });
  } catch {
    console.error("Booking persistence skipped (table may not exist)");
  }
}

serve(async (req) => {
  const origin = req.headers.get("origin");
  const corsHeaders = getCORSHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const forwarded = req.headers.get("x-forwarded-for");
  const clientIP = forwarded ? forwarded.split(",")[0].trim() : "unknown";
  const rateLimit = await checkRateLimit(clientIP, "tractor-hire", RATE_LIMIT_CONFIG);
  if (!rateLimit.allowed) {
    return new Response(
      JSON.stringify({ error: "Too many requests. Please try again later." }),
      {
        status: 429,
        headers: {
          ...corsHeaders,
          ...getRateLimitHeaders(rateLimit),
          "Content-Type": "application/json",
          "Retry-After": Math.ceil((rateLimit.resetAt.getTime() - Date.now()) / 1000).toString(),
        },
      }
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
      case "list": {
        const search = typeof body.search === "string" ? body.search.trim().toLowerCase() : "";
        const category = typeof body.category === "string" ? body.category : "All";
        const minRate = typeof body.minRate === "number" ? body.minRate : 0;
        const maxRate = typeof body.maxRate === "number" ? body.maxRate : Number.MAX_SAFE_INTEGER;
        const minRating = typeof body.minRating === "number" ? body.minRating : 0;
        const availableOnly = Boolean(body.availableOnly);
        const verifiedOnly = Boolean(body.verifiedOnly);
        const sort = typeof body.sort === "string" ? body.sort : "distance";
        const latitude = typeof body.latitude === "number" ? body.latitude : undefined;
        const longitude = typeof body.longitude === "number" ? body.longitude : undefined;

        let results = (await getCatalog()).map(l => withDistance(l, latitude, longitude));

        if (category !== "All") results = results.filter(l => l.category === category);
        if (search) {
          results = results.filter(l =>
            l.name.toLowerCase().includes(search) ||
            l.brand.toLowerCase().includes(search) ||
            l.city.toLowerCase().includes(search) ||
            l.state.toLowerCase().includes(search) ||
            l.category.toLowerCase().includes(search)
          );
        }
        results = results.filter(l => l.rateHour >= minRate && l.rateHour <= maxRate && l.rating >= minRating);
        if (availableOnly) results = results.filter(l => l.status === "available");
        if (verifiedOnly) results = results.filter(l => l.verified);

        if (sort === "rating") results.sort((a, b) => b.rating - a.rating);
        else if (sort === "price_asc") results.sort((a, b) => a.rateHour - b.rateHour);
        else if (sort === "price_desc") results.sort((a, b) => b.rateHour - a.rateHour);
        else results.sort((a, b) => (a.distanceKm ?? 9999) - (b.distanceKm ?? 9999));

        const cat = await getCatalog();
        return new Response(JSON.stringify({
          tractors: results,
          categories: CATEGORIES,
          stats: {
            total: cat.length,
            available: cat.filter(c => c.status === "available").length,
            avgRating: Math.round((cat.reduce((s, c) => s + c.rating, 0) / cat.length) * 10) / 10,
            avgHour: Math.round(cat.reduce((s, c) => s + c.rateHour, 0) / cat.length),
          },
          hasLocation: typeof latitude === "number" && typeof longitude === "number",
        }), { headers });
      }

      case "details": {
        const listing = (await getCatalog()).find(c => c.id === body.id);
        if (!listing) return bad("Tractor not found", 404);
        const authResult = await validateAuth(req);
        const owner = authResult.authenticated
          ? listing.owner
          : { ...listing.owner, phone: maskPhone(listing.owner.phone) };
        const userReviews = REVIEWS.filter(r => r.tractorId === listing.id);
        const baseReviews = seededReviews(listing.id, listing.reviews).slice(0, 8);
        return new Response(JSON.stringify({
          tractor: {
            ...listing,
            owner,
            distance: listing.distanceKm === undefined ? null : formatDistance(listing.distanceKm || 2.4),
          },
          reviews: [...userReviews.map(r => ({ user: r.userName, rating: r.rating, comment: r.comment, when: "Just now" })), ...baseReviews],
          ratingStars: ratingStars(listing.rating),
        }), { headers });
      }

      case "book": {
        const listing = (await getCatalog()).find(c => c.id === body.tractorId);
        if (!listing) return bad("Tractor not found", 404);
        if (listing.status !== "available") {
          return bad(`Not available. ${listing.nextAvailable}`, 409);
        }
        const hours = typeof body.hours === "number" ? Math.max(0, body.hours) : 0;
        const acres = typeof body.acres === "number" ? Math.max(0, body.acres) : 0;
        if (hours <= 0 && acres <= 0) return bad("Please specify hours or acres");
        const withDriver = body.withDriver !== false;
        const fare = buildFare(listing, hours, acres, withDriver);
        const id = crypto.randomUUID();
        const booking: Record<string, unknown> = {
          id,
          tractorId: listing.id,
          tractorName: listing.name,
          category: listing.category,
          ownerId: listing.owner.id,
          ownerName: listing.owner.name,
          ownerPhone: listing.owner.phone,
          userName: typeof body.userName === "string" ? body.userName : "Farmer",
          hours,
          acres,
          address: typeof body.address === "string" ? body.address : "",
          paymentMethod: typeof body.paymentMethod === "string" ? body.paymentMethod : "upi",
          withDriver,
          baseFare: fare.base,
          fuelSurcharge: fare.fuel,
          driverCharge: fare.driver,
          deposit: fare.deposit,
          total: fare.total,
          status: "confirmed",
          createdAt: new Date().toISOString(),
        };
        const authResult = await validateAuth(req);
        if (authResult.authenticated && authResult.userId) {
          booking.userId = authResult.userId;
        }
        await saveBooking(booking, authResult.authenticated ? authResult.userId : undefined);
        const tracking = await buildTracking(booking, Date.now());
        return new Response(JSON.stringify({
          booking,
          eta: fakeEta(listing),
          fare,
          tracking: { ...tracking, route: undefined },
          message: `${listing.name} booked successfully`,
        }), { headers });
      }

      case "history": {
        const authResult = await validateAuth(req);
        if (!authResult.authenticated) return authErrorResponse("Authentication required", headers);
        const all = Array.from(BOOKINGS.values());
        const mine = all.filter(b => b.userId === authResult.userId);
        return new Response(JSON.stringify({ bookings: mine.slice().reverse() }), { headers });
      }

      case "track": {
        const authResult = await validateAuth(req);
        if (!authResult.authenticated) return authErrorResponse("Authentication required", headers);
        const booking = BOOKINGS.get(String(body.bookingId || ""));
        if (!booking || booking.userId !== authResult.userId) return bad("Booking not found", 404);
        return new Response(JSON.stringify({ tracking: await buildTracking(booking, Date.now()) }), { headers });
      }

      case "review": {
        const listing = (await getCatalog()).find(c => c.id === body.tractorId);
        if (!listing) return bad("Tractor not found", 404);
        const rating = Math.max(1, Math.min(5, Math.round(Number(body.rating) || 5)));
        const record = {
          tractorId: listing.id,
          userName: typeof body.userName === "string" ? body.userName : "Farmer",
          rating,
          comment: typeof body.comment === "string" ? body.comment.slice(0, 500) : "",
          createdAt: new Date().toISOString(),
        };
        REVIEWS.push(record);
        const newCount = listing.reviews + 1;
        listing.reviews = newCount;
        listing.rating = Math.round(((listing.rating * listing.reviews + rating) / (listing.reviews + 1)) * 10) / 10;
        return new Response(JSON.stringify({ success: true, rating: listing.rating, reviews: listing.reviews }), { headers });
      }

      case "ping":
        return new Response(JSON.stringify({ ok: true, catalog: (await getCatalog()).length }), { headers });

      default:
        return bad("Unknown action");
    }
  } catch (error) {
    console.error("Tractor hire function error:", error);
    return new Response(JSON.stringify({ error: "Internal error" }), { status: 500, headers });
  }
});
