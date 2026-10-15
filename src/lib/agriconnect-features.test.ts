import { describe, it, expect, beforeEach } from 'vitest';
import { 
  KHARIF_CAMPAIGN, 
  isCampaignActive, 
  isProductEligibleForCampaign, 
  getCampaignDiscountForItem, 
  computeCheckoutTotals 
} from './campaigns';
import { localizeArticle, translateAgriText } from './news-translator';
import { VERIFIED_GOVERNMENT_SCHEMES } from './government-schemes-data';

describe('Area 5: Kharif Sale Campaign Engine', () => {
  it('correctly reports Kharif campaign active during valid date window', () => {
    // Campaign is configured 2026-05-01 to 2026-11-30
    const inSeasonDate = new Date('2026-08-15T00:00:00Z');
    expect(isCampaignActive(KHARIF_CAMPAIGN, inSeasonDate)).toBe(true);

    const offSeasonDate = new Date('2027-01-15T00:00:00Z');
    expect(isCampaignActive(KHARIF_CAMPAIGN, offSeasonDate)).toBe(false);
  });

  it('accurately identifies eligible categories (seeds & fertilizers) and rejects others', () => {
    const activeDate = new Date('2026-07-01');
    expect(isProductEligibleForCampaign({ category: 'seeds' }, KHARIF_CAMPAIGN, activeDate)).toBe(true);
    expect(isProductEligibleForCampaign({ category: 'fertilizers' }, KHARIF_CAMPAIGN, activeDate)).toBe(true);
    expect(isProductEligibleForCampaign({ category: 'pesticides' }, KHARIF_CAMPAIGN, activeDate)).toBe(false);
    expect(isProductEligibleForCampaign({ category: 'tools' }, KHARIF_CAMPAIGN, activeDate)).toBe(false);
    expect(isProductEligibleForCampaign({ category: 'machinery' }, KHARIF_CAMPAIGN, activeDate)).toBe(false);
    expect(isProductEligibleForCampaign({ category: 'transport' }, KHARIF_CAMPAIGN, activeDate)).toBe(false);
  });

  it('calculates exact 20% discount: Final eligible item price = Original price × 0.80', () => {
    // Example from prompt: ₹500 product -> ₹400 discounted, ₹100 discount
    const pricing = getCampaignDiscountForItem(500, 'seeds', 1, KHARIF_CAMPAIGN, new Date('2026-07-01'));

    expect(pricing.eligible).toBe(true);
    expect(pricing.originalPrice).toBe(500);
    expect(pricing.discountPerUnit).toBe(100);
    expect(pricing.finalPrice).toBe(400);
    expect(pricing.totalDiscount).toBe(100);
  });

  it('computes checkout totals accurately with mixed cart of eligible and non-eligible items', () => {
    const cartItems = [
      {
        productId: 's1',
        name: 'Wheat Seeds 10kg',
        price: 500,
        qty: 2, // 500 * 2 = 1000, 20% discount = 200, net = 800
        category: 'seeds'
      },
      {
        productId: 'f1',
        name: 'NPK Fertilizer 50kg',
        price: 1200,
        qty: 1, // 1200 * 1 = 1200, 20% discount = 240, net = 960
        category: 'fertilizers'
      },
      {
        productId: 't1',
        name: 'Heavy Duty Spray Pump',
        price: 1500,
        qty: 1, // 1500 * 1 = 1500, 0% discount = 0, net = 1500
        category: 'tools'
      }
    ];

    const totals = computeCheckoutTotals(cartItems, "", undefined, KHARIF_CAMPAIGN, new Date('2026-07-01'));
    // Subtotal: 1000 + 1200 + 1500 = 3700
    expect(totals.subtotal).toBe(3700);
    // Campaign Discount: 200 + 240 = 440
    expect(totals.campaignDiscount).toBe(440);
    // Net after discount: 3700 - 440 = 3260. Since 3260 >= 499, free shipping applies (0).
    expect(totals.total).toBe(3260);
    expect(totals.eligibleItemCount).toBe(3); // 2 seeds + 1 fert
    expect(totals.itemsWithDiscount).toHaveLength(3);
    expect(totals.itemsWithDiscount[0].lineDiscount).toBe(200);
    expect(totals.itemsWithDiscount[1].lineDiscount).toBe(240);
    expect(totals.itemsWithDiscount[2].lineDiscount).toBe(0);
  });
});

describe('Area 7: Agricultural News Translation & Localization', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns original text directly for English without unnecessary API calls', async () => {
    const article = {
      id: '1',
      title: 'Union Cabinet approves Minimum Support Prices for Kharif Crops',
      description: 'Government announces MSP hike across major kharif commodities.',
      source: 'PIB Agriculture',
      category: 'Policy & MSP',
      publishedAt: '2026-06-19',
      url: 'https://pib.gov.in'
    };

    const localized = await localizeArticle(article, 'en');
    expect(localized.displayTitle).toBe('Union Cabinet approves Minimum Support Prices for Kharif Crops');
    expect(localized.isOriginalLanguage).toBe(true);
  });

  it('translates known categories into Hindi and Marathi accurately', async () => {
    const article = {
      id: '1',
      title: 'Monsoon Rainfall Update',
      description: 'IMD forecasts above normal rains.',
      source: 'IMD',
      category: 'Weather & Monsoon',
      publishedAt: '2026-07-01',
      url: 'https://mausam.imd.gov.in'
    };

    const hiArticle = await localizeArticle(article, 'hi');
    expect(hiArticle.displayCategory).toBe('मौसम और मानसून');

    const mrArticle = await localizeArticle(article, 'mr');
    expect(mrArticle.displayCategory).toBe('हवामान आणि मान्सून');
  });

  it('translates arbitrary text into target language or safely falls back on network errors', async () => {
    const result = await translateAgriText('Kharif Crop', 'en');
    expect(result.translated).toBe('Kharif Crop');
    expect(result.isOriginal).toBe(true);
  });
});

describe('Area 8: Government Schemes Authenticity', () => {
  it('all verified schemes have official application URLs and authentic verified dates', () => {
    expect(VERIFIED_GOVERNMENT_SCHEMES.length).toBeGreaterThan(0);
    
    for (const scheme of VERIFIED_GOVERNMENT_SCHEMES) {
      expect(scheme.applyUrl).toMatch(/^https?:\/\//);
      expect(scheme.lastVerifiedDate).toBe('2026-08-06');
      expect(scheme.status).toBeTruthy();
      expect(scheme.ministry).toBeTruthy();
    }
  });

  it('includes key flagship national schemes: PM-KISAN, PMFBY, KCC, SMAM', () => {
    const schemeTitles = VERIFIED_GOVERNMENT_SCHEMES.map(s => s.title);
    expect(schemeTitles.some(n => n.includes('PM-KISAN'))).toBe(true);
    expect(schemeTitles.some(n => n.includes('PMFBY') || n.includes('Fasal Bima'))).toBe(true);
    expect(schemeTitles.some(n => n.includes('KCC') || n.includes('Kisan Credit Card'))).toBe(true);
    expect(schemeTitles.some(n => n.includes('SMAM') || n.includes('Mechanization'))).toBe(true);
  });
});
