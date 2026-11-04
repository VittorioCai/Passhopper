import { beforeEach, describe, expect, it } from 'vitest';
import { db } from '../db/db';
import {
  activeProvider,
  clearAiKeys,
  loadAiSettings,
  protectKeys,
  saveAiSettings,
  unlockKeys,
  unprotectKeys,
} from './settings';
import { forget, vaultKeys } from './vault';

beforeEach(async () => {
  await db.meta.clear();
  forget();
});

describe('password-protected keys', () => {
  it('stores keys encrypted and unlocks them with the right password', async () => {
    await saveAiSettings({ provider: 'deepseek', keys: { deepseek: 'sk-secret' }, models: {} });
    await protectKeys('en', 'correct horse');
    const raw = JSON.stringify((await db.meta.get('ai'))!.value);
    expect(raw).not.toContain('sk-secret');
    const stored = await loadAiSettings('en');
    expect(stored.keys).toEqual({});
    expect(activeProvider(stored)).toBeNull();

    forget();
    expect(vaultKeys()).toBeNull();
    await expect(unlockKeys('en', 'wrong password')).rejects.toThrow('wrong_password');
    await unlockKeys('en', 'correct horse');
    expect(vaultKeys()).toEqual({ deepseek: 'sk-secret' });
  }, 20000);

  it('re-encrypts edited keys and can go back to plain storage', async () => {
    await saveAiSettings({ provider: 'claude', keys: { claude: 'sk-a' }, models: {} });
    await protectKeys('en', 'password1');
    const s = await loadAiSettings('en');
    await saveAiSettings({ ...s, keys: { claude: 'sk-b' } });
    expect(JSON.stringify((await db.meta.get('ai'))!.value)).not.toContain('sk-b');
    forget();
    await unlockKeys('en', 'password1');
    expect(vaultKeys()).toEqual({ claude: 'sk-b' });
    await unprotectKeys('en');
    expect((await loadAiSettings('en')).keys).toEqual({ claude: 'sk-b' });
    expect((await loadAiSettings('en')).sealed).toBeUndefined();
  }, 20000);

  it('removing all keys also removes protected ones', async () => {
    await saveAiSettings({ provider: 'claude', keys: { claude: 'sk-a' }, models: {} });
    await protectKeys('en', 'password1');
    await clearAiKeys('en');
    const s = await loadAiSettings('en');
    expect(s.sealed).toBeUndefined();
    expect(vaultKeys()).toBeNull();
  }, 20000);
});
