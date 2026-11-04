import {
  ArrowCounterClockwiseIcon,
  CheckIcon,
  LockSimpleIcon,
  MoonIcon,
  WarningIcon,
} from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import { FxHint } from '../components/FxHint';
import { PassBar } from '../components/PassBar';
import { TripCalendar } from '../components/TripCalendar';
import { passName, passValidity } from '../components/passText';
import { useTripContext } from '../components/TripContext';
import ui from '../components/ui.module.css';
import { UnverifiedNote } from '../components/UnverifiedNote';
import type { DayItem } from '../engine/days';
import type { Plan, PlanError } from '../engine/optimizer';
import { addDays, dateParts, formatDate } from '../model/dates';
import type { Trip } from '../model/schema';
import { tripRange } from '../model/trip';
import { countryName, eur, placeName, useLang } from '../lib';
import d from './DaysPage.module.css';

type PlanDay = Plan['days'][number];

export function DaysPage() {
  const { t } = useTranslation();
  const lang = useLang();
  const { trip, update, analysis, plan } = useTripContext();
  const stopName = (id: string) => placeName(trip.stops.find((s) => s.id === id)!.place, lang);
  const routeOf = (i: DayItem) => `${stopName(i.fromStopId)} → ${stopName(i.toStopId)}`;
  const home =
    trip.traveller.residence.type === 'europe'
      ? countryName(trip.traveller.residence.country, lang)
      : '';

  const setPass = (productId: string) =>
    update((x: Trip) => ({ ...x, pass: { productId, overrides: {} } }));
  const setOverride = (date: string, choice: 'pass' | 'ticket') =>
    update((x: Trip) => ({
      ...x,
      pass: {
        productId: x.pass?.productId,
        overrides: { ...(x.pass?.overrides ?? {}), [date]: choice },
      },
    }));
  const reset = () =>
    update((x: Trip) => ({ ...x, pass: { productId: x.pass?.productId, overrides: {} } }));

  const reason = (day: PlanDay) => {
    const covered = day.items.filter((i) => i.coverable);
    const price = day.tickets.mid;
    if (day.choice === 'locked') {
      const r = day.items[0]!.notCoveredReason;
      const base =
        r === 'home_domestic'
          ? t('days.reasonHome', { country: home })
          : r === 'home_second_out' || r === 'home_second_in'
            ? t('days.reasonHomeSecond')
            : t('days.reasonOperator');
      return day.missingPrices ? base : `${base} · ${t('days.ticketPrice', { price: eur(price) })}`;
    }
    if (day.missingPrices === day.items.length) return t('days.addPrice');
    const fee = covered.reduce((s, i) => s + i.rule.fee, 0);
    const kind = covered.find((i) => i.kind === 'outbound' || i.kind === 'inbound')?.kind;
    const suffix = kind ? ` · ${t(`chip.${kind}`)}` : '';
    if (day.choice === 'pass') {
      return (
        (fee
          ? t('days.savesWithFee', { save: eur(day.value.mid), price: eur(price), fee: eur(fee) })
          : t('days.saves', { save: eur(day.value.mid), price: eur(price) })) + suffix
      );
    }
    return (
      t('days.ticketInstead', { price: eur(price), save: eur(Math.max(0, day.value.mid)) }) + suffix
    );
  };

  const errorText = (e: PlanError) =>
    e.type === 'too_many_days'
      ? t('days.errTooMany', { used: e.used, allowed: e.allowed })
      : e.type === 'outside_validity'
        ? t('days.errValidity', { span: e.span, allowed: e.allowed })
        : t('days.errNightLast', { date: formatDate(e.date, lang) });

  if (!analysis.days.length) {
    return (
      <>
        <PassBar />
        <div className={`${ui.card} ${ui.empty}`}>
          <p className={ui.muted}>{t('days.empty')}</p>
        </div>
      </>
    );
  }

  const shownDays =
    plan?.days ??
    analysis.days.map((x) => ({
      ...x,
      choice: x.coverable ? ('ticket' as const) : ('locked' as const),
      overridden: false,
    }));
  const first = plan?.passDays[0];
  const product = plan?.result.product;
  return (
    <>
      <PassBar
        extra={
          first && product
            ? t('pass.validRange', {
                from: formatDate(first, lang),
                to: formatDate(addDays(first, product.validityDays - 1), lang),
              })
            : undefined
        }
      />
      {plan && (
        <label className={ui.field}>
          {t('days.whichPass')}
          <select value={plan.result.product.id} onChange={(e) => setPass(e.target.value)}>
            {analysis.options.map((o) => (
              <option key={o.product.id} value={o.product.id}>
                {passName(o.product, t)} · {passValidity(o.product, t)} · {eur(o.price)}
                {o === analysis.recommended ? ` · ${t('days.cheapest')}` : ''}
              </option>
            ))}
          </select>
        </label>
      )}
      {plan?.errors.map((e) => (
        <p key={e.type} className={d.error} role="alert">
          <WarningIcon size={18} weight="fill" aria-hidden="true" />
          {errorText(e)}
        </p>
      ))}
      <TripCalendar
        start={trip.startDate}
        end={tripRange(trip).end}
        days={shownDays.map((x) => ({
          date: x.date,
          choice: x.choice,
          night: x.items.some((i) => i.seg.arrDay > i.seg.depDay),
        }))}
        validFrom={first}
        validTo={first && product ? addDays(first, product.validityDays - 1) : undefined}
        lang={lang}
      />
      <p className={d.legend}>{t('days.flipHint')}</p>
      <ol className={d.days}>
        {shownDays.map((day) => {
          const parts = dateParts(day.date, lang);
          const isErr =
            !!plan?.errors.some((e) => e.type === 'too_many_days') && day.choice === 'pass';
          const night = day.items.some((i) => i.seg.arrDay > i.seg.depDay);
          return (
            <li
              key={day.date}
              id={`day-${day.date}`}
              className={`${d.day} ${day.choice === 'pass' ? d.isPass : ''} ${isErr ? d.err : ''}`}
            >
              <span
                className={d.datebox}
                aria-label={formatDate(day.date, lang, { weekday: true })}
              >
                <span>{parts.month}</span>
                <b>{parts.day}</b>
                <span>{parts.weekday}</span>
              </span>
              <span className={d.route}>
                {night && <MoonIcon size={14} weight="fill" aria-label={t('route.nightTrain')} />}
                {[...new Set(day.items.map(routeOf))].join(', ')}
              </span>
              <span className={d.why}>{reason(day)}</span>
              {day.choice === 'locked' ? (
                <span className={`${d.switch} ${d.locked}`} title={t('days.lockedHint')}>
                  <LockSimpleIcon size={14} weight="fill" aria-hidden="true" />
                  {t('chip.ticket')}
                </span>
              ) : (
                <button
                  type="button"
                  role="switch"
                  aria-checked={day.choice === 'pass'}
                  aria-label={t('days.useTravelDay', { date: formatDate(day.date, lang) })}
                  className={`${d.switch} ${day.choice === 'pass' ? d.on : ''}`}
                  disabled={!plan}
                  onClick={() => setOverride(day.date, day.choice === 'pass' ? 'ticket' : 'pass')}
                >
                  <span>{t('days.pass')}</span>
                  <span>{t('chip.ticket')}</span>
                </button>
              )}
            </li>
          );
        })}
      </ol>
      {plan && (
        <div className={d.total} aria-live="polite">
          <div>
            <div className={d.tl}>{t('days.total')}</div>
            <div className={d.tv}>
              {eur(plan.total)}
              <FxHint eur={plan.total} />
            </div>
          </div>
          {Object.keys(trip.pass?.overrides ?? {}).length ? (
            <button type="button" className={d.reset} onClick={reset}>
              <ArrowCounterClockwiseIcon size={16} weight="bold" />
              {t('days.reset')}
            </button>
          ) : (
            <span className={ui.chipOk}>
              <CheckIcon size={14} weight="bold" />
              {t('days.best')}
            </span>
          )}
        </div>
      )}
      <UnverifiedNote />
    </>
  );
}
