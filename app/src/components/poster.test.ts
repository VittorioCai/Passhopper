import { describe, expect, it } from 'vitest';
import { makeSampleTrip } from '../data/sampleTrip';
import { analyze, currentPlan } from '../engine/optimizer';
import i18n from '../i18n';
import { posterModel } from './poster';

describe('trip picture', () => {
  const trip = makeSampleTrip('en');
  const plan = currentPlan(trip, analyze(trip));

  it('sums the trip up: days, cities, countries, trains and the pass', () => {
    const m = posterModel(trip, plan, 'en', i18n.t);
    expect(m.kicker).toBe('MY INTERRAIL · 2027');
    expect([m.days, m.cities, m.countries]).toEqual(['20 days', '8 cities', '5 countries']);
    expect(m.facts).toEqual(['9 trains', '1 night train', '7-day Flexi']);
  });

  it('lists every stop with its nights, date and line colour', () => {
    const m = posterModel(trip, plan, 'en', i18n.t);
    expect(m.rows).toHaveLength(trip.stops.length);
    expect(m.rows[0]).toMatchObject({ name: 'Berlin', sub: 'start', date: 'Jul 14' });
    expect(m.rows[1]).toMatchObject({ name: 'Munich', sub: '2 nights' });
    const rome = m.rows.find((r) => r.name === 'Rome')!;
    expect(rome.sub).toBe('3 nights · night train to Vienna');
    expect(rome.color).toMatch(/^#[0-9A-F]{6}$/i);
  });

  it('shows what the trains cost, and never a booking reference or seat', () => {
    const booked = structuredClone(trip);
    booked.journeys[0]!.segments[0]!.reservation = { status: 'booked', ref: 'ABC123', seat: '12A' };
    const m = posterModel(booked, plan, 'en', i18n.t);
    expect(m.cost).toMatchObject({ label: 'Trains, about', amount: `€${Math.round(plan!.total)}` });
    expect(JSON.stringify(m)).not.toMatch(/ABC123|12A/);
  });

  it('leaves the cost out when there are no trains yet', () => {
    const empty = { ...trip, journeys: trip.journeys.map((j) => ({ ...j, segments: [] })) };
    const m = posterModel(empty, currentPlan(empty, analyze(empty)), 'en', i18n.t);
    expect(m.cost).toBeUndefined();
    expect(m.facts).toEqual([]);
  });
});
