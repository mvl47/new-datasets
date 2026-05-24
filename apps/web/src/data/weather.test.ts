import { describe, expect, it } from 'vitest';
import {
  MONTHS,
  WEATHER_METRICS,
  getWeather,
  isWeatherMetric,
  valuesForMetric,
} from './weather';

describe('weather', () => {
  it('emits 12 monthly values per Bundesland', () => {
    const data = getWeather();
    expect(data.BY.monthly).toHaveLength(MONTHS);
    expect(data.SH.monthly).toHaveLength(MONTHS);
  });

  it('temperature peaks in summer (Jul/Aug index 6/7)', () => {
    const data = getWeather();
    const m = data.BY.monthly;
    const maxIdx = m.reduce((best, c, i) => (c.tempC > (m[best]?.tempC ?? -Infinity) ? i : best), 0);
    expect([6, 7]).toContain(maxIdx);
  });

  it('coastal SH has lower temperature amplitude than continental BY', () => {
    const data = getWeather();
    const range = (xs: { tempC: number }[]) =>
      xs.reduce((mx, c) => Math.max(mx, c.tempC), -Infinity) -
      xs.reduce((mn, c) => Math.min(mn, c.tempC), Infinity);
    expect(range(Array.from(data.SH.monthly))).toBeLessThan(range(Array.from(data.BY.monthly)));
  });

  it('valuesForMetric returns 16 entries for both metrics', () => {
    const data = getWeather();
    for (const metric of WEATHER_METRICS) {
      expect(valuesForMetric(data, metric).size).toBe(16);
    }
  });

  it('isWeatherMetric guards correctly', () => {
    expect(isWeatherMetric('temperature')).toBe(true);
    expect(isWeatherMetric('precipitation')).toBe(true);
    expect(isWeatherMetric('humidity')).toBe(false);
  });
});
