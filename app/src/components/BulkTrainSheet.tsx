import { CheckIcon, MoonIcon } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { daysBetween, formatDate, formatDuration } from '../model/dates';
import type { Segment, Trip } from '../model/schema';
import { schedule } from '../model/trip';
import { searchTrains, TRANSITOUS_SOURCES_URL, type TrainOption } from '../timetable/transitous';
import { placeName, useLang } from '../lib';
import { optionToSegments } from './TrainSearch';
import { Sheet } from './Sheet';
import s from './BulkTrainSheet.module.css';
import ui from './ui.module.css';

const TIMES = ['07:00', '11:00', '15:00', '19:00'] as const;

/**
 * The option most people would pick for a day of travel: few changes, short, not too early.
 * Exported for tests.
 */
export function pickBest(options: TrainOption[]): number {
  if (!options.length) return -1;
  const score = (o: TrainOption) => {
    const dep = Number(o.legs[0]!.depTime.slice(0, 2));
    return (o.legs.length - 1) * 45 + o.minutes + (dep < 7 ? 90 : 0);
  };
  let best = 0;
  options.forEach((o, i) => {
    if (score(o) < score(options[best]!)) best = i;
  });
  return best;
}

type Leg = {
  fromStopId: string;
  date: string;
  label: string;
  state:
    | { status: 'loading' }
    | { status: 'error' }
    | { status: 'done'; options: TrainOption[]; base: string; sample?: string; laterDay?: boolean };
  choice: number;
  use: boolean;
};

const summary = (o: TrainOption, lang: string, t: TFunction) => {
  const first = o.legs[0]!;
  const last = o.legs.at(-1)!;
  const plus = daysBetween(first.depDate, last.arrDate);
  return `${first.depTime} → ${last.arrTime}${plus ? ` +${plus}` : ''} · ${formatDuration(o.minutes, lang)} · ${
    o.legs.length === 1 ? t('search.direct') : t('search.changes', { count: o.legs.length - 1 })
  } · ${o.legs.map((l) => l.train).join(', ')}`;
};

