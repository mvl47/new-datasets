import { lazy, Suspense, useEffect } from 'react';
import type { ComponentType, LazyExoticComponent } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  findDatasetBySlug,
  isDatasetSlug,
  type DatasetMeta,
  type DatasetSlug,
} from '../data/datasets';
import { useAppStore } from '../state/appStore';

type LazyView = LazyExoticComponent<ComponentType>;

const VIEWS: Partial<Record<DatasetSlug, LazyView>> = {
  'mastr-clean': lazy(() => import('./views/MastrCleanView')),
  'consumption-industry': lazy(() => import('./views/ConsumptionIndustryView')),
  'consumption-ghd': lazy(() => import('./views/ConsumptionGhdView')),
  'consumption-phh': lazy(() => import('./views/ConsumptionPhhView')),
  'potential-pv-ground': lazy(() => import('./views/PotentialPvGroundView')),
  'potential-wind-onshore': lazy(() => import('./views/PotentialWindOnshoreView')),
  'potential-wind-offshore': lazy(() => import('./views/PotentialWindOffshoreView')),
  'timeseries-pv': lazy(() => import('./views/TimeseriesPvView')),
  'timeseries-wind': lazy(() => import('./views/TimeseriesWindView')),
  population: lazy(() => import('./views/PopulationView')),
  weather: lazy(() => import('./views/WeatherView')),
};

function PlaceholderView({ meta }: { meta: DatasetMeta }) {
  const { t } = useTranslation();
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

function ViewSkeleton() {
  const { t } = useTranslation();
  return (
    <div className="pointer-events-auto absolute right-4 top-4 w-80 animate-pulse rounded-lg bg-white/80 p-4 text-xs shadow-md ring-1 ring-slate-200 dark:bg-slate-900/80 dark:text-slate-100 dark:ring-slate-700">
      {t('view.loading')}
    </div>
  );
}

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

  const Specialized = VIEWS[validSlug];
  if (Specialized) {
    return (
      <Suspense fallback={<ViewSkeleton />}>
        <Specialized />
      </Suspense>
    );
  }
  return <PlaceholderView meta={meta} />;
}

export default DatasetView;
