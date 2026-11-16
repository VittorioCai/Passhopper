import { SealWarningIcon } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import ui from './ui.module.css';

/** When pass prices and reservation fees were last checked, and a reminder to confirm before booking. */
export function UnverifiedNote() {
  const { t } = useTranslation();
  return (
    <p className={ui.note} role="note">
      <SealWarningIcon size={18} weight="duotone" aria-hidden="true" />
      <span>{t('rules.unverified')}</span>
    </p>
  );
}
