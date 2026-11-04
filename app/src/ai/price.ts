/**
 * One-tap ticket price for a train (F4.4): an AI estimate, or a web lookup when the provider can
 * search. The result is a range in EUR, marked "AI estimate" or "AI web" in the app.
 */
import { z } from 'zod';
import type { Price } from '../model/schema';
import { newHistory } from './agent';
import type { ActiveProvider } from './settings';
import {
  runTool,
  SEARCH_WEB,
  type Source,
  type ToolContext,
  type ToolDef,
  type ToolResult,
} from './tools';

export interface PriceQuery {
  train: string;
  from: string;
  to: string;
  date: string;
  depTime?: string;
  travelClass: 1 | 2;
  ageGroup: 'youth' | 'adult' | 'senior';
}

const ReportSchema = z.object({
  min_eur: z.number().nonnegative().max(2000),
  max_eur: z.number().nonnegative().max(3000),
  note: z.string().max(300).optional(),
});

export const REPORT_PRICE: ToolDef = {
  name: 'report_price',
  description:
    'Report the price range of a standard one-way ticket for this train, for one traveller.',
  parameters: {
    type: 'object',
    properties: {
      min_eur: { type: 'number', description: 'Cheapest likely fare (saver or advance), EUR.' },
      max_eur: { type: 'number', description: 'Flexible fare bought shortly before travel, EUR.' },
      note: { type: 'string', description: 'One short sentence on what the range is based on.' },
    },
    required: ['min_eur', 'max_eur'],
  },
};

/** Whether this provider can look prices up on the web. */
export const canSearch = (p: ActiveProvider) => p.id === 'claude' || !!p.searchKey;

export function pricePrompt(lang: string, search: boolean, cls: string) {
  const language = lang.startsWith('zh') ? 'Simplified Chinese' : 'English';
  return `You estimate European train ticket prices for Passhopper, an Interrail planner. The traveller wants to know what this train would cost without the pass, to compare.

${search ? 'Search the operator or a ticket site for the fare on this route, then' : 'From what you know of this operator and route,'} call report_price once with a realistic range in EUR for one ${cls} one-way ticket: the cheapest advance fare to the flexible fare. Ignore rail pass prices and reservation fees. Write the note in ${language}.`;
}

export async function lookUpPrice(
  p: ActiveProvider,
  lang: string,
  q: PriceQuery,
  search: boolean,
  signal: AbortSignal,
): Promise<{ price?: Price; note?: string; sources: Source[] }> {
  let price: Price | undefined;
  let note: string | undefined;
  const sources: Source[] = [];
  const ctx: ToolContext = {
    trip: () => {
      throw new Error('no trip');
    },
    propose: () => {},
    activity: () => {},
    sources: (list) => sources.push(...list.filter((n) => !sources.some((o) => o.url === n.url))),
    signal,
    searchKey: search && p.id !== 'claude' ? p.searchKey : undefined,
    toolset: {
      defs: search && p.id !== 'claude' ? [REPORT_PRICE, SEARCH_WEB] : [REPORT_PRICE],
      webSearch: search && p.id === 'claude',
      run: async (name: string, input: unknown): Promise<ToolResult> => {
        if (name === 'search_web') return runTool(name, input, ctx);
        if (name !== 'report_price') return { isError: true, content: `unknown tool ${name}` };
        const r = ReportSchema.safeParse(input);
        if (!r.success)
          return { isError: true, content: JSON.stringify(r.error.issues.slice(0, 4)) };
        const min = Math.round(Math.min(r.data.min_eur, r.data.max_eur));
        const max = Math.round(Math.max(r.data.min_eur, r.data.max_eur));
        price = { min, max, currency: 'EUR', source: search ? 'ai_search' : 'ai_estimate' };
        note = r.data.note;
        return { content: 'Saved. Reply with nothing.' };
      },
    },
  };
  const cls = q.travelClass === 1 ? '1st class' : '2nd class';
  const system = pricePrompt(lang, search, cls);
  const message = `Train ${q.train || '(number unknown)'} from ${q.from} to ${q.to} on ${q.date}${q.depTime ? ` at ${q.depTime}` : ''}, ${cls}, ${q.ageGroup} traveller.`;
  const history = newHistory(p);
  const noText = () => {};
  if (history.kind === 'claude') {
    const { runClaudeTurn } = await import('./claude');
    await runClaudeTurn(p, history, system, message, ctx, noText);
  } else {
    const { runOpenAITurn } = await import('./openai');
    await runOpenAITurn(p, history, system, message, ctx, noText);
  }
  return { price, note, sources };
}
