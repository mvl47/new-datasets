import { describe, expect, it } from 'vitest';
import { BUNDESLAENDER, bundeslandFeature, findBundesland } from './bundeslaender';

describe('bundeslaender', () => {
  it('covers exactly 16 Bundesländer with unique codes', () => {
    expect(BUNDESLAENDER).toHaveLength(16);
    const codes = new Set(BUNDESLAENDER.map((b) => b.code));
    expect(codes.size).toBe(16);
  });

  it('lookup returns null-safe data', () => {
    expect(findBundesland('BY')?.nameDe).toBe('Bayern');
    expect(findBundesland('SH')?.populationK).toBeGreaterThan(0);
  });

  it('bundeslandFeature produces an 8-vertex closed polygon at the centroid', () => {
    const by = BUNDESLAENDER.find((b) => b.code === 'BY');
    if (!by) throw new Error('BY missing');
    const f = bundeslandFeature(by);
    if (f.geometry.type !== 'Polygon') throw new Error('expected Polygon');
    const ring = f.geometry.coordinates[0];
    if (!ring) throw new Error('ring missing');
    expect(ring).toHaveLength(9);
    expect(ring[0]).toEqual(ring[ring.length - 1]);
  });

  it('larger Bundesländer get larger polygons than small ones', () => {
    const by = BUNDESLAENDER.find((b) => b.code === 'BY');
    const be = BUNDESLAENDER.find((b) => b.code === 'BE');
    if (!by || !be) throw new Error('missing fixture');
    const geomBy = bundeslandFeature(by).geometry;
    const geomBe = bundeslandFeature(be).geometry;
    if (geomBy.type !== 'Polygon' || geomBe.type !== 'Polygon') {
      throw new Error('expected Polygons');
    }
    const v0By = geomBy.coordinates[0]?.[0];
    const v0Be = geomBe.coordinates[0]?.[0];
    if (!v0By || !v0Be) throw new Error('missing vertex');
    const spanBy = Math.abs(v0By[0] - by.centroid[0]);
    const spanBe = Math.abs(v0Be[0] - be.centroid[0]);
    expect(spanBy).toBeGreaterThan(spanBe);
  });
});
