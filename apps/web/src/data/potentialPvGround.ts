import { BUNDESLAENDER, type BundeslandCode } from './bundeslaender';

export interface PvSite {
  id: string;
  bundesland: BundeslandCode;
  polygon: [number, number][];
  centroid: [number, number];
  areaHa: number;
  capacityMwp: number;
  yieldGwh: number;
  suitability: number;
}

const PV_HOTSPOTS: ReadonlyArray<{
  lon: number;
  lat: number;
  spread: number;
  bundesland: BundeslandCode;
  weight: number;
}> = [
  { lon: 13.3, lat: 52.05, spread: 1.4, bundesland: 'BB', weight: 12 },
  { lon: 12.8, lat: 53.4, spread: 1.0, bundesland: 'MV', weight: 8 },
  { lon: 11.8, lat: 49.3, spread: 1.3, bundesland: 'BY', weight: 14 },
  { lon: 12.6, lat: 50.9, spread: 0.8, bundesland: 'SN', weight: 6 },
  { lon: 11.7, lat: 51.7, spread: 0.7, bundesland: 'ST', weight: 6 },
  { lon: 9.2, lat: 48.6, spread: 0.9, bundesland: 'BW', weight: 8 },
  { lon: 11.1, lat: 50.7, spread: 0.7, bundesland: 'TH', weight: 5 },
  { lon: 9.4, lat: 52.6, spread: 1.0, bundesland: 'NI', weight: 6 },
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

function rotate(p: [number, number], angle: number): [number, number] {
  return [p[0] * Math.cos(angle) - p[1] * Math.sin(angle), p[0] * Math.sin(angle) + p[1] * Math.cos(angle)];
}

function makePolygon(
  lon: number,
  lat: number,
  widthDeg: number,
  heightDeg: number,
  rotationRad: number,
): [number, number][] {
  const half = [
    [-widthDeg / 2, -heightDeg / 2],
    [widthDeg / 2, -heightDeg / 2],
    [widthDeg / 2, heightDeg / 2],
    [-widthDeg / 2, heightDeg / 2],
  ] as const;
  const ring: [number, number][] = half.map((p) => {
    const r = rotate([p[0], p[1]], rotationRad);
    return [lon + r[0], lat + r[1]];
  });
  ring.push(ring[0] as [number, number]);
  return ring;
}

export interface GeneratePvOptions {
  seed?: number;
  count?: number;
}

export function generatePvSites(options: GeneratePvOptions = {}): ReadonlyArray<PvSite> {
  const { seed = 6105, count = 64 } = options;
  const rng = mulberry32(seed);
  const totalWeight = PV_HOTSPOTS.reduce((s, h) => s + h.weight, 0);

  const sites: PvSite[] = [];
  for (let i = 0; i < count; i++) {
    let r = rng() * totalWeight;
    let hotspot = PV_HOTSPOTS[0];
    for (const h of PV_HOTSPOTS) {
      r -= h.weight;
      if (r <= 0) {
        hotspot = h;
        break;
      }
    }
    if (!hotspot) continue;
    const lon = hotspot.lon + (rng() - 0.5) * hotspot.spread;
    const lat = hotspot.lat + (rng() - 0.5) * hotspot.spread;
    const widthDeg = 0.025 + rng() * 0.08;
    const heightDeg = 0.018 + rng() * 0.06;
    const polygon = makePolygon(lon, lat, widthDeg, heightDeg, rng() * Math.PI);
    const areaHa = widthDeg * heightDeg * 12000;
    const capacityMwp = Math.round(areaHa * (0.7 + rng() * 0.6));
    const yieldGwh = Math.round(capacityMwp * (0.95 + rng() * 0.25));
    const suitability = Math.round(50 + rng() * 50);
    sites.push({
      id: `pv-${i.toString().padStart(4, '0')}`,
      bundesland: hotspot.bundesland,
      polygon,
      centroid: [lon, lat],
      areaHa: Math.round(areaHa),
      capacityMwp,
      yieldGwh,
      suitability,
    });
  }
  return sites;
}

let cached: ReadonlyArray<PvSite> | null = null;

export function getPvSites(): ReadonlyArray<PvSite> {
  if (!cached) cached = generatePvSites();
  return cached;
}

export interface PvAggregate {
  count: number;
  totalCapacityMwp: number;
  totalYieldGwh: number;
  totalAreaHa: number;
}

export function aggregatePv(sites: ReadonlyArray<PvSite>): PvAggregate {
  let totalCapacityMwp = 0;
  let totalYieldGwh = 0;
  let totalAreaHa = 0;
  for (const s of sites) {
    totalCapacityMwp += s.capacityMwp;
    totalYieldGwh += s.yieldGwh;
    totalAreaHa += s.areaHa;
  }
  return {
    count: sites.length,
    totalCapacityMwp,
    totalYieldGwh,
    totalAreaHa,
  };
}

export function byBundesland(
  sites: ReadonlyArray<PvSite>,
): Map<BundeslandCode, { count: number; capacityMwp: number }> {
  const m = new Map<BundeslandCode, { count: number; capacityMwp: number }>();
  for (const b of BUNDESLAENDER) m.set(b.code, { count: 0, capacityMwp: 0 });
  for (const s of sites) {
    const entry = m.get(s.bundesland);
    if (!entry) continue;
    entry.count += 1;
    entry.capacityMwp += s.capacityMwp;
  }
  return m;
}
