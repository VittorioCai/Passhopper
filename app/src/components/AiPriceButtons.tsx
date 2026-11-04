import { GlobeHemisphereWestIcon, SparkleIcon } from '@phosphor-icons/react';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { classifyError } from '../ai/agent';
import { canSearch, lookUpPrice, type PriceQuery } from '../ai/price';
import { activeProvider, useAiSettings } from '../ai/settings';
import type { Source } from '../ai/tools';
import type { Price } from '../model/schema';
import { useLang } from '../lib';
import { hostOf } from './Markdown';
import s from './AiPriceButtons.module.css';

/** "AI estimate" and "Look up online" next to the ticket price (F4.4). Hidden without an AI key. */
export function AiPriceButtons({
  query,
  current,
  onPrice,
}: {
  query: PriceQuery;
  /** The AI price shown in the field, if it is still the one there. */
  current?: Price;
  onPrice: (p: Price) => void;
}) {
  const { t } = useTranslation();
  const lang = useLang();
  const provider = activeProvider(useAiSettings(lang));
  const [busy, setBusy] = useState<'estimate' | 'search' | null>(null);
  const [info, setInfo] = useState<{ note?: string; sources: Source[] } | null>(null);
  const [error, setError] = useState('');
  const abort = useRef<AbortController | null>(null);
  if (!provider) return null;

  const run = async (search: boolean) => {
    if (busy) {
      abort.current?.abort();
      return;
    }
    const ctrl = new AbortController();
    abort.current = ctrl;
    setBusy(search ? 'search' : 'estimate');
    setError('');
    try {
      const r = await lookUpPrice(provider, lang, query, search, ctrl.signal);
      if (r.price) {
        onPrice(r.price);
        setInfo({ note: r.note, sources: r.sources });
      } else setError(t('aiPrice.none'));
    } catch (err) {
      const e = await classifyError(err);
      if (e.kind !== 'aborted') setError(t(`ai.err.${e.kind}`));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className={s.wrap}>
      <div className={s.row}>
        <button
          type="button"
          className={s.btn}
          onClick={() => void run(false)}
          disabled={busy === 'search'}
        >
          <SparkleIcon size={14} weight="fill" />
          {busy === 'estimate' ? t('aiPrice.working') : t('aiPrice.estimate')}
        </button>
        {canSearch(provider) && (
          <button
            type="button"
            className={`${s.btn} ${s.web}`}
            onClick={() => void run(true)}
            disabled={busy === 'estimate'}
          >
            <GlobeHemisphereWestIcon size={14} weight="bold" />
            {busy === 'search' ? t('aiPrice.working') : t('aiPrice.search')}
          </button>
        )}
      </div>
      {current && (
        <p className={s.result}>
          <span className={current.source === 'ai_search' ? s.tagWeb : s.tag}>
            {t(current.source === 'ai_search' ? 'source.ai_search' : 'source.ai_estimate')}
          </span>
          {t('aiPrice.range', { min: Math.round(current.min), max: Math.round(current.max) })}
          {info?.note && <span className={s.note}>{info.note}</span>}
        </p>
      )}
      {current && info && info.sources.length > 0 && (
        <div className={s.sources}>
          {info.sources.slice(0, 4).map((src) => (
            <a key={src.url} href={src.url} target="_blank" rel="noopener noreferrer nofollow">
              {hostOf(src.url)}
            </a>
          ))}
        </div>
      )}
      {error && (
        <p className={s.error} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
