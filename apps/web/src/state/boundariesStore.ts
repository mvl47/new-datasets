import { create } from 'zustand';
import type { BundeslandCode } from '../data/bundeslaender';

export type PolygonRings = [number, number][][];
export type BoundaryGeometry =
  | { type: 'Polygon'; coordinates: PolygonRings }
  | { type: 'MultiPolygon'; coordinates: PolygonRings[] };

export type BoundariesMap = Map<BundeslandCode, BoundaryGeometry>;

export type BoundariesStatus = 'idle' | 'loading' | 'loaded' | 'missing';

export interface BoundariesState {
  overrides: BoundariesMap | null;
  status: BoundariesStatus;
  setOverrides: (overrides: BoundariesMap) => void;
  markMissing: () => void;
  markLoading: () => void;
}

export const useBoundariesStore = create<BoundariesState>((set) => ({
  overrides: null,
  status: 'idle',
  setOverrides: (overrides) => set({ overrides, status: 'loaded' }),
  markMissing: () => set({ overrides: null, status: 'missing' }),
  markLoading: () => set({ status: 'loading' }),
}));
