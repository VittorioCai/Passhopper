import { DownloadSimpleIcon, MoonIcon } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router';
import ui from '../components/ui.module.css';
import { copyTrip } from '../db/trips';
import { formatDate } from '../model/dates';
import type { Trip } from '../model/schema';
import { decodeTrip } from '../model/share';
import { isNightTrain, journeyFrom, schedule, tripRange } from '../model/trip';
import { lineStyle, placeName, useLang } from '../lib';
import s from './SharePage.module.css';

/** A trip someone shared (F0.5): read-only, with a button to save a copy. */
export function SharePage() {
  const { t } = useTranslation();
  const lang = useLang();
  const navigate = useNavigate();
  const { hash } = useLocation();
  const data = hash.replace(/^#/, '');
  const [result, setResult] = useState<{ data: string; trip: Trip | null } | null>(null);

  useEffect(() => {
    let live = true;
    void decodeTrip(data).then((trip) => live && setResult({ data, trip }));
    return () => {
      live = false;
    };
  }, [data]);

  if (!data || (result?.data === data && !result.trip))
    return (
      <div className={`${ui.card} ${ui.empty}`}>
        <h2 className={ui.emptyTitle}>{t('share.broken')}</h2>
        <p className={ui.muted}>{t('share.brokenBody')}</p>
      </div>
    );
  if (result?.data !== data || !result.trip) return null;
  const trip = result.trip;
  const sched = schedule(trip);
  const range = tripRange(trip);

  return (
    <>
      <div className={ui.stack} style={{ gap: 4 }}>
        <span className={ui.stepLabel}>{t('share.shared')}</span>
        <h1 className={ui.pageTitle}>{trip.name}</h1>
        <p className={ui.muted} style={{ margin: 0 }}>
          {formatDate(range.start, lang)} – {formatDate(range.end, lang)} ·{' '}
          {t('route.daysCount', { count: range.days })}
        </p>
      </div>
      <ol className={`${ui.card} ${s.list}`}>
        {trip.stops.map((stop, i) => {
          const j = journeyFrom(trip, stop.id);
          const sc = sched[i]!;
          return (
            <li key={stop.id} className={s.stop}>
              <span className={s.dot} data-line style={lineStyle(stop.place.country)} />
              <div className={s.body}>
                <div className={s.head}>
                  <b>{placeName(stop.place, lang)}</b>
                  <span className={ui.muted}>
                    {formatDate((i === 0 ? sc.depart : sc.arrive) ?? trip.startDate, lang)}
                    {i > 0 && stop.nights > 0 && ` · ${t('route.nights', { count: stop.nights })}`}
                  </span>
                </div>
                {stop.note && <p className={s.note}>{stop.note}</p>}
                {j?.segments.map((seg) => (
                  <div key={seg.id} className={s.train}>
                    {isNightTrain(seg) && (
                      <MoonIcon size={13} weight="fill" aria-label={t('route.nightTrain')} />
                    )}
                    <b>{seg.trainNumber || t('route.train')}</b>
                    <span>
                      {seg.depTime} → {seg.arrTime}
                    </span>
                    <span className={ui.muted}>
                      {seg.from} → {seg.to}
                    </span>
                  </div>
                ))}
              </div>
            </li>
          );
        })}
      </ol>
      <button
        type="button"
        className={`${ui.btnPrimary} ${ui.block}`}
        onClick={async () => {
          const copy = await copyTrip(trip, trip.name);
          navigate(`/trip/${copy.id}/route`, { replace: true });
        }}
      >
        <DownloadSimpleIcon size={20} weight="bold" />
        {t('share.save')}
      </button>
      <p className={ui.muted} style={{ fontSize: 13, margin: 0 }}>
        {t('share.saveNote')}
      </p>
    </>
  );
}
