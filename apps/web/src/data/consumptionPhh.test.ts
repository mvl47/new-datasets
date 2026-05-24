import { describe, expect, it } from 'vitest';
import { generatePhhData, isPhhResolution } from './consumptionPhh';

describe('consumptionPhh', () => {
  it('produces deterministic data with one value per Bundesland', () => {
    const a = generatePhhData();
    const b = generatePhhData();
    expect(a.perBundesland.size).toBe(16);
    expect(a.points.length).toBe(b.points.length);
    expect(a.perBundesland.get('NW')).toBe(b.perBundesland.get('NW'));
  });

  it('NW total exceeds Bremen total (population ratio)', () => {
    const { perBundesland } = generatePhhData();
    expect(perBundesland.get('NW') ?? 0).toBeGreaterThan(perBundesland.get('HB') ?? 0);
  });

  it('all generated points have positive weight', () => {
    const { points } = generatePhhData(1, 5);
    expect(points.length).toBeGreaterThan(0);
    for (const p of points) {
      expect(p.weight).toBeGreaterThan(0);
      expect(Number.isFinite(p.lon)).toBe(true);
      expect(Number.isFinite(p.lat)).toBe(true);
    }
  });

  it('isPhhResolution guards correctly', () => {
    expect(isPhhResolution('bundesland')).toBe(true);
    expect(isPhhResolution('raster')).toBe(true);
    expect(isPhhResolution('point')).toBe(false);
    expect(isPhhResolution(0)).toBe(false);
  });
});
