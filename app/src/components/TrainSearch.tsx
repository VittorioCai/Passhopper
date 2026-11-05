import { ArrowRightIcon, MoonIcon } from '@phosphor-icons/react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { daysBetween, formatDate, formatDuration } from '../model/dates';
import type { Segment, Trip } from '../model/schema';
import { newId, schedule } from '../model/trip';
import {
  searchTrains,
  TimetableError,
  TRANSITOUS_SOURCES_URL,
  type SearchResult,
  type TrainOption,
} from '../timetable/transitous';
import { useLang } from '../lib';
import s from './TrainSearch.module.css';
import ui from './ui.module.css';

const TIMES = [
  ['07:00', 'search.morning'],
  ['11:00', 'search.midday'],
  ['15:00', 'search.afternoon'],
  ['19:00', 'search.evening'],
] as const;

/** Trains of one option as segments, with days counted from the date we searched. */
export function optionToSegments(o: TrainOption, baseDate: string): Segment[] {
  return o.legs.map((l) => ({
    id: newId(),
    trainNumber: l.train.slice(0, 40),
    from: l.from.slice(0, 80),
    to: l.to.slice(0, 80),
    depDay: Math.max(0, daysBetween(baseDate, l.depDate)),
    depTime: l.depTime,
    arrDay: Math.max(0, daysBetween(baseDate, l.arrDate)),
    arrTime: l.arrTime,
    source: 'transitous' as const,
  }));
}

export function TrainSearch({
  trip,
  fromStopId,
  replacing,
  onPick,
}: {
  trip: Trip;
  fromStopId: string;
  /** The journey already has trains; picking replaces them. */
  replacing: boolean;
  onPick: (segments: Segment[]) => void;
}) {
  const { t } = useTranslation();
  const lang = useLang();
  const idx = trip.stops.findIndex((x) => x.id === fromStopId);
  const from = trip.stops[idx]!.place;
  const to = trip.stops[idx + 1]!.place;
  const date = schedule(trip)[idx]?.depart ?? trip.startDate;
  const [time, setTime] = useState<string>('07:00');
  const key = `${from.id}|${to.id}|${date}|${time}`;
  const [done, setDone] = useState<
    | { key: string; status: 'done'; result: SearchResult }
    | { key: string; status: 'error'; kind: string }
    | null
  >(null);
  const state = done?.key === key ? done : { status: 'loading' as const };

  useEffect(() => {
    const ctrl = new AbortController();
    searchTrains(from, to, date, time, ctrl.signal)
      .then((result) => setDone({ key, status: 'done', result }))
      .catch((e: unknown) => {
        if (e instanceof DOMException && e.name === 'AbortError') return;
        setDone({ key, status: 'error', kind: e instanceof TimetableError ? e.kind : 'network' });
      });
    return () => ctrl.abort();
    // The key covers every input.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return (
    <div className={s.wrap}>
      <div className={s.when}>
        <span className={s.date}>{formatDate(date, lang, { weekday: true })}</span>
        <div className={s.timeRow}>
          <span>{t('search.departAfter')}</span>
          <div className={ui.segCtl} role="group" aria-label={t('search.departAfter')}>
            {TIMES.map(([v, label]) => (
              <button
                key={v}
                type="button"
                aria-pressed={time === v}
                aria-label={`${t(label)} ${v}`}
                onClick={() => setTime(v)}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      </div>

      {state.status === 'loading' && (
        <div className={s.loading} role="status">
          {t('search.loading')}
        </div>
      )}
      {state.status === 'error' && (
        <p className={ui.fieldError} role="alert">
          {t(state.kind === 'no_place' ? 'search.noPlace' : 'search.failed')}
        </p>
      )}
      {state.status === 'done' && (
        <>
          {state.result.sampleDate && (
            <p className={s.sample}>
              {t('search.sample', {
                date: formatDate(state.result.sampleDate, lang, { weekday: true }),
              })}
            </p>
          )}
          {state.result.laterDay && <p className={s.sample}>{t('search.laterDay')}</p>}
          {state.result.options.length === 0 ? (
            <p className={ui.muted}>{t('search.none')}</p>
          ) : (
            <ul className={s.list}>
              {state.result.options.map((o, i) => {
                const first = o.legs[0]!;
                const last = o.legs[o.legs.length - 1]!;
                const base = state.result.sampleDate ?? date;
                const nextDay = daysBetween(first.depDate, last.arrDate);
                return (
                  <li key={i}>
                    <button
                      type="button"
                      className={s.option}
                      aria-label={t('search.useOption', {
                        trains: o.legs.map((l) => l.train).join(', '),
                        dep: first.depTime,
                      })}
                      onClick={() => onPick(optionToSegments(o, base))}
                    >
                      <span className={s.times}>
                        {first.depTime}
                        <ArrowRightIcon size={14} weight="bold" />
                        {last.arrTime}
                        {nextDay > 0 && <sup>+{nextDay}</sup>}
                        {nextDay > 0 && (
                          <MoonIcon size={14} weight="fill" aria-label={t('route.nightTrain')} />
                        )}
                      </span>
                      <span className={s.meta}>
                        {formatDuration(o.minutes, lang)} ·{' '}
                        {o.legs.length === 1
                          ? t('search.direct')
                          : t('search.changes', { count: o.legs.length - 1 })}
                      </span>
                      <span className={s.trains}>
                        {o.legs.map((l, j) => (
                          <span key={j} className={s.train}>
                            {l.train}
                          </span>
                        ))}
                      </span>
                      <span className={s.stations}>
                        {first.from} → {last.to}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          {replacing && state.result.options.length > 0 && (
            <p className={ui.muted}>{t('search.replaces')}</p>
          )}
        </>
      )}
      <p className={s.credit}>
        {t('search.credit')}{' '}
        <a href={TRANSITOUS_SOURCES_URL} target="_blank" rel="noopener noreferrer">
          Transitous
        </a>
      </p>
    </div>
  );
}
