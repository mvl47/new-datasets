import { BUNDESLAENDER, type BundeslandCode } from './bundeslaender';

export type GhdGroup = 'TOTAL' | 'G' | 'I' | 'J' | 'M' | 'O' | 'Q';

export const GHD_GROUPS: ReadonlyArray<GhdGroup> = ['TOTAL', 'G', 'I', 'J', 'M', 'O', 'Q'];

export const GHD_NATIONAL_SHARE: Record<Exclude<GhdGroup, 'TOTAL'>, number> = {
  G: 0.27,
  I: 0.09,
  J: 0.11,
  M: 0.18,
  O: 0.15,
  Q: 0.20,
};

export interface ConsumptionGhdRecord {
  code: BundeslandCode;
  byGroup: Record<GhdGroup, number>;
}

const SERVICE_INTENSITY: Record<BundeslandCode, number> = {
  BW: 1.05,
  BY: 1.10,
  BE: 1.40,
  BB: 0.75,
  HB: 1.20,
  HH: 1.45,
  HE: 1.25,
  MV: 0.80,
  NI: 0.95,
  NW: 1.05,
  RP: 0.90,
  SL: 0.95,
  SN: 0.95,
  ST: 0.80,
  SH: 0.90,
  TH: 0.85,
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

export function generateGhdConsumption(seed = 9931): ReadonlyArray<ConsumptionGhdRecord> {
  const rng = mulberry32(seed);
  return BUNDESLAENDER.map((b) => {
    const baseGwh = b.populationK * 3.4 * SERVICE_INTENSITY[b.code];
    const total = baseGwh * (0.9 + rng() * 0.2);
    const byGroup: Record<GhdGroup, number> = { TOTAL: total } as Record<GhdGroup, number>;
    for (const [group, share] of Object.entries(GHD_NATIONAL_SHARE) as [
      Exclude<GhdGroup, 'TOTAL'>,
      number,
    ][]) {
      byGroup[group] = Math.round(total * share * (0.85 + rng() * 0.3));
    }
    byGroup.TOTAL = Math.round(total);
    return { code: b.code, byGroup };
  });
}

let cached: ReadonlyArray<ConsumptionGhdRecord> | null = null;

export function getGhdConsumption(): ReadonlyArray<ConsumptionGhdRecord> {
  if (!cached) cached = generateGhdConsumption();
  return cached;
}

export function isGhdGroup(value: unknown): value is GhdGroup {
  return typeof value === 'string' && (GHD_GROUPS as ReadonlyArray<string>).includes(value);
}

export function ghdValuesFor(
  records: ReadonlyArray<ConsumptionGhdRecord>,
  group: GhdGroup,
): Map<BundeslandCode, number> {
  const map = new Map<BundeslandCode, number>();
  for (const r of records) map.set(r.code, r.byGroup[group]);
  return map;
}

export function nationalGroupTotals(
  records: ReadonlyArray<ConsumptionGhdRecord>,
): Array<{ group: Exclude<GhdGroup, 'TOTAL'>; value: number }> {
  const out: Array<{ group: Exclude<GhdGroup, 'TOTAL'>; value: number }> = [];
  for (const group of Object.keys(GHD_NATIONAL_SHARE) as Array<Exclude<GhdGroup, 'TOTAL'>>) {
    let sum = 0;
    for (const r of records) sum += r.byGroup[group];
    out.push({ group, value: sum });
  }
  return out;
}
