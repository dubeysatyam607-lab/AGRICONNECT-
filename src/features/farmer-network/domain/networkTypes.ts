/**
 * Farmer Network — domain types.
 * A trusted digital agriculture network: farmers, service providers, buyers,
 * requirements, community, chat, bookings, reviews and verification badges.
 */

export type NetworkEntityType = 'farmer' | 'provider' | 'buyer';

export type ServiceCategory =
  | 'tractor'
  | 'harvesting'
  | 'threshing'
  | 'drone'
  | 'soil-testing'
  | 'cold-storage'
  | 'transport'
  | 'labour'
  | 'mechanic'
  | 'veterinary'
  | 'consultant';

export type FarmerCategory =
  | 'verified'
  | 'progressive'
  | 'organic'
  | 'women'
  | 'young'
  | 'fpo'
  | 'nearby';

export type BuyerType = 'wholesaler' | 'retailer' | 'processor' | 'exporter' | 'fpo';

export type RequirementType =
  | 'tractor'
  | 'labour'
  | 'harvester'
  | 'transport'
  | 'buyer'
  | 'seeds'
  | 'fertilizer'
  | 'cold-storage';

export type BookingStatus = 'pending' | 'accepted' | 'completed' | 'cancelled';

export type ChatMessageType = 'text' | 'image' | 'voice' | 'location' | 'booking' | 'quotation';

export type VerificationBadge = 'farmer' | 'provider' | 'dealer' | 'buyer';

export type CommunityKind = 'question' | 'tip' | 'photo' | 'video' | 'success' | 'gov' | 'ai';

export type Availability = 'today' | 'tomorrow' | 'week' | 'busy';

export interface NetworkUser {
  id: string;
  name: string;
  type: NetworkEntityType;
  village: string;
  district: string;
  state: string;
  crop?: string;
  verified: boolean;
  rating: number;
  reviews: number;
  distanceKm: number;
  badges: VerificationBadge[];
  joinedDaysAgo: number;
  initials: string;
}

export interface FarmerProfile extends NetworkUser {
  type: 'farmer';
  farmerType: FarmerCategory;
  farmSize?: string;
  produce: string[];
}

export interface ServiceProvider extends NetworkUser {
  type: 'provider';
  category: ServiceCategory;
  pricing: string;
  availability: Availability;
  trustScore: number;
  completedJobs: number;
  skills: string[];
  responseMins: number;
}

export interface Buyer extends NetworkUser {
  type: 'buyer';
  buyerType: BuyerType;
  lookingFor: string;
  minQty?: string;
  openToEnquiry: boolean;
}

export interface RequirementPost {
  id: string;
  type: RequirementType;
  title: string;
  description: string;
  location: string;
  amount?: string;
  postedByName: string;
  createdAt: string;
  urgency: 'today' | 'week' | 'flexible';
  responses: number;
  open: boolean;
}

export interface Review {
  id: string;
  targetId: string;
  author: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface BookingInvoiceItem {
  label: string;
  amount: string;
}

export interface Booking {
  id: string;
  service: string;
  providerName: string;
  providerId: string;
  date: string;
  amount: string;
  status: BookingStatus;
  invoice?: {
    id: string;
    issuedAt: string;
    items: BookingInvoiceItem[];
    total: string;
  };
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  threadId: string;
  senderId: string;
  senderName: string;
  type: ChatMessageType;
  text?: string;
  voiceNoteMs?: number;
  locationLabel?: string;
  bookingRequest?: { service: string; date: string; amount: string };
  quotation?: { item: string; amount: string; validDays: number };
  createdAt: string;
}

export interface ChatThread {
  id: string;
  participantId: string;
  participantName: string;
  participantType: NetworkEntityType;
  messages: ChatMessage[];
  unread: number;
  updatedAt: string;
}

export interface CommunityPost {
  id: string;
  kind: CommunityKind;
  author: string;
  authorType: NetworkEntityType;
  text: string;
  likes: number;
  comments: number;
  createdAt: string;
  ai?: boolean;
}

export interface NetworkState {
  version: number;
  myName: string;
  myVillage: string;
  myCrop: string;
  providers: ServiceProvider[];
  farmers: FarmerProfile[];
  buyers: Buyer[];
  requirements: RequirementPost[];
  community: CommunityPost[];
  threads: ChatThread[];
  bookings: Booking[];
  reviews: Review[];
}

export const NETWORK_STORAGE_KEY = 'agri_network_v1';
export const NETWORK_SEED_VERSION = 1;
