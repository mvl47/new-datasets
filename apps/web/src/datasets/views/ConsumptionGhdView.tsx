import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  GHD_GROUPS,
  getGhdConsumption,
  ghdValuesFor,
  isGhdGroup,
  nationalGroupTotals,
  type GhdGroup,
} from '../../data/consumptionGhd';
import { domainFor } from '../../data/consumptionIndustry';
import { useAppStore } from '../../state/appStore';
import { useLayersStore } from '../../state/layersStore';
import { useBoundariesStore } from '../../state/boundariesStore';
import { buildChoroplethLayer } from '../../layers/choropleth';
import { BLUES_STOPS } from '../../layers/colorScale';
import ColorScaleLegend from '../../components/ColorScaleLegend';
import EChart, { type EChartOption } from '../../components/EChart';

const GROUP_COLORS: Record<Exclude<GhdGroup, 'TOTAL'>, string> = {
  G: '#3b82f6',
  I: '#8b5cf6',
  J: '#06b6d4',
  M: '#10b981',
  O: '#f59e0b',
  Q: '#ef4444',
};

function formatGwh(v: number, locale: string): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(Math.round(v));
}

function ConsumptionGhdView() {
  const { t, i18n } = useTranslation();
  const locale = i18n.language.startsWith('de') ? 'de-DE' : 'en-US';
  const filters = useAppStore((s) => s.filters);
  const patchFilters = useAppStore((s) => s.patchFilters);

  const group: GhdGroup = isGhdGroup(filters.ghdGroup) ? filters.ghdGroup : 'TOTAL';
  const boundaryOverrides = useBoundariesStore((s) => s.overrides);

  const records = useMemo(() => getGhdConsumption(), []);
  const values = useMemo(() => ghdValuesFor(records, group), [records, group]);
  const domain = useMemo(() => domainFor(values), [values]);
  const donut = useMemo(() => nationalGroupTotals(records), [records]);

  useEffect(() => {
    const layer = buildChoroplethLayer({
      id: `consumption-ghd-${group}`,
      values,
      stops: BLUES_STOPS,
      domain,
    });
    useLayersStore.getState().setLayers([layer]);
    return () => useLayersStore.getState().clear();
  }, [values, domain, group, boundaryOverrides]);

  const total = useMemo(() => {
    let s = 0;
    for (const v of values.values()) s += v;
    return s;
  }, [values]);

  const donutOption: EChartOption = useMemo(
    () => ({
      tooltip: { trigger: 'item', formatter: '{b}: {c} GWh ({d}%)' },
      legend: { show: false },
      series: [
        {
          type: 'pie',
          radius: ['55%', '85%'],
          avoidLabelOverlap: true,
          label: { show: false },
          itemStyle: { borderColor: 'transparent', borderWidth: 1 },
          emphasis: { focus: 'self', scale: true, scaleSize: 4 },
          data: donut.map((d) => ({
            name: `${d.group} – ${t(`ghd.group.${d.group}`)}`,
            value: d.value,
            itemStyle: { color: GROUP_COLORS[d.group] },
            id: d.group,
          })),
          selectedMode: 'single',
          selectedOffset: 4,
        },
      ],
    }),
    [donut, t],
  );

  return (
    <>
      <div className="pointer-events-auto absolute right-4 top-4 w-80 max-w-[calc(100vw-2rem)] rounded-lg bg-white/95 p-4 shadow-lg ring-1 ring-slate-200 dark:bg-slate-900/95 dark:text-slate-100 dark:ring-slate-700">
        <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {t('view.datasetName')}
        </p>
        <h2 className="text-base font-semibold">{t('datasets.consumptionGhd')}</h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{t('ghd.description')}</p>

        <label className="mt-3 block">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {t('ghd.group')}
          </span>
          <select
            value={group}
            onChange={(e) => {
              if (isGhdGroup(e.target.value)) patchFilters({ ghdGroup: e.target.value });
            }}
            className="mt-1 w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm dark:border-slate-700 dark:bg-slate-800"
          >
            {GHD_GROUPS.map((g) => (
              <option key={g} value={g}>
                {g === 'TOTAL' ? t('ghd.total') : `WZ ${g} – ${t(`ghd.group.${g}`)}`}
              </option>
            ))}
          </select>
        </label>

        <div className="mt-3 text-sm">
          <div className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {t('ghd.totalLabel')}
          </div>
          <div className="font-semibold">{formatGwh(total, locale)} GWh</div>
        </div>

        <div className="mt-3 border-t border-slate-200 pt-2 dark:border-slate-700">
          <div className="text-[11px] uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {t('ghd.donutTitle')}
          </div>
          <EChart option={donutOption} height={170} />
          <ul className="mt-1 grid grid-cols-2 gap-x-3 gap-y-0.5 text-[11px]">
            {donut.map((d) => (
              <li key={d.group} className="flex items-center gap-1.5">
                <span
                  className="inline-block h-2 w-2 rounded-full"
                  style={{ backgroundColor: GROUP_COLORS[d.group] }}
                />
                <span className="truncate">{t(`ghd.group.${d.group}`)}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="mt-3 text-[10px] italic text-slate-400 dark:text-slate-500">
          {t('common.mockNotice')}
        </p>
      </div>
      <ColorScaleLegend
        title={t('ghd.legendTitle')}
        unit="GWh"
        domain={domain}
        stops={BLUES_STOPS}
        formatValue={(v) => formatGwh(v, locale)}
      />
    </>
  );
}

export default ConsumptionGhdView;
