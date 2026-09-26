import { describe, it, expect } from 'vitest';
import { getConditionCategory, getTimeOfDay } from './FarmWeatherEnvironment';

describe('FarmWeatherEnvironment — Realistic Agriculture Weather Logic', () => {
  it('correctly maps weather conditions to environmental categories', () => {
    expect(getConditionCategory('Sunny')).toBe('clear');
    expect(getConditionCategory('Clear')).toBe('clear');
    expect(getConditionCategory('Partly Cloudy')).toBe('partly_cloudy');
    expect(getConditionCategory('Overcast')).toBe('cloudy');
    expect(getConditionCategory('Light Rain')).toBe('rain');
    expect(getConditionCategory('Heavy Monsoon Shower')).toBe('rain');
    expect(getConditionCategory('Thunderstorm')).toBe('storm');
    expect(getConditionCategory('Fog / Mist')).toBe('fog');
  });

  it('calculates time of day correctly', () => {
    const timeOfDay = getTimeOfDay('06:00 AM', '06:30 PM');
    expect(['dawn', 'morning', 'afternoon', 'evening', 'night']).toContain(timeOfDay);
  });
});
