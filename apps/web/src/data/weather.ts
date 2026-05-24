import { BUNDESLAENDER, type BundeslandCode } from './bundeslaender';

export const MONTHS = 12;

export type WeatherMetric = 'temperature' | 'precipitation';

export const WEATHER_METRICS: ReadonlyArray<WeatherMetric> = ['temperature', 'precipitation'];

interface ClimateProfile {
  meanTempC: number;
  amplitudeC: number;
  annualPrecipMm: number;
  precipSeasonality: number;
  precipPhaseShift: number;
}

const PROFILE: Record<BundeslandCode, ClimateProfile> = {
  BW: { meanTempC: 9.8, amplitudeC: 9.0, annualPrecipMm: 920, precipSeasonality: 0.25, precipPhaseShift: 0 },
  BY: { meanTempC: 8.8, amplitudeC: 9.5, annualPrecipMm: 940, precipSeasonality: 0.35, precipPhaseShift: 0.5 },
  BE: { meanTempC: 10.2, amplitudeC: 9.7, annualPrecipMm: 580, precipSeasonality: 0.30, precipPhaseShift: 0.2 },
  BB: { meanTempC: 10.0, amplitudeC: 9.5, annualPrecipMm: 590, precipSeasonality: 0.32, precipPhaseShift: 0.2 },
  HB: { meanTempC: 10.0, amplitudeC: 7.5, annualPrecipMm: 760, precipSeasonality: 0.12, precipPhaseShift: -0.4 },
  HH: { meanTempC: 10.0, amplitudeC: 7.4, annualPrecipMm: 800, precipSeasonality: 0.12, precipPhaseShift: -0.4 },
  HE: { meanTempC: 9.7, amplitudeC: 8.6, annualPrecipMm: 820, precipSeasonality: 0.22, precipPhaseShift: 0.1 },
  MV: { meanTempC: 9.0, amplitudeC: 8.4, annualPrecipMm: 620, precipSeasonality: 0.20, precipPhaseShift: -0.2 },
  NI: { meanTempC: 9.5, amplitudeC: 8.0, annualPrecipMm: 750, precipSeasonality: 0.15, precipPhaseShift: -0.2 },
  NW: { meanTempC: 10.2, amplitudeC: 7.8, annualPrecipMm: 870, precipSeasonality: 0.18, precipPhaseShift: -0.1 },
  RP: { meanTempC: 10.0, amplitudeC: 8.6, annualPrecipMm: 800, precipSeasonality: 0.20, precipPhaseShift: 0 },
  SL: { meanTempC: 10.1, amplitudeC: 8.4, annualPrecipMm: 880, precipSeasonality: 0.18, precipPhaseShift: 0 },
  SN: { meanTempC: 9.4, amplitudeC: 9.2, annualPrecipMm: 700, precipSeasonality: 0.30, precipPhaseShift: 0.3 },
  ST: { meanTempC: 9.7, amplitudeC: 9.0, annualPrecipMm: 580, precipSeasonality: 0.28, precipPhaseShift: 0.2 },
  SH: { meanTempC: 9.0, amplitudeC: 7.2, annualPrecipMm: 830, precipSeasonality: 0.12, precipPhaseShift: -0.5 },
  TH: { meanTempC: 9.2, amplitudeC: 9.0, annualPrecipMm: 690, precipSeasonality: 0.28, precipPhaseShift: 0.2 },
};

export interface MonthlyClimate {
  tempC: number;
  precipMm: number;
}

export interface BundeslandClimate {
  monthly: ReadonlyArray<MonthlyClimate>;
  meanTempC: number;
  annualPrecipMm: number;
}

let cached: Record<BundeslandCode, BundeslandClimate> | null = null;

export function getWeather(): Record<BundeslandCode, BundeslandClimate> {
  if (cached) return cached;
  const out = {} as Record<BundeslandCode, BundeslandClimate>;
  for (const b of BUNDESLAENDER) {
    const p = PROFILE[b.code];
    const monthly: MonthlyClimate[] = [];
    let precipSum = 0;
    for (let m = 0; m < MONTHS; m++) {
      const tempC =
        p.meanTempC + p.amplitudeC * Math.sin((2 * Math.PI * (m - 3.25)) / MONTHS);
      const seasonal =
        1 + p.precipSeasonality * Math.sin((2 * Math.PI * (m - 3 + p.precipPhaseShift)) / MONTHS);
      const precipMm = Math.round((p.annualPrecipMm / 12) * seasonal);
      monthly.push({ tempC: Math.round(tempC * 10) / 10, precipMm });
      precipSum += precipMm;
    }
    out[b.code] = {
      monthly,
      meanTempC: Math.round(p.meanTempC * 10) / 10,
      annualPrecipMm: precipSum,
    };
  }
  cached = out;
  return out;
}

export function isWeatherMetric(value: unknown): value is WeatherMetric {
  return value === 'temperature' || value === 'precipitation';
}

export function valuesForMetric(
  data: Record<BundeslandCode, BundeslandClimate>,
  metric: WeatherMetric,
): Map<BundeslandCode, number> {
  const m = new Map<BundeslandCode, number>();
  for (const b of BUNDESLAENDER) {
    const climate = data[b.code];
    m.set(b.code, metric === 'temperature' ? climate.meanTempC : climate.annualPrecipMm);
  }
  return m;
}
