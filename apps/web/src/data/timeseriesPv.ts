import { BUNDESLAENDER, type BundeslandCode } from './bundeslaender';

export const HOURS_IN_YEAR = 8760;
export const REFERENCE_YEAR = 2024;

const CAPACITY_MWP: Record<BundeslandCode, number> = {
  BW: 9800,
  BY: 23800,
  BE: 220,
  BB: 5700,
  HB: 130,
  HH: 250,
  HE: 4100,
  MV: 4200,
  NI: 7500,
  NW: 8400,
  RP: 4200,
  SL: 720,
  SN: 3400,
  ST: 4100,
  SH: 3800,
  TH: 2200,
};

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

function clearSkyElevation(latRad: number, dayOfYear: number, hourOfDay: number): number {
  const declination =
    23.45 * Math.sin((2 * Math.PI * (284 + dayOfYear)) / 365) * (Math.PI / 180);
  const hourAngle = (15 * (hourOfDay - 12) * Math.PI) / 180;
  const sinE =
    Math.sin(latRad) * Math.sin(declination) +
    Math.cos(latRad) * Math.cos(declination) * Math.cos(hourAngle);
  return Math.asin(Math.max(-1, Math.min(1, sinE)));
}

export interface TimeseriesPvData {
  capacities: Record<BundeslandCode, number>;
  byBundesland: Record<BundeslandCode, Float32Array>;
  national: Float32Array;
}

let cached: TimeseriesPvData | null = null;

export function getTimeseriesPv(): TimeseriesPvData {
  if (cached) return cached;
  const rng = mulberry32(2204);
  const byBundesland = {} as Record<BundeslandCode, Float32Array>;
  const national = new Float32Array(HOURS_IN_YEAR);
  for (const b of BUNDESLAENDER) {
    const latRad = (b.centroid[1] * Math.PI) / 180;
    const cap = CAPACITY_MWP[b.code];
    const series = new Float32Array(HOURS_IN_YEAR);
    for (let h = 0; h < HOURS_IN_YEAR; h++) {
      const dayOfYear = Math.floor(h / 24);
      const hourOfDay = h % 24;
      const elev = clearSkyElevation(latRad, dayOfYear, hourOfDay);
      if (elev <= 0) {
        series[h] = 0;
        continue;
      }
      const clearSky = Math.sin(elev);
      const cloudiness = 0.55 + 0.4 * rng();
      const seasonalBoost = 0.9 + 0.2 * Math.sin((2 * Math.PI * (dayOfYear - 80)) / 365);
      const mw = cap * clearSky * cloudiness * seasonalBoost * 0.85;
      const v = Math.max(0, mw);
      series[h] = v;
      national[h] = (national[h] ?? 0) + v;
    }
    byBundesland[b.code] = series;
  }
  cached = { capacities: CAPACITY_MWP, byBundesland, national };
  return cached;
}

export function hourToDate(hour: number): Date {
  const ms = Date.UTC(REFERENCE_YEAR, 0, 1, 0, 0, 0) + hour * 3600 * 1000;
  return new Date(ms);
}

export function dateLabel(hour: number, locale: string): string {
  return hourToDate(hour).toLocaleString(locale, {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  });
}

export function valuesAtHour(
  data: TimeseriesPvData,
  hour: number,
): Map<BundeslandCode, number> {
  const map = new Map<BundeslandCode, number>();
  const safeHour = Math.max(0, Math.min(HOURS_IN_YEAR - 1, Math.floor(hour)));
  for (const b of BUNDESLAENDER) {
    const series = data.byBundesland[b.code];
    map.set(b.code, series[safeHour] ?? 0);
  }
  return map;
}

export function annualYieldGwh(
  data: TimeseriesPvData,
): Map<BundeslandCode, number> {
  const map = new Map<BundeslandCode, number>();
  for (const b of BUNDESLAENDER) {
    let sum = 0;
    const series = data.byBundesland[b.code];
    for (let i = 0; i < series.length; i++) sum += series[i] ?? 0;
    map.set(b.code, Math.round(sum / 1000));
  }
  return map;
}
