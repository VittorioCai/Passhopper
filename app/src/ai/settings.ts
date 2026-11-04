import { useLiveQuery } from 'dexie-react-hooks';
import { z } from 'zod';
import { db, type PasshopperDB } from '../db/db';
import {
  forget,
  lockWithPassword,
  reseal,
  SealedSchema,
  unlock,
  useVault,
  vaultKeys,
} from './vault';

export type ProviderId = 'deepseek' | 'claude' | 'custom';
export const PROVIDER_IDS: ProviderId[] = ['deepseek', 'claude', 'custom'];

export interface ProviderInfo {
  name: string;
  /** Default model; people can change it in Settings. */
  model: string;
  baseUrl?: string;
  keyUrl?: string;
  color: string;
}

export const PROVIDERS: Record<ProviderId, ProviderInfo> = {
  deepseek: {
    name: 'DeepSeek',
    model: 'deepseek-v4-flash',
    baseUrl: 'https://api.deepseek.com',
    keyUrl: 'https://platform.deepseek.com/api_keys',
    color: '#4D6BFE',
  },
  claude: {
    name: 'Claude',
    model: 'claude-opus-5-5',
    keyUrl: 'https://platform.claude.com/settings/keys',
    color: '#D97757',
  },
  custom: { name: 'OpenAI-compatible', model: '', color: '#5A6478' },
};

const SettingsSchema = z.object({
  provider: z.enum(['deepseek', 'claude', 'custom']),
  keys: z.object({
    deepseek: z.string().optional(),
    claude: z.string().optional(),
    custom: z.string().optional(),
  }),
  models: z.object({
    deepseek: z.string().optional(),
    claude: z.string().optional(),
    custom: z.string().optional(),
  }),
  customBaseUrl: z.string().optional(),
  /** Keys encrypted with the traveller's password; `keys` is then empty on disk. */
  sealed: SealedSchema.optional(),
});
export type AiSettings = z.infer<typeof SettingsSchema>;

const KEY = 'ai';

/** English speakers get Claude first; Chinese speakers get DeepSeek, which works from mainland China. */
export const defaultSettings = (lang: string): AiSettings => ({
  provider: lang.startsWith('zh') ? 'deepseek' : 'claude',
  keys: {},
  models: {},
});

export async function loadAiSettings(lang: string, store: PasshopperDB = db): Promise<AiSettings> {
  const row = await store.meta.get(KEY);
  const parsed = SettingsSchema.safeParse(row?.value);
  return parsed.success ? parsed.data : defaultSettings(lang);
}

/** Settings with the keys filled in from the unlocked vault when they are password-protected. */
export function useAiSettings(lang: string): AiSettings | undefined {
  const s = useLiveQuery(() => loadAiSettings(lang), [lang]);
  const unlocked = useVault();
  return s?.sealed ? { ...s, keys: unlocked ?? {} } : s;
}

/** Keys are protected and not unlocked in this visit. */
export const isLocked = (s: AiSettings | undefined, unlocked: unknown) => !!s?.sealed && !unlocked;

/** Saves settings. Protected keys are re-encrypted, never written in plain text. */
export async function saveAiSettings(s: AiSettings, store: PasshopperDB = db) {
  const out = s.sealed
    ? { ...s, keys: {}, sealed: vaultKeys() ? await reseal(s.keys) : s.sealed }
    : s;
  await store.meta.put({ key: KEY, value: SettingsSchema.parse(out) });
}

/** Removes every saved key, protected or not, but keeps the other choices. */
export async function clearAiKeys(lang: string, store: PasshopperDB = db) {
  const s = await loadAiSettings(lang, store);
  forget();
  await store.meta.put({
    key: KEY,
    value: SettingsSchema.parse({ ...s, keys: {}, sealed: undefined }),
  });
}

/** Encrypts the saved keys with a password. */
export async function protectKeys(lang: string, password: string, store: PasshopperDB = db) {
  const s = await loadAiSettings(lang, store);
  const sealed = await lockWithPassword(s.keys, password);
  await store.meta.put({ key: KEY, value: SettingsSchema.parse({ ...s, keys: {}, sealed }) });
}

/** Unlocks protected keys for this visit. Throws `wrong_password`. */
export async function unlockKeys(lang: string, password: string, store: PasshopperDB = db) {
  const s = await loadAiSettings(lang, store);
  if (s.sealed) await unlock(s.sealed, password);
}

/** Stores the (unlocked) keys in plain form again, without a password. */
export async function unprotectKeys(lang: string, store: PasshopperDB = db) {
  const s = await loadAiSettings(lang, store);
  const keys = vaultKeys();
  if (!s.sealed || !keys) return;
  forget();
  await store.meta.put({
    key: KEY,
    value: SettingsSchema.parse({ ...s, keys, sealed: undefined }),
  });
}

export interface ActiveProvider {
  id: ProviderId;
  key: string;
  model: string;
  baseUrl: string;
  /** A DeepSeek key, if saved, also powers web search for the other OpenAI-style providers. */
  searchKey?: string;
}

/** The provider to use now, or null when it is not set up yet. */
export function activeProvider(s: AiSettings | undefined): ActiveProvider | null {
  if (!s) return null;
  const id = s.provider;
  const key = s.keys[id]?.trim();
  const model = (s.models[id]?.trim() || PROVIDERS[id].model).trim();
  const baseUrl = (id === 'custom' ? s.customBaseUrl?.trim() : PROVIDERS[id].baseUrl) ?? '';
  if (!key || !model || (id === 'custom' && !/^https:\/\//.test(baseUrl))) return null;
  return {
    id,
    key,
    model,
    baseUrl: baseUrl.replace(/\/+$/, ''),
    searchKey: s.keys.deepseek?.trim(),
  };
}
