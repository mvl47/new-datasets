import type { ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import type { MastrVariant } from '../data/mastrClean';

interface Props {
  value: MastrVariant;
  onChange: (next: MastrVariant) => void;
}

function BeforeAfterSlider({ value, onChange }: Props) {
  const { t } = useTranslation();
  const handle = (e: ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value === '1' ? 'cleaned' : 'raw');
  };

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        <span className={value === 'raw' ? 'text-sky-600 dark:text-sky-300' : ''}>
          {t('mastr.before')}
        </span>
        <span className={value === 'cleaned' ? 'text-sky-600 dark:text-sky-300' : ''}>
          {t('mastr.after')}
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={1}
        step={1}
        value={value === 'cleaned' ? 1 : 0}
        onChange={handle}
        aria-label={t('mastr.toggleAria')}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-sky-500 dark:bg-slate-700"
      />
    </div>
  );
}

export default BeforeAfterSlider;
