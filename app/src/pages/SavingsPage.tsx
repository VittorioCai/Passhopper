import { CaretRightIcon, InfoIcon, LightbulbIcon } from '@phosphor-icons/react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { passName, passValidity } from '../components/passText';
import { useTripContext } from '../components/TripContext';
import ui from '../components/ui.module.css';
import { UnverifiedNote } from '../components/UnverifiedNote';
import { passById } from '../data/passes';
import { findFlip } from '../engine/sensitivity';
import { useCountUp } from '../hooks/useCountUp';
import { addDays, formatDate } from '../model/dates';
import type { Trip } from '../model/schema';
import { eur, eurRange, placeName, useLang } from '../lib';
import v from './SavingsPage.module.css';

export function SavingsPage() {
  const { t } = useTranslation();
  const lang = useLang();
  const { trip, analysis: a, plan, update } = useTripContext();
  const flip = useMemo(() => findFlip(trip, a), [trip, a]);
  const saving = plan ? a.tickets.mid - plan.total : 0;
  const shown = useCountUp(Math.round(Math.abs(saving)));
  const stop = (id: string) => placeName(trip.stops.find((s) => s.id === id)!.place, lang);

  if (!a.days.length) {
    return (
      <div className={`${ui.card} ${ui.empty}`}>
        <p className={ui.muted}>{t('savings.empty')}</p>
      </div>
    );
  }
  if (!plan) {
    return (
      <>
        <div className={`${ui.card} ${ui.stack}`}>
          <p className={ui.muted}>
            {t('pass.noPrices', {
              age: t(`wizard.${trip.traveller.ageGroup}`),
              cls: t(trip.traveller.travelClass === 1 ? 'wizard.first' : 'wizard.second'),
            })}
          </p>
          <p className={ui.muted}>
            {t('savings.ticketsOnly', { total: eurRange(a.tickets.min, a.tickets.max) })}
          </p>
        </div>
        <UnverifiedNote />
      </>
    );
  }

  const rec = a.recommended!;
  const product = plan.result.product;
  const used = plan.passDays.length;
  const first = plan.passDays[0];
  const worst = a.tickets.min - rec.cost.min;
  const ticketsWin = a.tickets.mid < rec.cost.mid;
  const maxV = Math.max(a.tickets.max, ...a.options.map((o) => o.cost.max));
  const scale = Math.max(200, Math.ceil(maxV / 200) * 200);
  const pct = (x: number) => `${((x / scale) * 100).toFixed(2)}%`;
  const choosePass = (id: string) =>
    update((x: Trip) => ({ ...x, pass: { productId: id, overrides: {} } }));
  const segRows = (
    items: {
      seg: { id: string; trainNumber: string };
      fromStopId: string;
      toStopId: string;
      amount: number;
    }[],
  ) =>
    items.map((i) => (
      <div key={i.seg.id} className={v.sub}>
        <span>
          {i.seg.trainNumber} · {stop(i.fromStopId)} → {stop(i.toStopId)}
        </span>
        <span>{eur(i.amount)}</span>
      </div>
    ));
  const feeItems = plan.days.flatMap((d) =>
    d.choice === 'pass'
      ? d.items.filter((i) => i.coverable && i.rule.fee).map((i) => ({ ...i, amount: i.rule.fee }))
      : [],
  );
  const ticketItems = plan.days.flatMap((d) =>
    d.items
      .filter((i) => !(d.choice === 'pass' && i.coverable))
      .map((i) => ({ ...i, amount: i.price?.mid ?? 0 })),
  );

  return (
    <>
      <section className={v.card} aria-label={t('savings.title')}>
        <div className={v.top}>
          <div>
            <div className={v.kicker}>GLOBAL PASS</div>
            <div className={v.name}>{passName(product, t)}</div>
          </div>
          <span className={v.who}>
            {t(`wizard.${trip.traveller.ageGroup}`)} ·{' '}
            {t(trip.traveller.travelClass === 1 ? 'wizard.first' : 'wizard.second')}
          </span>
        </div>
        <div className={v.big} aria-live="polite">
          <small>{saving >= 0 ? t('pass.save') : t('pass.costsMore')}</small>€{shown}
        </div>
        <div className={v.subline}>
          {ticketsWin
            ? t('savings.ticketsWin', { amount: eur(rec.cost.mid - a.tickets.mid) })
            : plan.result === rec
              ? t('savings.isBest')
              : t('savings.switchSaves', {
                  name: passName(rec.product, t),
                  amount: eur(plan.total - rec.cost.mid),
                })}
        </div>
        <div className={v.foot}>
          {product.kind === 'flexi' && (
            <span className={v.dots} aria-label={t('pass.daysUsed', { used, total: product.days })}>
              {Array.from({ length: Math.max(product.days, used) }, (_, i) => (
                <i key={i} className={i < used ? (i >= product.days ? v.over : v.on) : ''} />
              ))}
            </span>
          )}
          <span>
            {product.kind === 'flexi'
              ? `${t('pass.daysUsed', { used, total: product.days })} · `
              : ''}
            {first &&
              t('pass.validRange', {
                from: formatDate(first, lang),
                to: formatDate(addDays(first, product.validityDays - 1), lang),
              })}
          </span>
        </div>
      </section>

      <p className={`${v.note} ${worst < 0 ? v.warn : ''}`}>
        <LightbulbIcon size={18} weight="duotone" aria-hidden="true" />
        <span>
          {worst >= 0
            ? t('savings.stillSaves', { amount: eur(worst) })
            : t('savings.advanceFares', { amount: eur(-worst) })}
        </span>
      </p>
      {flip && (
        <p className={v.note}>
          <InfoIcon size={18} weight="duotone" aria-hidden="true" />
          <span>
            {t(flip.direction === 'cheaper' ? 'savings.flipCheaper' : 'savings.flipPricier', {
              train: `${flip.trainNumber} ${stop(flip.fromStopId)} → ${stop(flip.toStopId)}`,
              price: eur(flip.price),
              winner:
                flip.newWinner === 'tickets'
                  ? t('savings.winnerTickets')
                  : t('savings.winnerPass', { name: passName(passById(flip.newWinner)!, t) }),
            })}
          </span>
        </p>
      )}
      {a.missingPrices > 0 && (
        <p className={ui.muted} style={{ fontSize: 13 }}>
          {t('savings.missing', { count: a.missingPrices })}
        </p>
      )}

      <h2 className={ui.sectionTitle}>
        {t('savings.compare')} <span className={v.count}>{t('savings.tapToSwitch')}</span>
      </h2>
      <div className={ui.card}>
        <div className={v.chart}>
          {a.options.map((o) => {
            const sel = o.product.id === product.id;
            const Row = sel ? 'div' : 'button';
            return (
              <Row
                key={o.product.id}
                className={`${v.row} ${o === rec ? v.rec : ''}`}
                {...(sel
                  ? {}
                  : {
                      type: 'button' as const,
                      onClick: () => choosePass(o.product.id),
                      'aria-label': t('savings.useThis', {
                        name: passName(o.product, t),
                        total: eur(o.cost.mid),
                      }),
                    })}
              >
                <span className={v.nm}>
                  {passName(o.product, t)}
                  <small>
                    {passValidity(o.product, t)} · {eur(o.price)}
                  </small>
                  {sel && <span className={v.inUse}>{t('savings.inUse')}</span>}
                </span>
                <span className={v.track} aria-hidden="true">
                  <span
                    className={v.rng}
                    style={{
                      left: pct(o.cost.min),
                      width: `calc(${pct(o.cost.max)} - ${pct(o.cost.min)})`,
                    }}
                  />
                  <span className={v.fill} style={{ width: pct(o.cost.mid) }} />
                </span>
                <span className={v.val}>{eur(o.cost.mid)}</span>
              </Row>
            );
          })}
          <div className={`${v.row} ${v.tix}`}>
            <span className={v.nm}>
              {t('savings.allTickets')}
              <small>{t('savings.noPass')}</small>
            </span>
            <span className={v.track} aria-hidden="true">
              <span
                className={v.rng}
                style={{
                  left: pct(a.tickets.min),
                  width: `calc(${pct(a.tickets.max)} - ${pct(a.tickets.min)})`,
                }}
              />
              <span className={v.fill} style={{ width: pct(a.tickets.mid) }} />
            </span>
            <span className={v.val}>{eur(a.tickets.mid)}</span>
          </div>
        </div>
        <div className={v.axis} aria-hidden="true">
          <span />
          <span className={v.ticks}>
            <span>€0</span>
            <span>{eur(scale / 2)}</span>
            <span>{eur(scale)}</span>
          </span>
          <span />
        </div>
        <div className={v.legend}>
          <span>
            <i className={v.lgFill} />
            {t('savings.typical')}
          </span>
          <span>
            <i className={v.lgRange} />
            {t('savings.range')}
          </span>
        </div>
        {a.unpriced.length > 0 && (
          <p className={ui.muted} style={{ fontSize: 12, marginTop: 10 }}>
            {t('savings.unpriced', { count: a.unpriced.length })}
          </p>
        )}
      </div>

      <h2 className={ui.sectionTitle}>{t('savings.breakdown', { name: passName(product, t) })}</h2>
      <div className={`${ui.card} ${v.bd}`}>
        <div className={v.bdRow}>
          <span>{t('days.pass')}</span>
          <b>{eur(plan.result.price)}</b>
        </div>
        <details>
          <summary className={v.bdRow}>
            <span className={v.lb}>
              <CaretRightIcon size={14} weight="bold" aria-hidden="true" />
              {t('savings.fees', { count: feeItems.length })}
            </span>
            <b>{eur(plan.fees)}</b>
          </summary>
          {segRows(feeItems)}
        </details>
        <details>
          <summary className={v.bdRow}>
            <span className={v.lb}>
              <CaretRightIcon size={14} weight="bold" aria-hidden="true" />
              {t('savings.tickets', { count: ticketItems.length })}
            </span>
            <b>{eur(plan.ticketsCost)}</b>
          </summary>
          {segRows(ticketItems)}
        </details>
        <div className={`${v.bdRow} ${v.total}`}>
          <span>{t('savings.total')}</span>
          <b>{eur(plan.total)}</b>
        </div>
      </div>
      <UnverifiedNote />
    </>
  );
}
