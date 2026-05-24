import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { bundeslandFeature, findBundesland, setBundeslandGeometryOverrides } from './bundeslaender';
import { loadBoundaries, parseBoundariesFeatureCollection } from './loadBoundaries';
import { useBoundariesStore } from '../state/boundariesStore';

const SAMPLE_FC = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { code: 'BY', name: 'Bayern' },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [11, 49],
            [12, 49],
            [12, 50],
            [11, 50],
            [11, 49],
          ],
        ],
      },
    },
    {
      type: 'Feature',
      properties: { code: 'NI', name: 'Niedersachsen' },
      geometry: {
        type: 'MultiPolygon',
        coordinates: [
          [
            [
              [8, 52],
              [9, 52],
              [9, 53],
              [8, 53],
              [8, 52],
            ],
          ],
        ],
      },
    },
  ],
};

beforeEach(() => {
  setBundeslandGeometryOverrides(null);
  useBoundariesStore.setState({ overrides: null, status: 'idle' });
});

afterEach(() => {
  setBundeslandGeometryOverrides(null);
});

describe('parseBoundariesFeatureCollection', () => {
  it('keeps only features with known Bundesland codes and valid geometries', () => {
    const map = parseBoundariesFeatureCollection(SAMPLE_FC);
    expect(map).not.toBeNull();
    expect(map?.size).toBe(2);
    expect(map?.get('BY')?.type).toBe('Polygon');
    expect(map?.get('NI')?.type).toBe('MultiPolygon');
  });

  it('returns null for malformed input', () => {
    expect(parseBoundariesFeatureCollection(null)).toBeNull();
    expect(parseBoundariesFeatureCollection({})).toBeNull();
    expect(
      parseBoundariesFeatureCollection({ type: 'FeatureCollection', features: [] }),
    ).toBeNull();
  });

  it('drops features whose code is not a Bundesland', () => {
    const map = parseBoundariesFeatureCollection({
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: { code: 'ZZ' },
          geometry: { type: 'Polygon', coordinates: [] },
        },
      ],
    });
    expect(map).toBeNull();
  });
});

describe('bundeslandFeature with overrides', () => {
  it('returns the octagon by default', () => {
    const by = findBundesland('BY');
    if (!by) throw new Error('BY missing');
    const feature = bundeslandFeature(by);
    expect(feature.geometry.type).toBe('Polygon');
    expect(feature.geometry.coordinates[0]).toHaveLength(9);
  });

  it('returns the override geometry when set', () => {
    const overrides = parseBoundariesFeatureCollection(SAMPLE_FC);
    if (!overrides) throw new Error('parse failed');
    setBundeslandGeometryOverrides(overrides);
    const by = findBundesland('BY');
    if (!by) throw new Error('BY missing');
    const feature = bundeslandFeature(by);
    expect(feature.geometry.type).toBe('Polygon');
    expect(feature.geometry.coordinates[0]).toHaveLength(5);
  });
});

describe('loadBoundaries', () => {
  it('returns the map and sets store to loaded on success', async () => {
    const fetcher = vi.fn(async () =>
      new Response(JSON.stringify(SAMPLE_FC), { status: 200, headers: { 'content-type': 'application/json' } }),
    ) as unknown as typeof fetch;
    const result = await loadBoundaries('/data/bundeslaender.geojson', fetcher);
    expect(result?.size).toBe(2);
    expect(useBoundariesStore.getState().status).toBe('loaded');
  });

  it('marks store missing when the file is not deployed yet', async () => {
    const fetcher = vi.fn(async () => new Response('not found', { status: 404 })) as unknown as typeof fetch;
    const result = await loadBoundaries('/data/bundeslaender.geojson', fetcher);
    expect(result).toBeNull();
    expect(useBoundariesStore.getState().status).toBe('missing');
  });

  it('marks store missing when the network call rejects', async () => {
    const fetcher = vi.fn(async () => {
      throw new Error('network down');
    }) as unknown as typeof fetch;
    const result = await loadBoundaries('/data/bundeslaender.geojson', fetcher);
    expect(result).toBeNull();
    expect(useBoundariesStore.getState().status).toBe('missing');
  });
});
