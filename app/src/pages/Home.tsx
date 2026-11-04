import {
  CopyIcon,
  DotsThreeIcon,
  PlusIcon,
  TrashIcon,
  TrainSimpleIcon,
} from '@phosphor-icons/react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router';
import { Sheet } from '../components/Sheet';
import ui from '../components/ui.module.css';
import { copyTrip, deleteTrip, useTrips } from '../db/trips';
import { daysBetween, formatDate, todayLocal } from '../model/dates';
import type { Trip } from '../model/schema';
import { destinationCount, segmentCount, sortTrips, tripRange } from '../model/trip';
import { lineStyle, placeName, useLang } from '../lib';
import h from './Home.module.css';

function MiniLine({ trip }: { trip: Trip }) {
  return (
    <div className={h.mini} aria-hidden="true">
      <span className={h.st} />
      {trip.stops.slice(1).map((s, i) => (
        <span key={s.id} className={h.seg}>
          <span className={h.ln} data-line style={lineStyle(trip.stops[i]!.place.country)} />
          <span className={h.st} />
        </span>
      ))}
    </div>
  );
}

function TripCard({ trip, onMore }: { trip: Trip; onMore: () => void }) {
  const { t } = useTranslation();
  const lang = useLang();
  const r = tripRange(trip);
  const cities = trip.stops.filter((s, i) => i === 0 || s.place.id !== trip.stops[0]!.place.id);
  return (
    <article className={`${ui.card} ${h.card}`}>
      <div className={ui.spread}>
        <Link to={`/trip/${trip.id}/route`} className={h.name}>
          {trip.name}
        </Link>
        <button
          type="button"
          className={ui.iconBtn}
          onClick={onMore}
          aria-label={t('home.moreFor', { name: trip.name })}
        >
          <DotsThreeIcon size={20} weight="bold" />
        </button>
      </div>
      <MiniLine trip={trip} />
      <div className={h.cities}>{cities.map((s) => placeName(s.place, lang)).join(' · ')}</div>
      <div className={h.stats}>
        <div>
          <b>{formatDate(r.start, lang)}</b>
          <span>{t('home.days', { count: r.days })}</span>
        </div>
        <div>
          <b>{destinationCount(trip)}</b>
          <span>{t('home.cities', { count: destinationCount(trip) })}</span>
        </div>
        <div>
          <b>{segmentCount(trip)}</b>
          <span>{t('home.trains', { count: segmentCount(trip) })}</span>
        </div>
      </div>
      {trip.sample && <span className={ui.badge}>{t('common.example')}</span>}
    </article>
  );
}

export function Home() {
  const { t } = useTranslation();
  const lang = useLang();
  const trips = useTrips();
  const navigate = useNavigate();
  const [menu, setMenu] = useState<Trip | null>(null);
  const [confirm, setConfirm] = useState(false);
  const sorted = trips && sortTrips(trips, todayLocal());
  const next = trips
    ?.map((x) => x.startDate)
    .filter((d) => d >= todayLocal())
    .sort()[0];
  const close = () => {
    setMenu(null);
    setConfirm(false);
  };
  return (
    <>
      <div className={ui.hello}>
        <span>{t('home.greeting')}</span>
        <h1>
          {next ? (
            <>
              <em className={h.em}>
                {t('home.daysToGoNum', { count: daysBetween(todayLocal(), next) })}
              </em>
              {t('home.daysToGoRest')}
            </>
          ) : (
            t('home.title')
          )}
        </h1>
      </div>
      {trips && trips.length === 0 && (
        <div className={`${ui.card} ${ui.empty}`}>
          <span className={ui.emptyIcon}>
            <TrainSimpleIcon size={24} weight="duotone" />
          </span>
          <h2 className={ui.emptyTitle}>{t('home.emptyTitle')}</h2>
          <p className={ui.muted}>{t('home.emptyBody')}</p>
        </div>
      )}
      {sorted?.upcoming.map((trip) => (
        <TripCard key={trip.id} trip={trip} onMore={() => setMenu(trip)} />
      ))}
      {sorted && sorted.past.length > 0 && (
        <>
          <h2 className={ui.sectionTitle}>{t('home.past')}</h2>
          {sorted.past.map((trip) => (
            <TripCard key={trip.id} trip={trip} onMore={() => setMenu(trip)} />
          ))}
        </>
      )}
      <Link to="/new" className={`${ui.btnPrimary} ${ui.block}`}>
        <PlusIcon size={20} weight="bold" />
        {t('home.newTrip')}
      </Link>
      {menu && (
        <Sheet
          title={menu.name}
          subtitle={formatDate(menu.startDate, lang, { weekday: true })}
          onClose={close}
        >
          <div className={ui.stack}>
            <button
              type="button"
              className={ui.btn}
              onClick={async () => {
                const copy = await copyTrip(
                  menu,
                  t('home.copyName', {
                    name: menu.name.replace(/（示例）|\(example\)/i, '').trim(),
                  }),
                );
                close();
                navigate(`/trip/${copy.id}/route`);
              }}
            >
              <CopyIcon size={18} weight="bold" />
              {t('home.duplicate')}
            </button>
            {confirm ? (
              <div className={ui.danger}>
                <span>{t('home.deleteConfirm', { name: menu.name })}</span>
                <div className={ui.row}>
                  <button
                    type="button"
                    className={ui.btnDanger}
                    onClick={async () => {
                      await deleteTrip(menu.id);
                      close();
                    }}
                  >
                    {t('common.delete')}
                  </button>
                  <button type="button" className={ui.btn} onClick={() => setConfirm(false)}>
                    {t('common.cancel')}
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                className={ui.btn}
                style={{ color: 'var(--danger)' }}
                onClick={() => setConfirm(true)}
              >
                <TrashIcon size={18} weight="bold" />
                {t('home.delete')}
              </button>
            )}
          </div>
        </Sheet>
      )}
    </>
  );
}
