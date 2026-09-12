/**
 * PHASE 12: AgriConnect Marketplace Types & Interfaces
 */

export type MarketplaceCategory =
  | 'equipment'
  | 'tractors'
  | 'harvesters'
  | 'cultivators'
  | 'rotavators'
  | 'seeders'
  | 'cattle'
  | 'labour_services'
  | 'agri_products';

export interface CategoryMeta {
  id: MarketplaceCategory;
  nameEn: string;
  nameHi: string;
  descriptionEn: string;
  descriptionHi: string;
  iconName: string;
  defaultPriceUnit: MarketplacePriceUnit;
}

export const MARKETPLACE_CATEGORIES: CategoryMeta[] = [
  {
    id: 'equipment',
    nameEn: 'Agricultural equipment',
    nameHi: 'कृषि उपकरण (Equipment)',
    descriptionEn: 'Sprayers, threshers, power tillers, shredders, and specialized farm implements',
    descriptionHi: 'स्प्रेयर, थ्रेशर, पावर टिलर और विशेष कृषि उपकरण',
    iconName: 'Wrench',
    defaultPriceUnit: 'per_day',
  },
  {
    id: 'tractors',
    nameEn: 'Tractors',
    nameHi: 'ट्रैक्टर (Tractors)',
    descriptionEn: '35 HP to 75 HP 2WD/4WD tractors for hire and direct owner rental',
    descriptionHi: '35 से 75 एचपी 2WD/4WD ट्रैक्टर किराए पर उपलब्ध',
    iconName: 'Tractor',
    defaultPriceUnit: 'per_hour',
  },
  {
    id: 'harvesters',
    nameEn: 'Harvesters',
    nameHi: 'हार्वेस्टर (Harvesters)',
    descriptionEn: 'Multi-crop combine harvesters and straw reapers for wheat and paddy harvesting',
    descriptionHi: 'कंबाइन हार्वेस्टर और गेहूं-धान कटाई हेतु स्ट्रॉ रीपर',
    iconName: 'Wheat',
    defaultPriceUnit: 'per_acre',
  },
  {
    id: 'cultivators',
    nameEn: 'Cultivators',
    nameHi: 'कल्टीवेटर (Cultivators)',
    descriptionEn: 'Rigid tines, spring-loaded and duckfoot cultivators for soil tilling',
    descriptionHi: 'मिट्टी की गहरी जुताई के लिए स्प्रिंग व रिजिड कल्टीवेटर',
    iconName: 'Layers',
    defaultPriceUnit: 'per_acre',
  },
  {
    id: 'rotavators',
    nameEn: 'Rotavators',
    nameHi: 'रोटावेटर (Rotavators)',
    descriptionEn: 'Multi-speed rotary tillers for fine seedbed preparation',
    descriptionHi: 'बीज क्यारी तैयार करने हेतु उच्च क्षमता वाले रोटावेटर',
    iconName: 'RefreshCw',
    defaultPriceUnit: 'per_hour',
  },
  {
    id: 'seeders',
    nameEn: 'Seeders',
    nameHi: 'सीडर व ड्रिल (Seeders)',
    descriptionEn: 'Zero-till seed drills, happy seeders, and pneumatic precision planters',
    descriptionHi: 'जीरो-टिल सीड ड्रिल, हैप्पी सीडर और सटीक बुवाई मशीनें',
    iconName: 'Sprout',
    defaultPriceUnit: 'per_acre',
  },
  {
    id: 'cattle',
    nameEn: 'Cattle',
    nameHi: 'पशुधन (Cattle / Livestock)',
    descriptionEn: 'Verified dairy cows, buffaloes (Murrah, Gir, Sahiwal, Jaffrabadi), and bulls',
    descriptionHi: 'प्रमाणित दुधारू गाय, भैंस (मुर्रा, गिर, साहीवाल) और बैल',
    iconName: 'Cattle',
    defaultPriceUnit: 'fixed',
  },
  {
    id: 'labour_services',
    nameEn: 'Labour/services',
    nameHi: 'श्रमिक व सेवाएं (Labour/Services)',
    descriptionEn: 'Transplanting teams, harvesting labour, spraying teams, and tractor drivers',
    descriptionHi: 'रोपाई, कटाई, कीटनाशक छिड़काव दल और कुशल ट्रैक्टर चालक',
    iconName: 'Users',
    defaultPriceUnit: 'per_day',
  },
  {
    id: 'agri_products',
    nameEn: 'Agricultural products',
    nameHi: 'कृषि उत्पाद (Agri Products)',
    descriptionEn: 'Organic crops, grains, certified farm seeds, vermicompost, and fresh farm produce',
    descriptionHi: 'जैविक फसलें, अनाज, प्रमाणित बीज, वर्मीकम्पोस्ट और ताजे कृषि उत्पाद',
    iconName: 'Package',
    defaultPriceUnit: 'per_quintal',
  },
];

