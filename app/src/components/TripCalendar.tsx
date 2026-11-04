import { MoonIcon } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import { addDays, daysBetween } from '../model/dates';
import type { DayChoice } from '../engine/optimizer';
import s from './TripCalendar.module.css';

export interface CalendarDay {
  date: string;
  choice: DayChoice;
  night: boolean;
}

/** Monday-first month grids from `start` to `end`, only the weeks the trip touches (null = padding). */
export function monthGrids(start: string, end: string) {
  const months: { key: string; cells: (string | null)[] }[] = [];
  let d = `${start.slice(0, 7)}-01`;
  while (d <= end) {
    const key = d.slice(0, 7);
    const weekday = (new Date(`${d}T12:00:00Z`).getUTCDay() + 6) % 7;
    const cells: (string | null)[] = Array(weekday).fill(null);
    let x = d;
    while (x.slice(0, 7) === key) {
      cells.push(x);
      x = addDays(x, 1);
    }
    while (cells.length % 7) cells.push(null);
    // Keep only the weeks that touch the trip.
    const weeks: (string | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) {
      const week = cells.slice(i, i + 7);
      if (week.some((c) => c && c >= start && c <= end)) weeks.push(week);
    }
    months.push({ key, cells: weeks.flat() });
    d = x;
  }
  return months;
}

/** The whole trip as a calendar (F2.2): travel days, ticket days, stays, and the pass's validity. */
export function TripCalendar({
  start,
  end,
  days,
  validFrom,
  validTo,
  lang,
}: {
  start: string;
  end: string;
  days: CalendarDay[];
  validFrom?: string;
  validTo?: string;
  lang: string;
}) {
  const { t } = useTranslation();
  const byDate = new Map(days.map((d) => [d.date, d]));
  const weekdays = Array.from({ length: 7 }, (_, i) =>
    new Intl.DateTimeFormat(lang, { weekday: 'narrow', timeZone: 'UTC' }).format(
      new Date(Date.UTC(2024, 0, 1 + i)),
    ),
  );
  const monthName = (key: string) =>
    new Intl.DateTimeFormat(lang, { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(
      new Date(`${key}-15T12:00:00Z`),
    );
  const jump = (date: string) =>
    document.getElementById(`day-${date}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });

  return (
    <section className={s.card} aria-label={t('calendar.title')}>
      {monthGrids(start, end).map((m) => (
        <div key={m.key} className={s.month}>
          <h3 className={s.monthName}>{monthName(m.key)}</h3>
          <div className={s.grid}>
            {weekdays.map((w, i) => (
              <span key={i} className={s.wd} aria-hidden="true">
                {w}
              </span>
            ))}
            {m.cells.map((date, i) => {
              if (!date) return <span key={i} />;
              const inTrip = date >= start && date <= end;
              const day = byDate.get(date);
              const valid =
                inTrip && !!validFrom && !!validTo && date >= validFrom && date <= validTo;
              const cls = [
                s.cell,
                inTrip ? s.inTrip : s.out,
                valid ? s.valid : '',
                day?.choice === 'pass' ? s.pass : '',
                day?.choice === 'ticket' ? s.ticket : '',
                day?.choice === 'locked' ? s.locked : '',
              ].join(' ');
              const label = `${date}: ${
                day
                  ? t(day.choice === 'pass' ? 'calendar.pass' : 'calendar.ticket')
                  : inTrip
                    ? t('calendar.stay')
                    : ''
              }`;
              const n = Number(date.slice(8));
              return day ? (
                <button
                  key={i}
                  type="button"
                  className={cls}
                  aria-label={label}
                  onClick={() => jump(date)}
                >
                  {n}
                  {day.night && <MoonIcon size={9} weight="fill" className={s.moon} />}
                </button>
              ) : (
                <span key={i} className={cls} aria-label={inTrip ? label : undefined}>
                  {n}
                </span>
              );
            })}
          </div>
        </div>
      ))}
      <div className={s.legend}>
        <span>
          <i className={s.lgPass} />
          {t('calendar.pass')}
        </span>
        <span>
          <i className={s.lgTicket} />
          {t('calendar.ticket')}
        </span>
        <span>
          <i className={s.lgStay} />
          {t('calendar.stay')}
        </span>
        {validFrom && (
          <span>
            <i className={s.lgValid} />
            {t('calendar.valid', { count: daysBetween(validFrom, validTo!) + 1 })}
          </span>
        )}
      </div>
    </section>
  );
}
