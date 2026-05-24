import { describe, expect, it } from 'vitest';
import {
  POPULATION_FIRST_YEAR,
  POPULATION_LAST_YEAR,
  getPopulation,
  growthVsBaseline,
  indexForYear,
  nationalSeries,
  populationAt,
} from './population';

describe('population', () => {
  it('produces a series for every year between first and last', () => {
    const data = getPopulation();
    expect(data.years[0]).toBe(POPULATION_FIRST_YEAR);
    expect(data.years[data.years.length - 1]).toBe(POPULATION_LAST_YEAR);
    expect(data.byBundesland.BY.length).toBe(data.years.length);
  });

  it('baseline values match 2010 Destatis-aligned input', () => {
    const data = getPopulation();
    expect(data.byBundesland.BY[0]).toBe(12541);
    expect(data.byBundesland.NW[0]).toBe(17841);
  });

  it('east-German states see net decline by 2030', () => {
    const data = getPopulation();
    const growth = growthVsBaseline(data, POPULATION_LAST_YEAR);
    expect(growth.get('ST')).toBeLessThan(0);
    expect(growth.get('TH')).toBeLessThan(0);
    expect(growth.get('SL')).toBeLessThan(0);
  });

  it('south + city states grow', () => {
    const data = getPopulation();
    const growth = growthVsBaseline(data, POPULATION_LAST_YEAR);
    expect(growth.get('BY')).toBeGreaterThan(0);
    expect(growth.get('BE')).toBeGreaterThan(0);
    expect(growth.get('BW')).toBeGreaterThan(0);
  });

  it('indexForYear clamps and matches offset', () => {
    const data = getPopulation();
    expect(indexForYear(data, 2010)).toBe(0);
    expect(indexForYear(data, 2020)).toBe(10);
    expect(indexForYear(data, 1900)).toBe(0);
    expect(indexForYear(data, 2100)).toBe(data.years.length - 1);
  });

  it('populationAt returns 16 entries with positive values', () => {
    const data = getPopulation();
    const m = populationAt(data, 2020);
    expect(m.size).toBe(16);
    for (const v of m.values()) expect(v).toBeGreaterThan(0);
  });

  it('national series sums all Bundesländer', () => {
    const data = getPopulation();
    const series = nationalSeries(data);
    expect(series.length).toBe(data.years.length);
    expect(series[0]).toBeGreaterThan(70000);
  });
});
