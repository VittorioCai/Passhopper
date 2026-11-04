/**
 * Optional password protection for saved AI keys (F6.3, DEVELOPMENT.md §8): the keys are stored
 * encrypted with AES-GCM under a key derived from the password with PBKDF2. Once unlocked they are
 * kept in memory for this visit only; nothing decrypted is written anywhere.
 */
import { useSyncExternalStore } from 'react';
import { z } from 'zod';

export const SealedSchema = z.object({
  v: z.literal(1),
  salt: z.string(),
  iv: z.string(),
  data: z.string(),
});
export type Sealed = z.infer<typeof SealedSchema>;
export type Keys = Partial<Record<'deepseek' | 'claude' | 'custom', string>>;

const ITERATIONS = 310_000;
const enc = new TextEncoder();
const dec = new TextDecoder();
const b64 = (b: ArrayBuffer | Uint8Array) =>
  btoa(String.fromCharCode(...new Uint8Array(b instanceof Uint8Array ? b : new Uint8Array(b))));
const unb64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function deriveKey(password: string, salt: Uint8Array) {
  const base = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, [
    'deriveKey',
  ]);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: salt as BufferSource, iterations: ITERATIONS, hash: 'SHA-256' },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

async function sealWith(keys: Keys, key: CryptoKey, salt: string): Promise<Sealed> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    enc.encode(JSON.stringify(keys)),
  );
  return { v: 1, salt, iv: b64(iv), data: b64(data) };
}

interface Session {
  keys: Keys;
  key: CryptoKey;
  salt: string;
}

let session: Session | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

/** The unlocked keys for this visit, or null. Re-renders when they change. */
export function useVault(): Keys | null {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => session?.keys ?? null,
  );
}

export const vaultKeys = () => session?.keys ?? null;

/** Encrypts the keys with a new password and keeps them unlocked. */
export async function lockWithPassword(keys: Keys, password: string): Promise<Sealed> {
  const saltBytes = crypto.getRandomValues(new Uint8Array(16));
  const salt = b64(saltBytes);
  const key = await deriveKey(password, saltBytes);
  session = { keys, key, salt };
  emit();
  return sealWith(keys, key, salt);
}

/** Decrypts the keys. Throws on a wrong password. */
export async function unlock(sealed: Sealed, password: string): Promise<Keys> {
  const key = await deriveKey(password, unb64(sealed.salt));
  let plain: ArrayBuffer;
  try {
    plain = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: unb64(sealed.iv) as BufferSource },
      key,
      unb64(sealed.data) as BufferSource,
    );
  } catch {
    throw new Error('wrong_password');
  }
  const keys = JSON.parse(dec.decode(plain)) as Keys;
  session = { keys, key, salt: sealed.salt };
  emit();
  return keys;
}

/** Re-encrypts changed keys with the unlocked password. */
export async function reseal(keys: Keys): Promise<Sealed> {
  if (!session) throw new Error('locked');
  session = { ...session, keys };
  emit();
  return sealWith(keys, session.key, session.salt);
}

/** Forgets the unlocked keys (for this visit). */
export function forget() {
  session = null;
  emit();
}
