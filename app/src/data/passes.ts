/**
 * Interrail Global Pass products and 2026 prices (EUR).
 * Status: NOT YET VERIFIED against interrail.eu. Figures come from secondary sources listed in
 * docs/RULES-AND-SOURCES.md R3. Combinations with no reliable figure are left out on purpose, and
 * the app says so instead of guessing.
 */
export type AgeGroup = 'youth' | 'adult' | 'senior';
export type TravelClass = 1 | 2;

export interface PassProduct {
  id: string;
  kind: 'flexi' | 'continuous';
  /** Travel days for a Flexi pass; length in days for a continuous pass. */
  days: number;
  /** Days from the first travel day within which all travel days must fall. */
  validityDays: number;
  /** Price per age group and class. Missing entries mean we have no reliable figure yet. */
  prices: Partial<Record<`${AgeGroup}-${TravelClass}`, number>>;
}

export const PASS_DATA_VERIFIED = false;
export const PASS_DATA_SOURCE = 'docs/RULES-AND-SOURCES.md R3 (secondary sources, 2026)';

export const PASSES: PassProduct[] = [
  {
    id: 'flexi-4-1m',
    kind: 'flexi',
    days: 4,
    validityDays: 31,
    prices: { 'youth-2': 212, 'adult-2': 283, 'senior-2': 255 },
  },
  {
    id: 'flexi-5-1m',
    kind: 'flexi',
    days: 5,
    validityDays: 31,
    prices: { 'youth-2': 239, 'adult-2': 318 },
  },
  {
    id: 'flexi-7-1m',
    kind: 'flexi',
    days: 7,
    validityDays: 31,
    prices: { 'youth-2': 286, 'adult-2': 381 },
  },
  {
    id: 'flexi-10-2m',
    kind: 'flexi',
    days: 10,
    validityDays: 61,
    prices: { 'youth-2': 335, 'adult-2': 447 },
  },
  {
    id: 'continuous-15',
    kind: 'continuous',
    days: 15,
    validityDays: 15,
    prices: { 'youth-2': 357, 'adult-2': 476 },
  },
  {
    id: 'continuous-22',
    kind: 'continuous',
    days: 22,
    validityDays: 22,
    prices: { 'youth-2': 440, 'adult-2': 586 },
  },
];

export const passById = (id: string | undefined) => PASSES.find((p) => p.id === id);
export const priceFor = (p: PassProduct, age: AgeGroup, cls: TravelClass) =>
  p.prices[`${age}-${cls}`];
