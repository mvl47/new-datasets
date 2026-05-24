import { BUNDESLAENDER, type BundeslandCode } from './bundeslaender';
import { HOURS_IN_YEAR, hourToDate } from './timeseriesPv';

export type WindKind = 'onshore' | 'offshore';

export const WIND_KINDS: ReadonlyArray<WindKind> = ['onshore', 'offshore'];

const ONSHORE_CAPACITY_MW: Record<BundeslandCode, number> = {
  BW: 1900,
  BY: 2700,
  BE: 10,
  BB: 8000,
  HB: 200,
  HH: 140,
  HE: 2400,
  MV: 3700,
  NI: 12500,
  NW: 7000,
  RP: 3800,
  SL: 150,
  SN: 1300,
  ST: 5500,
  SH: 9000,
  TH: 1700,
};

const OFFSHORE_CAPACITY_MW: Partial<Record<BundeslandCode, number>> = {
  SH: 1500,
  NI: 5300,
  MV: 1200,
};

const ONSHORE_BASE_WIND_MS: Record<BundeslandCode, number> = {
  BW: 5.6,
  BY: 5.4,
  BE: 5.6,
  BB: 6.6,
  HB: 7.0,
  HH: 7.1,
  HE: 5.8,
  MV: 7.4,
  NI: 7.6,
  NW: 6.4,
  RP: 6.0,
  SL: 5.7,
  SN: 5.8,
  ST: 6.6,
  SH: 7.9,
  TH: 6.0,
};

const OFFSHORE_BASE_WIND_MS = 9.6;

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gauss(rng: () => number, sigma: number): number {
  const u = Math.max(rng(), Number.EPSILON);
  const v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v) * sigma;
}

function capacityFactor(windMs: number): number {
  const cutIn = 3;
  const rated = 12;
  const cutOut = 25;
  if (windMs < cutIn || windMs >= cutOut) return 0;
  if (windMs >= rated) return 1;
  return Math.pow((windMs - cutIn) / (rated - cutIn), 3);
}

export interface TimeseriesWindData {
  onshore: { capacities: Record<BundeslandCode, number>; byBundesland: Record<BundeslandCode, Float32Array>; national: Float32Array };
  offshore: { capacities: Partial<Record<BundeslandCode, number>>; byBundesland: Partial<Record<BundeslandCode, Float32Array>>; national: Float32Array };
}

let cached: TimeseriesWindData | null = null;
let onshoreOverride: TimeseriesWindData['onshore'] | null = null;

export function setTimeseriesWindOnshoreOverride(
  onshore: TimeseriesWindData['onshore'] | null,
): void {
  onshoreOverride = onshore;
}

function seasonalScale(dayOfYear: number): number {
  return 1.05 + 0.35 * Math.cos((2 * Math.PI * (dayOfYear - 10)) / 365);
}

function diurnal(hourOfDay: number): number {
  return 1 + 0.15 * Math.sin((2 * Math.PI * (hourOfDay - 6)) / 24);
}

export function getTimeseriesWind(): TimeseriesWindData {
  if (cached) {
    return onshoreOverride
      ? { onshore: onshoreOverride, offshore: cached.offshore }
      : cached;
  }
  const rngOn = mulberry32(7711);
  const rngOff = mulberry32(7712);

  const onshoreBy = {} as Record<BundeslandCode, Float32Array>;
  const onshoreNational = new Float32Array(HOURS_IN_YEAR);

  for (const b of BUNDESLAENDER) {
    const baseWind = ONSHORE_BASE_WIND_MS[b.code];
    const cap = ONSHORE_CAPACITY_MW[b.code];
    const series = new Float32Array(HOURS_IN_YEAR);
    for (let h = 0; h < HOURS_IN_YEAR; h++) {
      const day = Math.floor(h / 24);
      const hod = h % 24;
      const wind = Math.max(0, baseWind * seasonalScale(day) * diurnal(hod) + gauss(rngOn, 1.8));
      const v = capacityFactor(wind) * cap;
      series[h] = v;
      onshoreNational[h] = (onshoreNational[h] ?? 0) + v;
    }
    onshoreBy[b.code] = series;
  }

  const offshoreBy: Partial<Record<BundeslandCode, Float32Array>> = {};
  const offshoreNational = new Float32Array(HOURS_IN_YEAR);
  for (const code of Object.keys(OFFSHORE_CAPACITY_MW) as BundeslandCode[]) {
    const cap = OFFSHORE_CAPACITY_MW[code] ?? 0;
    const series = new Float32Array(HOURS_IN_YEAR);
    for (let h = 0; h < HOURS_IN_YEAR; h++) {
      const day = Math.floor(h / 24);
      const hod = h % 24;
      const wind = Math.max(
        0,
        OFFSHORE_BASE_WIND_MS * seasonalScale(day) * diurnal(hod) + gauss(rngOff, 2.4),
      );
      const v = capacityFactor(wind) * cap;
      series[h] = v;
      offshoreNational[h] = (offshoreNational[h] ?? 0) + v;
    }
    offshoreBy[code] = series;
  }

  cached = {
    onshore: { capacities: ONSHORE_CAPACITY_MW, byBundesland: onshoreBy, national: onshoreNational },
    offshore: {
      capacities: OFFSHORE_CAPACITY_MW,
      byBundesland: offshoreBy,
      national: offshoreNational,
    },
  };
  if (onshoreOverride) {
    return { onshore: onshoreOverride, offshore: cached.offshore };
  }
  return cached;
}

export function isWindKind(value: unknown): value is WindKind {
  return value === 'onshore' || value === 'offshore';
}

export function windValuesAtHour(
  data: TimeseriesWindData,
  kind: WindKind,
  hour: number,
): Map<BundeslandCode, number> {
  const safeHour = Math.max(0, Math.min(HOURS_IN_YEAR - 1, Math.floor(hour)));
  const map = new Map<BundeslandCode, number>();
  if (kind === 'onshore') {
    for (const b of BUNDESLAENDER) {
      const s = data.onshore.byBundesland[b.code];
      map.set(b.code, s[safeHour] ?? 0);
    }
  } else {
    for (const b of BUNDESLAENDER) {
      const s = data.offshore.byBundesland[b.code];
      map.set(b.code, s?.[safeHour] ?? 0);
    }
  }
  return map;
}

export function nationalSeries(data: TimeseriesWindData, kind: WindKind): Float32Array {
  return kind === 'onshore' ? data.onshore.national : data.offshore.national;
}

export function peakOfSeries(series: Float32Array): { mw: number; hour: number } {
  let p = 0;
  let pi = 0;
  for (let i = 0; i < series.length; i++) {
    const v = series[i] ?? 0;
    if (v > p) {
      p = v;
      pi = i;
    }
  }
  return { mw: p, hour: pi };
}

export { hourToDate };
