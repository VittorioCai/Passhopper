import type { Feature, LineString } from 'geojson';
import { COUNTRIES, isCountryCode } from '../data/countries';
import { CITY_COORDS } from '../data/stations';
import type { Trip } from '../model/schema';
import { isNightTrain } from '../model/trip';

type Line = Feature<LineString, { color: string; night: boolean }>;

/** Lines between stops (coloured by country, dashed for night trains) and one marker per place. */
export function routeGeometry(trip: Trip, dark: boolean) {
  const points = trip.stops.map((st) => ({ stop: st, at: CITY_COORDS[st.place.id] }));
  const lines: Line[] = [];
  trip.journeys.forEach((j, i) => {
    const a = points[i]?.at;
    const b = points[i + 1]?.at;
    if (!a || !b) return;
    const cc = trip.stops[i]!.place.country;
    const [light, darkC] = isCountryCode(cc) ? COUNTRIES[cc].line : ['#5A6478', '#A3ACBD'];
    lines.push({
      type: 'Feature',
      properties: { color: dark ? darkC : light, night: j.segments.some(isNightTrain) },
      geometry: {
        type: 'LineString',
        coordinates: [
          [a[1], a[0]],
          [b[1], b[0]],
        ],
      },
    });
  });
  // The start and a final return to it are the same place: one marker.
  const seen = new Set<string>();
  const markers = points.flatMap(({ stop, at }, i) => {
    if (!at || seen.has(stop.place.id)) return [];
    seen.add(stop.place.id);
    return [{ stop, at, index: i }];
  });
  return { lines, markers };
}
