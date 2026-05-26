import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { loadWeather, parseWeatherPayload } from './loadWeather';
import { setWeatherOverride } from './weather';
import { useWeatherStore } from '../state/weatherStore';

function monthly(t: number, p: number) {
  return Array.from({ length: 12 }, () => ({ tempC: t, precipMm: p }));
}

const SAMPLE = {
  byBundesland: {
    BY: { monthly: monthly(8.5, 80), meanTempC: 8.5, annualPrecipMm: 960 },
    BE: { monthly: monthly(9.8, 50), meanTempC: 9.8, annualPrecipMm: 600 },
    XX: { monthly: monthly(0, 0), meanTempC: 0, annualPrecipMm: 0 },
  },
};

beforeEach(() => {
  setWeatherOverride(null);
  useWeatherStore.setState({ data: null, status: 'idle' });
});

afterEach(() => {
  setWeatherOverride(null);
});

describe('parseWeatherPayload', () => {
  it('keeps only entries for known Bundesländer with 12 monthly samples', () => {
    const parsed = parseWeatherPayload(SAMPLE);
    expect(parsed).not.toBeNull();
    expect(Object.keys(parsed!)).toEqual(expect.arrayContaining(['BY', 'BE']));
    expect(Object.keys(parsed!)).not.toContain('XX');
    expect(parsed!.BY?.monthly).toHaveLength(12);
  });

  it('rejects malformed monthly arrays', () => {
    const result = parseWeatherPayload({
      byBundesland: {
        BY: { monthly: [{ tempC: 1, precipMm: 1 }], meanTempC: 1, annualPrecipMm: 1 },
      },
    });
    expect(result).toBeNull();
  });

  it('rejects when annual fields are missing', () => {
    const result = parseWeatherPayload({
      byBundesland: {
        BY: { monthly: monthly(5, 50) },
      },
    });
    expect(result).toBeNull();
  });
});

describe('loadWeather', () => {
  it('marks loaded on success', async () => {
    const fetcher = vi.fn(async () =>
      new Response(JSON.stringify(SAMPLE), { status: 200, headers: { 'content-type': 'application/json' } }),
    ) as unknown as typeof fetch;
    const result = await loadWeather('/data/weather.json', fetcher);
    expect(result).not.toBeNull();
    expect(useWeatherStore.getState().status).toBe('loaded');
  });

  it('marks missing on 404', async () => {
    const fetcher = vi.fn(async () => new Response('nope', { status: 404 })) as unknown as typeof fetch;
    const result = await loadWeather('/data/weather.json', fetcher);
    expect(result).toBeNull();
    expect(useWeatherStore.getState().status).toBe('missing');
  });
});
