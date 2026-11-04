import type { CountryCode } from './countries';

/**
 * Seat reservation and pass coverage by train type.
 * Status: NOT YET VERIFIED against interrail.eu. Based on docs/RULES-AND-SOURCES.md R6 and
 * operator practice; fees are indicative. Anything we have no rule for is reported as "unknown"
 * so the traveller checks it, rather than being guessed.
 */
export type Coverage = 'covered' | 'not_covered';
export type ReservationNeed = 'mandatory' | 'recommended' | 'optional' | 'none';
export type Channel =
  'db' | 'sbb' | 'oebb' | 'trenitalia' | 'sncf' | 'renfe' | 'eurostar' | 'cd' | 'ns' | 'sncb';

export interface ReservationRule {
  id: string;
  /** Train type prefixes as written before the number, e.g. "FR" in "FR 9709". */
  types: string[];
  /** Country the train departs from. Omit for rules that apply everywhere. */
  country?: CountryCode;
  /** Only when the train continues into one of these countries. */
  toCountries?: CountryCode[];
  coverage: Coverage;
  reservation: ReservationNeed;
  /** Indicative reservation fee in EUR for 2nd and 1st class. Missing = varies or unknown. */
  fee?: { second?: number; first?: number };
  /** Note shown with the fee, as a translation key. */
  feeNote?: 'varies' | 'range_10_20' | 'range_10_13';
  /** Pass holders get a limited number of seats on this train. */
  quota?: boolean;
  channel?: Channel;
}

export const RESERVATION_DATA_VERIFIED = false;
export const RESERVATION_DATA_SOURCE = 'docs/RULES-AND-SOURCES.md R6 (secondary sources, 2026)';

