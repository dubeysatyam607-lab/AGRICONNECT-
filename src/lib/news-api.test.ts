import { describe, it, expect } from 'vitest';
import {
  normalizeNewsArticle,
  isAgricultureRelated,
  getCategoryFromText,
  fetchLiveAgriNews
} from './news-api';

describe('News API Service — Real Verified India News Pipeline', () => {
  it('normalizes raw news item accurately without discarding missing images', () => {
    const raw = {
      title: 'Government announces new MSP rates for Wheat and Mustard crops in Punjab',
      description: 'The Ministry of Agriculture updated the MSP for upcoming rabi season.',
      link: 'https://example.com/news/1',
      pubDate: '2026-09-26T10:00:00Z',
      source: 'PIB India',
    };

    const normalized = normalizeNewsArticle(raw, 0);
    expect(normalized).not.toBeNull();
    expect(normalized?.title).toContain('MSP rates');
    expect(normalized?.source).toBe('PIB India');
    expect(normalized?.category).toBe('Policy & MSP');
    expect(normalized?.imageUrl).toBeTruthy(); // Assigned verified category fallback image
  });

  it('correctly classifies agriculture categories based on text', () => {
    expect(getCategoryFromText('Monsoon rain hits Maharashtra farming regions', '')).toBe('Weather & Monsoon');
    expect(getCategoryFromText('PM-Kisan 18th installment scheme subsidy update', '')).toBe('Schemes & Subsidy');
    expect(getCategoryFromText('Mandi price for Basmati Rice rises in Haryana APMC', '')).toBe('Market & Mandi');
    expect(getCategoryFromText('Solar powered drone irrigation technology for farmers', '')).toBe('Agritech & Innovation');
  });

  it('validates agriculture relevant keywords correctly', () => {
    expect(isAgricultureRelated('PM Kisan scheme launched for farmers', 'Details of subsidy')).toBe(true);
    expect(isAgricultureRelated('IPL T20 Cricket Match Highlights', 'Mumbai defeated Delhi')).toBe(false);
  });

  it('fetches real live agriculture news from live multi-source pipeline', async () => {
    const articles = await fetchLiveAgriNews(true);
    expect(articles).toBeDefined();
    expect(articles.length).toBeGreaterThan(0);
    expect(articles[0].title).toBeTruthy();
    expect(articles[0].source).toBeTruthy();
    expect(articles[0].url).toBeTruthy();
    expect(articles[0].imageUrl).toBeTruthy();
  }, 15000);
});
