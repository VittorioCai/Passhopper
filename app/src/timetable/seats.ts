import { ruleFor, trainType } from '../engine/coverage';
import type { TrainOption } from './transitous';

export interface OptionSeats {
  /** At least one train of the option needs a paid or free reservation on a pass. */
  needed: boolean;
  /** Reservation fees in EUR (lowest and highest when they vary). */
  fee: number;
  feeMax: number;
  /** False when we don't know the rules for one of its trains. */
  known: boolean;
}

/**
 * What a timetable option would add in seat reservations when travelling on the pass. Countries
 * are those of the journey's two cities, the same approximation the travel-day planner uses.
 */
export function optionSeats(
  o: TrainOption,
  fromCountry: string,
  toCountry: string,
  travelClass: 1 | 2,
): OptionSeats {
  let needed = false;
  let fee = 0;
  let feeMax = 0;
  let known = true;
  for (const l of o.legs) {
    const r = ruleFor(trainType(l.train), fromCountry, toCountry, travelClass);
    if (r.reservation === 'unknown') known = false;
    if (r.reservation === 'mandatory') {
      needed = true;
      fee += r.fee;
      feeMax += r.feeMax;
    }
  }
  return { needed, fee, feeMax, known };
}

/** Extra minutes a traveller would accept to skip a reservation, for picking options. */
export const SKIP_SEAT_MINUTES = 90;
