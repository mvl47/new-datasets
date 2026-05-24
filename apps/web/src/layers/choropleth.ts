import { GeoJsonLayer } from 'deck.gl';
import { BUNDESLAENDER, bundeslandFeature, type BundeslandCode } from '../data/bundeslaender';
import { makeLinearScale, type ColorStop, type RGB } from './colorScale';

export interface ChoroplethFeatureProps {
  code: BundeslandCode;
  nameDe: string;
  nameEn: string;
  value: number;
}

export interface ChoroplethFeature {
  type: 'Feature';
  properties: ChoroplethFeatureProps;
  geometry: { type: 'Polygon'; coordinates: [number, number][][] };
}

export interface ChoroplethFeatureCollection {
  type: 'FeatureCollection';
  features: ChoroplethFeature[];
}

export function buildChoroplethFeatures(
  values: Map<BundeslandCode, number>,
): ChoroplethFeatureCollection {
  const features = BUNDESLAENDER.map((b): ChoroplethFeature => {
    const base = bundeslandFeature(b);
    return {
      type: 'Feature',
      properties: { ...base.properties, value: values.get(b.code) ?? 0 },
      geometry: base.geometry,
    };
  });
  return { type: 'FeatureCollection', features };
}

export interface ChoroplethLayerOptions {
  id: string;
  values: Map<BundeslandCode, number>;
  stops: ReadonlyArray<ColorStop>;
  domain: [number, number];
  opacity?: number;
  highlightedCode?: BundeslandCode | null;
  onSelect?: (code: BundeslandCode) => void;
}

export function buildChoroplethLayer({
  id,
  values,
  stops,
  domain,
  opacity = 0.8,
  highlightedCode = null,
  onSelect,
}: ChoroplethLayerOptions): GeoJsonLayer<ChoroplethFeatureProps> {
  const fc = buildChoroplethFeatures(values);
  const scale = makeLinearScale(stops, domain);
  return new GeoJsonLayer<ChoroplethFeatureProps>({
    id,
    data: fc,
    pickable: true,
    filled: true,
    stroked: true,
    opacity,
    lineWidthUnits: 'pixels',
    lineWidthMinPixels: 1,
    getLineWidth: (f) =>
      (f.properties as ChoroplethFeatureProps).code === highlightedCode ? 3 : 1,
    getFillColor: (f): RGB => scale((f.properties as ChoroplethFeatureProps).value),
    getLineColor: (f) =>
      (f.properties as ChoroplethFeatureProps).code === highlightedCode
        ? [245, 158, 11, 255]
        : [15, 23, 42, 220],
    updateTriggers: {
      getLineWidth: [highlightedCode],
      getLineColor: [highlightedCode],
    },
    onClick: onSelect
      ? (info) => {
          const code = (info.object?.properties as ChoroplethFeatureProps | undefined)?.code;
          if (code) onSelect(code);
        }
      : undefined,
  });
}
