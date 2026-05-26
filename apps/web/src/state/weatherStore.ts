import { create } from 'zustand';
import type { BundeslandClimate } from '../data/weather';
import type { BundeslandCode } from '../data/bundeslaender';

export type WeatherStatus = 'idle' | 'loading' | 'loaded' | 'missing';

export interface WeatherStoreState {
  data: Partial<Record<BundeslandCode, BundeslandClimate>> | null;
  status: WeatherStatus;
  setData: (data: Partial<Record<BundeslandCode, BundeslandClimate>>) => void;
  markMissing: () => void;
  markLoading: () => void;
}

export const useWeatherStore = create<WeatherStoreState>((set) => ({
  data: null,
  status: 'idle',
  setData: (data) => set({ data, status: 'loaded' }),
  markMissing: () => set({ data: null, status: 'missing' }),
  markLoading: () => set({ status: 'loading' }),
}));
