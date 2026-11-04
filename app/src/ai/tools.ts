import { ruleFor, trainType } from '../engine/coverage';
import type { Trip } from '../model/schema';
import {
  applyPatch,
  compareTrips,
  PATCH_JSON_SCHEMA,
  PlanPatchSchema,
  type Comparison,
  type PlanPatch,
} from './patch';

export interface Proposal {
  id: string;
  patch: PlanPatch;
  before: Trip;
  after: Trip;
  comparison: Comparison;
}

export interface Source {
  title: string;
  url: string;
}

export type Activity = { type: 'search'; query: string } | { type: 'proposal'; id: string };

export interface ToolContext {
  /** The trip as it is now (it can change between turns). */
  trip: () => Trip;
  propose: (p: Proposal) => void;
  activity: (a: Activity) => void;
  sources: (s: Source[]) => void;
  /** DeepSeek key for the web search API; absent means no search_web tool. */
  searchKey?: string;
  signal: AbortSignal;
  /**
   * A different set of tools instead of the trip assistant's (new-trip wizard, price lookup).
   * `webSearch` adds Claude's server web search; OpenAI-style providers get search_web in `defs`.
   */
  toolset?: {
    defs: ToolDef[];
    run: (name: string, input: unknown) => Promise<ToolResult>;
    webSearch?: boolean;
  };
}

export interface ToolDef {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export const PROPOSE_PATCH: ToolDef = {
  name: 'propose_patch',
  description:
    'Propose changes to the trip. The traveller sees a before/after preview with the cost worked out by the rules engine, and decides whether to apply it. Returns that comparison, or errors to fix.',
  parameters: PATCH_JSON_SCHEMA,
};

export const LOOKUP_RULE: ToolDef = {
  name: 'lookup_reservation_rule',
  description:
    "Look up whether the Interrail pass covers a train type and what seat reservation it needs, from the app's rule data (checked against interrail.com).",
  parameters: {
    type: 'object',
    properties: {
      train_number: {
        type: 'string',
        description: 'For example "FR 9709", "TGV 6201" or "Nightjet".',
      },
      from_country: {
        type: 'string',
        description: 'Two-letter country code where the train leaves.',
      },
      to_country: { type: 'string', description: 'Two-letter country code where the train goes.' },
    },
    required: ['train_number', 'from_country', 'to_country'],
  },
};

export const SEARCH_WEB: ToolDef = {
  name: 'search_web',
  description:
    'Search the web for current information: strikes, engineering works, timetables, ticket prices, rule changes. Cite the links you use.',
  parameters: {
    type: 'object',
    properties: { query: { type: 'string', description: 'Search query, at most 120 characters.' } },
    required: ['query'],
  },
};

export const toolsFor = (withSearch: boolean) =>
  withSearch ? [PROPOSE_PATCH, LOOKUP_RULE, SEARCH_WEB] : [PROPOSE_PATCH, LOOKUP_RULE];

export interface ToolResult {
  content: string;
  isError?: boolean;
}

const json = (v: unknown) => JSON.stringify(v);

export async function runTool(name: string, input: unknown, ctx: ToolContext): Promise<ToolResult> {
  switch (name) {
    case 'propose_patch': {
      const parsed = PlanPatchSchema.safeParse(input);
      if (!parsed.success)
        return {
          isError: true,
          content: json({ error: 'invalid patch', issues: parsed.error.issues.slice(0, 8) }),
        };
      const before = ctx.trip();
      const { trip: after, errors } = applyPatch(before, parsed.data);
      if (errors.length)
        return { isError: true, content: json({ error: 'patch not applied', errors }) };
      const comparison = compareTrips(before, after);
      const id = crypto.randomUUID();
      ctx.propose({ id, patch: parsed.data, before, after, comparison });
      ctx.activity({ type: 'proposal', id });
      return {
        content: json({
          shown_to_traveller: true,
          note: 'The traveller decides whether to apply it. Do not repeat the cost figures in detail; the preview shows them.',
          trip_days: comparison.days,
          total_cost_eur: {
            before: Math.round(comparison.cost.before),
            after: Math.round(comparison.cost.after),
          },
          pass: { before: comparison.passBefore, after: comparison.passAfter },
        }),
      };
    }
    case 'lookup_reservation_rule': {
      const i = (input ?? {}) as Record<string, unknown>;
      const train = String(i.train_number ?? '');
      const from = String(i.from_country ?? '').toUpperCase();
      const to = String(i.to_country ?? '').toUpperCase();
      const r = ruleFor(trainType(train), from, to, ctx.trip().traveller.travelClass);
      return {
        content: json({
          train_type: trainType(train),
          pass_coverage: r.coverage,
          reservation: r.reservation,
          fee_eur: r.feeKnown ? (r.feeMax > r.fee ? [r.fee, r.feeMax] : r.fee) : 'unknown',
          limited_pass_quota: r.quota,
          checked_on_official_site: r.verified,
        }),
      };
    }
    case 'search_web': {
      const query = String((input as { query?: unknown })?.query ?? '')
        .trim()
        .slice(0, 120);
      if (!query || !ctx.searchKey) return { isError: true, content: 'search is not available' };
      ctx.activity({ type: 'search', query });
      const results = await deepseekSearch(query, ctx.searchKey, ctx.signal);
      ctx.sources(results.map((r) => ({ title: r.title, url: r.url })));
      return { content: json(results) };
    }
    default:
      return { isError: true, content: `unknown tool ${name}` };
  }
}

interface SearchHit {
  title: string;
  url: string;
  date?: string;
  text: string;
}

/** DeepSeek Search API (RULES-AND-SOURCES E2). Called straight from the browser with the traveller's key. */
export async function deepseekSearch(
  query: string,
  key: string,
  signal: AbortSignal,
): Promise<SearchHit[]> {
  const res = await fetch('https://api.deepseek.com/v1/tools/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({ query, count: 6 }),
    signal,
  });
  if (!res.ok) throw new HttpError(res.status, await res.text().catch(() => ''));
  const data = (await res.json()) as { results?: unknown[] };
  return (data.results ?? []).flatMap((r) => {
    const x = r as Record<string, unknown>;
    const url = typeof x.url === 'string' ? x.url : '';
    if (!/^https?:\/\//.test(url)) return [];
    return [
      {
        title: String(x.title ?? url).slice(0, 200),
        url,
        date: typeof x.date === 'string' ? x.date : undefined,
        text: String(x.summary ?? x.snippet ?? '').slice(0, 900),
      },
    ];
  });
}

export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly body: string,
  ) {
    super(`HTTP ${status}`);
  }
}
