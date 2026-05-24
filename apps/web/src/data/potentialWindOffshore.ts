export type OffshoreSea = 'north' | 'baltic';

export const OFFSHORE_SEAS: ReadonlyArray<OffshoreSea> = ['north', 'baltic'];

export interface OffshorePoint {
  lon: number;
  lat: number;
  windScore: number;
  sea: OffshoreSea;
}

export interface OffshorePark {
  id: string;
  name: string;
  lon: number;
  lat: number;
  capacityMw: number;
  status: 'operational' | 'planned';
  sea: OffshoreSea;
}

const NORTH_SEA_CLUSTERS: ReadonlyArray<{
  lon: number;
  lat: number;
  spread: number;
  weight: number;
}> = [
  { lon: 6.5, lat: 54.0, spread: 0.5, weight: 12 },
  { lon: 6.8, lat: 54.3, spread: 0.4, weight: 10 },
  { lon: 7.2, lat: 54.5, spread: 0.4, weight: 8 },
  { lon: 5.8, lat: 54.4, spread: 0.6, weight: 9 },
  { lon: 6.2, lat: 54.7, spread: 0.5, weight: 7 },
];

const BALTIC_CLUSTERS: ReadonlyArray<{
  lon: number;
  lat: number;
  spread: number;
  weight: number;
}> = [
  { lon: 13.8, lat: 54.7, spread: 0.5, weight: 6 },
  { lon: 12.9, lat: 54.6, spread: 0.4, weight: 5 },
  { lon: 14.5, lat: 54.9, spread: 0.5, weight: 4 },
];

const OFFSHORE_PARKS_FIXED: ReadonlyArray<Omit<OffshorePark, 'id'>> = [
  { name: 'Alpha Ventus', lon: 6.598, lat: 54.013, capacityMw: 60, status: 'operational', sea: 'north' },
  { name: 'Riffgat', lon: 6.484, lat: 53.692, capacityMw: 113, status: 'operational', sea: 'north' },
  { name: 'BARD Offshore 1', lon: 5.978, lat: 54.355, capacityMw: 400, status: 'operational', sea: 'north' },
  { name: 'DanTysk', lon: 7.193, lat: 55.122, capacityMw: 288, status: 'operational', sea: 'north' },
  { name: 'Sandbank', lon: 6.973, lat: 55.193, capacityMw: 288, status: 'operational', sea: 'north' },
  { name: 'Amrumbank West', lon: 7.69, lat: 54.494, capacityMw: 302, status: 'operational', sea: 'north' },
  { name: 'Meerwind Süd|Ost', lon: 7.7, lat: 54.36, capacityMw: 288, status: 'operational', sea: 'north' },
  { name: 'Nordsee One', lon: 6.55, lat: 53.97, capacityMw: 332, status: 'operational', sea: 'north' },
  { name: 'Borkum Riffgrund 2', lon: 6.55, lat: 53.96, capacityMw: 450, status: 'operational', sea: 'north' },
  { name: 'EnBW Baltic 2', lon: 13.157, lat: 54.978, capacityMw: 288, status: 'operational', sea: 'baltic' },
  { name: 'Wikinger', lon: 14.069, lat: 54.835, capacityMw: 350, status: 'operational', sea: 'baltic' },
  { name: 'Arkona', lon: 14.122, lat: 54.778, capacityMw: 385, status: 'operational', sea: 'baltic' },
  { name: 'N-7.2', lon: 6.2, lat: 55.3, capacityMw: 900, status: 'planned', sea: 'north' },
  { name: 'O-1.3', lon: 14.7, lat: 54.95, capacityMw: 300, status: 'planned', sea: 'baltic' },
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

function pickCluster<T extends { weight: number }>(rng: () => number, clusters: ReadonlyArray<T>): T {
  const total = clusters.reduce((s, c) => s + c.weight, 0);
  let r = rng() * total;
  for (const c of clusters) {
    r -= c.weight;
    if (r <= 0) return c;
  }
  return clusters[clusters.length - 1] as T;
}

export interface OffshoreData {
  points: ReadonlyArray<OffshorePoint>;
  parks: ReadonlyArray<OffshorePark>;
}

export function generateOffshore(seed = 5500, perCluster = 80): OffshoreData {
  const rng = mulberry32(seed);
  const points: OffshorePoint[] = [];

  for (let i = 0; i < NORTH_SEA_CLUSTERS.length * perCluster; i++) {
    const c = pickCluster(rng, NORTH_SEA_CLUSTERS);
    points.push({
      lon: c.lon + gauss(rng, c.spread),
      lat: c.lat + gauss(rng, c.spread * 0.7),
      windScore: 8.6 + (rng() - 0.5) * 1.4,
      sea: 'north',
    });
  }
  for (let i = 0; i < BALTIC_CLUSTERS.length * perCluster; i++) {
    const c = pickCluster(rng, BALTIC_CLUSTERS);
    points.push({
      lon: c.lon + gauss(rng, c.spread),
      lat: c.lat + gauss(rng, c.spread * 0.7),
      windScore: 7.4 + (rng() - 0.5) * 1.2,
      sea: 'baltic',
    });
  }

  const parks: OffshorePark[] = OFFSHORE_PARKS_FIXED.map((p, i) => ({
    ...p,
    id: `op-${i.toString().padStart(3, '0')}`,
  }));

  return { points, parks };
}

let cached: OffshoreData | null = null;

export function getOffshore(): OffshoreData {
  if (!cached) cached = generateOffshore();
  return cached;
}

export interface OffshoreAggregate {
  operationalMw: number;
  plannedMw: number;
  operationalCount: number;
  plannedCount: number;
}

export function aggregateOffshore(parks: ReadonlyArray<OffshorePark>): OffshoreAggregate {
  let operationalMw = 0;
  let plannedMw = 0;
  let operationalCount = 0;
  let plannedCount = 0;
  for (const p of parks) {
    if (p.status === 'operational') {
      operationalMw += p.capacityMw;
      operationalCount += 1;
    } else {
      plannedMw += p.capacityMw;
      plannedCount += 1;
    }
  }
  return { operationalMw, plannedMw, operationalCount, plannedCount };
}
