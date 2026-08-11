import type {
  Availability,
  Buyer,
  CommunityPost,
  FarmerProfile,
  NetworkState,
  ServiceProvider,
} from './networkTypes';
import { getState } from './networkStore';

/**
 * Farmer Network — recommendation engine.
 * Ranks trusted providers, best buyers, cheapest rentals, fastest services and
 * the most active community using distance + rating + trust score + price.
 */

export interface ProviderScored {
  provider: ServiceProvider;
  score: number;
  reasons: string[];
}

export interface BuyerScored {
  buyer: Buyer;
  score: number;
  reasons: string[];
}

export interface FarmerScored {
  farmer: FarmerProfile;
  score: number;
  reasons: string[];
}

const parseAmount = (pricing: string): number => {
  const digits = pricing.replace(/[^\d]/g, '');
  return digits ? Number(digits) : 0;
};

const availabilityWeight = (a: Availability): number =>
  a === 'today' ? 1 : a === 'tomorrow' ? 0.75 : a === 'week' ? 0.5 : 0.25;

/** Trusted providers nearby — verified first, cheapest and fastest ranked. */
export function recommendTrustedProviders(
  category?: ServiceProvider['category'],
  maxDistance = 10,
  s: NetworkState = getState(),
): ProviderScored[] {
  const categoryFiltered = category
    ? s.providers.filter((p) => p.category === category)
    : s.providers;
  return categoryFiltered
    .filter((p) => p.distanceKm <= maxDistance)
    .map((provider) => {
      const price = parseAmount(provider.pricing);
      const priceScore = price > 0 ? Math.max(0, 1 - price / 2000) : 0.5;
      const distanceScore = Math.max(0, 1 - provider.distanceKm / 20);
      const score =
        provider.trustScore / 100 * 0.35
        + provider.rating / 5 * 0.25
        + distanceScore * 0.2
        + availabilityWeight(provider.availability) * 0.1
        + priceScore * 0.1;
      const reasons: string[] = [];
      if (provider.trustScore >= 90) reasons.push('High trust score');
      if (provider.verified) reasons.push('Verified');
      if (provider.availability === 'today') reasons.push('Available today');
      if (provider.distanceKm <= 4) reasons.push(`Nearby (${provider.distanceKm.toFixed(1)} km)`);
      return { provider, score, reasons };
    })
    .sort((a, b) => b.score - a.score);
}

/** Cheapest rental for a service category among nearby providers. */
export function cheapestRental(
  category: ServiceProvider['category'],
  s: NetworkState = getState(),
): ProviderScored[] {
  return recommendTrustedProviders(category, 15, s)
    .sort((a, b) => parseAmount(a.provider.pricing) - parseAmount(b.provider.pricing))
    .map(({ provider }) => ({
      provider,
      score: Math.max(0, 1 - parseAmount(provider.pricing) / 2500),
      reasons: [`Cheapest at ${provider.pricing}`],
    }));
}

/** Fastest available service — available today, nearest, top response time. */
export function fastestService(
  category: ServiceProvider['category'],
  s: NetworkState = getState(),
): ProviderScored[] {
  const providers = category
    ? s.providers.filter((p) => p.category === category)
    : s.providers;
  return providers
    .filter((p) => p.availability !== 'busy')
    .map((provider) => {
      const score =
        availabilityWeight(provider.availability) * 0.4
        + Math.max(0, 1 - provider.distanceKm / 20) * 0.35
        + Math.max(0, 1 - provider.responseMins / 30) * 0.25;
      const reasons: string[] = [];
      if (provider.availability === 'today') reasons.push('Available today');
      if (provider.responseMins <= 10) reasons.push(`Replies in ~${provider.responseMins} min`);
      return { provider, score, reasons };
    })
    .sort((a, b) => b.score - a.score);
}

/** Best buyers for the farmer's crop — verified, high rating, open to enquiry. */
export function bestBuyers(
  crop?: string,
  s: NetworkState = getState(),
): BuyerScored[] {
  const cropLower = crop?.toLowerCase();
  const scored = s.buyers
    .map((buyer) => {
      const cropMatch = !cropLower || buyer.lookingFor.toLowerCase().includes(cropLower);
      const score =
        (buyer.verified ? 0.4 : 0) + buyer.rating / 5 * 0.35 + (buyer.openToEnquiry ? 0.15 : 0)
        + (cropMatch ? 0.1 : 0);
      const reasons: string[] = [];
      if (buyer.verified) reasons.push('Verified');
      if (cropMatch) reasons.push(`Buys ${buyer.lookingFor}`);
      if (buyer.openToEnquiry) reasons.push('Open to enquiry');
      return { buyer, score, reasons };
    })
    .sort((a, b) => b.score - a.score);
  return scored.slice(0, 3);
}

/** Nearby farmers — matching crop preferred, then verified and highly rated. */
export function nearbyFarmers(
  s: NetworkState = getState(),
): FarmerScored[] {
  return s.farmers
    .map((farmer) => {
      const cropMatch = farmer.produce.some((p) =>
        s.myCrop.toLowerCase().includes(p.toLowerCase())
        || p.toLowerCase().includes(s.myCrop.toLowerCase()),
      );
      const score =
        (farmer.verified ? 0.3 : 0)
        + farmer.rating / 5 * 0.25
        + Math.max(0, 1 - farmer.distanceKm / 20) * 0.25
        + (cropMatch ? 0.2 : 0);
      const reasons: string[] = [];
      if (cropMatch) reasons.push(`Grows ${farmer.produce.join(', ')}`);
      if (farmer.distanceKm <= 5) reasons.push(`Nearby (${farmer.distanceKm.toFixed(1)} km)`);
      return { farmer, score, reasons };
    })
    .sort((a, b) => b.score - a.score);
}

/** Most active community posts — most likes + comments, recency weighted. */
export function mostActiveCommunity(s: NetworkState = getState()): CommunityPost[] {
  const now = Date.now();
  return [...s.community]
    .map((post) => {
      const ageHours = Math.max(1, (now - new Date(post.createdAt).getTime()) / 3600000);
      const score = (post.likes + post.comments * 3) / Math.sqrt(ageHours);
      return { post, score };
    })
    .sort((a, b) => b.score - a.score)
    .map(({ post }) => post);
}

/** AI-suggested discussion topics relevant to the farmer's crop + region. */
export function aiSuggestedDiscussions(s: NetworkState = getState()): string[] {
  const crop = s.myCrop;
  const suggestions = [
    `Best time to sell ${crop} this season`,
    `Drone spraying rates in ${s.myVillage}`,
    `Fertilizer plan for ${crop} after recent rains`,
    `How farmers near you are cutting labour costs`,
    `Cold storage options close to ${s.myVillage}`,
  ];
  return suggestions.slice(0, 4);
}
