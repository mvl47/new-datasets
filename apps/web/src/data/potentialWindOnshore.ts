import { type BundeslandCode } from './bundeslaender';

export interface WindArea {
  id: string;
  bundesland: BundeslandCode;
  polygon: [number, number][];
  centroid: [number, number];
  areaKm2: number;
  capacityMw: number;
  meanWindMs: number;
}

export interface WindTurbine {
  id: string;
  lon: number;
  lat: number;
  capacityKw: number;
  hubHeightM: number;
  bundesland: BundeslandCode;
}

const WIND_HOTSPOTS: ReadonlyArray<{
  lon: number;
  lat: number;
  spread: number;
  bundesland: BundeslandCode;
  weight: number;
  meanWindMs: number;
}> = [
  { lon: 9.7, lat: 54.4, spread: 0.9, bundesland: 'SH', weight: 14, meanWindMs: 8.2 },
  { lon: 9.0, lat: 53.2, spread: 1.2, bundesland: 'NI', weight: 13, meanWindMs: 7.8 },
  { lon: 12.5, lat: 53.8, spread: 1.0, bundesland: 'MV', weight: 10, meanWindMs: 7.6 },
  { lon: 13.4, lat: 52.4, spread: 0.9, bundesland: 'BB', weight: 9, meanWindMs: 7.0 },
  { lon: 11.5, lat: 51.9, spread: 0.7, bundesland: 'ST', weight: 8, meanWindMs: 7.0 },
  { lon: 7.5, lat: 51.5, spread: 0.7, bundesland: 'NW', weight: 6, meanWindMs: 6.4 },
  { lon: 9.0, lat: 50.7, spread: 0.7, bundesland: 'HE', weight: 5, meanWindMs: 6.4 },
  { lon: 11.0, lat: 50.9, spread: 0.7, bundesland: 'TH', weight: 4, meanWindMs: 6.3 },
  { lon: 13.1, lat: 51.2, spread: 0.6, bundesland: 'SN', weight: 3, meanWindMs: 6.0 },
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
  const cos = Math.cos(rotationRad);
  const sin = Math.sin(rotationRad);
  const ring: [number, number][] = half.map((p) => [
    lon + p[0] * cos - p[1] * sin,
    lat + p[0] * sin + p[1] * cos,
  ]);
  ring.push(ring[0] as [number, number]);
  return ring;
}

export interface GenerateWindOptions {
  seed?: number;
  areaCount?: number;
  turbinesPerHotspot?: number;
}

export interface WindOnshoreData {
  areas: ReadonlyArray<WindArea>;
  turbines: ReadonlyArray<WindTurbine>;
}

export function generateWindOnshore(options: GenerateWindOptions = {}): WindOnshoreData {
  const { seed = 3140, areaCount = 50, turbinesPerHotspot = 38 } = options;
  const rng = mulberry32(seed);
  const totalWeight = WIND_HOTSPOTS.reduce((s, h) => s + h.weight, 0);

  const areas: WindArea[] = [];
  for (let i = 0; i < areaCount; i++) {
    let r = rng() * totalWeight;
    let hotspot = WIND_HOTSPOTS[0];
    for (const h of WIND_HOTSPOTS) {
      r -= h.weight;
      if (r <= 0) {
        hotspot = h;
        break;
      }
    }
    if (!hotspot) continue;
    const lon = hotspot.lon + (rng() - 0.5) * hotspot.spread;
    const lat = hotspot.lat + (rng() - 0.5) * hotspot.spread;
    const widthDeg = 0.04 + rng() * 0.1;
    const heightDeg = 0.03 + rng() * 0.08;
    const polygon = makePolygon(lon, lat, widthDeg, heightDeg, rng() * Math.PI);
    const areaKm2 = Math.round(widthDeg * heightDeg * 12000) / 1;
    const capacityMw = Math.round(areaKm2 * (2 + rng() * 3));
    areas.push({
      id: `w-${i.toString().padStart(4, '0')}`,
      bundesland: hotspot.bundesland,
      polygon,
      centroid: [lon, lat],
      areaKm2,
      capacityMw,
      meanWindMs: hotspot.meanWindMs + (rng() - 0.5) * 0.4,
    });
  }

  const turbines: WindTurbine[] = [];
  for (const h of WIND_HOTSPOTS) {
    for (let i = 0; i < turbinesPerHotspot; i++) {
      turbines.push({
        id: `t-${h.bundesland}-${i}`,
        lon: h.lon + (rng() - 0.5) * h.spread * 1.4,
        lat: h.lat + (rng() - 0.5) * h.spread * 1.4,
        capacityKw: Math.round(2500 + rng() * 4000),
        hubHeightM: Math.round(120 + rng() * 60),
        bundesland: h.bundesland,
      });
    }
  }

  return { areas, turbines };
}

let cached: WindOnshoreData | null = null;

export function getWindOnshore(): WindOnshoreData {
  if (!cached) cached = generateWindOnshore();
  return cached;
}

export function aggregateWind(areas: ReadonlyArray<WindArea>): {
  count: number;
  totalCapacityMw: number;
  totalAreaKm2: number;
  meanWindMs: number;
} {
  if (areas.length === 0) {
    return { count: 0, totalCapacityMw: 0, totalAreaKm2: 0, meanWindMs: 0 };
  }
  let cap = 0;
  let area = 0;
  let wind = 0;
  for (const a of areas) {
    cap += a.capacityMw;
    area += a.areaKm2;
    wind += a.meanWindMs;
  }
  return {
    count: areas.length,
    totalCapacityMw: cap,
    totalAreaKm2: Math.round(area * 10) / 10,
    meanWindMs: Math.round((wind / areas.length) * 10) / 10,
  };
}
