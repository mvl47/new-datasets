import { describe, expect, it } from 'vitest';
import { aggregateWind, generateWindOnshore } from './potentialWindOnshore';

describe('potentialWindOnshore', () => {
  it('is deterministic and yields polygons + turbines', () => {
    const a = generateWindOnshore();
    const b = generateWindOnshore();
    expect(a).toEqual(b);
    expect(a.areas.length).toBeGreaterThan(0);
    expect(a.turbines.length).toBeGreaterThan(0);
    for (const area of a.areas) {
      expect(area.polygon).toHaveLength(5);
      expect(area.polygon[0]).toEqual(area.polygon[area.polygon.length - 1]);
    }
  });

  it('aggregateWind handles empty input', () => {
    const empty = aggregateWind([]);
    expect(empty.count).toBe(0);
    expect(empty.meanWindMs).toBe(0);
  });

  it('coastal Bundesländer (SH/NI/MV) dominate area count', () => {
    const { areas } = generateWindOnshore();
    const counts = new Map<string, number>();
    for (const a of areas) counts.set(a.bundesland, (counts.get(a.bundesland) ?? 0) + 1);
    const coastal = (counts.get('SH') ?? 0) + (counts.get('NI') ?? 0) + (counts.get('MV') ?? 0);
    const inland = (counts.get('SN') ?? 0) + (counts.get('TH') ?? 0);
    expect(coastal).toBeGreaterThan(inland);
  });

  it('respects custom counts', () => {
    const { areas, turbines } = generateWindOnshore({
      seed: 11,
      areaCount: 5,
      turbinesPerHotspot: 3,
    });
    expect(areas).toHaveLength(5);
    expect(turbines.length).toBe(3 * 9);
  });
});
