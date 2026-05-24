import { describe, expect, it } from 'vitest';
import {
  HOURS_IN_YEAR,
  annualYieldGwh,
  getTimeseriesPv,
  hourToDate,
  valuesAtHour,
} from './timeseriesPv';

describe('timeseriesPv', () => {
  it('produces 8760 hourly values for every Bundesland', () => {
    const data = getTimeseriesPv();
    expect(data.national.length).toBe(HOURS_IN_YEAR);
    expect(data.byBundesland.BY.length).toBe(HOURS_IN_YEAR);
  });

  it('night hours have zero generation', () => {
    const data = getTimeseriesPv();
    expect(data.byBundesland.BY[0]).toBe(0);
    expect(data.byBundesland.BY[3]).toBe(0);
    expect(data.byBundesland.BY[23]).toBe(0);
  });

  it('summer noon (mid-June, hour 12) has positive output across BL', () => {
    const data = getTimeseriesPv();
    const h = 166 * 24 + 12;
    expect(data.byBundesland.BY[h]).toBeGreaterThan(0);
    expect(data.byBundesland.SH[h]).toBeGreaterThan(0);
  });

  it('valuesAtHour returns one value per Bundesland', () => {
    const data = getTimeseriesPv();
    expect(valuesAtHour(data, 100).size).toBe(16);
  });

  it('annual yield places BY > SH', () => {
    const data = getTimeseriesPv();
    const annual = annualYieldGwh(data);
    expect((annual.get('BY') ?? 0)).toBeGreaterThan(annual.get('SH') ?? 0);
  });

  it('hourToDate aligns with reference year start', () => {
    const d = hourToDate(0);
    expect(d.getUTCFullYear()).toBe(2024);
    expect(d.getUTCMonth()).toBe(0);
    expect(d.getUTCDate()).toBe(1);
    expect(d.getUTCHours()).toBe(0);
  });
});
