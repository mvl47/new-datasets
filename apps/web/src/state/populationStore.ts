import { create } from 'zustand';
import type { BundeslandCode } from '../data/bundeslaender';

export interface RealPopulationData {
  years: ReadonlyArray<number>;
  byBundesland: Partial<Record<BundeslandCode, ReadonlyArray<number>>>;
}

export type PopulationStatus = 'idle' | 'loading' | 'loaded' | 'missing';

export interface PopulationStoreState {
  data: RealPopulationData | null;
  status: PopulationStatus;
  setData: (data: RealPopulationData) => void;
  markMissing: () => void;
  markLoading: () => void;
}

export const usePopulationStore = create<PopulationStoreState>((set) => ({
  data: null,
  status: 'idle',
  setData: (data) => set({ data, status: 'loaded' }),
  markMissing: () => set({ data: null, status: 'missing' }),
  markLoading: () => set({ status: 'loading' }),
}));
