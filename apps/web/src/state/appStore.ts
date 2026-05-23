import { create } from 'zustand';
import type { DatasetSlug } from '../data/datasets';
import { GERMANY_BBOX } from '../data/germany';

export type Bbox = [number, number, number, number];

export type FilterValue = string | number | boolean | null;
export type FiltersState = Record<string, FilterValue>;

export interface AppState {
  activeDataset: DatasetSlug | null;
  filters: FiltersState;
  bbox: Bbox;
  time: number | null;
  setActiveDataset: (slug: DatasetSlug | null) => void;
  setFilters: (next: FiltersState) => void;
  patchFilters: (patch: FiltersState) => void;
  setBbox: (bbox: Bbox) => void;
  setTime: (time: number | null) => void;
  reset: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  activeDataset: null,
  filters: {},
  bbox: GERMANY_BBOX,
  time: null,
  setActiveDataset: (slug) => set({ activeDataset: slug }),
  setFilters: (filters) => set({ filters }),
  patchFilters: (patch) => set((s) => ({ filters: { ...s.filters, ...patch } })),
  setBbox: (bbox) => set({ bbox }),
  setTime: (time) => set({ time }),
  reset: () => set({ activeDataset: null, filters: {}, bbox: GERMANY_BBOX, time: null }),
}));
