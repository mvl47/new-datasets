export type MastrTech = 'solar' | 'wind' | 'biomass' | 'hydro';
export type MastrVariant = 'raw' | 'cleaned';

export interface MastrPlant {
  id: string;
  lon: number;
  lat: number;
  tech: MastrTech;
  capacityKw: number;
  commissioningYear: number;
}

export interface MastrStats {
  total: number;
  totalCapacityMw: number;
  byTech: Record<MastrTech, number>;
}

export const MASTR_TECHS: ReadonlyArray<MastrTech> = ['solar', 'wind', 'biomass', 'hydro'];

export const MASTR_TECH_COLORS: Record<MastrTech, [number, number, number]> = {
  solar: [234, 179, 8],
  wind: [56, 189, 248],
  biomass: [132, 204, 22],
  hydro: [14, 165, 233],
};

interface ClusterCenter {
  lon: number;
  lat: number;
  weight: number;
}

const CLUSTER_CENTERS: ReadonlyArray<ClusterCenter> = [
  { lon: 13.405, lat: 52.52, weight: 8 },
  { lon: 9.993, lat: 53.55, weight: 6 },
  { lon: 11.582, lat: 48.135, weight: 7 },
  { lon: 6.96, lat: 50.937, weight: 6 },
  { lon: 8.682, lat: 50.11, weight: 5 },
  { lon: 9.181, lat: 48.776, weight: 5 },
  { lon: 7.012, lat: 51.456, weight: 5 },
  { lon: 12.373, lat: 51.34, weight: 4 },
  { lon: 8.801, lat: 53.079, weight: 3 },
  { lon: 10.524, lat: 52.265, weight: 3 },
];

const TECH_WEIGHTS: ReadonlyArray<readonly [MastrTech, number]> = [
  ['solar', 0.55],
  ['wind', 0.3],
  ['biomass', 0.1],
  ['hydro', 0.05],
];

const CAPACITY_RANGES: Record<MastrTech, [number, number]> = {
  solar: [5, 800],
  wind: [2000, 6000],
  biomass: [200, 2500],
  hydro: [50, 4000],
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

function pickTech(rng: () => number): MastrTech {
  const r = rng();
  let acc = 0;
  for (const [tech, weight] of TECH_WEIGHTS) {
    acc += weight;
    if (r < acc) return tech;
  }
  return 'solar';
}

const FALLBACK_CLUSTER: ClusterCenter = { lon: 10.45, lat: 51.16, weight: 1 };

function pickCluster(rng: () => number): ClusterCenter {
  const total = CLUSTER_CENTERS.reduce((s, c) => s + c.weight, 0);
  const r = rng() * total;
  let acc = 0;
  for (const c of CLUSTER_CENTERS) {
    acc += c.weight;
    if (r < acc) return c;
  }
  return FALLBACK_CLUSTER;
}

function gauss(rng: () => number, sigma: number): number {
  const u = Math.max(rng(), Number.EPSILON);
  const v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v) * sigma;
}

export interface GenerateOptions {
  seed?: number;
  cleanedCount?: number;
  duplicateCount?: number;
  outlierCount?: number;
}

interface GenerateResult {
  cleaned: ReadonlyArray<MastrPlant>;
  raw: ReadonlyArray<MastrPlant>;
}

export function generateMastrPlants(options: GenerateOptions = {}): GenerateResult {
  const { seed = 1742, cleanedCount = 480, duplicateCount = 40, outlierCount = 30 } = options;
  const rng = mulberry32(seed);

  const cleaned: MastrPlant[] = [];
  for (let i = 0; i < cleanedCount; i++) {
    const cluster = pickCluster(rng);
    const tech = pickTech(rng);
    const [capMin, capMax] = CAPACITY_RANGES[tech];
    const lon = cluster.lon + gauss(rng, 0.45);
    const lat = cluster.lat + gauss(rng, 0.32);
    const capacityKw = Math.round(capMin + rng() * (capMax - capMin));
    const commissioningYear = 2000 + Math.floor(rng() * 25);
    cleaned.push({
      id: `c-${i.toString().padStart(4, '0')}`,
      lon,
      lat,
      tech,
      capacityKw,
      commissioningYear,
    });
  }

  const raw: MastrPlant[] = [...cleaned];

  if (cleaned.length > 0) {
    for (let i = 0; i < duplicateCount; i++) {
      const source = cleaned[Math.floor(rng() * cleaned.length)] as MastrPlant;
      raw.push({
        ...source,
        id: `d-${i.toString().padStart(4, '0')}`,
        lon: source.lon + (rng() - 0.5) * 0.002,
        lat: source.lat + (rng() - 0.5) * 0.002,
      });
    }
  }

  for (let i = 0; i < outlierCount; i++) {
    const kind = rng();
    let lon: number;
    let lat: number;
    if (kind < 0.4) {
      lon = 0;
      lat = 0;
    } else if (kind < 0.7) {
      lon = 5.866 - 0.5 - rng() * 4;
      lat = 47.27 + rng() * 8;
    } else {
      lon = 5.866 + rng() * 9.176;
      lat = 47.27 - 0.5 - rng() * 4;
    }
    const tech = pickTech(rng);
    const [capMin, capMax] = CAPACITY_RANGES[tech];
    raw.push({
      id: `o-${i.toString().padStart(4, '0')}`,
      lon,
      lat,
      tech,
      capacityKw: Math.round(capMin + rng() * (capMax - capMin)),
      commissioningYear: 2000 + Math.floor(rng() * 25),
    });
  }

  return { cleaned, raw };
}

export function summarize(plants: ReadonlyArray<MastrPlant>): MastrStats {
  const byTech: Record<MastrTech, number> = { solar: 0, wind: 0, biomass: 0, hydro: 0 };
  let totalCapacityKw = 0;
  for (const p of plants) {
    byTech[p.tech] += 1;
    totalCapacityKw += p.capacityKw;
  }
  return {
    total: plants.length,
    totalCapacityMw: Math.round(totalCapacityKw / 100) / 10,
    byTech,
  };
}

let cached: GenerateResult | null = null;
let cleanedOverride: ReadonlyArray<MastrPlant> | null = null;

export function setMastrCleanedOverride(plants: ReadonlyArray<MastrPlant> | null): void {
  cleanedOverride = plants;
}

export function getMastrData(): GenerateResult {
  if (!cached) cached = generateMastrPlants();
  if (cleanedOverride) {
    return { cleaned: cleanedOverride, raw: cached.raw };
  }
  return cached;
}

export function isMastrVariant(value: unknown): value is MastrVariant {
  return value === 'raw' || value === 'cleaned';
}
