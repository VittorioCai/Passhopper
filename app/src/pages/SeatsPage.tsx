import { ArrowSquareOutIcon, CheckIcon, FireIcon, MoonIcon } from '@phosphor-icons/react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTripContext } from '../components/TripContext';
import ui from '../components/ui.module.css';
import { UnverifiedNote } from '../components/UnverifiedNote';
import { CHANNEL_LINKS } from '../data/reservationRules';
import type { DayItem } from '../engine/days';
import type { Plan } from '../engine/optimizer';
import { formatDate } from '../model/dates';
import type { Trip } from '../model/schema';
import { upsertSegment } from '../model/trip';
import { eur, feeText, lineStyle, placeName, useLang } from '../lib';
import r from './RoutePage.module.css';
import s from './SeatsPage.module.css';

type Row = { item: DayItem; date: string; choice: Plan['days'][number]['choice'] };

function BookForm({ row, onDone }: { row: Row; onDone: () => void }) {
  const { t } = useTranslation();
  const { update } = useTripContext();
  const res = row.item.seg.reservation;
  const [ref, setRef] = useState(res?.ref ?? '');
  const [seat, setSeat] = useState(res?.seat ?? '');
  const [paid, setPaid] = useState(
    res?.paid !== undefined ? String(res.paid) : row.item.rule.fee ? String(row.item.rule.fee) : '',
  );
  return (
    <form
      className={ui.stack}
      onSubmit={(e) => {
        e.preventDefault();
        const amount = paid.trim() ? Number(paid) : undefined;
        update((x: Trip) =>
          upsertSegment(x, row.item.fromStopId, {
            ...row.item.seg,
            reservation: {
              status: 'booked',
              ref: ref.trim() || undefined,
              seat: seat.trim() || undefined,
              paid: amount !== undefined && amount >= 0 ? amount : undefined,
            },
          }),
        );
        onDone();
      }}
    >
      <div className={ui.grid2}>
        <label className={ui.field}>
          {t('seats.ref')}
          <input
            value={ref}
            onChange={(e) => setRef(e.target.value)}
            maxLength={40}
            className={s.mono}
          />
        </label>
        <label className={ui.field}>
          {t('seats.seat')}
          <input
            value={seat}
            onChange={(e) => setSeat(e.target.value)}
            maxLength={40}
            placeholder={t('seats.seatExample')}
          />
        </label>
        <label className={ui.field}>
          {t('seats.paid')}
          <input
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            value={paid}
            onChange={(e) => setPaid(e.target.value)}
          />
        </label>
      </div>
      <div className={ui.row}>
        <button type="submit" className={ui.btnPrimary}>
          {t('common.save')}
        </button>
        <button type="button" className={ui.btn} onClick={onDone}>
          {t('common.cancel')}
        </button>
      </div>
    </form>
  );
}

