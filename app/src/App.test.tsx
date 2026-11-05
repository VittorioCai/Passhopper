import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { protectKeys, saveAiSettings } from './ai/settings';
import { forget } from './ai/vault';
import { setCurrency } from './fx';
import { App } from './App';
import { makeSampleTrip } from './data/sampleTrip';
import { db } from './db/db';
import { saveTrip } from './db/trips';
import { encodeTrip } from './model/share';
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

  it('shows the trip as a calendar and jumps to a day', async () => {
    const trip = makeSampleTrip('en');
    await saveTrip(trip);
    at(`/trip/${trip.id}/days`);
    const cal = await screen.findByRole('region', { name: 'Trip calendar' });
    expect(within(cal).getByText('July 2027')).toBeInTheDocument();
    const munich = within(cal).getByRole('button', { name: '2027-07-16: Travel day' });
    Element.prototype.scrollIntoView = vi.fn();
    fireEvent.click(munich);
    expect(Element.prototype.scrollIntoView).toHaveBeenCalled();
    expect(within(cal).getByRole('button', { name: '2027-07-14: Ticket' })).toBeInTheDocument();
  });

  it('shows totals in a home currency too', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(JSON.stringify({ date: '2026-11-04', rates: { USD: 1.1 } })));
    vi.stubGlobal('fetch', fetchMock);
    setCurrency('USD');
    const trip = makeSampleTrip('en');
    await saveTrip(trip);
    at(`/trip/${trip.id}/days`);
    expect(await screen.findByText(/^≈ \$\d+/)).toBeInTheDocument();
    expect(fetchMock.mock.calls[0]![0]).toContain('api.frankfurter.dev/v1/latest?base=EUR');
    setCurrency(null);
  });

  it('changes the traveller after the trip is made', async () => {
    const trip = makeSampleTrip('en');
    await saveTrip(trip);
    at(`/trip/${trip.id}/route`);
    fireEvent.click(await screen.findByRole('button', { name: 'Edit' }));
    fireEvent.change(screen.getByLabelText('Age'), { target: { value: 'adult' } });
    fireEvent.change(screen.getByLabelText('Where do you live?'), {
      target: { value: 'non_europe' },
    });
    await waitFor(async () =>
      expect((await db.trips.get(trip.id))!.traveller).toMatchObject({
        ageGroup: 'adult',
        residence: { type: 'non_europe' },
      }),
    );
  });

  it('adds a note to a city', async () => {
    const trip = makeSampleTrip('en');
    await saveTrip(trip);
    at(`/trip/${trip.id}/route`);
    fireEvent.click(await screen.findByRole('button', { name: 'Edit' }));
    fireEvent.click(screen.getAllByRole('button', { name: 'Add a note' })[1]!);
    const dialog = screen.getByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText('Where you stay, what to do'), {
      target: { value: 'Hostel near the station' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    expect(
      await screen.findByRole('button', { name: 'Edit the note for Munich' }),
    ).toHaveTextContent('Hostel near the station');
    await waitFor(async () =>
      expect((await db.trips.get(trip.id))!.stops[1]!.note).toBe('Hostel near the station'),
    );
  });

  it('links to the operator and fee pages for a train', async () => {
    const trip = makeSampleTrip('en');
    await saveTrip(trip);
    at(`/trip/${trip.id}/route`);
    fireEvent.click(await screen.findByRole('button', { name: /^FR 9709,/ }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Check this train')).toBeInTheDocument();
    expect(within(dialog).getByRole('link', { name: /Trenitalia/ })).toHaveAttribute(
      'href',
      'https://www.trenitalia.com',
    );
    expect(
      within(dialog).getByRole('link', { name: /Interrail reservation fees/ }),
    ).toHaveAttribute('href', expect.stringContaining('domestic-train-reservation-fees'));
    // No AI key: no AI price buttons.
    expect(within(dialog).queryByRole('button', { name: /AI estimate/ })).toBeNull();
  });

  it('fills in an AI price estimate', async () => {
    await saveAiSettings({ provider: 'deepseek', keys: { deepseek: 'sk-test' }, models: {} });
    const sse = (chunks: unknown[]) =>
      new Response(
        chunks.map((c) => `data: ${JSON.stringify(c)}\n\n`).join('') + 'data: [DONE]\n\n',
      );
    const args = JSON.stringify({ min_eur: 29.9, max_eur: 89, note: 'Trenitalia Base to Economy' });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        sse([
          {
            choices: [
              {
                delta: {
                  tool_calls: [
                    { index: 0, id: 'c1', function: { name: 'report_price', arguments: args } },
                  ],
                },
              },
            ],
          },
        ]),
      )
      .mockResolvedValueOnce(sse([{ choices: [{ delta: { content: '' } }] }]));
    vi.stubGlobal('fetch', fetchMock);
    const trip = makeSampleTrip('en');
    await saveTrip(trip);
    at(`/trip/${trip.id}/route`);
    fireEvent.click(await screen.findByRole('button', { name: /^FR 9709,/ }));
    const dialog = screen.getByRole('dialog');
    fireEvent.click(await within(dialog).findByRole('button', { name: /AI estimate/ }));
    expect(await within(dialog).findByText('Trenitalia Base to Economy')).toBeInTheDocument();
    expect(within(dialog).getByLabelText(/Ticket price you found/)).toHaveValue(89);
    const body = JSON.parse(fetchMock.mock.calls[0]![1].body as string);
    expect(body.tools.map((x: { function: { name: string } }) => x.function.name)).toEqual([
      'report_price',
    ]);
    fireEvent.click(within(dialog).getByRole('button', { name: 'Save' }));
    await waitFor(async () =>
      expect((await db.trips.get(trip.id))!.journeys[3]!.segments[0]!.price).toEqual({
        min: 30,
        max: 89,
        currency: 'EUR',
        source: 'ai_estimate',
      }),
    );
  });

  it('warns about a missed connection', async () => {
    const trip = makeSampleTrip('en');
    trip.stops[1]!.nights = 0;
    await saveTrip(trip);
    at(`/trip/${trip.id}/route`);
    expect(await screen.findByText(/You pass through Munich without staying/)).toBeInTheDocument();
  });

  it('finds trains for every empty leg at once', async () => {
    const fetchMock = vi.fn().mockImplementation(async (url: string) => {
      const q = new URL(url).searchParams;
      const [fla, flo] = q.get('fromPlace')!.split(',').map(Number);
      const [tla, tlo] = q.get('toPlace')!.split(',').map(Number);
      const start = new Date(q.get('time')!);
      const end = new Date(start.getTime() + 4 * 3600 * 1000);
      return new Response(
        JSON.stringify({
          itineraries: [
            {
              legs: [
                {
                  mode: 'LONG_DISTANCE',
                  displayName: 'IC 100',
                  startTime: start.toISOString(),
                  endTime: end.toISOString(),
                  from: { name: 'Start', lat: fla, lon: flo, tz: 'Europe/Berlin' },
                  to: { name: 'End', lat: tla, lon: tlo, tz: 'Europe/Berlin' },
                },
              ],
            },
          ],
        }),
      );
    });
    vi.stubGlobal('fetch', fetchMock);
    const trip = makeSampleTrip('en');
    trip.journeys.forEach((j) => (j.segments = []));
    await saveTrip(trip);
    at(`/trip/${trip.id}/route`);
    fireEvent.click(
      await screen.findByRole('button', { name: 'Find trains for the 9 legs without one' }),
    );
    const add = await screen.findByRole(
      'button',
      { name: 'Add trains for 9 legs' },
      { timeout: 5000 },
    );
    expect(fetchMock).toHaveBeenCalledTimes(9);
    fireEvent.click(add);
    await waitFor(async () =>
      expect(
        (await db.trips.get(trip.id))!.journeys.every(
          (j) => j.segments[0]?.trainNumber === 'IC 100',
        ),
      ).toBe(true),
    );
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

describe('shared trips', () => {
  it('opens a shared link and saves a copy', async () => {
    const data = await encodeTrip(makeSampleTrip('en'));
    at(`/share#${data}`);
    expect(await screen.findByText('Someone shared this trip with you')).toBeInTheDocument();
    expect(screen.getByText('NJ 294')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Save a copy to my trips' }));
    expect(await screen.findByRole('heading', { name: 'Prague' })).toBeInTheDocument();
    expect(await db.trips.count()).toBe(1);
  });

  it('explains a broken link', async () => {
    at('/share#garbage');
    expect(await screen.findByText("This link doesn't open a trip")).toBeInTheDocument();
  });
});

describe('travel mode', () => {
  it('shows the next train on Home when it leaves within two days', async () => {
    const { addDays, todayLocal } = await import('./model/dates');
    const trip = {
      ...makeSampleTrip('en'),
      sample: undefined,
      name: 'Summer trip',
      startDate: addDays(todayLocal(), 1),
    };
    await saveTrip(trip);
    at('/');
    expect(
      await screen.findByRole('link', { name: /Summer trip.*08:34.*ICE 1005/s }),
    ).toBeInTheDocument();
  });

  it('prints the itinerary', async () => {
    const trip = makeSampleTrip('en');
    await saveTrip(trip);
    window.print = vi.fn();
    at(`/trip/${trip.id}/print`);
    expect(await screen.findByText('NJ 294')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Print or save as PDF' }));
    expect(window.print).toHaveBeenCalled();
  });
});

describe('route ideas', () => {
  it('starts a trip from a route idea, with notes for each city', async () => {
    at('/');
    fireEvent.click(await screen.findByRole('link', { name: /Route ideas/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'Scenic' }));
    fireEvent.click(screen.getByRole('link', { name: /Across the Alps/ }));
    expect(await screen.findByText(/Nordkette cable car/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Use this route' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Next' }));
    expect(screen.getByText('Interlaken')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    fireEvent.change(screen.getByLabelText('Departure date'), { target: { value: '2027-06-01' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create trip' }));
    expect(await screen.findByRole('heading', { name: 'Lucerne' })).toBeInTheDocument();
    const [saved] = await db.trips.toArray();
    expect(saved!.name).toBe('Across the Alps');
    expect(saved!.stops.map((x) => x.place.id)).toEqual([
      'munich',
      'salzburg',
      'innsbruck',
      'zurich',
      'lucerne',
      'interlaken',
      'milan',
    ]);
    expect(saved!.stops[2]!.note).toMatch(/Nordkette/);
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

  it('asks for the password when keys are protected', async () => {
    await saveAiSettings({ provider: 'deepseek', keys: { deepseek: 'sk-test' }, models: {} });
    await protectKeys('en', 'password1');
    forget();
    const trip = makeSampleTrip('en');
    await saveTrip(trip);
    at(`/trip/${trip.id}/route`);
    fireEvent.click(await screen.findByRole('button', { name: 'Open the AI assistant' }));
    fireEvent.change(await screen.findByLabelText('Password'), { target: { value: 'nope' } });
    fireEvent.click(screen.getByRole('button', { name: 'Unlock' }));
    expect(await screen.findByText("That password didn't work.")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'password1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Unlock' }));
    expect(
      await screen.findByText('How should we change your trip?', {}, { timeout: 5000 }),
    ).toBeInTheDocument();
    forget();
  }, 20000);

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
