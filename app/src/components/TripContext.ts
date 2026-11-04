import { useOutletContext } from 'react-router';
import type { Trip } from '../model/schema';

export interface TripContext {
  trip: Trip;
  /** Applies a change and saves it. */
  update: (fn: (t: Trip) => Trip) => void;
}

export const useTripContext = () => useOutletContext<TripContext>();
