import { useTranslation } from 'react-i18next';
import { useThemeStore } from '../state/themeStore';

function Header() {
  const { t } = useTranslation();
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);
  const toggleLang = useThemeStore((s) => s.toggleLang);

  return (
    <header className="flex shrink-0 items-center gap-3 border-b border-slate-200 bg-white/90 px-4 py-2 backdrop-blur dark:border-slate-800 dark:bg-slate-900/90">
      <div className="text-sm font-semibold text-slate-700 dark:text-slate-200">
        {t('app.title')}
      </div>
      <input
        type="search"
        placeholder={t('app.search')}
        className="ml-4 w-72 rounded-md border border-slate-200 bg-white px-3 py-1 text-sm shadow-sm focus:border-slate-400 focus:outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
        disabled
        aria-label={t('app.search')}
      />
      <div className="ml-auto flex items-center gap-2">
        <button
          type="button"
          disabled
          className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          {t('app.layers')}
        </button>
        <button
          type="button"
          disabled
          className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          {t('app.export')}
        </button>
        <button
          type="button"
          onClick={toggleLang}
          aria-label={`Switch to ${t('app.lang.switch')}`}
          className="rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          {t('app.lang.current')}
        </button>
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={theme === 'light' ? t('app.theme.dark') : t('app.theme.light')}
          className="rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
        >
          {theme === 'light' ? t('app.theme.dark') : t('app.theme.light')}
        </button>
      </div>
    </header>
  );
}

export default Header;
