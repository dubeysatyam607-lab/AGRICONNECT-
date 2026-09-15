import { describe, it, expect } from 'vitest';
import {
  hashText,
  stableStringify,
  contentHash,
  newsLookupKey,
  newsTitleHash,
  schemeLookupKey,
  mspLookupKey,
  productLookupKey,
  diffChangedFields,
  isTitleDuplicate,
  categorizeNews,
  stripHtml,
  pickImageUrl,
} from './lib';

describe('agri-sync-worker lib', () => {
  it('hashText is deterministic and stable across runs', () => {
    const a = hashText('PM-KISAN Samman Nidhi');
    const b = hashText('PM-KISAN Samman Nidhi');
    expect(a).toBe(b);
    expect(a).toMatch(/^[0-9a-f]{16}$/);
    expect(hashText('a')).not.toBe(hashText('b'));
  });

  it('stableStringify ignores object key order', () => {
    expect(stableStringify({ b: 1, a: 2 })).toBe(stableStringify({ a: 2, b: 1 }));
    expect(contentHash({ name: 'x', amount: 6000 })).toBe(contentHash({ amount: 6000, name: 'x' }));
  });

  it('lookup keys are stable and content-sensitive', () => {
    expect(schemeLookupKey('PM-KISAN', 'ALL-INDIA')).toBe(schemeLookupKey('pm-kisan ', null));
    expect(schemeLookupKey('PM-KISAN', 'Uttar Pradesh')).not.toBe(schemeLookupKey('PM-KISAN', 'Rajasthan'));

    expect(newsLookupKey('PIB release #1 2026', 'PIB')).toBe(newsLookupKey('PIB release #1 2026', 'PIB'));
    expect(newsTitleHash('  Break   in     Rainfall! ')).toBe(newsTitleHash('Break in Rainfall!'));

    expect(mspLookupKey('Wheat', 'Rabi', '2026-27', null)).toBe(mspLookupKey('wheat ', 'rabi', '2026-27', null));
    expect(mspLookupKey('Wheat', 'Rabi', '2026-27', null)).not.toBe(mspLookupKey('Wheat', 'Kharif', '2026-27', null));

    expect(productLookupKey('insurance', 'PMFBY', 'ALL-INDIA')).toBe(productLookupKey('insurance', 'pmfby', null));
    expect(productLookupKey('loan', 'KCC', 'ALL-INDIA')).not.toBe(productLookupKey('insurance', 'KCC', 'ALL-INDIA'));
  });

  it('diffChangedFields detects field-level changes with snapshots', () => {
    const stored = { name: 'PM-KISAN', benefit_amount: '6000', status: 'active' };
    const incoming = { name: 'PM-KISAN', benefit_amount: '6000', status: 'closed' };
    const diff = diffChangedFields(incoming, stored);
    expect(diff.changed).toBe(true);
    expect(diff.fields).toEqual(['status']);
    expect(diff.oldValue.status).toBe('active');
    expect(diff.newValue.status).toBe('closed');

    const same = diffChangedFields(JSON.parse(JSON.stringify(incoming)), incoming);
    expect(same.changed).toBe(false);
    expect(same.fields).toEqual([]);
  });

  it('isTitleDuplicate flags near-dupes but not distinct stories', () => {
    const stored = ['Cabinet approves increase in MSP for Rabi crops for 2026-27 season'];
    expect(isTitleDuplicate('Cabinet approves MSP hike for Rabi crops 2026-27 season', stored)).toBe(true);
    expect(isTitleDuplicate('PM-KISAN transfers 17th instalment to farmers', stored)).toBe(false);
  });

  it('categorizeNews maps English + Hindi keywords to categories', () => {
    expect(categorizeNews('Cabinet hikes MSP for wheat')).toBe('MSP & Prices');
    expect(categorizeNews('गेहूं का MSP बढ़ा')).toBe('MSP & Prices');
    expect(categorizeNews('PM-KISAN 18th instalment released')).toBe('PM-KISAN');
    expect(categorizeNews('Monsoon advances over Kerala')).toBe('Weather & Monsoon');
    expect(categorizeNews('Fasal Bima Yojana claims settled')).toBe('PMFBY');
    expect(categorizeNews('Unrelated community event in Delhi')).toBe('General');
  });

  it('stripHtml removes tags and normalizes entities', () => {
    expect(stripHtml('<p>Hello <b>farmer</b> &amp; welcome</p>')).toBe('Hello farmer & welcome');
    expect(stripHtml('  lots    of   spaces   ')).toBe('lots of spaces');
  });

  it('pickImageUrl prefers small photographic jpgs', () => {
    expect(pickImageUrl([null, 'http://x.gov/banner.png', 'https://cdn.pib.gov.in/photo/photo-123.jpg'])).toBe(
      'https://cdn.pib.gov.in/photo/photo-123.jpg',
    );
    expect(pickImageUrl(['https://cdn.x.in/logo.png'])).toBeNull();
  });
});