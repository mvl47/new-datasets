import { useTranslation } from 'react-i18next';

function NotFound() {
  const { t } = useTranslation();
  return (
    <div className="pointer-events-auto absolute right-4 top-4 max-w-sm rounded-lg bg-white/95 p-4 shadow-lg ring-1 ring-slate-200 dark:bg-slate-900/95 dark:text-slate-100 dark:ring-slate-700">
      <h2 className="font-semibold">{t('notFound.title')}</h2>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{t('notFound.message')}</p>
    </div>
  );
}

export default NotFound;
