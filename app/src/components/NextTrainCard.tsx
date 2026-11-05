import { ArmchairIcon, BedIcon, MoonIcon, TrainIcon } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { formatDate } from '../model/dates';
import { nextUp } from '../model/itinerary';
import type { Trip } from '../model/schema';
import { todayLocal } from '../model/dates';
import { placeName, useLang } from '../lib';
import s from './NextTrainCard.module.css';

/** Travel mode on Home: the trip under way, the next train and tonight's city. */
export function NextTrainCard({ trips }: { trips: Trip[] }) {
  const { t } = useTranslation();
  const lang = useLang();
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(id);
  }, []);
  const up = nextUp(trips, now, todayLocal());
  if (!up) return null;
  const m = up.train;
  const mins = m ? Math.round((m.dep.getTime() - now.getTime()) / 60000) : 0;
  const when = !m
    ? ''
    : mins <= 0
      ? t('travel.onBoard')
      : mins < 60
        ? t('travel.inMinutes', { count: mins })
        : mins < 24 * 60
          ? t('travel.inHours', { count: Math.round(mins / 60) })
          : formatDate(m.depDate, lang, { weekday: true });
  const res = m?.seg.reservation;
  return (
    <Link to={`/trip/${up.trip.id}/route`} className={s.card}>
      <span className={s.top}>
        <span className={s.trip}>{up.trip.name}</span>
        {up.day && <span className={s.day}>{t('travel.day', { day: up.day, days: up.days })}</span>}
      </span>
      {m ? (
        <>
          <span className={s.when}>
            <TrainIcon size={18} weight="fill" />
            {when}
          </span>
          <span className={s.times}>
            {m.seg.depTime}
            <span className={s.arrow}>→</span>
            {m.seg.arrTime}
            {m.arrDate !== m.depDate && (
              <MoonIcon size={16} weight="fill" aria-label={t('route.nightTrain')} />
            )}
          </span>
          <span className={s.line}>
            <b>{m.seg.trainNumber || t('route.train')}</b> · {m.seg.from} → {m.seg.to}
          </span>
          {res?.status === 'booked' && (res.seat || res.ref) && (
            <span className={s.seat}>
              <ArmchairIcon size={15} weight="bold" />
              {[res.seat, res.ref].filter(Boolean).join(' · ')}
            </span>
          )}
        </>
      ) : (
        <span className={s.line}>{t('travel.noMoreTrains')}</span>
      )}
      {up.tonight && (
        <span className={s.tonight}>
          <BedIcon size={15} weight="bold" />
          {t('travel.tonight', { name: placeName(up.tonight.place, lang) })}
        </span>
      )}
    </Link>
  );
}
