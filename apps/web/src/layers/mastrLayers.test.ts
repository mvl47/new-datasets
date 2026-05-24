import { describe, expect, it } from 'vitest';
import { generateMastrPlants } from '../data/mastrClean';
import { buildMastrScatterLayer } from './mastrLayers';

describe('buildMastrScatterLayer', () => {
  it('builds a layer for the cleaned variant with all plants', () => {
    const { cleaned } = generateMastrPlants({
      seed: 1,
      cleanedCount: 25,
      duplicateCount: 0,
      outlierCount: 0,
    });
    const layer = buildMastrScatterLayer(cleaned, 'cleaned');
    expect(layer.id).toBe('mastr-clean-cleaned');
    expect(layer.props.data).toHaveLength(25);
    expect(layer.props.pickable).toBe(true);
  });

  it('uses a different layer id and includes raw duplicates', () => {
    const { raw } = generateMastrPlants({
      seed: 1,
      cleanedCount: 25,
      duplicateCount: 3,
      outlierCount: 0,
    });
    const layer = buildMastrScatterLayer(raw, 'raw');
    expect(layer.id).toBe('mastr-clean-raw');
    expect(layer.props.data).toHaveLength(28);
  });
});
