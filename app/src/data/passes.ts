/**
 * Interrail Global Pass products and prices (EUR), as shown on the official Global Pass page
 * (interrail.com/en/interrail-passes/global-pass) on 16 Nov 2026, one traveller at a time.
 * Prices can change for a new year; the app tells travellers to confirm before buying.
 * See docs/RULES-AND-SOURCES.md R3.
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
  /** Months for continuous passes sold by the month ("1 month in a row"), for naming. */
  months?: number;
  /** Price per age group and class. Missing entries mean we have no reliable figure yet. */
  prices: Partial<Record<`${AgeGroup}-${TravelClass}`, number>>;
}

export const PASS_DATA_VERIFIED = true;
export const PASS_DATA_CHECKED = '2026-11-16';
export const PASS_DATA_SOURCE = 'https://www.interrail.com/en/interrail-passes/global-pass';

// Continuous passes sold by the month run to the same date the next month(s); we count the
// shortest such span (30, 59 and 89 days) so the planner never relies on a day that isn't covered.
export const PASSES: PassProduct[] = [
  {
    id: 'flexi-4-1m',
    kind: 'flexi',
    days: 4,
    validityDays: 31,
    prices: {
      'youth-2': 212,
      'youth-1': 275,
      'adult-2': 283,
      'adult-1': 367,
      'senior-2': 255,
      'senior-1': 330,
    },
  },
  {
    id: 'flexi-5-1m',
    kind: 'flexi',
    days: 5,
    validityDays: 31,
    prices: {
      'youth-2': 239,
      'youth-1': 309,
      'adult-2': 318,
      'adult-1': 413,
      'senior-2': 286,
      'senior-1': 371,
    },
  },
  {
    id: 'flexi-7-1m',
    kind: 'flexi',
    days: 7,
    validityDays: 31,
    prices: {
      'youth-2': 286,
      'youth-1': 371,
      'adult-2': 381,
      'adult-1': 495,
      'senior-2': 343,
      'senior-1': 445,
    },
  },
  {
    id: 'flexi-10-2m',
    kind: 'flexi',
    days: 10,
    validityDays: 61,
    prices: {
      'youth-2': 335,
      'youth-1': 435,
      'adult-2': 447,
      'adult-1': 581,
      'senior-2': 402,
      'senior-1': 522,
    },
  },
  {
    id: 'flexi-15-2m',
    kind: 'flexi',
    days: 15,
    validityDays: 61,
    prices: {
      'youth-2': 415,
      'youth-1': 538,
      'adult-2': 553,
      'adult-1': 718,
      'senior-2': 498,
      'senior-1': 646,
    },
  },
  {
    id: 'continuous-15',
    kind: 'continuous',
    days: 15,
    validityDays: 15,
    prices: {
      'youth-2': 357,
      'youth-1': 463,
      'adult-2': 476,
      'adult-1': 618,
      'senior-2': 428,
      'senior-1': 556,
    },
  },
  {
    id: 'continuous-22',
    kind: 'continuous',
    days: 22,
    validityDays: 22,
    prices: {
      'youth-2': 440,
      'youth-1': 570,
      'adult-2': 586,
      'adult-1': 761,
      'senior-2': 527,
      'senior-1': 684,
    },
  },
  {
    id: 'continuous-1m',
    kind: 'continuous',
    days: 30,
    validityDays: 30,
    months: 1,
    prices: {
      'youth-2': 522,
      'youth-1': 678,
      'adult-2': 696,
      'adult-1': 904,
      'senior-2': 626,
      'senior-1': 813,
    },
  },
  {
    id: 'continuous-2m',
    kind: 'continuous',
    days: 59,
    validityDays: 59,
    months: 2,
    prices: {
      'youth-2': 620,
      'youth-1': 804,
      'adult-2': 826,
      'adult-1': 1073,
      'senior-2': 743,
      'senior-1': 965,
    },
  },
  {
    id: 'continuous-3m',
    kind: 'continuous',
    days: 89,
    validityDays: 89,
    months: 3,
    prices: {
      'youth-2': 717,
      'youth-1': 931,
      'adult-2': 956,
      'adult-1': 1242,
      'senior-2': 860,
      'senior-1': 1117,
    },
  },
];

export const passById = (id: string | undefined) => PASSES.find((p) => p.id === id);
export const priceFor = (p: PassProduct, age: AgeGroup, cls: TravelClass) =>
  p.prices[`${age}-${cls}`];
