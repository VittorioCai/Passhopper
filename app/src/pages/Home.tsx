import {
  ArrowRightIcon,
  CaretRightIcon,
  CopyIcon,
  DotsThreeIcon,
  PlusIcon,
  ShareNetworkIcon,
  TrainIcon,
  TrashIcon,
  TrainSimpleIcon,
} from '@phosphor-icons/react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router';
import { ideaLook } from '../components/IdeaEmblem';
import { NextTrainCard } from '../components/NextTrainCard';
import { passName } from '../components/passText';
import { Sheet } from '../components/Sheet';
import ui from '../components/ui.module.css';
import { ideaStats, ROUTE_IDEAS } from '../data/routeIdeas';
import { copyTrip, deleteTrip, useTrips } from '../db/trips';
import { analyze, currentPlan } from '../engine/optimizer';
import { daysBetween, formatDate, todayLocal } from '../model/dates';
import type { Trip } from '../model/schema';
import { encodeTrip, shareUrl } from '../model/share';
import { destinationCount, segmentCount, sortTrips, tripRange } from '../model/trip';
import { eur, placeName, useLang } from '../lib';
import h from './Home.module.css';

/** Three-letter code for a city, like on a luggage tag. */
const cityCode = (en: string) =>
  en
    .normalize('NFD')
    .replace(/[^A-Za-z]/g, '')
    .slice(0, 3)
    .toUpperCase();

function TripCard({ trip, past, onMore }: { trip: Trip; past?: boolean; onMore: () => void }) {
  const { t } = useTranslation();
  const lang = useLang();
  const r = tripRange(trip);
  const plan = useMemo(() => {
    const a = analyze(trip);
    return a.days.length ? currentPlan(trip, a) : null;
  }, [trip]);
  const from = trip.stops[0]!.place;
  // A round trip ends where it started; show the last other city instead.
  const to = (trip.stops.findLast((x) => x.place.id !== from.id) ?? trip.stops[0]!).place;
  const unpriced = plan?.days.some((d) =>
    d.items.some((i) => (d.choice !== 'pass' || !i.coverable) && !i.price),
  );
  return (
    <article className={`${h.ticket} ${past ? h.past : ''}`}>
      <div className={h.up}>
        <div className={ui.spread}>
          <span className={h.tag}>
            <TrainIcon size={14} weight="fill" aria-hidden="true" />
            {trip.sample
              ? t('common.example')
              : plan
                ? `${passName(plan.result.product, t)} · ${t(`wizard.${trip.traveller.ageGroup}`)}`
                : t('home.trainsShort', { count: segmentCount(trip) })}
          </span>
          <button
            type="button"
            className={h.more}
            onClick={onMore}
            aria-label={t('home.moreFor', { name: trip.name })}
          >
            <DotsThreeIcon size={20} weight="bold" />
          </button>
        </div>
        <Link to={`/trip/${trip.id}/route`} className={h.name}>
          {trip.name}
        </Link>
        <div className={h.od}>
          <div>
            <b>{cityCode(from.en)}</b>
            <small>
              {placeName(from, lang)} · {formatDate(r.start, lang)}
            </small>
          </div>
          <span className={h.dash} aria-hidden="true">
            <TrainIcon size={20} weight="fill" />
          </span>
          <div className={h.end}>
            <b>{cityCode(to.en)}</b>
            <small>
              {placeName(to, lang)} · {formatDate(r.end, lang)}
            </small>
          </div>
        </div>
      </div>
      <div className={h.cut} aria-hidden="true" />
      <div className={h.down}>
        <div className={h.fact}>
          <b>{t('home.daysShort', { count: r.days })}</b>
          <span>{t('home.citiesShort', { count: destinationCount(trip) })}</span>
        </div>
        {plan && (
          <div className={h.fact}>
            <b>{eur(plan.total)}</b>
            <span>{t(unpriced ? 'home.trainCostAtLeast' : 'home.trainCost')}</span>
          </div>
        )}
        <span className={h.go} aria-hidden="true">
          {t('home.open')}
          <ArrowRightIcon size={16} weight="bold" />
        </span>
      </div>
    </article>
  );
}

