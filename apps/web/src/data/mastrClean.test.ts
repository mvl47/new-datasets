import { describe, expect, it } from 'vitest';
import {
  MASTR_TECHS,
  generateMastrPlants,
  isMastrVariant,
  summarize,
} from './mastrClean';

describe('mastrClean data', () => {
  it('generates deterministic counts and raw > cleaned', () => {
    const a = generateMastrPlants();
    const b = generateMastrPlants();
    expect(a.cleaned.length).toBe(b.cleaned.length);
    expect(a.raw.length).toBe(b.raw.length);
    expect(a.raw.length).toBeGreaterThan(a.cleaned.length);
    expect(a.cleaned[0]).toEqual(b.cleaned[0]);
  });

  it('respects override counts and includes outliers in raw only', () => {
    const { cleaned, raw } = generateMastrPlants({
      seed: 42,
      cleanedCount: 50,
      duplicateCount: 5,
      outlierCount: 8,
    });
    expect(cleaned).toHaveLength(50);
    expect(raw).toHaveLength(63);
    const cleanedHasNullIsland = cleaned.some((p) => p.lon === 0 && p.lat === 0);
    const rawHasNullIsland = raw.some((p) => p.lon === 0 && p.lat === 0);
    expect(cleanedHasNullIsland).toBe(false);
    expect(rawHasNullIsland).toBe(true);
  });

  it('summarize counts every tech and reports MW capacity', () => {
    const { cleaned } = generateMastrPlants({ seed: 7, cleanedCount: 200 });
    const stats = summarize(cleaned);
    expect(stats.total).toBe(200);
    const techSum = MASTR_TECHS.reduce((acc, t) => acc + stats.byTech[t], 0);
    expect(techSum).toBe(200);
    expect(stats.totalCapacityMw).toBeGreaterThan(0);
  });

  it('isMastrVariant guards correctly', () => {
    expect(isMastrVariant('raw')).toBe(true);
    expect(isMastrVariant('cleaned')).toBe(true);
    expect(isMastrVariant('other')).toBe(false);
    expect(isMastrVariant(null)).toBe(false);
    expect(isMastrVariant(undefined)).toBe(false);
  });
});
