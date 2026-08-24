export type Tractor = {
  id: number | string;
  name: string;
  owner: string;
  hp: number;
  implement: string;
  distance: string;
  rating: number;
  ratePerHour: number;
  ratePerAcre: number;
  image: "green" | "blue" | "red";
  status: "Available" | "Busy";
};

export const INITIAL_TRACTORS: Tractor[] = [];

export const WEATHER_DATA = {
  temp: 0,
  condition: 'Unavailable',
  humidity: 0,
  wind: '0 km/h',
  forecast: [],
};

export const MANDI_PRICES: any[] = [];

export type CommunityPost = {
  id: number;
  user: string;
  verified: boolean;
  avatar: string;
  crop: string;
  region: string;
  time: string;
  content: string;
  image?: string;
  likes: number;
  comments: number;
  shares: number;
  helpWanted: boolean;
  tags: string[];
  reply?: { user: string; content: string; time: string; verified?: boolean };
};

export const COMMUNITY_POSTS: CommunityPost[] = [];
export const COMMUNITY_GROUPS: any[] = [];
export const COMMUNITY_TOPICS: any[] = [];
export const STORE_ITEMS: any[] = [];
export const SCHEMES: any[] = [];
export const LABORERS: any[] = [];
export const CATTLE: any[] = [];
export const TRANSPORT_VEHICLES: any[] = [];
export const AGRI_NEWS: any[] = [];

export const INDIAN_LANGUAGES = [
  "English (India)",
  "Hindi (हिंदी)",
  "Marathi (मराठी)",
  "Gujarati (ગુજરાતી)",
  "Punjabi (ਪੰਜਾਬੀ)",
  "Tamil (தமிழ்)",
  "Telugu (తెలుగు)",
  "Kannada (ಕನ್ನಡ)",
  "Malayalam (മലയാളം)",
  "Bengali (বাংলা)",
  "Odia (ଓଡ଼ିଆ)",
  "Assamese (অসমীয়া)",
];
