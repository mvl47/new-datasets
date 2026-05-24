import { BUNDESLAENDER, type BundeslandCode } from './bundeslaender';

export const POPULATION_FIRST_YEAR = 2010;
export const POPULATION_LAST_YEAR = 2030;

const POPULATION_2010_K: Record<BundeslandCode, number> = {
  BW: 10737,
  BY: 12541,
  BE: 3460,
  BB: 2509,
  HB: 660,
  HH: 1772,
  HE: 6066,
  MV: 1643,
  NI: 7919,
  NW: 17841,
  RP: 4006,
  SL: 1018,
  SN: 4150,
  ST: 2331,
  SH: 2828,
  TH: 2235,
};

const ANNUAL_GROWTH_RATE: Record<BundeslandCode, number> = {
  BW: 0.0050,
  BY: 0.0065,
  BE: 0.0095,
  BB: -0.0010,
  HB: 0.0015,
  HH: 0.0070,
  HE: 0.0050,
  MV: -0.0045,
  NI: 0.0025,
  NW: 0.0010,
  RP: 0.0015,
  SL: -0.0055,
  SN: -0.0020,
  ST: -0.0095,
  SH: 0.0035,
  TH: -0.0080,
};

export interface PopulationData {
  years: ReadonlyArray<number>;
  byBundesland: Partial<Record<BundeslandCode, ReadonlyArray<number>>>;
  baselineYear: number;
}

let cached: PopulationData | null = null;
let override: PopulationData | null = null;

export function setPopulationOverride(data: PopulationData | null): void {
  override = data;
}

export function getPopulation(): PopulationData {
  if (override) return override;
  if (cached) return cached;
  const years: number[] = [];
  for (let y = POPULATION_FIRST_YEAR; y <= POPULATION_LAST_YEAR; y++) years.push(y);
  const byBundesland: Partial<Record<BundeslandCode, ReadonlyArray<number>>> = {};
  for (const b of BUNDESLAENDER) {
    const series: number[] = [];
    const base = POPULATION_2010_K[b.code];
    const rate = ANNUAL_GROWTH_RATE[b.code];
    for (let i = 0; i < years.length; i++) {
      series.push(Math.round(base * Math.pow(1 + rate, i)));
    }
    byBundesland[b.code] = series;
  }
  cached = { years, byBundesland, baselineYear: POPULATION_FIRST_YEAR };
  return cached;
}

export function indexForYear(data: PopulationData, year: number): number {
  const lastYear = data.years[data.years.length - 1] ?? data.baselineYear;
  if (year <= data.baselineYear) return 0;
  if (year >= lastYear) return data.years.length - 1;
  return year - data.baselineYear;
}

export function growthVsBaseline(
  data: PopulationData,
  year: number,
): Map<BundeslandCode, number> {
  const idx = indexForYear(data, year);
  const m = new Map<BundeslandCode, number>();
  for (const b of BUNDESLAENDER) {
    const series = data.byBundesland[b.code];
    if (!series) {
      m.set(b.code, 0);
      continue;
    }
    const value = series[idx];
    const baseline = series[0];
    if (value == null || baseline == null || baseline === 0) {
      m.set(b.code, 0);
      continue;
    }
    m.set(b.code, ((value - baseline) / baseline) * 100);
  }
  return m;
}

export function populationAt(
  data: PopulationData,
  year: number,
): Map<BundeslandCode, number> {
  const idx = indexForYear(data, year);
  const m = new Map<BundeslandCode, number>();
  for (const b of BUNDESLAENDER) {
    const series = data.byBundesland[b.code];
    m.set(b.code, series?.[idx] ?? 0);
  }
  return m;
}

export function nationalSeries(data: PopulationData): ReadonlyArray<number> {
  return data.years.map((_, idx) => {
    let sum = 0;
    for (const b of BUNDESLAENDER) sum += data.byBundesland[b.code]?.[idx] ?? 0;
    return sum;
  });
}
