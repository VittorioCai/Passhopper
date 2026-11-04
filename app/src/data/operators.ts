import type { CountryCode } from './countries';

/** Each country's main rail operator, for checking a train (F1.6). Home pages only, which rarely move. */
export const RAIL_SITES: Record<CountryCode, { name: string; url: string }> = {
  AT: { name: 'ÖBB', url: 'https://www.oebb.at' },
  BE: { name: 'SNCB', url: 'https://www.belgiantrain.be' },
  BG: { name: 'BDŽ', url: 'https://www.bdz.bg' },
  CH: { name: 'SBB', url: 'https://www.sbb.ch' },
  CZ: { name: 'České dráhy', url: 'https://www.cd.cz' },
  DE: { name: 'Deutsche Bahn', url: 'https://int.bahn.de/en' },
  DK: { name: 'DSB', url: 'https://www.dsb.dk' },
  ES: { name: 'Renfe', url: 'https://www.renfe.com' },
  FI: { name: 'VR', url: 'https://www.vr.fi' },
  FR: { name: 'SNCF Connect', url: 'https://www.sncf-connect.com' },
  GB: { name: 'National Rail', url: 'https://www.nationalrail.co.uk' },
  GR: { name: 'Hellenic Train', url: 'https://www.hellenictrain.gr' },
  HR: { name: 'HŽPP', url: 'https://www.hzpp.hr' },
  HU: { name: 'MÁV', url: 'https://www.mavcsoport.hu' },
  IE: { name: 'Irish Rail', url: 'https://www.irishrail.ie' },
  IT: { name: 'Trenitalia', url: 'https://www.trenitalia.com' },
  LU: { name: 'CFL', url: 'https://www.cfl.lu' },
  NL: { name: 'NS International', url: 'https://www.nsinternational.com' },
  NO: { name: 'Vy', url: 'https://www.vy.no' },
  PL: { name: 'PKP Intercity', url: 'https://www.intercity.pl' },
  PT: { name: 'CP', url: 'https://www.cp.pt' },
  RO: { name: 'CFR Călători', url: 'https://www.cfrcalatori.ro' },
  SE: { name: 'SJ', url: 'https://www.sj.se' },
  SI: { name: 'Slovenske železnice', url: 'https://potniski.sz.si' },
  SK: { name: 'ZSSK', url: 'https://www.zssk.sk' },
};

export const INTERRAIL_FEES = {
  domestic:
    'https://www.interrail.com/en/book-reservations/reservation-fees/domestic-train-reservation-fees',
  international:
    'https://www.interrail.com/en/book-reservations/reservation-fees/international-train-reservation-fees',
  night:
    'https://www.interrail.com/en/book-reservations/reservation-fees/night-train-reservation-fees',
};

export const SEAT61 = 'https://www.seat61.com';
