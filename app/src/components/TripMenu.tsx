import {
  CalendarPlusIcon,
  CopyIcon,
  ImageIcon,
  PrinterIcon,
  ShareNetworkIcon,
  SlidersHorizontalIcon,
  TrashIcon,
} from '@phosphor-icons/react';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router';
import { COUNTRY_CODES, type CountryCode } from '../data/countries';
import { copyTrip, deleteTrip, updateTrip } from '../db/trips';
import { analyze, currentPlan } from '../engine/optimizer';
import { formatDate } from '../model/dates';
import { downloadIcs, tripToIcs } from '../model/ics';
import type { Trip } from '../model/schema';
import { encodeTrip, shareUrl } from '../model/share';
import { renameTrip, segmentCount, setStartDate, setTraveller } from '../model/trip';
import { countryName, placeName, useLang } from '../lib';
import { PosterSheet } from './PosterSheet';
import { Sheet } from './Sheet';
import m from './TripMenu.module.css';
import ui from './ui.module.css';

/** Name, start date and traveller details of a trip, changed in place. */
function TripDetails({ trip }: { trip: Trip }) {
  const { t } = useTranslation();
  const lang = useLang();
  const update = (fn: (x: Trip) => Trip) => void updateTrip(trip.id, fn);
  return (
    <div className={ui.grid2}>
      <label className={ui.field}>
        {t('wizard.tripName')}
        <input
          defaultValue={trip.name}
          maxLength={120}
          onBlur={(e) => {
            const name = e.target.value;
            if (name.trim() && name.trim() !== trip.name) update((x) => renameTrip(x, name));
          }}
        />
      </label>
      <label className={ui.field}>
        {t('wizard.startDate')}
        <input
          type="date"
          value={trip.startDate}
          onChange={(e) => {
            const date = e.target.value;
            if (date) update((x) => setStartDate(x, date));
          }}
        />
      </label>
      <label className={ui.field}>
        {t('wizard.residence')}
        <select
          value={
            trip.traveller.residence.type === 'europe'
              ? trip.traveller.residence.country
              : 'non_europe'
          }
          onChange={(e) => {
            const v = e.target.value;
            update((x) =>
              setTraveller(x, {
                residence:
                  v === 'non_europe'
                    ? { type: 'non_europe' }
                    : { type: 'europe', country: v as CountryCode },
              }),
            );
          }}
        >
          <option value="non_europe">{t('wizard.outsideEurope')}</option>
          {COUNTRY_CODES.map((cc) => (
            <option key={cc} value={cc}>
              {countryName(cc, lang)}
            </option>
          ))}
        </select>
      </label>
      <label className={ui.field}>
        {t('wizard.age')}
        <select
          value={trip.traveller.ageGroup}
          onChange={(e) => {
            const ageGroup = e.target.value as Trip['traveller']['ageGroup'];
            update((x) => setTraveller(x, { ageGroup }));
          }}
        >
          <option value="youth">{t('wizard.youth')}</option>
          <option value="adult">{t('wizard.adult')}</option>
          <option value="senior">{t('wizard.senior')}</option>
        </select>
      </label>
      <label className={ui.field}>
        {t('wizard.class')}
        <select
          value={trip.traveller.travelClass}
          onChange={(e) => {
            const travelClass = Number(e.target.value) as 1 | 2;
            update((x) => setTraveller(x, { travelClass }));
          }}
        >
          <option value={2}>{t('wizard.second')}</option>
          <option value={1}>{t('wizard.first')}</option>
        </select>
      </label>
    </div>
  );
}

type View = 'menu' | 'details' | 'picture';

/** Everything you can do with a trip as a whole, from Home's "⋯" and the trip pages' top bar. */
export function TripMenu({ trip, onClose }: { trip: Trip; onClose: () => void }) {
  const { t } = useTranslation();
  const lang = useLang();
  const navigate = useNavigate();
  const [view, setView] = useState<View>('menu');
  const [confirm, setConfirm] = useState(false);
  const [shared, setShared] = useState('');
  const plan = useMemo(() => {
    const a = analyze(trip);
    return a.days.length ? currentPlan(trip, a) : null;
  }, [trip]);
  const hasTrains = segmentCount(trip) > 0;

  if (view === 'picture') return <PosterSheet trip={trip} plan={plan} onClose={onClose} />;
  if (view === 'details')
    return (
      <Sheet title={t('menu.settings')} subtitle={trip.name} onClose={onClose}>
        <TripDetails trip={trip} />
      </Sheet>
    );

  return (
    <Sheet
      title={trip.name}
      subtitle={formatDate(trip.startDate, lang, { weekday: true })}
      onClose={onClose}
    >
      <div className={m.list}>
        <button type="button" className={m.item} onClick={() => setView('details')}>
          <SlidersHorizontalIcon size={20} weight="bold" />
          <span>
            {t('menu.settings')}
            <small>{t('menu.settingsHint')}</small>
          </span>
        </button>
        <button
          type="button"
          className={m.item}
          onClick={async () => {
            const url = shareUrl(await encodeTrip(trip));
            try {
              if (navigator.share) {
                await navigator.share({ title: trip.name, text: t('share.shareText'), url });
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
          <ShareNetworkIcon size={20} weight="bold" />
          <span>{t('share.action')}</span>
        </button>
        {shared && (
          <p className={`${ui.status} ${ui.ok}`} role="status" style={{ overflowWrap: 'anywhere' }}>
            {shared}
          </p>
        )}
        {hasTrains && (
          <>
            <button type="button" className={m.item} onClick={() => setView('picture')}>
              <ImageIcon size={20} weight="bold" />
              <span>{t('poster.action')}</span>
            </button>
            <button
              type="button"
              className={m.item}
              onClick={() =>
                downloadIcs(
                  trip.name,
                  tripToIcs(trip, (p) => placeName(p, lang), {
                    stay: (city, n) => t('travel.icsStay', { city, count: n }),
                    reservation: (ref, seat) =>
                      t('travel.icsSeat', { value: [seat, ref].filter(Boolean).join(' · ') }),
                  }),
                )
              }
            >
              <CalendarPlusIcon size={20} weight="bold" />
              <span>{t('travel.calendar')}</span>
            </button>
            <Link to={`/trip/${trip.id}/print`} className={m.item} onClick={onClose}>
              <PrinterIcon size={20} weight="bold" />
              <span>{t('travel.print')}</span>
            </Link>
          </>
        )}
        <button
          type="button"
          className={m.item}
          onClick={async () => {
            const copy = await copyTrip(
              trip,
              t('home.copyName', { name: trip.name.replace(/（示例）|\(example\)/i, '').trim() }),
            );
            onClose();
            navigate(`/trip/${copy.id}/route`);
          }}
        >
          <CopyIcon size={20} weight="bold" />
          <span>{t('home.duplicate')}</span>
        </button>
        {confirm ? (
          <div className={ui.danger}>
            <span>{t('home.deleteConfirm', { name: trip.name })}</span>
            <div className={ui.row}>
              <button
                type="button"
                className={ui.btnDanger}
                onClick={async () => {
                  await deleteTrip(trip.id);
                  onClose();
                  navigate('/');
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
            className={`${m.item} ${m.danger}`}
            onClick={() => setConfirm(true)}
          >
            <TrashIcon size={20} weight="bold" />
            <span>{t('home.delete')}</span>
          </button>
        )}
      </div>
    </Sheet>
  );
}
