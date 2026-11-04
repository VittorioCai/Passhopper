import { LockKeyIcon } from '@phosphor-icons/react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { unlockKeys } from '../ai/settings';
import { useLang } from '../lib';
import ui from './ui.module.css';

/** Asks for the password that protects the saved AI keys (F6.3). */
export function UnlockForm() {
  const { t } = useTranslation();
  const lang = useLang();
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  return (
    <form
      className={ui.stack}
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError(false);
        try {
          await unlockKeys(lang, password);
          setPassword('');
        } catch {
          setError(true);
        } finally {
          setBusy(false);
        }
      }}
    >
      <p className={ui.muted} style={{ display: 'flex', gap: 8, alignItems: 'center', margin: 0 }}>
        <LockKeyIcon size={18} weight="duotone" />
        {t('vault.locked')}
      </p>
      <label className={ui.field}>
        {t('vault.password')}
        <input
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </label>
      {error && (
        <p className={ui.fieldError} role="alert">
          {t('vault.wrong')}
        </p>
      )}
      <button type="submit" className={ui.btnPrimary} disabled={!password || busy}>
        {busy ? t('vault.unlocking') : t('vault.unlock')}
      </button>
    </form>
  );
}
