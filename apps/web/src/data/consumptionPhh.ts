import { BUNDESLAENDER, type BundeslandCode } from './bundeslaender';

export type PhhResolution = 'bundesland' | 'raster';

export const PHH_RESOLUTIONS: ReadonlyArray<PhhResolution> = ['bundesland', 'raster'];

export interface PhhPoint {
  lon: number;
  lat: number;
  weight: number;
}

interface UrbanCenter {
  lon: number;
  lat: number;
  population: number;
  bundesland: BundeslandCode;
}

const URBAN_CENTERS: ReadonlyArray<UrbanCenter> = [
  { lon: 13.405, lat: 52.52, population: 3677, bundesland: 'BE' },
  { lon: 9.993, lat: 53.55, population: 1893, bundesland: 'HH' },
  { lon: 11.582, lat: 48.135, population: 1488, bundesland: 'BY' },
  { lon: 6.96, lat: 50.937, population: 1085, bundesland: 'NW' },
  { lon: 8.682, lat: 50.11, population: 765, bundesland: 'HE' },
  { lon: 9.181, lat: 48.776, population: 635, bundesland: 'BW' },
  { lon: 7.012, lat: 51.456, population: 580, bundesland: 'NW' },
  { lon: 7.626, lat: 51.961, population: 320, bundesland: 'NW' },
  { lon: 12.373, lat: 51.34, population: 605, bundesland: 'SN' },
  { lon: 13.738, lat: 51.05, population: 555, bundesland: 'SN' },
  { lon: 8.801, lat: 53.079, population: 568, bundesland: 'HB' },
  { lon: 10.524, lat: 52.265, population: 251, bundesland: 'NI' },
  { lon: 9.732, lat: 52.375, population: 535, bundesland: 'NI' },
  { lon: 9.182, lat: 47.671, population: 220, bundesland: 'BW' },
  { lon: 11.075, lat: 49.452, population: 515, bundesland: 'BY' },
  { lon: 10.898, lat: 48.371, population: 296, bundesland: 'BY' },
  { lon: 6.768, lat: 51.227, population: 620, bundesland: 'NW' },
  { lon: 7.466, lat: 51.514, population: 587, bundesland: 'NW' },
  { lon: 7.013, lat: 51.241, population: 274, bundesland: 'NW' },
  { lon: 8.252, lat: 49.992, population: 218, bundesland: 'RP' },
  { lon: 6.957, lat: 49.234, population: 180, bundesland: 'SL' },
  { lon: 10.79, lat: 53.875, population: 217, bundesland: 'SH' },
  { lon: 9.493, lat: 51.319, population: 200, bundesland: 'HE' },
  { lon: 11.59, lat: 50.927, population: 109, bundesland: 'TH' },
  { lon: 11.04, lat: 50.984, population: 96, bundesland: 'TH' },
  { lon: 11.62, lat: 52.13, population: 235, bundesland: 'ST' },
  { lon: 12.135, lat: 54.083, population: 209, bundesland: 'MV' },
  { lon: 12.146, lat: 53.428, population: 105, bundesland: 'MV' },
  { lon: 13.063, lat: 52.395, population: 110, bundesland: 'BB' },
];

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

export interface PhhData {
  perBundesland: Map<BundeslandCode, number>;
  points: ReadonlyArray<PhhPoint>;
}

const KWH_PER_CAPITA = 1450;

export function generatePhhData(seed = 8001, pointsPerCenter = 80): PhhData {
  const rng = mulberry32(seed);
  const points: PhhPoint[] = [];
  const perBundesland = new Map<BundeslandCode, number>();
  for (const b of BUNDESLAENDER) {
    perBundesland.set(b.code, Math.round((b.populationK * KWH_PER_CAPITA) / 1000));
  }

  for (const c of URBAN_CENTERS) {
    const baseWeight = c.population * KWH_PER_CAPITA;
    for (let i = 0; i < pointsPerCenter; i++) {
      const lon = c.lon + gauss(rng, 0.18);
      const lat = c.lat + gauss(rng, 0.12);
      const weight = (baseWeight / pointsPerCenter) * (0.6 + rng() * 0.8);
      points.push({ lon, lat, weight });
    }
  }

  return { perBundesland, points };
}

let cached: PhhData | null = null;

export function getPhhData(): PhhData {
  if (!cached) cached = generatePhhData();
  return cached;
}

export function isPhhResolution(value: unknown): value is PhhResolution {
  return value === 'bundesland' || value === 'raster';
}
