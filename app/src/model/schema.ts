import { z } from 'zod';
import { COUNTRY_CODES } from '../data/countries';

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Expected YYYY-MM-DD');
const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Expected HH:mm');

export const CountrySchema = z.enum(COUNTRY_CODES as [string, ...string[]]);

export const PlaceSchema = z.object({
  /** City id from the starter list, or `custom-…` for a city typed in by hand. */
  id: z.string().min(1),
  en: z.string().min(1),
  zh: z.string().optional(),
  local: z.string().min(1),
  country: CountrySchema,
});

export const TravellerSchema = z.object({
  residence: z.discriminatedUnion('type', [
    z.object({ type: z.literal('europe'), country: CountrySchema }),
    z.object({ type: z.literal('non_europe') }),
  ]),
  ageGroup: z.enum(['youth', 'adult', 'senior']),
  travelClass: z.union([z.literal(1), z.literal(2)]),
  count: z.number().int().min(1).max(9),
});

export const PriceSchema = z
  .object({
    min: z.number().nonnegative(),
    max: z.number().nonnegative(),
    currency: z.literal('EUR'),
    source: z.enum(['user', 'ai_estimate', 'ai_search', 'official']),
  })
  .refine((p) => p.max >= p.min, 'max must be at least min');

/** One train ride. Days are offsets from the date the journey starts, so a night train arrives on day 1. */
export const SegmentSchema = z
  .object({
    id: z.string().min(1),
    trainNumber: z.string().max(40),
    from: z.string().max(80),
    to: z.string().max(80),
    depDay: z.number().int().min(0).max(3),
    depTime: hhmm,
    arrDay: z.number().int().min(0).max(3),
    arrTime: hhmm,
    price: PriceSchema.optional(),
    source: z.enum(['manual', 'transitous', 'ai']),
    /** Seat reservation the traveller has made for this train. */
    reservation: z
      .object({
        status: z.enum(['todo', 'booked']),
        ref: z.string().max(40).optional(),
        seat: z.string().max(40).optional(),
        paid: z.number().nonnegative().optional(),
      })
      .optional(),
  })
  .refine(
    (s) => s.arrDay > s.depDay || (s.arrDay === s.depDay && s.arrTime > s.depTime),
    'The train must arrive after it departs',
  );

export const JourneySchema = z.object({
  fromStopId: z.string().min(1),
  toStopId: z.string().min(1),
  segments: z.array(SegmentSchema),
});

export const StopSchema = z.object({
  id: z.string().min(1),
  place: PlaceSchema,
  nights: z.number().int().min(0).max(60),
  note: z.string().max(500).optional(),
});

export const TripSchema = z.object({
  id: z.string().min(1),
  schemaVersion: z.literal(1),
  name: z.string().min(1).max(120),
  createdAt: z.string(),
  updatedAt: z.string(),
  sample: z.boolean().optional(),
  traveller: TravellerSchema,
  startDate: isoDate,
  stops: z.array(StopSchema).min(1),
  journeys: z.array(JourneySchema),
  /** The pass the traveller picked (otherwise the cheapest is used) and days they set by hand. */
  pass: z
    .object({
      productId: z.string().optional(),
      overrides: z.record(isoDate, z.enum(['pass', 'ticket'])),
    })
    .optional(),
});

export const ExportFileSchema = z.object({
  app: z.literal('passhopper'),
  version: z.literal(1),
  exportedAt: z.string(),
  trips: z.array(TripSchema),
});

export type Place = z.infer<typeof PlaceSchema>;
export type Traveller = z.infer<typeof TravellerSchema>;
export type Price = z.infer<typeof PriceSchema>;
export type Segment = z.infer<typeof SegmentSchema>;
export type Journey = z.infer<typeof JourneySchema>;
export type Stop = z.infer<typeof StopSchema>;
export type Trip = z.infer<typeof TripSchema>;
export type ExportFile = z.infer<typeof ExportFileSchema>;
