import { SparkleIcon } from '@phosphor-icons/react';
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { classifyError } from '../ai/agent';
import { draftRoute, type Draft } from '../ai/draft';
import { activeProvider, useAiSettings } from '../ai/settings';
import { todayLocal } from '../model/dates';
import { useLang } from '../lib';
import s from './AiDraftBox.module.css';

/** "Describe your trip" in the new-trip wizard. Without an AI key it only points to Settings. */
export function AiDraftBox({ onDraft }: { onDraft: (d: Draft) => void }) {
  const { t } = useTranslation();
  const lang = useLang();
  const provider = activeProvider(useAiSettings(lang));
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const abort = useRef<AbortController | null>(null);

  if (!provider)
    return (
      <p className={s.hint}>
        <SparkleIcon size={16} weight="fill" />
        <span>
          {t('draft.noKey')} <Link to="/settings#ai">{t('ai.openSettings')}</Link>
        </span>
      </p>
    );

  const go = async () => {
    if (!text.trim() || busy) return;
    const ctrl = new AbortController();
    abort.current = ctrl;
    setBusy(true);
    setMsg(null);
    try {
      const r = await draftRoute(provider, lang, text.trim(), todayLocal(), ctrl.signal);
      if (r.draft) {
        onDraft(r.draft);
        setMsg({ ok: true, text: r.draft.summary || t('draft.done') });
      } else setMsg({ ok: false, text: r.text || t('draft.nothing') });
    } catch (err) {
      const e = await classifyError(err);
      if (e.kind !== 'aborted') setMsg({ ok: false, text: t(`ai.err.${e.kind}`) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={s.box}>
      <label className={s.label} htmlFor="ai-draft">
        <SparkleIcon size={16} weight="fill" />
        {t('draft.title')}
      </label>
      <textarea
        id="ai-draft"
        rows={2}
        maxLength={600}
        value={text}
        placeholder={t('draft.placeholder')}
        onChange={(e) => setText(e.target.value)}
      />
      <div className={s.row}>
        {busy ? (
          <button type="button" className={s.btn} onClick={() => abort.current?.abort()}>
            {t('draft.working')}
          </button>
        ) : (
          <button type="button" className={s.btn} disabled={!text.trim()} onClick={() => void go()}>
            {t('draft.go')}
          </button>
        )}
        <span className={s.or}>{t('draft.or')}</span>
      </div>
      {msg && (
        <p className={msg.ok ? s.ok : s.err} role="status">
          {msg.text}
        </p>
      )}
    </div>
  );
}
