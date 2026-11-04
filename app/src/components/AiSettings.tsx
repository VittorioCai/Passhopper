import { EyeIcon, EyeSlashIcon, PlugsConnectedIcon } from '@phosphor-icons/react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { classifyError, testConnection } from '../ai/agent';
import {
  activeProvider,
  clearAiKeys,
  PROVIDER_IDS,
  PROVIDERS,
  saveAiSettings,
  useAiSettings,
  type AiSettings,
  type ProviderId,
} from '../ai/settings';
import { useLang } from '../lib';
import ui from './ui.module.css';

/** Provider, key and model. Keys are kept in this browser's IndexedDB only (DEVELOPMENT.md §8). */
export function AiSettingsCard() {
  const { t } = useTranslation();
  const lang = useLang();
  const saved = useAiSettings(lang);
  const [show, setShow] = useState(false);
  const [test, setTest] = useState<{ ok: boolean; text: string } | 'running' | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (saved && location.hash === '#ai') ref.current?.scrollIntoView({ block: 'start' });
  }, [saved]);
  if (!saved) return null;
  const s = saved;
  const id = s.provider;
  const save = (next: AiSettings) => {
    setTest(null);
    void saveAiSettings(next);
  };
  const setField = (field: 'keys' | 'models', value: string) =>
    save({ ...s, [field]: { ...s[field], [id]: value } });

  const runTest = async () => {
    const p = activeProvider(s);
    if (!p) return;
    setTest('running');
    const ctrl = new AbortController();
    const timer = window.setTimeout(() => ctrl.abort(), 30000);
    try {
      await testConnection(p, ctrl.signal);
      setTest({ ok: true, text: t('ai.testOk') });
    } catch (err) {
      const e = await classifyError(err);
      setTest({ ok: false, text: t(`ai.err.${e.kind === 'aborted' ? 'network' : e.kind}`) });
    } finally {
      window.clearTimeout(timer);
    }
  };

  return (
    <div ref={ref} id="ai" className={`${ui.card} ${ui.stack}`}>
      <div className={ui.segCtl} role="group" aria-label={t('ai.provider')}>
        {PROVIDER_IDS.map((p: ProviderId) => (
          <button
            key={p}
            type="button"
            aria-pressed={id === p}
            onClick={() => save({ ...s, provider: p })}
          >
            <span
              aria-hidden="true"
              style={{
                display: 'inline-block',
                width: 10,
                height: 10,
                borderRadius: 3,
                marginRight: 6,
                background: PROVIDERS[p].color,
              }}
            />
            {p === 'custom' ? t('ai.custom') : PROVIDERS[p].name}
          </button>
        ))}
      </div>
      <p className={ui.muted}>{t(`ai.about.${id}`)}</p>
      {id === 'custom' && (
        <label className={ui.field}>
          {t('ai.baseUrl')}
          <input
            type="url"
            inputMode="url"
            placeholder="https://api.example.com/v1"
            value={s.customBaseUrl ?? ''}
            onChange={(e) => save({ ...s, customBaseUrl: e.target.value })}
          />
        </label>
      )}
      <label className={ui.field}>
        {t('ai.key')}
        <span style={{ display: 'flex', gap: 6 }}>
          <input
            style={{ flex: 1, minWidth: 0 }}
            type={show ? 'text' : 'password'}
            autoComplete="off"
            spellCheck={false}
            value={s.keys[id] ?? ''}
            onChange={(e) => setField('keys', e.target.value.trim())}
          />
          <button
            type="button"
            className={ui.iconBtn}
            aria-label={t(show ? 'ai.hideKey' : 'ai.showKey')}
            onClick={() => setShow(!show)}
          >
            {show ? <EyeSlashIcon size={20} /> : <EyeIcon size={20} />}
          </button>
        </span>
      </label>
      {PROVIDERS[id].keyUrl && (
        <a
          href={PROVIDERS[id].keyUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={ui.muted}
        >
          {t('ai.getKey', { name: PROVIDERS[id].name })}
        </a>
      )}
      <label className={ui.field}>
        {t('ai.model')}
        <input
          type="text"
          spellCheck={false}
          placeholder={PROVIDERS[id].model || 'model-name'}
          value={s.models[id] ?? ''}
          onChange={(e) => setField('models', e.target.value)}
        />
      </label>
      {id === 'custom' && <p className={ui.muted}>{t('ai.customSearch')}</p>}
      <div className={ui.row}>
        <button
          type="button"
          className={ui.btnSm}
          disabled={!activeProvider(s) || test === 'running'}
          onClick={() => void runTest()}
        >
          <PlugsConnectedIcon size={16} weight="bold" />
          {test === 'running' ? t('ai.testing') : t('ai.test')}
        </button>
        <button
          type="button"
          className={ui.btnGhost}
          style={{ color: 'var(--danger)' }}
          onClick={() => {
            setTest(null);
            void clearAiKeys(lang);
          }}
        >
          {t('ai.clearKeys')}
        </button>
      </div>
      {test && test !== 'running' && (
        <p className={`${ui.status} ${test.ok ? ui.ok : ui.err}`} role="status">
          {test.text}
        </p>
      )}
      <p className={ui.muted} style={{ fontSize: 13 }}>
        {t('ai.keyNote')}
      </p>
    </div>
  );
}
