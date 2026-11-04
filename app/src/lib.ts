import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import { COUNTRIES, isCountryCode } from './data/countries';
import type { Place } from './model/schema';

export function useLang() {
  const { i18n } = useTranslation();
  return i18n.language;
}

export const isZh = (lang: string) => lang.startsWith('zh');

/** City name in the UI language. Chinese falls back to the English name for cities typed in by hand. */
export const placeName = (p: Place, lang: string) => (isZh(lang) && p.zh ? p.zh : p.en);

export const countryName = (cc: string, lang: string) =>
  isCountryCode(cc) ? (isZh(lang) ? COUNTRIES[cc].zh : COUNTRIES[cc].en) : cc;

/** Inline variables for a country's metro-map colour; base.css picks the light or dark one. */
export function lineStyle(cc: string): CSSProperties {
  const [light, dark] = isCountryCode(cc) ? COUNTRIES[cc].line : ['#5A6478', '#A3ACBD'];
  return { '--lc-l': light, '--lc-d': dark } as CSSProperties;
}

export const eur = (n: number) => `€${Math.round(n)}`;
export const eurRange = (min: number, max: number) =>
  Math.round(min) === Math.round(max) ? eur(min) : `€${Math.round(min)}–${Math.round(max)}`;

/** A reservation fee as "€13", "€5.50" or "€13–17". */
export function feeText(min: number, max = min) {
  const f = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(2));
  return max > min ? `€${f(min)}–${f(max)}` : `€${f(min)}`;
}
