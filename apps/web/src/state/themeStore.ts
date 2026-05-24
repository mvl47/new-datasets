import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Theme = 'light' | 'dark';
export type Lang = 'de' | 'en';

interface ThemeState {
  theme: Theme;
  lang: Lang;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  setLang: (lang: Lang) => void;
  toggleLang: () => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: 'light',
      lang: 'de',
      setTheme: (theme) => set({ theme }),
      toggleTheme: () => set((s) => ({ theme: s.theme === 'light' ? 'dark' : 'light' })),
      setLang: (lang) => set({ lang }),
      toggleLang: () => set((s) => ({ lang: s.lang === 'de' ? 'en' : 'de' })),
    }),
    { name: 'ffe-theme' },
  ),
);
