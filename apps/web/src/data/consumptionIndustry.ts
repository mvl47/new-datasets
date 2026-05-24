import { BUNDESLAENDER, type BundeslandCode } from './bundeslaender';

export type WzSection = 'TOTAL' | 'C' | 'F' | 'G' | 'H' | 'I' | 'M';

export const WZ_SECTIONS: ReadonlyArray<WzSection> = ['TOTAL', 'C', 'F', 'G', 'H', 'I', 'M'];

export interface ConsumptionIndustryRecord {
  code: BundeslandCode;
  bySection: Record<WzSection, number>;
}

const INDUSTRY_INTENSITY: Record<BundeslandCode, number> = {
  BW: 1.15,
  BY: 1.05,
  BE: 0.45,
  BB: 0.70,
  HB: 0.95,
  HH: 0.80,
  HE: 0.95,
  MV: 0.55,
  NI: 0.95,
  NW: 1.30,
  RP: 0.95,
  SL: 1.10,
  SN: 0.90,
  ST: 1.00,
  SH: 0.65,
  TH: 0.80,
};

const SECTION_SHARES: Record<Exclude<WzSection, 'TOTAL'>, number> = {
  C: 0.62,
  F: 0.06,
  G: 0.12,
  H: 0.08,
  I: 0.04,
  M: 0.08,
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

export function generateIndustryConsumption(seed = 4711): ReadonlyArray<ConsumptionIndustryRecord> {
  const rng = mulberry32(seed);
  return BUNDESLAENDER.map((b) => {
    const baseGwh = b.populationK * 6 * INDUSTRY_INTENSITY[b.code];
    const total = baseGwh * (0.92 + rng() * 0.16);
    const bySection: Record<WzSection, number> = { TOTAL: total } as Record<WzSection, number>;
    for (const [section, share] of Object.entries(SECTION_SHARES) as [
      Exclude<WzSection, 'TOTAL'>,
      number,
    ][]) {
      bySection[section] = Math.round(total * share * (0.85 + rng() * 0.3));
    }
    bySection.TOTAL = Math.round(total);
    return { code: b.code, bySection };
  });
}

let cached: ReadonlyArray<ConsumptionIndustryRecord> | null = null;

export function getIndustryConsumption(): ReadonlyArray<ConsumptionIndustryRecord> {
  if (!cached) cached = generateIndustryConsumption();
  return cached;
}

export function isWzSection(value: unknown): value is WzSection {
  return typeof value === 'string' && (WZ_SECTIONS as ReadonlyArray<string>).includes(value);
}

export function valuesFor(
  records: ReadonlyArray<ConsumptionIndustryRecord>,
  section: WzSection,
): Map<BundeslandCode, number> {
  const map = new Map<BundeslandCode, number>();
  for (const r of records) map.set(r.code, r.bySection[section]);
  return map;
}

export function domainFor(values: Map<BundeslandCode, number>): [number, number] {
  let lo = Infinity;
  let hi = -Infinity;
  for (const v of values.values()) {
    if (v < lo) lo = v;
    if (v > hi) hi = v;
  }
  if (!Number.isFinite(lo)) return [0, 1];
  return [lo, hi];
}
