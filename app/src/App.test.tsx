import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { saveAiSettings } from './ai/settings';
import { App } from './App';
import { makeSampleTrip } from './data/sampleTrip';
import { db } from './db/db';
import { saveTrip } from './db/trips';
import i18n from './i18n';

const at = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );

beforeEach(async () => {
  await db.trips.clear();
  await db.meta.clear();
  await i18n.changeLanguage('en');
});

afterEach(() => vi.unstubAllGlobals());

describe('home', () => {
  it('shows an empty state and a New trip button', async () => {
    at('/');
    expect(await screen.findByText('No trips yet')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /New trip/ })).toHaveAttribute('href', '/new');
  });

  it('lists saved trips', async () => {
    await saveTrip(makeSampleTrip('en'));
    at('/');
    expect(
      await screen.findByRole('link', { name: 'Italy & Central Europe (example)' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Example')).toBeInTheDocument();
  });

  it('renders in Chinese', async () => {
    await i18n.changeLanguage('zh-CN');
    at('/');
    expect(await screen.findByText('嗨，旅行者')).toBeInTheDocument();
  });
});

describe('trip pages', () => {
  it('shows the route with stops, trains and the four tabs', async () => {
    const trip = makeSampleTrip('en');
    await saveTrip(trip);
    at(`/trip/${trip.id}/route`);
    expect(await screen.findByRole('heading', { name: 'Zurich' })).toBeInTheDocument();
    expect(screen.getByText('Jul 14 – Aug 2')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Flexi\. See savings/ })).toBeInTheDocument();
    expect(screen.getByText('NJ 294')).toBeInTheDocument();
    const tabs = screen.getByRole('navigation', { name: 'Trip pages' });
    for (const name of ['Route', 'Days', 'Seats', 'Savings']) expect(tabs).toHaveTextContent(name);
  });

  it('says so when a trip does not exist', async () => {
    at('/trip/nope/route');
    expect(await screen.findByText('Trip not found')).toBeInTheDocument();
  });

  it('warns about a missed connection', async () => {
    const trip = makeSampleTrip('en');
    trip.stops[1]!.nights = 0;
    await saveTrip(trip);
    at(`/trip/${trip.id}/route`);
    expect(await screen.findByText(/You pass through Munich without staying/)).toBeInTheDocument();
  });

  it('adds trains from the timetable search', async () => {
    const place = (name: string, lat: number, lon: number) => ({
      name,
      lat,
      lon,
      tz: 'Europe/Berlin',
    });
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          itineraries: [
            {
              legs: [
                {
                  mode: 'HIGHSPEED_RAIL',
                  displayName: 'ICE 503',
                  startTime: '2026-11-11T08:29:00Z',
                  endTime: '2026-11-11T12:31:00Z',
                  from: place('Berlin Hbf', 52.5251, 13.3694),
                  to: place('München Hbf', 48.1402, 11.5586),
                },
              ],
            },
          ],
        }),
      ),
    );
    vi.stubGlobal('fetch', fetchMock);
    const trip = makeSampleTrip('en');
    trip.journeys[0]!.segments = [];
    await saveTrip(trip);
    at(`/trip/${trip.id}/route`);
    fireEvent.click(
      await screen.findByRole('button', { name: 'Add a train from Berlin to Munich' }),
    );
    const option = await screen.findByRole('button', { name: /Use ICE 503, leaving 09:29/ });
    fireEvent.click(option);
    await waitFor(async () =>
      expect((await db.trips.get(trip.id))!.journeys[0]!.segments[0]).toMatchObject({
        trainNumber: 'ICE 503',
        depTime: '09:29',
        arrTime: '13:31',
        source: 'transitous',
      }),
    );
  });

  it('adds a train by hand', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{"itineraries":[]}')));
    const trip = makeSampleTrip('en');
    trip.journeys[0]!.segments = [];
    await saveTrip(trip);
    at(`/trip/${trip.id}/route`);
    fireEvent.click(
      await screen.findByRole('button', { name: 'Add a train from Berlin to Munich' }),
    );
    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByRole('button', { name: 'Enter by hand' }));
    fireEvent.change(within(dialog).getByLabelText('Train number'), {
      target: { value: 'ICE 501' },
    });
    fireEvent.change(within(dialog).getByLabelText('Departs'), { target: { value: '09:00' } });
    fireEvent.change(within(dialog).getByLabelText('Arrives'), { target: { value: '08:00' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    expect(within(dialog).getByRole('alert')).toHaveTextContent(
      'The arrival must be after the departure',
    );
    fireEvent.change(within(dialog).getByLabelText('Arrives'), { target: { value: '13:00' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('ICE 501')).toBeInTheDocument();
    const saved = await db.trips.get(trip.id);
    expect(saved!.journeys[0]!.segments[0]).toMatchObject({
      trainNumber: 'ICE 501',
      depTime: '09:00',
      arrTime: '13:00',
    });
  });
});

describe('travel days and seats', () => {
  it('lets you switch a day between pass and ticket, and saves it', async () => {
    const trip = makeSampleTrip('en');
    await saveTrip(trip);
    at(`/trip/${trip.id}/days`);
    const switches = await screen.findAllByRole('switch');
    const on = switches.find((s) => s.getAttribute('aria-checked') === 'true')!;
    fireEvent.click(on);
    await waitFor(async () => {
      const saved = await db.trips.get(trip.id);
      expect(Object.values(saved!.pass?.overrides ?? {})).toContain('ticket');
    });
    expect(await screen.findByRole('button', { name: /Back to best plan/ })).toBeInTheDocument();
    // Berlin → Munich stays in Germany for a German resident, so it can't use the pass.
    expect(screen.getByText(/Stays inside Germany/)).toBeInTheDocument();
  });

  it('records a seat reservation', async () => {
    const trip = makeSampleTrip('en');
    await saveTrip(trip);
    at(`/trip/${trip.id}/reservations`);
    const card = (await screen.findByText('Rome → Vienna')).closest('article')!;
    expect(within(card).getByText('Popular')).toBeInTheDocument();
    fireEvent.click(within(card).getByRole('button', { name: /Booked it/ }));
    fireEvent.change(within(card).getByLabelText('Coach and seat'), {
      target: { value: 'Car 3, 51' },
    });
    fireEvent.click(within(card).getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Car 3, 51')).toBeInTheDocument();
    const saved = await db.trips.get(trip.id);
    const nj = saved!.journeys.flatMap((j) => j.segments).find((s) => s.trainNumber === 'NJ 294')!;
    expect(nj.reservation).toMatchObject({ status: 'booked', seat: 'Car 3, 51' });
  });
});

describe('savings', () => {
  it('compares passes with buying tickets and switches pass on tap', async () => {
    const trip = makeSampleTrip('en');
    await saveTrip(trip);
    at(`/trip/${trip.id}/savings`);
    expect(await screen.findByText('All tickets')).toBeInTheDocument();
    expect(screen.getByText('In use')).toBeInTheDocument();
    const other = screen.getByRole('button', { name: /Use the 10-day Flexi/ });
    fireEvent.click(other);
    await waitFor(async () => {
      expect((await db.trips.get(trip.id))!.pass?.productId).toBe('flexi-10-2m');
    });
  });
});

describe('new trip wizard', () => {
  it('creates a trip and opens its route', async () => {
    at('/new');
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    const search = () => screen.getAllByLabelText('Search for a city').at(-1)!;
    fireEvent.change(search(), { target: { value: 'berl' } });
    fireEvent.click(screen.getByRole('button', { name: /Berlin/ }));
    fireEvent.change(search(), { target: { value: 'prag' } });
    fireEvent.click(screen.getByRole('button', { name: /Prague/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.change(screen.getByLabelText('Departure date'), { target: { value: '2027-06-01' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create trip' }));
    expect(await screen.findByRole('heading', { name: 'Prague' })).toBeInTheDocument();
    const [saved] = await db.trips.toArray();
    expect(saved!.name).toBe('Berlin → Prague');
    expect(saved!.stops.map((s) => s.place.id)).toEqual(['berlin', 'prague', 'berlin']);
    expect(saved!.traveller).toMatchObject({
      residence: { type: 'europe', country: 'DE' },
      ageGroup: 'youth',
    });
  });

  it('drafts the route from one sentence with AI', async () => {
    await saveAiSettings({ provider: 'deepseek', keys: { deepseek: 'sk-test' }, models: {} });
    const args = JSON.stringify({
      origin: { city: 'Berlin', country: 'DE' },
      stops: [
        { city: 'Prague', country: 'CZ', nights: 2 },
        { city: 'Vienna', country: 'AT', nights: 3 },
      ],
      return_to_start: false,
      start_date: '2030-07-01',
      summary: 'Berlin to Vienna via Prague',
    });
    const sse = (chunks: unknown[]) =>
      new Response(
        chunks.map((c) => `data: ${JSON.stringify(c)}\n\n`).join('') + 'data: [DONE]\n\n',
      );
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        sse([
          {
            choices: [
              {
                delta: {
                  tool_calls: [
                    { index: 0, id: 'c1', function: { name: 'propose_route', arguments: args } },
                  ],
                },
              },
            ],
          },
        ]),
      )
      .mockResolvedValueOnce(sse([{ choices: [{ delta: { content: '' } }] }]));
    vi.stubGlobal('fetch', fetchMock);
    at('/new');
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.change(await screen.findByLabelText('Describe your trip'), {
      target: { value: 'Berlin to Vienna, 5 nights' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Plan with AI' }));
    expect(await screen.findByText('Berlin to Vienna via Prague')).toBeInTheDocument();
    expect(screen.getByText('Vienna')).toBeInTheDocument();
    const body = JSON.parse(fetchMock.mock.calls[0]![1].body as string);
    expect(body.tools.map((t: { function: { name: string } }) => t.function.name)).toEqual([
      'propose_route',
    ]);
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByLabelText('Departure date')).toHaveValue('2030-07-01');
  });
});

describe('AI assistant', () => {
  afterEach(() => vi.unstubAllGlobals());
  const sse = (chunks: unknown[]) =>
    new Response(chunks.map((c) => `data: ${JSON.stringify(c)}\n\n`).join('') + 'data: [DONE]\n\n');

  it('asks for a key first', async () => {
    const trip = makeSampleTrip('en');
    await saveTrip(trip);
    at(`/trip/${trip.id}/route`);
    fireEvent.click(await screen.findByRole('button', { name: 'Open the AI assistant' }));
    expect(await screen.findByText('Bring your own AI key')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Set up in Settings' })).toHaveAttribute(
      'href',
      '/settings#ai',
    );
  });

  it('proposes a change, applies it and undoes it', async () => {
    const trip = makeSampleTrip('en');
    await saveTrip(trip);
    await saveAiSettings({ provider: 'deepseek', keys: { deepseek: 'sk-test' }, models: {} });
    const args = JSON.stringify({
      summary: 'Stay longer in Rome',
      ops: [{ op: 'set_nights', stop: 's7', nights: 4 }],
    });
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValueOnce(
          sse([
            {
              choices: [
                {
                  delta: {
                    tool_calls: [
                      { index: 0, id: 'c1', function: { name: 'propose_patch', arguments: args } },
                    ],
                  },
                },
              ],
            },
          ]),
        )
        .mockResolvedValueOnce(
          sse([{ choices: [{ delta: { content: 'Here is a **slower** plan.' } }] }]),
        ),
    );
    at(`/trip/${trip.id}/route`);
    fireEvent.click(await screen.findByRole('button', { name: 'Open the AI assistant' }));
    expect(await screen.findByText('How should we change your trip?')).toBeInTheDocument();
    fireEvent.change(screen.getByRole('textbox', { name: 'Ask about your trip…' }), {
      target: { value: 'More time in Rome' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    expect(await screen.findByText('Stay longer in Rome')).toBeInTheDocument();
    expect(screen.getByText('Rome: 3 → 4 nights')).toBeInTheDocument();
    expect(await screen.findByText('slower')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Apply changes' }));
    const rome = async () =>
      (await db.trips.get(trip.id))!.stops.find((s) => s.place.id === 'rome')!.nights;
    await waitFor(async () => expect(await rome()).toBe(4));
    expect(screen.getByText('Applied')).toBeInTheDocument();
    fireEvent.click(await screen.findByRole('button', { name: 'Undo' }));
    await waitFor(async () => expect(await rome()).toBe(3));
  });
});