/** Find trains for every journey that has none yet, and add them in one go. */
export function BulkTrainSheet({
  trip,
  onClose,
  onSave,
}: {
  trip: Trip;
  onClose: () => void;
  onSave: (fn: (t: Trip) => Trip) => void;
}) {
  const { t } = useTranslation();
  const lang = useLang();
  const [time, setTime] = useState<string>('07:00');
  const [legs, setLegs] = useState<Leg[]>(() => initialLegs(trip, lang));

  useEffect(() => {
    const ctrl = new AbortController();
    const todo = initialLegs(trip, lang);
    // Two searches at a time: quick for the traveller, light on the volunteer-run service.
    let next = 0;
    const work = async () => {
      while (next < todo.length && !ctrl.signal.aborted) {
        const i = next++;
        const leg = todo[i]!;
        const idx = trip.stops.findIndex((x) => x.id === leg.fromStopId);
        try {
          // Nothing in this window (some long trains leave once a day): look later the same day.
          let r = await searchTrains(
            trip.stops[idx]!.place,
            trip.stops[idx + 1]!.place,
            leg.date,
            time,
            ctrl.signal,
          );
          for (const later of TIMES.filter((x) => x > time)) {
            if (r.options.length && !r.laterDay) break;
            const first = r;
            r = await searchTrains(
              trip.stops[idx]!.place,
              trip.stops[idx + 1]!.place,
              leg.date,
              later,
              ctrl.signal,
            );
            // Keep a next-day train if the later window has nothing better.
            if (r.laterDay || !r.options.length) r = first.options.length ? first : r;
          }
          const best = pickBest(r.options);
          setLegs((ls) =>
            ls.map((l, j) =>
              j === i
                ? {
                    ...l,
                    state: {
                      status: 'done',
                      options: r.options,
                      base: r.sampleDate ?? leg.date,
                      sample: r.sampleDate,
                      laterDay: r.laterDay,
                    },
                    choice: best,
                    use: best >= 0,
                  }
                : l,
            ),
          );
        } catch (e) {
          if (e instanceof DOMException && e.name === 'AbortError') return;
          setLegs((ls) =>
            ls.map((l, j) => (j === i ? { ...l, state: { status: 'error' }, use: false } : l)),
          );
        }
      }
    };
    void Promise.all([work(), work()]);
    return () => ctrl.abort();
    // Searches run once per chosen time; the trip's empty legs are read when the sheet opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [time]);

  const chosen = legs.filter(
    (l) => l.use && l.state.status === 'done' && l.choice >= 0 && l.state.options[l.choice],
  );
  const sample = legs.find((l) => l.state.status === 'done' && l.state.sample);
  const save = () => {
    const picks = new Map<string, Segment[]>();
    for (const l of chosen)
      if (l.state.status === 'done')
        picks.set(l.fromStopId, optionToSegments(l.state.options[l.choice]!, l.state.base));
    onSave((x) => ({
      ...x,
      updatedAt: new Date().toISOString(),
      journeys: x.journeys.map((j) =>
        picks.has(j.fromStopId) && j.segments.length === 0
          ? { ...j, segments: picks.get(j.fromStopId)! }
          : j,
      ),
    }));
  };

  return (
    <Sheet
      title={t('bulk.title')}
      subtitle={t('bulk.subtitle', { count: legs.length })}
      onClose={onClose}
    >
      <div className={s.timeRow}>
        <span>{t('search.departAfter')}</span>
        <div className={ui.segCtl} role="group" aria-label={t('search.departAfter')}>
          {TIMES.map((v) => (
            <button
              key={v}
              type="button"
              aria-pressed={time === v}
              onClick={() => {
                setLegs(initialLegs(trip, lang));
                setTime(v);
              }}
            >
              {v}
            </button>
          ))}
        </div>
      </div>
      {sample?.state.status === 'done' && sample.state.sample && (
        <p className={s.sample}>{t('bulk.sample')}</p>
      )}
      <ul className={s.list}>
        {legs.map((l, i) => (
          <li key={l.fromStopId} className={s.leg}>
            <label className={s.head}>
              <input
                type="checkbox"
                checked={l.use}
                disabled={l.state.status !== 'done' || l.choice < 0}
                onChange={(e) => {
                  const use = e.target.checked;
                  setLegs((ls) => ls.map((x, j) => (j === i ? { ...x, use } : x)));
                }}
              />
              <b>{l.label}</b>
              <span className={s.date}>{formatDate(l.date, lang, { weekday: true })}</span>
            </label>
            {l.state.status === 'loading' && <p className={s.status}>{t('search.loading')}</p>}
            {l.state.status === 'error' && <p className={s.status}>{t('bulk.failed')}</p>}
            {l.state.status === 'done' && l.state.options.length === 0 && (
              <p className={s.status}>{t('bulk.none')}</p>
            )}
            {l.state.status === 'done' && l.state.laterDay && (
              <p className={s.status}>{t('search.laterDay')}</p>
            )}
            {l.state.status === 'done' && l.state.options.length > 0 && (
              <select
                className={s.pick}
                aria-label={t('bulk.pickFor', { route: l.label })}
                value={l.choice}
                onChange={(e) => {
                  const choice = Number(e.target.value);
                  setLegs((ls) => ls.map((x, j) => (j === i ? { ...x, choice, use: true } : x)));
                }}
              >
                {l.state.options.map((o, k) => (
                  <option key={k} value={k}>
                    {summary(o, lang, t)}
                  </option>
                ))}
              </select>
            )}
            {l.state.status === 'done' &&
              l.state.options[l.choice] &&
              daysBetween(
                l.state.options[l.choice]!.legs[0]!.depDate,
                l.state.options[l.choice]!.legs.at(-1)!.arrDate,
              ) > 0 && (
                <p className={s.status}>
                  <MoonIcon size={13} weight="fill" /> {t('bulk.overnight')}
                </p>
              )}
          </li>
        ))}
      </ul>
      <button
        type="button"
        className={`${ui.btnPrimary} ${ui.block}`}
        disabled={!chosen.length}
        onClick={save}
      >
        <CheckIcon size={18} weight="bold" />
        {t('bulk.add', { count: chosen.length })}
      </button>
      <p className={s.credit}>
        {t('search.credit')}{' '}
        <a href={TRANSITOUS_SOURCES_URL} target="_blank" rel="noopener noreferrer">
          Transitous
        </a>
      </p>
    </Sheet>
  );
}

function initialLegs(trip: Trip, lang: string): Leg[] {
  const sched = schedule(trip);
  return trip.journeys
    .filter((j) => j.segments.length === 0)
    .map((j) => {
      const i = trip.stops.findIndex((x) => x.id === j.fromStopId);
      return {
        fromStopId: j.fromStopId,
        date: sched[i]?.depart ?? trip.startDate,
        label: `${placeName(trip.stops[i]!.place, lang)} → ${placeName(trip.stops[i + 1]!.place, lang)}`,
        state: { status: 'loading' as const },
        choice: -1,
        use: false,
      };
    });
}
