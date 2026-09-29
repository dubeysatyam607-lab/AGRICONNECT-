/**
 * AgriConnect User-Generated Marketplace Types & Data Models
 * Real, Database-Backed system for Machinery, Cattle/Livestock, Labour, and Agricultural Services.
 */

export type ListingType = 'machinery' | 'cattle' | 'labour' | 'service';

export type MarketplaceCategory =
  | 'machinery'
  | 'tractors'
  | 'harvesters'
  | 'cultivators'
  | 'rotavators'
  | 'seeders'
  | 'sprayers'
  | 'equipment'
  | 'cattle'
  | 'cows'
  | 'buffaloes'
  | 'goats'
  | 'labour'
  | 'labour_services'
  | 'services'
  | 'transport_service'
  | 'cold_storage_service'
  | 'drone_service'
  | 'soil_testing_service'
  | 'agri_products';

export type MarketplaceAvailability =
  | 'available'
  | 'rented'
  | 'unavailable'
  | 'paused'
  | 'sold'
  | 'expired';

export type MarketplaceVerificationStatus = 'pending' | 'verified' | 'flagged' | 'rejected';

export type MarketplacePriceUnit =
  | 'per_hour'
  | 'per_day'
  | 'per_acre'
  | 'per_trip'
  | 'per_kg'
  | 'per_quintal'
  | 'fixed'
  | 'custom';

export type MarketplaceContactMethod = 'call' | 'whatsapp' | 'in_app' | 'both';

export type MachineryCondition = 'brand_new' | 'like_new' | 'good' | 'fair' | 'maintenance_needed';

export type MachineryFuelType = 'diesel' | 'petrol' | 'electric' | 'pto' | 'battery' | 'manual';

export interface CategoryMeta {
  id: ListingType;
  nameEn: string;
  nameHi: string;
  descriptionEn: string;
  descriptionHi: string;
  iconName: string;
  defaultPriceUnit: MarketplacePriceUnit;
}

export const LISTING_TYPE_METAS: CategoryMeta[] = [
  {
    id: 'machinery',
    nameEn: 'Machinery & Equipment',
    nameHi: 'कृषि मशीनरी व उपकरण',
    descriptionEn: 'Rent or hire tractors, rotavators, harvesters, seeders, sprayers & farm implements',
    descriptionHi: 'ट्रैक्टर, रोटावेटर, हार्वेस्टर, सीडर, स्प्रेयर व कृषि उपकरण किराए पर दें या लें',
    iconName: 'Tractor',
    defaultPriceUnit: 'per_day',
  },
  {
    id: 'cattle',
    nameEn: 'Cattle & Livestock',
    nameHi: 'पशुधन (गाए, भैंस, बकरी)',
    descriptionEn: 'Buy, sell or hire cows, buffaloes, goats, bulls & dairy livestock',
    descriptionHi: 'गाए, भैंस, बकरी, बैल और दुधारू मवेशी खरीदें या बेचें',
    iconName: 'Cattle',
    defaultPriceUnit: 'fixed',
  },
  {
    id: 'labour',
    nameEn: 'Labour & Farm Workers',
    nameHi: 'कृषि श्रमिक व कुशल चालक',
    descriptionEn: 'Hire skilled farm workers, tractor operators, harvesting & spraying teams',
    descriptionHi: 'कुशल खेत मजदूर, ट्रैक्टर चालक, कटाई व छिड़काव टीमें किराए पर लें',
    iconName: 'Users',
    defaultPriceUnit: 'per_day',
  },
  {
    id: 'service',
    nameEn: 'Agricultural Services',
    nameHi: 'कृषि सेवाएं (ड्रोन, सिंचाई, परिवहन)',
    descriptionEn: 'Drone spraying, irrigation, transport, cold storage & soil testing services',
    descriptionHi: 'ड्रोन स्प्रे, सिंचाई, परिवहन, कोल्ड स्टोरेज व मिट्टी जांच सेवाएं',
    iconName: 'Wrench',
    defaultPriceUnit: 'per_acre',
  },
];

