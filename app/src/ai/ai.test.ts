import { afterEach, describe, expect, it, vi } from 'vitest';
import { makeSampleTrip } from '../data/sampleTrip';
import { newHistory, runTurn, classifyError } from './agent';
import { applyPatch, compareTrips, planForModel, resolveCity, type PlanPatch } from './patch';
import { activeProvider, defaultSettings, type ActiveProvider } from './settings';
import { HttpError, type Proposal, type ToolContext } from './tools';

const trip = () => makeSampleTrip('en');
const patch = (ops: PlanPatch['ops']): PlanPatch => ({ summary: 'test', ops });
const cities = (t: ReturnType<typeof trip>) => t.stops.map((s) => s.place.en);

describe('applyPatch', () => {
  it('adds a stop after another and keeps the trains of untouched journeys', () => {
    const before = trip();
    const { trip: after, errors } = applyPatch(
      before,
      patch([{ op: 'add_stop', city: 'Siena', country: 'IT', after: 's6', nights: 1 }]),
    );
    expect(errors).toEqual([]);
    expect(cities(after).slice(5, 8)).toEqual(['Florence', 'Siena', 'Rome']);
    expect(after.stops[6]!.place).toMatchObject({ id: 'custom-siena', country: 'IT' });
    // Milan → Venice keeps its train; Florence → Siena is new and empty.
    expect(after.journeys[3]!.segments[0]!.trainNumber).toBe('FR 9709');
    expect(after.journeys[5]!.segments).toEqual([]);
  });

  it('finds cities from our list by any name and puts new stops before the return home', () => {
    expect(resolveCity('Wien')?.id).toBe('vienna');
    expect(resolveCity('苏黎世')?.id).toBe('zurich');
    expect(resolveCity('Nowhere')).toBeNull();
    const { trip: after } = applyPatch(
      trip(),
      patch([{ op: 'add_stop', city: 'Dresden', country: 'DE', nights: 2 }]),
    );
    expect(cities(after).slice(-3)).toEqual(['Prague', 'Dresden', 'Berlin']);
  });

  it('removes, moves and changes nights, and refers to new stops by ref', () => {
    const { trip: after, errors } = applyPatch(
      trip(),
      patch([
        { op: 'remove_stop', stop: 's3' },
        { op: 'set_nights', stop: 's5', nights: 4 },
        { op: 'add_stop', city: 'Naples', country: 'IT', after: 's7', nights: 2, ref: 'n1' },
        { op: 'move_stop', stop: 's9', after: 's2' },
        { op: 'set_note', stop: 'n1', note: 'Pompeii day trip' },
      ]),
    );
    expect(errors).toEqual([]);
    expect(cities(after)).toEqual([
      'Berlin',
      'Munich',
      'Prague',
      'Milan',
      'Venice',
      'Florence',
      'Rome',
      'Naples',
      'Vienna',
      'Berlin',
    ]);
    expect(after.stops.find((s) => s.place.en === 'Venice')!.nights).toBe(4);
    expect(after.stops.find((s) => s.place.en === 'Naples')!.note).toBe('Pompeii day trip');
  });

  it('sets trains with AI estimated prices', () => {
    const { trip: after, errors } = applyPatch(
      trip(),
      patch([
        {
          op: 'set_trains',
          from_stop: 's7',
          trains: [
            {
              train_number: 'FR 9500',
              from_station: 'Roma Termini',
              to_station: 'Bologna C.le',
              dep_day: 0,
              dep_time: '09:00',
              arr_day: 0,
              arr_time: '11:00',
              price_min: 30,
              price_max: 90,
            },
          ],
        },
      ]),
    );
    expect(errors).toEqual([]);
    const seg = after.journeys[6]!.segments[0]!;
    expect(seg).toMatchObject({ trainNumber: 'FR 9500', source: 'ai' });
    expect(seg.price).toEqual({ min: 30, max: 90, currency: 'EUR', source: 'ai_estimate' });
  });

  it('rejects the whole patch on any error', () => {
    const before = trip();
    const res = applyPatch(
      before,
      patch([
        { op: 'set_nights', stop: 's2', nights: 5 },
        { op: 'remove_stop', stop: 's1' },
        { op: 'add_stop', city: 'Atlantis', nights: 1 },
        {
          op: 'set_trains',
          from_stop: 's2',
          trains: [
            {
              train_number: 'X 1',
              from_station: 'A',
              to_station: 'B',
              dep_day: 0,
              dep_time: '10:00',
              arr_day: 0,
              arr_time: '09:00',
            },
          ],
        },
      ]),
    );
    expect(res.errors).toHaveLength(3);
    expect(res.errors[0]).toMatch(/starting place/);
    expect(before.stops[1]!.nights).toBe(2);
  });
});

describe('compareTrips and planForModel', () => {
  it('lists the changes and the cost from the rules engine', () => {
    const before = trip();
    const { trip: after } = applyPatch(
      before,
      patch([
        { op: 'remove_stop', stop: 's9' },
        { op: 'set_nights', stop: 's2', nights: 3 },
        { op: 'add_stop', city: 'Salzburg', country: 'AT', after: 's8', nights: 1 },
      ]),
    );
    const c = compareTrips(before, after);
    expect(c.changes.map((x) => x.kind).sort()).toEqual(['added', 'nights', 'removed']);
    expect(c.days.after).toBe(c.days.before);
    expect(c.cost.before).toBeGreaterThan(0);
    expect(c.cost.after).not.toBe(c.cost.before);
  });

  it('sends cities, dates and results but no trip name', () => {
    const t = trip();
    const plan = planForModel(t);
    const text = JSON.stringify(plan);
    expect(text).not.toContain(t.name);
    expect(plan.stops[0]).toMatchObject({ ref: 's1', city: 'Berlin', country: 'DE' });
    expect(plan.traveller).toEqual({
      residence: 'DE',
      age_group: 'youth',
      class: 2,
      travellers: 1,
    });
    expect(plan.rules_engine).toHaveProperty('pass_in_use.total_eur');
  });
});

