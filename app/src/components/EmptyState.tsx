import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import ui from './ui.module.css';

export function EmptyState({
  icon,
  title,
  body,
}: {
  icon: ReactNode;
  title?: string;
  body: string;
}) {
  const { t } = useTranslation();
  return (
    <div className={`${ui.card} ${ui.empty}`}>
      <span className={ui.emptyIcon}>{icon}</span>
      {title && <h2 className={ui.emptyTitle}>{title}</h2>}
      <p className={ui.muted}>{body}</p>
      <span className={ui.soon}>{t('common.comingSoon')}</span>
    </div>
  );
}
