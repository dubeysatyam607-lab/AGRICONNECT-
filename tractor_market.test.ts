import { describe, it, expect } from 'vitest';
import { MACHINE_IMG } from './src/lib/machine-images';

const CATALOG_NAMES = [
  'Mahindra 575 DI',
  'Sonalika Tiger 55',
  'John Deere 5310',
  'Swaraj 855',
  'Massey Ferguson 241',
  'Kubota M5-091',
  'Mahindra Rotavator 4FT',
  'Sonalika Plough 3-Typr',
  'Kubota M7-171',
  'Swaraj XT Tractor',
  'FieldKing Harvester',
  'Tirth Agro Seed Drill',
  'VST 30HP Tractor',
  'Balwan Thresher',
  'New Holland 5630',
  'Shaktiman Cultivator',
  'Crompton Sprayer',
  'Eicher 548 Tractor',
  'CLAAS Dominator',
  'Preet Plough',
  'Farmtrac 60 PowerMax',
  'VST Shakti DI',
  'Kubota Rice Transplanter',
  'New Holland Drip Sprayer',
];

describe('MACHINE_IMG', () => {
  it('covers every name in the tractor-hire catalog', () => {
    const missing = CATALOG_NAMES.filter((name) => !MACHINE_IMG[name]);
    expect(missing).toEqual([]);
  });

  it('maps every catalog name to a distinct image URL', () => {
    const urls = CATALOG_NAMES.map((name) => MACHINE_IMG[name]);
    expect(new Set(urls).size).toBe(CATALOG_NAMES.length);
  });

  it('never yields the shared John Deere default for a catalog item', () => {
    const defaultUrl = MACHINE_IMG['John Deere 5310'];
    const defaulted = CATALOG_NAMES.filter((name) => MACHINE_IMG[name] === defaultUrl);
    expect(defaulted).toEqual(['John Deere 5310']);
  });
});
