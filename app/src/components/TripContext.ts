import { useOutletContext } from 'react-router';
import type { Analysis, Plan } from '../engine/optimizer';
import type { Trip } from '../model/schema';

export interface TripContext {
  trip: Trip;
  /** Applies a change and saves it. */
  update: (fn: (t: Trip) => Trip) => void;
  analysis: Analysis;
  /** Null when we have no pass prices for this traveller's age group and class. */
  plan: Plan | null;
}

export const useTripContext = () => useOutletContext<TripContext>();
