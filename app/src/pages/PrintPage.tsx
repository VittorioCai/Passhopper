import { PrinterIcon } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import { Link, useParams } from 'react-router';
import { passName } from '../components/passText';
import { useTrip } from '../db/trips';
import { analyze, currentPlan } from '../engine/optimizer';
import { addDays, formatDate } from '../model/dates';
import { trainMoments } from '../model/itinerary';
import { schedule, tripRange } from '../model/trip';
import { countryName, placeName, useLang } from '../lib';
import s from './PrintPage.module.css';

/** A plain, printable itinerary (or "Save as PDF") for the trip, readable offline and on paper. */
export function PrintPage() {
  const { tripId = '' } = useParams();
  const { t } = useTranslation();
  const lang = useLang();
  const trip = useTrip(tripId);
  if (!trip) return null;
  const sched = schedule(trip);
  const range = tripRange(trip);
  const plan = currentPlan(trip, analyze(trip));
  const passDays = new Set(plan?.passDays ?? []);
  const moments = trainMoments(trip);
  const res = trip.traveller.residence;

  return (
    <div className={s.page}>
      <div className={s.actions}>
        <Link to={`/trip/${trip.id}/route`}>← {t('print.back')}</Link>
        <button type="button" onClick={() => window.print()}>
          <PrinterIcon size={18} weight="bold" />
          {t('print.print')}
        </button>
      </div>
      <header className={s.head}>
        <h1>{trip.name}</h1>
        <p>
          {formatDate(range.start, lang, { weekday: true })} –{' '}
          {formatDate(range.end, lang, { weekday: true })} ·{' '}
          {t('route.daysCount', { count: range.days })}
        </p>
        <p>
          {res.type === 'europe' ? countryName(res.country, lang) : t('wizard.outsideEurope')} ·{' '}
          {t(`wizard.${trip.traveller.ageGroup}`)} ·{' '}
          {t(trip.traveller.travelClass === 1 ? 'wizard.first' : 'wizard.second')}
          {plan && (
            <>
              {' · '}
              {passName(plan.result.product, t)} (
              {t('pass.daysUsed', { used: plan.passDays.length, total: plan.result.product.days })})
            </>
          )}
        </p>
      </header>
      <ol className={s.stops}>
        {trip.stops.map((stop, i) => {
          const sc = sched[i]!;
          const trains = moments.filter((m) => m.fromStop.id === stop.id);
          return (
            <li key={stop.id}>
              <div className={s.city}>
                <b>{placeName(stop.place, lang)}</b>
                <span>
                  {i === 0
                    ? formatDate(sc.depart ?? trip.startDate, lang, { weekday: true })
                    : sc.arrive &&
                      (stop.nights > 0
                        ? `${formatDate(sc.arrive, lang)} – ${formatDate(addDays(sc.arrive, stop.nights), lang)} · ${t('route.nights', { count: stop.nights })}`
                        : formatDate(sc.arrive, lang))}
                </span>
              </div>
              {stop.note && <p className={s.note}>{stop.note}</p>}
              {trains.length > 0 && (
                <table className={s.trains}>
                  <tbody>
                    {trains.map((m) => {
                      const r = m.seg.reservation;
                      return (
                        <tr key={m.seg.id}>
                          <td className={s.date}>
                            {formatDate(m.depDate, lang, { weekday: true })}
                            {passDays.has(m.depDate) && (
                              <span className={s.pass}>{t('chip.travelDay')}</span>
                            )}
                          </td>
                          <td className={s.time}>
                            {m.seg.depTime} → {m.seg.arrTime}
                            {m.arrDate !== m.depDate && ' +1'}
                          </td>
                          <td>
                            <b>{m.seg.trainNumber}</b> {m.seg.from} → {m.seg.to}
                            {r?.status === 'booked' && (r.seat || r.ref) && (
                              <div className={s.res}>
                                {t('print.booked')}: {[r.seat, r.ref].filter(Boolean).join(' · ')}
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </li>
          );
        })}
      </ol>
      <p className={s.foot}>{t('print.foot')}</p>
    </div>
  );
}
