/**
 * A tall picture of a trip to save or share: the route as a metro line, the dates and what the
 * trains cost. It is drawn on a canvas on this device. Booking references and seats are left out.
 */
import type { TFunction } from 'i18next';
import { COUNTRIES, isCountryCode } from '../data/countries';
import type { Plan } from '../engine/optimizer';
import { formatDate } from '../model/dates';
import type { Trip } from '../model/schema';
import {
  destinationCount,
  isNightTrain,
  journeyFrom,
  schedule,
  segmentCount,
  tripRange,
} from '../model/trip';
import { eur, placeName } from '../lib';
import { passName } from './passText';

export interface PosterRow {
  name: string;
  sub: string;
  date: string;
  /** Colour of the line down to the next stop. */
  color: string;
}

export interface PosterModel {
  kicker: string;
  days: string;
  cities: string;
  countries: string;
  facts: string[];
  rows: PosterRow[];
  cost?: { label: string; amount: string; note: string };
  footer: string;
}

export const POSTER_URL = 'vittoriocai.github.io/Passhopper';

export function posterModel(
  trip: Trip,
  plan: Plan | null,
  lang: string,
  t: TFunction,
): PosterModel {
  const range = tripRange(trip);
  const when = schedule(trip);
  const nightTrains = trip.journeys.filter((j) => j.segments.some(isNightTrain)).length;
  const countries = new Set(trip.stops.map((s) => s.place.country)).size;
  const rows = trip.stops.map((stop, i): PosterRow => {
    const next = trip.stops[i + 1];
    const night = next && journeyFrom(trip, stop.id)?.segments.some(isNightTrain);
    const parts = [
      i === 0
        ? t('poster.start')
        : stop.nights > 0
          ? t('route.nights', { count: stop.nights })
          : '',
      night ? t('poster.nightTo', { city: placeName(next.place, lang) }) : '',
    ].filter(Boolean);
    const cc = stop.place.country;
    return {
      name: placeName(stop.place, lang),
      sub: parts.join(' · '),
      date: formatDate(when[i]?.arrive ?? trip.startDate, lang),
      color: isCountryCode(cc) ? COUNTRIES[cc].line[0] : '#5A6478',
    };
  });
  const unpriced = plan?.days.some((d) =>
    d.items.some((i) => (d.choice !== 'pass' || !i.coverable) && !i.price),
  );
  const trains = segmentCount(trip);
  return {
    kicker: t('poster.kicker', { year: trip.startDate.slice(0, 4) }),
    days: t('poster.days', { count: range.days }),
    cities: t('poster.cities', { count: destinationCount(trip) }),
    countries: t('poster.countries', { count: countries }),
    facts: [
      trains ? t('poster.trains', { count: trains }) : '',
      nightTrains ? t('poster.nightTrains', { count: nightTrains }) : '',
      plan && trains ? passName(plan.result.product, t) : '',
    ].filter(Boolean),
    rows,
    cost:
      plan && trains
        ? {
            label: t(unpriced ? 'poster.costAtLeast' : 'poster.cost'),
            amount: eur(plan.total),
            note: unpriced
              ? t('poster.costParts')
              : `${t('pass.perDay', { amount: eur(plan.total / Math.max(1, range.days)) })}\n${t('poster.costParts')}`,
          }
        : undefined,
    footer: t('poster.footer'),
  };
}

const W = 1080;
const PAD = 72;
const MINT = '#2bd4a4';
const DEEP = '#04261c';
const INK = '#0f1524';
const INK2 = '#566074';
const SUN = '#ffd43b';
const DISPLAY = '"Bricolage Grotesque Variable", "Noto Sans SC", "PingFang SC", sans-serif';
const BODY = '"DM Sans Variable", "Noto Sans SC", "PingFang SC", sans-serif';
const ROW = 88;

function box(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}

