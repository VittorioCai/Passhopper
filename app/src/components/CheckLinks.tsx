import { ArrowSquareOutIcon } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import { isCountryCode } from '../data/countries';
import { INTERRAIL_FEES, RAIL_SITES, SEAT61 } from '../data/operators';
import s from './CheckLinks.module.css';

/** Where to check a train's times, price and reservation rules (F1.6). */
export function CheckLinks({ from, to, night }: { from: string; to: string; night: boolean }) {
  const { t } = useTranslation();
  const sites = [...new Set([from, to])].filter(isCountryCode).map((cc) => RAIL_SITES[cc]);
  const fees = night
    ? INTERRAIL_FEES.night
    : from === to
      ? INTERRAIL_FEES.domestic
      : INTERRAIL_FEES.international;
  const links = [
    ...sites.map((x) => ({ label: x.name, url: x.url })),
    { label: t('check.fees'), url: fees },
    { label: 'Seat61', url: SEAT61 },
  ];
  return (
    <div className={s.wrap}>
      <span className={s.title}>{t('check.title')}</span>
      <div className={s.links}>
        {links.map((l) => (
          <a key={l.url} href={l.url} target="_blank" rel="noopener noreferrer">
            {l.label}
            <ArrowSquareOutIcon size={13} weight="bold" />
          </a>
        ))}
      </div>
    </div>
  );
}