export const MARKETPLACE_CATEGORIES: Array<{
  id: MarketplaceCategory;
  nameEn: string;
  nameHi: string;
  descriptionEn: string;
  descriptionHi: string;
  defaultPriceUnit: MarketplacePriceUnit;
}> = [
  { id: 'equipment', nameEn: 'Equipment & Implements', nameHi: 'उपकरण', descriptionEn: 'Farm tools', descriptionHi: 'खेत औजार', defaultPriceUnit: 'per_day' },
  { id: 'tractors', nameEn: 'Tractors', nameHi: 'ट्रैक्टर', descriptionEn: 'Tractor rental', descriptionHi: 'ट्रैक्टर किराया', defaultPriceUnit: 'per_hour' },
  { id: 'harvesters', nameEn: 'Harvesters', nameHi: 'हार्वेस्टर', descriptionEn: 'Harvester hiring', descriptionHi: 'हार्वेस्टर बुकिंग', defaultPriceUnit: 'per_acre' },
  { id: 'cultivators', nameEn: 'Cultivators', nameHi: 'कल्टीवेटर', descriptionEn: 'Plowing equipment', descriptionHi: 'जुताई उपकरण', defaultPriceUnit: 'per_hour' },
  { id: 'rotavators', nameEn: 'Rotavators', nameHi: 'रोटावेटर', descriptionEn: 'Soil tilling', descriptionHi: 'मृदा जुताई', defaultPriceUnit: 'per_hour' },
  { id: 'seeders', nameEn: 'Seed Drills & Seeders', nameHi: 'सीडर व बुवाई', descriptionEn: 'Sowing machines', descriptionHi: 'बुवाई मशीन', defaultPriceUnit: 'per_acre' },
  { id: 'cattle', nameEn: 'Cattle & Livestock', nameHi: 'पशुधन', descriptionEn: 'Dairy & livestock', descriptionHi: 'दुधारू पशु', defaultPriceUnit: 'fixed' },
  { id: 'labour_services', nameEn: 'Labour & Workers', nameHi: 'कृषि मजदूर', descriptionEn: 'Farm labor teams', descriptionHi: 'खेत मजदूर', defaultPriceUnit: 'per_day' },
  { id: 'agri_products', nameEn: 'Agri Services & Products', nameHi: 'कृषि सेवाएं', descriptionEn: 'Custom services', descriptionHi: 'अन्य सेवाएं', defaultPriceUnit: 'per_acre' },
];

export const PRESET_MACHINERY_EQUIPMENT = [
  'Tractor',
  'Rotavator',
  'Cultivator',
  'Harvester',
  'Combine Harvester',
  'Thresher',
  'Seed Drill',
  'Plough',
  'Disc Harrow',
  'Trailer / Trolley',
  'Sprayer (Knapsack / Tractor)',
  'Water Pump',
  'Reaper',
  'Baler',
  'Straw Reaper',
  'Power Tiller',
  'Mini Tractor',
  'Agricultural Drone',
  'Earth Auger',
  'Chaff Cutter',
  'Irrigation Equipment',
  'Other Equipment',
] as const;

export const PRESET_CATTLE_TYPES = [
  'Cow',
  'Buffalo',
  'Goat',
  'Sheep',
  'Poultry',
  'Bull',
  'Camel',
  'Other Livestock',
] as const;

export const PRESET_LABOUR_CATEGORIES = [
  'Tractor Operator',
  'Harvesting Worker',
  'Sowing Worker',
  'Irrigation Worker',
  'Spraying Worker',
  'Farm Helper',
  'Livestock Caretaker',
  'Machine Operator',
  'General Farm Labour',
  'Other Farm Service',
] as const;

export const PRESET_AGRICULTURAL_SERVICES = [
  'Irrigation Service',
  'Transport Service',
  'Cold Storage Service',
  'Farm Equipment Repair',
  'Drone Spraying Service',
  'Soil Testing Service',
  'Farm Maintenance',
  'Fencing & Security Setup',
  'Other Agricultural Service',
] as const;

export interface ListingLocation {
  state: string;
  district: string;
  village?: string;
  address?: string;
  lat?: number;
  lon?: number;
}

export interface ListingOwner {
  id: string;
  name: string;
  phone: string;
  is_verified: boolean;
  rating?: number;
  reviews_count?: number;
  joined_date?: string;
}

export interface ListingImageRecord {
  id: string;
  listing_id: string;
  owner_id: string;
  image_url: string;
  storage_path?: string;
  display_order: number;
  is_cover: boolean;
  created_at: string;
}

