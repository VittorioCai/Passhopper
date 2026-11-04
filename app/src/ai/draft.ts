/**
 * One-sentence trip drafts for the new-trip wizard (F5.1): the assistant turns a description into
 * a start city, stops with nights, and a start date. The wizard shows the result for editing.
 */
import { z } from 'zod';
import { COUNTRY_CODES } from '../data/countries';
import type { Place } from '../model/schema';
import { newHistory } from './agent';
import { resolveCity } from './patch';
import type { ActiveProvider } from './settings';
import type { ToolContext, ToolDef, ToolResult } from './tools';

const CityRef = z.object({ city: z.string().min(1).max(80), country: z.string().length(2) });
export const DraftSchema = z.object({
  origin: CityRef,
  stops: z
    .array(CityRef.extend({ nights: z.number().int().min(0).max(30) }))
    .min(1)
    .max(20),
  return_to_start: z.boolean().default(true),
  start_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
  summary: z.string().max(300).optional(),
});

export interface Draft {
  origin: Place;
  stops: { place: Place; nights: number }[];
  returnToStart: boolean;
  startDate?: string;
  summary?: string;
}

const city = {
  type: 'object',
  properties: { city: { type: 'string' }, country: { type: 'string' } },
};

export const PROPOSE_ROUTE: ToolDef = {
  name: 'propose_route',
  description: 'Give the traveller a first route. They will review and edit it before saving.',
  parameters: {
    type: 'object',
    properties: {
      origin: {
        ...city,
        description: 'Where the trip starts (English city name and country code).',
      },
      stops: {
        type: 'array',
        description: 'Cities to stay in, in order, with nights in each.',
        items: {
          type: 'object',
          properties: {
            city: { type: 'string', description: 'English city name.' },
            country: { type: 'string', description: `One of ${COUNTRY_CODES.join(', ')}.` },
            nights: { type: 'integer' },
          },
          required: ['city', 'country', 'nights'],
        },
      },
      return_to_start: { type: 'boolean', description: 'Whether the trip ends back at the start.' },
      start_date: {
        type: 'string',
        description: 'YYYY-MM-DD, if the traveller gave a date or month.',
      },
      summary: { type: 'string', description: 'One sentence in the traveller’s language.' },
    },
    required: ['origin', 'stops'],
  },
};

export function draftPrompt(lang: string, today: string) {
  const language = lang.startsWith('zh') ? 'Simplified Chinese' : 'English';
  return `You draft rail routes for Passhopper, an Interrail trip planner. Today is ${today}.

Read the traveller's description and call propose_route once with a realistic route: cities connected by good direct trains, sensible nights (usually 2–3 per city), and the total length they asked for. Only use countries in the Interrail Pass Network (codes listed in the tool). If they gave no start city, use the one in their message or the first city of the route. If they named a month, use a date in the future in that month. Don't add trains or prices.

If the description is too vague to plan anything, reply in ${language} with one short question instead.`;
}

/** Ask the provider for a draft. Returns the draft, or the assistant's text if it asked a question. */
export async function draftRoute(
  p: ActiveProvider,
  lang: string,
  description: string,
  today: string,
  signal: AbortSignal,
): Promise<{ draft?: Draft; text: string; unknownCities: string[] }> {
  let draft: Draft | undefined;
  const unknown: string[] = [];
  const run = async (name: string, input: unknown): Promise<ToolResult> => {
    if (name !== 'propose_route') return { isError: true, content: `unknown tool ${name}` };
    const parsed = DraftSchema.safeParse(input);
    if (!parsed.success)
      return { isError: true, content: JSON.stringify(parsed.error.issues.slice(0, 6)) };
    const d = parsed.data;
    const origin = resolveCity(d.origin.city, d.origin.country);
    const stops = d.stops.flatMap((s) => {
      const place = resolveCity(s.city, s.country);
      if (!place) unknown.push(s.city);
      return place ? [{ place, nights: s.nights }] : [];
    });
    if (!origin || !stops.length)
      return { isError: true, content: 'Use real cities with their two-letter country codes.' };
    draft = {
      origin,
      stops,
      returnToStart: d.return_to_start,
      startDate: d.start_date && d.start_date > today ? d.start_date : undefined,
      summary: d.summary,
    };
    return { content: 'Shown to the traveller. Reply with one short sentence, or nothing.' };
  };
  const ctx: ToolContext = {
    trip: () => {
      throw new Error('no trip yet');
    },
    propose: () => {},
    activity: () => {},
    sources: () => {},
    signal,
    toolset: { defs: [PROPOSE_ROUTE], run },
  };
  let text = '';
  const onText = (delta: string) => {
    text += delta;
  };
  const history = newHistory(p);
  const system = draftPrompt(lang, today);
  if (history.kind === 'claude') {
    const { runClaudeTurn } = await import('./claude');
    await runClaudeTurn(p, history, system, description, ctx, onText);
  } else {
    const { runOpenAITurn } = await import('./openai');
    await runOpenAITurn(p, history, system, description, ctx, onText);
  }
  return { draft, text: text.trim(), unknownCities: unknown };
}
