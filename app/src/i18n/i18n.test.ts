import { describe, expect, it } from 'vitest';
import { detectLanguage } from './index';
import en from './en.json';
import zhCN from './zh-CN.json';

function keys(obj: object, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === 'object' ? keys(v, `${prefix}${k}.`) : [`${prefix}${k}`],
  );
}

describe('translations', () => {
  // Plural forms differ by language (English: _one/_other, Chinese: _other), so compare base keys.
  const base = (o: object) =>
    [...new Set(keys(o).map((k) => k.replace(/_(zero|one|two|few|many|other)$/, '')))].sort();

  it('Chinese has exactly the same keys as English', () => {
    expect(base(zhCN)).toEqual(base(en));
  });

  it('every English plural has both one and other forms', () => {
    const ks = keys(en);
    const plural = ks
      .filter((k) => /_(one|other)$/.test(k))
      .map((k) => k.replace(/_(one|other)$/, ''));
    for (const b of new Set(plural)) {
      expect(ks).toContain(`${b}_one`);
      expect(ks).toContain(`${b}_other`);
    }
  });

  it('has no empty strings', () => {
    const empty = (o: object) =>
      keys(o).filter(
        (k) => !k.split('.').reduce<unknown>((a, p) => (a as Record<string, unknown>)[p], o),
      );
    expect(empty(en)).toEqual([]);
    expect(empty(zhCN)).toEqual([]);
  });
});

describe('detectLanguage', () => {
  it('prefers a saved choice', () => {
    expect(detectLanguage('zh-CN', ['en-GB'])).toBe('zh-CN');
    expect(detectLanguage('en', ['zh-CN'])).toBe('en');
  });
  it('falls back to the browser language', () => {
    expect(detectLanguage(null, ['zh-TW', 'en'])).toBe('zh-CN');
    expect(detectLanguage(null, ['de-DE'])).toBe('en');
  });
  it('ignores unknown saved values', () => {
    expect(detectLanguage('fr', ['en-US'])).toBe('en');
  });
});
