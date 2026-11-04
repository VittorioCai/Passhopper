import { describe, expect, it } from 'vitest';
import { makeSampleTrip } from '../data/sampleTrip';
import { routeGeometry } from './routeGeometry';

describe('routeGeometry', () => {
  it('draws one line per journey and one marker per place', () => {
    const { lines, markers } = routeGeometry(makeSampleTrip('en'), false);
    expect(lines).toHaveLength(9);
    // Berlin appears at the start and the end, but gets one marker.
    expect(markers.map((m) => m.stop.place.id)).toEqual([
      'berlin',
      'munich',
      'zurich',
      'milan',
      'venice',
      'florence',
      'rome',
      'vienna',
      'prague',
    ]);
    expect(lines[0]!.geometry.coordinates[0]).toEqual([13.3694, 52.5251]);
    expect(lines.filter((l) => l.properties.night)).toHaveLength(1);
    expect(lines[0]!.properties.color).not.toBe(
      routeGeometry(makeSampleTrip('en'), true).lines[0]!.properties.color,
    );
  });

  it('skips places without coordinates', () => {
    const t = makeSampleTrip('en');
    t.stops[2] = { ...t.stops[2]!, place: { id: 'custom-x', en: 'X', local: 'X', country: 'CH' } };
    const { lines, markers } = routeGeometry(t, false);
    expect(lines).toHaveLength(7);
    expect(markers).toHaveLength(8);
  });
});
