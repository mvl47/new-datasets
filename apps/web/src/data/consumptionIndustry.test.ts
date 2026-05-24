import { describe, expect, it } from 'vitest';
import {
  WZ_SECTIONS,
  domainFor,
  generateIndustryConsumption,
  isWzSection,
  valuesFor,
} from './consumptionIndustry';

describe('consumptionIndustry', () => {
  it('produces a record per Bundesland with every WZ section populated', () => {
    const records = generateIndustryConsumption();
    expect(records).toHaveLength(16);
    for (const r of records) {
      for (const s of WZ_SECTIONS) {
        expect(r.bySection[s]).toBeGreaterThan(0);
      }
    }
  });

  it('is deterministic across calls with the same seed', () => {
    const a = generateIndustryConsumption(42);
    const b = generateIndustryConsumption(42);
    expect(a).toEqual(b);
  });

  it('NW has the highest total demand (most populous & industrial)', () => {
    const records = generateIndustryConsumption();
    const totals = valuesFor(records, 'TOTAL');
    const sorted = [...totals.entries()].sort((x, y) => y[1] - x[1]);
    expect(sorted[0]?.[0]).toBe('NW');
  });

  it('valuesFor + domainFor return matching bounds', () => {
    const records = generateIndustryConsumption();
    const values = valuesFor(records, 'C');
    const [lo, hi] = domainFor(values);
    expect(lo).toBeLessThanOrEqual(hi);
    expect([...values.values()]).toContain(lo);
    expect([...values.values()]).toContain(hi);
  });

  it('isWzSection rejects unknown sections', () => {
    expect(isWzSection('C')).toBe(true);
    expect(isWzSection('TOTAL')).toBe(true);
    expect(isWzSection('Z')).toBe(false);
    expect(isWzSection(null)).toBe(false);
  });
});
