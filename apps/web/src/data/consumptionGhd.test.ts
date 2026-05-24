import { describe, expect, it } from 'vitest';
import {
  GHD_GROUPS,
  generateGhdConsumption,
  ghdValuesFor,
  isGhdGroup,
  nationalGroupTotals,
} from './consumptionGhd';

describe('consumptionGhd', () => {
  it('is deterministic and covers every Bundesland and group', () => {
    const a = generateGhdConsumption();
    const b = generateGhdConsumption();
    expect(a).toEqual(b);
    expect(a).toHaveLength(16);
    for (const r of a) for (const g of GHD_GROUPS) expect(r.byGroup[g]).toBeGreaterThan(0);
  });

  it('TOTAL values exceed any single group per Bundesland', () => {
    for (const r of generateGhdConsumption()) {
      const totals: number = r.byGroup.TOTAL;
      for (const g of GHD_GROUPS) {
        if (g === 'TOTAL') continue;
        expect(totals).toBeGreaterThan(r.byGroup[g]);
      }
    }
  });

  it('isGhdGroup guards correctly', () => {
    expect(isGhdGroup('G')).toBe(true);
    expect(isGhdGroup('TOTAL')).toBe(true);
    expect(isGhdGroup('Z')).toBe(false);
    expect(isGhdGroup(42)).toBe(false);
  });

  it('nationalGroupTotals sums each group across all Bundesländer', () => {
    const records = generateGhdConsumption();
    const totals = nationalGroupTotals(records);
    expect(totals).toHaveLength(6);
    for (const t of totals) {
      let manual = 0;
      for (const r of records) manual += r.byGroup[t.group];
      expect(t.value).toBe(manual);
    }
  });

  it('ghdValuesFor returns one entry per Bundesland', () => {
    const records = generateGhdConsumption();
    const m = ghdValuesFor(records, 'J');
    expect(m.size).toBe(16);
  });
});
