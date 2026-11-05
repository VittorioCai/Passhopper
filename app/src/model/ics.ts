/** The trip as an iCalendar file (RFC 5545): one event per train, one all-day event per stay. */
import { addDays } from './dates';
import type { Trip } from './schema';
import { trainMoments } from './itinerary';
import { schedule } from './trip';

const utc = (d: Date) =>
  d
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '');
const day = (s: string) => s.replace(/-/g, '');
/** Escape text and fold long lines as the format asks. */
const text = (s: string) =>
  s
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/[,;]/g, (c) => `\\${c}`);
const enc = new TextEncoder();
/** Lines may be at most 75 bytes; longer ones continue on the next line after a space. */
function fold(line: string) {
  const out: string[] = [];
  let cur = '';
  let bytes = 0;
  for (const ch of line) {
    const n = enc.encode(ch).length;
    if (bytes + n > (out.length ? 74 : 75)) {
      out.push(cur);
      cur = '';
      bytes = 0;
    }
    cur += ch;
    bytes += n;
  }
  out.push(cur);
  return out.join('\r\n ');
}

export interface IcsText {
  stay: (city: string, nights: number) => string;
  reservation: (ref?: string, seat?: string) => string;
}

export function tripToIcs(
  trip: Trip,
  names: (p: Trip['stops'][number]['place']) => string,
  words: IcsText,
  now = new Date(),
) {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Passhopper//Trip//EN',
    'CALSCALE:GREGORIAN',
    `X-WR-CALNAME:${text(trip.name)}`,
  ];
  const stamp = utc(now);
  for (const m of trainMoments(trip)) {
    const r = m.seg.reservation;
    const desc = [
      `${m.seg.from} → ${m.seg.to}`,
      r?.status === 'booked' ? words.reservation(r.ref, r.seat) : '',
    ]
      .filter(Boolean)
      .join('\n');
    lines.push(
      'BEGIN:VEVENT',
      `UID:${m.seg.id}@passhopper`,
      `DTSTAMP:${stamp}`,
      `DTSTART:${utc(m.dep)}`,
      `DTEND:${utc(m.arr)}`,
      `SUMMARY:${text(`🚆 ${m.seg.trainNumber || ''} ${m.seg.from} → ${m.seg.to}`.replace(/\s+/g, ' ').trim())}`,
      `LOCATION:${text(m.seg.from)}`,
      `DESCRIPTION:${text(desc)}`,
      'END:VEVENT',
    );
  }
  const sched = schedule(trip);
  trip.stops.forEach((s, i) => {
    const arrive = sched[i]?.arrive;
    if (!arrive || s.nights <= 0) return;
    lines.push(
      'BEGIN:VEVENT',
      `UID:stay-${s.id}@passhopper`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${day(arrive)}`,
      `DTEND;VALUE=DATE:${day(addDays(arrive, s.nights))}`,
      `SUMMARY:${text(words.stay(names(s.place), s.nights))}`,
      ...(s.note ? [`DESCRIPTION:${text(s.note)}`] : []),
      'TRANSP:TRANSPARENT',
      'END:VEVENT',
    );
  });
  lines.push('END:VCALENDAR');
  return lines.map(fold).join('\r\n') + '\r\n';
}

export function downloadIcs(name: string, body: string) {
  const blob = new Blob([body], { type: 'text/calendar;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${
    name
      .replace(/[^\p{L}\p{N} _-]+/gu, '')
      .replace(/\s+/g, ' ')
      .trim() || 'trip'
  }.ics`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
