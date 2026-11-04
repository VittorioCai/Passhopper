import { CaretRightIcon, WarningCircleIcon } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { eur } from '../lib';
import { passName } from './passText';
import p from './PassBar.module.css';
import { useTripContext } from './TripContext';

/** Compact wallet-style pass summary shown above the route and travel days. */
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
  const product = plan.result.product;
  const saving = analysis.tickets.mid - plan.total;
  const used = plan.passDays.length;
  return (
    <Link
      to={`/trip/${trip.id}/savings`}
      className={p.bar}
      aria-label={`${passName(product, t)}. ${t('pass.seeSavings')}`}
    >
      <span className={p.name}>{passName(product, t)}</span>
      <span className={p.save}>
        <small>{saving >= 0 ? t('pass.save') : t('pass.costsMore')}</small>
        {eur(Math.abs(saving))}
        <CaretRightIcon size={16} weight="bold" />
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
      {analysis.missingPrices > 0 && (
        <span className={p.hint}>{t('pass.missingPrices', { count: analysis.missingPrices })}</span>
      )}
    </Link>
  );
}