/** Draws the poster and returns the canvas. Fonts the page already uses are loaded first. */
export async function drawPoster(m: PosterModel): Promise<HTMLCanvasElement> {
  const text = JSON.stringify(m);
  try {
    await Promise.all(
      [`800 60px ${DISPLAY}`, `700 30px ${BODY}`, `600 30px ${BODY}`].map((f) =>
        document.fonts.load(f, text),
      ),
    );
  } catch {
    // Draw with whatever fonts are there.
  }
  const canvas = document.createElement('canvas');
  const c = canvas.getContext('2d');
  if (!c) throw new Error('no canvas');

  // Lay the pills out first: they wrap, and the height depends on it.
  c.font = `700 34px ${BODY}`;
  const pills: { text: string; x: number; y: number; w: number }[] = [];
  let px = PAD;
  let py = 0;
  for (const f of m.facts) {
    const w = c.measureText(f).width + 56;
    if (px + w > W - PAD && px > PAD) {
      px = PAD;
      py += 80;
    }
    pills.push({ text: f, x: px, y: py, w });
    px += w + 14;
  }
  const pillsH = m.facts.length ? py + 66 : 0;
  const sheetH = m.rows.length * ROW + 56;
  const top = 84 + 44 + 150 + 176;
  const sheetY = top + (pillsH ? pillsH + 44 : 12);
  const costY = sheetY + sheetH + 56;
  const footY = costY + (m.cost ? 190 : 0) + 30;
  canvas.width = W;
  canvas.height = footY + 110;

  c.fillStyle = MINT;
  c.fillRect(0, 0, W, canvas.height);
  c.textBaseline = 'alphabetic';

  // Kicker and the big numbers.
  c.fillStyle = DEEP;
  c.font = `800 30px ${BODY}`;
  c.fillText(m.kicker, PAD, 110);
  c.font = `800 132px ${DISPLAY}`;
  c.fillText(m.days, PAD, 250);
  // The second line shrinks until the cities and countries fit side by side.
  let size = 132;
  const fits = () =>
    c.measureText(m.cities).width + c.measureText(m.countries).width + 84 <= W - PAD * 2 - 20;
  while (size > 72 && !fits()) {
    size -= 6;
    c.font = `800 ${size}px ${DISPLAY}`;
  }
  const k = size / 132;
  const cw = c.measureText(m.cities).width;
  c.save();
  c.translate(PAD + cw / 2 + 20, 350);
  c.rotate((-2 * Math.PI) / 180);
  c.fillStyle = SUN;
  box(c, -cw / 2 - 24, -66 * k, cw + 48, 142 * k, 30 * k);
  c.fill();
  c.fillStyle = INK;
  c.textAlign = 'center';
  c.fillText(m.cities, 0, 48 * k);
  c.restore();
  c.textAlign = 'left';
  c.fillStyle = DEEP;
  c.fillText(m.countries, PAD + cw + 84, 350 + 48 * k);

  // Facts.
  c.font = `700 34px ${BODY}`;
  for (const p of pills) {
    c.fillStyle = INK;
    box(c, p.x, top + p.y, p.w, 66, 33);
    c.fill();
    c.fillStyle = '#fff';
    c.fillText(p.text, p.x + 28, top + p.y + 45);
  }

  // The route.
  c.fillStyle = '#fff';
  box(c, PAD, sheetY, W - PAD * 2, sheetH, 56);
  c.fill();
  const railX = PAD + 62;
  const rowY = (i: number) => sheetY + 28 + i * ROW + ROW / 2;
  m.rows.forEach((r, i) => {
    if (i === m.rows.length - 1) return;
    c.fillStyle = r.color;
    c.fillRect(railX - 7, rowY(i), 14, ROW);
  });
  m.rows.forEach((r, i) => {
    const y = rowY(i);
    c.beginPath();
    c.arc(railX, y, 17, 0, Math.PI * 2);
    c.fillStyle = '#fff';
    c.fill();
    c.lineWidth = 9;
    c.strokeStyle = INK;
    c.stroke();
    const right = W - PAD - 44;
    c.font = `600 30px ${BODY}`;
    c.fillStyle = INK2;
    c.textAlign = 'right';
    c.fillText(r.date, right, y + 11);
    const dateW = c.measureText(r.date).width;
    c.textAlign = 'left';
    c.font = `800 44px ${DISPLAY}`;
    c.fillStyle = INK;
    const nameX = railX + 44;
    c.fillText(r.name, nameX, y + 15);
    const nameW = c.measureText(r.name).width;
    c.font = `600 30px ${BODY}`;
    c.fillStyle = INK2;
    // Leave the note out when it would run into the date.
    if (r.sub && nameX + nameW + 20 + c.measureText(r.sub).width < right - dateW - 24)
      c.fillText(r.sub, nameX + nameW + 20, y + 13);
  });

  // What the trains cost.
  if (m.cost) {
    c.fillStyle = DEEP;
    c.font = `700 32px ${BODY}`;
    c.fillText(m.cost.label, PAD, costY + 30);
    c.font = `800 108px ${DISPLAY}`;
    c.fillText(m.cost.amount, PAD, costY + 138);
    c.font = `700 30px ${BODY}`;
    c.textAlign = 'right';
    const lines = m.cost.note.split('\n');
    lines.forEach((l, i) => c.fillText(l, W - PAD, costY + 138 - (lines.length - 1 - i) * 44));
    c.textAlign = 'left';
  }

  // Logo and address.
  c.fillStyle = INK;
  box(c, PAD, footY, 64, 64, 18);
  c.fill();
  c.fillStyle = '#fff';
  c.font = `800 42px ${DISPLAY}`;
  c.textAlign = 'center';
  c.fillText('P', PAD + 31, footY + 47);
  c.beginPath();
  c.arc(PAD + 60, footY + 6, 11, 0, Math.PI * 2);
  c.fillStyle = SUN;
  c.fill();
  c.textAlign = 'left';
  c.fillStyle = DEEP;
  c.font = `800 40px ${DISPLAY}`;
  c.fillText('Passhopper', PAD + 84, footY + 46);
  c.textAlign = 'right';
  c.font = `700 26px ${BODY}`;
  c.fillText(m.footer, W - PAD, footY + 24);
  c.fillText(POSTER_URL, W - PAD, footY + 60);
  c.textAlign = 'left';
  return canvas;
}

export const canvasBlob = (canvas: HTMLCanvasElement) =>
  new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('no image'))), 'image/png'),
  );
