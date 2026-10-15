/**
 * Campaigns and Seasonal Promotions Engine
 *
 * Implements configurable campaigns with automated server/client eligibility validation,
 * category restrictions (e.g., Seeds & Fertilizers only), configurable active date ranges,
 * and reliable discount computations.
 */

export interface Campaign {
  id: string;
  name: string;
  nameHi: string;
  sub: string;
  subHi: string;
  discountPercentage: number;
  eligibleCategories: string[];
  startDate: string; // ISO date string
  endDate: string; // ISO date string
  color: string;
  badgeText: string;
  badgeTextHi: string;
  bannerImage: string;
}

export const KHARIF_CAMPAIGN: Campaign = {
  id: "kharif-sale-2026",
  name: "Kharif Sale",
  nameHi: "खरीफ सेल",
  sub: "Up to 20% off on seeds & fertilizers",
  subHi: "बीज और खाद पर 20% तक छूट",
  discountPercentage: 20,
  eligibleCategories: ["seeds", "fertilizers", "seed", "fertilizer"],
  startDate: "2026-05-01T00:00:00.000Z",
  endDate: "2026-11-30T23:59:59.999Z",
  color: "#16a34a",
  badgeText: "Kharif Sale · 20% OFF",
  badgeTextHi: "खरीफ सेल · 20% छूट",
  bannerImage: "https://images.pexels.com/photos/11034660/pexels-photo-11034660.jpeg?auto=compress&cs=tinysrgb&dpr=1&fit=crop&h=627&w=940",
};

/**
 * Checks if a campaign is currently active based on configured dates.
 */
export function isCampaignActive(campaign: Campaign = KHARIF_CAMPAIGN, date: Date = new Date()): boolean {
  try {
    const current = date.getTime();
    const start = new Date(campaign.startDate).getTime();
    const end = new Date(campaign.endDate).getTime();
    return current >= start && current <= end;
  } catch {
    return false;
  }
}

/**
 * Checks whether a product qualifies for campaign discount.
 * Strictly verifies campaign active dates and category whitelist.
 * Machinery, transport, tools, and unrelated products will return false.
 */
export function isProductEligibleForCampaign(
  product: { category?: string } | null | undefined,
  campaign: Campaign = KHARIF_CAMPAIGN,
  date: Date = new Date()
): boolean {
  if (!product || !product.category) return false;
  if (!isCampaignActive(campaign, date)) return false;

  const normalizedCategory = product.category.toLowerCase().trim();
  return campaign.eligibleCategories.some(cat => {
    const c = cat.toLowerCase().trim();
    return normalizedCategory === c || normalizedCategory.startsWith(c) || c.startsWith(normalizedCategory);
  });
}

export interface ItemCampaignDiscount {
  eligible: boolean;
  originalPrice: number;
  discountPerUnit: number;
  finalPrice: number;
  totalDiscount: number;
}

/**
 * Calculates campaign discount for a single unit and line quantity.
 * Formula per requirement: Final eligible item price = Original item price * 0.80
 * Example: original Rs 500 => discounted Rs 400, discount Rs 100.
 */
export function getCampaignDiscountForItem(
  price: number,
  category: string,
  qty: number = 1,
  campaign: Campaign = KHARIF_CAMPAIGN,
  date: Date = new Date()
): ItemCampaignDiscount {
  const safePrice = Number(price) || 0;
  const safeQty = Math.max(1, Math.floor(Number(qty) || 1));

  if (!isProductEligibleForCampaign({ category }, campaign, date) || safePrice <= 0) {
    return {
      eligible: false,
      originalPrice: safePrice,
      discountPerUnit: 0,
      finalPrice: safePrice,
      totalDiscount: 0,
    };
  }

  // Exact 20% discount calculation
  const discountMultiplier = campaign.discountPercentage / 100;
  const discountPerUnit = Math.round(safePrice * discountMultiplier);
  const finalPrice = Math.max(0, safePrice - discountPerUnit);
  const totalDiscount = discountPerUnit * safeQty;

  return {
    eligible: true,
    originalPrice: safePrice,
    discountPerUnit,
    finalPrice,
    totalDiscount,
  };
}

export interface CartCalculationResult {
  subtotal: number;
  campaignDiscount: number;
  couponDiscount: number;
  totalDiscount: number;
  shipping: number;
  total: number;
  couponDesc: string;
  campaignDesc: string;
  eligibleItemCount: number;
  itemsWithDiscount: Array<{
    productId: string;
    name: string;
    category: string;
    price: number;
    qty: number;
    eligible: boolean;
    discountPerUnit: number;
    finalPrice: number;
    lineDiscount: number;
    lineFinalTotal: number;
  }>;
}

/**
 * Computes checkout totals applying automatic campaign discount without coupon requirement.
 * If a valid coupon code is also provided, it applies to the remaining balance without duplicate discount stacking.
 */
export function computeCheckoutTotals(
  cart: Array<{ productId: string; name: string; price: number; qty: number; category: string }>,
  couponCode: string = "",
  validateCouponFn?: (code: string, subtotal: number) => { ok: boolean; discount?: number; coupon?: { desc?: string } },
  campaign: Campaign = KHARIF_CAMPAIGN,
  currentDate: Date = new Date()
): CartCalculationResult {
  const active = isCampaignActive(campaign, currentDate);
  let subtotal = 0;
  let campaignDiscount = 0;
  let eligibleItemCount = 0;

  const itemsWithDiscount = cart.map(item => {
    const p = Math.max(0, Number(item.price) || 0);
    const q = Math.max(1, Math.floor(Number(item.qty) || 1));
    subtotal += p * q;

    const discountInfo = getCampaignDiscountForItem(p, item.category, q, campaign, currentDate);
    if (active && discountInfo.eligible) {
      campaignDiscount += discountInfo.totalDiscount;
      eligibleItemCount += q;
    }

    return {
      productId: item.productId,
      name: item.name,
      category: item.category,
      price: p,
      qty: q,
      eligible: active && discountInfo.eligible,
      discountPerUnit: discountInfo.discountPerUnit,
      finalPrice: discountInfo.finalPrice,
      lineDiscount: discountInfo.totalDiscount,
      lineFinalTotal: discountInfo.finalPrice * q,
    };
  });

  // Calculate coupon discount on remaining balance to prevent duplicate 20% double-dipping
  const balanceAfterCampaign = Math.max(0, subtotal - campaignDiscount);
  let couponDiscount = 0;
  let couponDesc = "";

  if (couponCode.trim() && validateCouponFn) {
    const v = validateCouponFn(couponCode.trim(), balanceAfterCampaign);
    if (v.ok && v.discount) {
      // Disallow reapplying duplicate campaign coupons
      couponDiscount = Math.min(balanceAfterCampaign, Math.max(0, v.discount));
      couponDesc = v.coupon?.desc || "";
    }
  }

  const totalDiscount = campaignDiscount + couponDiscount;
  const afterDiscount = Math.max(0, subtotal - totalDiscount);
  const freeShip = couponCode.toUpperCase() === "FREESHIP" || afterDiscount >= 499;
  const shipping = subtotal > 0 ? (freeShip ? 0 : 49) : 0;
  const total = Math.max(0, afterDiscount + shipping);

  return {
    subtotal,
    campaignDiscount,
    couponDiscount,
    totalDiscount,
    shipping,
    total,
    couponDesc,
    campaignDesc: campaignDiscount > 0 ? `${campaign.name} (20% OFF)` : "",
    eligibleItemCount,
    itemsWithDiscount,
  };
}
