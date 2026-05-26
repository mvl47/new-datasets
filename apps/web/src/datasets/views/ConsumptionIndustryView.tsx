import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { BUNDESLAENDER, type BundeslandCode } from '../../data/bundeslaender';
import {
  WZ_SECTIONS,
  domainFor,
  getIndustryConsumption,
  isWzSection,
  valuesFor,
  type WzSection,
} from '../../data/consumptionIndustry';
import { useAppStore } from '../../state/appStore';
import { useLayersStore } from '../../state/layersStore';
import { useBoundariesStore } from '../../state/boundariesStore';
import { buildChoroplethLayer } from '../../layers/choropleth';
import { ORANGES_STOPS } from '../../layers/colorScale';
import { renderTooltip } from '../../layers/tooltip';
import ColorScaleLegend from '../../components/ColorScaleLegend';

function formatGwh(value: number, locale: string): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(Math.round(value));
}

function ConsumptionIndustryView() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language.startsWith('de') ? 'de-DE' : 'en-US';
  const filters = useAppStore((s) => s.filters);
  const patchFilters = useAppStore((s) => s.patchFilters);

  const section: WzSection = isWzSection(filters.wzSection) ? filters.wzSection : 'TOTAL';
  const boundaryOverrides = useBoundariesStore((s) => s.overrides);

  const records = useMemo(() => getIndustryConsumption(), []);
  const values = useMemo(() => valuesFor(records, section), [records, section]);
  const domain = useMemo(() => domainFor(values), [values]);

  useEffect(() => {
    const layer = buildChoroplethLayer({
      id: `consumption-industry-${section}`,
      values,
      stops: ORANGES_STOPS,
      domain,
    });
    useLayersStore.getState().setLayers([layer], (info) => {
      const obj = info.object as { properties?: { code?: string; nameDe?: string; nameEn?: string; value?: number } } | undefined;
      const p = obj?.properties;
      if (!p?.code) return null;
      const name = locale === 'de-DE' ? (p.nameDe ?? p.code) : (p.nameEn ?? p.code);
      const sectionLabel = section === 'TOTAL' ? t('consumptionIndustry.total') : `WZ ${section}`;
      return renderTooltip(name, [
        { label: sectionLabel, value: `${formatGwh(p.value ?? 0, locale)} GWh` },
      ]);
    });
    return () => useLayersStore.getState().clear();
  }, [values, domain, section, boundaryOverrides, locale, t]);

  const sorted = useMemo(() => {
    const list = BUNDESLAENDER.map((b) => ({
      code: b.code,
      name: locale === 'de-DE' ? b.nameDe : b.nameEn,
      value: values.get(b.code) ?? 0,
    }));
    list.sort((a, b) => b.value - a.value);
    return list;
  }, [values, locale]);

  const total = useMemo(() => {
    let sum = 0;
    for (const v of values.values()) sum += v;
    return sum;
  }, [values]);

  const setSection = (next: WzSection) => patchFilters({ wzSection: next });
  const top = sorted[0] as { code: BundeslandCode; name: string; value: number };
  const bottom = sorted[sorted.length - 1] as { code: BundeslandCode; name: string; value: number };

  return (
    <>
      <div className="pointer-events-auto absolute right-4 top-4 w-80 max-w-[calc(100vw-2rem)] rounded-lg bg-white/95 p-4 shadow-lg ring-1 ring-slate-200 dark:bg-slate-900/95 dark:text-slate-100 dark:ring-slate-700">
        <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {t('view.datasetName')}
        </p>
        <h2 className="text-base font-semibold">{t('datasets.consumptionIndustry')}</h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          {t('consumptionIndustry.description')}
        </p>

        <label className="mt-4 block">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {t('consumptionIndustry.wzSection')}
          </span>
          <select
            value={section}
            onChange={(e) => {
              const next = e.target.value;
              if (isWzSection(next)) setSection(next);
            }}
            className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800"
          >
            {WZ_SECTIONS.map((s) => (
              <option key={s} value={s}>
                {s === 'TOTAL' ? t('consumptionIndustry.total') : `WZ ${s} – ${t(`wz.${s}`)}`}
              </option>
            ))}
          </select>
        </label>

        <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
          <div>
            <div className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {t('consumptionIndustry.totalLabel')}
            </div>
            <div className="font-semibold">{formatGwh(total, locale)} GWh</div>
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {t('consumptionIndustry.share')}
            </div>
            <div className="font-semibold">
              {section === 'TOTAL' ? '100 %' : `${Math.round((total / (sorted.reduce((s, x) => s + x.value, 0) || 1)) * 100)} %`}
            </div>
          </div>
        </div>

        <div className="mt-3 border-t border-slate-200 pt-3 dark:border-slate-700">
          <div className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {t('consumptionIndustry.ranking')}
          </div>
          <div className="mt-1 flex justify-between text-xs">
            <span>↑ {top.name}</span>
            <span className="tabular-nums">{formatGwh(top.value, locale)}</span>
          </div>
          <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
            <span>↓ {bottom.name}</span>
            <span className="tabular-nums">{formatGwh(bottom.value, locale)}</span>
          </div>
        </div>

        <p className="mt-3 text-[10px] italic text-slate-400 dark:text-slate-500">
          {t('common.mockNotice')}
        </p>
      </div>
      <ColorScaleLegend
        title={t('consumptionIndustry.legendTitle')}
        unit="GWh"
        domain={domain}
        stops={ORANGES_STOPS}
        formatValue={(v) => formatGwh(v, locale)}
      />
    </>
  );
}

export default ConsumptionIndustryView;
