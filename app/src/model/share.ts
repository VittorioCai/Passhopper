/**
 * Share a trip as a link (F0.5). The trip is compressed into the part of the URL after `#`, which
 * browsers never send to a server. Booking references, seats and amounts paid are left out.
 */
import { TripSchema, type Trip } from './schema';

const toB64url = (bytes: Uint8Array) => {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
const fromB64url = (s: string) => {
  const b = atob(s.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(b, (c) => c.charCodeAt(0));
};

async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream) {
  const writer = stream.writable.getWriter();
  // Read while writing; a broken input fails the read, which the callers catch.
  writer.write(bytes as BufferSource).catch(() => {});
  writer.close().catch(() => {});
  return new Uint8Array(await new Response(stream.readable).arrayBuffer());
}

/** The trip without anything private, ready to share. */
export function shareable(trip: Trip): Trip {
  return {
    ...trip,
    sample: undefined,
    journeys: trip.journeys.map((j) => ({
      ...j,
      segments: j.segments.map((s) => ({ ...s, reservation: undefined })),
    })),
  };
}

export async function encodeTrip(trip: Trip): Promise<string> {
  const json = new TextEncoder().encode(JSON.stringify(shareable(trip)));
  return toB64url(await pipe(json, new CompressionStream('deflate-raw')));
}

/** The trip in a shared link, or null if the link is broken or from a newer version. */
export async function decodeTrip(data: string): Promise<Trip | null> {
  try {
    const bytes = await pipe(fromB64url(data), new DecompressionStream('deflate-raw'));
    const parsed = TripSchema.safeParse(JSON.parse(new TextDecoder().decode(bytes)));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

/** Full link to the share page, under the app's base path. */
export const shareUrl = (data: string) =>
  `${location.origin}${import.meta.env.BASE_URL}share#${data}`;
