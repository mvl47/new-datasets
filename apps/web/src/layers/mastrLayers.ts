import { ScatterplotLayer } from 'deck.gl';
import { MASTR_TECH_COLORS, type MastrPlant, type MastrVariant } from '../data/mastrClean';

export function buildMastrScatterLayer(
  plants: ReadonlyArray<MastrPlant>,
  variant: MastrVariant,
): ScatterplotLayer<MastrPlant> {
  return new ScatterplotLayer<MastrPlant>({
    id: `mastr-clean-${variant}`,
    data: plants as MastrPlant[],
    pickable: true,
    stroked: true,
    filled: true,
    opacity: 0.85,
    lineWidthMinPixels: 0.5,
    radiusUnits: 'pixels',
    radiusMinPixels: 3,
    radiusMaxPixels: 12,
    getPosition: (d: MastrPlant) => [d.lon, d.lat],
    getRadius: (d: MastrPlant) => Math.max(3, Math.min(12, Math.sqrt(d.capacityKw) * 0.35)),
    getFillColor: (d: MastrPlant) => MASTR_TECH_COLORS[d.tech],
    getLineColor: [15, 23, 42],
  });
}
