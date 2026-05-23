import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { findDatasetBySlug, isDatasetSlug } from '../data/datasets';
import { useAppStore } from '../state/appStore';

function DatasetView() {
  const { t } = useTranslation();
  const { slug } = useParams();
  const setActiveDataset = useAppStore((s) => s.setActiveDataset);

  const validSlug = slug && isDatasetSlug(slug) ? slug : null;

  useEffect(() => {
    setActiveDataset(validSlug);
    return () => setActiveDataset(null);
  }, [validSlug, setActiveDataset]);

  if (!validSlug) {
    return (
      <div className="pointer-events-auto absolute right-4 top-4 max-w-sm rounded-lg bg-white/95 p-4 text-sm shadow-lg ring-1 ring-slate-200 dark:bg-slate-900/95 dark:text-slate-100 dark:ring-slate-700">
        <h2 className="font-semibold">{t('notFound.title')}</h2>
        <p className="mt-1 text-slate-600 dark:text-slate-300">{t('notFound.message')}</p>
      </div>
    );
  }

  const meta = findDatasetBySlug(validSlug);
  if (!meta) return null;

  return (
    <div className="pointer-events-auto absolute right-4 top-4 max-w-sm rounded-lg bg-white/95 p-4 shadow-lg ring-1 ring-slate-200 dark:bg-slate-900/95 dark:text-slate-100 dark:ring-slate-700">
      <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
        {t('view.datasetName')}
      </p>
      <h2 className="text-base font-semibold">{t(meta.i18nKey)}</h2>
      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
        {t('view.vizType')}: {t(`viz.${meta.viz}`)}
      </p>
      <p className="mt-3 text-xs italic text-slate-500 dark:text-slate-400">
        {t('view.phase0Notice')}
      </p>
    </div>
  );
}

export default DatasetView;
