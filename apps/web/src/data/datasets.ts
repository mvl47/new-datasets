export const DATASET_SLUGS = [
  'mastr-clean',
  'consumption-industry',
  'consumption-ghd',
  'consumption-phh',
  'potential-pv-ground',
  'potential-wind-onshore',
  'potential-wind-offshore',
  'timeseries-pv',
  'timeseries-wind',
  'population',
  'weather',
] as const;

export type DatasetSlug = (typeof DATASET_SLUGS)[number];

export type VizType = 'points' | 'choropleth' | 'polygons' | 'raster' | 'timeseries';

export interface DatasetMeta {
  slug: DatasetSlug;
  i18nKey: string;
  viz: VizType;
}

export const DATASETS: ReadonlyArray<DatasetMeta> = [
  { slug: 'mastr-clean', i18nKey: 'datasets.mastrClean', viz: 'points' },
  { slug: 'consumption-industry', i18nKey: 'datasets.consumptionIndustry', viz: 'choropleth' },
  { slug: 'consumption-ghd', i18nKey: 'datasets.consumptionGhd', viz: 'choropleth' },
  { slug: 'consumption-phh', i18nKey: 'datasets.consumptionPhh', viz: 'choropleth' },
  { slug: 'potential-pv-ground', i18nKey: 'datasets.potentialPvGround', viz: 'polygons' },
  { slug: 'potential-wind-onshore', i18nKey: 'datasets.potentialWindOnshore', viz: 'polygons' },
  { slug: 'potential-wind-offshore', i18nKey: 'datasets.potentialWindOffshore', viz: 'raster' },
  { slug: 'timeseries-pv', i18nKey: 'datasets.timeseriesPv', viz: 'timeseries' },
  { slug: 'timeseries-wind', i18nKey: 'datasets.timeseriesWind', viz: 'timeseries' },
  { slug: 'population', i18nKey: 'datasets.population', viz: 'choropleth' },
  { slug: 'weather', i18nKey: 'datasets.weather', viz: 'choropleth' },
];

export function findDatasetBySlug(slug: string): DatasetMeta | undefined {
  return DATASETS.find((d) => d.slug === slug);
}

export function isDatasetSlug(value: string): value is DatasetSlug {
  return (DATASET_SLUGS as ReadonlyArray<string>).includes(value);
}