function IdeaPosters() {
  const { t } = useTranslation();
  const lang = useLang();
  const zh = lang.startsWith('zh');
  return (
    <>
      <h2 className={`${ui.sectionTitle} ${ui.spread}`}>
        {t('home.ideasTitle')}
        <Link to="/ideas" className={h.all}>
          {t('home.ideasAll', { count: ROUTE_IDEAS.length })}
          <CaretRightIcon size={12} weight="bold" aria-hidden="true" />
        </Link>
      </h2>
      <ul className={h.posters}>
        {ROUTE_IDEAS.map((idea) => {
          const st = ideaStats(idea);
          const look = ideaLook(idea.id);
          const I = look.icon;
          return (
            <li key={idea.id}>
              <Link
                to={`/ideas/${idea.id}`}
                className={h.poster}
                style={{ background: look.bg, color: look.ink }}
              >
                <I size={44} weight="duotone" aria-hidden="true" />
                {idea.tags[0] && (
                  <span className={h.sticker}>{t(`ideas.tag.${idea.tags[0]}`)}</span>
                )}
                <b>{zh ? idea.title.zh : idea.title.en}</b>
                <small>{t('ideas.short', { days: st.days, cities: st.cities })}</small>
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}

export function Home() {
  const { t } = useTranslation();
  const lang = useLang();
  const trips = useTrips();
  const navigate = useNavigate();
  const [menu, setMenu] = useState<Trip | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [shared, setShared] = useState('');
  const sorted = trips && sortTrips(trips, todayLocal());
  const today = todayLocal();
  const underWay = trips?.some(
    (x) => !x.sample && x.startDate <= today && tripRange(x).end >= today,
  );
  const next = trips
    ?.filter((x) => !x.sample)
    .map((x) => x.startDate)
    .filter((d) => d >= today)
    .sort()[0];
  const close = () => {
    setMenu(null);
    setConfirm(false);
    setShared('');
  };
  return (
    <>
      <div className={ui.hello}>
        <span>{t('home.greeting')}</span>
        <h1>
          {underWay ? (
            t('home.underWay')
          ) : next ? (
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
      {trips && <NextTrainCard trips={trips} />}
      {sorted?.upcoming.map((trip) => (
        <TripCard key={trip.id} trip={trip} onMore={() => setMenu(trip)} />
      ))}
      {sorted && sorted.past.length > 0 && (
        <>
          <h2 className={ui.sectionTitle}>{t('home.past')}</h2>
          {sorted.past.map((trip) => (
            <TripCard key={trip.id} trip={trip} past onMore={() => setMenu(trip)} />
          ))}
        </>
      )}
      <Link to="/new" className={h.cta}>
        <span className={h.plus}>
          <PlusIcon size={16} weight="bold" />
        </span>
        {t('home.newTrip')}
      </Link>
      <IdeaPosters />
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
            <button
              type="button"
              className={ui.btn}
              onClick={async () => {
                const url = shareUrl(await encodeTrip(menu));
                try {
                  if (navigator.share) {
                    await navigator.share({ title: menu.name, text: t('share.shareText'), url });
                    return;
                  }
                  await navigator.clipboard.writeText(url);
                  setShared(t('share.copied'));
                } catch {
                  // Cancelled, or no clipboard: show the link to copy by hand.
                  setShared(url);
                }
              }}
            >
              <ShareNetworkIcon size={18} weight="bold" />
              {t('share.action')}
            </button>
            {shared && (
              <p
                className={`${ui.status} ${ui.ok}`}
                role="status"
                style={{ overflowWrap: 'anywhere' }}
              >
                {shared}
              </p>
            )}
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
