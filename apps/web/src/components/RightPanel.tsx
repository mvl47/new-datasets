import { useState } from 'react';
import { useTranslation } from 'react-i18next';

function RightPanel() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(true);

  return (
    <aside
      className={[
        'flex shrink-0 flex-col border-l border-slate-200 bg-white transition-[width] duration-200 dark:border-slate-800 dark:bg-slate-900',
        open ? 'w-80' : 'w-10',
      ].join(' ')}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? t('panel.collapse') : t('panel.expand')}
        className="flex h-9 items-center justify-center border-b border-slate-200 text-xs text-slate-500 hover:bg-slate-50 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800"
      >
        {open ? '›' : '‹'}
      </button>
      {open && (
        <div className="flex-1 overflow-y-auto p-3">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {t('panel.title')}
          </div>
          <div className="rounded-md border border-dashed border-slate-300 p-3 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
            {t('panel.placeholder')}
          </div>
        </div>
      )}
    </aside>
  );
}

export default RightPanel;
