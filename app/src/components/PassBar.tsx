import { CaretRightIcon, WarningCircleIcon } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { eur } from '../lib';
import { tripRange } from '../model/trip';
import { passName } from './passText';
import p from './PassBar.module.css';
import { useTripContext } from './TripContext';

/** What the trains of this trip cost: the pass, seat reservations and other tickets. */
export function PassBar({ extra }: { extra?: string }) {
  const { t } = useTranslation();
  const { trip, plan, analysis } = useTripContext();
  if (!plan) {
    return (
      <div className={p.missing} role="note">
        <WarningCircleIcon size={20} weight="duotone" />
        <span>
          {t('pass.noPrices', {
            age: t(`wizard.${trip.traveller.ageGroup}`),
            cls: t(trip.traveller.travelClass === 1 ? 'wizard.first' : 'wizard.second'),
          })}
        </span>
      </div>
    );
  }
  if (!analysis.days.length)
    return (
      <div className={p.bar} role="note">
        <span className={p.name}>{t('pass.title')}</span>
        <span className={p.meta}>{t('pass.addTrains')}</span>
      </div>
    );
  const product = plan.result.product;
  const used = plan.passDays.length;
  // Trains that need their own ticket but have no price yet: the total is a lower bound.
  const unpriced = plan.days
    .flatMap((d) => d.items.filter((i) => d.choice !== 'pass' || !i.coverable))
    .filter((i) => !i.price).length;
  // Savings are a bonus: show them only once every train has a ticket price to compare with.
  const saving = analysis.tickets.mid - plan.total;
  const compared = analysis.missingPrices === 0 && saving > 0;
  const label = unpriced
    ? t('pass.totalAtLeast')
    : t(trip.traveller.count > 1 ? 'pass.totalEach' : 'pass.total');
  return (
    <Link
      to={`/trip/${trip.id}/savings`}
      className={p.bar}
      aria-label={`${label} ${eur(plan.total)}. ${t('pass.seeSavings')}`}
    >
      <span className={p.name}>
        {passName(product, t)} · {t(`wizard.${trip.traveller.ageGroup}`)}
        <CaretRightIcon size={16} weight="bold" />
      </span>
      <span className={p.money}>
        <b>{eur(plan.total)}</b>
        <span>
          {label}
          {!unpriced && (
            <small>
              {t('pass.perDay', { amount: eur(plan.total / Math.max(1, tripRange(trip).days)) })}
            </small>
          )}
        </span>
      </span>
      <span className={p.split}>
        <span>
          {t('pass.partPass')}
          <b>{eur(plan.result.price)}</b>
        </span>
        <span>
          {t('pass.partSeats')}
          <b>{eur(plan.fees)}</b>
        </span>
        <span>
          {t('pass.partTickets')}
          <b>
            {unpriced && !plan.ticketsCost ? '—' : `${eur(plan.ticketsCost)}${unpriced ? '+' : ''}`}
          </b>
        </span>
      </span>
      <span className={p.meta}>
        {product.kind === 'flexi' && (
          <span className={p.dots} aria-hidden="true">
            {Array.from({ length: Math.max(product.days, used) }, (_, i) => (
              <i key={i} className={i < used ? (i >= product.days ? p.over : p.on) : ''} />
            ))}
          </span>
        )}
        <span>
          {product.kind === 'flexi'
            ? t('pass.daysUsed', { used, total: product.days })
            : t('pass.inARow')}
        </span>
        {extra && <span>· {extra}</span>}
      </span>
      {unpriced > 0 && (
        <span className={p.hint}>{t('pass.unpricedTickets', { count: unpriced })}</span>
      )}
      {compared && (
        <span className={p.hint}>{t('pass.savesVsTickets', { amount: eur(saving) })}</span>
      )}
    </Link>
  );
}
