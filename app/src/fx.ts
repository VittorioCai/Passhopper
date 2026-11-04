/**
 * Prices in the traveller's own currency as a hint next to EUR (F6.5). Rates are the European
 * Central Bank's reference rates via Frankfurter (https://frankfurter.dev), fetched at most once a
 * day and kept on this device, so hints still show offline with the date of the rate.
 */
import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useSyncExternalStore } from 'react';
import { db } from './db/db';

export const CURRENCIES = [
  'USD',
  'GBP',
  'CNY',
  'AUD',
  'CAD',
  'JPY',
  'CHF',
  'SEK',
  'NOK',
  'DKK',
  'PLN',
  'CZK',
  'HUF',
  'KRW',
  'SGD',
  'HKD',
  'INR',
  'NZD',
] as const;
export type Currency = (typeof CURRENCIES)[number];

const PREF = 'passhopper.currency';
const listeners = new Set<() => void>();

function readPref(): Currency | null {
  try {
    const v = localStorage.getItem(PREF);
    return CURRENCIES.includes(v as Currency) ? (v as Currency) : null;
  } catch {
    return null;
  }
}

export function setCurrency(c: Currency | null) {
  try {
    if (c) localStorage.setItem(PREF, c);
    else localStorage.removeItem(PREF);
  } catch {
    // Not saved: the choice lasts until the page reloads.
  }
  listeners.forEach((l) => l());
}

export function useCurrency(): Currency | null {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    readPref,
    () => null,
  );
}

interface Rates {
  date: string;
  fetchedAt: number;
  rates: Partial<Record<Currency, number>>;
}

const KEY = 'fx';
const DAY = 24 * 3600 * 1000;
let inflight: Promise<void> | null = null;

export async function refreshRates(force = false) {
  const cached = (await db.meta.get(KEY))?.value as Rates | undefined;
  if (!force && cached && Date.now() - cached.fetchedAt < DAY) return;
  inflight ??= (async () => {
    try {
      const res = await fetch(
        `https://api.frankfurter.dev/v1/latest?base=EUR&symbols=${CURRENCIES.join(',')}`,
      );
      if (!res.ok) return;
      const data = (await res.json()) as { date?: string; rates?: Record<string, number> };
      if (!data.rates || !data.date) return;
      await db.meta.put({
        key: KEY,
        value: { date: data.date, fetchedAt: Date.now(), rates: data.rates },
      });
    } catch {
      // Offline or blocked: keep the last rates, or show no hints.
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

/** "≈ US$136" for an amount in EUR, or '' when no currency is chosen or no rate is known. */
export function useFx(lang: string) {
  const currency = useCurrency();
  const rates = useLiveQuery(async () => (await db.meta.get(KEY))?.value as Rates | undefined, []);
  useEffect(() => {
    if (currency) void refreshRates();
  }, [currency]);
  const rate = currency ? rates?.rates[currency] : undefined;
  const fmt =
    currency && rate
      ? new Intl.NumberFormat(lang, { style: 'currency', currency, maximumFractionDigits: 0 })
      : null;
  return {
    currency,
    date: rate ? rates?.date : undefined,
    alt: (eur: number) => (fmt && rate ? `≈ ${fmt.format(eur * rate)}` : ''),
  };
}