export interface MachineryDetails {
  equipment_name: string;
  brand?: string;
  model?: string;
  manufacturing_year?: number;
  condition?: MachineryCondition;
  horsepower?: number;
  capacity?: string;
  fuel_type?: MachineryFuelType;
  minimum_rental_duration?: string;
  delivery_available?: boolean;
  delivery_charges?: number;
  operator_included?: boolean;
  operator_charges?: number;
  additional_notes?: string;
}

export interface CattleDetails {
  animal_type: string;
  breed?: string;
  age_years?: number;
  gender?: 'female' | 'male';
  health_status?: string;
  weight_kg?: number;
  milk_production_daily_litres?: number;
  lactation_number?: number;
  vaccination_info?: string;
  purpose?: 'sale' | 'breeding' | 'rental' | 'dairy';
}

export interface LabourDetails {
  worker_name: string;
  work_category: string;
  skills: string[];
  experience_years?: number;
  team_size?: number;
  available_dates?: string;
  languages?: string[];
  gender?: string;
}

export interface ServiceDetails {
  service_type: string;
  custom_service_name?: string;
  service_scope?: string;
  terms_conditions?: string;
}

export interface MarketplaceListing {
  id: string;
  user_id: string;
  listing_type: ListingType;
  category: MarketplaceCategory | string;
  title: string;
  description: string;
  price: number;
  price_unit: MarketplacePriceUnit;
  security_deposit?: number;
  location: ListingLocation;
  availability: MarketplaceAvailability;
  available_from?: string;
  available_until?: string;
  owner: ListingOwner;
  images: string[];
  cover_image?: string;
  image_records?: ListingImageRecord[];
  contact_method: MarketplaceContactMethod;
  verification_status: MarketplaceVerificationStatus;
  machinery_details?: MachineryDetails;
  cattle_details?: CattleDetails;
  labour_details?: LabourDetails;
  service_details?: ServiceDetails;
  views_count?: number;
  reports_count?: number;
  created_at: string;
  updated_at: string;
}

export interface CreateListingInput {
  listing_type: ListingType;
  category: string;
  title: string;
  description: string;
  price: number;
  price_unit: MarketplacePriceUnit;
  security_deposit?: number;
  location: ListingLocation;
  available_from?: string;
  available_until?: string;
  images?: string[]; // Uploaded URLs
  image_files?: File[]; // Real File objects
  cover_image_index?: number;
  contact_method: MarketplaceContactMethod;
  machinery_details?: Partial<MachineryDetails>;
  cattle_details?: Partial<CattleDetails>;
  labour_details?: Partial<LabourDetails>;
  service_details?: Partial<ServiceDetails>;
  specifications?: Record<string, any>;
}

export interface UpdateListingInput extends Partial<CreateListingInput> {
  availability?: MarketplaceAvailability;
}

export interface MarketplaceReport {
  id: string;
  listing_id: string;
  reporter_id: string;
  reason: 'fake_listing' | 'incorrect_info' | 'wrong_price' | 'inappropriate' | 'fraud_scam' | 'unavailable' | 'scam' | 'duplicate' | 'spam' | 'other';
  details: string;
  status: 'pending' | 'reviewed' | 'action_taken' | 'dismissed';
  created_at: string;
}

// ── 5-FIELD STRICT BOOKING WORKFLOW DATA MODELS ──────────────────────────

export type BookingStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'COUNTER_OFFERED'
  | 'CONFIRMED'
  | 'ACTIVE'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'EXPIRED';

export interface MarketplaceBooking {
  id: string;
  listing_id: string;
  listing_title: string;
  listing_type: ListingType;
  listing_image?: string;
  customer_id: string;
  customer_name: string;
  customer_phone: string;
  owner_id: string;
  owner_name: string;
  owner_phone: string;
  status: BookingStatus;
  start_at: string;
  end_at: string;
  start_time?: string;
  duration: number;
  duration_unit: 'hour' | 'day' | 'acre' | 'trip' | 'fixed';
  pricing_unit: MarketplacePriceUnit;
  quantity: number;
  farm_location: string;
  pickup_location?: string;
  destination_location?: string;
  delivery_required: boolean;
  operator_required: boolean;
  rental_amount: number;
  delivery_amount: number;
  operator_amount: number;
  security_deposit: number;
  total_amount: number;
  customer_message?: string;
  counter_offer_amount?: number;
  counter_offer_notes?: string;
  rejection_reason?: string;
  cancellation_reason?: string;
  cancelled_by?: string;
  completed_by?: string;
  created_at: string;
  updated_at: string;
  accepted_at?: string;
  confirmed_at?: string;
  started_at?: string;
  completed_at?: string;
  cancelled_at?: string;
}

