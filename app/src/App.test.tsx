import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it } from 'vitest';
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
  await i18n.changeLanguage('en');
});

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

  it('adds a train by hand', async () => {
    const trip = makeSampleTrip('en');
    trip.journeys[0]!.segments = [];
    await saveTrip(trip);
    at(`/trip/${trip.id}/route`);
    fireEvent.click(
      await screen.findByRole('button', { name: 'Add a train from Berlin to Munich' }),
    );
    const dialog = screen.getByRole('dialog');
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
});