export function SeatsPage() {
  const { t } = useTranslation();
  const lang = useLang();
  const { trip, plan, update } = useTripContext();
  const [open, setOpen] = useState<string | null>(null);
  const stopName = (id: string) => placeName(trip.stops.find((x) => x.id === id)!.place, lang);
  const routeOf = (i: DayItem) => `${stopName(i.fromStopId)} → ${stopName(i.toStopId)}`;

  const rows: Row[] = (plan?.days ?? []).flatMap((d) =>
    d.items.map((item) => ({ item, date: d.date, choice: d.choice })),
  );
  const needs = rows.filter(
    (x) =>
      x.choice === 'pass' &&
      x.item.coverable &&
      (x.item.rule.reservation === 'mandatory' || x.item.rule.reservation === 'recommended'),
  );
  const booked = needs.filter((x) => x.item.seg.reservation?.status === 'booked');
  const todo = needs
    .filter((x) => x.item.seg.reservation?.status !== 'booked')
    .sort(
      (a, b) =>
        Number(b.item.rule.quota) - Number(a.item.rule.quota) || a.date.localeCompare(b.date),
    );
  const other = rows.filter((x) => !needs.includes(x));
  const feeTotal = needs.reduce((sum, x) => sum + x.item.rule.fee, 0);
  const unknownFees = needs.some((x) => !x.item.rule.feeKnown);
  const pct = needs.length ? booked.length / needs.length : 1;
  const C = 2 * Math.PI * 34;

  const trainTag = (i: DayItem) => (
    <span
      className={r.train}
      data-line
      style={lineStyle(trip.stops.find((x) => x.id === i.fromStopId)!.place.country)}
    >
      {i.seg.arrDay > i.seg.depDay && (
        <MoonIcon size={13} weight="fill" aria-label={t('route.nightTrain')} />
      )}
      {i.seg.trainNumber || t('route.train')}
    </span>
  );
  const need = (i: DayItem) =>
    i.rule.reservation === 'mandatory'
      ? !i.rule.feeKnown
        ? t('seats.requiredVaries')
        : i.rule.fee
          ? t('chip.seatRequiredFee', { fee: feeText(i.rule.fee, i.rule.feeMax) })
          : t('chip.seatRequiredFree')
      : t('chip.seatAdvised');

  if (!plan) {
    return (
      <div className={`${ui.card} ${ui.empty}`}>
        <p className={ui.muted}>{t('seats.empty')}</p>
      </div>
    );
  }

  return (
    <>
      <section className={`${ui.card} ${s.head}`}>
        <span className={s.ring}>
          <svg viewBox="0 0 80 80" aria-hidden="true">
            <circle cx="40" cy="40" r="34" fill="none" stroke="var(--surface-3)" strokeWidth="10" />
            <circle
              cx="40"
              cy="40"
              r="34"
              fill="none"
              stroke="var(--primary)"
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={C}
              strokeDashoffset={C * (1 - pct)}
            />
          </svg>
          <b>
            {booked.length}/{needs.length}
          </b>
        </span>
        <span className={ui.stack} style={{ gap: 2 }}>
          <span className={s.title}>
            {t('seats.summary', { count: needs.length, total: eur(feeTotal) })}
          </span>
          <span className={ui.muted} style={{ fontSize: 14 }}>
            {unknownFees ? t('seats.notIncludedVaries') : t('seats.notIncluded')}
          </span>
        </span>
      </section>

      {todo.length > 0 ? (
        <>
          <h2 className={ui.sectionTitle}>
            {t('seats.todo')} <span className={s.count}>{todo.length}</span>
          </h2>
          {todo.map((row) => {
            const { item } = row;
            const link = item.rule.channel ? CHANNEL_LINKS[item.rule.channel] : undefined;
            return (
              <article key={item.seg.id} className={`${ui.card} ${s.item}`}>
                <div className={s.top}>
                  {trainTag(item)}
                  <span className={s.route}>{routeOf(item)}</span>
                  <span className={s.date}>{formatDate(row.date, lang, { weekday: true })}</span>
                </div>
                <div className={ui.row}>
                  {item.rule.quota && (
                    <span className={s.hot}>
                      <FireIcon size={13} weight="fill" aria-hidden="true" />
                      {t('seats.popular')}
                    </span>
                  )}
                  <span
                    className={item.rule.reservation === 'mandatory' ? ui.chipMust : ui.chipRec}
                  >
                    {need(item)}
                  </span>
                  {link && (
                    <a className={s.link} href={link.url} target="_blank" rel="noopener noreferrer">
                      {t('seats.bookOn', { name: link.name })}
                      <ArrowSquareOutIcon size={14} weight="bold" aria-hidden="true" />
                    </a>
                  )}
                </div>
                {item.rule.quota && <p className={s.quota}>{t('seats.quotaNote')}</p>}
                {open === item.seg.id ? (
                  <BookForm row={row} onDone={() => setOpen(null)} />
                ) : (
                  <div className={ui.row}>
                    <button
                      type="button"
                      className={ui.btnPrimary}
                      onClick={() => setOpen(item.seg.id)}
                    >
                      <CheckIcon size={16} weight="bold" />
                      {t('seats.bookedIt')}
                    </button>
                    <button
                      type="button"
                      className={ui.btn}
                      onClick={() =>
                        update((x: Trip) => ({
                          ...x,
                          pass: {
                            productId: x.pass?.productId,
                            overrides: { ...(x.pass?.overrides ?? {}), [row.date]: 'ticket' },
                          },
                        }))
                      }
                    >
                      {t('seats.buyInstead')}
                    </button>
                  </div>
                )}
              </article>
            );
          })}
        </>
      ) : (
        needs.length > 0 && <p className={`${ui.card} ${ui.muted}`}>{t('seats.allBooked')}</p>
      )}

      {booked.length > 0 && (
        <>
          <h2 className={ui.sectionTitle}>
            {t('seats.booked')} <span className={s.count}>{booked.length}</span>
          </h2>
          <div className={ui.card}>
            {booked.map(({ item }) => (
              <div key={item.seg.id} className={ui.listItem}>
                {trainTag(item)}
                <span className={`${ui.grow} ${s.route}`}>{routeOf(item)}</span>
                <span className={ui.chipOk}>
                  <CheckIcon size={13} weight="bold" />
                  <span className={s.mono}>
                    {item.seg.reservation?.seat || item.seg.reservation?.ref || t('seats.booked')}
                  </span>
                </span>
                <button
                  type="button"
                  className={ui.btnGhost}
                  onClick={() =>
                    update((x: Trip) =>
                      upsertSegment(x, item.fromStopId, {
                        ...item.seg,
                        reservation: { status: 'todo' },
                      }),
                    )
                  }
                >
                  {t('seats.undo')}
                </button>
              </div>
            ))}
          </div>
        </>
      )}

      {other.length > 0 && (
        <>
          <h2 className={ui.sectionTitle}>
            {t('seats.other')} <span className={s.count}>{t('seats.otherNote')}</span>
          </h2>
          <div className={ui.card}>
            {other.map(({ item, choice }) => (
              <div key={item.seg.id} className={ui.listItem}>
                {trainTag(item)}
                <span className={`${ui.grow} ${s.route}`}>{routeOf(item)}</span>
                <span className={s.otherTag}>
                  {choice !== 'pass' || !item.coverable
                    ? t('seats.ticketIncl')
                    : item.rule.reservation === 'unknown'
                      ? t('chip.checkRules')
                      : item.rule.reservation === 'optional'
                        ? t('seats.optional')
                        : t('seats.justBoard')}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
      <UnverifiedNote />
    </>
  );
}