describe('settings', () => {
  it('needs a key, and a https base URL for other providers', () => {
    expect(defaultSettings('zh-CN').provider).toBe('deepseek');
    expect(defaultSettings('en').provider).toBe('claude');
    expect(activeProvider({ provider: 'deepseek', keys: {}, models: {} })).toBeNull();
    expect(
      activeProvider({ provider: 'deepseek', keys: { deepseek: ' sk-1 ' }, models: {} }),
    ).toMatchObject({
      key: 'sk-1',
      model: 'deepseek-v4-flash',
      baseUrl: 'https://api.deepseek.com',
      searchKey: 'sk-1',
    });
    const custom = { provider: 'custom' as const, keys: { custom: 'k' }, models: { custom: 'm' } };
    expect(activeProvider({ ...custom, customBaseUrl: 'http://x' })).toBeNull();
    expect(activeProvider({ ...custom, customBaseUrl: 'https://x/v1/' })?.baseUrl).toBe(
      'https://x/v1',
    );
  });
});

/** A fake streaming Chat Completions response. */
function sse(chunks: unknown[]) {
  const body = chunks.map((c) => `data: ${JSON.stringify(c)}\n\n`).join('') + 'data: [DONE]\n\n';
  return new Response(new TextEncoder().encode(body), {
    status: 200,
    headers: { 'Content-Type': 'text/event-stream' },
  });
}

describe('OpenAI-style tool loop', () => {
  afterEach(() => vi.unstubAllGlobals());
  const p: ActiveProvider = {
    id: 'deepseek',
    key: 'sk-test',
    model: 'deepseek-v4-flash',
    baseUrl: 'https://api.deepseek.com',
    searchKey: 'sk-test',
  };

  it('streams text, runs search and propose_patch, then answers', async () => {
    const args = JSON.stringify({
      summary: 'Two nights in Salzburg',
      ops: [{ op: 'add_stop', city: 'Salzburg', country: 'AT', after: 's8', nights: 2 }],
    });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        sse([
          { choices: [{ delta: { reasoning_content: 'hmm' } }] },
          {
            choices: [
              {
                delta: {
                  tool_calls: [
                    {
                      index: 0,
                      id: 'c1',
                      function: { name: 'search_web', arguments: '{"query":' },
                    },
                  ],
                },
              },
            ],
          },
          {
            choices: [
              { delta: { tool_calls: [{ index: 0, function: { arguments: '"OBB strike"}' } }] } },
            ],
          },
        ]),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            results: [{ title: 'ÖBB', url: 'https://www.oebb.at/x', summary: 'No strike' }],
          }),
        ),
      )
      .mockResolvedValueOnce(
        sse([
          {
            choices: [
              {
                delta: {
                  tool_calls: [
                    {
                      index: 0,
                      id: 'c2',
                      function: { name: 'propose_patch', arguments: args.slice(0, 20) },
                    },
                  ],
                },
              },
            ],
          },
          {
            choices: [
              { delta: { tool_calls: [{ index: 0, function: { arguments: args.slice(20) } }] } },
            ],
          },
        ]),
      )
      .mockResolvedValueOnce(
        sse([
          { choices: [{ delta: { content: 'Added ' } }] },
          { choices: [{ delta: { content: 'Salzburg.' } }] },
        ]),
      );
    vi.stubGlobal('fetch', fetchMock);

    const proposals: Proposal[] = [];
    const ctx: ToolContext = {
      trip,
      propose: (x) => proposals.push(x),
      activity: () => {},
      sources: () => {},
      searchKey: 'sk-test',
      signal: new AbortController().signal,
    };
    let text = '';
    const h = newHistory(p);
    await runTurn(p, h, trip(), 'en', 'Add Salzburg', ctx, (d) => (text += d));

    expect(text).toBe('Added Salzburg.');
    expect(proposals).toHaveLength(1);
    expect(cities(proposals[0]!.after)).toContain('Salzburg');
    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(fetchMock.mock.calls[1]![0]).toBe('https://api.deepseek.com/v1/tools/search');
    const third = JSON.parse(fetchMock.mock.calls[2]![1].body as string);
    // The reasoning goes back with the tool call, and the plan travels with the user message.
    expect(third.messages[2]).toMatchObject({ role: 'assistant', reasoning_content: 'hmm' });
    expect(third.messages[1].content).toContain('<current_plan>');
    expect(third.messages[3]).toMatchObject({ role: 'tool', tool_call_id: 'c1' });
    expect(third.tools.map((t: { function: { name: string } }) => t.function.name)).toContain(
      'search_web',
    );
    expect(fetchMock.mock.calls[0]![1].headers.Authorization).toBe('Bearer sk-test');
  });

  it('explains common errors', async () => {
    expect(await classifyError(new HttpError(401, ''))).toMatchObject({ kind: 'key' });
    expect(await classifyError(new HttpError(402, ''))).toMatchObject({ kind: 'balance' });
    expect(await classifyError(new TypeError('Failed to fetch'))).toMatchObject({
      kind: 'network',
    });
    expect(await classifyError(new DOMException('x', 'AbortError'))).toMatchObject({
      kind: 'aborted',
    });
  });
});