/** Most specific rules first: a rule with toCountries beats one without; country beats no country. */
export const RESERVATION_RULES: ReservationRule[] = [
  // Night trains and Eurostar, wherever they depart.
  {
    id: 'nightjet',
    types: ['NJ', 'EN'],
    coverage: 'covered',
    reservation: 'mandatory',
    feeNote: 'varies',
    quota: true,
    channel: 'oebb',
  },
  {
    id: 'eurostar',
    types: ['EST', 'EUROSTAR', 'ES'],
    coverage: 'covered',
    reservation: 'mandatory',
    feeNote: 'varies',
    quota: true,
    channel: 'eurostar',
  },
  // Switzerland to Italy
  {
    id: 'ch-it-ec',
    types: ['EC'],
    country: 'CH',
    toCountries: ['IT'],
    coverage: 'covered',
    reservation: 'recommended',
    fee: { second: 10, first: 10 },
    channel: 'sbb',
  },
  // Germany
  {
    id: 'de-long',
    types: ['ICE', 'IC', 'EC', 'ECE'],
    country: 'DE',
    coverage: 'covered',
    reservation: 'optional',
    channel: 'db',
  },
  {
    id: 'de-regional',
    types: ['RE', 'RB', 'S', 'IRE'],
    country: 'DE',
    coverage: 'covered',
    reservation: 'none',
  },
  { id: 'de-flix', types: ['FLX'], country: 'DE', coverage: 'not_covered', reservation: 'none' },
  // Austria
  {
    id: 'at-long',
    types: ['RJ', 'RJX', 'IC', 'EC', 'ICE'],
    country: 'AT',
    coverage: 'covered',
    reservation: 'optional',
    channel: 'oebb',
  },
  {
    id: 'at-regional',
    types: ['REX', 'R', 'S', 'CJX'],
    country: 'AT',
    coverage: 'covered',
    reservation: 'none',
  },
  // Switzerland
  {
    id: 'ch-all',
    types: ['IC', 'ICN', 'IR', 'EC', 'RE', 'R', 'S', 'PE'],
    country: 'CH',
    coverage: 'covered',
    reservation: 'none',
  },
  // Italy
  {
    id: 'it-frecce',
    types: ['FR', 'FA', 'FB'],
    country: 'IT',
    coverage: 'covered',
    reservation: 'mandatory',
    fee: { second: 13, first: 13 },
    feeNote: 'range_10_13',
    channel: 'trenitalia',
  },
  {
    id: 'it-ic',
    types: ['IC'],
    country: 'IT',
    coverage: 'covered',
    reservation: 'mandatory',
    fee: { second: 3, first: 3 },
    channel: 'trenitalia',
  },
  {
    id: 'it-icn',
    types: ['ICN'],
    country: 'IT',
    coverage: 'covered',
    reservation: 'mandatory',
    feeNote: 'varies',
    channel: 'trenitalia',
  },
  {
    id: 'it-ec',
    types: ['EC'],
    country: 'IT',
    coverage: 'covered',
    reservation: 'recommended',
    channel: 'trenitalia',
  },
  {
    id: 'it-regional',
    types: ['R', 'RV', 'REG'],
    country: 'IT',
    coverage: 'covered',
    reservation: 'none',
  },
  {
    id: 'it-italo',
    types: ['ITA', 'ITALO', 'NTV'],
    country: 'IT',
    coverage: 'not_covered',
    reservation: 'none',
  },
  // France
  {
    id: 'fr-tgv',
    types: ['TGV', 'INOUI'],
    country: 'FR',
    coverage: 'covered',
    reservation: 'mandatory',
    fee: { second: 10, first: 20 },
    feeNote: 'range_10_20',
    quota: true,
    channel: 'sncf',
  },
  {
    id: 'fr-ouigo',
    types: ['OUIGO', 'OGV'],
    country: 'FR',
    coverage: 'not_covered',
    reservation: 'none',
  },
  {
    id: 'fr-ic',
    types: ['IC', 'INTERCITES'],
    country: 'FR',
    coverage: 'covered',
    reservation: 'recommended',
    channel: 'sncf',
  },
  { id: 'fr-ter', types: ['TER'], country: 'FR', coverage: 'covered', reservation: 'none' },
  // Spain
  {
    id: 'es-ave',
    types: ['AVE'],
    country: 'ES',
    coverage: 'covered',
    reservation: 'mandatory',
    fee: { second: 10, first: 13 },
    channel: 'renfe',
  },
  {
    id: 'es-alvia',
    types: ['ALVIA', 'AVANT', 'EUROMED'],
    country: 'ES',
    coverage: 'covered',
    reservation: 'mandatory',
    feeNote: 'varies',
    channel: 'renfe',
  },
  {
    id: 'es-lowcost',
    types: ['AVLO', 'IRYO', 'OUIGO'],
    country: 'ES',
    coverage: 'not_covered',
    reservation: 'none',
  },
  // Czechia
  {
    id: 'cz-cd',
    types: ['EC', 'IC', 'EX', 'EN', 'R', 'OS', 'RJ'],
    country: 'CZ',
    coverage: 'covered',
    reservation: 'optional',
    channel: 'cd',
  },
  {
    id: 'cz-private',
    types: ['LE', 'REGIOJET', 'RGJ'],
    country: 'CZ',
    coverage: 'not_covered',
    reservation: 'none',
  },
  // Netherlands and Belgium
  {
    id: 'nl-be',
    types: ['IC', 'SPR', 'ICD', 'L', 'P', 'S'],
    coverage: 'covered',
    reservation: 'none',
  },
];

export const CHANNEL_LINKS: Record<Channel, { name: string; url: string }> = {
  db: { name: 'Deutsche Bahn', url: 'https://int.bahn.de/en' },
  sbb: { name: 'SBB', url: 'https://www.sbb.ch/en' },
  oebb: { name: 'ÖBB', url: 'https://www.oebb.at/en/' },
  trenitalia: { name: 'Trenitalia', url: 'https://www.trenitalia.com/en.html' },
  sncf: { name: 'SNCF Connect', url: 'https://www.sncf-connect.com/en-en' },
  renfe: { name: 'Renfe', url: 'https://www.renfe.com/es/en' },
  eurostar: { name: 'Eurostar', url: 'https://www.eurostar.com' },
  cd: { name: 'České dráhy', url: 'https://www.cd.cz/en/' },
  ns: { name: 'NS', url: 'https://www.nsinternational.com/en' },
  sncb: { name: 'SNCB', url: 'https://www.belgiantrain.be/en' },
};
