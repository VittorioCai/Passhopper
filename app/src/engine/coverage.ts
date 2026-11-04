import {
  RESERVATION_RULES,
  type Channel,
  type Coverage,
  type ReservationNeed,
  type ReservationRule,
} from '../data/reservationRules';

/** Common long names people type instead of the short code. */
const ALIASES: Record<string, string> = {
  NIGHTJET: 'NJ',
  EURONIGHT: 'EN',
  FRECCIAROSSA: 'FR',
  FRECCIARGENTO: 'FA',
  FRECCIABIANCA: 'FB',
  RAILJET: 'RJ',
  EUROCITY: 'EC',
  INTERCITY: 'IC',
  EUROCITYEXPRESS: 'ECE',
  INTERCITYEXPRESS: 'ICE',
  ITALO: 'ITA',
  INTERCITES: 'IC',
  REGIOJET: 'REGIOJET',
  LEOEXPRESS: 'LE',
  SUPERCITY: 'SC',
  EUROSTAR: 'ES',
  EST: 'ES',
};

/** The train type from a train number, e.g. "FR" from "FR 9709" or "TGV" from "TGV INOUI 6201". */
export function trainType(trainNumber: string): string {
  const first =
    trainNumber
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase()
      .match(/^[A-Z]+/)?.[0] ?? '';
  return ALIASES[first] ?? first;
}

export interface SegmentRule {
  rule?: ReservationRule;
  coverage: Coverage | 'unknown';
  reservation: ReservationNeed | 'unknown';
  /** Reservation fee in EUR counted in the cost; 0 when not needed or unknown. */
  fee: number;
  /** Highest fee when it varies (for display); equal to fee otherwise. */
  feeMax: number;
  /** False when a reservation is needed but we don't know its price. */
  feeKnown: boolean;
  verified: boolean;
  feeNote?: ReservationRule['feeNote'];
  quota: boolean;
  channel?: Channel;
}

export function ruleFor(type: string, from: string, to: string, travelClass: 1 | 2): SegmentRule {
  const matches = RESERVATION_RULES.filter(
    (r) =>
      r.types.includes(type) &&
      (r.country === undefined || r.country === from) &&
      (r.toCountries === undefined || r.toCountries.includes(to as never)),
  );
  const score = (r: ReservationRule) => (r.toCountries ? 2 : 0) + (r.country ? 1 : 0);
  const rule = matches.sort((a, b) => score(b) - score(a))[0];
  if (!rule)
    return {
      coverage: 'unknown',
      reservation: 'unknown',
      fee: 0,
      feeMax: 0,
      feeKnown: false,
      verified: false,
      quota: false,
    };
  const needsFee = rule.reservation === 'mandatory';
  const fee = travelClass === 1 ? rule.fee?.first : rule.fee?.second;
  const max = travelClass === 1 ? rule.feeMax?.first : rule.feeMax?.second;
  return {
    rule,
    coverage: rule.coverage,
    reservation: rule.reservation,
    fee: needsFee ? (fee ?? 0) : 0,
    feeMax: needsFee ? (max ?? fee ?? 0) : 0,
    feeKnown: !needsFee || fee !== undefined,
    verified: rule.verified,
    feeNote: rule.feeNote,
    quota: !!rule.quota,
    channel: rule.channel,
  };
}
