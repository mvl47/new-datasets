import { describe, expect, it } from 'vitest';
import { aggregateOffshore, generateOffshore } from './potentialWindOffshore';

describe('potentialWindOffshore', () => {
  it('is deterministic across calls with the same seed', () => {
    const a = generateOffshore();
    const b = generateOffshore();
    expect(a).toEqual(b);
  });

  it('covers both seas in points and parks', () => {
    const { points, parks } = generateOffshore();
    expect(points.some((p) => p.sea === 'north')).toBe(true);
    expect(points.some((p) => p.sea === 'baltic')).toBe(true);
    expect(parks.some((p) => p.sea === 'north')).toBe(true);
    expect(parks.some((p) => p.sea === 'baltic')).toBe(true);
  });

  it('aggregateOffshore splits operational and planned correctly', () => {
    const { parks } = generateOffshore();
    const agg = aggregateOffshore(parks);
    expect(agg.operationalCount + agg.plannedCount).toBe(parks.length);
    expect(agg.operationalMw).toBeGreaterThan(0);
    expect(agg.plannedMw).toBeGreaterThan(0);
  });

  it('north sea wind score is higher on average than baltic', () => {
    const { points } = generateOffshore();
    const north = points.filter((p) => p.sea === 'north');
    const baltic = points.filter((p) => p.sea === 'baltic');
    const avg = (xs: typeof points) =>
      xs.length === 0 ? 0 : xs.reduce((s, p) => s + p.windScore, 0) / xs.length;
    expect(avg(north)).toBeGreaterThan(avg(baltic));
  });
});
