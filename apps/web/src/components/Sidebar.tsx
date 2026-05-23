import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { DATASETS } from '../data/datasets';

function Sidebar() {
  const { t } = useTranslation();
  return (
    <aside className="w-64 shrink-0 overflow-y-auto border-r border-slate-200 bg-slate-50 px-3 py-3 dark:border-slate-800 dark:bg-slate-900">
      <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        {t('sidebar.datasets')}
      </div>
      <nav className="flex flex-col gap-0.5">
        {DATASETS.map((d) => (
          <NavLink
            key={d.slug}
            to={`/dataset/${d.slug}`}
            className={({ isActive }) =>
              [
                'rounded-md px-2 py-1.5 text-sm transition-colors',
                isActive
                  ? 'bg-slate-200 font-semibold text-slate-900 dark:bg-slate-800 dark:text-slate-100'
                  : 'text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800',
              ].join(' ')
            }
          >
            {t(d.i18nKey)}
          </NavLink>
        ))}
      </nav>

      <div className="mt-6">
        <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {t('sidebar.filters')}
        </div>
        <div className="rounded-md border border-dashed border-slate-300 p-3 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
          {t('sidebar.placeholder')}
        </div>
      </div>

      <div className="mt-6">
        <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {t('sidebar.legend')}
        </div>
        <div className="rounded-md border border-dashed border-slate-300 p-3 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
          {t('sidebar.placeholder')}
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
