export type BundeslandCode =
  | 'BW'
  | 'BY'
  | 'BE'
  | 'BB'
  | 'HB'
  | 'HH'
  | 'HE'
  | 'MV'
  | 'NI'
  | 'NW'
  | 'RP'
  | 'SL'
  | 'SN'
  | 'ST'
  | 'SH'
  | 'TH';

export interface Bundesland {
  code: BundeslandCode;
  nameDe: string;
  nameEn: string;
  centroid: [number, number];
  areaKm2: number;
  populationK: number;
}

export const BUNDESLAENDER: ReadonlyArray<Bundesland> = [
  { code: 'BW', nameDe: 'Baden-Württemberg', nameEn: 'Baden-Württemberg', centroid: [9.04, 48.66], areaKm2: 35752, populationK: 11280 },
  { code: 'BY', nameDe: 'Bayern', nameEn: 'Bavaria', centroid: [11.50, 49.01], areaKm2: 70550, populationK: 13370 },
  { code: 'BE', nameDe: 'Berlin', nameEn: 'Berlin', centroid: [13.41, 52.52], areaKm2: 891, populationK: 3677 },
  { code: 'BB', nameDe: 'Brandenburg', nameEn: 'Brandenburg', centroid: [13.40, 52.05], areaKm2: 29654, populationK: 2573 },
  { code: 'HB', nameDe: 'Bremen', nameEn: 'Bremen', centroid: [8.79, 53.10], areaKm2: 419, populationK: 685 },
  { code: 'HH', nameDe: 'Hamburg', nameEn: 'Hamburg', centroid: [10.01, 53.55], areaKm2: 755, populationK: 1893 },
  { code: 'HE', nameDe: 'Hessen', nameEn: 'Hesse', centroid: [9.16, 50.65], areaKm2: 21115, populationK: 6391 },
  { code: 'MV', nameDe: 'Mecklenburg-Vorpommern', nameEn: 'Mecklenburg-Vorpommern', centroid: [12.50, 53.70], areaKm2: 23295, populationK: 1611 },
  { code: 'NI', nameDe: 'Niedersachsen', nameEn: 'Lower Saxony', centroid: [9.30, 52.70], areaKm2: 47710, populationK: 8141 },
  { code: 'NW', nameDe: 'Nordrhein-Westfalen', nameEn: 'North Rhine-Westphalia', centroid: [7.50, 51.40], areaKm2: 34112, populationK: 17926 },
  { code: 'RP', nameDe: 'Rheinland-Pfalz', nameEn: 'Rhineland-Palatinate', centroid: [7.45, 49.95], areaKm2: 19858, populationK: 4131 },
  { code: 'SL', nameDe: 'Saarland', nameEn: 'Saarland', centroid: [6.85, 49.40], areaKm2: 2570, populationK: 982 },
  { code: 'SN', nameDe: 'Sachsen', nameEn: 'Saxony', centroid: [13.20, 51.05], areaKm2: 18450, populationK: 4072 },
  { code: 'ST', nameDe: 'Sachsen-Anhalt', nameEn: 'Saxony-Anhalt', centroid: [11.70, 51.95], areaKm2: 20454, populationK: 2169 },
  { code: 'SH', nameDe: 'Schleswig-Holstein', nameEn: 'Schleswig-Holstein', centroid: [9.80, 54.25], areaKm2: 15804, populationK: 2933 },
  { code: 'TH', nameDe: 'Thüringen', nameEn: 'Thuringia', centroid: [11.05, 50.85], areaKm2: 16202, populationK: 2120 },
];

const SCALE = 0.0033;
const MIN_RADIUS = 0.22;
const MAX_RADIUS = 1.35;

function octagonAt(lon: number, lat: number, radius: number): [number, number][] {
  const latCorrection = Math.cos((lat * Math.PI) / 180);
  const coords: [number, number][] = [];
  for (let i = 0; i < 8; i++) {
    const angle = (i / 8) * 2 * Math.PI;
    coords.push([lon + (Math.cos(angle) * radius) / latCorrection, lat + Math.sin(angle) * radius]);
  }
  coords.push(coords[0] as [number, number]);
  return coords;
}

export interface BundeslandFeature {
  type: 'Feature';
  properties: { code: BundeslandCode; nameDe: string; nameEn: string };
  geometry: { type: 'Polygon'; coordinates: [number, number][][] };
}

export function bundeslandFeature(b: Bundesland): BundeslandFeature {
  const radius = Math.min(MAX_RADIUS, Math.max(MIN_RADIUS, Math.sqrt(b.areaKm2) * SCALE));
  return {
    type: 'Feature',
    properties: { code: b.code, nameDe: b.nameDe, nameEn: b.nameEn },
    geometry: {
      type: 'Polygon',
      coordinates: [octagonAt(b.centroid[0], b.centroid[1], radius)],
    },
  };
}

export function findBundesland(code: BundeslandCode): Bundesland | undefined {
  return BUNDESLAENDER.find((b) => b.code === code);
}
