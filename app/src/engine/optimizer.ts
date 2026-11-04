import { PASSES, priceFor, type PassProduct } from '../data/passes';
import { addDays, daysBetween } from '../model/dates';
import type { Trip } from '../model/schema';
import { buildDays, type PriceKey, type TravelDay } from './days';

export interface PassResult {
  product: PassProduct;
  price: number;
  /** Total trip cost (pass + reservation fees on pass days + tickets for everything else). */
  cost: Record<PriceKey, number>;
  /** Best travel days at typical prices. */
  chosen: string[];
}

export interface Analysis {
  days: TravelDay[];
  /** Buying every ticket separately. */
  tickets: Record<PriceKey, number>;
  /** Passes we have prices for, cheapest first at typical prices. */
  options: PassResult[];
  /** Pass products with no reliable price for this traveller yet. */
  unpriced: PassProduct[];
  recommended?: PassResult;
  missingPrices: number;
}

/**
 * Best use of one pass. Every day's saving is independent, so within a validity window the best
 * choice is simply the most valuable days (DEVELOPMENT.md §3.5). We try every window start.
 */
export function bestDays(product: PassProduct, days: TravelDay[], k: PriceKey) {
  const usable = days.filter((d) => d.coverable && d.value[k] > 0);
  if (!usable.length) return { savings: 0, chosen: [] as string[] };
  let best = { savings: 0, chosen: [] as string[] };
  for (const startDay of usable) {
    const start = startDay.date;
    const end = addDays(start, product.validityDays - 1);
    // Night trains can't start on the last valid day (RULES-AND-SOURCES R5).
    const inWindow = usable.filter(
      (d) => d.date >= start && d.date <= end && !(d.date === end && d.night),
    );
    const chosen =
      product.kind === 'flexi'
        ? [...inWindow].sort((a, b) => b.value[k] - a.value[k]).slice(0, product.days)
        : inWindow;
    const savings = chosen.reduce((s, d) => s + d.value[k], 0);
    if (savings > best.savings) best = { savings, chosen: chosen.map((d) => d.date).sort() };
  }
  return best;
}

export function analyze(trip: Trip): Analysis {
  const days = buildDays(trip);
  const sum = (k: PriceKey) => days.reduce((s, d) => s + d.tickets[k], 0);
  const tickets = { min: sum('min'), mid: sum('mid'), max: sum('max') };
  const { ageGroup, travelClass } = trip.traveller;
  const options: PassResult[] = [];
  const unpriced: PassProduct[] = [];
  for (const product of PASSES) {
    const price = priceFor(product, ageGroup, travelClass);
    if (price === undefined) {
      unpriced.push(product);
      continue;
    }
    const cost = { min: 0, mid: 0, max: 0 };
    let chosen: string[] = [];
    for (const k of ['min', 'mid', 'max'] as PriceKey[]) {
      const b = bestDays(product, days, k);
      cost[k] = price + tickets[k] - b.savings;
      if (k === 'mid') chosen = b.chosen;
    }
    options.push({ product, price, cost, chosen });
  }
  options.sort((a, b) => a.cost.mid - b.cost.mid || a.price - b.price);
  return {
    days,
    tickets,
    options,
    unpriced,
    recommended: options[0],
    missingPrices: days.reduce((s, d) => s + d.missingPrices, 0),
  };
}

export type DayChoice = 'pass' | 'ticket' | 'locked';

export interface Plan {
  result: PassResult;
  isRecommended: boolean;
  days: (TravelDay & { choice: DayChoice; overridden: boolean })[];
  passDays: string[];
  fees: number;
  ticketsCost: number;
  total: number;
  errors: PlanError[];
}

export type PlanError =
  | { type: 'too_many_days'; used: number; allowed: number }
  | { type: 'outside_validity'; span: number; allowed: number }
  | { type: 'night_last_day'; date: string };

/** The pass in use (picked by the traveller, or the cheapest) and how each day is used. */
export function currentPlan(trip: Trip, a: Analysis = analyze(trip)): Plan | null {
  const picked = a.options.find((o) => o.product.id === trip.pass?.productId);
  const result = picked ?? a.recommended;
  if (!result) return null;
  const overrides = trip.pass?.overrides ?? {};
  const days = a.days.map((d) => {
    const o = overrides[d.date];
    const choice: DayChoice = !d.coverable
      ? 'locked'
      : (o ?? (result.chosen.includes(d.date) ? 'pass' : 'ticket'));
    return { ...d, choice, overridden: d.coverable && o !== undefined };
  });
  const passDays = days.filter((d) => d.choice === 'pass').map((d) => d.date);
  let fees = 0;
  let ticketsCost = 0;
  for (const d of days) {
    for (const i of d.items) {
      if (d.choice === 'pass' && i.coverable) fees += i.rule.fee;
      else ticketsCost += i.price?.mid ?? 0;
    }
  }
  const errors: PlanError[] = [];
  const p = result.product;
  if (p.kind === 'flexi' && passDays.length > p.days)
    errors.push({ type: 'too_many_days', used: passDays.length, allowed: p.days });
  if (passDays.length > 1) {
    const span = daysBetween(passDays[0]!, passDays[passDays.length - 1]!) + 1;
    if (span > p.validityDays)
      errors.push({ type: 'outside_validity', span, allowed: p.validityDays });
    const lastValid = addDays(passDays[0]!, p.validityDays - 1);
    const n = days.find((d) => d.date === lastValid && d.choice === 'pass' && d.night);
    if (n) errors.push({ type: 'night_last_day', date: n.date });
  }
  return {
    result,
    isRecommended: result === a.recommended,
    days,
    passDays,
    fees,
    ticketsCost,
    total: result.price + fees + ticketsCost,
    errors,
  };
}
