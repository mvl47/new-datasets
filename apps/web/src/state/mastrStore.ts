import { create } from 'zustand';
import type { MastrPlant } from '../data/mastrClean';

export type MastrStatus = 'idle' | 'loading' | 'loaded' | 'missing';

export interface MastrStoreState {
  plants: ReadonlyArray<MastrPlant> | null;
  status: MastrStatus;
  setPlants: (plants: ReadonlyArray<MastrPlant>) => void;
  markMissing: () => void;
  markLoading: () => void;
}

export const useMastrStore = create<MastrStoreState>((set) => ({
  plants: null,
  status: 'idle',
  setPlants: (plants) => set({ plants, status: 'loaded' }),
  markMissing: () => set({ plants: null, status: 'missing' }),
  markLoading: () => set({ status: 'loading' }),
}));
