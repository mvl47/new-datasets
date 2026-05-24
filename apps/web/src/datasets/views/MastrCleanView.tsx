import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  MASTR_TECHS,
  getMastrData,
  isMastrVariant,
  summarize,
  type MastrTech,
  type MastrVariant,
} from '../../data/mastrClean';
import { useAppStore } from '../../state/appStore';
import { useLayersStore } from '../../state/layersStore';
import { buildMastrScatterLayer } from '../../layers/mastrLayers';
import BeforeAfterSlider from '../../components/BeforeAfterSlider';
import Legend from '../../components/Legend';

function formatInt(n: number, locale: string): string {
  return new Intl.NumberFormat(locale).format(n);
}

function formatDecimal(n: number, locale: string): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(n);
}

function formatSignedPct(value: number, locale: string): string {
  const sign = value > 0 ? '+' : '';
  const formatted = new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(value);
  return `${sign}${formatted} %`;
}

function MastrCleanView() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language.startsWith('de') ? 'de-DE' : 'en-US';
  const filters = useAppStore((s) => s.filters);
  const patchFilters = useAppStore((s) => s.patchFilters);

  const variant: MastrVariant = isMastrVariant(filters.variant) ? filters.variant : 'cleaned';

  const { raw, cleaned } = useMemo(() => getMastrData(), []);
  const plants = variant === 'raw' ? raw : cleaned;

  const stats = useMemo(() => summarize(plants), [plants]);
  const cleanedStats = useMemo(() => summarize(cleaned), [cleaned]);
  const rawStats = useMemo(() => summarize(raw), [raw]);

  useEffect(() => {
    const layer = buildMastrScatterLayer(plants, variant);
    useLayersStore.getState().setLayers([layer]);
    return () => useLayersStore.getState().clear();
  }, [plants, variant]);

  const removed = rawStats.total - cleanedStats.total;
  const removedPct = rawStats.total > 0 ? (-removed / rawStats.total) * 100 : 0;

  const setVariant = (next: MastrVariant) => patchFilters({ variant: next });

  return (
    <>
      <div className="pointer-events-auto absolute right-4 top-4 w-80 max-w-[calc(100vw-2rem)] rounded-lg bg-white/95 p-4 shadow-lg ring-1 ring-slate-200 dark:bg-slate-900/95 dark:text-slate-100 dark:ring-slate-700">
        <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {t('view.datasetName')}
        </p>
        <h2 className="text-base font-semibold">{t('datasets.mastrClean')}</h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t('mastr.description')}</p>

        <div className="mt-4">
          <BeforeAfterSlider value={variant} onChange={setVariant} />
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-2 text-sm">
          <div>
            <dt className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {t('mastr.plants')}
            </dt>
            <dd className="font-semibold">{formatInt(stats.total, locale)}</dd>
          </div>
          <div>
            <dt className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {t('mastr.capacity')}
            </dt>
            <dd className="font-semibold">
              {formatDecimal(stats.totalCapacityMw, locale)}&nbsp;MW
            </dd>
          </div>
        </dl>

        <div className="mt-3 border-t border-slate-200 pt-3 dark:border-slate-700">
          <div className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {t('mastr.byTech')}
          </div>
          <ul className="mt-1.5 space-y-0.5 text-xs">
            {MASTR_TECHS.map((tech: MastrTech) => (
              <li key={tech} className="flex items-center justify-between">
                <span>{t(`mastr.tech.${tech}`)}</span>
                <span className="tabular-nums text-slate-600 dark:text-slate-300">
                  {formatInt(stats.byTech[tech], locale)}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
          {t('mastr.cleaningImpact', {
            removed: formatInt(removed, locale),
            pct: formatSignedPct(removedPct, locale),
          })}
        </p>

        <p className="mt-3 text-[10px] italic text-slate-400 dark:text-slate-500">
          {t('mastr.mockNotice')}
        </p>
      </div>
      <Legend />
    </>
  );
}

export default MastrCleanView;
