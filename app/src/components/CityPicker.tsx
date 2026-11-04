import { MagnifyingGlassIcon, PlusIcon } from '@phosphor-icons/react';
import { useId, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { searchCities } from '../data/cities';
import { COUNTRY_CODES, type CountryCode } from '../data/countries';
import type { Place } from '../model/schema';
import { countryName, lineStyle, useLang } from '../lib';
import ui from './ui.module.css';

const slug = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

/** Search the city list, or add any other city by name and country. */
export function CityPicker({
  onPick,
  autoFocus,
}: {
  onPick: (p: Place) => void;
  autoFocus?: boolean;
}) {
  const { t } = useTranslation();
  const lang = useLang();
  const [q, setQ] = useState('');
  const [custom, setCustom] = useState<CountryCode | ''>('');
  const listId = useId();
  const results = useMemo(() => searchCities(q), [q]);
  const pick = (p: Place) => {
    onPick(p);
    setQ('');
    setCustom('');
  };
  return (
    <div className={ui.stack}>
      <label className={ui.search}>
        <MagnifyingGlassIcon size={18} weight="bold" aria-hidden="true" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t('city.search')}
          aria-label={t('city.search')}
          aria-controls={listId}
          autoFocus={autoFocus}
          autoComplete="off"
        />
      </label>
      {q.trim() && (
        <ul id={listId} className={ui.options} role="listbox" aria-label={t('city.results')}>
          {results.map((c) => (
            <li key={c.id} role="option" aria-selected="false">
              <button
                type="button"
                onClick={() =>
                  pick({ id: c.id, en: c.en, zh: c.zh, local: c.local, country: c.country })
                }
              >
                <span className={ui.cc} data-line style={lineStyle(c.country)}>
                  {c.country}
                </span>
                <span className={ui.optMain}>{lang.startsWith('zh') ? c.zh : c.en}</span>
                <span className={ui.optSub}>
                  {c.local !== c.en ? c.local : countryName(c.country, lang)}
                </span>
              </button>
            </li>
          ))}
          <li className={ui.customRow}>
            <span className={ui.optSub}>{t('city.notListed', { name: q.trim() })}</span>
            <span className={ui.row}>
              <select
                value={custom}
                onChange={(e) => setCustom(e.target.value as CountryCode)}
                aria-label={t('city.country')}
                className={ui.select}
              >
                <option value="">{t('city.country')}</option>
                {COUNTRY_CODES.map((cc) => (
                  <option key={cc} value={cc}>
                    {countryName(cc, lang)}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className={ui.btnSm}
                disabled={!custom}
                onClick={() =>
                  custom &&
                  pick({
                    id: `custom-${slug(q) || 'city'}-${custom.toLowerCase()}`,
                    en: q.trim(),
                    local: q.trim(),
                    country: custom,
                  })
                }
              >
                <PlusIcon size={14} weight="bold" />
                {t('city.addCustom')}
              </button>
            </span>
          </li>
        </ul>
      )}
    </div>
  );
}
