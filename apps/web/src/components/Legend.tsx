import { useTranslation } from 'react-i18next';
import { MASTR_TECHS, MASTR_TECH_COLORS, type MastrTech } from '../data/mastrClean';

function swatchStyle(tech: MastrTech): { backgroundColor: string } {
  const [r, g, b] = MASTR_TECH_COLORS[tech];
  return { backgroundColor: `rgb(${r},${g},${b})` };
}

function Legend() {
  const { t } = useTranslation();
  return (
    <div className="pointer-events-auto absolute bottom-8 right-4 rounded-md bg-white/95 px-3 py-2 text-xs shadow-md ring-1 ring-slate-200 dark:bg-slate-900/95 dark:text-slate-100 dark:ring-slate-700">
      <div className="mb-1 font-semibold uppercase tracking-wider text-[10px] text-slate-500 dark:text-slate-400">
        {t('mastr.legend')}
      </div>
      <ul className="flex flex-col gap-1">
        {MASTR_TECHS.map((tech) => (
          <li key={tech} className="flex items-center gap-2">
            <span className="inline-block h-2.5 w-2.5 rounded-full" style={swatchStyle(tech)} />
            <span>{t(`mastr.tech.${tech}`)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default Legend;
