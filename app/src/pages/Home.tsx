import { PlusIcon, TrainSimpleIcon } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { EmptyState } from '../components/EmptyState';
import ui from '../components/ui.module.css';

export function Home() {
  const { t } = useTranslation();
  return (
    <>
      <div className={ui.hello}>
        <span>{t('home.greeting')}</span>
        <h1>{t('home.title')}</h1>
      </div>
      <EmptyState
        icon={<TrainSimpleIcon size={24} weight="duotone" />}
        title={t('home.emptyTitle')}
        body={t('home.emptyBody')}
      />
      <Link to="/new" className={`${ui.btnPrimary} ${ui.block}`}>
        <PlusIcon size={20} weight="bold" />
        {t('home.newTrip')}
      </Link>
    </>
  );
}
