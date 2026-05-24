import { describe, expect, it } from 'vitest';
import { aggregatePv, byBundesland, generatePvSites } from './potentialPvGround';

describe('potentialPvGround', () => {
  it('produces deterministic sites with closed rectangular polygons', () => {
    const a = generatePvSites();
    const b = generatePvSites();
    expect(a).toEqual(b);
    expect(a.length).toBeGreaterThan(0);
    for (const s of a) {
      expect(s.polygon.length).toBe(5);
      expect(s.polygon[0]).toEqual(s.polygon[s.polygon.length - 1]);
      expect(s.capacityMwp).toBeGreaterThan(0);
      expect(s.yieldGwh).toBeGreaterThan(0);
      expect(s.areaHa).toBeGreaterThan(0);
    }
  });

  it('respects custom count', () => {
    const sites = generatePvSites({ seed: 9, count: 10 });
    expect(sites).toHaveLength(10);
  });

  it('aggregatePv sums consistently', () => {
    const sites = generatePvSites({ seed: 1, count: 5 });
    const agg = aggregatePv(sites);
    expect(agg.count).toBe(5);
    expect(agg.totalCapacityMwp).toBe(sites.reduce((s, x) => s + x.capacityMwp, 0));
  });

  it('byBundesland accumulates per-state counts', () => {
    const sites = generatePvSites({ seed: 2, count: 30 });
    const m = byBundesland(sites);
    expect(m.size).toBe(16);
    let sum = 0;
    for (const e of m.values()) sum += e.count;
    expect(sum).toBe(sites.length);
  });
});
