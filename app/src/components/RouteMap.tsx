/**
 * The route on a map (F1.7): MapLibre with OpenFreeMap tiles (free, no key; RULES-AND-SOURCES E4).
 * Loaded only when shown, since the map library is large.
 */
import * as maplibregl from 'maplibre-gl';
import type { FeatureCollection } from 'geojson';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useEffect, useRef } from 'react';
import type { Trip } from '../model/schema';
import { placeName } from '../lib';
import { resolvedTheme } from '../theme';
import { routeGeometry } from './routeGeometry';
import s from './RouteMap.module.css';

maplibregl.setWorkerUrl(workerUrl);

const STYLE = {
  light: 'https://tiles.openfreemap.org/styles/positron',
  dark: 'https://tiles.openfreemap.org/styles/dark',
};

export default function RouteMap({ trip, lang }: { trip: Trip; lang: string }) {
  const el = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markers = useRef<maplibregl.Marker[]>([]);
  const dark = resolvedTheme() === 'dark';

  useEffect(() => {
    if (!el.current) return;
    const m = new maplibregl.Map({
      container: el.current,
      style: dark ? STYLE.dark : STYLE.light,
      center: [10, 48],
      zoom: 3.5,
      attributionControl: { compact: true },
      cooperativeGestures: true,
    });
    m.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    // Start with the attribution folded into its (i) button; it opens on tap.
    m.once('load', () =>
      el.current
        ?.querySelector('.maplibregl-ctrl-attrib')
        ?.classList.remove('maplibregl-compact-show'),
    );
    map.current = m;
    return () => {
      m.remove();
      map.current = null;
    };
  }, [dark]);

  useEffect(() => {
    const m = map.current;
    if (!m) return;
    const { lines, markers: pts } = routeGeometry(trip, dark);
    const draw = () => {
      const data: FeatureCollection = { type: 'FeatureCollection', features: lines };
      const src = m.getSource('route') as maplibregl.GeoJSONSource | undefined;
      if (src) src.setData(data);
      else {
        m.addSource('route', { type: 'geojson', data });
        m.addLayer({
          id: 'route-casing',
          type: 'line',
          source: 'route',
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: { 'line-color': dark ? '#0b0e14' : '#ffffff', 'line-width': 8 },
        });
        m.addLayer({
          id: 'route',
          type: 'line',
          source: 'route',
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: {
            'line-color': ['get', 'color'],
            'line-width': 4,
            'line-dasharray': [
              'case',
              ['get', 'night'],
              ['literal', [1, 1.6]],
              ['literal', [1, 0]],
            ],
          },
        });
      }
      markers.current.forEach((mk) => mk.remove());
      markers.current = pts.map(({ stop, at, index }) => {
        const dot = document.createElement('div');
        dot.className = index === 0 ? `${s.marker} ${s.start}` : (s.marker ?? '');
        dot.textContent = index === 0 ? '' : String(index);
        dot.title = placeName(stop.place, lang);
        const label = document.createElement('span');
        label.className = s.label ?? '';
        label.textContent = placeName(stop.place, lang);
        dot.appendChild(label);
        return new maplibregl.Marker({ element: dot }).setLngLat([at[1], at[0]]).addTo(m);
      });
      if (pts.length) {
        const b = new maplibregl.LngLatBounds();
        pts.forEach(({ at }) => b.extend([at[1], at[0]]));
        m.fitBounds(b, {
          padding: { top: 36, bottom: 48, left: 36, right: 48 },
          maxZoom: 7,
          duration: 0,
        });
      }
    };
    if (m.isStyleLoaded()) draw();
    else m.once('load', draw);
  }, [trip, dark, lang]);

  return <div ref={el} className={s.map} />;
}
