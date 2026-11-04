import { CaretDownIcon, MapTrifoldIcon } from '@phosphor-icons/react';
import { lazy, Suspense, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Trip } from '../model/schema';
import s from './MapCard.module.css';

const RouteMap = lazy(() => import('./RouteMap'));
const KEY = 'passhopper.map';

/** WebGL is needed for the map; test browsers and some old devices don't have it. */
const canMap = () => typeof window !== 'undefined' && 'WebGL2RenderingContext' in window;

function readOpen() {
  try {
    return localStorage.getItem(KEY) !== 'closed';
  } catch {
    return true;
  }
}

export function MapCard({ trip, lang }: { trip: Trip; lang: string }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(readOpen);
  if (!canMap()) return null;
  const toggle = () => {
    setOpen(!open);
    try {
      localStorage.setItem(KEY, open ? 'closed' : 'open');
    } catch {
      // Not saved: the map just opens again next time.
    }
  };
  return (
    <section className={s.card}>
      <button type="button" className={s.head} aria-expanded={open} onClick={toggle}>
        <MapTrifoldIcon size={18} weight="duotone" />
        <span>{t('map.title')}</span>
        <CaretDownIcon size={16} weight="bold" className={open ? s.up : undefined} />
      </button>
      {open && (
        <div className={s.body}>
          <Suspense fallback={<div className={s.loading}>{t('map.loading')}</div>}>
            <RouteMap trip={trip} lang={lang} />
          </Suspense>
        </div>
      )}
    </section>
  );
}