export interface CreateBookingInput {
  listing_id: string;
  start_date: string;
  end_date?: string;
  start_time?: string;
  duration: number;
  duration_unit: 'hour' | 'day' | 'acre' | 'trip' | 'fixed';
  quantity?: number;
  farm_location: string;
  pickup_location?: string;
  destination_location?: string;
  delivery_required?: boolean;
  operator_required?: boolean;
  customer_message?: string;
}

// Backward compatibility alias for existing code
export type CreateBookingRequestInput = CreateBookingInput & {
  units_requested?: number;
  offered_amount?: number;
  location_address?: string;
  notes?: string;
};

export type BookingRequestStatus = 'pending' | 'accepted' | 'rejected' | 'cancelled' | 'completed';

export interface MarketplaceBookingRequest extends Partial<MarketplaceBooking> {
  offered_amount: number;
  location_address: string;
  notes?: string;
}

export interface CounterOfferInput {
  booking_id: string;
  counter_offer_amount: number;
  counter_offer_notes?: string;
  new_start_date?: string;
  new_end_date?: string;
}

export interface BookingEventLog {
  id: string;
  booking_id: string;
  event_type: string;
  performed_by: string;
  notes?: string;
  created_at: string;
}

export interface ListingReview {
  id: string;
  booking_id: string;
  listing_id: string;
  reviewer_id: string;
  reviewer_name?: string;
  rating: number;
  comment?: string;
  created_at: string;
}

export interface BookingDispute {
  id: string;
  booking_id: string;
  reporter_id: string;
  reason: string;
  details: string;
  status: 'pending' | 'under_review' | 'resolved' | 'dismissed';
  created_at: string;
}

export interface MarketplaceFilter {
  listing_type?: ListingType | 'all';
  category?: string;
  equipment_name?: string;
  searchQuery?: string;
  state?: string;
  district?: string;
  minPrice?: number;
  maxPrice?: number;
  availability?: MarketplaceAvailability | 'all';
  operator_included?: boolean;
  delivery_available?: boolean;
  verifiedOnly?: boolean;
  sortBy?: 'newest' | 'price_low' | 'price_high' | 'popular';
}

export interface ImageValidationResult {
  valid: boolean;
  error?: string;
}

export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

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

export function formatPriceWithUnit(price: number, unit: MarketplacePriceUnit): string {
  const formatted = `₹${Number(price || 0).toLocaleString('en-IN')}`;
  switch (unit) {
    case 'per_hour':
      return `${formatted}/hour`;
    case 'per_day':
      return `${formatted}/day`;
    case 'per_acre':
      return `${formatted}/acre`;
    case 'per_trip':
      return `${formatted}/trip`;
    case 'per_kg':
      return `${formatted}/kg`;
    case 'per_quintal':
      return `${formatted}/quintal`;
    case 'custom':
    case 'fixed':
    default:
      return formatted;
  }
}

/**
 * Server/Service calculation of booking amounts:
 * Base Rental = price * duration * quantity
 * Delivery = delivery_charges (if required)
 * Operator = operator_charges * duration (if required)
 * Security Deposit = listing.security_deposit
 */
export function calculateBookingPriceBreakdown(
  listing: MarketplaceListing,
  duration: number,
  quantity: number = 1,
  deliveryRequired: boolean = false,
  operatorRequired: boolean = false
): {
  rental_amount: number;
  delivery_amount: number;
  operator_amount: number;
  security_deposit: number;
  total_amount: number;
} {
  const baseRate = listing.price || 0;
  const dur = Math.max(1, duration || 1);
  const qty = Math.max(1, quantity || 1);

  const rental_amount = baseRate * dur * qty;
  
  const delivery_amount = deliveryRequired ? (listing.machinery_details?.delivery_charges || 0) : 0;
  
  const operatorRate = listing.machinery_details?.operator_charges || 0;
  const operator_amount = operatorRequired ? (operatorRate * dur) : 0;
  
  const security_deposit = listing.security_deposit || 0;

  const total_amount = rental_amount + delivery_amount + operator_amount + security_deposit;

  return {
    rental_amount,
    delivery_amount,
    operator_amount,
    security_deposit,
    total_amount,
  };
}
