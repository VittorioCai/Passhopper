import type { Trip } from '../model/schema';
import { analyze, type Analysis } from './optimizer';

/** 'tickets' when buying every ticket is cheapest, otherwise the id of the cheapest pass. */
export const winner = (a: Analysis) =>
  !a.recommended || a.tickets.mid < a.recommended.cost.mid ? 'tickets' : a.recommended.product.id;

export interface Flip {
  segId: string;
  fromStopId: string;
  toStopId: string;
  trainNumber: string;
  /** The ticket price at which the answer changes (the low or high end of the range). */
  price: number;
  direction: 'cheaper' | 'pricier';
  /** What becomes the cheapest option at that price. */
  newWinner: string;
}

/**
 * Finds the train whose price matters most: if it cost the low (or high) end of its range while
 * everything else stays at typical prices, would a different option win? Picks the flip that needs
 * the smallest price change, since that is the most likely to happen.
 */
export function findFlip(trip: Trip, a: Analysis = analyze(trip)): Flip | null {
  const base = winner(a);
  let best: (Flip & { change: number }) | null = null;
  for (const j of trip.journeys) {
    for (const seg of j.segments) {
      const p = seg.price;
      if (!p || p.min === p.max) continue;
      const mid = (p.min + p.max) / 2;
      for (const [direction, price] of [
        ['cheaper', p.min],
        ['pricier', p.max],
      ] as const) {
        const alt: Trip = {
          ...trip,
          journeys: trip.journeys.map((x) =>
            x === j
              ? {
                  ...x,
                  segments: x.segments.map((s) =>
                    s === seg ? { ...s, price: { ...p, min: price, max: price } } : s,
                  ),
                }
              : x,
          ),
        };
        const w = winner(analyze(alt));
        const change = Math.abs(mid - price);
        if (w !== base && (!best || change < best.change)) {
          best = {
            segId: seg.id,
            fromStopId: j.fromStopId,
            toStopId: j.toStopId,
            trainNumber: seg.trainNumber,
            price,
            direction,
            newWinner: w,
            change,
          };
        }
      }
    }
  }
  if (!best) return null;
  const { segId, fromStopId, toStopId, trainNumber, price, direction, newWinner } = best;
  return { segId, fromStopId, toStopId, trainNumber, price, direction, newWinner };
}
