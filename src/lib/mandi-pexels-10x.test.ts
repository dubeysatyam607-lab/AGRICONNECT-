import { describe, it, expect } from 'vitest';
import { PEXELS_PHOTO_LIBRARY, normalizeNameForPexels } from './pexels-api';
import { resolveImageUrl } from './image-resolver';

describe('Mandi & Crop Photography — 10-Pass Pexels Audit', () => {
  const MANDI_CORE_COMMODITIES = [
    { key: 'mandi', name: 'Mandi Market Stalls & Traders', category: 'mandi' },
    { key: 'wheat', name: 'Wheat (गेहूं)', category: 'cereals' },
    { key: 'rice', name: 'Rice / Paddy (चावल/धान)', category: 'cereals' },
    { key: 'soybean', name: 'Soybean (सोयाबीन)', category: 'oilseeds' },
    { key: 'mustard', name: 'Mustard (सरसों)', category: 'oilseeds' },
    { key: 'potato', name: 'Potato (आलू)', category: 'vegetables' },
    { key: 'onion', name: 'Onion (प्याज)', category: 'vegetables' },
    { key: 'tomato', name: 'Tomato (टमाटर)', category: 'vegetables' },
    { key: 'garlic', name: 'Garlic (लहसुन)', category: 'vegetables' },
    { key: 'ginger', name: 'Ginger (अदरक)', category: 'vegetables' },
    { key: 'lemon', name: 'Lemon (नींबू)', category: 'fruits' },
    { key: 'coconut', name: 'Coconut (नारियल)', category: 'fruits' },
    { key: 'apple', name: 'Apple (सेब)', category: 'fruits' },
    { key: 'chilli', name: 'Chilli (मिर्च)', category: 'vegetables' }
  ];

  it.each(Array.from({ length: 10 }, (_, i) => i + 1))(
    'Pass #%i/10: verifies all Mandi commodities have verified authentic photo resolution',
    async (passIndex) => {
      for (const item of MANDI_CORE_COMMODITIES) {
        // 1. Check Pexels library entry
        const pexelsEntry = PEXELS_PHOTO_LIBRARY[item.key];
        expect(pexelsEntry, `Pexels library missing item for ${item.key} in Pass ${passIndex}`).toBeDefined();
        expect(pexelsEntry.length).toBeGreaterThan(0);
        expect(pexelsEntry[0].src.large2x.startsWith('https://images.pexels.com/')).toBe(true);
        expect(pexelsEntry[0].alt.length).toBeGreaterThan(5);

        // 2. Check Crop image resolver
        const resolved = resolveImageUrl(undefined, 'crop', item.key);
        expect(resolved).toBeTruthy();
        expect(resolved.startsWith('https://')).toBe(true);
        expect(resolved.startsWith('data:image/svg')).toBe(false);
      }
    }
  );

  it('verifies Hindi to English normalization for all major Mandi query variations', () => {
    expect(normalizeNameForPexels('गेहूं')).toBe('wheat');
    expect(normalizeNameForPexels('धान')).toBe('rice paddy');
    expect(normalizeNameForPexels('सोयाबीन')).toBe('soybean');
    expect(normalizeNameForPexels('सरसों')).toBe('mustard');
    expect(normalizeNameForPexels('आलू')).toBe('potato');
    expect(normalizeNameForPexels('प्याज')).toBe('onion');
    expect(normalizeNameForPexels('टमाटर')).toBe('tomato');
    expect(normalizeNameForPexels('लहसुन')).toBe('garlic');
    expect(normalizeNameForPexels('अदरक')).toBe('ginger');
    expect(normalizeNameForPexels('नींबू')).toBe('lemon');
    expect(normalizeNameForPexels('नारियल')).toBe('coconut');
  });
});