export type MarketplaceAvailability = 'available' | 'rented' | 'sold' | 'unavailable';

export type MarketplaceVerificationStatus = 'pending' | 'verified' | 'flagged' | 'rejected';

export type MarketplacePriceUnit =
  | 'per_hour'
  | 'per_day'
  | 'per_acre'
  | 'per_kg'
  | 'per_quintal'
  | 'fixed';

export type MarketplaceContactMethod = 'call' | 'whatsapp' | 'in_app' | 'both';

export type BookingRequestStatus =
  | 'pending'
  | 'accepted'
  | 'rejected'
  | 'cancelled'
  | 'completed';

export interface MarketplaceLocation {
  state: string;
  district: string;
  village?: string;
  address?: string;
  pincode?: string;
  lat?: number;
  lon?: number;
}

export interface MarketplaceOwner {
  id: string;
  name: string;
  phone: string;
  is_verified: boolean;
  rating?: number;
  reviews_count?: number;
  joined_date?: string;
}

export interface MarketplaceListing {
  id: string;
  user_id: string;
  title: string;
  category: MarketplaceCategory;
  description: string;
  price: number;
  price_unit: MarketplacePriceUnit;
  location: MarketplaceLocation;
  availability: MarketplaceAvailability;
  owner: MarketplaceOwner;
  images: string[];
  contact_method: MarketplaceContactMethod;
  verification_status: MarketplaceVerificationStatus;
  specifications?: Record<string, string | number | boolean>;
  views_count?: number;
  reports_count?: number;
  created_at: string;
  updated_at: string;
}

export interface CreateListingInput {
  title: string;
  category: MarketplaceCategory;
  description: string;
  price: number;
  price_unit: MarketplacePriceUnit;
  location: MarketplaceLocation;
  images: string[];
  contact_method: MarketplaceContactMethod;
  specifications?: Record<string, string | number | boolean>;
}

export interface UpdateListingInput extends Partial<CreateListingInput> {
  availability?: MarketplaceAvailability;
}

export interface MarketplaceBookingRequest {
  id: string;
  listing_id: string;
  listing_title: string;
  listing_category: MarketplaceCategory;
  owner_id: string;
  owner_name: string;
  owner_phone: string;
  requester_id: string;
  requester_name: string;
  requester_phone: string;
  start_date: string;
  end_date?: string;
  units_requested?: number;
  unit_type?: string;
  offered_amount: number;
  location_address: string;
  notes?: string;
  status: BookingRequestStatus;
  status_reason?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateBookingRequestInput {
  listing_id: string;
  start_date: string;
  end_date?: string;
  units_requested?: number;
  offered_amount: number;
  location_address: string;
  notes?: string;
}

export interface MarketplaceReport {
  id: string;
  listing_id: string;
  reported_by_user_id: string;
  reason: 'scam' | 'inappropriate' | 'wrong_price' | 'duplicate' | 'spam' | 'unavailable';
  details: string;
  status: 'pending' | 'reviewed' | 'action_taken' | 'dismissed';
  created_at: string;
}

export interface MarketplaceFilter {
  category?: MarketplaceCategory | 'all';
  searchQuery?: string;
  state?: string;
  district?: string;
  minPrice?: number;
  maxPrice?: number;
  availability?: MarketplaceAvailability | 'all';
  verifiedOnly?: boolean;
  sortBy?: 'newest' | 'price_low' | 'price_high' | 'popular';
}

export interface ImageValidationResult {
  valid: boolean;
  error?: string;
}

export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/**
 * Validates uploaded image file against size, format, and content requirements.
 */
export function validateImageFile(file: File | { name: string; size: number; type: string }): ImageValidationResult {
  if (!file) {
    return { valid: false, error: 'No image file provided' };
  }

  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    return {
      valid: false,
      error: `Image size (${(file.size / (1024 * 1024)).toFixed(1)} MB) exceeds maximum allowed limit of 5 MB.`,
    };
  }

  if (file.size < 1024) {
    return {
      valid: false,
      error: 'Image file is too small or corrupted.',
    };
  }

  const type = file.type?.toLowerCase();
  if (!type || !ALLOWED_IMAGE_TYPES.includes(type)) {
    return {
      valid: false,
      error: `Unsupported image format (${type || 'unknown'}). Please upload JPG, PNG, or WEBP.`,
    };
  }

  return { valid: true };
}

/**
 * Price unit formatting helper for farmers.
 */
export function formatPriceWithUnit(price: number, unit: MarketplacePriceUnit): string {
  const formatted = `₹${Number(price || 0).toLocaleString('en-IN')}`;
  switch (unit) {
    case 'per_hour':
      return `${formatted}/hour`;
    case 'per_day':
      return `${formatted}/day`;
    case 'per_acre':
      return `${formatted}/acre`;
    case 'per_kg':
      return `${formatted}/kg`;
    case 'per_quintal':
      return `${formatted}/quintal`;
    case 'fixed':
    default:
      return formatted;
  }
}
