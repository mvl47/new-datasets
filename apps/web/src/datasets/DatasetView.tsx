import { useEffect } from 'react';
import type { ComponentType } from 'react';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  findDatasetBySlug,
  isDatasetSlug,
  type DatasetMeta,
  type DatasetSlug,
} from '../data/datasets';
import { useAppStore } from '../state/appStore';
import MastrCleanView from './views/MastrCleanView';
import ConsumptionIndustryView from './views/ConsumptionIndustryView';
import ConsumptionGhdView from './views/ConsumptionGhdView';
import ConsumptionPhhView from './views/ConsumptionPhhView';
import PotentialPvGroundView from './views/PotentialPvGroundView';
import PotentialWindOnshoreView from './views/PotentialWindOnshoreView';
import PotentialWindOffshoreView from './views/PotentialWindOffshoreView';
import TimeseriesPvView from './views/TimeseriesPvView';
import TimeseriesWindView from './views/TimeseriesWindView';
import PopulationView from './views/PopulationView';
import WeatherView from './views/WeatherView';

const VIEWS: Partial<Record<DatasetSlug, ComponentType>> = {
  'mastr-clean': MastrCleanView,
  'consumption-industry': ConsumptionIndustryView,
  'consumption-ghd': ConsumptionGhdView,
  'consumption-phh': ConsumptionPhhView,
  'potential-pv-ground': PotentialPvGroundView,
  'potential-wind-onshore': PotentialWindOnshoreView,
  'potential-wind-offshore': PotentialWindOffshoreView,
  'timeseries-pv': TimeseriesPvView,
  'timeseries-wind': TimeseriesWindView,
  population: PopulationView,
  weather: WeatherView,
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
  if (Specialized) return <Specialized />;
  return <PlaceholderView meta={meta} />;
}

export default DatasetView;
